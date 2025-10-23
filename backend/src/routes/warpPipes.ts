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
  searchQuery: z.string().optional(),
  sortBy: z.enum(['hot', 'new', 'watched', 'alphabetical']).optional().default('hot'),
  minLiquidity: z.coerce.number().optional(),
  onlyWatched: z.coerce.boolean().optional().default(false),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
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
        const { searchQuery, sortBy, minLiquidity, onlyWatched, limit } =
          FeedQuerySchema.parse(request.query);

        // Get userId from JWT if authenticated (optional)
        const userId = request.user?.id;

        // Build base query
        const baseWhere: any = {};

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

        // Filter by watched tokens (requires authentication)
        if (onlyWatched && userId) {
          const watchedMints = await prisma.tokenWatch.findMany({
            where: { userId },
            select: { mint: true },
          });
          baseWhere.mint = { in: watchedMints.map((w) => w.mint) };
        }

        // Determine sort order
        const orderBy: any = {};
        switch (sortBy) {
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
        const [bonded, graduating, newTokens] = await Promise.all([
          // Bonded tokens
          prisma.tokenDiscovery.findMany({
            where: { ...baseWhere, state: 'bonded' },
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
        const transformToken = (token: any) => ({
          mint: token.mint,
          symbol: token.symbol,
          name: token.name,
          logoURI: token.logoURI,
          description: token.description,
          imageUrl: token.imageUrl,
          twitter: token.twitter,
          telegram: token.telegram,
          website: token.website,
          state: token.state,
          liqUsd: token.liquidityUsd ? parseFloat(token.liquidityUsd.toString()) : undefined,
          poolAgeMin: token.poolCreatedAt
            ? Math.floor((Date.now() - token.poolCreatedAt.getTime()) / 60000)
            : undefined,
          priceImpactPctAt1pct: token.priceImpact1Pct
            ? parseFloat(token.priceImpact1Pct.toString())
            : undefined,
          marketCapUsd: token.marketCapUsd ? parseFloat(token.marketCapUsd.toString()) : undefined,
          volume24h: token.volume24h ? parseFloat(token.volume24h.toString()) : undefined,
          volumeChange24h: token.volumeChange24h
            ? parseFloat(token.volumeChange24h.toString())
            : undefined,
          priceUsd: token.priceUsd ? parseFloat(token.priceUsd.toString()) : undefined,
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
          hotScore: parseFloat(token.hotScore.toString()),
          watcherCount: token.watcherCount,
          isWatched: watchedMints.has(token.mint),
          firstSeenAt: token.firstSeenAt.toISOString(),
          lastUpdatedAt: token.lastUpdatedAt.toISOString(),
          stateChangedAt: token.stateChangedAt.toISOString(),
        });

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
