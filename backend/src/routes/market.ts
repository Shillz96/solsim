/**
 * Market Data Routes
 *
 * Provides real-time and historical market data for tokens:
 * - Recent trades (from PumpPortal)
 * - Top traders (aggregated from trades)
 * - Holder distribution (from Helius/Solana RPC)
 */

import { FastifyInstance } from 'fastify';
import { getRedisClient } from '../plugins/redisClient.js';

const redis = getRedisClient();

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
      app.log.error({ error }, "Failed to fetch trades");
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
      app.log.error({ error }, "Failed to fetch top traders");
      return reply.code(500).send({ error: error.message || 'Failed to fetch top traders' });
    }
  });

  /**
   * Get holder distribution for a specific token
   * Uses Helius RPC via holderCountService for accurate holder counts
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

      // Import holderCountService
      const { holderCountService } = await import('../services/holderCountService.js');

      // Fetch both top holders and total holder count in parallel
      const [topHoldersAccounts, totalHolderCount] = await Promise.all([
        holderCountService.getTopHolders(mint),
        holderCountService.getHolderCount(mint)
      ]);

      if (!topHoldersAccounts || topHoldersAccounts.length === 0) {
        app.log.warn('No holder data returned from holderCountService');
        return {
          holders: [],
          totalSupply: '0',
          holderCount: totalHolderCount || 0,
          message: 'Holder data unavailable'
        };
      }

      // Calculate total supply from top holders
      const totalSupply = topHoldersAccounts.reduce((sum, acc) => 
        sum + parseFloat(acc.amount), 0
      );

      // Transform to expected format
      const holders = topHoldersAccounts
        .slice(0, parseInt(limit))
        .map((acc, index) => ({
          address: acc.address,
          balance: acc.amount,
          percentage: totalSupply > 0 ? (parseFloat(acc.amount) / totalSupply) * 100 : 0,
          rank: index + 1
        }));

      const result = {
        holders,
        totalSupply: totalSupply.toString(),
        holderCount: totalHolderCount || topHoldersAccounts.length,
      };

      // Cache for 60 minutes (PRODUCTION: holder counts change slowly, reduce Helius API calls)
      await redis.setex(`market:holders:${mint}`, 3600, JSON.stringify(result));

      return result;
    } catch (error: any) {
      app.log.error({ error }, "Failed to fetch holders");
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
      app.log.error({ error }, "Failed to fetch lighthouse data");
      return reply.code(500).send({ error: error.message || 'Failed to fetch lighthouse data' });
    }
  });

  /**
   * Get crypto prices (SOL, BTC, ETH) from CoinGecko
   * Proxies CoinGecko API to avoid CORS issues and rate limiting
   */
  app.get('/market/crypto-prices', async (req, reply) => {
    try {
      // Try to get cached prices from Redis (cached for 30 seconds)
      const cached = await redis.get('market:crypto-prices');
      if (cached) {
        const data = JSON.parse(cached);
        // If cache exists (even if stale), use it if we fail to fetch new data
        // Return it immediately if fresh (less than 30 seconds old)
        if (Date.now() - data.ts < 30000) {
          return data;
        }
      }

      // Fetch fresh data from CoinGecko
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=solana,bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true'
      );

      if (!response.ok) {
        // If we have cached data (even if stale), return it instead of failing
        if (cached) {
          app.log.warn(`CoinGecko API error ${response.status}, returning stale cache`);
          return JSON.parse(cached);
        }
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json();

      const result = {
        solana: {
          usd: data.solana?.usd || null,
          usd_24h_change: data.solana?.usd_24h_change || null,
        },
        bitcoin: {
          usd: data.bitcoin?.usd || null,
          usd_24h_change: data.bitcoin?.usd_24h_change || null,
        },
        ethereum: {
          usd: data.ethereum?.usd || null,
          usd_24h_change: data.ethereum?.usd_24h_change || null,
        },
        ts: Date.now(),
      };

      // Cache for 30 seconds
      await redis.setex('market:crypto-prices', 30, JSON.stringify(result));

      return result;
    } catch (error: any) {
      app.log.error({ error }, "Failed to fetch crypto prices");

      // Try to return stale cached data as last resort
      const cached = await redis.get('market:crypto-prices');
      if (cached) {
        app.log.warn('Returning stale cache due to error');
        return JSON.parse(cached);
      }

      // If no cache exists, return reasonable defaults instead of 500 error
      app.log.warn('No cache available, returning default values');
      return {
        solana: { usd: null, usd_24h_change: null },
        bitcoin: { usd: null, usd_24h_change: null },
        ethereum: { usd: null, usd_24h_change: null },
        ts: Date.now(),
        cached: false,
      };
    }
  });
}
