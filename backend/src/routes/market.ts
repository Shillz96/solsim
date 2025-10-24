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
      // First, try to get trades from Redis (populated by worker)
      const tradesData = await redis.zrevrange(
        `market:trades:${mint}`,
        0,
        49, // Last 50 trades
        'WITHSCORES'
      );

      // Parse trades from Redis
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

      // If no trades in Redis, fall back to DexScreener API
      if (trades.length === 0) {
        try {
          const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
          if (response.ok) {
            const data = await response.json();
            const pair = data.pairs?.[0];

            if (pair && pair.txns) {
              // Transform DexScreener transaction data to our format
              const buys = pair.txns.h24?.buys || 0;
              const sells = pair.txns.h24?.sells || 0;

              // Create synthetic trade data (DexScreener doesn't provide individual trades via API)
              if (buys > 0 || sells > 0) {
                return {
                  trades: [],
                  aggregated: {
                    buys24h: buys,
                    sells24h: sells,
                    volume24h: pair.volume?.h24 || 0,
                    message: 'Real-time trade feed coming soon. Showing 24h aggregated data.'
                  }
                };
              }
            }
          }
        } catch (error: any) {
          app.log.warn(`Failed to fetch DexScreener data for ${mint}: ${error.message}`);
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
      // Check Redis cache first (cache for 5 minutes)
      const cached = await redis.get(`market:holders:${mint}`);
      if (cached) {
        return JSON.parse(cached);
      }

      // Fetch token holders from Helius
      const heliusUrl = process.env.HELIUS_RPC_URL;
      if (!heliusUrl) {
        app.log.warn('HELIUS_RPC_URL not configured');
        return {
          holders: [],
          totalSupply: 0,
          holderCount: 0,
          message: 'Holder data service unavailable'
        };
      }

      // Get token accounts for this mint
      const response = await fetch(heliusUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getTokenLargestAccounts',
          params: [mint]
        })
      });

      if (!response.ok) {
        throw new Error(`Helius API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        app.log.error({ error: data.error }, 'Helius API error');
        return {
          holders: [],
          totalSupply: 0,
          holderCount: 0,
          message: 'Failed to fetch holder data'
        };
      }

      const accounts = data.result?.value || [];
      const totalSupply = accounts.reduce((sum: number, acc: any) =>
        sum + Number(acc.amount), 0
      );

      // Transform to holder format
      const holders = accounts
        .slice(0, parseInt(limit))
        .map((acc: any, index: number) => ({
          address: acc.address,
          balance: acc.amount,
          percentage: totalSupply > 0 ? (Number(acc.amount) / totalSupply) * 100 : 0,
          rank: index + 1
        }));

      const result = {
        holders,
        totalSupply: totalSupply.toString(),
        holderCount: accounts.length,
      };

      // Cache for 5 minutes
      await redis.setex(`market:holders:${mint}`, 300, JSON.stringify(result));

      return result;
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({ error: error.message || 'Failed to fetch holders' });
    }
  });

  /**
   * Market Lighthouse - Combined PumpPortal + CMC data
   * Returns aggregated market stats for hover component
   */
  app.get('/market/lighthouse', async (req, reply) => {
    try {
      // Get PumpPortal 24h volume from Redis
      const pumpData = await redis.get('market:lighthouse:pump');
      const pump = pumpData ? JSON.parse(pumpData) : null;

      // Get CMC total market cap from Redis
      const cmcData = await redis.get('market:cmc:global');
      const cmc = cmcData ? JSON.parse(cmcData) : {
        totalMarketCapUsd: null,
      };

      // Get Fear & Greed Index from CMC cache
      const fearGreedData = await redis.get('market:cmc:fear-greed');
      const fearGreed = fearGreedData ? JSON.parse(fearGreedData) : {
        value: null,
        classification: null,
      };

      // Get Altcoin Season Index from CMC cache
      const altcoinSeasonData = await redis.get('market:cmc:altcoin-season');
      const altcoinSeason = altcoinSeasonData ? JSON.parse(altcoinSeasonData) : {
        value: null,
      };

      return {
        pumpVolume24h: pump?.['24h']?.volumeSol || null,
        totalMarketCapUsd: cmc.totalMarketCapUsd || null,
        fearGreedIndex: fearGreed.value || null,
        fearGreedLabel: fearGreed.classification || null,
        altcoinSeasonIndex: altcoinSeason.value || null,
        ts: Date.now(),
      };
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({ error: error.message || 'Failed to fetch lighthouse data' });
    }
  });
}
