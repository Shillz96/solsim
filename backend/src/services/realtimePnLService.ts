/**
 * Real-time PnL Service
 *
 * Manages in-memory position state and broadcasts PnL updates via WebSocket
 * - Incremental O(1) PnL calculations
 * - Event-driven fill processing
 * - Push-based updates (no polling)
 * - Numeric precision with Decimal.js
 */

import Decimal from 'decimal.js';
import EventEmitter from 'events';
import redis from '../plugins/redis.js';
import prisma from '../plugins/prisma.js';

// In-memory position state
interface PositionState {
  userId: string;
  mint: string;
  tradeMode: 'PAPER' | 'REAL';
  qty: Decimal;
  avgCost: Decimal; // Average cost per token in USD
  costBasis: Decimal; // Total cost basis in USD
  realizedPnL: Decimal;
  lastUpdated: number;
}

// PnL tick event
interface PnLTickEvent {
  userId: string;
  mint: string;
  tradeMode: 'PAPER' | 'REAL';
  unrealizedPnL: number;
  totalPnL: number;
  qty: string;
  avgCost: string;
  currentPrice: number;
  timestamp: number;
}

// Fill event
interface FillEvent {
  userId: string;
  mint: string;
  tradeMode: 'PAPER' | 'REAL';
  side: 'BUY' | 'SELL';
  qty: number;
  price: number; // USD price per token
  fees: number; // Fees in USD
  timestamp: number;
}

// Portfolio-wide PnL aggregation
interface PortfolioPnL {
  userId: string;
  tradeMode: 'PAPER' | 'REAL';
  totalValue: number;
  totalCostBasis: number;
  realizedPnL: number;
  unrealizedPnL: number;
  totalPnL: number;
  timestamp: number;
}

class RealtimePnLService extends EventEmitter {
  private positions: Map<string, PositionState> = new Map();
  private priceCache: Map<string, number> = new Map(); // mint -> USD price
  private tickInterval: NodeJS.Timeout | null = null;
  private redisSubscriber: any = null;
  private historicalSnapshots: Map<string, number[]> = new Map(); // userId:tradeMode -> PnL history

  constructor() {
    super();
    this.setMaxListeners(1000); // Support many concurrent users
    this.initializeRedisSubscriber();
  }

  /**
   * Initialize Redis pub/sub for multi-instance support
   */
  private async initializeRedisSubscriber() {
    try {
      // Create a separate Redis client for subscribing using ioredis
      const Redis = await import('ioredis');
      this.redisSubscriber = new Redis.default(process.env.REDIS_URL || 'redis://localhost:6379');

      // Subscribe to PnL updates from other instances
      this.redisSubscriber.subscribe('pnl:broadcast');
      
      this.redisSubscriber.on('message', (channel: string, message: string) => {
        if (channel === 'pnl:broadcast') {
          try {
            const event = JSON.parse(message);
            // Re-emit locally so WebSocket clients on this instance get the update
            this.emit('pnlTick', event);
          } catch (err) {
            console.error('[RealtimePnL] Failed to parse Redis pub/sub message:', err);
          }
        }
      });

      console.log('[RealtimePnL] Redis pub/sub subscriber initialized for multi-instance support');
    } catch (error) {
      console.warn('[RealtimePnL] Redis pub/sub initialization failed (single-instance mode):', error);
    }
  }

  /**
   * Get position key
   */
  private getPositionKey(userId: string, mint: string, tradeMode: 'PAPER' | 'REAL'): string {
    return `${userId}:${mint}:${tradeMode}`;
  }

  /**
   * Initialize position from database (on first access or app restart)
   */
  async initializePosition(
    userId: string,
    mint: string,
    tradeMode: 'PAPER' | 'REAL',
    qty: string,
    costBasis: string
  ): Promise<void> {
    const key = this.getPositionKey(userId, mint, tradeMode);

    const qtyDec = new Decimal(qty || 0);
    const costBasisDec = new Decimal(costBasis || 0);
    const avgCost = qtyDec.gt(0) ? costBasisDec.div(qtyDec) : new Decimal(0);

    this.positions.set(key, {
      userId,
      mint,
      tradeMode,
      qty: qtyDec,
      avgCost,
      costBasis: costBasisDec,
      realizedPnL: new Decimal(0), // We'll sync this from DB if needed
      lastUpdated: Date.now()
    });

    console.log(`[RealtimePnL] Initialized position: ${key}`, {
      qty: qtyDec.toString(),
      avgCost: avgCost.toString(),
      costBasis: costBasisDec.toString()
    });
  }

  /**
   * Process BUY fill
   * newQty = qty + fillQty
   * avgCost = (avgCost * qty + fillQty * (fillPrice + fees)) / newQty
   */
  async processBuyFill(event: FillEvent): Promise<void> {
    const key = this.getPositionKey(event.userId, event.mint, event.tradeMode);

    let pos = this.positions.get(key);
    if (!pos) {
      // Initialize empty position
      pos = {
        userId: event.userId,
        mint: event.mint,
        tradeMode: event.tradeMode,
        qty: new Decimal(0),
        avgCost: new Decimal(0),
        costBasis: new Decimal(0),
        realizedPnL: new Decimal(0),
        lastUpdated: Date.now()
      };
      this.positions.set(key, pos);
    }

    const fillQty = new Decimal(event.qty);
    const fillPrice = new Decimal(event.price);
    const fees = new Decimal(event.fees);

    // Calculate new average cost
    const oldQty = pos.qty;
    const oldAvgCost = pos.avgCost;
    const newQty = oldQty.add(fillQty);

    if (newQty.gt(0)) {
      const oldCost = oldAvgCost.mul(oldQty);
      const newCost = fillQty.mul(fillPrice.add(fees.div(fillQty))); // Distribute fees across tokens
      const totalCost = oldCost.add(newCost);
      pos.avgCost = totalCost.div(newQty);
      pos.costBasis = totalCost;
    }

    pos.qty = newQty;
    pos.lastUpdated = Date.now();

    console.log(`[RealtimePnL] BUY fill processed: ${key}`, {
      fillQty: fillQty.toString(),
      fillPrice: fillPrice.toString(),
      newQty: newQty.toString(),
      newAvgCost: pos.avgCost.toString()
    });

    // Broadcast update
    this.broadcastPositionUpdate(pos);
  }

  /**
   * Process SELL fill
   * realizedPnL += (fillPrice - avgCost) * fillQty - fees
   * qty -= fillQty
   */
  async processSellFill(event: FillEvent): Promise<void> {
    const key = this.getPositionKey(event.userId, event.mint, event.tradeMode);

    let pos = this.positions.get(key);
    if (!pos) {
      // Position not in cache - attempt to reload from database
      console.warn(`[RealtimePnL] SELL fill for position not in cache, attempting DB reload: ${key}`);

      try {
        // Fetch position from database
        const dbPosition = await prisma.position.findUnique({
          where: {
            userId_mint_tradeMode: {
              userId: event.userId,
              mint: event.mint,
              tradeMode: event.tradeMode
            }
          }
        });

        if (!dbPosition) {
          console.warn(`[RealtimePnL] Position not found in DB - user may have closed position: ${key}`);
          return;
        }

        // Initialize position in cache with DB data
        await this.initializePosition(
          event.userId,
          event.mint,
          event.tradeMode,
          dbPosition.qty.toString(),
          dbPosition.costBasis.toString()
        );
        pos = this.positions.get(key);

        console.log(`[RealtimePnL] Successfully reloaded position from DB: ${key}`);
      } catch (error) {
        console.error(`[RealtimePnL] Failed to reload position from DB: ${key}`, error);
        return;
      }
    }

    const fillQty = new Decimal(event.qty);
    const fillPrice = new Decimal(event.price);
    const fees = new Decimal(event.fees);

    // Calculate realized PnL
    const realizedGain = fillPrice.sub(pos.avgCost).mul(fillQty).sub(fees);
    pos.realizedPnL = pos.realizedPnL.add(realizedGain);

    // Reduce quantity and cost basis
    pos.qty = pos.qty.sub(fillQty);
    if (pos.qty.lte(0)) {
      pos.qty = new Decimal(0);
      pos.costBasis = new Decimal(0);
      pos.avgCost = new Decimal(0);
    } else {
      pos.costBasis = pos.qty.mul(pos.avgCost);
    }

    pos.lastUpdated = Date.now();

    console.log(`[RealtimePnL] SELL fill processed: ${key}`, {
      fillQty: fillQty.toString(),
      fillPrice: fillPrice.toString(),
      realizedGain: realizedGain.toString(),
      newQty: pos.qty.toString()
    });

    // Broadcast update
    this.broadcastPositionUpdate(pos);
  }

  /**
   * Update price cache
   */
  updatePrice(mint: string, price: number): void {
    this.priceCache.set(mint, price);
  }

  /**
   * Broadcast position update to all subscribers
   */
  private broadcastPositionUpdate(pos: PositionState): void {
    const currentPrice = this.priceCache.get(pos.mint) || 0;

    // Calculate unrealized PnL
    const currentValue = pos.qty.mul(currentPrice);
    const unrealizedPnL = currentValue.sub(pos.costBasis);
    const totalPnL = pos.realizedPnL.add(unrealizedPnL);

    const event: PnLTickEvent = {
      userId: pos.userId,
      mint: pos.mint,
      tradeMode: pos.tradeMode,
      unrealizedPnL: unrealizedPnL.toNumber(),
      totalPnL: totalPnL.toNumber(),
      qty: pos.qty.toString(),
      avgCost: pos.avgCost.toString(),
      currentPrice,
      timestamp: Date.now()
    };

    // Emit event for local WebSocket broadcasting
    this.emit('pnlTick', event);

    // Publish to Redis for multi-instance support (fan-out to all instances)
    try {
      redis.publish('pnl:broadcast', JSON.stringify(event));
    } catch (error) {
      console.error('[RealtimePnL] Redis publish error:', error);
    }

    // Track historical PnL snapshot
    this.trackHistoricalSnapshot(pos.userId, pos.tradeMode, totalPnL.toNumber());
  }

  /**
   * Track historical PnL snapshots (for charting)
   * Keeps last 1000 data points in memory + persists to Redis
   */
  private trackHistoricalSnapshot(userId: string, tradeMode: 'PAPER' | 'REAL', totalPnL: number): void {
    const key = `${userId}:${tradeMode}`;
    const MAX_SNAPSHOTS = 1000;

    if (!this.historicalSnapshots.has(key)) {
      this.historicalSnapshots.set(key, []);
    }

    const snapshots = this.historicalSnapshots.get(key)!;
    snapshots.push(totalPnL);

    // Keep only last 1000 points
    if (snapshots.length > MAX_SNAPSHOTS) {
      snapshots.shift();
    }

    // Persist to Redis every 10 snapshots (reduces write load)
    if (snapshots.length % 10 === 0) {
      try {
        redis.set(
          `pnl:history:${key}`,
          JSON.stringify(snapshots.slice(-100)), // Store last 100 points
          'EX',
          86400 // 24 hour TTL
        );
      } catch (error) {
        console.warn('[RealtimePnL] Failed to persist historical snapshot:', error);
      }
    }
  }

  /**
   * Get historical PnL data for charting
   */
  async getHistoricalPnL(userId: string, tradeMode: 'PAPER' | 'REAL'): Promise<number[]> {
    const key = `${userId}:${tradeMode}`;

    // Try in-memory first
    if (this.historicalSnapshots.has(key)) {
      return this.historicalSnapshots.get(key)!;
    }

    // Fall back to Redis
    try {
      const data = await redis.get(`pnl:history:${key}`);
      if (data) {
        const snapshots = JSON.parse(data);
        this.historicalSnapshots.set(key, snapshots);
        return snapshots;
      }
    } catch (error) {
      console.warn('[RealtimePnL] Failed to load historical data from Redis:', error);
    }

    return [];
  }

  /**
   * Calculate and broadcast portfolio-wide PnL
   */
  async broadcastPortfolioPnL(userId: string, tradeMode: 'PAPER' | 'REAL'): Promise<void> {
    const positions = this.getUserPositions(userId, tradeMode);

    let totalValue = 0;
    let totalCostBasis = 0;
    let totalRealizedPnL = 0;

    for (const pos of positions) {
      const currentPrice = this.priceCache.get(pos.mint) || 0;
      const positionValue = pos.qty.mul(currentPrice).toNumber();

      totalValue += positionValue;
      totalCostBasis += pos.costBasis.toNumber();
      totalRealizedPnL += pos.realizedPnL.toNumber();
    }

    const unrealizedPnL = totalValue - totalCostBasis;
    const totalPnL = totalRealizedPnL + unrealizedPnL;

    const portfolioEvent: PortfolioPnL = {
      userId,
      tradeMode,
      totalValue,
      totalCostBasis,
      realizedPnL: totalRealizedPnL,
      unrealizedPnL,
      totalPnL,
      timestamp: Date.now()
    };

    // Emit portfolio-wide event
    this.emit('portfolioPnl', portfolioEvent);

    // Publish to Redis
    try {
      redis.publish('pnl:portfolio:broadcast', JSON.stringify(portfolioEvent));
    } catch (error) {
      console.error('[RealtimePnL] Failed to publish portfolio PnL:', error);
    }

    // Track portfolio-wide historical PnL
    this.trackHistoricalSnapshot(userId, tradeMode, totalPnL);
  }

  /**
   * Get current position state
   */
  getPosition(userId: string, mint: string, tradeMode: 'PAPER' | 'REAL'): PositionState | null {
    const key = this.getPositionKey(userId, mint, tradeMode);
    return this.positions.get(key) || null;
  }

  /**
   * Get all positions for a user
   */
  getUserPositions(userId: string, tradeMode: 'PAPER' | 'REAL'): PositionState[] {
    const positions: PositionState[] = [];
    for (const [key, pos] of this.positions.entries()) {
      if (pos.userId === userId && pos.tradeMode === tradeMode) {
        positions.push(pos);
      }
    }
    return positions;
  }

  /**
   * Start price tick broadcasting (5-10 Hz)
   */
  startPriceTicks(intervalMs: number = 200): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
    }

    this.tickInterval = setInterval(() => {
      // Track unique users to broadcast portfolio-wide PnL once per user
      const usersToBroadcast = new Set<string>();

      // Broadcast PnL updates for all positions with price changes
      for (const [key, pos] of this.positions.entries()) {
        if (pos.qty.gt(0)) {
          this.broadcastPositionUpdate(pos);

          // Track user for portfolio-wide broadcast
          const userKey = `${pos.userId}:${pos.tradeMode}`;
          usersToBroadcast.add(userKey);
        }
      }

      // Broadcast portfolio-wide PnL for each user
      for (const userKey of usersToBroadcast) {
        const [userId, tradeMode] = userKey.split(':');
        this.broadcastPortfolioPnL(userId, tradeMode as 'PAPER' | 'REAL');
      }
    }, intervalMs);

    console.log(`[RealtimePnL] Started price ticks at ${intervalMs}ms interval (${1000/intervalMs} Hz)`);
  }

  /**
   * Stop price tick broadcasting
   */
  stopPriceTicks(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
      console.log('[RealtimePnL] Stopped price ticks');
    }
  }

  /**
   * Clean up old positions (not accessed in 24h)
   */
  cleanup(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [key, pos] of this.positions.entries()) {
      if (now - pos.lastUpdated > maxAge && pos.qty.lte(0)) {
        this.positions.delete(key);
        console.log(`[RealtimePnL] Cleaned up old position: ${key}`);
      }
    }
  }
}

// Singleton instance
export const realtimePnLService = new RealtimePnLService();

// Start cleanup every hour
setInterval(() => {
  realtimePnLService.cleanup();
}, 60 * 60 * 1000);
