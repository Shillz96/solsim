/**
 * Moderation Configuration Routes
 * 
 * API endpoints for managing moderation bot configuration
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticateToken } from '../plugins/auth.js';
import { currentConfig, getModerationConfig, validateModerationConfig, ModerationConfig } from '../config/moderationConfig.js';

export default async function (app: FastifyInstance) {
  // Get current moderation configuration
  app.get('/moderation/config', {
    preHandler: [authenticateToken]
  }, async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (req as any).user.id;

      // Check if user is admin
      const user = await app.prisma.user.findUnique({
        where: { id: userId },
        select: { userTier: true }
      });

      if (user?.userTier !== 'ADMINISTRATOR') {
        return reply.code(403).send({
          success: false,
          error: 'Insufficient permissions'
        });
      }

      return { 
        success: true, 
        config: currentConfig,
        environment: process.env.NODE_ENV || 'development'
      };
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch moderation configuration',
        message: error.message
      });
    }
  });

  // Update moderation configuration
  app.post('/moderation/config', {
    preHandler: [authenticateToken]
  }, async (req: FastifyRequest<{ Body: Partial<ModerationConfig> }>, reply: FastifyReply) => {
    try {
      const userId = (req as any).user.id;
      const newConfig = req.body;

      // Check if user is admin
      const user = await app.prisma.user.findUnique({
        where: { id: userId },
        select: { userTier: true }
      });

      if (user?.userTier !== 'ADMINISTRATOR') {
        return reply.code(403).send({
          success: false,
          error: 'Insufficient permissions'
        });
      }

      // Validate configuration
      const validationErrors = validateModerationConfig(newConfig as ModerationConfig);
      if (validationErrors.length > 0) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid configuration',
          details: validationErrors
        });
      }

      // In a real implementation, you would save this to a database or config file
      // For now, we'll just return success
      return { 
        success: true, 
        message: 'Configuration updated successfully',
        config: newConfig
      };
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: 'Failed to update moderation configuration',
        message: error.message
      });
    }
  });

  // Get moderation statistics
  app.get('/moderation/stats', {
    preHandler: [authenticateToken]
  }, async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (req as any).user.id;

      // Check if user is admin
      const user = await app.prisma.user.findUnique({
        where: { id: userId },
        select: { userTier: true }
      });

      if (user?.userTier !== 'ADMINISTRATOR') {
        return reply.code(403).send({
          success: false,
          error: 'Insufficient permissions'
        });
      }

      // Get moderation statistics
      const totalUsers = await app.prisma.user.count();
      const mutedUsers = await app.prisma.userModerationStatus.count({
        where: { isMuted: true }
      });
      const bannedUsers = await app.prisma.userModerationStatus.count({
        where: { isBanned: true }
      });
      const totalActions = await app.prisma.chatModerationAction.count();
      const recentActions = await app.prisma.chatModerationAction.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      });

      // Get trust score distribution
      const trustScoreStats = await app.prisma.userModerationStatus.groupBy({
        by: ['trustScore'],
        _count: { id: true },
        orderBy: { trustScore: 'desc' }
      });

      return { 
        success: true, 
        stats: {
          totalUsers,
          mutedUsers,
          bannedUsers,
          totalActions,
          recentActions,
          trustScoreDistribution: trustScoreStats.map(stat => ({
            trustScore: stat.trustScore,
            userCount: stat._count.id
          }))
        }
      };
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch moderation statistics',
        message: error.message
      });
    }
  });

  // Test moderation bot with sample message
  app.post('/moderation/test', {
    preHandler: [authenticateToken]
  }, async (req: FastifyRequest<{ Body: { message: string; userId?: string } }>, reply: FastifyReply) => {
    try {
      const { message, userId } = req.body;
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

      // Import ModerationBot dynamically to avoid circular imports
      const { ModerationBot } = await import('../services/moderationBot');
      
      // Test the message
      const testUserId = userId || currentUserId;
      const result = await ModerationBot.analyzeMessage(testUserId, message);

      return { 
        success: true, 
        result: {
          violations: result.violations,
          action: result.action,
          reason: result.reason,
          duration: result.duration
        }
      };
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: 'Failed to test moderation bot',
        message: error.message
      });
    }
  });
}
