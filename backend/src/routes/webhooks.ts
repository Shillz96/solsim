/**
 * Webhook Routes
 * 
 * Handles incoming webhooks from external services:
 * - Helius: Deposit notifications for user deposit addresses
 */

import { FastifyInstance } from "fastify";
import * as depositService from "../services/depositService.js";
import * as crypto from 'crypto';

const HELIUS_WEBHOOK_SECRET = process.env.HELIUS_WEBHOOK_SECRET || '';

/**
 * Verify Helius webhook signature
 */
function verifyHeliusSignature(payload: string, signature: string): boolean {
  if (!HELIUS_WEBHOOK_SECRET) {
    console.warn('⚠️  HELIUS_WEBHOOK_SECRET not set - skipping signature verification');
    return true; // Allow in development
  }

  try {
    const hmac = crypto.createHmac('sha256', HELIUS_WEBHOOK_SECRET);
    const expectedSignature = hmac.update(payload).digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

export default async function webhookRoutes(app: FastifyInstance) {
  /**
   * POST /webhooks/helius
   * Helius webhook for deposit notifications
   */
  app.post("/helius", async (req, reply) => {
    try {
      // Verify signature if configured
      const signature = req.headers['x-helius-signature'] as string;
      const rawBody = JSON.stringify(req.body);

      if (HELIUS_WEBHOOK_SECRET && signature) {
        const isValid = verifyHeliusSignature(rawBody, signature);
        if (!isValid) {
          app.log.warn('Invalid Helius webhook signature');
          return reply.code(401).send({ error: 'Invalid signature' });
        }
      }

      const webhookData = req.body as any;

      app.log.info({
        type: webhookData.type,
        timestamp: new Date().toISOString()
      }, 'Received Helius webhook');

      // Handle different webhook types
      if (webhookData.type === 'ACCOUNT_ACTIVITY' || webhookData[0]?.type === 'TRANSFER') {
        // Extract transaction data
        const transactions = Array.isArray(webhookData) ? webhookData : [webhookData];

        for (const tx of transactions) {
          try {
            // Parse transaction for SOL transfers
            const signature = tx.signature;
            const nativeTransfers = tx.nativeTransfers || [];

            if (!signature || nativeTransfers.length === 0) {
              continue;
            }

            // Process each native SOL transfer
            for (const transfer of nativeTransfers) {
              const toAddress = transfer.toUserAccount;
              const amount = transfer.amount / 1e9; // Convert lamports to SOL

              if (!toAddress || amount <= 0) {
                continue;
              }

              // Check if this is a deposit to a user's address
              const userId = await depositService.findUserByDepositAddress(toAddress);

              if (!userId) {
                // Not a deposit address we're tracking
                continue;
              }

              app.log.info({
                userId,
                amount,
                signature,
                toAddress
              }, 'Processing deposit');

              // Verify the transaction on-chain
              const verification = await depositService.verifyDepositTransaction(
                signature,
                toAddress
              );

              if (!verification.success) {
                app.log.error({
                  signature,
                  error: verification.error
                }, 'Deposit verification failed');
                continue;
              }

              // Credit the deposit
              const creditResult = await depositService.creditDeposit(
                userId,
                verification.amount!,
                signature,
                toAddress,
                transfer.fromUserAccount
              );

              if (creditResult.success) {
                app.log.info({
                  userId,
                  amount: verification.amount,
                  depositId: creditResult.depositId,
                  newBalance: creditResult.newBalance
                }, '✅ Deposit credited successfully');
              } else if (creditResult.error?.includes('already processed')) {
                // Duplicate webhook - not an error
                app.log.info({ signature }, 'Deposit already processed (duplicate webhook)');
              } else {
                app.log.error({
                  signature,
                  error: creditResult.error
                }, '❌ Failed to credit deposit');
              }
            }
          } catch (error: any) {
            app.log.error({
              error: error.message,
              stack: error.stack
            }, 'Error processing transaction in webhook');
          }
        }

        return { success: true, message: 'Webhook processed' };
      }

      // Unknown webhook type
      app.log.warn({ type: webhookData.type }, 'Unknown webhook type');
      return { success: true, message: 'Webhook received but not processed' };

    } catch (error: any) {
      app.log.error({
        error: error.message,
        stack: error.stack
      }, 'Webhook processing error');
      
      // Return 200 to prevent Helius from retrying on our errors
      return reply.code(200).send({ 
        success: false, 
        error: 'Internal error processing webhook' 
      });
    }
  });

  /**
   * POST /webhooks/helius-test
   * Test endpoint to manually trigger deposit processing
   * Only for development/testing
   */
  app.post("/helius-test", async (req, reply) => {
    if (process.env.NODE_ENV === 'production') {
      return reply.code(403).send({ error: 'Test endpoint not available in production' });
    }

    const { userId, txSignature } = req.body as {
      userId: string;
      txSignature: string;
    };

    if (!userId || !txSignature) {
      return reply.code(400).send({
        error: 'Missing required fields: userId, txSignature'
      });
    }

    try {
      // Get user's deposit address
      const addressData = await depositService.getUserDepositAddress(userId);

      // Verify transaction
      const verification = await depositService.verifyDepositTransaction(
        txSignature,
        addressData.address
      );

      if (!verification.success) {
        return {
          success: false,
          error: verification.error
        };
      }

      // Credit deposit
      const creditResult = await depositService.creditDeposit(
        userId,
        verification.amount!,
        txSignature,
        addressData.address,
        verification.fromAddress
      );

      return {
        success: creditResult.success,
        depositId: creditResult.depositId,
        newBalance: creditResult.newBalance,
        error: creditResult.error
      };

    } catch (error: any) {
      app.log.error({ error }, "Test deposit processing error");
      return reply.code(500).send({
        error: error.message || 'Failed to process test deposit'
      });
    }
  });
}


