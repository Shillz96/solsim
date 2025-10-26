/**
 * Helius Trade Data Service
 * 
 * Uses Helius REST API to fetch and monitor Pump.fun token trades.
 * Polls for new transactions and parses them into trade events.
 * 
 * Architecture: Helius RPC → Parse transactions → Cache trade data
 */

import { EventEmitter } from 'events';
import { robustFetch } from '../utils/fetch.js';

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
  private heliusApiKey: string;
  private heliusRpcUrl: string;
  private subscribedTokens: Map<string, { lastSignature: string; pollInterval?: NodeJS.Timeout }> = new Map();
  
  // Track trades per token for top traders calculation
  private tokenTrades: Map<string, HeliusTradeEvent[]> = new Map();
  private readonly MAX_TRADES_PER_TOKEN = 500;
  private readonly POLL_INTERVAL_MS = 5000; // Poll every 5 seconds

  constructor() {
    super();
    
    this.heliusApiKey = process.env.HELIUS_API_KEY || '';
    if (!this.heliusApiKey) {
      throw new Error('HELIUS_API_KEY environment variable is required');
    }
    
    this.heliusRpcUrl = `https://mainnet.helius-rpc.com/?api-key=${this.heliusApiKey}`;
    
    console.log('[HeliusTradeService] Service initialized with REST API polling');
  }

  /**
   * Start monitoring trades for specific token mints
   */
  public async subscribeToTokens(mints: string[]) {
    for (const mint of mints) {
      if (!this.subscribedTokens.has(mint)) {
        this.subscribedTokens.set(mint, { lastSignature: '' });
        
        // Start polling for this token
        this.startPolling(mint);
        
        // Fetch initial trades
        await this.fetchRecentTrades(mint, 50);
        
        console.log(`[HeliusTradeService] Subscribed to token: ${mint}`);
      }
    }
  }

  /**
   * Stop monitoring a specific token
   */
  public unsubscribeFromToken(mint: string) {
    const tokenInfo = this.subscribedTokens.get(mint);
    if (tokenInfo?.pollInterval) {
      clearInterval(tokenInfo.pollInterval);
    }
    this.subscribedTokens.delete(mint);
    this.tokenTrades.delete(mint);
    console.log(`[HeliusTradeService] Unsubscribed from token: ${mint}`);
  }

  /**
   * Start polling for new transactions
   */
  private startPolling(mint: string) {
    const tokenInfo = this.subscribedTokens.get(mint);
    if (!tokenInfo) return;

    const pollInterval = setInterval(async () => {
      try {
        await this.fetchNewTrades(mint);
      } catch (error) {
        console.error(`[HeliusTradeService] Error polling trades for ${mint}:`, error);
      }
    }, this.POLL_INTERVAL_MS);

    tokenInfo.pollInterval = pollInterval;
  }

  /**
   * Fetch new trades since last check
   */
  private async fetchNewTrades(mint: string) {
    const tokenInfo = this.subscribedTokens.get(mint);
    if (!tokenInfo) return;

    try {
      // Get recent signatures for this token
      const response = await robustFetch(this.heliusRpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'get-signatures',
          method: 'getSignaturesForAddress',
          params: [
            mint,
            {
              limit: 10,
              before: tokenInfo.lastSignature || undefined,
            }
          ]
        })
      });

      const data: any = await response.json();
      const signatures = data.result || [];

      if (signatures.length === 0) return;

      // Update last signature
      tokenInfo.lastSignature = signatures[0].signature;

      // Fetch and parse transactions
      for (const sigInfo of signatures) {
        await this.fetchAndParseTrade(mint, sigInfo.signature);
      }
    } catch (error) {
      console.error(`[HeliusTradeService] Error fetching new trades:`, error);
    }
  }

  /**
   * Fetch recent trades for a token (initial load)
   */
  private async fetchRecentTrades(mint: string, limit: number = 50) {
    try {
      // Use Helius Enhanced Transactions API to get parsed transactions
      const response = await robustFetch(
        `https://api.helius.xyz/v0/addresses/${mint}/transactions?api-key=${this.heliusApiKey}&type=SWAP`,
        {
          method: 'GET',
        }
      );

      const transactions: any = await response.json();

      if (Array.isArray(transactions)) {
        for (const tx of transactions.slice(0, limit)) {
          this.parseEnhancedTransaction(mint, tx);
        }
        console.log(`[HeliusTradeService] Loaded ${Math.min(transactions.length, limit)} initial trades for ${mint}`);
      }
    } catch (error) {
      console.error(`[HeliusTradeService] Error fetching recent trades:`, error);
    }
  }

  /**
   * Fetch and parse a single transaction
   */
  private async fetchAndParseTrade(mint: string, signature: string) {
    try {
      const response = await robustFetch(this.heliusRpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'get-transaction',
          method: 'getParsedTransaction',
          params: [
            signature,
            {
              maxSupportedTransactionVersion: 0,
              commitment: 'confirmed'
            }
          ]
        })
      });

      const data: any = await response.json();
      const transaction = data.result;

      if (transaction && !transaction.meta?.err) {
        this.parseTransaction(mint, signature, transaction);
      }
    } catch (error) {
      console.error(`[HeliusTradeService] Error fetching transaction ${signature}:`, error);
    }
  }

  /**
   * Parse Helius Enhanced Transaction (from /addresses/:address/transactions API)
   */
  private parseEnhancedTransaction(mint: string, tx: any) {
    try {
      if (tx.type !== 'SWAP') return;

      const swap = tx.swap;
      if (!swap) return;

      // Find token transfers involving our mint
      const tokenInputs = swap.tokenInputs?.filter((t: any) => t.mint === mint) || [];
      const tokenOutputs = swap.tokenOutputs?.filter((t: any) => t.mint === mint) || [];

      if (tokenInputs.length === 0 && tokenOutputs.length === 0) return;

      // Determine side: if token output > 0, it's a buy; if token input > 0, it's a sell
      const isBuy = tokenOutputs.length > 0 && tokenOutputs[0].tokenAmount > 0;
      const side: 'buy' | 'sell' = isBuy ? 'buy' : 'sell';

      const tokenAmount = isBuy 
        ? tokenOutputs[0].tokenAmount 
        : tokenInputs[0].tokenAmount;

      // Get SOL amount from native input/output
      const solAmount = isBuy
        ? (swap.nativeInput?.amount ? parseInt(swap.nativeInput.amount) / 1e9 : 0)
        : (swap.nativeOutput?.amount ? parseInt(swap.nativeOutput.amount) / 1e9 : 0);

      const signer = tx.feePayer || 'unknown';

      const tradeEvent: HeliusTradeEvent = {
        mint,
        side,
        amountSol: solAmount,
        amountToken: tokenAmount,
        priceSol: tokenAmount > 0 ? solAmount / tokenAmount : 0,
        signer,
        signature: tx.signature,
        timestamp: tx.timestamp * 1000,
        slot: tx.slot || 0,
      };

      this.storeTrade(tradeEvent);
    } catch (error) {
      console.error(`[HeliusTradeService] Error parsing enhanced transaction:`, error);
    }
  }

  /**
   * Parse raw Solana transaction
   */
  private parseTransaction(mint: string, signature: string, transaction: any) {
    try {
      const meta = transaction.meta;
      if (!meta || meta.err) return;

      // Get account keys
      const accountKeys = transaction.transaction.message.accountKeys.map((k: any) => k.pubkey);
      const signer = accountKeys[0];

      // Parse token balance changes
      const preTokenBalances = meta.preTokenBalances || [];
      const postTokenBalances = meta.postTokenBalances || [];

      let tokenDelta = 0;
      let signerTokenAccount = '';

      // Find signer's token balance change for this mint
      for (const postBalance of postTokenBalances) {
        if (postBalance.mint === mint) {
          const preBalance = preTokenBalances.find((p: any) => 
            p.accountIndex === postBalance.accountIndex
          );
          
          const postAmount = postBalance.uiTokenAmount?.uiAmount || 0;
          const preAmount = preBalance?.uiTokenAmount?.uiAmount || 0;
          
          tokenDelta = postAmount - preAmount;
          signerTokenAccount = accountKeys[postBalance.accountIndex];
          break;
        }
      }

      if (tokenDelta === 0) return; // No token change

      // Parse SOL balance changes
      const preBalances = meta.preBalances || [];
      const postBalances = meta.postBalances || [];
      const solDelta = (postBalances[0] - preBalances[0]) / 1e9;

      const side: 'buy' | 'sell' = tokenDelta > 0 ? 'buy' : 'sell';
      const amountToken = Math.abs(tokenDelta);
      const amountSol = Math.abs(solDelta);
      const priceSol = amountToken > 0 ? amountSol / amountToken : 0;

      const tradeEvent: HeliusTradeEvent = {
        mint,
        side,
        amountSol,
        amountToken,
        priceSol,
        signer,
        signature,
        timestamp: transaction.blockTime ? transaction.blockTime * 1000 : Date.now(),
        slot: transaction.slot || 0,
      };

      this.storeTrade(tradeEvent);
    } catch (error) {
      console.error(`[HeliusTradeService] Error parsing transaction:`, error);
    }
  }

  /**
   * Store trade and emit event
   */
  private storeTrade(tradeEvent: HeliusTradeEvent) {
    const { mint } = tradeEvent;

    // Initialize storage for this token if needed
    if (!this.tokenTrades.has(mint)) {
      this.tokenTrades.set(mint, []);
    }

    const trades = this.tokenTrades.get(mint)!;
    
    // Check if we already have this trade (by signature)
    if (trades.some(t => t.signature === tradeEvent.signature)) {
      return;
    }

    trades.push(tradeEvent);

    // Keep only recent trades (memory management)
    if (trades.length > this.MAX_TRADES_PER_TOKEN) {
      trades.shift();
    }

    // Emit trade event
    this.emit('trade', tradeEvent);

    console.log(`[HeliusTradeService] ${tradeEvent.side.toUpperCase()} ${tradeEvent.amountToken.toFixed(2)} tokens for ${tradeEvent.amountSol.toFixed(4)} SOL (${mint.slice(0, 8)}...)`);
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
   * Clean up and close service
   */
  public close() {
    for (const [mint, tokenInfo] of this.subscribedTokens.entries()) {
      if (tokenInfo.pollInterval) {
        clearInterval(tokenInfo.pollInterval);
      }
    }
    this.subscribedTokens.clear();
    this.tokenTrades.clear();
    console.log('[HeliusTradeService] Service closed');
  }
}

// Export singleton instance
export const heliusTradeStreamService = new HeliusTradeStreamService();
