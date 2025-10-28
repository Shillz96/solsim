/**
 * Warp Pipes Hub API Routes
 *
 * Endpoints for token discovery feed, watch management, and health data.
 */

import { FastifyPluginAsync } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import Redis from 'ioredis';
import { authenticateToken, type AuthenticatedRequest } from '../plugins/auth.js';
import { healthCapsuleService } from '../services/healthCapsuleService.js';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || '');

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const FeedQuerySchema = z.object({
  // Existing filters
  searchQuery: z.string().optional(),
  sortBy: z.enum(['hot', 'new', 'watched', 'alphabetical', 'volume']).optional().default('volume'),
  minLiquidity: z.coerce.number().optional().default(2000),
  onlyWatched: z.coerce.boolean().optional().default(false),
  requireSecurity: z.coerce.boolean().optional().default(true),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  status: z.enum(['LAUNCHING', 'ACTIVE', 'ABOUT_TO_BOND', 'BONDED', 'DEAD']).optional(),
  
  // NEW AUDIT FILTERS
  dexPaid: z.coerce.boolean().optional(), // mintRenounced && freezeRevoked
  minAge: z.coerce.number().optional(), // Minutes since creation
  maxAge: z.coerce.number().optional(),
  maxTop10Holders: z.coerce.number().optional(), // Percentage (e.g., 25 = 25%)
  maxDevHolding: z.coerce.number().optional(), // Percentage
  maxSnipers: z.coerce.number().optional(), // Percentage (if data available)
  
  // NEW $ METRICS FILTERS
  minLiquidityUsd: z.coerce.number().optional(),
  maxLiquidityUsd: z.coerce.number().optional(),
  minVolume24h: z.coerce.number().optional(),
  maxVolume24h: z.coerce.number().optional(),
  minMarketCap: z.coerce.number().optional(),
  maxMarketCap: z.coerce.number().optional(),
  
  // NEW SOCIAL FILTERS
  requireTwitter: z.coerce.boolean().optional(),
  requireTelegram: z.coerce.boolean().optional(),
  requireWebsite: z.coerce.boolean().optional(),
  
  // BONDING CURVE FILTERS (for graduating tokens)
  minBondingProgress: z.coerce.number().optional(), // 0-100
  maxBondingProgress: z.coerce.number().optional(),
  minSolToGraduate: z.coerce.number().optional(),
  maxSolToGraduate: z.coerce.number().optional(),
});

const AddWatchSchema = z.object({
  mint: z.string().min(32).max(44), // Solana public key length
  preferences: z
    .object({
      notifyOnGraduation: z.boolean().optional(),
      notifyOnMigration: z.boolean().optional(),
      notifyOnPriceChange: z.boolean().optional(),
    })
    .optional(),
});

const UpdateWatchSchema = z.object({
  preferences: z.object({
    notifyOnGraduation: z.boolean().optional(),
    notifyOnMigration: z.boolean().optional(),
    notifyOnPriceChange: z.boolean().optional(),
  }),
});

// ============================================================================
// ROUTE PLUGIN
// ============================================================================

const warpPipesRoutes: FastifyPluginAsync = async (fastify) => {
  // ==========================================================================
  // GET /api/warp-pipes/feed
  // Get token discovery feed (bonded, graduating, new)
  // ==========================================================================
  fastify.get(
    '/feed',
    async (request: AuthenticatedRequest, reply) => {
      try {
        const { 
          searchQuery, sortBy, minLiquidity, onlyWatched, requireSecurity, limit, status,
          // Audit filters
          dexPaid, minAge, maxAge, maxTop10Holders, maxDevHolding, maxSnipers,
          // $ Metrics filters
          minLiquidityUsd, maxLiquidityUsd, minVolume24h, maxVolume24h, minMarketCap, maxMarketCap,
          // Social filters
          requireTwitter, requireTelegram, requireWebsite,
          // Bonding curve filters
          minBondingProgress, maxBondingProgress, minSolToGraduate, maxSolToGraduate
        } = FeedQuerySchema.parse(request.query);

        // Get userId from JWT if authenticated (optional)
        const userId = request.user?.id;

        // Build base query
        const baseWhere: any = {
          // Exclude DEAD tokens by default unless explicitly requested
          status: status ? status : { not: 'DEAD' }
        };

        // Filter by search query (symbol or name)
        if (searchQuery) {
          baseWhere.OR = [
            { symbol: { contains: searchQuery, mode: 'insensitive' } },
            { name: { contains: searchQuery, mode: 'insensitive' } },
          ];
        }

        // Filter by minimum liquidity
        if (minLiquidity) {
          baseWhere.liquidityUsd = { gte: minLiquidity };
        }

        // Quality filters (Axiom-style defaults)
        if (requireSecurity) {
          baseWhere.freezeRevoked = true;
          baseWhere.mintRenounced = true;
        }

        // Filter test/rug tokens
        baseWhere.NOT = {
          OR: [
            { name: { contains: 'test', mode: 'insensitive' } },
            { name: { contains: 'rug', mode: 'insensitive' } },
            { symbol: { contains: 'test', mode: 'insensitive' } },
            { symbol: { contains: 'rug', mode: 'insensitive' } },
          ],
        };

        // Filter by watched tokens (requires authentication)
        if (onlyWatched && userId) {
          const watchedMints = await prisma.tokenWatch.findMany({
            where: { userId },
            select: { mint: true },
          });
          baseWhere.mint = { in: watchedMints.map((w) => w.mint) };
        }

        // ============================================================================
        // NEW ADVANCED FILTERS
        // ============================================================================

        // Audit filters
        if (dexPaid) {
          baseWhere.freezeRevoked = true;
          baseWhere.mintRenounced = true;
        }

        if (minAge || maxAge) {
          const now = new Date();
          if (maxAge) {
            const minDate = new Date(now.getTime() - maxAge * 60000);
            baseWhere.firstSeenAt = { gte: minDate };
          }
          if (minAge) {
            const maxDate = new Date(now.getTime() - minAge * 60000);
            baseWhere.firstSeenAt = { ...baseWhere.firstSeenAt, lte: maxDate };
          }
        }

        if (maxTop10Holders) {
          baseWhere.top5HolderPct = { lte: maxTop10Holders };
        }

        if (maxDevHolding) {
          // Note: This would need a devHoldingPct field in the schema
          // For now, we'll use creatorWallet as a proxy
          baseWhere.creatorWallet = { not: null };
        }

        // $ Metrics filters
        if (minLiquidityUsd || maxLiquidityUsd) {
          baseWhere.liquidityUsd = {
            ...(minLiquidityUsd ? { gte: minLiquidityUsd } : {}),
            ...(maxLiquidityUsd ? { lte: maxLiquidityUsd } : {}),
          };
        }

        if (minVolume24h || maxVolume24h) {
          baseWhere.volume24h = {
            ...(minVolume24h ? { gte: minVolume24h } : {}),
            ...(maxVolume24h ? { lte: maxVolume24h } : {}),
          };
        }

        if (minMarketCap || maxMarketCap) {
          baseWhere.marketCapUsd = {
            ...(minMarketCap ? { gte: minMarketCap } : {}),
            ...(maxMarketCap ? { lte: maxMarketCap } : {}),
          };
        }

        // Social filters
        if (requireTwitter) {
          baseWhere.twitter = { not: null };
        }
        if (requireTelegram) {
          baseWhere.telegram = { not: null };
        }
        if (requireWebsite) {
          baseWhere.website = { not: null };
        }

        // Bonding curve filters
        if (minBondingProgress || maxBondingProgress) {
          baseWhere.bondingCurveProgress = {
            ...(minBondingProgress ? { gte: minBondingProgress } : {}),
            ...(maxBondingProgress ? { lte: maxBondingProgress } : {}),
          };
        }

        if (minSolToGraduate || maxSolToGraduate) {
          baseWhere.solToGraduate = {
            ...(minSolToGraduate ? { gte: minSolToGraduate } : {}),
            ...(maxSolToGraduate ? { lte: maxSolToGraduate } : {}),
          };
        }

        // Determine sort order
        const orderBy: any = {};
        switch (sortBy) {
          case 'volume':
            orderBy.volume24h = 'desc';
            break;
          case 'hot':
            orderBy.hotScore = 'desc';
            break;
          case 'new':
            orderBy.firstSeenAt = 'desc';
            break;
          case 'watched':
            orderBy.watcherCount = 'desc';
            break;
          case 'alphabetical':
            orderBy.symbol = 'asc';
            break;
        }

        // Fetch tokens for each state
        const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
        
        const [bonded, graduating, newTokens] = await Promise.all([
          // Bonded tokens - only last 12 hours
          prisma.tokenDiscovery.findMany({
            where: { 
              ...baseWhere, 
              state: 'bonded',
              stateChangedAt: { gte: twelveHoursAgo }
            },
            orderBy,
            take: limit,
          }),

          // Graduating tokens
          prisma.tokenDiscovery.findMany({
            where: { ...baseWhere, state: 'graduating' },
            orderBy,
            take: limit,
          }),

          // New tokens
          prisma.tokenDiscovery.findMany({
            where: { ...baseWhere, state: 'new' },
            orderBy,
            take: limit,
          }),
        ]);

        // Get user's watched tokens if authenticated
        let watchedMints: Set<string> = new Set();
        if (userId) {
          const watches = await prisma.tokenWatch.findMany({
            where: { userId },
            select: { mint: true },
          });
          watchedMints = new Set(watches.map((w) => w.mint));
        }

        // Transform to TokenRow format
        const transformToken = (token: any) => {
          // Convert HTTP image URLs to HTTPS (or use placeholder for security)
          const sanitizeImageUrl = (url: string | null): string | null => {
            if (!url) return null;
            // If it's an HTTP URL, try converting to HTTPS
            if (url.startsWith('http://')) {
              return url.replace('http://', 'https://');
            }
            return url;
          };

          return {
            mint: token.mint,
            symbol: token.symbol,
            name: token.name,
            logoURI: sanitizeImageUrl(token.logoURI),
            description: token.description,
            imageUrl: sanitizeImageUrl(token.imageUrl),
            twitter: token.twitter,
            telegram: token.telegram,
            website: token.website,
            creatorWallet: token.creatorWallet,
            holderCount: token.holderCount ? token.holderCount.toString() : null,
          state: token.state,
          status: token.status, // Lifecycle status
          liqUsd: token.liquidityUsd ? parseFloat(token.liquidityUsd.toString()) : undefined,
          poolAgeMin: token.poolCreatedAt
            ? Math.floor((Date.now() - token.poolCreatedAt.getTime()) / 60000)
            : undefined,
          priceImpactPctAt1pct: token.priceImpact1Pct
            ? parseFloat(token.priceImpact1Pct.toString())
            : undefined,
          marketCapUsd: token.marketCapUsd ? parseFloat(token.marketCapUsd.toString()) : undefined,
          volume24h: token.volume24h ? parseFloat(token.volume24h.toString()) : undefined,
          volume24hSol: token.volume24hSol ? parseFloat(token.volume24hSol.toString()) : undefined,
          volumeChange24h: token.volumeChange24h
            ? parseFloat(token.volumeChange24h.toString())
            : undefined,
          priceUsd: token.priceUsd
            ? parseFloat(token.priceUsd.toString())
            : (token.marketCapUsd ? parseFloat(token.marketCapUsd.toString()) / 1_000_000_000 : undefined), // Fallback: calculate from marketCap
          priceChange24h: token.priceChange24h
            ? parseFloat(token.priceChange24h.toString())
            : undefined,
          txCount24h: token.txCount24h,
          freezeRevoked: token.freezeRevoked,
          mintRenounced: token.mintRenounced,
          creatorVerified: token.creatorVerified || false,
          bondingCurveProgress: token.bondingCurveProgress
            ? parseFloat(token.bondingCurveProgress.toString())
            : undefined,
          solToGraduate: token.solToGraduate ? parseFloat(token.solToGraduate.toString()) : undefined,
          hotScore: parseFloat(token.hotScore.toString()),
          watcherCount: token.watcherCount,
          isWatched: watchedMints.has(token.mint),
          firstSeenAt: token.firstSeenAt.toISOString(),
          lastUpdatedAt: token.lastUpdatedAt.toISOString(),
          stateChangedAt: token.stateChangedAt.toISOString(),
          };
        };

        return reply.send({
          bonded: bonded.map(transformToken),
          graduating: graduating.map(transformToken),
          new: newTokens.map(transformToken),
        });
      } catch (error) {
        fastify.log.error({ error }, 'Error fetching warp pipes feed');
        return reply.status(500).send({ error: 'Failed to fetch token feed' });
      }
    }
  );

  // ==========================================================================
  // POST /api/warp-pipes/watch
  // Add a token to user's watchlist
  // ==========================================================================
  fastify.post(
    '/watch',
    {
      preHandler: [authenticateToken], // Require authentication
    },
    async (request: AuthenticatedRequest, reply) => {
      try {
        const userId = request.user!.id;
        const { mint, preferences } = AddWatchSchema.parse(request.body);

        // Check if token exists
        const token = await prisma.tokenDiscovery.findUnique({
          where: { mint },
        });

        if (!token) {
          return reply.status(404).send({ error: 'Token not found' });
        }

        // Check if already watching
        const existingWatch = await prisma.tokenWatch.findUnique({
          where: {
            userId_mint: {
              userId,
              mint,
            },
          },
        });

        if (existingWatch) {
          return reply.status(409).send({ error: 'Already watching this token' });
        }

        // Create watch
        const watch = await prisma.tokenWatch.create({
          data: {
            userId,
            mint,
            currentState: token.state,
            notifyOnGraduation: preferences?.notifyOnGraduation ?? true,
            notifyOnMigration: preferences?.notifyOnMigration ?? true,
            notifyOnPriceChange: preferences?.notifyOnPriceChange ?? false,
          },
        });

        // Increment watcher count
        await prisma.tokenDiscovery.update({
          where: { mint },
          data: {
            watcherCount: { increment: 1 },
          },
        });

        // Invalidate Redis cache
        await redis.del(`token:${mint}`);

        return reply.send({
          success: true,
          watch: {
            id: watch.id,
            mint: watch.mint,
            notifyOnGraduation: watch.notifyOnGraduation,
            notifyOnMigration: watch.notifyOnMigration,
            notifyOnPriceChange: watch.notifyOnPriceChange,
            currentState: watch.currentState,
            createdAt: watch.createdAt.toISOString(),
          },
        });
      } catch (error) {
        fastify.log.error({ error }, 'Error adding token watch');
        return reply.status(500).send({ error: 'Failed to add token watch' });
      }
    }
  );

  // ==========================================================================
  // DELETE /api/warp-pipes/watch/:mint
  // Remove a token from user's watchlist
  // ==========================================================================
  fastify.delete(
    '/watch/:mint',
    {
      preHandler: [authenticateToken],
    },
    async (request: AuthenticatedRequest, reply) => {
      try {
        const userId = request.user!.id;
        const { mint } = request.params as { mint: string };

        // Delete watch
        const deleted = await prisma.tokenWatch.deleteMany({
          where: {
            userId,
            mint,
          },
        });

        if (deleted.count === 0) {
          return reply.status(404).send({ error: 'Watch not found' });
        }

        // Decrement watcher count
        await prisma.tokenDiscovery.update({
          where: { mint },
          data: {
            watcherCount: { decrement: 1 },
          },
        });

        // Invalidate Redis cache
        await redis.del(`token:${mint}`);

        return reply.send({ success: true });
      } catch (error) {
        fastify.log.error({ error }, 'Error removing token watch');
        return reply.status(500).send({ error: 'Failed to remove token watch' });
      }
    }
  );

  // ==========================================================================
  // PATCH /api/warp-pipes/watch/:mint
  // Update watch preferences
  // ==========================================================================
  fastify.patch(
    '/watch/:mint',
    {
      preHandler: [authenticateToken],
    },
    async (request: AuthenticatedRequest, reply) => {
      try {
        const userId = request.user!.id;
        const { mint } = request.params as { mint: string };
        const { preferences } = UpdateWatchSchema.parse(request.body);

        // Update watch preferences
        const watch = await prisma.tokenWatch.updateMany({
          where: {
            userId,
            mint,
          },
          data: {
            notifyOnGraduation: preferences.notifyOnGraduation,
            notifyOnMigration: preferences.notifyOnMigration,
            notifyOnPriceChange: preferences.notifyOnPriceChange,
          },
        });

        if (watch.count === 0) {
          return reply.status(404).send({ error: 'Watch not found' });
        }

        // Fetch updated watch
        const updatedWatch = await prisma.tokenWatch.findUnique({
          where: {
            userId_mint: {
              userId,
              mint,
            },
          },
        });

        return reply.send({
          success: true,
          watch: updatedWatch
            ? {
                id: updatedWatch.id,
                mint: updatedWatch.mint,
                notifyOnGraduation: updatedWatch.notifyOnGraduation,
                notifyOnMigration: updatedWatch.notifyOnMigration,
                notifyOnPriceChange: updatedWatch.notifyOnPriceChange,
                currentState: updatedWatch.currentState,
                createdAt: updatedWatch.createdAt.toISOString(),
              }
            : null,
        });
      } catch (error) {
        fastify.log.error({ error }, 'Error updating watch preferences');
        return reply.status(500).send({ error: 'Failed to update watch preferences' });
      }
    }
  );

  // ==========================================================================
  // GET /api/warp-pipes/watches
  // Get all user's watched tokens
  // ==========================================================================
  fastify.get(
    '/watches',
    {
      preHandler: [authenticateToken],
    },
    async (request: AuthenticatedRequest, reply) => {
      try {
        const userId = request.user!.id;

        const watches = await prisma.tokenWatch.findMany({
          where: { userId },
          include: {
            // Join with TokenDiscovery to get current token data
            user: false, // Don't include user data
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        // Fetch token data for each watch
        const watchesWithTokens = await Promise.all(
          watches.map(async (watch) => {
            const token = await prisma.tokenDiscovery.findUnique({
              where: { mint: watch.mint },
            });

            return {
              id: watch.id,
              mint: watch.mint,
              notifyOnGraduation: watch.notifyOnGraduation,
              notifyOnMigration: watch.notifyOnMigration,
              notifyOnPriceChange: watch.notifyOnPriceChange,
              currentState: watch.currentState,
              createdAt: watch.createdAt.toISOString(),
              token: token
                ? {
                    symbol: token.symbol,
                    name: token.name,
                    logoURI: token.logoURI,
                    state: token.state,
                    hotScore: parseFloat(token.hotScore.toString()),
                  }
                : null,
            };
          })
        );

        return reply.send({
          watches: watchesWithTokens,
        });
      } catch (error) {
        fastify.log.error({ error }, 'Error fetching user watches');
        return reply.status(500).send({ error: 'Failed to fetch watches' });
      }
    }
  );

  // ==========================================================================
  // GET /api/warp-pipes/health/:mint
  // Get detailed health data for a token
  // ==========================================================================
  fastify.get(
    '/health/:mint',
    async (request, reply) => {
      try {
        const { mint } = request.params as { mint: string };

        // Check cache first
        const cached = await redis.get(`health:${mint}`);
        if (cached) {
          return reply.send(JSON.parse(cached));
        }

        // Fetch fresh health data
        const healthData = await healthCapsuleService.getHealthData(mint);

        // Get token data from database
        const token = await prisma.tokenDiscovery.findUnique({
          where: { mint },
        });

        const response = {
          mint,
          health: {
            freezeRevoked: healthData.freezeRevoked,
            mintRenounced: healthData.mintRenounced,
            priceImpact1Pct: healthData.priceImpact1Pct,
            liquidityUsd: healthData.liquidityUsd,
            poolAgeMin: token?.poolCreatedAt
              ? Math.floor((Date.now() - token.poolCreatedAt.getTime()) / 60000)
              : undefined,
            state: token?.state,
            bondingCurveProgress: token?.bondingCurveProgress
              ? parseFloat(token.bondingCurveProgress.toString())
              : undefined,
          },
        };

        // Cache for 5 minutes
        await redis.setex(`health:${mint}`, 300, JSON.stringify(response));

        return reply.send(response);
      } catch (error) {
        fastify.log.error({ error }, 'Error fetching health data');
        return reply.status(500).send({ error: 'Failed to fetch health data' });
      }
    }
  );

  // ==========================================================================
  // GET /api/warp-pipes/token/:mint
  // Get detailed token information
  // ==========================================================================
  fastify.get(
    '/token/:mint',
    async (request: AuthenticatedRequest, reply) => {
      try {
        const { mint } = request.params as { mint: string };
        const userId = request.user?.id;

        // Check cache first
        const cached = await redis.get(`token:${mint}`);
        if (cached) {
          const tokenData = JSON.parse(cached);

          // Check if user is watching
          if (userId) {
            const watch = await prisma.tokenWatch.findUnique({
              where: {
                userId_mint: {
                  userId,
                  mint,
                },
              },
            });
            tokenData.isWatched = !!watch;
          }

          return reply.send({ token: tokenData });
        }

        // Fetch from database
        const token = await prisma.tokenDiscovery.findUnique({
          where: { mint },
        });

        if (!token) {
          return reply.status(404).send({ error: 'Token not found' });
        }

        // Check if user is watching
        let isWatched = false;
        if (userId) {
          const watch = await prisma.tokenWatch.findUnique({
            where: {
              userId_mint: {
                userId,
                mint,
              },
            },
          });
          isWatched = !!watch;
        }

        const tokenData = {
          mint: token.mint,
          symbol: token.symbol,
          name: token.name,
          logoURI: token.logoURI,
          state: token.state,
          liqUsd: token.liquidityUsd ? parseFloat(token.liquidityUsd.toString()) : undefined,
          poolAgeMin: token.poolCreatedAt
            ? Math.floor((Date.now() - token.poolCreatedAt.getTime()) / 60000)
            : undefined,
          priceImpactPctAt1pct: token.priceImpact1Pct
            ? parseFloat(token.priceImpact1Pct.toString())
            : undefined,
          freezeRevoked: token.freezeRevoked,
          mintRenounced: token.mintRenounced,
          creatorVerified: token.creatorVerified || false,
          bondingCurveProgress: token.bondingCurveProgress
            ? parseFloat(token.bondingCurveProgress.toString())
            : undefined,
          hotScore: parseFloat(token.hotScore.toString()),
          watcherCount: token.watcherCount,
          isWatched,
          firstSeenAt: token.firstSeenAt.toISOString(),
          lastUpdatedAt: token.lastUpdatedAt.toISOString(),
          stateChangedAt: token.stateChangedAt.toISOString(),
        };

        return reply.send({ token: tokenData });
      } catch (error) {
        fastify.log.error({ error }, 'Error fetching token');
        return reply.status(500).send({ error: 'Failed to fetch token' });
      }
    }
  );
};

export default warpPipesRoutes;
