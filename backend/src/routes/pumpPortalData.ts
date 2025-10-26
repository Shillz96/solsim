/**
 * Real-Time Trade Data API Routes
 *
 * Uses Helius Enhanced WebSocket for real-time on-chain trade monitoring.
 * Provides accurate, low-latency trade data and top trader analytics.
 */

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import Redis from 'ioredis';
import { heliusTradeStreamService } from '../services/heliusTradeStreamService.js';
import { pumpPortalStreamService } from '../services/pumpPortalStreamService.js';

const redis = new Redis(process.env.REDIS_URL || '');

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

        console.log(`[TradeData] Subscribing to Helius stream for ${mint}...`);
        
        // Subscribe to Helius for this token
        await heliusTradeStreamService.subscribeToTokens([mint]);

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
        reply.raw.write(`data: ${JSON.stringify({ type: 'history', trades })}\n\n`);

        // Listen for new trades from Helius stream
        const tradeHandler = (event: any) => {
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
            
            reply.raw.write(`data: ${JSON.stringify({ type: 'trade', trade })}\n\n`);
          }
        };

        heliusTradeStreamService.on('trade', tradeHandler);

        // Send keepalive every 15 seconds
        const keepaliveInterval = setInterval(() => {
          reply.raw.write(': keepalive\n\n');
        }, 15000);

        // Cleanup on connection close
        request.raw.on('close', () => {
          heliusTradeStreamService.off('trade', tradeHandler);
          clearInterval(keepaliveInterval);
          reply.raw.end();
        });

      } catch (error: any) {
        console.error('[TradeData] Error setting up trade stream:', error);
        reply.raw.end();
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

        // Send initial cached metadata
        const cacheKey = REDIS_KEYS.metadata(mint);
        const metadataStr = await redis.get(cacheKey);

        let metadata: TokenMetadata | null = null;
        
        if (metadataStr) {
          metadata = JSON.parse(metadataStr);
          reply.raw.write(`data: ${JSON.stringify({ type: 'metadata', metadata })}\n\n`);
        } else {
          // No cached metadata - fetch from pump.fun API as fallback
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
                imageUrl: coinData.image_uri,
                twitter: coinData.twitter,
                telegram: coinData.telegram,
                website: coinData.website,
                holderCount: coinData.usd_market_cap ? Math.floor(coinData.usd_market_cap / 1000) : undefined, // Estimate
                marketCapSol: coinData.usd_market_cap ? coinData.usd_market_cap / 150 : undefined, // Rough estimate
                timestamp: Date.now(),
              };
              
              reply.raw.write(`data: ${JSON.stringify({ type: 'metadata', metadata })}\n\n`);
              console.log(`✅ Fetched metadata from pump.fun API`);
            }
          } catch (err) {
            console.warn('[PumpPortalData] Failed to fetch metadata from pump.fun API:', err);
          }
        }

        // Listen for new token events (contains updated metadata)
        const metadataHandler = (event: any) => {
          if (event.token?.mint === mint) {
            const metadata: TokenMetadata = {
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

            reply.raw.write(`data: ${JSON.stringify({ type: 'metadata', metadata })}\n\n`);
          }
        };

        pumpPortalStreamService.on('newToken', metadataHandler);

        // Send keepalive every 15 seconds
        const keepaliveInterval = setInterval(() => {
          reply.raw.write(': keepalive\n\n');
        }, 15000);

        // Cleanup on connection close
        request.raw.on('close', () => {
          pumpPortalStreamService.off('newToken', metadataHandler);
          clearInterval(keepaliveInterval);
          reply.raw.end();
        });

      } catch (error: any) {
        console.error('[PumpPortalData] Error setting up metadata stream:', error);
        reply.raw.end();
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
