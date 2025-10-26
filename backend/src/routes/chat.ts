/**
 * Chat REST API Routes
 *
 * Provides REST endpoints for:
 * - Message history
 * - Room metadata
 * - Moderation actions (admin/moderator only)
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticateToken, requireAdmin, requireAdminOrModerator } from '../plugins/auth.js';
import {
  getRecentMessages,
  getRoomMetadata,
  deleteMessage,
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

// Validation Schemas
const roomIdParamSchema = z.object({
  roomId: z.string().min(1),
});

const userIdParamSchema = z.object({
  userId: z.string().uuid(),
});

const messageIdParamSchema = z.object({
  messageId: z.string().uuid(),
});

const limitQuerySchema = z.object({
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 100),
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

// Helper Functions
const createSuccessResponse = (data: any) => ({ success: true, ...data });
const createErrorResponse = (error: string) => ({ success: false, error });
const getUserId = (req: any) => req.user?.userId;

export default async function chatRoutes(app: FastifyInstance) {
  /**
   * GET /api/chat/rooms/:roomId/messages
   */
  app.get(
    '/api/chat/rooms/:roomId/messages',
    { preHandler: authenticateToken },
    async (req, reply) => {
      try {
        const { roomId } = roomIdParamSchema.parse(req.params);
        const { limit } = limitQuerySchema.parse(req.query);

        const messages = await getRecentMessages(roomId, limit);

        return reply.code(200).send(
          createSuccessResponse({ roomId, messages, count: messages.length })
        );
      } catch (error) {
        console.error('Error fetching room messages:', error);
        return reply.code(500).send(createErrorResponse('Failed to fetch messages'));
      }
    }
  );

  /**
   * GET /api/chat/rooms/:roomId/metadata
   */
  app.get(
    '/api/chat/rooms/:roomId/metadata',
    { preHandler: authenticateToken },
    async (req, reply) => {
      try {
        const { roomId } = roomIdParamSchema.parse(req.params);
        const metadata = await getRoomMetadata(roomId);

        return reply.code(200).send(createSuccessResponse({ metadata }));
      } catch (error) {
        console.error('Error fetching room metadata:', error);
        return reply.code(500).send(createErrorResponse('Failed to fetch room metadata'));
      }
    }
  );

  /**
   * GET /api/chat/moderation/status/:userId
   */
  app.get(
    '/api/chat/moderation/status/:userId',
    { preHandler: requireAdminOrModerator },
    async (req, reply) => {
      try {
        const { userId } = userIdParamSchema.parse(req.params);
        const status = await checkModerationStatus(userId);

        return reply.code(200).send(createSuccessResponse({ status }));
      } catch (error) {
        console.error('Error checking moderation status:', error);
        return reply.code(500).send(createErrorResponse('Failed to check moderation status'));
      }
    }
  );

  /**
   * POST /api/chat/moderation/mute
   */
  app.post(
    '/api/chat/moderation/mute',
    { preHandler: requireAdminOrModerator },
    async (req, reply) => {
      try {
        const data = muteSchema.parse(req.body);
        const moderatorId = getUserId(req);

        const status = await muteUser(
          data.userId,
          data.durationMinutes,
          data.reason,
          moderatorId
        );

        return reply.code(200).send(
          createSuccessResponse({
            message: `User muted for ${data.durationMinutes} minutes`,
            status,
          })
        );
      } catch (error) {
        console.error('Error muting user:', error);
        return reply.code(500).send(
          createErrorResponse(error instanceof Error ? error.message : 'Failed to mute user')
        );
      }
    }
  );

  /**
   * POST /api/chat/moderation/unmute
   */
  app.post(
    '/api/chat/moderation/unmute',
    { preHandler: requireAdminOrModerator },
    async (req, reply) => {
      try {
        const data = moderationActionSchema.parse(req.body);
        const moderatorId = getUserId(req);

        const status = await unmuteUser(data.userId, moderatorId);

        return reply.code(200).send(
          createSuccessResponse({ message: 'User unmuted', status })
        );
      } catch (error) {
        console.error('Error unmuting user:', error);
        return reply.code(500).send(createErrorResponse('Failed to unmute user'));
      }
    }
  );

  /**
   * POST /api/chat/moderation/ban
   */
  app.post(
    '/api/chat/moderation/ban',
    { preHandler: requireAdminOrModerator },
    async (req, reply) => {
      try {
        const data = moderationActionSchema.parse(req.body);
        const moderatorId = getUserId(req);

        const status = await banUser(data.userId, data.reason, moderatorId);

        return reply.code(200).send(
          createSuccessResponse({ message: 'User banned from chat', status })
        );
      } catch (error) {
        console.error('Error banning user:', error);
        return reply.code(500).send(createErrorResponse('Failed to ban user'));
      }
    }
  );

  /**
   * POST /api/chat/moderation/unban
   */
  app.post(
    '/api/chat/moderation/unban',
    { preHandler: requireAdminOrModerator },
    async (req, reply) => {
      try {
        const data = moderationActionSchema.parse(req.body);
        const moderatorId = getUserId(req);

        const status = await unbanUser(data.userId, moderatorId);

        return reply.code(200).send(
          createSuccessResponse({ message: 'User unbanned from chat', status })
        );
      } catch (error) {
        console.error('Error unbanning user:', error);
        return reply.code(500).send(createErrorResponse('Failed to unban user'));
      }
    }
  );

  /**
   * POST /api/chat/moderation/strike
   */
  app.post(
    '/api/chat/moderation/strike',
    { preHandler: requireAdminOrModerator },
    async (req, reply) => {
      try {
        const data = strikeSchema.parse(req.body);

        const status = await addStrike(data.userId, data.reason);

        return reply.code(200).send(
          createSuccessResponse({ message: 'Strike added', status })
        );
      } catch (error) {
        console.error('Error adding strike:', error);
        return reply.code(500).send(createErrorResponse('Failed to add strike'));
      }
    }
  );

  /**
   * DELETE /api/chat/moderation/clear-strikes/:userId
   */
  app.delete(
    '/api/chat/moderation/clear-strikes/:userId',
    { preHandler: requireAdminOrModerator },
    async (req, reply) => {
      try {
        const { userId } = userIdParamSchema.parse(req.params);
        const moderatorId = getUserId(req);

        const status = await clearStrikes(userId, moderatorId);

        return reply.code(200).send(
          createSuccessResponse({ message: 'Strikes cleared', status })
        );
      } catch (error) {
        console.error('Error clearing strikes:', error);
        return reply.code(500).send(createErrorResponse('Failed to clear strikes'));
      }
    }
  );

  /**
   * GET /api/chat/moderation/history/:userId
   */
  app.get(
    '/api/chat/moderation/history/:userId',
    { preHandler: requireAdminOrModerator },
    async (req, reply) => {
      try {
        const { userId } = userIdParamSchema.parse(req.params);
        const { limit } = limitQuerySchema.parse(req.query);

        const history = await getModerationHistory(userId, limit);

        return reply.code(200).send(createSuccessResponse({ history }));
      } catch (error) {
        console.error('Error fetching moderation history:', error);
        return reply.code(500).send(createErrorResponse('Failed to fetch moderation history'));
      }
    }
  );

  /**
   * DELETE /api/chat/messages/:messageId
   */
  app.delete(
    '/api/chat/messages/:messageId',
    { preHandler: requireAdminOrModerator },
    async (req, reply) => {
      try {
        const { messageId } = messageIdParamSchema.parse(req.params);
        const moderatorId = getUserId(req);

        const success = await deleteMessage(messageId, moderatorId);

        if (success) {
          return reply.code(200).send(
            createSuccessResponse({ message: 'Message deleted' })
          );
        } else {
          return reply.code(404).send(createErrorResponse('Message not found'));
        }
      } catch (error) {
        console.error('Error deleting message:', error);
        return reply.code(500).send(createErrorResponse('Failed to delete message'));
      }
    }
  );

  console.log('💬 Chat REST API routes registered');
}
