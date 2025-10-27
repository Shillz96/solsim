/**
 * Profile Management Routes
 *
 * Handles user profile operations:
 * - Update user profile (handle, bio, displayName, etc.)
 * - Get user profile by ID
 * - Update avatar
 * - Remove avatar
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import prisma from "../../plugins/prisma.js";
import redis from "../../plugins/redis.js";
import { authenticateToken, type AuthenticatedRequest } from "../../plugins/auth.js";
import { validateBody, authSchemas, sanitizeInput } from "../../plugins/validation.js";

export default async function profileManagementRoutes(app: FastifyInstance) {
  // Profile update with authentication and validation
  app.post("/profile", {
    preHandler: [authenticateToken, validateBody(authSchemas.profileUpdate)]
  }, async (req: AuthenticatedRequest, reply) => {
    try {
      const sanitizedBody = sanitizeInput(req.body) as {
        userId: string;
        handle?: string;
        avatarUrl?: string;
        bio?: string;
        displayName?: string;
      };

      const { userId, handle, avatarUrl, bio, displayName } = sanitizedBody;

      // Verify user can only update their own profile
      if (req.user?.id !== userId) {
        return reply.code(403).send({
          error: "FORBIDDEN",
          message: "You can only update your own profile"
        });
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          handle,
          avatarUrl,
          bio,
          displayName
        }
      });

      // Invalidate leaderboard cache when profile is updated (handle, displayName, or avatar changed)
      try {
        // Delete all leaderboard cache keys (pattern: leaderboard:*)
        const keys = await redis.keys('leaderboard:*');
        if (keys.length > 0) {
          await redis.del(...keys);
          console.log(`[PROFILE UPDATE] Invalidated ${keys.length} leaderboard cache keys`);
        }
      } catch (cacheError) {
        console.warn('[PROFILE UPDATE] Failed to invalidate leaderboard cache:', cacheError);
        // Non-critical error, continue
      }

      return {
        success: true,
        user: {
          id: updatedUser.id,
          handle: updatedUser.handle,
          avatarUrl: updatedUser.avatarUrl,
          bio: updatedUser.bio,
          displayName: updatedUser.displayName
        }
      };
    } catch (error: any) {
      return reply.code(500).send({
        error: "PROFILE_UPDATE_FAILED",
        message: "Failed to update profile"
      });
    }
  });

  // Get user profile with optional authentication
  app.get("/user/:userId", async (req: FastifyRequest, reply: FastifyReply) => {
    const { userId } = req.params as { userId: string };

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    if (!uuidRegex.test(userId)) {
      return reply.code(400).send({
        error: "INVALID_USER_ID",
        message: "Invalid user ID format"
      });
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          displayName: true,
          bio: true,
          avatarUrl: true,
          twitter: true,
          discord: true,
          telegram: true,
          website: true,
          virtualSolBalance: true,
          userTier: true,
          walletAddress: true,
          handle: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!user) {
        return reply.code(404).send({
          error: "USER_NOT_FOUND",
          message: "User not found"
        });
      }

      // Convert Decimal to string for JSON serialization
      const userResponse = {
        ...user,
        virtualSolBalance: user.virtualSolBalance.toString()
      };

      return userResponse;
    } catch (error: any) {
      console.error('Get user profile error:', error);
      return reply.code(500).send({
        error: "FETCH_USER_FAILED",
        message: "Failed to fetch user profile"
      });
    }
  });

  // Update avatar with authentication
  app.post("/update-avatar", {
    preHandler: [authenticateToken]
  }, async (req: AuthenticatedRequest, reply) => {
    try {
      const { userId, avatarUrl } = req.body as {
        userId: string;
        avatarUrl: string;
      };

      if (!userId || !avatarUrl) {
        return reply.code(400).send({
          error: "MISSING_FIELDS",
          message: "userId and avatarUrl required"
        });
      }

      // Verify user can only update their own avatar
      if (req.user?.id !== userId) {
        return reply.code(403).send({
          error: "FORBIDDEN",
          message: "You can only update your own avatar"
        });
      }

      // Validate URL format (accept both http/https URLs and base64 data URLs)
      const isDataUrl = avatarUrl.startsWith('data:image/');
      const isHttpUrl = avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://');

      if (!isDataUrl && !isHttpUrl) {
        return reply.code(400).send({
          error: "INVALID_URL",
          message: "Avatar must be a valid URL or base64 data URL"
        });
      }

      // Validate http/https URLs
      if (isHttpUrl) {
        try {
          new URL(avatarUrl);
        } catch {
          return reply.code(400).send({
            error: "INVALID_URL",
            message: "Invalid avatar URL format"
          });
        }
      }

      // Validate base64 data URLs
      if (isDataUrl) {
        const validImageTypes = ['data:image/jpeg', 'data:image/jpg', 'data:image/png', 'data:image/webp', 'data:image/gif'];
        const isValidType = validImageTypes.some(type => avatarUrl.startsWith(type));

        if (!isValidType) {
          return reply.code(400).send({
            error: "INVALID_IMAGE_TYPE",
            message: "Only JPEG, PNG, WebP, and GIF images are allowed"
          });
        }
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          avatarUrl: avatarUrl // Full base64 string (no truncation)
        }
      });

      // Invalidate leaderboard cache when avatar is updated
      try {
        const keys = await redis.keys('leaderboard:*');
        if (keys.length > 0) {
          await redis.del(...keys);
          console.log(`[AVATAR UPDATE] Invalidated ${keys.length} leaderboard cache keys`);
        }
      } catch (cacheError) {
        console.warn('[AVATAR UPDATE] Failed to invalidate leaderboard cache:', cacheError);
      }

      return {
        success: true,
        avatarUrl: user.avatarUrl,
        message: "Avatar updated successfully"
      };

    } catch (error: any) {
      console.error('Update avatar error:', error);
      return reply.code(500).send({
        error: "AVATAR_UPDATE_FAILED",
        message: "Failed to update avatar"
      });
    }
  });

  // Remove avatar with authentication
  app.post("/remove-avatar", {
    preHandler: [authenticateToken]
  }, async (req: AuthenticatedRequest, reply) => {
    try {
      const { userId } = req.body as { userId: string };

      if (!userId) {
        return reply.code(400).send({
          error: "MISSING_USER_ID",
          message: "userId required"
        });
      }

      // Verify user can only remove their own avatar
      if (req.user?.id !== userId) {
        return reply.code(403).send({
          error: "FORBIDDEN",
          message: "You can only remove your own avatar"
        });
      }

      await prisma.user.update({
        where: { id: userId },
        data: {
          avatarUrl: null
        }
      });

      // Invalidate leaderboard cache when avatar is removed
      try {
        const keys = await redis.keys('leaderboard:*');
        if (keys.length > 0) {
          await redis.del(...keys);
          console.log(`[AVATAR REMOVE] Invalidated ${keys.length} leaderboard cache keys`);
        }
      } catch (cacheError) {
        console.warn('[AVATAR REMOVE] Failed to invalidate leaderboard cache:', cacheError);
      }

      return {
        success: true,
        message: "Avatar removed successfully"
      };

    } catch (error: any) {
      console.error('Remove avatar error:', error);
      return reply.code(500).send({
        error: "AVATAR_REMOVAL_FAILED",
        message: "Failed to remove avatar"
      });
    }
  });
}
