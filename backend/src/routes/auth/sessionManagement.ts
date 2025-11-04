/**
 * Session Management Routes
 *
 * Handles user session operations:
 * - Refresh access tokens
 * - Logout (single session)
 * - Logout from all devices
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import authPrisma from "../../plugins/authPrisma.js"; // CRITICAL FIX: Use dedicated auth pool
import { AuthService, authenticateToken, type AuthenticatedRequest } from "../../plugins/auth.js";
import { validateBody, authSchemas } from "../../plugins/validation.js";

export default async function sessionManagementRoutes(app: FastifyInstance) {
  // Refresh token endpoint
  app.post("/refresh-token", {
    preHandler: [validateBody(authSchemas.refreshToken)]
  }, async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const { refreshToken } = req.body as { refreshToken: string };

      // Verify refresh token
      const payload = AuthService.verifyToken(refreshToken) as any;

      if (!payload.type || payload.type !== 'refresh') {
        return reply.code(401).send({
          error: "INVALID_REFRESH_TOKEN",
          message: "Invalid refresh token"
        });
      }

      // Validate session exists
      const isValidSession = await AuthService.validateSession(payload.sessionId);
      if (!isValidSession) {
        return reply.code(401).send({
          error: "SESSION_EXPIRED",
          message: "Session has expired"
        });
      }

      // Get user data
      const user = await authPrisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, userTier: true }
      });

      if (!user) {
        await AuthService.invalidateSession(payload.sessionId);
        return reply.code(401).send({
          error: "USER_NOT_FOUND",
          message: "User not found"
        });
      }

      // Generate new access token
      const { accessToken } = AuthService.generateTokens(user.id, user.userTier, payload.sessionId);

      return { accessToken };

    } catch (error: any) {
      return reply.code(401).send({
        error: "REFRESH_FAILED",
        message: "Failed to refresh token"
      });
    }
  });

  // Logout endpoint
  app.post("/logout", {
    preHandler: [authenticateToken]
  }, async (req: AuthenticatedRequest, reply) => {
    try {
      if (req.user?.sessionId) {
        await AuthService.invalidateSession(req.user.sessionId);
      }

      return { success: true, message: "Logged out successfully" };
    } catch (error: any) {
      return reply.code(500).send({
        error: "LOGOUT_FAILED",
        message: "Failed to log out"
      });
    }
  });

  // Logout from all devices
  app.post("/logout-all", {
    preHandler: [authenticateToken]
  }, async (req: AuthenticatedRequest, reply) => {
    try {
      if (req.user?.id) {
        await AuthService.invalidateAllUserSessions(req.user.id);
      }

      return { success: true, message: "Logged out from all devices" };
    } catch (error: any) {
      return reply.code(500).send({
        error: "LOGOUT_ALL_FAILED",
        message: "Failed to log out from all devices"
      });
    }
  });
}
