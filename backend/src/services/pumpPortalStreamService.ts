/**
 * PumpPortal WebSocket Stream Service
 *
 * Connects to PumpPortal's WebSocket API to stream real-time token events:
 * - subscribeNewToken: Newly created bonded tokens
 * - subscribeMigration: Tokens migrating from bonding curve to AMM
 *
 * Important: PumpPortal requires reusing a single WebSocket connection.
 * Do not open multiple connections.
 */

import WebSocket from 'ws';
import { EventEmitter } from 'events';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || '');

// Redis cache keys
const REDIS_KEYS = {
  trades: (mint: string) => `pumpportal:trades:${mint}`,
  metadata: (mint: string) => `pumpportal:metadata:${mint}`,
};

// TTL for cached data (seconds)
const TRADE_CACHE_TTL = 300; // 5 minutes
const METADATA_CACHE_TTL = 60; // 1 minute
const MAX_CACHED_TRADES_PER_TOKEN = 100; // Keep last 100 trades per token

export interface NewTokenEvent {
  type: 'newToken';
  token: {
    mint: string;
    name?: string;
    symbol?: string;
    uri?: string; // Metadata URI
    creator?: string;
    bondingCurve?: string;
    // Additional metadata from PumpPortal
    initialBuy?: number;
    solAmount?: number;
    marketCapSol?: number;
    vTokensInBondingCurve?: number;
    vSolInBondingCurve?: number;
    // Holder and social data
    holderCount?: number;
    twitter?: string;
    telegram?: string;
    website?: string;
    description?: string;
  };
  timestamp: number;
}

export interface SwapEvent {
  type: 'swap';
  mint: string;
  txType: 'buy' | 'sell';
  solAmount?: number;
  tokenAmount?: number;
  user?: string;
  timestamp: number;
}

export interface AccountTradeEvent {
  type: 'accountTrade';
  wallet: string;        // The tracked wallet address
  mint: string;          // Token being traded
  txType: 'buy' | 'sell';
  solAmount?: number;
  tokenAmount?: number;
  signature?: string;    // Transaction signature
  timestamp: number;
  // Token metadata (if available from PumpPortal)
  tokenSymbol?: string;
  tokenName?: string;
  tokenUri?: string;
}

export interface MigrationEvent {
  type: 'migration';
  mint: string;
  data: {
    poolAddress?: string;
    poolType?: 'pumpswap' | 'raydium';
    status?: 'initiated' | 'completed';
  };
  timestamp: number;
}

export type PumpPortalEvent = NewTokenEvent | MigrationEvent | SwapEvent | AccountTradeEvent;

class PumpPortalStreamService extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000; // Start with 1 second
  private maxReconnectDelay = 60000; // Max 1 minute
  private isConnecting = false;
  private shouldReconnect = true;
  private wsUrl: string;
  private pingInterval: NodeJS.Timeout | null = null;
  private pongTimeout: NodeJS.Timeout | null = null;
  private subscribedTokens: Set<string> = new Set(); // Track subscribed token mints
  private subscribedWallets: Set<string> = new Set(); // Track subscribed wallet addresses

  constructor() {
    super();
    // CRITICAL: Set high max listeners for shared singleton instance
    // Multiple services subscribe to events from this single shared instance:
    // - tokenDiscoveryWorker, marketLighthouseWorker, walletTrackerService, etc.
    // This is intentional event-driven architecture, not a memory leak.
    this.setMaxListeners(100); // Support 100+ concurrent listeners
    
    // Add API key to URL if available for PumpSwap stream access
    const apiKey = process.env.PUMPPORTAL_API_KEY;
    this.wsUrl = apiKey
      ? `wss://pumpportal.fun/api/data?api-key=${apiKey}`
      : 'wss://pumpportal.fun/api/data';
    
    // Setup event listeners for Redis caching
    this.setupRedisCaching();
  }

  /**
   * Setup event listeners to cache data in Redis for frontend consumption
   */
  private setupRedisCaching(): void {
    // Cache swap events as trades
    this.on('swap', async (event: SwapEvent) => {
      try {
        const trade = {
          ts: event.timestamp,
          side: event.txType,
          amountSol: event.solAmount,
          amountToken: event.tokenAmount,
          signer: event.user || 'unknown',
          sig: 'unknown', // Signature not always available
          mint: event.mint,
        };

        const cacheKey = REDIS_KEYS.trades(event.mint);
        
        // Store in sorted set with timestamp as score (for time-based queries)
        await redis.zadd(cacheKey, event.timestamp, JSON.stringify(trade));
        
        // Trim to keep only last N trades per token
        await redis.zremrangebyrank(cacheKey, 0, -(MAX_CACHED_TRADES_PER_TOKEN + 1));
        
        // Set TTL on the sorted set
        await redis.expire(cacheKey, TRADE_CACHE_TTL);
      } catch (error) {
        console.error('[PumpPortal] Error caching trade:', error);
      }
    });

    // Cache token metadata from newToken events
    this.on('newToken', async (event: NewTokenEvent) => {
      try {
        const metadata = {
          mint: event.token.mint,
          name: event.token.name,
          symbol: event.token.symbol,
          description: event.token.description,
          imageUrl: event.token.uri,
          twitter: event.token.twitter,
          telegram: event.token.telegram,
          website: event.token.website,
          holderCount: event.token.holderCount,
          marketCapSol: event.token.marketCapSol,
          vSolInBondingCurve: event.token.vSolInBondingCurve,
          vTokensInBondingCurve: event.token.vTokensInBondingCurve,
          timestamp: event.timestamp,
        };

        const cacheKey = REDIS_KEYS.metadata(event.token.mint);
        await redis.setex(cacheKey, METADATA_CACHE_TTL, JSON.stringify(metadata));
      } catch (error) {
        console.error('[PumpPortal] Error caching metadata:', error);
      }
    });
  }

  /**
   * Start the WebSocket connection and subscribe to events
   */
  async start(): Promise<void> {
    console.log('[PumpPortal] Starting stream service...');
    this.shouldReconnect = true;
    await this.connect();
  }

  /**
   * Stop the WebSocket connection
   */
  stop(): void {
    console.log('[PumpPortal] Stopping stream service...');
    this.shouldReconnect = false;
    this.cleanup();
  }

  /**
   * Establish WebSocket connection
   */
  private async connect(): Promise<void> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;

    try {
      console.log('[PumpPortal] Connecting to WebSocket...');
      this.ws = new WebSocket(this.wsUrl);

      this.ws.on('open', () => this.onOpen());
      this.ws.on('message', (data) => this.onMessage(data));
      this.ws.on('error', (error) => this.onError(error));
      this.ws.on('close', (code, reason) => this.onClose(code, reason));
      this.ws.on('pong', () => this.onPong());
    } catch (error) {
      console.error('[PumpPortal] Connection error:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket open event
   */
  private onOpen(): void {
    console.log('[PumpPortal] WebSocket connected successfully');
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;

    // Subscribe to token events
    this.subscribe();

    // Start keepalive ping
    this.startPingInterval();

    this.emit('connected');
  }

  /**
   * Subscribe to PumpPortal events
   */
  private subscribe(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('[PumpPortal] Cannot subscribe: WebSocket not open');
      return;
    }

    console.log('[PumpPortal] Subscribing to events...');

    // Subscribe to new token events (bonded tokens)
    const newTokenSub = {
      method: 'subscribeNewToken',
    };
    console.log('[PumpPortal] Sending subscription:', JSON.stringify(newTokenSub));
    this.ws.send(JSON.stringify(newTokenSub));

    // Subscribe to migration events (graduating → new)
    const migrationSub = {
      method: 'subscribeMigration',
    };
    console.log('[PumpPortal] Sending subscription:', JSON.stringify(migrationSub));
    this.ws.send(JSON.stringify(migrationSub));

    // Note: Token trade subscriptions are handled dynamically via subscribeToTokens()
    console.log('[PumpPortal] Base subscription requests sent. Use subscribeToTokens() for trade data.');
  }

  /**
   * Subscribe to trades for specific tokens
   * @param tokenMints Array of token mint addresses to subscribe to
   */
  subscribeToTokens(tokenMints: string[]): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[PumpPortal] Cannot subscribe to tokens: WebSocket not open');
      return;
    }

    // Filter out already subscribed tokens
    const newTokens = tokenMints.filter(mint => !this.subscribedTokens.has(mint));

    if (newTokens.length === 0) {
      return; // All tokens already subscribed
    }

    // Subscribe to trades for these tokens
    const tokenTradeSub = {
      method: 'subscribeTokenTrade',
      keys: newTokens,
    };

    console.log(`[PumpPortal] Subscribing to ${newTokens.length} tokens for trade data`);
    this.ws.send(JSON.stringify(tokenTradeSub));

    // Track subscribed tokens
    newTokens.forEach(mint => this.subscribedTokens.add(mint));
  }

  /**
   * Get count of currently subscribed tokens
   */
  getSubscribedTokenCount(): number {
    return this.subscribedTokens.size;
  }

  /**
   * Subscribe to trades for specific wallet addresses (real-time wallet tracking)
   * @param walletAddresses Array of wallet addresses to track
   */
  subscribeToWallets(walletAddresses: string[]): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[PumpPortal] Cannot subscribe to wallets: WebSocket not open');
      return;
    }

    // Filter out already subscribed wallets
    const newWallets = walletAddresses.filter(addr => !this.subscribedWallets.has(addr));

    if (newWallets.length === 0) {
      return; // All wallets already subscribed
    }

    // Subscribe to trades for these wallets using PumpPortal's subscribeAccountTrade
    const accountTradeSub = {
      method: 'subscribeAccountTrade',
      keys: newWallets,
    };

    console.log(`[PumpPortal] Subscribing to ${newWallets.length} wallets for trade tracking`);
    this.ws.send(JSON.stringify(accountTradeSub));

    // Track subscribed wallets
    newWallets.forEach(addr => this.subscribedWallets.add(addr));
  }

  /**
   * Unsubscribe from wallet trade tracking
   * @param walletAddresses Array of wallet addresses to stop tracking
   */
  unsubscribeFromWallets(walletAddresses: string[]): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[PumpPortal] Cannot unsubscribe from wallets: WebSocket not open');
      return;
    }

    const walletsToRemove = walletAddresses.filter(addr => this.subscribedWallets.has(addr));

    if (walletsToRemove.length === 0) {
      return;
    }

    const accountTradeUnsub = {
      method: 'unsubscribeAccountTrade',
      keys: walletsToRemove,
    };

    console.log(`[PumpPortal] Unsubscribing from ${walletsToRemove.length} wallets`);
    this.ws.send(JSON.stringify(accountTradeUnsub));

    // Remove from tracked set
    walletsToRemove.forEach(addr => this.subscribedWallets.delete(addr));
  }

  /**
   * Get count of currently tracked wallets
   */
  getSubscribedWalletCount(): number {
    return this.subscribedWallets.size;
  }

  /**
   * Get list of subscribed wallet addresses
   */
  getSubscribedWallets(): string[] {
    return Array.from(this.subscribedWallets);
  }

  /**
   * Handle incoming WebSocket messages
   */
  private onMessage(data: WebSocket.Data): void {
    try {
      const raw = data.toString();
      const message = JSON.parse(raw);

      // Debug: Log all incoming messages (show full message for debugging)
      if (process.env.NODE_ENV !== 'production') {
        console.log('[PumpPortal] Received message:', JSON.stringify(message).substring(0, 1000));
      }

      // PumpPortal sends messages with different structures based on subscription
      // Check for newToken events (txType === 'create' indicates a new token)
      if (message.txType === 'create' && message.mint) {
        const event: NewTokenEvent = {
          type: 'newToken',
          token: {
            mint: message.mint,
            name: message.name || '',
            symbol: message.symbol || '',
            uri: message.uri || message.metadataUri || message.image || '',
            creator: message.traderPublicKey || message.creator || message.deployer || '',
            bondingCurve: message.bondingCurveKey || message.bondingCurve || '',
            // Additional metadata from PumpPortal
            initialBuy: message.initialBuy,
            solAmount: message.solAmount,
            marketCapSol: message.marketCapSol,
            vTokensInBondingCurve: message.vTokensInBondingCurve,
            vSolInBondingCurve: message.vSolInBondingCurve,
            holderCount: message.holderCount || message.holder_count || message.holders,
            twitter: message.twitter,
            telegram: message.telegram,
            website: message.website,
            description: message.description,
          },
          timestamp: message.timestamp || Date.now(),
        };

        console.log('[PumpPortal] New token:', event.token.symbol || event.token.mint);
        this.emit('newToken', event);
      }
      // Also check for type field (legacy format)
      else if (message.type === 'newToken') {
        const event: NewTokenEvent = {
          type: 'newToken',
          token: {
            mint: message.mint || message.token?.mint,
            name: message.name || message.token?.name,
            symbol: message.symbol || message.token?.symbol,
            uri: message.uri || message.token?.uri,
            creator: message.creator || message.token?.creator,
            bondingCurve: message.bondingCurve || message.token?.bondingCurve,
            holderCount: message.holderCount || message.holder_count || message.holders || message.token?.holderCount,
            twitter: message.twitter || message.token?.twitter,
            telegram: message.telegram || message.token?.telegram,
            website: message.website || message.token?.website,
            description: message.description || message.token?.description,
          },
          timestamp: message.timestamp || Date.now(),
        };

        console.log('[PumpPortal] New token (legacy format):', event.token.symbol || event.token.mint);
        this.emit('newToken', event);
      }

      // Handle migration events - PumpPortal sends these when tokens graduate
      // txType can be 'migrate' or message may have explicit migration fields
      else if (message.txType === 'migrate' || message.type === 'migration') {
        const event: MigrationEvent = {
          type: 'migration',
          mint: message.mint,
          data: {
            poolAddress: message.poolAddress || message.pool || message.data?.poolAddress,
            poolType: message.poolType || message.data?.poolType || 'raydium',
            status: message.status || message.data?.status || 'completed',
          },
          timestamp: message.timestamp || Date.now(),
        };

        console.log('[PumpPortal] Migration event:', event.mint, event.data.status);
        this.emit('migration', event);
      }
      // Handle swap/trade events (buy/sell)
      else if (message.txType === 'buy' || message.txType === 'sell' || message.type === 'swap') {
        const event: SwapEvent = {
          type: 'swap',
          mint: message.mint,
          txType: message.txType || 'buy',
          solAmount: message.solAmount || message.sol,
          tokenAmount: message.tokenAmount || message.tokens,
          user: message.user || message.traderPublicKey,
          timestamp: message.timestamp || Date.now(),
        };

        // Only emit if we have a mint address
        if (event.mint) {
          this.emit('swap', event);
          
          // If this trade was made by a tracked wallet, also emit as accountTrade
          const trader = message.user || message.traderPublicKey;
          if (trader && this.subscribedWallets.has(trader)) {
            const accountTradeEvent: AccountTradeEvent = {
              type: 'accountTrade',
              wallet: trader,
              mint: message.mint,
              txType: message.txType || 'buy',
              solAmount: message.solAmount || message.sol,
              tokenAmount: message.tokenAmount || message.tokens,
              signature: message.signature || message.txId,
              timestamp: message.timestamp || Date.now(),
              tokenSymbol: message.symbol || message.tokenSymbol,
              tokenName: message.name || message.tokenName,
              tokenUri: message.uri || message.image,
            };
            
            console.log(`[PumpPortal] Wallet trade: ${trader.slice(0, 8)}... ${accountTradeEvent.txType} ${accountTradeEvent.tokenSymbol || accountTradeEvent.mint.slice(0, 8)}`);
            this.emit('accountTrade', accountTradeEvent);
          }
        }
      }
      // Also check for any other message types for debugging
      else if (process.env.NODE_ENV !== 'production') {
        console.log('[PumpPortal] Unknown message type:', message.txType || message.type, 'mint:', message.mint);
      }
    } catch (error) {
      console.error('[PumpPortal] Error parsing message:', error);
    }
  }

  /**
   * Handle WebSocket errors
   */
  private onError(error: Error): void {
    console.error('[PumpPortal] WebSocket error:', error.message);
    
    // Don't emit error events for 502/503/504 server errors - these are temporary
    // and will be handled by reconnection logic
    if (error.message.includes('502') || error.message.includes('503') || error.message.includes('504')) {
      console.log('[PumpPortal] Server error detected, will reconnect automatically');
      return;
    }
    
    this.emit('error', error);
  }

  /**
   * Handle WebSocket close event
   */
  private onClose(code: number, reason: Buffer): void {
    const reasonStr = reason.toString();
    console.log(`[PumpPortal] WebSocket closed: code=${code}, reason=${reasonStr}`);

    this.cleanup();
    this.emit('disconnected', { code, reason: reasonStr });

    if (this.shouldReconnect) {
      this.scheduleReconnect();
    }
  }

  /**
   * Handle pong response
   */
  private onPong(): void {
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }
  }

  /**
   * Start ping interval to keep connection alive
   */
  private startPingInterval(): void {
    this.stopPingInterval();

    // Send ping every 30 seconds
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.ping();

        // Set timeout for pong response (10 seconds)
        this.pongTimeout = setTimeout(() => {
          console.warn('[PumpPortal] Pong timeout - reconnecting...');
          this.ws?.terminate();
        }, 10000);
      }
    }, 30000);
  }

  /**
   * Stop ping interval
   */
  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (!this.shouldReconnect) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[PumpPortal] Max reconnection attempts reached');
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), this.maxReconnectDelay);

    console.log(`[PumpPortal] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    this.stopPingInterval();

    if (this.ws) {
      this.ws.removeAllListeners();
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }

    // CRITICAL FIX: Clear subscription tracking on cleanup
    // Without this, after reconnection we think we're subscribed but PumpPortal doesn't know about us
    // This causes "ghost subscriptions" where we filter out resubscribe attempts but get no data
    this.subscribedTokens.clear();
    this.subscribedWallets.clear();

    this.isConnecting = false;
  }

  /**
   * Get current connection status
   */
  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
export const pumpPortalStreamService = new PumpPortalStreamService();
