/**
 * Notification Routes
 *
 * API endpoints for managing user notifications
 */

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import * as notificationService from '../services/notificationService.js';

const notificationsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/notifications
   * Get user notifications
   */
  fastify.get(
    '/',
    {
      preHandler: [fastify.authenticate],
      schema: {
        querystring: z.object({
          limit: z.coerce.number().min(1).max(100).optional().default(50),
          offset: z.coerce.number().min(0).optional().default(0),
          unreadOnly: z
            .enum(['true', 'false'])
            .optional()
            .transform((val) => val === 'true'),
        }),
        response: {
          200: z.object({
            success: z.literal(true),
            notifications: z.array(
              z.object({
                id: z.string(),
                type: z.string(),
                category: z.string(),
                title: z.string(),
                message: z.string(),
                read: z.boolean(),
                metadata: z.string(),
                actionUrl: z.string().nullable(),
                createdAt: z.date(),
              })
            ),
            unreadCount: z.number(),
            hasMore: z.boolean(),
          }),
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.userId;
      const { limit, offset, unreadOnly } = request.query as {
        limit: number;
        offset: number;
        unreadOnly: boolean;
      };

      const [notifications, unreadCount] = await Promise.all([
        notificationService.getUserNotifications(userId, limit, offset, unreadOnly),
        notificationService.getUnreadCount(userId),
      ]);

      const hasMore = notifications.length === limit;

      return {
        success: true,
        notifications,
        unreadCount,
        hasMore,
      };
    }
  );

  /**
   * GET /api/notifications/unread-count
   * Get unread notification count
   */
  fastify.get(
    '/unread-count',
    {
      preHandler: [fastify.authenticate],
      schema: {
        response: {
          200: z.object({
            success: z.literal(true),
            count: z.number(),
          }),
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.userId;
      const count = await notificationService.getUnreadCount(userId);

      return {
        success: true,
        count,
      };
    }
  );

  /**
   * PATCH /api/notifications/:id/read
   * Mark a notification as read
   */
  fastify.patch(
    '/:id/read',
    {
      preHandler: [fastify.authenticate],
      schema: {
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          200: z.object({
            success: z.literal(true),
          }),
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.userId;
      const { id } = request.params as { id: string };

      await notificationService.markNotificationAsRead(id, userId);

      return { success: true };
    }
  );

  /**
   * PATCH /api/notifications/read-all
   * Mark all notifications as read
   */
  fastify.patch(
    '/read-all',
    {
      preHandler: [fastify.authenticate],
      schema: {
        response: {
          200: z.object({
            success: z.literal(true),
          }),
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.userId;
      await notificationService.markAllNotificationsAsRead(userId);

      return { success: true };
    }
  );

  /**
   * DELETE /api/notifications/:id
   * Delete a notification
   */
  fastify.delete(
    '/:id',
    {
      preHandler: [fastify.authenticate],
      schema: {
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          200: z.object({
            success: z.literal(true),
          }),
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.userId;
      const { id } = request.params as { id: string };

      await notificationService.deleteNotification(id, userId);

      return { success: true };
    }
  );
};

export default notificationsRoutes;
