// Wallet routes for balance and transactions
import { FastifyInstance } from "fastify";
import prisma from "../plugins/prisma.js";
import * as depositService from "../services/depositService.js";
import * as withdrawalService from "../services/withdrawalService.js";
import * as walletManagementService from "../services/walletManagementService.js";
import { getDepositKeypair } from "../utils/depositAddressGenerator.js";

const PLATFORM_SEED = process.env.PLATFORM_SEED || '';

export default async function walletRoutes(app: FastifyInstance) {
  // Get user's deposit address for real SOL deposits
  app.get("/deposit-address/:userId", async (req, reply) => {
    const { userId } = req.params as { userId: string };
    
    try {
      const result = await depositService.getUserDepositAddress(userId);
      
      return {
        success: true,
        userId,
        depositAddress: result.address,
        depositAddressShort: result.addressShort,
        network: 'mainnet-beta',
        instructions: 'Send SOL to this address to fund your real trading account. Deposits are typically confirmed within 1-2 minutes.'
      };
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({ 
        error: "Failed to generate deposit address",
        message: error.message 
      });
    }
  });

  // Export private key for user's deposit wallet
  // ⚠️ SECURITY CRITICAL: This allows users to export their deposit wallet private key
  // for self-custody. User should be warned about security implications.
  app.post("/export-private-key/:userId", async (req, reply) => {
    const { userId } = req.params as { userId: string };
    const { confirmExport } = req.body as { confirmExport?: boolean };
    
    try {
      // Verify user exists and has a deposit address
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { 
          id: true,
          realSolDepositAddress: true,
          realSolBalance: true
        }
      });

      if (!user) {
        return reply.code(404).send({
          success: false,
          error: "User not found"
        });
      }

      if (!user.realSolDepositAddress) {
        return reply.code(400).send({
          success: false,
          error: "No deposit address found. Create a deposit address first."
        });
      }

      // Require explicit confirmation
      if (!confirmExport) {
        return reply.code(400).send({
          success: false,
          error: "Export confirmation required",
          requiresConfirmation: true
        });
      }

      if (!PLATFORM_SEED) {
        throw new Error('PLATFORM_SEED not configured');
      }

      // Generate keypair for this user
      const keypair = getDepositKeypair(userId, PLATFORM_SEED);
      
      // Convert to base58 format (standard Solana private key format)
      const privateKeyBytes = keypair.secretKey;
      const privateKeyArray = Array.from(privateKeyBytes);
      
      // Log export attempt for security audit
      app.log.warn(`🔑 Private key export requested for user ${userId} (${user.realSolDepositAddress?.slice(0, 8)}...)`);

      return {
        success: true,
        depositAddress: user.realSolDepositAddress,
        privateKey: privateKeyArray,
        privateKeyBase58: Buffer.from(privateKeyBytes).toString('base64'),
        balance: user.realSolBalance?.toString() || '0',
        warning: 'SECURITY WARNING: Never share this private key with anyone. Anyone with access to this key can control all funds in this wallet. Store it securely offline.',
        exportedAt: new Date().toISOString()
      };

    } catch (error: any) {
      app.log.error('Private key export error:', error);
      return reply.code(500).send({ 
        success: false,
        error: "Failed to export private key",
        message: error.message 
      });
    }
  });

  // Get deposit history
  app.get("/deposits/:userId", async (req, reply) => {
    const { userId } = req.params as { userId: string };
    const { limit = "50", offset = "0" } = req.query as any;
    
    try {
      const result = await depositService.getDepositHistory(
        userId,
        parseInt(limit),
        parseInt(offset)
      );
      
      return {
        success: true,
        deposits: result.deposits.map(d => ({
          ...d,
          explorerUrl: `https://solscan.io/tx/${d.txSignature}`
        })),
        total: result.total,
        hasMore: result.total > parseInt(offset) + parseInt(limit)
      };
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({ error: "Failed to fetch deposit history" });
    }
  });

  // Get user's virtual SOL balance
  app.get("/balance/:userId", async (req, reply) => {
    const { userId } = req.params as { userId: string };
    
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { virtualSolBalance: true }
      });

      if (!user) {
        return reply.code(404).send({ error: "User not found" });
      }

      return {
        userId,
        balance: user.virtualSolBalance.toString(),
        currency: "SOL"
      };
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({ error: "Failed to fetch balance" });
    }
  });

  // Add virtual SOL to user (admin only)
  app.post("/add-funds", async (req, reply) => {
    const { userId, amount, adminKey } = req.body as {
      userId: string;
      amount: string;
      adminKey: string;
    };
    
    // Admin authentication check
    if (adminKey !== process.env.ADMIN_KEY) {
      return reply.code(403).send({ error: "Unauthorized" });
    }
    
    if (!userId || !amount || parseFloat(amount) <= 0) {
      return reply.code(400).send({ error: "Valid userId and amount required" });
    }
    
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          virtualSolBalance: {
            increment: parseFloat(amount)
          }
        }
      });

      return {
        userId,
        newBalance: user.virtualSolBalance.toString(),
        added: amount
      };
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({ error: "Failed to add funds" });
    }
  });

  // Get wallet transaction history
  app.get("/transactions/:userId", async (req, reply) => {
    const { userId } = req.params as { userId: string };
    const { limit = "50", offset = "0" } = req.query as any;
    
    try {
      // Get trades as transactions
      const trades = await prisma.trade.findMany({
        where: { userId },
        take: parseInt(limit),
        skip: parseInt(offset),
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          side: true,
          quantity: true,
          costUsd: true,
          mint: true,
          createdAt: true
        }
      });
      
      // Format as wallet transactions
      const transactions = trades.map((trade: any) => ({
        id: trade.id,
        type: trade.side === "BUY" ? "DEBIT" : "CREDIT",
        amount: trade.costUsd.toString(),
        currency: "USD",
        description: `${trade.side} ${trade.qty} tokens`,
        mint: trade.mint,
        timestamp: trade.createdAt
      }));
      
      return { transactions };
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({ error: "Failed to fetch transactions" });
    }
  });

  // Get wallet statistics
  app.get("/stats/:userId", async (req, reply) => {
    const { userId } = req.params as { userId: string };
    
    try {
      const [user, tradeStats, positionCount] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: { virtualSolBalance: true, createdAt: true }
        }),
        prisma.trade.aggregate({
          where: { userId },
          _sum: { costUsd: true },
          _count: { id: true }
        }),
        prisma.position.count({
          where: { userId, qty: { gt: 0 } }
        })
      ]);
      
      if (!user) {
        return reply.code(404).send({ error: "User not found" });
      }
      
      return {
        userId,
        balance: user.virtualSolBalance.toString(),
        totalTradeVolume: tradeStats._sum.costUsd?.toString() || "0",
        totalTrades: tradeStats._count.id,
        activePositions: positionCount,
        accountAge: Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)) // days
      };
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({ error: "Failed to fetch wallet stats" });
    }
  });

  // Request withdrawal
  app.post("/withdraw", async (req, reply) => {
    const { userId, amount, toAddress } = req.body as {
      userId: string;
      amount: string;
      toAddress: string;
    };

    // Validation
    if (!userId || !amount || !toAddress) {
      return reply.code(400).send({
        error: "Missing required fields: userId, amount, toAddress"
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return reply.code(400).send({
        error: "Invalid amount. Must be a positive number"
      });
    }

    try {
      const result = await withdrawalService.executeWithdrawal({
        userId,
        amount: amountNum,
        toAddress
      });

      if (!result.success) {
        return reply.code(400).send({
          error: result.error || "Withdrawal failed"
        });
      }

      return {
        success: true,
        withdrawalId: result.withdrawalId,
        txSignature: result.txSignature,
        newBalance: result.newBalance,
        explorerUrl: `https://solscan.io/tx/${result.txSignature}`
      };
    } catch (error: any) {
      app.log.error("Withdrawal failed:", error);
      return reply.code(500).send({
        error: error.message || "Withdrawal processing failed"
      });
    }
  });

  // Get withdrawal history
  app.get("/withdrawals/:userId", async (req, reply) => {
    const { userId } = req.params as { userId: string };
    const { limit = "50", offset = "0" } = req.query as any;

    try {
      const result = await withdrawalService.getWithdrawalHistory(
        userId,
        parseInt(limit),
        parseInt(offset)
      );

      return {
        success: true,
        withdrawals: result.withdrawals.map(w => ({
          ...w,
          explorerUrl: w.txSignature ? `https://solscan.io/tx/${w.txSignature}` : undefined
        })),
        total: result.total,
        hasMore: result.total > parseInt(offset) + parseInt(limit)
      };
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({ error: "Failed to fetch withdrawal history" });
    }
  });

  // ========================================
  // Multi-Wallet Management Endpoints
  // ========================================

  // Get all wallets for a user
  app.get("/list/:userId", async (req, reply) => {
    const { userId } = req.params as { userId: string };

    try {
      const wallets = await walletManagementService.getUserWallets(userId);
      return {
        success: true,
        wallets
      };
    } catch (error: any) {
      app.log.error('Failed to get user wallets:', error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Failed to get wallets'
      });
    }
  });

  // Get active wallet for a user
  app.get("/active/:userId", async (req, reply) => {
    const { userId } = req.params as { userId: string };

    try {
      const wallet = await walletManagementService.getActiveWallet(userId);
      
      if (!wallet) {
        return reply.code(404).send({
          success: false,
          error: 'No active wallet found'
        });
      }

      return {
        success: true,
        wallet: {
          id: wallet.id,
          name: wallet.name,
          walletType: wallet.walletType,
          address: wallet.address,
          balance: wallet.balance.toString(),
          isActive: wallet.isActive
        }
      };
    } catch (error: any) {
      app.log.error('Failed to get active wallet:', error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Failed to get active wallet'
      });
    }
  });

  // Create a new platform wallet
  app.post("/create", async (req, reply) => {
    const { userId, name } = req.body as { userId: string; name: string };

    if (!userId || !name) {
      return reply.code(400).send({
        success: false,
        error: 'Missing required fields: userId, name'
      });
    }

    try {
      const wallet = await walletManagementService.createWallet(userId, name);
      return {
        success: true,
        wallet
      };
    } catch (error: any) {
      app.log.error('Failed to create wallet:', error);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Failed to create wallet'
      });
    }
  });

  // Import an external wallet
  app.post("/import", async (req, reply) => {
    const { userId, name, privateKey } = req.body as {
      userId: string;
      name: string;
      privateKey: number[] | string;
    };

    if (!userId || !name || !privateKey) {
      return reply.code(400).send({
        success: false,
        error: 'Missing required fields: userId, name, privateKey'
      });
    }

    try {
      const wallet = await walletManagementService.importWallet(userId, name, privateKey);
      return {
        success: true,
        wallet
      };
    } catch (error: any) {
      app.log.error('Failed to import wallet:', error);
      return reply.code(400).send({
        success: false,
        error: error.message || 'Failed to import wallet'
      });
    }
  });

  // Set active wallet
  app.post("/set-active/:walletId", async (req, reply) => {
    const { walletId } = req.params as { walletId: string };
    const { userId } = req.body as { userId: string };

    if (!userId) {
      return reply.code(400).send({
        success: false,
        error: 'Missing required field: userId'
      });
    }

    try {
      const result = await walletManagementService.setActiveWallet(userId, walletId);
      return result;
    } catch (error: any) {
      app.log.error('Failed to set active wallet:', error);
      return reply.code(400).send({
        success: false,
        error: error.message || 'Failed to set active wallet'
      });
    }
  });

  // Rename wallet
  app.put("/rename/:walletId", async (req, reply) => {
    const { walletId } = req.params as { walletId: string };
    const { userId, newName } = req.body as { userId: string; newName: string };

    if (!userId || !newName) {
      return reply.code(400).send({
        success: false,
        error: 'Missing required fields: userId, newName'
      });
    }

    try {
      const wallet = await walletManagementService.renameWallet(userId, walletId, newName);
      return {
        success: true,
        wallet
      };
    } catch (error: any) {
      app.log.error('Failed to rename wallet:', error);
      return reply.code(400).send({
        success: false,
        error: error.message || 'Failed to rename wallet'
      });
    }
  });

  // Export wallet private key
  app.post("/export-key/:walletId", async (req, reply) => {
    const { walletId } = req.params as { walletId: string };
    const { userId, confirmExport } = req.body as {
      userId: string;
      confirmExport?: boolean;
    };

    if (!userId) {
      return reply.code(400).send({
        success: false,
        error: 'Missing required field: userId'
      });
    }

    if (!confirmExport) {
      return reply.code(400).send({
        success: false,
        error: 'Export confirmation required',
        requiresConfirmation: true
      });
    }

    try {
      const result = await walletManagementService.exportWalletKey(userId, walletId);
      
      app.log.warn(`🔑 Private key export for wallet ${walletId} by user ${userId}`);

      return {
        success: true,
        ...result,
        warning: 'SECURITY WARNING: Never share this private key with anyone. Anyone with access to this key can control all funds in this wallet.'
      };
    } catch (error: any) {
      app.log.error('Failed to export wallet key:', error);
      return reply.code(400).send({
        success: false,
        error: error.message || 'Failed to export wallet key'
      });
    }
  });

  // Transfer funds between wallets
  app.post("/transfer", async (req, reply) => {
    const { userId, fromWalletId, toWalletId, amount } = req.body as {
      userId: string;
      fromWalletId: string;
      toWalletId: string;
      amount: number | string;
    };

    if (!userId || !fromWalletId || !toWalletId || amount === undefined) {
      return reply.code(400).send({
        success: false,
        error: 'Missing required fields: userId, fromWalletId, toWalletId, amount'
      });
    }

    try {
      const result = await walletManagementService.transferBetweenWallets(
        userId,
        fromWalletId,
        toWalletId,
        amount
      );

      return result;
    } catch (error: any) {
      app.log.error('Failed to transfer funds:', error);
      return reply.code(400).send({
        success: false,
        error: error.message || 'Failed to transfer funds'
      });
    }
  });

  // Delete wallet
  app.delete("/delete/:walletId", async (req, reply) => {
    const { walletId } = req.params as { walletId: string };
    const { userId } = req.body as { userId: string };

    if (!userId) {
      return reply.code(400).send({
        success: false,
        error: 'Missing required field: userId'
      });
    }

    try {
      const result = await walletManagementService.deleteWallet(userId, walletId);
      return result;
    } catch (error: any) {
      app.log.error('Failed to delete wallet:', error);
      return reply.code(400).send({
        success: false,
        error: error.message || 'Failed to delete wallet'
      });
    }
  });
}