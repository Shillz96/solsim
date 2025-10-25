/**
 * Moderation Configuration Routes
 * 
 * API endpoints for moderation configuration management
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticateToken } from '../plugins/auth.js';

export default async function (app: FastifyInstance) {
  // Helper function to check if user is admin
  async function checkAdminPermissions(userId: string): Promise<boolean> {
    const user = await app.prisma.user.findUnique({
      where: { id: userId },
      select: { userTier: true }
    });
    return user?.userTier === 'ADMINISTRATOR';
  }

  /**
   * GET /api/moderation/config
   * Get current moderation configuration
   * Requires: JWT authentication + ADMINISTRATOR tier
   */
  app.get('/config', {
    preHandler: [authenticateToken]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.id;
      
      if (!await checkAdminPermissions(userId)) {
        return reply.code(403).send({
          success: false,
          error: 'Insufficient permissions'
        });
      }

      // Default moderation configuration
      const config = {
        rateLimit: {
          messagesPerWindow: 10,
          windowSeconds: 60,
          burstLimit: 5
        },
        spam: {
          repeatedCharThreshold: 5,
          duplicateMessageWindow: 300,
          duplicateMessageThreshold: 3
        },
        toxicity: {
          enabled: true,
          confidenceThreshold: 0.7,
          severityThreshold: 'medium'
        },
        pumpDump: {
          enabled: true,
          confidenceThreshold: 0.8,
          severityThreshold: 'high'
        },
        capsSpam: {
          enabled: true,
          capsRatioThreshold: 0.7,
          minMessageLength: 10
        },
        actions: {
          warningThreshold: 3,
          strikeThreshold: 5,
          muteThreshold: 7,
          banThreshold: 10
        },
        trustScore: {
          initialScore: 100,
          warningPenalty: 5,
          strikePenalty: 10,
          mutePenalty: 20,
          banPenalty: 50,
          minScore: 0,
          maxScore: 100
        },
        durations: {
          warning: 0,
          strike: 0,
          mute: 30,
          ban: 1440
        }
      };

      return { success: true, config };
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch moderation configuration',
        message: error.message
      });
    }
  });

  /**
   * POST /api/moderation/config
   * Update moderation configuration
   * Requires: JWT authentication + ADMINISTRATOR tier
   */
  app.post('/config', {
    preHandler: [authenticateToken]
  }, async (request: FastifyRequest<{ Body: any }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.id;
      
      if (!await checkAdminPermissions(userId)) {
        return reply.code(403).send({
          success: false,
          error: 'Insufficient permissions'
        });
      }

      const config = request.body;
      
      // Validate configuration structure
      if (!config.rateLimit || !config.spam || !config.trustScore) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid configuration structure'
        });
      }

      // TODO: Store configuration in database or config file
      // For now, just return success
      
      return { 
        success: true, 
        message: 'Moderation configuration updated successfully',
        config 
      };
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: 'Failed to update moderation configuration',
        message: error.message
      });
    }
  });

  /**
   * GET /api/moderation/stats
   * Get moderation statistics
   * Requires: JWT authentication + ADMINISTRATOR tier
   */
  app.get('/stats', {
    preHandler: [authenticateToken]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.id;
      
      if (!await checkAdminPermissions(userId)) {
        return reply.code(403).send({
          success: false,
          error: 'Insufficient permissions'
        });
      }

      const [
        totalUsers,
        mutedUsers,
        bannedUsers,
        totalActions,
        recentActions,
        trustScoreDistribution
      ] = await Promise.all([
        // Total users
        app.prisma.user.count(),
        
        // Muted users
        app.prisma.userModerationStatus.count({
          where: {
            isMuted: true,
            OR: [
              { mutedUntil: null },
              { mutedUntil: { gt: new Date() } }
            ]
          }
        }),
        
        // Banned users
        app.prisma.userModerationStatus.count({
          where: {
            isBanned: true,
            OR: [
              { bannedUntil: null },
              { bannedUntil: { gt: new Date() } }
            ]
          }
        }),
        
        // Total moderation actions
        app.prisma.chatModerationAction.count(),
        
        // Recent actions (last 24 hours)
        app.prisma.chatModerationAction.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          }
        }),
        
        // Trust score distribution
        app.prisma.userModerationStatus.groupBy({
          by: ['trustScore'],
          _count: { trustScore: true },
          orderBy: { trustScore: 'asc' }
        })
      ]);

      const stats = {
        totalUsers,
        mutedUsers,
        bannedUsers,
        totalActions,
        recentActions,
        trustScoreDistribution: trustScoreDistribution.map(item => ({
          trustScore: item.trustScore,
          userCount: item._count.trustScore
        }))
      };

      return { success: true, stats };
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch moderation statistics',
        message: error.message
      });
    }
  });

  /**
   * POST /api/moderation/test
   * Test moderation bot with sample message
   * Requires: JWT authentication + ADMINISTRATOR tier
   */
  app.post('/test', {
    preHandler: [authenticateToken]
  }, async (request: FastifyRequest<{ Body: { message: string } }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.id;
      
      if (!await checkAdminPermissions(userId)) {
        return reply.code(403).send({
          success: false,
          error: 'Insufficient permissions'
        });
      }

      const { message } = request.body;
      
      if (!message || message.trim().length === 0) {
        return reply.code(400).send({
          success: false,
          error: 'Message is required'
        });
      }

      // Simulate moderation bot analysis
      const analysis = {
        message,
        analysis: {
          isSpam: message.length < 3 || message.split('').every(char => char === message[0]),
          isToxic: message.toLowerCase().includes('hate') || message.toLowerCase().includes('stupid'),
          isPumpDump: message.toLowerCase().includes('moon') && message.toLowerCase().includes('buy'),
          isCapsSpam: message.length > 10 && (message.match(/[A-Z]/g) || []).length / message.length > 0.7,
          repeatedChars: Math.max(...(message.match(/(.)\1+/g) || []).map(match => match.length)),
          duplicateRisk: false // Would check against recent messages
        },
        recommendations: {
          action: 'none',
          reason: 'Message appears clean',
          confidence: 0.1
        }
      };

      // Determine action based on analysis
      if (analysis.analysis.isSpam || analysis.analysis.repeatedChars > 5) {
        analysis.recommendations = {
          action: 'warning',
          reason: 'Potential spam detected',
          confidence: 0.8
        };
      } else if (analysis.analysis.isToxic) {
        analysis.recommendations = {
          action: 'strike',
          reason: 'Toxic content detected',
          confidence: 0.9
        };
      } else if (analysis.analysis.isPumpDump) {
        analysis.recommendations = {
          action: 'mute',
          reason: 'Pump and dump promotion detected',
          confidence: 0.85
        };
      }

      return { success: true, analysis };
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: 'Failed to test moderation bot',
        message: error.message
      });
    }
  });
}