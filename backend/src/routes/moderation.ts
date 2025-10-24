/**
 * Moderation Routes
 * 
 * API endpoints for moderation commands and actions
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ModerationBot } from '../services/moderationBot.js';
import { authenticateToken } from '../plugins/auth.js';
import prisma from '../plugins/prisma.js';

// Helper function to check if user is moderator/admin
async function checkModeratorPermissions(userId: string, prisma: any): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { userTier: true }
  });

  return user?.userTier === 'ADMINISTRATOR' || user?.userTier === 'MODERATOR';
}

// Helper function to find user by handle
async function findUserByHandle(handle: string, prisma: any) {
  return await prisma.user.findUnique({
    where: { handle },
    select: { id: true, handle: true, userTier: true }
  });
}

export default async function (app: FastifyInstance) {
  // Mute user
  app.post('/moderation/mute', {
    preHandler: [authenticateToken]
  }, async (req: FastifyRequest<{ Body: { username: string; duration: number; reason: string } }>, reply: FastifyReply) => {
    try {
      const { username, duration, reason } = req.body;
      const moderatorId = (req as any).user.id;

      // Check permissions
      if (!await checkModeratorPermissions(moderatorId, app.prisma)) {
        return reply.code(403).send({
          success: false,
          error: 'Insufficient permissions'
        });
      }

      // Find target user
      const targetUser = await findUserByHandle(username, app.prisma);
      if (!targetUser) {
        return reply.code(404).send({
          success: false,
          error: 'User not found'
        });
      }

      // Check if target user is also moderator/admin
      if (targetUser.userTier === 'ADMINISTRATOR' || targetUser.userTier === 'MODERATOR') {
        return reply.code(403).send({
          success: false,
          error: 'Cannot mute other moderators'
        });
      }

      // Execute mute
      const action = {
        type: 'MUTE' as const,
        duration,
        reason: `Muted by moderator: ${reason}`
      };

      const success = await ModerationBot.executeAction(targetUser.id, action, moderatorId);
      
      if (success) {
        return { 
          success: true, 
          message: `User ${username} muted for ${duration} minutes`,
          action: 'MUTE',
          duration,
          reason
        };
      } else {
        return reply.code(500).send({
          success: false,
          error: 'Failed to mute user'
        });
      }
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: 'Failed to mute user',
        message: error.message
      });
    }
  });

  // Ban user
  app.post('/moderation/ban', {
    preHandler: [authenticateToken]
  }, async (req: FastifyRequest<{ Body: { username: string; duration?: number; reason: string } }>, reply: FastifyReply) => {
    try {
      const { username, duration, reason } = req.body;
      const moderatorId = (req as any).user.id;

      // Check permissions
      if (!await checkModeratorPermissions(moderatorId, app.prisma)) {
        return reply.code(403).send({
          success: false,
          error: 'Insufficient permissions'
        });
      }

      // Find target user
      const targetUser = await findUserByHandle(username, app.prisma);
      if (!targetUser) {
        return reply.code(404).send({
          success: false,
          error: 'User not found'
        });
      }

      // Check if target user is also moderator/admin
      if (targetUser.userTier === 'ADMINISTRATOR' || targetUser.userTier === 'MODERATOR') {
        return reply.code(403).send({
          success: false,
          error: 'Cannot ban other moderators'
        });
      }

      // Execute ban
      const action = {
        type: 'BAN' as const,
        duration,
        reason: `Banned by moderator: ${reason}`
      };

      const success = await ModerationBot.executeAction(targetUser.id, action, moderatorId);
      
      if (success) {
        return { 
          success: true, 
          message: `User ${username} banned${duration ? ` for ${duration} minutes` : ' permanently'}`,
          action: 'BAN',
          duration,
          reason
        };
      } else {
        return reply.code(500).send({
          success: false,
          error: 'Failed to ban user'
        });
      }
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: 'Failed to ban user',
        message: error.message
      });
    }
  });

  // Kick user
  app.post('/moderation/kick', {
    preHandler: [authenticateToken]
  }, async (req: FastifyRequest<{ Body: { username: string; reason: string } }>, reply: FastifyReply) => {
    try {
      const { username, reason } = req.body;
      const moderatorId = (req as any).user.id;

      // Check permissions
      if (!await checkModeratorPermissions(moderatorId, app.prisma)) {
        return reply.code(403).send({
          success: false,
          error: 'Insufficient permissions'
        });
      }

      // Find target user
      const targetUser = await findUserByHandle(username, app.prisma);
      if (!targetUser) {
        return reply.code(404).send({
          success: false,
          error: 'User not found'
        });
      }

      // Execute kick
      const action = {
        type: 'KICK' as const,
        reason: `Kicked by moderator: ${reason}`
      };

      const success = await ModerationBot.executeAction(targetUser.id, action, moderatorId);
      
      if (success) {
        return { 
          success: true, 
          message: `User ${username} kicked`,
          action: 'KICK',
          reason
        };
      } else {
        return reply.code(500).send({
          success: false,
          error: 'Failed to kick user'
        });
      }
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: 'Failed to kick user',
        message: error.message
      });
    }
  });

  // Clear messages
  app.post('/moderation/clear', {
    preHandler: [authenticateToken]
  }, async (req: FastifyRequest<{ Body: { count: number; roomId?: string } }>, reply: FastifyReply) => {
    try {
      const { count, roomId } = req.body;
      const moderatorId = (req as any).user.id;

      // Check permissions
      if (!await checkModeratorPermissions(moderatorId, app.prisma)) {
        return reply.code(403).send({
          success: false,
          error: 'Insufficient permissions'
        });
      }

      // Clear messages
      const deletedMessages = await app.prisma.chatMessage.deleteMany({
        where: {
          ...(roomId && { roomId }),
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Only last 24 hours
          }
        }
      });

      return { 
        success: true, 
        message: `Cleared ${deletedMessages.count} messages`,
        count: deletedMessages.count as number
      };
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: 'Failed to clear messages',
        message: error.message
      });
    }
  });

  // Send announcement
  app.post('/moderation/announce', {
    preHandler: [authenticateToken]
  }, async (req: FastifyRequest<{ Body: { message: string; roomId?: string } }>, reply: FastifyReply) => {
    try {
      const { message, roomId } = req.body;
      const moderatorId = (req as any).user.id;

      // Check permissions
      if (!await checkModeratorPermissions(moderatorId, app.prisma)) {
        return reply.code(403).send({
          success: false,
          error: 'Insufficient permissions'
        });
      }

      // Create announcement message
      const announcement = await app.prisma.chatMessage.create({
        data: {
          roomId: roomId || 'lobby',
          userId: moderatorId,
          content: `📢 ANNOUNCEMENT: ${message}`
        }
      });

      return { 
        success: true, 
        message: 'Announcement sent',
        announcement
      };
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: 'Failed to send announcement',
        message: error.message
      });
    }
  });

  // Get user moderation status
  app.get('/moderation/status/:username', {
    preHandler: [authenticateToken]
  }, async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const { username } = req.params as { username: string };
      const moderatorId = (req as any).user.id;

      // Check permissions
      if (!await checkModeratorPermissions(moderatorId, app.prisma)) {
        return reply.code(403).send({
          success: false,
          error: 'Insufficient permissions'
        });
      }

      // Find target user
      const targetUser = await findUserByHandle(username, app.prisma);
      if (!targetUser) {
        return reply.code(404).send({
          success: false,
          error: 'User not found'
        });
      }

      // Get moderation status
      const status = await ModerationBot.getUserModerationStatus(targetUser.id);
      
      return { 
        success: true, 
        status: {
          ...status,
          username: targetUser.handle
        }
      };
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: 'Failed to get user status',
        message: error.message
      });
    }
  });

  // Get moderation actions history
  app.get('/moderation/history/:username', {
    preHandler: [authenticateToken]
  }, async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const { username } = req.params as { username: string };
      const moderatorId = (req as any).user.id;

      // Check permissions
      if (!await checkModeratorPermissions(moderatorId, app.prisma)) {
        return reply.code(403).send({
          success: false,
          error: 'Insufficient permissions'
        });
      }

      // Find target user
      const targetUser = await findUserByHandle(username, app.prisma);
      if (!targetUser) {
        return reply.code(404).send({
          success: false,
          error: 'User not found'
        });
      }

      // Get moderation history
      const history = await app.prisma.chatModerationAction.findMany({
        where: { userId: targetUser.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          user: {
            select: { handle: true }
          }
        }
      });
      
      return { 
        success: true, 
        history
      };
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: 'Failed to get moderation history',
        message: error.message
      });
    }
  });

  // Unmute user
  app.post('/moderation/unmute', {
    preHandler: [authenticateToken]
  }, async (req: FastifyRequest<{ Body: { username: string } }>, reply: FastifyReply) => {
    try {
      const { username } = req.body;
      const moderatorId = (req as any).user.id;

      // Check permissions
      if (!await checkModeratorPermissions(moderatorId, app.prisma)) {
        return reply.code(403).send({
          success: false,
          error: 'Insufficient permissions'
        });
      }

      // Find target user
      const targetUser = await findUserByHandle(username, app.prisma);
      if (!targetUser) {
        return reply.code(404).send({
          success: false,
          error: 'User not found'
        });
      }

      // Unmute user
      await prisma.userModerationStatus.update({
        where: { userId: targetUser.id },
        data: {
          isMuted: false,
          mutedUntil: null
        }
      });

      // Log action
      await app.prisma.chatModerationAction.create({
        data: {
          userId: targetUser.id,
          moderatorId,
          action: 'UNMUTE',
          reason: 'Unmuted by moderator'
        }
      });

      return { 
        success: true, 
        message: `User ${username} unmuted`
      };
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: 'Failed to unmute user',
        message: error.message
      });
    }
  });

  // Unban user
  app.post('/moderation/unban', {
    preHandler: [authenticateToken]
  }, async (req: FastifyRequest<{ Body: { username: string } }>, reply: FastifyReply) => {
    try {
      const { username } = req.body;
      const moderatorId = (req as any).user.id;

      // Check permissions
      if (!await checkModeratorPermissions(moderatorId, app.prisma)) {
        return reply.code(403).send({
          success: false,
          error: 'Insufficient permissions'
        });
      }

      // Find target user
      const targetUser = await findUserByHandle(username, app.prisma);
      if (!targetUser) {
        return reply.code(404).send({
          success: false,
          error: 'User not found'
        });
      }

      // Unban user
      await prisma.userModerationStatus.update({
        where: { userId: targetUser.id },
        data: {
          isBanned: false,
          bannedUntil: null
        }
      });

      // Log action
      await app.prisma.chatModerationAction.create({
        data: {
          userId: targetUser.id,
          moderatorId,
          action: 'UNBAN',
          reason: 'Unbanned by moderator'
        }
      });

      return { 
        success: true, 
        message: `User ${username} unbanned`
      };
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: 'Failed to unban user',
        message: error.message
      });
    }
  });
}
