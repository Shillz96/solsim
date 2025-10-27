/**
 * Password Management Routes
 *
 * Handles password-related operations:
 * - Change password (authenticated users)
 * - Request password reset (forgot password)
 * - Reset password with token
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import prisma from "../../plugins/prisma.js";
import bcrypt from "bcryptjs";
import { AuthService, authenticateToken, type AuthenticatedRequest } from "../../plugins/auth.js";
import { validateBody, authSchemas, sanitizeInput } from "../../plugins/validation.js";
import { authRateLimit, sensitiveRateLimit } from "../../plugins/rateLimiting.js";
import { EmailService } from "../../services/emailService.js";
import { validatePasswordStrength, getPasswordErrorMessage } from "../../utils/password-validator.js";

export default async function passwordManagementRoutes(app: FastifyInstance) {
  // Change password with authentication and validation
  app.post("/change-password", {
    preHandler: [authenticateToken, sensitiveRateLimit, validateBody(authSchemas.changePassword)]
  }, async (req: AuthenticatedRequest, reply) => {
    try {
      const sanitizedBody = sanitizeInput(req.body) as {
        userId: string;
        currentPassword: string;
        newPassword: string;
      };

      const { userId, currentPassword, newPassword } = sanitizedBody;

      // Verify user can only change their own password
      if (req.user?.id !== userId) {
        return reply.code(403).send({
          error: "FORBIDDEN",
          message: "You can only change your own password"
        });
      }

      // Validate new password strength
      const passwordValidation = validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        return reply.code(400).send({
          error: "WEAK_PASSWORD",
          message: getPasswordErrorMessage(passwordValidation),
          details: passwordValidation.errors
        });
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });

      if (!user || !user.passwordHash) {
        return reply.code(404).send({
          error: "USER_NOT_FOUND",
          message: "User not found or no password set"
        });
      }

      // Verify current password
      const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValid) {
        return reply.code(401).send({
          error: "INVALID_CURRENT_PASSWORD",
          message: "Current password is incorrect"
        });
      }

      // Hash new password with secure salt rounds
      const newHash = await bcrypt.hash(newPassword, 12);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newHash }
      });

      // Invalidate all existing sessions for security
      await AuthService.invalidateAllUserSessions(userId);

      console.log(`🔒 Password changed for user ${userId}`);

      return {
        success: true,
        message: "Password updated successfully. Please log in again."
      };

    } catch (error: any) {
      console.error('Change password error:', error);
      return reply.code(500).send({
        error: "PASSWORD_CHANGE_FAILED",
        message: "Failed to change password"
      });
    }
  });

  // Request password reset
  app.post("/forgot-password", {
    preHandler: [authRateLimit]
  }, async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const { email } = req.body as { email: string };

      if (!email) {
        return reply.code(400).send({
          error: "MISSING_EMAIL",
          message: "Email is required"
        });
      }

      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email }
      });

      // Always return success to prevent email enumeration
      if (!user || !user.passwordHash) {
        console.log(`Password reset requested for non-existent/wallet user: ${email}`);
        return {
          success: true,
          message: "If an account exists with this email, you will receive password reset instructions"
        };
      }

      // Generate password reset token
      const resetToken = EmailService.generateToken();
      const resetExpiry = EmailService.generateTokenExpiry(1); // 1 hour expiry

      // Update user with reset token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: resetToken,
          passwordResetExpiry: resetExpiry
        }
      });

      // Send password reset email
      await EmailService.sendPasswordResetEmail(user.email, resetToken, user.handle || user.email);

      console.log(`✅ Password reset email sent to: ${email} (${user.id})`);

      return {
        success: true,
        message: "If an account exists with this email, you will receive password reset instructions"
      };

    } catch (error: any) {
      console.error('Forgot password error:', error);
      // Don't reveal error details to prevent email enumeration
      return {
        success: true,
        message: "If an account exists with this email, you will receive password reset instructions"
      };
    }
  });

  // Reset password with token
  app.post("/reset-password", {
    preHandler: [authRateLimit]
  }, async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const { token, newPassword } = req.body as { token: string; newPassword: string };

      if (!token || !newPassword) {
        return reply.code(400).send({
          error: "MISSING_FIELDS",
          message: "Token and new password are required"
        });
      }

      // Validate new password strength
      const passwordValidation = validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        return reply.code(400).send({
          error: "WEAK_PASSWORD",
          message: getPasswordErrorMessage(passwordValidation),
          details: passwordValidation.errors
        });
      }

      // Find user by reset token
      const user = await prisma.user.findFirst({
        where: {
          passwordResetToken: token,
          passwordResetExpiry: {
            gte: new Date() // Token must not be expired
          }
        }
      });

      if (!user) {
        return reply.code(400).send({
          error: "INVALID_OR_EXPIRED_TOKEN",
          message: "Password reset link is invalid or has expired"
        });
      }

      // Hash new password
      const newHash = await bcrypt.hash(newPassword, 12);

      // Update password and clear reset token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: newHash,
          passwordResetToken: null,
          passwordResetExpiry: null
        }
      });

      // Invalidate all existing sessions for security
      await AuthService.invalidateAllUserSessions(user.id);

      console.log(`✅ Password reset successful for user: ${user.email} (${user.id})`);

      return {
        success: true,
        message: "Password reset successfully. Please log in with your new password."
      };

    } catch (error: any) {
      console.error('Reset password error:', error);
      return reply.code(500).send({
        error: "RESET_FAILED",
        message: "Failed to reset password"
      });
    }
  });
}
