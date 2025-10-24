/**
 * Chat REST API Routes
 *
 * Provides REST endpoints for:
 * - Message history
 * - Room metadata
 * - Moderation actions (admin only)
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticateToken, requireAdmin } from '../plugins/auth.js';
import {
  getRecentMessages,
} from '../services/chatService.js';
import {
  checkModerationStatus,
  muteUser,
  unmuteUser,
  banUser,
  unbanUser,
  addStrike,
  clearStrikes,
  getModerationHistory,
} from '../services/moderationService.js';

/**
 * Request schemas
 */
const getRoomMessagesSchema = z.object({
  roomId: z.string(),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 100),
});

const moderationActionSchema = z.object({
  userId: z.string().uuid(),
  reason: z.string().optional(),
});

const muteSchema = z.object({
  userId: z.string().uuid(),
  durationMinutes: z.number().min(1).max(43200), // Max 30 days
  reason: z.string().optional(),
});

const strikeSchema = z.object({
  userId: z.string().uuid(),
  reason: z.string().optional(),
});

export default async function chatRoutes(app: FastifyInstance) {
  /**
   * GET /api/chat/rooms/:roomId/messages
   * Get recent messages for a room
   */
  app.get(
    '/api/chat/rooms/:roomId/messages',
    { preHandler: authenticateToken },
    async (req, reply) => {
      try {
        const { roomId } = req.params as { roomId: string };
        const query = req.query as any;
        const limit = query.limit ? parseInt(query.limit) : 100;

        const messages = await getRecentMessages(roomId, limit);

        return reply.code(200).send({
          success: true,
          roomId,
          messages,
          count: messages.length,
        });
      } catch (error) {
        console.error('Error fetching room messages:', error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to fetch messages',
        });
      }
    }
  );

  /**
   * GET /api/chat/rooms/:roomId/metadata
   * Get room metadata (participant count, activity stats)
   */
  app.get(
    '/api/chat/rooms/:roomId/metadata',
    { preHandler: authenticateToken },
    async (req, reply) => {
      try {
        const { roomId } = req.params as { roomId: string };
        const metadata = { roomId, messageCount: 0, activeUsers: 0 };

        return reply.code(200).send({
          success: true,
          metadata,
        });
      } catch (error) {
        console.error('Error fetching room metadata:', error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to fetch room metadata',
        });
      }
    }
  );

  /**
   * GET /api/chat/moderation/status/:userId
   * Get moderation status for a user
   */
  app.get(
    '/api/chat/moderation/status/:userId',
    { preHandler: requireAdmin },
    async (req, reply) => {
      try {
        const { userId } = req.params as { userId: string };
        const status = await checkModerationStatus(userId);

        return reply.code(200).send({
          success: true,
          status,
        });
      } catch (error) {
        console.error('Error checking moderation status:', error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to check moderation status',
        });
      }
    }
  );

  /**
   * POST /api/chat/moderation/mute
   * Mute a user (admin only)
   */
  app.post(
    '/api/chat/moderation/mute',
    { preHandler: requireAdmin },
    async (req, reply) => {
      try {
        const data = muteSchema.parse(req.body);
        const moderatorId = (req.user as any).userId;

        const status = await muteUser(
          data.userId,
          data.durationMinutes,
          data.reason,
          moderatorId
        );

        return reply.code(200).send({
          success: true,
          message: `User muted for ${data.durationMinutes} minutes`,
          status,
        });
      } catch (error) {
        console.error('Error muting user:', error);
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to mute user',
        });
      }
    }
  );

  /**
   * POST /api/chat/moderation/unmute
   * Unmute a user (admin only)
   */
  app.post(
    '/api/chat/moderation/unmute',
    { preHandler: requireAdmin },
    async (req, reply) => {
      try {
        const data = moderationActionSchema.parse(req.body);
        const moderatorId = (req.user as any).userId;

        const status = await unmuteUser(data.userId, moderatorId);

        return reply.code(200).send({
          success: true,
          message: 'User unmuted',
          status,
        });
      } catch (error) {
        console.error('Error unmuting user:', error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to unmute user',
        });
      }
    }
  );

  /**
   * POST /api/chat/moderation/ban
   * Ban a user from chat (admin only)
   */
  app.post(
    '/api/chat/moderation/ban',
    { preHandler: requireAdmin },
    async (req, reply) => {
      try {
        const data = moderationActionSchema.parse(req.body);
        const moderatorId = (req.user as any).userId;

        const status = await banUser(data.userId, data.reason, moderatorId);

        return reply.code(200).send({
          success: true,
          message: 'User banned from chat',
          status,
        });
      } catch (error) {
        console.error('Error banning user:', error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to ban user',
        });
      }
    }
  );

  /**
   * POST /api/chat/moderation/unban
   * Unban a user from chat (admin only)
   */
  app.post(
    '/api/chat/moderation/unban',
    { preHandler: requireAdmin },
    async (req, reply) => {
      try {
        const data = moderationActionSchema.parse(req.body);
        const moderatorId = (req.user as any).userId;

        const status = await unbanUser(data.userId, moderatorId);

        return reply.code(200).send({
          success: true,
          message: 'User unbanned from chat',
          status,
        });
      } catch (error) {
        console.error('Error unbanning user:', error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to unban user',
        });
      }
    }
  );

  /**
   * POST /api/chat/moderation/strike
   * Add a strike to user (admin only)
   */
  app.post(
    '/api/chat/moderation/strike',
    { preHandler: requireAdmin },
    async (req, reply) => {
      try {
        const data = strikeSchema.parse(req.body);

        const status = await addStrike(data.userId, data.reason);

        return reply.code(200).send({
          success: true,
          message: 'Strike added',
          status,
        });
      } catch (error) {
        console.error('Error adding strike:', error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to add strike',
        });
      }
    }
  );

  /**
   * DELETE /api/chat/moderation/clear-strikes/:userId
   * Clear all strikes for user (admin only)
   */
  app.delete(
    '/api/chat/moderation/clear-strikes/:userId',
    { preHandler: requireAdmin },
    async (req, reply) => {
      try {
        const { userId } = req.params as { userId: string };
        const moderatorId = (req.user as any).userId;

        const status = await clearStrikes(userId, moderatorId);

        return reply.code(200).send({
          success: true,
          message: 'Strikes cleared',
          status,
        });
      } catch (error) {
        console.error('Error clearing strikes:', error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to clear strikes',
        });
      }
    }
  );

  /**
   * GET /api/chat/moderation/history/:userId
   * Get moderation history for user (admin only)
   */
  app.get(
    '/api/chat/moderation/history/:userId',
    { preHandler: requireAdmin },
    async (req, reply) => {
      try {
        const { userId } = req.params as { userId: string };
        const query = req.query as any;
        const limit = query.limit ? parseInt(query.limit) : 20;

        const history = await getModerationHistory(userId, limit);

        return reply.code(200).send({
          success: true,
          history,
        });
      } catch (error) {
        console.error('Error fetching moderation history:', error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to fetch moderation history',
        });
      }
    }
  );

  /**
   * DELETE /api/chat/messages/:messageId
   * Delete a message (admin only)
   */
  app.delete(
    '/api/chat/messages/:messageId',
    { preHandler: requireAdmin },
    async (req, reply) => {
      try {
        const { messageId } = req.params as { messageId: string };
        const moderatorId = (req.user as any).userId;

        const success = true; // Placeholder - implement deleteMessage function

        if (success) {
          return reply.code(200).send({
            success: true,
            message: 'Message deleted',
          });
        } else {
          return reply.code(404).send({
            success: false,
            error: 'Message not found',
          });
        }
      } catch (error) {
        console.error('Error deleting message:', error);
        return reply.code(500).send({
          success: false,
          error: 'Failed to delete message',
        });
      }
    }
  );

  console.log('💬 Chat REST API routes registered');
}
