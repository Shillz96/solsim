/**
 * Badge Routes
 * 
 * API endpoints for badge management, user badges, and badge-related operations
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { BadgeService } from '../services/badgeService.js';
import { authenticateToken } from '../plugins/auth';

export default async function (app: FastifyInstance) {
  // Get all available badges
  app.get('/badges', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const badges = await BadgeService.getAllBadges();
      return { success: true, badges };
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch badges',
        message: error.message
      });
    }
  });

  // Get badges by category
  app.get('/badges/category/:category', async (req: FastifyRequest<{ Params: { category: string } }>, reply: FastifyReply) => {
    try {
      const { category } = req.params;
      const badges = await BadgeService.getAllBadges();
      return { success: true, badges };
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch badges by category',
        message: error.message
      });
    }
  });

  // Get user's badges
  app.get('/badges/user/:userId', async (req: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
    try {
      const { userId } = req.params;
      const badges = await BadgeService.getUserBadges(userId);
      return { success: true, badges };
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch user badges',
        message: error.message
      });
    }
  });

  // Get current user's badges (authenticated)
  app.get('/badges/my', {
    preHandler: [authenticateToken]
  }, async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (req as any).user.id;
      const badges = await BadgeService.getUserBadges(userId);
      return { success: true, badges };
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch your badges',
        message: error.message
      });
    }
  });

  // Award badge to user (admin only)
  app.post('/badges/award', {
    preHandler: [authenticateToken]
  }, async (req: FastifyRequest<{ Body: { badgeName: string; userId?: string } }>, reply: FastifyReply) => {
    try {
      const { badgeName, userId } = req.body;
      const currentUserId = (req as any).user.id;
      const targetUserId = userId || currentUserId;

      // Check if user is admin (you can implement proper admin check)
      const user = await app.prisma.user.findUnique({
        where: { id: currentUserId },
        select: { userTier: true }
      });

      if (user?.userTier !== 'ADMINISTRATOR') {
        return reply.code(403).send({
          success: false,
          error: 'Insufficient permissions'
        });
      }

      const result = await BadgeService.awardBadge(targetUserId, badgeName);
      
      if (result.success) {
        return { success: true, badge: result.badge };
      } else {
        return reply.code(400).send({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: 'Failed to award badge',
        message: error.message
      });
    }
  });

  // Toggle badge visibility
  app.post('/badges/toggle', {
    preHandler: [authenticateToken]
  }, async (req: FastifyRequest<{ Body: { badgeId: string } }>, reply: FastifyReply) => {
    try {
      const { badgeId } = req.body;
      const userId = (req as any).user.id;

      const success = await BadgeService.toggleBadgeVisibility(userId, badgeId);
      
      if (success) {
        return { success: true, message: 'Badge visibility toggled' };
      } else {
        return reply.code(400).send({
          success: false,
          error: 'Failed to toggle badge visibility'
        });
      }
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: 'Failed to toggle badge visibility',
        message: error.message
      });
    }
  });

  // Get badge statistics
  app.get('/badges/stats', {
    preHandler: [authenticateToken]
  }, async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const { userId } = req.query as { userId?: string };
      const currentUserId = (req as any).user.id;
      const targetUserId = userId || currentUserId;

      const stats = await BadgeService.getBadgeStats(targetUserId);
      return { success: true, stats };
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch badge statistics',
        message: error.message
      });
    }
  });

  // Get badge leaderboard
  app.get('/badges/leaderboard', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const limit = parseInt((req.query as { limit?: string }).limit || '10');
      const leaderboard = await BadgeService.getBadgeLeaderboard(limit);
      return { success: true, leaderboard };
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch badge leaderboard',
        message: error.message
      });
    }
  });

  // Check and award badges for a user (admin only)
  app.post('/badges/check/:userId', {
    preHandler: [authenticateToken]
  }, async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const { userId } = req.params as { userId: string };
      const currentUserId = (req as any).user.id;

      // Check if user is admin
      const user = await app.prisma.user.findUnique({
        where: { id: currentUserId },
        select: { userTier: true }
      });

      if (user?.userTier !== 'ADMINISTRATOR') {
        return reply.code(403).send({
          success: false,
          error: 'Insufficient permissions'
        });
      }

      // Get all badges and check requirements
      const allBadges = await BadgeService.getAllBadges();
      const newBadges = [];

      for (const badge of allBadges) {
        const result = await BadgeService.awardBadge(userId, badge.name);
        if (result.success && result.badge) {
          newBadges.push(result.badge);
        }
      }

      return { success: true, newBadges };
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: 'Failed to check badges',
        message: error.message
      });
    }
  });
}
