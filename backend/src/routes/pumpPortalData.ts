/**
 * Real-Time Trade Data API Routes
 *
 * Uses Helius Enhanced WebSocket for real-time on-chain trade monitoring.
 * Provides accurate, low-latency trade data and top trader analytics.
 */

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { getRedisClient } from '../plugins/redisClient.js';
import { heliusTradeStreamService } from '../services/heliusTradeStreamService.js';
import { pumpPortalStreamService } from '../services/pumpPortalStreamService.js';

const redis = getRedisClient();

// ============================================================================
// TYPES
// ============================================================================

export interface RecentTrade {
  ts: number;
  side: 'buy' | 'sell';
  priceSol?: number;
  amountSol?: number;
  amountToken?: number;
  signer: string;
  sig: string;
  mint: string;
}

export interface TokenMetadata {
  mint: string;
  name?: string;
  symbol?: string;
  description?: string;
  imageUrl?: string;
  twitter?: string;
  telegram?: string;
  website?: string;
  holderCount?: number;
  marketCapSol?: number;
  vSolInBondingCurve?: number;
  vTokensInBondingCurve?: number;
  bondingCurveProgress?: number;
  timestamp: number;
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const MintParamSchema = z.object({
  mint: z.string().min(32).max(44), // Solana address
});

const TradeQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(50),
});

// ============================================================================
// REDIS CACHE KEYS
// ============================================================================

const REDIS_KEYS = {
  trades: (mint: string) => `pumpportal:trades:${mint}`,
  metadata: (mint: string) => `pumpportal:metadata:${mint}`,
  tradeCount: (mint: string) => `pumpportal:trade_count:${mint}`,
};

// TTL for cached data (seconds)
const TRADE_CACHE_TTL = 300; // 5 minutes
const METADATA_CACHE_TTL = 60; // 1 minute (more frequent updates)

// ============================================================================
// ROUTE PLUGIN
// ============================================================================

const pumpPortalDataRoutes: FastifyPluginAsync = async (fastify) => {
  // ==========================================================================
  // GET /api/pumpportal/trades/:mint
  // Server-Sent Events (SSE) stream for real-time trades from Helius
  // ==========================================================================
  fastify.get<{
    Params: z.infer<typeof MintParamSchema>;
    Querystring: z.infer<typeof TradeQuerySchema>;
  }>(
    '/trades/:mint',
    async (request, reply) => {
      let isConnectionClosed = false;
      let keepaliveInterval: NodeJS.Timeout | null = null;

      try {
        const { mint } = MintParamSchema.parse(request.params);
        const { limit } = TradeQuerySchema.parse(request.query);

        // Set up SSE headers
        reply.raw.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
        });

        console.log(`[TradeData] SSE connected for ${mint} (${request.ip})`);

        // Helper to safely write to stream
        const safeWrite = (data: string): boolean => {
          if (isConnectionClosed || reply.raw.destroyed) return false;
          try {
            return reply.raw.write(data);
          } catch (err) {
            console.error(`[TradeData] Write error for ${mint}:`, err);
            isConnectionClosed = true;
            return false;
          }
        };

        // Subscribe to Helius for this token
        try {
          await heliusTradeStreamService.subscribeToTokens([mint]);
        } catch (err) {
          console.error(`[TradeData] Failed to subscribe to Helius for ${mint}:`, err);
          // Continue anyway - we'll send empty history and wait for future trades
        }

        // Get trades from Helius (either from cache or freshly fetched)
        const heliusTrades = heliusTradeStreamService.getRecentTrades(mint, limit);
        const trades: RecentTrade[] = heliusTrades.map(t => ({
          ts: t.timestamp,
          side: t.side,
          priceSol: t.priceSol,
          amountSol: t.amountSol,
          amountToken: t.amountToken,
          signer: t.signer,
          sig: t.signature,
          mint: t.mint,
        }));

        console.log(`[TradeData] Sending ${trades.length} initial trades for ${mint}`);

        // Send initial history
        safeWrite(`data: ${JSON.stringify({ type: 'history', trades })}\n\n`);

        // Listen for new trades from Helius stream
        const tradeHandler = (event: any) => {
          if (isConnectionClosed) return;
          if (event.mint === mint) {
            const trade: RecentTrade = {
              ts: event.timestamp,
              side: event.side,
              priceSol: event.priceSol,
              amountSol: event.amountSol,
              amountToken: event.amountToken,
              signer: event.signer,
              sig: event.signature,
              mint: event.mint,
            };

            safeWrite(`data: ${JSON.stringify({ type: 'trade', trade })}\n\n`);
          }
        };

        heliusTradeStreamService.on('trade', tradeHandler);

        // Send keepalive every 15 seconds
        keepaliveInterval = setInterval(() => {
          if (!safeWrite(': keepalive\n\n')) {
            // Connection closed, stop keepalive
            if (keepaliveInterval) clearInterval(keepaliveInterval);
          }
        }, 15000);

        // Cleanup on connection close
        const cleanup = () => {
          if (isConnectionClosed) return;
          isConnectionClosed = true;

          heliusTradeStreamService.off('trade', tradeHandler);
          if (keepaliveInterval) clearInterval(keepaliveInterval);

          try {
            if (!reply.raw.destroyed) reply.raw.end();
          } catch (err) {
            // Ignore errors on cleanup
          }

          console.log(`[TradeData] SSE disconnected for ${mint}`);
        };

        request.raw.on('close', cleanup);
        request.raw.on('error', cleanup);

      } catch (error: any) {
        console.error('[TradeData] Error setting up trade stream:', error);
        isConnectionClosed = true;
        if (keepaliveInterval) clearInterval(keepaliveInterval);
        try {
          if (!reply.raw.destroyed) reply.raw.end();
        } catch (err) {
          // Ignore
        }
      }
    }
  );

  // ==========================================================================
  // GET /api/pumpportal/top-traders/:mint
  // Get top traders for a token from Helius trade data
  // ==========================================================================
  fastify.get<{
    Params: z.infer<typeof MintParamSchema>;
  }>(
    '/top-traders/:mint',
    async (request, reply) => {
      try {
        const { mint } = MintParamSchema.parse(request.params);

        // Subscribe to token if not already subscribed
        await heliusTradeStreamService.subscribeToTokens([mint]);

        // Get top traders from Helius service
        const topTraders = heliusTradeStreamService.getTopTraders(mint, 20);

        return {
          success: true,
          mint,
          topTraders,
          timestamp: Date.now(),
        };
      } catch (error: any) {
        return reply.code(500).send({
          success: false,
          error: error.message || 'Failed to get top traders',
        });
      }
    }
  );

  // ==========================================================================
  // GET /api/pumpportal/metadata/:mint
  // Server-Sent Events (SSE) stream for real-time token metadata
  // ==========================================================================
  fastify.get<{
    Params: z.infer<typeof MintParamSchema>;
  }>(
    '/metadata/:mint',
    async (request, reply) => {
      let isConnectionClosed = false;
      let keepaliveInterval: NodeJS.Timeout | null = null;

      try {
        const { mint } = MintParamSchema.parse(request.params);

        // Subscribe to this token if not already subscribed
        pumpPortalStreamService.subscribeToTokens([mint]);

        // Set up SSE headers
        reply.raw.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
        });

        console.log(`[PumpPortalData] Metadata SSE connected for ${mint}`);

        // Helper to safely write to stream
        const safeWrite = (data: string): boolean => {
          if (isConnectionClosed || reply.raw.destroyed) return false;
          try {
            return reply.raw.write(data);
          } catch (err) {
            console.error(`[PumpPortalData] Metadata write error for ${mint}:`, err);
            isConnectionClosed = true;
            return false;
          }
        };

        // Simple URL normalizer for emitted image URLs
        const normalizeImage = (u?: string): string | undefined => {
          if (!u) return undefined;
          if (/^http:\/\/\d+\.\d+\.\d+\.\d+/.test(u)) return undefined; // block raw IP over http
          if (u.startsWith('//')) return `https:${u}`;
          if (u.startsWith('ipfs://')) return `https://ipfs.io/ipfs/${u.replace('ipfs://', '').replace(/^ipfs\//, '')}`;
          if (/^[a-zA-Z0-9]{46,100}$/.test(u)) return `https://ipfs.io/ipfs/${u}`;
          if (u.startsWith('ar://')) return `https://arweave.net/${u.replace('ar://', '')}`;
          if (!/^https?:\/\//.test(u) && u.startsWith('dd.dexscreener.com')) return `https://${u}`;
          return u;
        };

        // Send initial cached metadata
        const cacheKey = REDIS_KEYS.metadata(mint);
        let metadata: TokenMetadata | null = null;

        try {
          const metadataStr = await redis.get(cacheKey);
          if (metadataStr) {
            metadata = JSON.parse(metadataStr);
            if (metadata) {
              metadata.imageUrl = normalizeImage(metadata.imageUrl);
              safeWrite(`data: ${JSON.stringify({ type: 'metadata', metadata })}\n\n`);
            }
          }
        } catch (err) {
          console.warn(`[PumpPortalData] Redis error getting metadata for ${mint}:`, err);
        }

        // If no cached metadata, fetch from pump.fun API as fallback
        if (!metadata) {
          try {
            console.log(`[PumpPortalData] No cached metadata for ${mint}, fetching from pump.fun API...`);
            const pumpFunResponse = await fetch(`https://frontend-api.pump.fun/coins/${mint}`, {
              signal: AbortSignal.timeout(5000),
            });

            if (pumpFunResponse.ok) {
              const coinData = await pumpFunResponse.json();

              metadata = {
                mint: mint,
                name: coinData.name,
                symbol: coinData.symbol,
                description: coinData.description,
                imageUrl: normalizeImage(coinData.image_uri),
                twitter: coinData.twitter,
                telegram: coinData.telegram,
                website: coinData.website,
                holderCount: coinData.usd_market_cap ? Math.floor(coinData.usd_market_cap / 1000) : undefined,
                marketCapSol: coinData.usd_market_cap ? coinData.usd_market_cap / 150 : undefined,
                timestamp: Date.now(),
              };

              safeWrite(`data: ${JSON.stringify({ type: 'metadata', metadata })}\n\n`);
              console.log(`✅ Fetched metadata from pump.fun API for ${mint}`);
            }
          } catch (err) {
            console.warn('[PumpPortalData] Failed to fetch metadata from pump.fun API:', err);
          }
        }

        // Listen for new token events (contains updated metadata)
        const metadataHandler = (event: any) => {
          if (isConnectionClosed) return;
          if (event.token?.mint === mint) {
            const metadata: TokenMetadata = {
              mint: event.token.mint,
              name: event.token.name,
              symbol: event.token.symbol,
              description: event.token.description,
              // Only emit an image-like URL; many events send a metadata JSON uri here
              imageUrl: normalizeImage(event.token.uri),
              twitter: event.token.twitter,
              telegram: event.token.telegram,
              website: event.token.website,
              holderCount: event.token.holderCount,
              marketCapSol: event.token.marketCapSol,
              vSolInBondingCurve: event.token.vSolInBondingCurve,
              vTokensInBondingCurve: event.token.vTokensInBondingCurve,
              timestamp: event.timestamp,
            };

            safeWrite(`data: ${JSON.stringify({ type: 'metadata', metadata })}\n\n`);
          }
        };

        pumpPortalStreamService.on('newToken', metadataHandler);

        // Send keepalive every 15 seconds
        keepaliveInterval = setInterval(() => {
          if (!safeWrite(': keepalive\n\n')) {
            if (keepaliveInterval) clearInterval(keepaliveInterval);
          }
        }, 15000);

        // Cleanup on connection close
        const cleanup = () => {
          if (isConnectionClosed) return;
          isConnectionClosed = true;

          pumpPortalStreamService.off('newToken', metadataHandler);
          if (keepaliveInterval) clearInterval(keepaliveInterval);

          try {
            if (!reply.raw.destroyed) reply.raw.end();
          } catch (err) {
            // Ignore errors on cleanup
          }

          console.log(`[PumpPortalData] Metadata SSE disconnected for ${mint}`);
        };

        request.raw.on('close', cleanup);
        request.raw.on('error', cleanup);

      } catch (error: any) {
        console.error('[PumpPortalData] Error setting up metadata stream:', error);
        isConnectionClosed = true;
        if (keepaliveInterval) clearInterval(keepaliveInterval);
        try {
          if (!reply.raw.destroyed) reply.raw.end();
        } catch (err) {
          // Ignore
        }
      }
    }
  );

  // ==========================================================================
  // GET /api/pumpportal/status
  // Get WebSocket connection status and subscription info
  // ==========================================================================
  fastify.get('/status', async (request, reply) => {
    try {
      const subscribedTokenCount = pumpPortalStreamService.getSubscribedTokenCount();

      return {
        success: true,
        status: {
          connected: true, // If this endpoint responds, service is running
          subscribedTokens: subscribedTokenCount,
          timestamp: Date.now(),
        },
      };
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: error.message || 'Failed to get status',
      });
    }
  });
};

export default pumpPortalDataRoutes;
