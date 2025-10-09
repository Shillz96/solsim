// Wallet tracker routes for monitoring real wallets
import { FastifyInstance } from "fastify";
import prisma from "../plugins/prisma.js";

export default async function walletTrackerRoutes(app: FastifyInstance) {
  // Track a wallet address
  app.post("/track", async (req, reply) => {
    const { userId, walletAddress, label } = req.body as {
      userId: string;
      walletAddress: string;
      label?: string;
    };
    
    if (!userId || !walletAddress) {
      return reply.code(400).send({ error: "userId and walletAddress required" });
    }
    
    try {
      // Check if already tracking this wallet
      const existing = await prisma.walletTrack.findUnique({
        where: {
          userId_walletAddress: {
            userId,
            walletAddress
          }
        }
      });
      
      if (existing) {
        return reply.code(409).send({ error: "Wallet already being tracked" });
      }
      
      // Add wallet to tracking list
      const trackedWallet = await prisma.walletTrack.create({
        data: {
          userId,
          walletAddress,
          label: label || null,
          isActive: true
        }
      });
      
      return {
        id: trackedWallet.id,
        walletAddress: trackedWallet.walletAddress,
        label: trackedWallet.label,
        message: "Wallet added to tracking list"
      };
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({ error: "Failed to track wallet" });
    }
  });

  // Get user's tracked wallets
  app.get("/user/:userId", async (req, reply) => {
    const { userId } = req.params as { userId: string };
    
    try {
      const trackedWallets = await prisma.walletTrack.findMany({
        where: { userId, isActive: true },
        orderBy: { createdAt: "desc" }
      });
      
      return { trackedWallets };
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({ error: "Failed to fetch tracked wallets" });
    }
  });

  // Untrack a wallet
  app.delete("/:trackingId", async (req, reply) => {
    const { trackingId } = req.params as { trackingId: string };
    
    try {
      await prisma.walletTrack.update({
        where: { id: trackingId },
        data: { isActive: false }
      });
      
      return { message: "Wallet removed from tracking" };
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({ error: "Failed to untrack wallet" });
    }
  });

  // Get wallet activity using Helius API
  app.get("/activity/:walletAddress", async (req, reply) => {
    const { walletAddress } = req.params as { walletAddress: string };
    const { limit = "50" } = req.query as any;
    
    try {
      const heliusUrl = process.env.HELIUS_RPC_URL;
      if (!heliusUrl) {
        return reply.code(500).send({ error: "Helius RPC URL not configured" });
      }
      
      // Call Helius Enhanced Transactions API
      const response = await fetch(`${heliusUrl}/v0/addresses/${walletAddress}/transactions?limit=${limit}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${process.env.HELIUS_API_KEY}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Helius API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Parse transactions to extract swap activities
      const activities = [];
      for (const tx of data) {
        if (tx.type === "SWAP" || tx.description?.includes("swap")) {
          activities.push({
            signature: tx.signature,
            type: tx.type || "SWAP",
            tokenIn: tx.tokenTransfers?.[0]?.mint || null,
            tokenOut: tx.tokenTransfers?.[1]?.mint || null,
            amountIn: tx.tokenTransfers?.[0]?.tokenAmount?.toString() || "0",
            amountOut: tx.tokenTransfers?.[1]?.tokenAmount?.toString() || "0",
            timestamp: new Date(tx.timestamp * 1000).toISOString(),
            program: tx.source || "Unknown",
            fee: tx.fee?.toString() || "0"
          });
        }
      }
      
      return {
        walletAddress,
        activity: activities
      };
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({ error: "Failed to fetch wallet activity" });
    }
  });

  // Copy trade from tracked wallet
  app.post("/copy-trade", async (req, reply) => {
    const { userId, walletAddress, signature, percentage = 100 } = req.body as {
      userId: string;
      walletAddress: string;
      signature: string;
      percentage?: number;
    };
    
    if (!userId || !walletAddress || !signature) {
      return reply.code(400).send({ error: "userId, walletAddress, and signature required" });
    }
    
    try {
      // Get transaction details from Helius
      const heliusUrl = process.env.HELIUS_RPC_URL;
      if (!heliusUrl) {
        return reply.code(500).send({ error: "Helius RPC URL not configured" });
      }
      
      const response = await fetch(`${heliusUrl}/v0/transactions/${signature}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${process.env.HELIUS_API_KEY}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch transaction: ${response.status}`);
      }
      
      const txData = await response.json();
      
      // Extract swap details
      if (txData.type !== "SWAP" || !txData.tokenTransfers || txData.tokenTransfers.length < 2) {
        return reply.code(400).send({ error: "Transaction is not a valid swap" });
      }
      
      const tokenIn = txData.tokenTransfers[0];
      const tokenOut = txData.tokenTransfers[1];
      
      // Calculate proportional amounts
      const originalAmountIn = parseFloat(tokenIn.tokenAmount);
      const proportionalAmount = (originalAmountIn * percentage) / 100;
      
      // Execute the copy trade
      const { fillTrade } = await import("../services/tradeService.js");
      
      const tradeResult = await fillTrade({
        userId,
        mint: tokenOut.mint,
        side: "BUY",
        qty: proportionalAmount.toString()
      });
      
      // Log the copy trade
      await prisma.copyTrade.create({
        data: {
          userId,
          walletAddress,
          mint: tokenOut.mint,
          side: "BUY",
          qty: proportionalAmount,
          priceUsd: priceUsd,
          status: "EXECUTED",
          executedAt: new Date()
        }
      });
      
      return {
        success: true,
        copyTradeId: tradeResult.trade.id,
        originalAmount: originalAmountIn,
        copiedAmount: proportionalAmount,
        percentage,
        token: tokenOut.mint
      };
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({ error: error.message || "Failed to copy trade" });
    }
  });

  // Get tracking statistics
  app.get("/stats/:userId", async (req, reply) => {
    const { userId } = req.params as { userId: string };
    
    try {
      const [totalTracked, activeTracked] = await Promise.all([
        prisma.walletTrack.count({ where: { userId } }),
        prisma.walletTrack.count({ where: { userId, isActive: true } })
      ]);
      
      return {
        userId,
        totalTracked,
        activeTracked,
        inactiveTracked: totalTracked - activeTracked
      };
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({ error: "Failed to fetch tracking stats" });
    }
  });
}