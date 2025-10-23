/**
 * Market Data Routes
 *
 * Provides real-time and historical market data for tokens:
 * - Recent trades (from PumpPortal)
 * - Top traders (aggregated from trades)
 * - Holder distribution (from Helius/Solana RPC)
 */

import { FastifyInstance } from 'fastify';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || '');

export default async function marketRoutes(app: FastifyInstance) {
  /**
   * Get recent trades for a specific token
   * Returns last 50 trades from Redis cache
   */
  app.get('/market/trades/:mint', async (req, reply) => {
    const { mint } = req.params as { mint: string };

    if (!mint) {
      return reply.code(400).send({ error: 'mint required' });
    }

    try {
      // Get trades from Redis sorted set (most recent first)
      const tradesData = await redis.zrevrange(
        `market:trades:${mint}`,
        0,
        49, // Last 50 trades
        'WITHSCORES'
      );

      // Parse trades (format: [trade1, timestamp1, trade2, timestamp2, ...])
      const trades: any[] = [];
      for (let i = 0; i < tradesData.length; i += 2) {
        try {
          const trade = JSON.parse(tradesData[i]);
          const timestamp = parseInt(tradesData[i + 1]);
          trades.push({
            ...trade,
            timestamp,
          });
        } catch (e) {
          console.error('Error parsing trade:', e);
        }
      }

      return { trades };
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({ error: error.message || 'Failed to fetch trades' });
    }
  });

  /**
   * Get top traders for a specific token (24h)
   * Aggregates P&L from recent trades
   */
  app.get('/market/top-traders/:mint', async (req, reply) => {
    const { mint } = req.params as { mint: string };
    const { limit = '10' } = req.query as any;

    if (!mint) {
      return reply.code(400).send({ error: 'mint required' });
    }

    try {
      // Get trader stats from Redis hash
      const tradersData = await redis.hgetall(`market:traders:${mint}`);

      // Parse and sort traders by PnL
      const traders = Object.entries(tradersData)
        .map(([address, data]) => {
          try {
            return { address, ...JSON.parse(data) };
          } catch (e) {
            return null;
          }
        })
        .filter(Boolean)
        .sort((a: any, b: any) => (b.pnl || 0) - (a.pnl || 0))
        .slice(0, parseInt(limit));

      return { traders };
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({ error: error.message || 'Failed to fetch top traders' });
    }
  });

  /**
   * Get holder distribution for a specific token
   * Uses Helius/Solana RPC to get current holders
   */
  app.get('/market/holders/:mint', async (req, reply) => {
    const { mint } = req.params as { mint: string };
    const { limit = '20' } = req.query as any;

    if (!mint) {
      return reply.code(400).send({ error: 'mint required' });
    }

    try {
      // Check Redis cache first
      const cached = await redis.get(`market:holders:${mint}`);
      if (cached) {
        return JSON.parse(cached);
      }

      // TODO: Implement Helius API call to get token holders
      // For now, return placeholder
      return {
        holders: [],
        totalSupply: 0,
        holderCount: 0,
        message: 'Holder data coming soon'
      };
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({ error: error.message || 'Failed to fetch holders' });
    }
  });
}
