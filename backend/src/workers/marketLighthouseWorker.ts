/**
 * Market Lighthouse Worker
 * 
 * Aggregates real-time PumpPortal data into rolling time windows for the
 * Market Lighthouse hover component. Stores aggregated stats in Redis.
 * 
 * Tracks:
 * - Total trades per window (5m, 1h, 6h, 24h)
 * - Unique traders per window
 * - Total volume (SOL) per window
 * - New tokens created per window
 * - Migrations (bonding curve → Raydium) per window
 */

import { EventEmitter } from 'events';
import Redis from 'ioredis';
import { pumpPortalStreamService, SwapEvent, NewTokenEvent, MigrationEvent } from '../services/pumpPortalStreamService.js';

const redis = new Redis(process.env.REDIS_URL || '');

// Time windows in milliseconds
const WINDOWS = {
  '5m': 5 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
} as const;

type WindowKey = keyof typeof WINDOWS;

// In-memory rolling data structures
interface TradeEvent {
  ts: number;
  mint: string;
  trader: string;
  amountSol: number;
  side: 'buy' | 'sell';
}

interface TokenCreatedEvent {
  ts: number;
  mint: string;
}

interface MigrationEventData {
  ts: number;
  mint: string;
}

class MarketLighthouseWorker extends EventEmitter {
  private trades: TradeEvent[] = [];
  private tokensCreated: TokenCreatedEvent[] = [];
  private migrations: MigrationEventData[] = [];
  private snapshotInterval: NodeJS.Timeout | null = null;
  private pruneInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
  }

  /**
   * Start the worker
   */
  async start() {
    console.log('[MarketLighthouse] Starting worker...');

    // Listen to PumpPortal events
    pumpPortalStreamService.on('swap', this.handleSwap.bind(this));
    pumpPortalStreamService.on('newToken', this.handleNewToken.bind(this));
    pumpPortalStreamService.on('migration', this.handleMigration.bind(this));

    // Snapshot every 5 seconds
    this.snapshotInterval = setInterval(() => this.snapshot(), 5000);

    // Prune old data every minute
    this.pruneInterval = setInterval(() => this.pruneOldData(), 60000);

    console.log('✅ [MarketLighthouse] Worker started');
  }

  /**
   * Stop the worker
   */
  stop() {
    console.log('[MarketLighthouse] Stopping worker...');
    
    if (this.snapshotInterval) clearInterval(this.snapshotInterval);
    if (this.pruneInterval) clearInterval(this.pruneInterval);
    
    pumpPortalStreamService.off('swap', this.handleSwap.bind(this));
    pumpPortalStreamService.off('newToken', this.handleNewToken.bind(this));
    pumpPortalStreamService.off('migration', this.handleMigration.bind(this));
  }

  /**
   * Handle trade/swap events
   */
  private handleSwap(event: SwapEvent) {
    try {
      const trade: TradeEvent = {
        ts: event.timestamp || Date.now(),
        mint: event.mint,
        trader: event.user || 'unknown',
        amountSol: Math.abs(event.solAmount || 0),
        side: event.txType === 'buy' ? 'buy' : 'sell',
      };

      this.trades.push(trade);
    } catch (error) {
      console.error('[MarketLighthouse] Error handling swap:', error);
    }
  }

  /**
   * Handle new token creation events
   */
  private handleNewToken(event: NewTokenEvent) {
    try {
      const tokenEvent: TokenCreatedEvent = {
        ts: event.timestamp || Date.now(),
        mint: event.token.mint,
      };

      this.tokensCreated.push(tokenEvent);
    } catch (error) {
      console.error('[MarketLighthouse] Error handling new token:', error);
    }
  }

  /**
   * Handle migration events (bonding curve → Raydium)
   */
  private handleMigration(event: MigrationEvent) {
    try {
      const migrationEvent: MigrationEventData = {
        ts: event.timestamp || Date.now(),
        mint: event.mint,
      };

      this.migrations.push(migrationEvent);
    } catch (error) {
      console.error('[MarketLighthouse] Error handling migration:', error);
    }
  }

  /**
   * Prune events older than 24h
   */
  private pruneOldData() {
    const cutoff = Date.now() - WINDOWS['24h'];

    const tradesBefore = this.trades.length;
    const tokensBefore = this.tokensCreated.length;
    const migrationsBefore = this.migrations.length;

    this.trades = this.trades.filter(t => t.ts >= cutoff);
    this.tokensCreated = this.tokensCreated.filter(t => t.ts >= cutoff);
    this.migrations = this.migrations.filter(m => m.ts >= cutoff);

    const tradesRemoved = tradesBefore - this.trades.length;
    const tokensRemoved = tokensBefore - this.tokensCreated.length;
    const migrationsRemoved = migrationsBefore - this.migrations.length;

    if (tradesRemoved > 0 || tokensRemoved > 0 || migrationsRemoved > 0) {
      console.log(
        `[MarketLighthouse] Pruned: ${tradesRemoved} trades, ${tokensRemoved} tokens, ${migrationsRemoved} migrations`
      );
    }
  }

  /**
   * Calculate stats for each time window and save to Redis
   */
  private async snapshot() {
    try {
      const now = Date.now();
      const result: Record<WindowKey, any> = {} as any;

      for (const [key, windowMs] of Object.entries(WINDOWS)) {
        const cutoff = now - windowMs;

        // Filter events within this window
        const tradesInWindow = this.trades.filter(t => t.ts >= cutoff);
        const tokensInWindow = this.tokensCreated.filter(t => t.ts >= cutoff);
        const migrationsInWindow = this.migrations.filter(m => m.ts >= cutoff);

        // Calculate unique traders
        const uniqueTraders = new Set(tradesInWindow.map(t => t.trader)).size;

        // Calculate total volume
        const volumeSol = tradesInWindow.reduce((sum, t) => sum + t.amountSol, 0);

        result[key as WindowKey] = {
          totalTrades: tradesInWindow.length,
          traders: uniqueTraders,
          volumeSol: Math.round(volumeSol * 100) / 100, // Round to 2 decimals
          created: tokensInWindow.length,
          migrations: migrationsInWindow.length,
        };
      }

      // Save to Redis with 15 second expiry
      await redis.setex(
        'market:lighthouse:pump',
        15,
        JSON.stringify(result)
      );

      // Emit event for debugging
      this.emit('snapshot', result);
    } catch (error) {
      console.error('[MarketLighthouse] Error creating snapshot:', error);
    }
  }

  /**
   * Get current stats (for debugging)
   */
  getCurrentStats() {
    return {
      trades: this.trades.length,
      tokensCreated: this.tokensCreated.length,
      migrations: this.migrations.length,
    };
  }
}

// Singleton instance
export const marketLighthouseWorker = new MarketLighthouseWorker();
