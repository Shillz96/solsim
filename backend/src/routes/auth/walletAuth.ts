/**
 * Wallet Authentication Routes
 *
 * Handles Solana wallet-based authentication:
 * - Generate nonce for wallet signature
 * - Verify wallet signature (Sign-In With Solana)
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import prisma from "../../plugins/prisma.js";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { AuthService } from "../../plugins/auth.js";
import { validateBody, authSchemas, sanitizeInput } from "../../plugins/validation.js";
import { walletRateLimit } from "../../plugins/rateLimiting.js";
import { NonceService } from "../../plugins/nonce.js";
import * as notificationService from "../../services/notificationService.js";
import redis from "../../plugins/redis.js";

export default async function walletAuthRoutes(app: FastifyInstance) {
  // Wallet nonce generation with secure TTL
  app.post("/wallet/nonce", {
    preHandler: [walletRateLimit, validateBody(authSchemas.walletNonce)]
  }, async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const sanitizedBody = sanitizeInput(req.body) as {
        walletAddress: string;
      };

      const { walletAddress } = sanitizedBody;

      // Generate secure nonce with Redis TTL
      const nonce = await NonceService.generateNonce(walletAddress);

      // Create or update user record
      const walletUser = await prisma.user.upsert({
        where: { walletAddress },
        update: {
          walletNonce: null // Don't store nonce in DB anymore, only in Redis
        },
        create: {
          email: `${walletAddress.slice(0, 8)}@wallet.virtualsol.fun`,
          handle: walletAddress.slice(0, 16),
          passwordHash: '',
          walletAddress,
          walletNonce: null,
          virtualSolBalance: 100,
          userTier: 'WALLET_USER'
        }
      });

      // Send welcome notification for new wallet users (non-blocking)
      // Check if this is a new user by checking if they just got created
      const isNewUser = await prisma.user.count({ where: { walletAddress } }) === 1;
      if (isNewUser) {
        notificationService.notifyWelcome(walletUser.id, walletUser.handle || walletAddress).catch(error => {
          console.error('Failed to send welcome notification:', error);
        });
      }

      // Create Sign-In With Solana message
      const message = NonceService.createSIWSMessage(walletAddress, nonce);

      return {
        nonce,
        message,
        expiresIn: 300 // 5 minutes
      };

    } catch (error: any) {
      console.error('Nonce generation error:', error);

      if (error.message.includes('Too many nonce requests')) {
        return reply.code(429).send({
          error: "RATE_LIMIT_EXCEEDED",
          message: error.message
        });
      }

      return reply.code(500).send({
        error: "NONCE_GENERATION_FAILED",
        message: "Failed to generate authentication nonce"
      });
    }
  });

  // Wallet signature verification with secure nonce validation
  app.post("/wallet/verify", {
    preHandler: [walletRateLimit, validateBody(authSchemas.walletVerify)]
  }, async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const sanitizedBody = sanitizeInput(req.body) as {
        walletAddress: string;
        signature: string;
      };

      const { walletAddress, signature } = sanitizedBody;

      const user = await prisma.user.findUnique({ where: { walletAddress } });
      if (!user) {
        return reply.code(400).send({
          error: "USER_NOT_FOUND",
          message: "Wallet not found. Please request a new nonce."
        });
      }

      // Verify nonce exists and is valid
      const hasValidNonce = await NonceService.hasValidNonce(walletAddress);
      if (!hasValidNonce) {
        return reply.code(400).send({
          error: "NONCE_EXPIRED",
          message: "Authentication nonce has expired. Please request a new one."
        });
      }

      // Get nonce from Redis for signature verification
      const storedNonce = await redis.get(`nonce:${walletAddress}`);
      if (!storedNonce) {
        return reply.code(400).send({
          error: "NONCE_MISSING",
          message: "Authentication nonce not found"
        });
      }

      // Create the message that was signed
      const message = NonceService.createSIWSMessage(walletAddress, storedNonce);
      const messageBytes = new TextEncoder().encode(message);

      try {
        const sig = bs58.decode(signature);
        const pub = bs58.decode(walletAddress);

        const isValidSignature = nacl.sign.detached.verify(messageBytes, sig, pub);
        if (!isValidSignature) {
          return reply.code(401).send({
            error: "INVALID_SIGNATURE",
            message: "Invalid wallet signature"
          });
        }
      } catch (sigError) {
        return reply.code(401).send({
          error: "SIGNATURE_DECODE_ERROR",
          message: "Failed to decode signature"
        });
      }

      // Verify and consume nonce
      const isNonceValid = await NonceService.verifyAndConsumeNonce(walletAddress, storedNonce);
      if (!isNonceValid) {
        return reply.code(401).send({
          error: "NONCE_VERIFICATION_FAILED",
          message: "Nonce verification failed"
        });
      }

      // Create session and generate tokens
      const sessionId = await AuthService.createSession(user.id, user.userTier, {
        loginMethod: 'wallet',
        walletAddress,
        userAgent: req.headers['user-agent'],
        ip: req.ip
      });

      const { accessToken, refreshToken } = AuthService.generateTokens(
        user.id,
        user.userTier,
        sessionId
      );

      console.log(`✅ Wallet authenticated: ${walletAddress.slice(0, 8)}... (${user.id})`);

      return {
        userId: user.id,
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          userTier: user.userTier,
          virtualSolBalance: user.virtualSolBalance.toString(),
          walletAddress: user.walletAddress
        }
      };

    } catch (error: any) {
      console.error('Wallet verification error:', error);
      return reply.code(500).send({
        error: "WALLET_VERIFICATION_FAILED",
        message: "Failed to verify wallet signature"
      });
    }
  });
}
