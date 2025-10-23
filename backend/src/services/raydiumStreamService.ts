/**
 * Raydium Pool Detection Service
 *
 * Monitors Raydium program logs via Helius WebSocket to detect new pool creations.
 * Uses the free Solana onLogs API to watch for 'initialize2' instructions.
 *
 * Program ID: 675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8
 */

import { Connection, PublicKey, ParsedTransactionWithMeta } from '@solana/web3.js';
import { EventEmitter } from 'events';

export interface NewPoolEvent {
  type: 'newPool';
  pool: {
    poolAddress: string;
    mint1: string;
    mint2: string;
    program: 'raydium';
    signature: string;
    blockTime: number;
  };
}

const RAYDIUM_V4_PROGRAM = new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8');

class RaydiumStreamService extends EventEmitter {
  private connection: Connection | null = null;
  private subscriptionId: number | null = null;
  private isRunning = false;
  private shouldReconnect = true;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private heliusRpcUrl: string;
  private heliusWsUrl: string;

  constructor() {
    super();
    this.heliusRpcUrl = process.env.HELIUS_RPC_URL || process.env.SOLANA_RPC || '';
    this.heliusWsUrl = process.env.HELIUS_WS || '';

    if (!this.heliusRpcUrl || !this.heliusWsUrl) {
      console.error('[Raydium] Missing HELIUS_RPC_URL or HELIUS_WS environment variables');
    }
  }

  /**
   * Start monitoring Raydium program logs
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[Raydium] Already running');
      return;
    }

    console.log('[Raydium] Starting pool detection service...');
    this.shouldReconnect = true;
    this.isRunning = true;

    await this.connect();
  }

  /**
   * Stop monitoring
   */
  async stop(): Promise<void> {
    console.log('[Raydium] Stopping pool detection service...');
    this.shouldReconnect = false;
    this.isRunning = false;

    await this.cleanup();
  }

  /**
   * Establish connection and subscribe to logs
   */
  private async connect(): Promise<void> {
    try {
      console.log('[Raydium] Creating connection to Helius...');

      // Create connection with WebSocket endpoint
      this.connection = new Connection(this.heliusRpcUrl, {
        wsEndpoint: this.heliusWsUrl,
        commitment: 'confirmed',
      });

      // Subscribe to Raydium program logs
      console.log('[Raydium] Subscribing to program logs...');
      this.subscriptionId = this.connection.onLogs(
        RAYDIUM_V4_PROGRAM,
        (logs, context) => this.handleLogs(logs, context),
        'confirmed'
      );

      console.log('[Raydium] Successfully subscribed to logs (subscription ID:', this.subscriptionId, ')');
      this.reconnectAttempts = 0;
      this.emit('connected');
    } catch (error) {
      console.error('[Raydium] Connection error:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Handle incoming log events
   */
  private async handleLogs(
    logs: { logs: string[]; err: any; signature: string },
    context: { slot: number }
  ): Promise<void> {
    try {
      // Filter for initialize2 instruction
      const hasInitialize2 = logs.logs?.some((log) => log.includes('initialize2'));

      if (!hasInitialize2) {
        return;
      }

      console.log('[Raydium] Detected initialize2 in tx:', logs.signature);

      // Fetch transaction details to extract mint addresses
      const poolData = await this.parsePoolTransaction(logs.signature);

      if (poolData) {
        const event: NewPoolEvent = {
          type: 'newPool',
          pool: {
            poolAddress: poolData.poolAddress,
            mint1: poolData.mint1,
            mint2: poolData.mint2,
            program: 'raydium',
            signature: logs.signature,
            blockTime: poolData.blockTime,
          },
        };

        console.log('[Raydium] New pool detected:', poolData.mint1, '/', poolData.mint2);
        this.emit('newPool', event);
      }
    } catch (error) {
      console.error('[Raydium] Error handling logs:', error);
    }
  }

  /**
   * Parse transaction to extract pool and mint addresses
   */
  private async parsePoolTransaction(signature: string): Promise<{
    poolAddress: string;
    mint1: string;
    mint2: string;
    blockTime: number;
  } | null> {
    if (!this.connection) {
      console.error('[Raydium] No connection available');
      return null;
    }

    try {
      // Fetch transaction with retries
      let tx: ParsedTransactionWithMeta | null = null;
      let attempts = 0;
      const maxAttempts = 3;

      while (!tx && attempts < maxAttempts) {
        tx = await this.connection.getParsedTransaction(signature, {
          maxSupportedTransactionVersion: 0,
          commitment: 'confirmed',
        });

        if (!tx) {
          attempts++;
          await new Promise((resolve) => setTimeout(resolve, 500 * attempts));
        }
      }

      if (!tx) {
        console.warn('[Raydium] Could not fetch transaction:', signature);
        return null;
      }

      // Extract account keys (pool address is typically the first writable account)
      const accountKeys = tx.transaction.message.accountKeys;
      let poolAddress: string | null = null;
      const mints: string[] = [];

      // Find pool address and token mints
      for (const account of accountKeys) {
        const pubkey = account.pubkey.toBase58();

        // Pool address is typically a writable, signer account or the first writable PDA
        if (account.writable && !account.signer) {
          if (!poolAddress) {
            poolAddress = pubkey;
          }
        }
      }

      // Extract mints from token instructions
      const instructions = tx.transaction.message.instructions;
      for (const ix of instructions) {
        if ('parsed' in ix && ix.parsed) {
          const parsed = ix.parsed as any;

          // Look for SPL Token program interactions
          if (parsed.type === 'initializeAccount' || parsed.type === 'initializeAccount2') {
            const mint = parsed.info?.mint;
            if (mint && !mints.includes(mint)) {
              mints.push(mint);
            }
          }
        }
      }

      // Fallback: Extract mints from account keys if not found in instructions
      if (mints.length < 2) {
        const tokenProgramId = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
        for (const account of accountKeys) {
          const pubkey = account.pubkey.toBase58();
          // Token mint accounts are typically owned by Token Program
          if (!poolAddress || pubkey !== poolAddress) {
            if (mints.length < 2 && !mints.includes(pubkey)) {
              mints.push(pubkey);
            }
          }
        }
      }

      if (!poolAddress || mints.length < 2) {
        console.warn('[Raydium] Could not extract pool data from tx:', signature);
        return null;
      }

      return {
        poolAddress,
        mint1: mints[0],
        mint2: mints[1],
        blockTime: tx.blockTime || Math.floor(Date.now() / 1000),
      };
    } catch (error) {
      console.error('[Raydium] Error parsing transaction:', error);
      return null;
    }
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    if (this.subscriptionId !== null && this.connection) {
      try {
        await this.connection.removeOnLogsListener(this.subscriptionId);
        console.log('[Raydium] Unsubscribed from logs');
      } catch (error) {
        console.error('[Raydium] Error unsubscribing:', error);
      }
      this.subscriptionId = null;
    }

    this.connection = null;
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (!this.shouldReconnect || !this.isRunning) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[Raydium] Max reconnection attempts reached');
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 60000);

    console.log(`[Raydium] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Get connection status
   */
  get isConnected(): boolean {
    return this.connection !== null && this.subscriptionId !== null;
  }
}

// Singleton instance
export const raydiumStreamService = new RaydiumStreamService();
