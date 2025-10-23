/**
 * Real Trading API Routes
 *
 * Endpoints for real mainnet trading via PumpPortal APIs:
 * - Lightning API (deposited balance, 1% fee)
 * - Local Transaction API (wallet trading, 0.5% fee)
 */

import { FastifyInstance } from "fastify";
import * as realTradeService from "../services/realTradeService.js";
import * as lightningService from "../services/pumpPortalLightningService.js";
import * as localService from "../services/pumpPortalLocalService.js";
import prisma from "../plugins/prisma.js";
import { generateDepositAddress, formatAddressForDisplay } from "../utils/depositAddressGenerator.js";

export default async function (app: FastifyInstance) {
  /**
   * POST /real-trade/execute
   * Execute real trade using deposited balance (Lightning API)
   */
  app.post("/execute", async (req, reply) => {
    const { userId, mint, side, qty, slippage, priorityFee } = req.body as {
      userId: string;
      mint: string;
      side: "BUY" | "SELL";
      qty: string;
      slippage?: number;
      priorityFee?: number;
    };

    // Validation
    if (!userId || !mint || !side || !qty) {
      return reply.code(400).send({
        error: "Missing required fields: userId, mint, side, qty"
      });
    }

    if (!["BUY", "SELL"].includes(side)) {
      return reply.code(400).send({
        error: "Invalid side. Must be 'BUY' or 'SELL'"
      });
    }

    const qtyNum = parseFloat(qty);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      return reply.code(400).send({
        error: "Invalid quantity. Must be a positive number"
      });
    }

    try {
      // Execute real trade using deposited balance
      const result = await realTradeService.executeRealTrade({
        userId,
        mint,
        side,
        qty,
        fundingSource: "DEPOSITED",
        slippage,
        priorityFee
      });

      return {
        success: true,
        trade: {
          id: result.trade.id,
          userId: result.trade.userId,
          tokenAddress: result.trade.tokenAddress,
          side: result.trade.side,
          quantity: result.trade.quantity.toString(),
          price: result.trade.price.toString(),
          totalCost: result.trade.totalCost.toString(),
          costUsd: result.trade.costUsd?.toString(),
          timestamp: result.trade.timestamp,
          marketCapUsd: result.trade.marketCapUsd?.toString(),
          // Real trading specific
          tradeMode: result.trade.tradeMode,
          realTxSignature: result.realTxSignature,
          realTxStatus: result.realTxStatus,
          fundingSource: result.trade.fundingSource,
          pumpPortalFee: result.trade.pumpPortalFee?.toString()
        },
        position: {
          mint: result.position.mint,
          quantity: result.position.qty.toString(),
          costBasis: result.position.costBasis.toString(),
          tradeMode: result.position.tradeMode
        },
        portfolioTotals: {
          totalValueUsd: result.portfolioTotals.totalValueUsd.toString(),
          totalCostBasis: result.portfolioTotals.totalCostBasis.toString(),
          unrealizedPnL: result.portfolioTotals.unrealizedPnL.toString(),
          realizedPnL: result.portfolioTotals.realizedPnL.toString(),
          realSolBalance: result.portfolioTotals.realSolBalance.toString()
        },
        rewardPointsEarned: result.rewardPointsEarned.toString(),
        // Transaction details
        txSignature: result.realTxSignature,
        txStatus: result.realTxStatus,
        explorerUrl: `https://solscan.io/tx/${result.realTxSignature}`
      };
    } catch (error: any) {
      app.log.error("Real trade execution failed:", error);

      return reply.code(400).send({
        error: error.message || "Real trade execution failed",
        code: error.code || "REAL_TRADE_FAILED"
      });
    }
  });

  /**
   * POST /real-trade/build
   * Build unsigned transaction for wallet trading (Local API)
   */
  app.post("/build", async (req, reply) => {
    const { userId, mint, side, qty, walletPublicKey, slippage, priorityFee } = req.body as {
      userId: string;
      mint: string;
      side: "BUY" | "SELL";
      qty: string;
      walletPublicKey: string;
      slippage?: number;
      priorityFee?: number;
    };

    // Validation
    if (!userId || !mint || !side || !qty || !walletPublicKey) {
      return reply.code(400).send({
        error: "Missing required fields: userId, mint, side, qty, walletPublicKey"
      });
    }

    if (!["BUY", "SELL"].includes(side)) {
      return reply.code(400).send({
        error: "Invalid side. Must be 'BUY' or 'SELL'"
      });
    }

    const qtyNum = parseFloat(qty);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      return reply.code(400).send({
        error: "Invalid quantity. Must be a positive number"
      });
    }

    try {
      // Build unsigned transaction
      const result = await realTradeService.buildWalletTransaction({
        userId,
        mint,
        side,
        qty,
        fundingSource: "WALLET",
        walletPublicKey,
        slippage,
        priorityFee
      });

      return {
        success: true,
        serializedTransaction: result.serializedTransaction,
        // User should sign this transaction on frontend and call /submit
        nextStep: "Sign transaction with wallet and POST to /real-trade/submit"
      };
    } catch (error: any) {
      app.log.error("Failed to build wallet transaction:", error);

      return reply.code(400).send({
        error: error.message || "Failed to build transaction",
        code: error.code || "BUILD_TRANSACTION_FAILED"
      });
    }
  });

  /**
   * POST /real-trade/submit
   * Submit signed wallet transaction (Local API)
   */
  app.post("/submit", async (req, reply) => {
    const {
      userId,
      mint,
      side,
      qty,
      walletPublicKey,
      signedTransaction,
      slippage,
      priorityFee
    } = req.body as {
      userId: string;
      mint: string;
      side: "BUY" | "SELL";
      qty: string;
      walletPublicKey: string;
      signedTransaction: string; // Base64 encoded signed transaction
      slippage?: number;
      priorityFee?: number;
    };

    // Validation
    if (!userId || !mint || !side || !qty || !walletPublicKey || !signedTransaction) {
      return reply.code(400).send({
        error: "Missing required fields: userId, mint, side, qty, walletPublicKey, signedTransaction"
      });
    }

    try {
      // Submit signed transaction and complete trade
      const result = await realTradeService.submitSignedRealTrade(
        {
          userId,
          mint,
          side,
          qty,
          fundingSource: "WALLET",
          walletPublicKey,
          slippage,
          priorityFee
        },
        signedTransaction
      );

      return {
        success: true,
        trade: result.trade,
        position: result.position,
        portfolioTotals: result.portfolioTotals,
        txSignature: result.realTxSignature,
        txStatus: result.realTxStatus,
        explorerUrl: `https://solscan.io/tx/${result.realTxSignature}`
      };
    } catch (error: any) {
      app.log.error("Failed to submit signed transaction:", error);

      return reply.code(400).send({
        error: error.message || "Failed to submit transaction",
        code: error.code || "SUBMIT_TRANSACTION_FAILED"
      });
    }
  });

  /**
   * GET /real-trade/status/:signature
   * Get transaction status from Solana blockchain
   */
  app.get("/status/:signature", async (req, reply) => {
    const { signature } = req.params as { signature: string };

    if (!signature) {
      return reply.code(400).send({
        error: "Transaction signature required"
      });
    }

    try {
      const status = await lightningService.getTransactionStatus(signature);

      return {
        success: true,
        signature: status.signature,
        status: status.status,
        confirmations: status.confirmations,
        blockTime: status.blockTime,
        error: status.error,
        explorerUrl: `https://solscan.io/tx/${signature}`
      };
    } catch (error: any) {
      app.log.error("Failed to get transaction status:", error);

      return reply.code(500).send({
        error: error.message || "Failed to get transaction status"
      });
    }
  });

  /**
   * GET /real-trade/deposit-address/:userId
   * Get unique deposit address for a user
   *
   * Returns deterministic deposit address derived from platform seed + user ID
   */
  app.get("/deposit-address/:userId", async (req, reply) => {
    const { userId } = req.params as { userId: string };

    if (!userId) {
      return reply.code(400).send({
        error: "User ID is required"
      });
    }

    // Get platform seed from environment
    const platformSeed = process.env.PLATFORM_DEPOSIT_SEED;

    if (!platformSeed) {
      app.log.error("PLATFORM_DEPOSIT_SEED not configured in environment");
      return reply.code(500).send({
        error: "Deposit system not configured. Please contact support."
      });
    }

    if (platformSeed.length < 32) {
      app.log.error("PLATFORM_DEPOSIT_SEED too short (min 32 characters)");
      return reply.code(500).send({
        error: "Deposit system misconfigured. Please contact support."
      });
    }

    try {
      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true }
      });

      if (!user) {
        return reply.code(404).send({
          error: "User not found"
        });
      }

      // Generate deterministic deposit address
      const depositAddress = generateDepositAddress(userId, platformSeed);
      const addressString = depositAddress.toBase58();
      const shortAddress = formatAddressForDisplay(depositAddress);

      app.log.info(`Generated deposit address for user ${userId}: ${shortAddress}`);

      return {
        success: true,
        userId: userId,
        depositAddress: addressString,
        shortAddress: shortAddress,
        network: "mainnet-beta",
        instructions: {
          step1: "Send SOL from any wallet to this address",
          step2: "Wait 30-60 seconds for blockchain confirmation",
          step3: "Your balance will update automatically",
          note: "This is your unique deposit address. Save it for future deposits."
        }
      };
    } catch (error: any) {
      app.log.error("Failed to generate deposit address:", error);

      return reply.code(500).send({
        error: error.message || "Failed to generate deposit address"
      });
    }
  });

  /**
   * POST /real-trade/deposit
   * Deposit SOL to platform account for deposited balance trading
   * TODO: Implement proper deposit flow with unique deposit addresses
   */
  app.post("/deposit", async (req, reply) => {
    const { userId, amount, txSignature } = req.body as {
      userId: string;
      amount: string;
      txSignature: string;
    };

    if (!userId || !amount || !txSignature) {
      return reply.code(400).send({
        error: "Missing required fields: userId, amount, txSignature"
      });
    }

    // TODO: Implement deposit verification and balance update
    // 1. Verify transaction on-chain
    // 2. Check it sends to correct deposit address
    // 3. Update user's realSolBalance
    // 4. Record deposit in database

    return reply.code(501).send({
      error: "Deposit functionality not yet implemented",
      note: "For testing, realSolBalance can be updated directly in database"
    });
  });

  /**
   * POST /real-trade/withdraw
   * Withdraw SOL from platform account to user's wallet
   * TODO: Implement proper withdrawal flow with verification
   */
  app.post("/withdraw", async (req, reply) => {
    const { userId, amount, walletAddress } = req.body as {
      userId: string;
      amount: string;
      walletAddress: string;
    };

    if (!userId || !amount || !walletAddress) {
      return reply.code(400).send({
        error: "Missing required fields: userId, amount, walletAddress"
      });
    }

    // TODO: Implement withdrawal
    // 1. Check user's realSolBalance
    // 2. Send SOL from platform wallet to user's wallet
    // 3. Update user's realSolBalance
    // 4. Record withdrawal in database

    return reply.code(501).send({
      error: "Withdrawal functionality not yet implemented"
    });
  });
}
