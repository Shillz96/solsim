import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import prisma from '../plugins/prisma.js';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Wallet Tracker Settings Routes
 * Manages user-specific filtering preferences for wallet tracker
 */

const walletTrackerSettingsPlugin: FastifyPluginAsync = async (fastify) => {
  // ============================================================================
  // Validation Schemas
  // ============================================================================

  const getSettingsParamsSchema = z.object({
    userId: z.string().uuid('Invalid user ID format'),
  });

  const updateSettingsParamsSchema = z.object({
    userId: z.string().uuid('Invalid user ID format'),
  });

  const updateSettingsBodySchema = z.object({
    showBuys: z.boolean().optional(),
    showSells: z.boolean().optional(),
    showFirstBuyOnly: z.boolean().optional(),
    minMarketCap: z.number().positive().optional().nullable(),
    maxMarketCap: z.number().positive().optional().nullable(),
    minTransactionUsd: z.number().positive().optional().nullable(),
    maxTransactionUsd: z.number().positive().optional().nullable(),
    requireImages: z.boolean().optional(),
  });

  // ============================================================================
  // GET /api/wallet-tracker/settings/:userId
  // Retrieve user's wallet tracker settings
  // ============================================================================
  fastify.get<{
    Params: z.infer<typeof getSettingsParamsSchema>;
  }>('/settings/:userId', async (request, reply) => {
    try {
      const { userId } = getSettingsParamsSchema.parse(request.params);

      // Find existing settings
      let settings = await prisma.walletTrackerSettings.findUnique({
        where: { userId },
      });

      // If no settings exist, create default settings
      if (!settings) {
        settings = await prisma.walletTrackerSettings.create({
          data: {
            userId,
            showBuys: true,
            showSells: true,
            showFirstBuyOnly: false,
            requireImages: false,
          },
        });
      }

      // Convert Decimal fields to numbers for JSON response
      return reply.code(200).send({
        success: true,
        data: {
          id: settings.id,
          userId: settings.userId,
          showBuys: settings.showBuys,
          showSells: settings.showSells,
          showFirstBuyOnly: settings.showFirstBuyOnly,
          minMarketCap: settings.minMarketCap ? parseFloat(settings.minMarketCap.toString()) : null,
          maxMarketCap: settings.maxMarketCap ? parseFloat(settings.maxMarketCap.toString()) : null,
          minTransactionUsd: settings.minTransactionUsd ? parseFloat(settings.minTransactionUsd.toString()) : null,
          maxTransactionUsd: settings.maxTransactionUsd ? parseFloat(settings.maxTransactionUsd.toString()) : null,
          requireImages: settings.requireImages,
          createdAt: settings.createdAt,
          updatedAt: settings.updatedAt,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid request parameters',
          details: error.issues,
        });
      }

      fastify.log.error('Error fetching wallet tracker settings', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch wallet tracker settings',
      });
    }
  });

  // ============================================================================
  // POST /api/wallet-tracker/settings/:userId
  // Create or update user's wallet tracker settings (upsert)
  // ============================================================================
  fastify.post<{
    Params: z.infer<typeof updateSettingsParamsSchema>;
    Body: z.infer<typeof updateSettingsBodySchema>;
  }>('/settings/:userId', async (request, reply) => {
    try {
      const { userId } = updateSettingsParamsSchema.parse(request.params);
      const body = updateSettingsBodySchema.parse(request.body);

      // Convert numbers to Decimal for database
      const data: any = {};

      if (body.showBuys !== undefined) data.showBuys = body.showBuys;
      if (body.showSells !== undefined) data.showSells = body.showSells;
      if (body.showFirstBuyOnly !== undefined) data.showFirstBuyOnly = body.showFirstBuyOnly;
      if (body.requireImages !== undefined) data.requireImages = body.requireImages;

      // Handle nullable Decimal fields
      if (body.minMarketCap !== undefined) {
        data.minMarketCap = body.minMarketCap === null ? null : new Decimal(body.minMarketCap);
      }
      if (body.maxMarketCap !== undefined) {
        data.maxMarketCap = body.maxMarketCap === null ? null : new Decimal(body.maxMarketCap);
      }
      if (body.minTransactionUsd !== undefined) {
        data.minTransactionUsd = body.minTransactionUsd === null ? null : new Decimal(body.minTransactionUsd);
      }
      if (body.maxTransactionUsd !== undefined) {
        data.maxTransactionUsd = body.maxTransactionUsd === null ? null : new Decimal(body.maxTransactionUsd);
      }

      // Upsert settings
      const settings = await prisma.walletTrackerSettings.upsert({
        where: { userId },
        update: {
          ...data,
          updatedAt: new Date(),
        },
        create: {
          userId,
          showBuys: body.showBuys ?? true,
          showSells: body.showSells ?? true,
          showFirstBuyOnly: body.showFirstBuyOnly ?? false,
          minMarketCap: body.minMarketCap !== undefined
            ? (body.minMarketCap === null ? null : new Decimal(body.minMarketCap))
            : null,
          maxMarketCap: body.maxMarketCap !== undefined
            ? (body.maxMarketCap === null ? null : new Decimal(body.maxMarketCap))
            : null,
          minTransactionUsd: body.minTransactionUsd !== undefined
            ? (body.minTransactionUsd === null ? null : new Decimal(body.minTransactionUsd))
            : null,
          maxTransactionUsd: body.maxTransactionUsd !== undefined
            ? (body.maxTransactionUsd === null ? null : new Decimal(body.maxTransactionUsd))
            : null,
          requireImages: body.requireImages ?? false,
        },
      });

      // Convert Decimal fields to numbers for JSON response
      return reply.code(200).send({
        success: true,
        message: 'Wallet tracker settings updated successfully',
        data: {
          id: settings.id,
          userId: settings.userId,
          showBuys: settings.showBuys,
          showSells: settings.showSells,
          showFirstBuyOnly: settings.showFirstBuyOnly,
          minMarketCap: settings.minMarketCap ? parseFloat(settings.minMarketCap.toString()) : null,
          maxMarketCap: settings.maxMarketCap ? parseFloat(settings.maxMarketCap.toString()) : null,
          minTransactionUsd: settings.minTransactionUsd ? parseFloat(settings.minTransactionUsd.toString()) : null,
          maxTransactionUsd: settings.maxTransactionUsd ? parseFloat(settings.maxTransactionUsd.toString()) : null,
          requireImages: settings.requireImages,
          createdAt: settings.createdAt,
          updatedAt: settings.updatedAt,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid request body',
          details: error.issues,
        });
      }

      fastify.log.error('Error updating wallet tracker settings', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to update wallet tracker settings',
      });
    }
  });
};

export default walletTrackerSettingsPlugin;
