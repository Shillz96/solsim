// Admin routes for maintenance operations and comprehensive admin management
import { FastifyPluginAsync } from "fastify";
import { rebuildPositions } from "../services/migrationService.js";
import { AdminService } from "../services/adminService.js";
import { authenticateToken } from "../plugins/auth.js";

const adminRoutes: FastifyPluginAsync = async (app) => {
  // Admin authentication middleware for legacy endpoints
  app.addHook("preHandler", async (request, reply) => {
    // Skip auth for new endpoints that use JWT
    if (request.url.startsWith('/api/admin/stats') || 
        request.url.startsWith('/api/admin/users') ||
        request.url.startsWith('/api/admin/analytics') ||
        request.url.startsWith('/api/admin/activity')) {
      return;
    }

    const authHeader = request.headers.authorization;
    const adminSecret = process.env.ADMIN_SECRET;

    // If no admin secret is configured, deny access
    if (!adminSecret) {
      return reply.code(503).send({
        error: "Admin endpoints not configured"
      });
    }

    // Check authorization header
    if (!authHeader || authHeader !== `Bearer ${adminSecret}`) {
      return reply.code(401).send({
        error: "Unauthorized - Invalid admin credentials"
      });
    }

    return;
  });

  // Helper function to check if user is admin
  async function checkAdminPermissions(userId: string): Promise<boolean> {
    const user = await app.prisma.user.findUnique({
      where: { id: userId },
      select: { userTier: true }
    });
    return user?.userTier === 'ADMINISTRATOR';
  }

  /**
   * GET /api/admin/stats
   * Get dashboard overview statistics
   * Requires: JWT authentication + ADMINISTRATOR tier
   */
  app.get("/stats", {
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    try {
      const userId = (request as any).user.id;
      
      if (!await checkAdminPermissions(userId)) {
        return reply.code(403).send({
          success: false,
          error: "Insufficient permissions"
        });
      }

      const stats = await AdminService.getOverviewStats();
      return { success: true, stats };
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: "Failed to fetch admin statistics",
        message: error.message
      });
    }
  });

  /**
   * GET /api/admin/users
   * Search and list users with pagination
   * Requires: JWT authentication + ADMINISTRATOR tier
   */
  app.get("/users", {
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    try {
      const userId = (request as any).user.id;
      
      if (!await checkAdminPermissions(userId)) {
        return reply.code(403).send({
          success: false,
          error: "Insufficient permissions"
        });
      }

      const { query, tier, minBalance, maxBalance, startDate, endDate, page = 1, limit = 20 } = request.query as any;
      
      const filters = {
        tier,
        minBalance: minBalance ? Number(minBalance) : undefined,
        maxBalance: maxBalance ? Number(maxBalance) : undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined
      };

      const result = await AdminService.searchUsers(query, filters, Number(page), Number(limit));
      return { success: true, ...result };
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: "Failed to search users",
        message: error.message
      });
    }
  });

  /**
   * GET /api/admin/users/:userId
   * Get detailed user information
   * Requires: JWT authentication + ADMINISTRATOR tier
   */
  app.get("/users/:userId", {
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    try {
      const userId = (request as any).user.id;
      
      if (!await checkAdminPermissions(userId)) {
        return reply.code(403).send({
          success: false,
          error: "Insufficient permissions"
        });
      }

      const { userId: targetUserId } = request.params as { userId: string };
      const userDetails = await AdminService.getUserDetails(targetUserId);
      
      if (!userDetails) {
        return reply.code(404).send({
          success: false,
          error: "User not found"
        });
      }

      return { success: true, user: userDetails };
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: "Failed to fetch user details",
        message: error.message
      });
    }
  });

  /**
   * PUT /api/admin/users/:userId/tier
   * Update user tier
   * Requires: JWT authentication + ADMINISTRATOR tier
   */
  app.put("/users/:userId/tier", {
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    try {
      const userId = (request as any).user.id;
      
      if (!await checkAdminPermissions(userId)) {
        return reply.code(403).send({
          success: false,
          error: "Insufficient permissions"
        });
      }

      const { userId: targetUserId } = request.params as { userId: string };
      const { newTier } = request.body as { newTier: string };
      
      const success = await AdminService.updateUserTier(targetUserId, newTier);
      
      if (success) {
        return { success: true, message: "User tier updated successfully" };
      } else {
        return reply.code(400).send({
          success: false,
          error: "Failed to update user tier"
        });
      }
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: "Failed to update user tier",
        message: error.message
      });
    }
  });

  /**
   * PUT /api/admin/users/:userId/balance
   * Update user virtual SOL balance
   * Requires: JWT authentication + ADMINISTRATOR tier
   */
  app.put("/users/:userId/balance", {
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    try {
      const userId = (request as any).user.id;
      
      if (!await checkAdminPermissions(userId)) {
        return reply.code(403).send({
          success: false,
          error: "Insufficient permissions"
        });
      }

      const { userId: targetUserId } = request.params as { userId: string };
      const { newBalance } = request.body as { newBalance: number };
      
      if (newBalance < 0) {
        return reply.code(400).send({
          success: false,
          error: "Balance cannot be negative"
        });
      }

      const success = await AdminService.updateUserBalance(targetUserId, newBalance);
      
      if (success) {
        return { success: true, message: "User balance updated successfully" };
      } else {
        return reply.code(400).send({
          success: false,
          error: "Failed to update user balance"
        });
      }
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: "Failed to update user balance",
        message: error.message
      });
    }
  });

  /**
   * GET /api/admin/analytics
   * Get platform analytics
   * Requires: JWT authentication + ADMINISTRATOR tier
   */
  app.get("/analytics", {
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    try {
      const userId = (request as any).user.id;
      
      if (!await checkAdminPermissions(userId)) {
        return reply.code(403).send({
          success: false,
          error: "Insufficient permissions"
        });
      }

      const analytics = await AdminService.getAnalytics();
      return { success: true, analytics };
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: "Failed to fetch analytics",
        message: error.message
      });
    }
  });

  /**
   * GET /api/admin/activity
   * Get recent activity feed
   * Requires: JWT authentication + ADMINISTRATOR tier
   */
  app.get("/activity", {
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    try {
      const userId = (request as any).user.id;
      
      if (!await checkAdminPermissions(userId)) {
        return reply.code(403).send({
          success: false,
          error: "Insufficient permissions"
        });
      }

      const { limit = 20 } = request.query as { limit?: string };
      const activity = await AdminService.getRecentActivity(Number(limit));
      return { success: true, activity };
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: "Failed to fetch recent activity",
        message: error.message
      });
    }
  });

  /**
   * POST /api/admin/rebuild-positions
   * Rebuild all Position and PositionLot data from Trade history
   * Requires: Authorization: Bearer <ADMIN_SECRET>
   */
  app.post("/rebuild-positions", async (request, reply) => {
    try {
      app.log.info("Starting position rebuild via admin API");

      const result = await rebuildPositions();

      if (result.success) {
        return reply.code(200).send({
          success: true,
          message: "Position rebuild completed",
          stats: {
            usersProcessed: result.usersProcessed,
            positionsFixed: result.positionsFixed,
            lotsCreated: result.lotsCreated
          },
          errors: result.errors,
          details: result.details
        });
      } else {
        return reply.code(500).send({
          success: false,
          message: "Position rebuild completed with errors",
          stats: {
            usersProcessed: result.usersProcessed,
            positionsFixed: result.positionsFixed,
            lotsCreated: result.lotsCreated
          },
          errors: result.errors,
          details: result.details
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      app.log.error(`Error in position rebuild: ${errorMessage}`);
      return reply.code(500).send({
        success: false,
        error: errorMessage,
        message: "Failed to rebuild positions"
      });
    }
  });

  /**
   * POST /api/admin/users/:userId/upgrade-tier
   * Upgrade user's tier
   * Requires: JWT authentication + ADMINISTRATOR tier
   */
  app.post("/users/:userId/upgrade-tier", {
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    try {
      const moderatorId = (request as any).user.id;
      const { userId } = request.params as { userId: string };
      const { newTier } = request.body as { newTier: string };
      
      // Check if moderator is administrator
      const moderator = await app.prisma.user.findUnique({
        where: { id: moderatorId },
        select: { userTier: true }
      });

      if (moderator?.userTier !== 'ADMINISTRATOR') {
        return reply.code(403).send({
          success: false,
          error: "Only administrators can upgrade user tiers"
        });
      }

      // Validate tier value
      const validTiers = ['EMAIL_USER', 'WALLET_USER', 'VSOL_HOLDER', 'MODERATOR', 'ADMINISTRATOR'];
      if (!validTiers.includes(newTier)) {
        return reply.code(400).send({
          success: false,
          error: "Invalid tier value"
        });
      }

      // Prevent downgrading administrators (protect admin accounts)
      const targetUser = await app.prisma.user.findUnique({
        where: { id: userId },
        select: { userTier: true }
      });

      if (targetUser?.userTier === 'ADMINISTRATOR' && newTier !== 'ADMINISTRATOR') {
        return reply.code(403).send({
          success: false,
          error: "Cannot downgrade administrator accounts"
        });
      }

      // Update user tier
      const updatedUser = await app.prisma.user.update({
        where: { id: userId },
        data: { userTier: newTier as any }
      });

      // Log the tier change
      await app.prisma.chatModerationAction.create({
        data: {
          userId,
          moderatorId,
          action: 'TIER_UPGRADE',
          reason: `Tier upgraded to ${newTier}`
        }
      });

      return reply.code(200).send({
        success: true,
        message: `User tier upgraded to ${newTier}`,
        user: {
          id: updatedUser.id,
          handle: updatedUser.handle,
          userTier: updatedUser.userTier
        }
      });
    } catch (error: any) {
      console.error('Error upgrading user tier:', error);
      return reply.code(500).send({
        success: false,
        error: "Failed to upgrade user tier",
        message: error.message
      });
    }
  });

  /**
   * GET /api/admin/moderation/stats
   * Get moderation statistics
   * Requires: JWT authentication + ADMINISTRATOR or MODERATOR tier
   */
  app.get("/moderation/stats", {
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    try {
      const userId = (request as any).user.id;
      
      // Check if user is admin or moderator
      const user = await app.prisma.user.findUnique({
        where: { id: userId },
        select: { userTier: true }
      });

      if (user?.userTier !== 'ADMINISTRATOR' && user?.userTier !== 'MODERATOR') {
        return reply.code(403).send({
          success: false,
          error: "Insufficient permissions"
        });
      }

      // Get active mutes count
      const now = new Date();
      const activeMutes = await app.prisma.user.count({
        where: {
          chatMutedUntil: {
            gt: now
          }
        }
      });

      // Get active bans count
      const activeBans = await app.prisma.user.count({
        where: {
          bannedFromChat: true
        }
      });

      // Get users with strikes
      const usersWithStrikes = await app.prisma.user.count({
        where: {
          chatStrikes: {
            gt: 0
          }
        }
      });

      // Get recent moderation actions (last 24h)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentActions = await app.prisma.chatModerationAction.count({
        where: {
          createdAt: {
            gte: oneDayAgo
          }
        }
      });

      // Get flagged users (users with 2+ strikes or currently muted/banned)
      const flaggedUsers = await app.prisma.user.findMany({
        where: {
          OR: [
            { chatStrikes: { gte: 2 } },
            { chatMutedUntil: { gt: now } },
            { bannedFromChat: true }
          ]
        },
        select: {
          id: true,
          handle: true,
          displayName: true,
          avatarUrl: true,
          userTier: true,
          chatStrikes: true,
          chatMutedUntil: true,
          bannedFromChat: true
        },
        take: 20,
        orderBy: {
          chatStrikes: 'desc'
        }
      });

      return reply.code(200).send({
        success: true,
        stats: {
          activeMutes,
          activeBans,
          usersWithStrikes,
          recentActions24h: recentActions,
          flaggedUsers
        }
      });
    } catch (error: any) {
      console.error('Error fetching moderation stats:', error);
      return reply.code(500).send({
        success: false,
        error: "Failed to fetch moderation statistics",
        message: error.message
      });
    }
  });

  /**
   * GET /api/admin/health
   * Health check for admin endpoints
   */
  app.get("/health", async (request, reply) => {
    return reply.code(200).send({
      status: "ok",
      message: "Admin endpoints are operational",
      timestamp: new Date().toISOString()
    });
  });

  return;
};

export default adminRoutes;
