// Portfolio service for user positions and PnL calculations
import prisma from "../plugins/prisma.js";
import priceService from "../plugins/priceService.js";
import { getTokenMeta } from "./tokenService.js";
import { Decimal } from "@prisma/client/runtime/library";

export interface PortfolioPosition {
  mint: string;
  qty: string;
  avgCostUsd: string;
  valueUsd: string;
  unrealizedUsd: string;
  unrealizedPercent: string;
  // Enhanced metadata
  tokenSymbol?: string;
  tokenName?: string;
  tokenImage?: string | null;
  website?: string | null;
  twitter?: string | null;
  telegram?: string | null;
}

export interface PortfolioTotals {
  totalValueUsd: string;
  totalUnrealizedUsd: string;
  totalRealizedUsd: string;
  totalPnlUsd: string;
  // Enhanced stats
  winRate: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
}

export interface PortfolioResponse {
  positions: PortfolioPosition[];
  totals: PortfolioTotals;
}

export async function getPortfolio(userId: string): Promise<PortfolioResponse> {
  // Get user's active positions
  const positions = await prisma.position.findMany({
    where: {
      userId,
      qty: { gt: 0 }
    }
  });

  // Get current prices for all tokens
  const mints = positions.map((p: any) => p.mint);
  const prices = await priceService.getPrices(mints);

  // Fetch metadata for all tokens concurrently
  const metadataPromises = mints.map(mint => getTokenMeta(mint));
  const metadataResults = await Promise.allSettled(metadataPromises);

  // Create metadata lookup map
  const metadataMap = new Map();
  mints.forEach((mint, index) => {
    const result = metadataResults[index];
    if (result.status === 'fulfilled' && result.value) {
      metadataMap.set(mint, result.value);
    }
  });

  // Calculate position values and unrealized PnL
  const portfolioPositions: PortfolioPosition[] = [];
  let totalValueUsd = 0;
  let totalUnrealizedUsd = 0;

  for (const position of positions) {
    const currentPrice = prices[position.mint] || 0;
    const qty = parseFloat((position as any).qty.toString());
    const costBasisUsd = parseFloat((position as any).costBasis.toString());
    const metadata = metadataMap.get(position.mint);

    const valueUsd = qty * currentPrice;
    const unrealizedUsd = valueUsd - costBasisUsd;
    const unrealizedPercent = costBasisUsd > 0 ? (unrealizedUsd / costBasisUsd) * 100 : 0;

    portfolioPositions.push({
      mint: position.mint,
      qty: qty.toString(),
      avgCostUsd: (costBasisUsd / qty).toFixed(6),
      valueUsd: valueUsd.toFixed(2),
      unrealizedUsd: unrealizedUsd.toFixed(2),
      unrealizedPercent: unrealizedPercent.toFixed(2),
      // Enhanced metadata
      tokenSymbol: metadata?.symbol || undefined,
      tokenName: metadata?.name || undefined,
      tokenImage: metadata?.logoURI || null,
      website: metadata?.website || null,
      twitter: metadata?.twitter || null,
      telegram: metadata?.telegram || null,
    });

    totalValueUsd += valueUsd;
    totalUnrealizedUsd += unrealizedUsd;
  }

  // Get total realized PnL and trading stats
  const [realizedPnlResult, tradingStats] = await Promise.all([
    prisma.realizedPnL.aggregate({
      where: { userId },
      _sum: { pnl: true }
    }),
    getPortfolioTradingStats(userId)
  ]);

  const totalRealizedUsd = parseFloat(realizedPnlResult._sum?.pnl?.toString() || "0");
  const totalPnlUsd = totalUnrealizedUsd + totalRealizedUsd;

  return {
    positions: portfolioPositions,
    totals: {
      totalValueUsd: totalValueUsd.toFixed(2),
      totalUnrealizedUsd: totalUnrealizedUsd.toFixed(2),
      totalRealizedUsd: totalRealizedUsd.toFixed(2),
      totalPnlUsd: totalPnlUsd.toFixed(2),
      // Enhanced stats
      winRate: tradingStats.winRate.toFixed(2),
      totalTrades: tradingStats.totalTrades,
      winningTrades: tradingStats.winningTrades,
      losingTrades: tradingStats.losingTrades,
    }
  };
}

export async function getPositionHistory(userId: string, mint: string) {
  return await prisma.positionLot.findMany({
    where: { userId, mint },
    orderBy: { createdAt: "desc" }
  });
}

export async function getPortfolioPerformance(userId: string, days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get daily snapshots or calculate from trades
  const trades = await prisma.trade.findMany({
    where: {
      userId,
      createdAt: { gte: startDate }
    },
    orderBy: { createdAt: "asc" }
  });

  // Calculate daily portfolio values
  const dailyValues = [];
  let runningValue = 0;

  for (const trade of trades) {
    const tradeValue = parseFloat(trade.costUsd?.toString() || trade.totalCost?.toString() || "0");
    if (trade.side === "BUY") {
      runningValue += tradeValue;
    } else {
      runningValue -= tradeValue;
    }

    dailyValues.push({
      date: trade.createdAt.toISOString().split('T')[0],
      value: runningValue
    });
  }

  return dailyValues;
}

// New function to calculate trading statistics
export async function getPortfolioTradingStats(userId: string) {
  // Get all realized PnL records for win rate calculation
  const realizedPnlRecords = await prisma.realizedPnL.findMany({
    where: { userId },
    select: { pnl: true }
  });

  const totalTrades = realizedPnlRecords.length;
  const winningTrades = realizedPnlRecords.filter(record => 
    parseFloat(record.pnl.toString()) > 0
  ).length;
  const losingTrades = totalTrades - winningTrades;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

  return {
    totalTrades,
    winningTrades,
    losingTrades,
    winRate
  };
}

// Enhanced function to get portfolio with real-time price updates
export async function getPortfolioWithRealTimePrices(userId: string): Promise<PortfolioResponse> {
  // Use cached prices from Redis for real-time updates
  const portfolio = await getPortfolio(userId);
  
  // Update with the most recent prices if available
  for (const position of portfolio.positions) {
    const latestPrice = await priceService.getPrice(position.mint);
    if (latestPrice && latestPrice > 0) {
      const qty = parseFloat(position.qty);
      const avgCost = parseFloat(position.avgCostUsd);
      const costBasisUsd = qty * avgCost;
      
      const newValueUsd = qty * latestPrice;
      const newUnrealizedUsd = newValueUsd - costBasisUsd;
      const newUnrealizedPercent = costBasisUsd > 0 ? (newUnrealizedUsd / costBasisUsd) * 100 : 0;
      
      position.valueUsd = newValueUsd.toFixed(2);
      position.unrealizedUsd = newUnrealizedUsd.toFixed(2);
      position.unrealizedPercent = newUnrealizedPercent.toFixed(2);
    }
  }
  
  // Recalculate totals
  const totalValueUsd = portfolio.positions.reduce((sum, pos) => 
    sum + parseFloat(pos.valueUsd), 0
  );
  const totalUnrealizedUsd = portfolio.positions.reduce((sum, pos) => 
    sum + parseFloat(pos.unrealizedUsd), 0
  );
  
  portfolio.totals.totalValueUsd = totalValueUsd.toFixed(2);
  portfolio.totals.totalUnrealizedUsd = totalUnrealizedUsd.toFixed(2);
  portfolio.totals.totalPnlUsd = (
    totalUnrealizedUsd + parseFloat(portfolio.totals.totalRealizedUsd)
  ).toFixed(2);
  
  return portfolio;
}