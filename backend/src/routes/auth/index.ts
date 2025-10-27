/**
 * Auth Routes - Main Router
 *
 * Registers all authentication-related sub-routers:
 * - Email authentication (signup, login, verification)
 * - Wallet authentication (nonce generation, signature verification)
 * - Session management (refresh tokens, logout)
 * - Password management (change, reset, forgot)
 * - Profile management (update profile, avatar)
 *
 * This decomposed structure replaces the original 1,210-line monolithic auth.ts file
 * for better maintainability and separation of concerns.
 */

import { FastifyInstance } from "fastify";
import emailAuthRoutes from "./emailAuth.js";
import walletAuthRoutes from "./walletAuth.js";
import sessionManagementRoutes from "./sessionManagement.js";
import passwordManagementRoutes from "./passwordManagement.js";
import profileManagementRoutes from "./profileManagement.js";

export default async function authRoutes(app: FastifyInstance) {
  // Register email authentication routes
  // POST /signup-email, /login-email, /verify-email/:token, /resend-verification
  await app.register(emailAuthRoutes);

  // Register wallet authentication routes
  // POST /wallet/nonce, /wallet/verify
  await app.register(walletAuthRoutes);

  // Register session management routes
  // POST /refresh-token, /logout, /logout-all
  await app.register(sessionManagementRoutes);

  // Register password management routes
  // POST /change-password, /forgot-password, /reset-password
  await app.register(passwordManagementRoutes);

  // Register profile management routes
  // POST /profile, GET /user/:userId, /update-avatar, /remove-avatar
  await app.register(profileManagementRoutes);
}
