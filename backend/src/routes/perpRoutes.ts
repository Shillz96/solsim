// Perpetual trading API routes
import { FastifyPluginAsync } from "fastify";
import * as perpTradeService from "../services/perpTradeService.js";
import * as liquidationEngine from "../services/liquidationEngine.js";
import { z } from "zod";

// Validation schemas
const openPositionSchema = z.object({
  userId: z.string().uuid(),
  mint: z.string().min(32),
  side: z.enum(["LONG", "SHORT"]),
  leverage: z.number().int().refine((val) => [2, 5, 10, 20].includes(val), {
    message: "Leverage must be 2, 5, 10, or 20",
  }),
  marginAmount: z.string().refine((val) => parseFloat(val) > 0, {
    message: "Margin amount must be greater than 0",
  }),
});

const closePositionSchema = z.object({
  userId: z.string().uuid(),
  positionId: z.string().uuid(),
});

const perpRoutes: FastifyPluginAsync = async (fastify) => {
  // Open a new perpetual position
  fastify.post("/open", async (request, reply) => {
    try {
      const body = openPositionSchema.parse(request.body);

      const result = await perpTradeService.openPerpPosition(body);

      return reply.code(200).send(result);
    } catch (error) {
      const err = error as Error;
      fastify.log.error(`Failed to open perp position: ${err.message}`);

      if (err.message.includes("already have an open position")) {
        return reply.code(400).send({
          success: false,
          error: err.message,
        });
      }

      if (err.message.includes("Insufficient")) {
        return reply.code(400).send({
          success: false,
          error: err.message,
        });
      }

      return reply.code(500).send({
        success: false,
        error: "Failed to open position",
        details: err.message,
      });
    }
  });

  // Close an existing perpetual position
  fastify.post("/close", async (request, reply) => {
    try {
      const body = closePositionSchema.parse(request.body);

      const result = await perpTradeService.closePerpPosition(body);

      return reply.code(200).send(result);
    } catch (error) {
      const err = error as Error;
      fastify.log.error(`Failed to close perp position: ${err.message}`);

      if (err.message.includes("Not authorized") || err.message.includes("not found")) {
        return reply.code(404).send({
          success: false,
          error: err.message,
        });
      }

      if (err.message.includes("already closed")) {
        return reply.code(400).send({
          success: false,
          error: err.message,
        });
      }

      return reply.code(500).send({
        success: false,
        error: "Failed to close position",
        details: err.message,
      });
    }
  });

  // Get user's open perpetual positions
  fastify.get("/positions/:userId", async (request, reply) => {
    try {
      const { userId } = request.params as { userId: string };

      if (!userId) {
        return reply.code(400).send({
          success: false,
          error: "User ID is required",
        });
      }

      const positions = await perpTradeService.getUserPerpPositions(userId);

      return reply.code(200).send({
        success: true,
        positions,
      });
    } catch (error) {
      const err = error as Error;
      fastify.log.error(`Failed to get positions: ${err.message}`);

      return reply.code(500).send({
        success: false,
        error: "Failed to fetch positions",
        details: err.message,
      });
    }
  });

  // Get user's perpetual trade history
  fastify.get("/history/:userId", async (request, reply) => {
    try {
      const { userId } = request.params as { userId: string };
      const { limit } = request.query as { limit?: string };

      if (!userId) {
        return reply.code(400).send({
          success: false,
          error: "User ID is required",
        });
      }

      const trades = await perpTradeService.getPerpTradeHistory(
        userId,
        limit ? parseInt(limit) : 50
      );

      return reply.code(200).send({
        success: true,
        trades,
      });
    } catch (error) {
      const err = error as Error;
      fastify.log.error(`Failed to get trade history: ${err.message}`);

      return reply.code(500).send({
        success: false,
        error: "Failed to fetch trade history",
        details: err.message,
      });
    }
  });

  // Get liquidation engine status (admin/debug)
  fastify.get("/liquidation/status", async (request, reply) => {
    try {
      const status = liquidationEngine.getLiquidationEngineStatus();

      return reply.code(200).send({
        success: true,
        status,
      });
    } catch (error) {
      const err = error as Error;
      return reply.code(500).send({
        success: false,
        error: err.message,
      });
    }
  });

  // Force liquidation check (admin/debug)
  fastify.post("/liquidation/force-check", async (request, reply) => {
    try {
      const result = await liquidationEngine.forceCheckPositions();

      return reply.code(200).send({
        success: true,
        result,
      });
    } catch (error) {
      const err = error as Error;
      return reply.code(500).send({
        success: false,
        error: err.message,
      });
    }
  });
};

export default perpRoutes;
