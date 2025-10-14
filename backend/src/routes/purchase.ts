// Purchase routes for SOL purchases
import { FastifyInstance } from "fastify";
import prisma from "../plugins/prisma.js";
import { validateBody, purchaseSchemas } from "../plugins/validation.js";
import { generalRateLimit } from "../plugins/rateLimiting.js";
import * as purchaseService from "../services/purchaseService.js";
import Decimal from "decimal.js";

export default async function purchaseRoutes(app: FastifyInstance) {
  
  // POST /api/purchase/initiate - Initiate a SOL purchase
  app.post("/initiate", {
    preHandler: [generalRateLimit, validateBody(purchaseSchemas.initiate)]
  }, async (req, reply) => {
    try {
      const { userId, amount, walletAddress } = req.body as {
        userId: string;
        amount: number;
        walletAddress: string;
      };

      // Validate user exists
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return reply.code(404).send({ error: "User not found" });
      }

      // Validate tier amount
      const tier = purchaseService.validateTierAmount(amount);
      if (!tier) {
        return reply.code(400).send({ 
          error: "Invalid amount",
          message: "Amount must match one of the available tiers",
          validAmounts: Object.values(purchaseService.PURCHASE_TIERS).map(t => t.realSol)
        });
      }

      // Create purchase record
      const purchase = await prisma.solPurchase.create({
        data: {
          userId,
          realSolAmount: new Decimal(tier.realSol),
          simulatedSolAmount: new Decimal(tier.simulatedSol),
          transactionSignature: '', // Will be updated on verification
          walletAddress,
          status: 'PENDING',
          tierLabel: tier.label
        }
      });

      app.log.info(`Purchase initiated: ${purchase.id} - ${tier.label} (${tier.realSol} SOL)`);

      return {
        purchaseId: purchase.id,
        recipientWallet: purchaseService.getRecipientWallet(),
        amount: tier.realSol,
        simulatedSol: tier.simulatedSol,
        tierLabel: tier.label
      };

    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({ 
        error: "Failed to initiate purchase",
        message: error.message 
      });
    }
  });

  // POST /api/purchase/verify - Verify transaction and credit user
  app.post("/verify", {
    preHandler: [generalRateLimit, validateBody(purchaseSchemas.verify)]
  }, async (req, reply) => {
    try {
      const { userId, transactionSignature, walletAddress } = req.body as {
        userId: string;
        transactionSignature: string;
        walletAddress: string;
      };

      // Check if transaction already used
      const alreadyUsed = await purchaseService.isTransactionUsed(prisma, transactionSignature);
      if (alreadyUsed) {
        return reply.code(400).send({
          error: "Transaction already processed",
          message: "This transaction has already been used for a purchase"
        });
      }

      // Find pending purchase for this user
      const purchase = await prisma.solPurchase.findFirst({
        where: {
          userId,
          status: 'PENDING',
          walletAddress
        },
        orderBy: { createdAt: 'desc' }
      });

      if (!purchase) {
        return reply.code(404).send({
          error: "No pending purchase found",
          message: "Please initiate a purchase first"
        });
      }

      // Verify transaction on blockchain
      const expectedAmount = parseFloat(purchase.realSolAmount.toString());
      const verification = await purchaseService.verifyTransaction(
        transactionSignature,
        expectedAmount,
        walletAddress
      );

      if (!verification.success) {
        // Update purchase as failed
        await prisma.solPurchase.update({
          where: { id: purchase.id },
          data: {
            status: 'FAILED',
            transactionSignature
          }
        });

        return reply.code(400).send({
          error: "Transaction verification failed",
          message: verification.error || "Could not verify transaction"
        });
      }

      // Update purchase and credit user
      const [updatedPurchase, updatedUser] = await prisma.$transaction([
        prisma.solPurchase.update({
          where: { id: purchase.id },
          data: {
            status: 'COMPLETED',
            transactionSignature,
            completedAt: new Date()
          }
        }),
        prisma.user.update({
          where: { id: userId },
          data: {
            virtualSolBalance: {
              increment: purchase.simulatedSolAmount
            }
          }
        })
      ]);

      app.log.info(`Purchase completed: ${purchase.id} - ${transactionSignature.slice(0, 8)}...`);

      return {
        success: true,
        purchaseId: updatedPurchase.id,
        simulatedSolAdded: purchase.simulatedSolAmount.toString(),
        newBalance: updatedUser.virtualSolBalance.toString(),
        transactionSignature,
        explorerUrl: `https://solscan.io/tx/${transactionSignature}`
      };

    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({
        error: "Failed to verify purchase",
        message: error.message
      });
    }
  });

  // GET /api/purchase/history/:userId - Get purchase history
  app.get("/history/:userId", {
    preHandler: [generalRateLimit]
  }, async (req, reply) => {
    try {
      const { userId } = req.params as { userId: string };
      const { limit = '50', offset = '0' } = req.query as any;

      const purchases = await prisma.solPurchase.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset)
      });

      const formatted = purchases.map(p => ({
        id: p.id,
        realSolAmount: p.realSolAmount.toString(),
        simulatedSolAmount: p.simulatedSolAmount.toString(),
        transactionSignature: p.transactionSignature,
        status: p.status,
        tierLabel: p.tierLabel,
        createdAt: p.createdAt.toISOString(),
        completedAt: p.completedAt?.toISOString() || null,
        explorerUrl: p.transactionSignature 
          ? `https://solscan.io/tx/${p.transactionSignature}`
          : null
      }));

      return {
        purchases: formatted,
        total: purchases.length
      };

    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({
        error: "Failed to fetch purchase history",
        message: error.message
      });
    }
  });

  // GET /api/purchase/tiers - Get available purchase tiers
  app.get("/tiers", async (req, reply) => {
    const tiers = Object.values(purchaseService.PURCHASE_TIERS).map(tier => ({
      realSol: tier.realSol,
      simulatedSol: tier.simulatedSol,
      label: tier.label,
      bonus: tier.realSol === 0.05 ? 0 : Math.round(((tier.simulatedSol / tier.realSol) - 2000) / 20),
      popular: tier.label.includes('Popular')
    }));

    return { tiers };
  });
}
