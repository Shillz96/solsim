// Portfolio service for user positions and PnL calculations
import prisma from "../plugins/prisma.js";
import priceService from "../plugins/priceService.js";
import { Decimal } from "@prisma/client/runtime/library";

export interface PortfolioPosition {
  mint: string;
  qty: string;
  avgCostUsd: string;
  valueUsd: string;
  unrealizedUsd: string;
  unrealizedPercent: string;
}

export interface PortfolioTotals {
  totalValueUsd: string;
  totalUnrealizedUsd: string;
  totalRealizedUsd: string;
  totalPnlUsd: string;
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

  // Calculate position values and unrealized PnL
  const portfolioPositions: PortfolioPosition[] = [];
  let totalValueUsd = 0;
  let totalUnrealizedUsd = 0;

  for (const position of positions) {
    const currentPrice = prices[position.mint] || 0;
    const qty = parseFloat((position as any).qty.toString());
    const costBasisUsd = parseFloat((position as any).costBasis.toString());

    const valueUsd = qty * currentPrice;
    const unrealizedUsd = valueUsd - costBasisUsd;
    const unrealizedPercent = costBasisUsd > 0 ? (unrealizedUsd / costBasisUsd) * 100 : 0;

    portfolioPositions.push({
      mint: position.mint,
      qty: qty.toString(),
      avgCostUsd: (costBasisUsd / qty).toFixed(6),
      valueUsd: valueUsd.toFixed(2),
      unrealizedUsd: unrealizedUsd.toFixed(2),
      unrealizedPercent: unrealizedPercent.toFixed(2)
    });

    totalValueUsd += valueUsd;
    totalUnrealizedUsd += unrealizedUsd;
  }

  // Get total realized PnL
  const realizedPnl = await prisma.realizedPnL.aggregate({
    where: { userId },
    _sum: { pnl: true }
  });

  const totalRealizedUsd = parseFloat(realizedPnl._sum?.pnl?.toString() || "0");
  const totalPnlUsd = totalUnrealizedUsd + totalRealizedUsd;

  return {
    positions: portfolioPositions,
    totals: {
      totalValueUsd: totalValueUsd.toFixed(2),
      totalUnrealizedUsd: totalUnrealizedUsd.toFixed(2),
      totalRealizedUsd: totalRealizedUsd.toFixed(2),
      totalPnlUsd: totalPnlUsd.toFixed(2)
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