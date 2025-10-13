// Admin routes for maintenance operations
import { FastifyPluginAsync } from "fastify";
import { rebuildPositions } from "../services/migrationService.js";

const adminRoutes: FastifyPluginAsync = async (app) => {
  // Admin authentication middleware
  app.addHook("preHandler", async (request, reply) => {
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
};

export default adminRoutes;
