// Wallet tracker service placeholder
import prisma from "../plugins/prisma.js";
import fetch from "node-fetch";

const HELIUS_API = process.env.HELIUS_API!;

// Add a wallet to follow
export async function followWallet(userId: string, address: string, alias?: string) {
  return prisma.walletTrack.create({
    data: { userId, address, alias }
  });
}

// Remove a tracked wallet
export async function unfollowWallet(userId: string, address: string) {
  return prisma.walletTrack.deleteMany({
    where: { userId, address }
  });
}

// List wallets a user is tracking
export async function listTrackedWallets(userId: string) {
  return prisma.walletTrack.findMany({ where: { userId } });
}

  // Fetch recent trades/swaps from a wallet
export async function getWalletTrades(address: string, limit = 10) {
  // Use Helius "transactions" API
  const url = `https://api.helius.xyz/v0/addresses/${address}/transactions?api-key=${HELIUS_API}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Helius wallet tx fetch failed");
  const txs: any = await res.json();

  // Extract swap-like actions
  const swaps = [];
  for (const tx of txs) {
    const events = tx?.events || [];
    for (const e of events) {
      if (e.type === "swap") {
        swaps.push({
          signature: tx.signature,
          timestamp: tx.timestamp,
          inAmount: e.tokenIn?.amount,
          inSymbol: e.tokenIn?.symbol,
          outAmount: e.tokenOut?.amount,
          outSymbol: e.tokenOut?.symbol,
          priceUsd: e.tokenOut?.price ?? null,
        });
      }
    }
  }

  return swaps;
}
