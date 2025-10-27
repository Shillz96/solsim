/**
 * Enhanced Wallet Tracker Service using PumpPortal WebSocket API
 * 
 * This implementation uses PumpPortal's subscribeAccountTrade for real-time wallet tracking:
 * - Real-time trade notifications as they happen
 * - Clean, pre-parsed trade data (no complex transaction parsing)
 * - Efficient single WebSocket connection for multiple wallets
 * - Automatic token metadata from PumpPortal
 * 
 * Features:
 * - Real-time wallet tracking via WebSocket
 * - Historical trade fetching via Helius (fallback)
 * - Token metadata enrichment
 * - Price and market cap data
 */

import prisma from "../plugins/prisma.js";
import { pumpPortalStreamService, AccountTradeEvent } from "./pumpPortalStreamService.js";
import { getTokenMetaBatch } from "./tokenService.js";
import priceService from "../plugins/priceService-optimized.js";
import { EventEmitter } from "events";

export interface EnrichedWalletTrade {
  signature?: string;
  timestamp: number;
  type: "BUY" | "SELL";
  wallet: string;
  tokenMint: string;
  tokenAmount?: string;
  solAmount?: number;
  // Enriched metadata
  tokenSymbol?: string | null;
  tokenName?: string | null;
  tokenLogoURI?: string | null;
  priceUsd?: number | null;
  marketCapUsd?: number | null;
  source: 'realtime' | 'historical'; // Track if from WebSocket or API
}

class WalletTrackerServicePumpPortal extends EventEmitter {
  private trackedWallets: Map<string, Set<string>> = new Map(); // userId -> Set<wallet addresses>
  private recentTrades: Map<string, EnrichedWalletTrade[]> = new Map(); // wallet -> recent trades
  private readonly MAX_RECENT_TRADES = 50;

  constructor() {
    super();
    this.setupListeners();
  }

  /**
   * Setup PumpPortal event listeners
   */
  private setupListeners(): void {
    pumpPortalStreamService.on('accountTrade', async (event: AccountTradeEvent) => {
      await this.handleAccountTrade(event);
    });

    pumpPortalStreamService.on('connected', () => {
      console.log('[WalletTracker] PumpPortal connected, resubscribing to all tracked wallets...');
      this.resubscribeAllWallets();
    });
  }

  /**
   * Handle incoming account trade event from PumpPortal
   */
  private async handleAccountTrade(event: AccountTradeEvent): Promise<void> {
    const trade: EnrichedWalletTrade = {
      signature: event.signature,
      timestamp: event.timestamp,
      type: event.txType === 'buy' ? 'BUY' : 'SELL',
      wallet: event.wallet,
      tokenMint: event.mint,
      tokenAmount: event.tokenAmount?.toString(),
      solAmount: event.solAmount,
      tokenSymbol: event.tokenSymbol,
      tokenName: event.tokenName,
      tokenLogoURI: event.tokenUri,
      source: 'realtime',
    };

    // Enrich with price data
    await this.enrichTrade(trade);

    // Store in recent trades
    if (!this.recentTrades.has(event.wallet)) {
      this.recentTrades.set(event.wallet, []);
    }
    const trades = this.recentTrades.get(event.wallet)!;
    trades.unshift(trade);
    if (trades.length > this.MAX_RECENT_TRADES) {
      trades.pop();
    }

    // Emit event for subscribers (e.g., WebSocket to frontend)
    this.emit('walletTrade', trade);

    console.log(`[WalletTracker] ${trade.wallet.slice(0, 8)}... ${trade.type} ${trade.tokenSymbol || trade.tokenMint.slice(0, 8)} for ${trade.solAmount?.toFixed(3)} SOL`);
  }

  /**
   * Enrich trade with current price and market cap
   */
  private async enrichTrade(trade: EnrichedWalletTrade): Promise<void> {
    try {
      // Get price
      const price = await priceService.getPrice(trade.tokenMint);
      if (price !== null) {
        trade.priceUsd = price;
      }

      // Get market cap
      const tick = await priceService.getLastTick(trade.tokenMint);
      if (tick?.marketCapUsd) {
        trade.marketCapUsd = tick.marketCapUsd;
      }

      // Enrich metadata if missing
      if (!trade.tokenSymbol || !trade.tokenName) {
        const [metadata] = await getTokenMetaBatch([trade.tokenMint]);
        if (metadata) {
          trade.tokenSymbol = trade.tokenSymbol || metadata.symbol;
          trade.tokenName = trade.tokenName || metadata.name;
          trade.tokenLogoURI = trade.tokenLogoURI || metadata.logoURI;
        }
      }
    } catch (error) {
      console.warn(`[WalletTracker] Failed to enrich trade for ${trade.tokenMint}:`, error);
    }
  }

  /**
   * Add a wallet to track for a user
   */
  async followWallet(userId: string, address: string, alias?: string): Promise<any> {
    // Store in database
    const record = await prisma.walletTrack.create({
      data: { userId, address, alias }
    });

    // Track in memory
    if (!this.trackedWallets.has(userId)) {
      this.trackedWallets.set(userId, new Set());
    }
    this.trackedWallets.get(userId)!.add(address);

    // Subscribe to PumpPortal if not already subscribed
    if (pumpPortalStreamService.isConnected) {
      pumpPortalStreamService.subscribeToWallets([address]);
      console.log(`[WalletTracker] Subscribed to wallet ${address.slice(0, 8)}... for user ${userId}`);
    }

    return record;
  }

  /**
   * Remove a tracked wallet
   */
  async unfollowWallet(userId: string, address: string): Promise<any> {
    // Remove from database
    const result = await prisma.walletTrack.deleteMany({
      where: { userId, address }
    });

    // Remove from memory
    const userWallets = this.trackedWallets.get(userId);
    if (userWallets) {
      userWallets.delete(address);
      if (userWallets.size === 0) {
        this.trackedWallets.delete(userId);
      }
    }

    // Check if any other user is tracking this wallet
    const stillTracked = Array.from(this.trackedWallets.values()).some(
      wallets => wallets.has(address)
    );

    // Unsubscribe from PumpPortal if no one is tracking this wallet
    if (!stillTracked && pumpPortalStreamService.isConnected) {
      pumpPortalStreamService.unsubscribeFromWallets([address]);
      console.log(`[WalletTracker] Unsubscribed from wallet ${address.slice(0, 8)}...`);
    }

    return result;
  }

  /**
   * List wallets a user is tracking
   */
  async listTrackedWallets(userId: string): Promise<any[]> {
    return prisma.walletTrack.findMany({ where: { userId } });
  }

  /**
   * Get recent trades for a wallet (from cache or fetch)
   */
  async getWalletTrades(address: string, limit = 25): Promise<EnrichedWalletTrade[]> {
    // Check cache first
    const cached = this.recentTrades.get(address);
    if (cached && cached.length > 0) {
      return cached.slice(0, limit);
    }

    // No cached trades - would need to implement historical fetch from Helius
    // For now, return empty array with note
    console.log(`[WalletTracker] No cached trades for ${address}, historical fetch not implemented yet`);
    return [];
  }

  /**
   * Get all recent trades for a user's tracked wallets
   */
  async getUserWalletTrades(userId: string, limit = 25): Promise<EnrichedWalletTrade[]> {
    const trackedWallets = await this.listTrackedWallets(userId);
    const allTrades: EnrichedWalletTrade[] = [];

    for (const wallet of trackedWallets) {
      const trades = await this.getWalletTrades(wallet.address, limit);
      allTrades.push(...trades);
    }

    // Sort by timestamp descending
    allTrades.sort((a, b) => b.timestamp - a.timestamp);

    return allTrades.slice(0, limit);
  }

  /**
   * Initialize service by loading all tracked wallets and subscribing
   */
  async initialize(): Promise<void> {
    console.log('[WalletTracker] Initializing...');

    // Load all tracked wallets from database
    const allTracked = await prisma.walletTrack.findMany();
    
    // Group by user
    for (const track of allTracked) {
      if (!this.trackedWallets.has(track.userId)) {
        this.trackedWallets.set(track.userId, new Set());
      }
      this.trackedWallets.get(track.userId)!.add(track.address);
    }

    // Get unique wallet addresses
    const allWallets = new Set<string>();
    this.trackedWallets.forEach(wallets => {
      wallets.forEach(w => allWallets.add(w));
    });

    if (allWallets.size > 0) {
      console.log(`[WalletTracker] Loaded ${allWallets.size} unique wallets from ${this.trackedWallets.size} users`);
      
      // Subscribe to all wallets
      if (pumpPortalStreamService.isConnected) {
        pumpPortalStreamService.subscribeToWallets(Array.from(allWallets));
        console.log(`[WalletTracker] Subscribed to ${allWallets.size} wallets`);
      }
    } else {
      console.log('[WalletTracker] No wallets to track');
    }
  }

  /**
   * Resubscribe all wallets (called after reconnection)
   */
  private resubscribeAllWallets(): void {
    const allWallets = new Set<string>();
    this.trackedWallets.forEach(wallets => {
      wallets.forEach(w => allWallets.add(w));
    });

    if (allWallets.size > 0 && pumpPortalStreamService.isConnected) {
      pumpPortalStreamService.subscribeToWallets(Array.from(allWallets));
      console.log(`[WalletTracker] Resubscribed to ${allWallets.size} wallets`);
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalUsers: this.trackedWallets.size,
      totalWallets: Array.from(this.trackedWallets.values()).reduce((sum, set) => sum + set.size, 0),
      uniqueWallets: new Set(Array.from(this.trackedWallets.values()).flatMap(s => Array.from(s))).size,
      pumpPortalConnected: pumpPortalStreamService.isConnected,
      subscribedWallets: pumpPortalStreamService.getSubscribedWalletCount(),
    };
  }
}

// Singleton instance
export const walletTrackerService = new WalletTrackerServicePumpPortal();

// Export individual functions for backward compatibility
export const followWallet = (userId: string, address: string, alias?: string) => 
  walletTrackerService.followWallet(userId, address, alias);

export const unfollowWallet = (userId: string, address: string) => 
  walletTrackerService.unfollowWallet(userId, address);

export const listTrackedWallets = (userId: string) => 
  walletTrackerService.listTrackedWallets(userId);

export const getWalletTrades = (address: string, limit?: number) => 
  walletTrackerService.getWalletTrades(address, limit);
