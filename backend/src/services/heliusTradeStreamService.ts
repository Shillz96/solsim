/**
 * Helius Real-Time Trade Stream Service
 * 
 * Uses Helius Enhanced WebSocket API to monitor Pump.fun token trades in real-time.
 * Provides actual on-chain trade data with minimal latency.
 * 
 * Architecture: Helius WebSocket → Parse transactions → Emit trade events
 */

import WebSocket from 'ws';
import { EventEmitter } from 'events';

// Pump.fun program ID
const PUMP_FUN_PROGRAM = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';

export interface HeliusTradeEvent {
  mint: string;
  side: 'buy' | 'sell';
  amountSol: number;
  amountToken: number;
  priceSol: number;
  signer: string;
  signature: string;
  timestamp: number;
  slot: number;
}

export interface TopTrader {
  address: string;
  trades: number;
  volumeSol: number;
  profitSol: number;
  buyVolume: number;
  sellVolume: number;
}

export class HeliusTradeStreamService extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;
  private heliusApiKey: string;
  private heliusWsUrl: string;
  private isConnected = false;
  private subscribedTokens: Set<string> = new Set();
  
  // Track trades per token for top traders calculation
  private tokenTrades: Map<string, HeliusTradeEvent[]> = new Map();
  private readonly MAX_TRADES_PER_TOKEN = 500;

  constructor() {
    super();
    
    this.heliusApiKey = process.env.HELIUS_API_KEY || '';
    if (!this.heliusApiKey) {
      throw new Error('HELIUS_API_KEY environment variable is required');
    }
    
    this.heliusWsUrl = `wss://atlas-mainnet.helius-rpc.com/?api-key=${this.heliusApiKey}`;
    
    console.log('[HeliusTradeStream] Service initialized');
  }

  /**
   * Start monitoring trades for specific token mints
   */
  public async subscribeToTokens(mints: string[]) {
    for (const mint of mints) {
      if (!this.subscribedTokens.has(mint)) {
        this.subscribedTokens.add(mint);
        console.log(`[HeliusTradeStream] Subscribed to token: ${mint}`);
      }
    }

    if (!this.isConnected) {
      await this.connect();
    }
  }

  /**
   * Stop monitoring a specific token
   */
  public unsubscribeFromToken(mint: string) {
    this.subscribedTokens.delete(mint);
    this.tokenTrades.delete(mint);
    console.log(`[HeliusTradeStream] Unsubscribed from token: ${mint}`);
  }

  /**
   * Get top traders for a specific token
   */
  public getTopTraders(mint: string, limit: number = 10): TopTrader[] {
    const trades = this.tokenTrades.get(mint) || [];
    
    // Group trades by signer
    const traderMap = new Map<string, {
      trades: number;
      buys: HeliusTradeEvent[];
      sells: HeliusTradeEvent[];
    }>();

    for (const trade of trades) {
      if (!traderMap.has(trade.signer)) {
        traderMap.set(trade.signer, { trades: 0, buys: [], sells: [] });
      }
      
      const trader = traderMap.get(trade.signer)!;
      trader.trades++;
      
      if (trade.side === 'buy') {
        trader.buys.push(trade);
      } else {
        trader.sells.push(trade);
      }
    }

    // Calculate stats for each trader
    const traders: TopTrader[] = [];
    
    for (const [address, data] of traderMap.entries()) {
      const buyVolume = data.buys.reduce((sum, t) => sum + t.amountSol, 0);
      const sellVolume = data.sells.reduce((sum, t) => sum + t.amountSol, 0);
      const volumeSol = buyVolume + sellVolume;
      
      // Simple profit calculation: sell volume - buy volume
      const profitSol = sellVolume - buyVolume;
      
      traders.push({
        address,
        trades: data.trades,
        volumeSol,
        profitSol,
        buyVolume,
        sellVolume,
      });
    }

    // Sort by total volume and return top N
    return traders
      .sort((a, b) => b.volumeSol - a.volumeSol)
      .slice(0, limit);
  }

  /**
   * Get recent trades for a specific token
   */
  public getRecentTrades(mint: string, limit: number = 50): HeliusTradeEvent[] {
    const trades = this.tokenTrades.get(mint) || [];
    return trades.slice(-limit).reverse(); // Return newest first
  }

  /**
   * Connect to Helius WebSocket and start listening
   */
  private async connect() {
    if (this.ws && this.isConnected) {
      console.log('[HeliusTradeStream] Already connected');
      return;
    }

    console.log('[HeliusTradeStream] Connecting to Helius WebSocket...');
    
    this.ws = new WebSocket(this.heliusWsUrl);

    this.ws.on('open', () => {
      console.log('[HeliusTradeStream] ✅ Connected to Helius WebSocket');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.subscribeToTransactions();
      this.startPingInterval();
    });

    this.ws.on('message', (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(message);
      } catch (error) {
        console.error('[HeliusTradeStream] Failed to parse message:', error);
      }
    });

    this.ws.on('error', (error) => {
      console.error('[HeliusTradeStream] WebSocket error:', error);
    });

    this.ws.on('close', () => {
      console.log('[HeliusTradeStream] WebSocket closed');
      this.isConnected = false;
      this.reconnect();
    });
  }

  /**
   * Subscribe to Pump.fun program transactions via Helius Enhanced WebSocket
   */
  private subscribeToTransactions() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('[HeliusTradeStream] Cannot subscribe: WebSocket not open');
      return;
    }

    const subscribeRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'transactionSubscribe',
      params: [
        {
          failed: false,
          accountInclude: [PUMP_FUN_PROGRAM],
        },
        {
          commitment: 'confirmed',
          encoding: 'jsonParsed',
          transactionDetails: 'full',
          maxSupportedTransactionVersion: 0,
        },
      ],
    };

    this.ws.send(JSON.stringify(subscribeRequest));
    console.log('[HeliusTradeStream] Subscribed to Pump.fun transactions');
  }

  /**
   * Send ping every 10 seconds to keep connection alive
   */
  private startPingInterval() {
    setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, 10000);
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: any) {
    // Initial subscription confirmation
    if (message.id === 1 && message.result) {
      console.log('[HeliusTradeStream] Subscription confirmed:', message.result);
      return;
    }

    // Transaction notification
    if (message.method === 'transactionNotification') {
      const result = message.params?.result;
      if (result) {
        this.parseTransaction(result);
      }
    }
  }

  /**
   * Parse Helius transaction notification into trade events
   */
  private parseTransaction(result: any) {
    try {
      const signature = result.signature;
      const slot = result.slot;
      const transaction = result.transaction;
      const meta = transaction.meta;
      
      if (!meta || meta.err) {
        return; // Skip failed transactions
      }

      // Extract account keys
      const accountKeys = transaction.transaction.message.accountKeys.map((k: any) => 
        typeof k === 'string' ? k : k.pubkey
      );

      // Look for token transfers in the transaction
      const postTokenBalances = meta.postTokenBalances || [];
      const preTokenBalances = meta.preTokenBalances || [];

      // Find the token mint involved (should be in position 1 for pump.fun)
      const mint = accountKeys[1];
      
      if (!this.subscribedTokens.has(mint)) {
        return; // Not monitoring this token
      }

      // Parse token transfers
      const tokenChanges = new Map<string, { pre: number; post: number }>();
      
      for (const balance of preTokenBalances) {
        const owner = accountKeys[balance.accountIndex];
        tokenChanges.set(owner, { pre: balance.uiTokenAmount.uiAmount || 0, post: 0 });
      }
      
      for (const balance of postTokenBalances) {
        const owner = accountKeys[balance.accountIndex];
        const existing = tokenChanges.get(owner);
        if (existing) {
          existing.post = balance.uiTokenAmount.uiAmount || 0;
        } else {
          tokenChanges.set(owner, { pre: 0, post: balance.uiTokenAmount.uiAmount || 0 });
        }
      }

      // Parse SOL changes
      const preBalances = meta.preBalances || [];
      const postBalances = meta.postBalances || [];
      const solChanges = new Map<string, number>();
      
      for (let i = 0; i < preBalances.length; i++) {
        const owner = accountKeys[i];
        const change = (postBalances[i] - preBalances[i]) / 1e9; // Convert lamports to SOL
        solChanges.set(owner, change);
      }

      // Determine trade direction and amounts
      const signer = accountKeys[0]; // First account is always the signer
      const tokenChange = tokenChanges.get(signer);
      const solChange = solChanges.get(signer) || 0;

      if (!tokenChange) {
        return; // No token change for signer
      }

      const tokenDelta = tokenChange.post - tokenChange.pre;
      const side: 'buy' | 'sell' = tokenDelta > 0 ? 'buy' : 'sell';
      const amountToken = Math.abs(tokenDelta);
      const amountSol = Math.abs(solChange);
      const priceSol = amountToken > 0 ? amountSol / amountToken : 0;

      const tradeEvent: HeliusTradeEvent = {
        mint,
        side,
        amountSol,
        amountToken,
        priceSol,
        signer,
        signature,
        timestamp: Date.now(),
        slot,
      };

      // Store trade
      if (!this.tokenTrades.has(mint)) {
        this.tokenTrades.set(mint, []);
      }
      
      const trades = this.tokenTrades.get(mint)!;
      trades.push(tradeEvent);
      
      // Keep only recent trades (memory management)
      if (trades.length > this.MAX_TRADES_PER_TOKEN) {
        trades.shift();
      }

      // Emit trade event
      this.emit('trade', tradeEvent);
      
      console.log(`[HeliusTradeStream] ${side.toUpperCase()} ${amountToken.toFixed(2)} tokens for ${amountSol.toFixed(4)} SOL (${mint.slice(0, 8)}...)`);
      
    } catch (error) {
      console.error('[HeliusTradeStream] Error parsing transaction:', error);
    }
  }

  /**
   * Reconnect to WebSocket after disconnect
   */
  private reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[HeliusTradeStream] Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;
    
    console.log(`[HeliusTradeStream] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Clean up and close connection
   */
  public close() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.subscribedTokens.clear();
    this.tokenTrades.clear();
    console.log('[HeliusTradeStream] Service closed');
  }
}

// Export singleton instance
export const heliusTradeStreamService = new HeliusTradeStreamService();
