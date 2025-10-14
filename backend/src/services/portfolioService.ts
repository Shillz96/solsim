// Portfolio service for user positions and PnL calculations
import prisma from "../plugins/prisma.js";
import priceService from "../plugins/priceService.js";
import redis from "../plugins/redis.js";
import { getTokenMeta } from "./tokenService.js";
import { portfolioCoalescer } from "../utils/requestCoalescer.js";
import { Decimal } from "@prisma/client/runtime/library";

// Helper to create Decimal safely
const D = (x: Decimal | number | string) => new Decimal(x);

// Smart number formatting for memecoin prices
function formatPrice(price: Decimal): string {
  const num = price.toNumber();

  // For very small numbers, use scientific notation or high precision
  if (num < 0.000001 && num > 0) {
    return price.toFixed(12); // Show 12 decimals for micro-cap tokens
  } else if (num < 0.01 && num > 0) {
    return price.toFixed(8); // Show 8 decimals for small tokens
  } else if (num < 1) {
    return price.toFixed(6); // Show 6 decimals for sub-dollar tokens
  } else {
    return price.toFixed(2); // Show 2 decimals for regular prices
  }
}

// Format USD value intelligently
function formatUsdValue(value: Decimal): string {
  const num = value.toNumber();

  // For tiny values, show more precision
  if (num < 0.01 && num > 0) {
    return value.toFixed(6);
  } else {
    return value.toFixed(2);
  }
}

export interface PortfolioPosition {
  mint: string;
  qty: string;
  avgCostUsd: string;
  valueUsd: string;
  unrealizedUsd: string;
  unrealizedPercent: string;
  // Memecoin-friendly pricing data
  currentPrice: string; // Current token price (high precision for micro-cap tokens)
  valueSol?: string; // Position value in SOL terms
  marketCapUsd?: string; // Token market cap
  priceChange24h?: string; // 24h price change %
  // Enhanced metadata
  tokenSymbol?: string;
  tokenName?: string;
  tokenImage?: string | null;
  website?: string | null;
  twitter?: string | null;
  telegram?: string | null;
}

// Internal calculation interface using Decimal for precision
interface PositionCalculation {
  qty: Decimal;
  costBasis: Decimal;
  currentPrice: Decimal;
  valueUsd: Decimal;
  unrealizedUsd: Decimal;
  unrealizedPercent: Decimal;
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
  // Use request coalescing to prevent duplicate concurrent requests
  // If 100 users request portfolio at same time, only 1 DB query is made
  return portfolioCoalescer.coalesce(
    `portfolio:${userId}`,
    async () => {
      // Get user's active positions
      const positions = await prisma.position.findMany({
        where: {
          userId,
          qty: { gt: 0 }
        }
      });

      return await calculatePortfolioData(userId, positions);
    },
    5000 // 5 second TTL - balance between freshness and deduplication
  );
}

async function calculatePortfolioData(userId: string, positions: any[]): Promise<PortfolioResponse> {

  // Get current prices and market data for all tokens
  const mints = positions.map((p: any) => p.mint);
  const prices = await priceService.getPrices(mints);

  // Get full price ticks for market cap and other data (batch operation - much faster!)
  const priceTickMap = await priceService.getLastTicks(mints);

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

  // Get SOL price once for all calculations
  const solPrice = priceService.getSolPrice();

  // Calculate position values and unrealized PnL using Decimal for precision
  const portfolioPositions: PortfolioPosition[] = [];
  let totalValueUsd = D(0);
  let totalUnrealizedUsd = D(0);

  for (const position of positions) {
    const currentPrice = D(prices[position.mint] || 0);
    const qty = position.qty as Decimal;
    const costBasis = position.costBasis as Decimal;
    const metadata = metadataMap.get(position.mint);
    const priceTick = priceTickMap.get(position.mint);

    // DEBUG: Log the calculation values
    console.log(`[PORTFOLIO DEBUG] ${position.mint}:`, {
      qty: qty.toString(),
      costBasis: costBasis.toString(),
      currentPrice: currentPrice.toString(),
      priceFromService: prices[position.mint]
    });

    // Use Decimal for all calculations to prevent precision loss
    const valueUsd = qty.mul(currentPrice);
    const unrealizedUsd = valueUsd.sub(costBasis);
    const unrealizedPercent = costBasis.gt(0)
      ? unrealizedUsd.div(costBasis).mul(100)
      : D(0);

    // Calculate average cost per token
    const avgCostUsd = qty.gt(0) ? costBasis.div(qty) : D(0);

    // Calculate value in SOL terms
    const valueSol = solPrice > 0 ? valueUsd.div(solPrice) : D(0);

    portfolioPositions.push({
      mint: position.mint,
      qty: qty.toString(), // Use full precision, let frontend handle formatting
      avgCostUsd: formatPrice(avgCostUsd), // Smart formatting for avg cost
      valueUsd: formatUsdValue(valueUsd), // Smart formatting for position value
      unrealizedUsd: unrealizedUsd.toFixed(2), // 2 decimals for PnL
      unrealizedPercent: unrealizedPercent.toFixed(2), // 2 decimals for percentage
      // Memecoin-friendly pricing data
      currentPrice: formatPrice(currentPrice), // High precision for micro-cap tokens
      valueSol: valueSol.toFixed(4), // SOL value with 4 decimals
      marketCapUsd: priceTick?.marketCapUsd ? D(priceTick.marketCapUsd).toFixed(0) : undefined, // Whole number market cap
      priceChange24h: priceTick?.change24h?.toString(),
      // Enhanced metadata
      tokenSymbol: metadata?.symbol || undefined,
      tokenName: metadata?.name || undefined,
      tokenImage: metadata?.logoURI || null,
      website: metadata?.website || null,
      twitter: metadata?.twitter || null,
      telegram: metadata?.telegram || null,
    });

    totalValueUsd = totalValueUsd.add(valueUsd);
    totalUnrealizedUsd = totalUnrealizedUsd.add(unrealizedUsd);
  }

  // Get total realized PnL and trading stats
  const [realizedPnlResult, tradingStats] = await Promise.all([
    prisma.realizedPnL.aggregate({
      where: { userId },
      _sum: { pnl: true }
    }),
    getPortfolioTradingStats(userId)
  ]);

  const totalRealizedUsd = D(realizedPnlResult._sum?.pnl?.toString() || "0");
  const totalPnlUsd = totalUnrealizedUsd.add(totalRealizedUsd);

  return {
    positions: portfolioPositions,
    totals: {
      totalValueUsd: totalValueUsd.toFixed(2), // 2 decimals for USD
      totalUnrealizedUsd: totalUnrealizedUsd.toFixed(2), // 2 decimals for USD
      totalRealizedUsd: totalRealizedUsd.toFixed(2), // 2 decimals for USD
      totalPnlUsd: totalPnlUsd.toFixed(2), // 2 decimals for USD
      // Enhanced stats
      winRate: tradingStats.winRate.toFixed(2), // 2 decimals for percentage
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

  // Calculate daily portfolio values using Decimal
  const dailyValues = [];
  let runningValue = D(0);

  for (const trade of trades) {
    const tradeValue = D(trade.costUsd?.toString() || trade.totalCost?.toString() || "0");
    if (trade.side === "BUY") {
      runningValue = runningValue.add(tradeValue);
    } else {
      runningValue = runningValue.sub(tradeValue);
    }

    dailyValues.push({
      date: trade.createdAt.toISOString().split('T')[0],
      value: runningValue.toFixed(2) // 2 decimals for USD display
    });
  }

  return dailyValues;
}

// New function to calculate trading statistics (with 60s Redis cache)
export async function getPortfolioTradingStats(userId: string) {
  // Try Redis cache first
  const cacheKey = `portfolio:stats:${userId}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn(`Redis cache miss for trading stats ${userId}:`, error);
  }

  // Get all realized PnL records for win rate calculation
  const realizedPnlRecords = await prisma.realizedPnL.findMany({
    where: { userId },
    select: { pnl: true }
  });

  const totalTrades = realizedPnlRecords.length;
  const winningTrades = realizedPnlRecords.filter(record => {
    const pnl = record.pnl as Decimal;
    return pnl.gt(0);
  }).length;
  const losingTrades = totalTrades - winningTrades;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

  const stats = {
    totalTrades,
    winningTrades,
    losingTrades,
    winRate
  };

  // Cache in Redis for 60 seconds
  try {
    await redis.setex(cacheKey, 60, JSON.stringify(stats));
  } catch (error) {
    console.warn(`Failed to cache trading stats in Redis:`, error);
  }

  return stats;
}

// Enhanced function to get portfolio with real-time price updates
export async function getPortfolioWithRealTimePrices(userId: string): Promise<PortfolioResponse> {
  // Use cached prices from Redis for real-time updates
  const portfolio = await getPortfolio(userId);

  // Update with the most recent prices if available using Decimal for precision
  for (const position of portfolio.positions) {
    const latestPrice = await priceService.getPrice(position.mint);
    if (latestPrice && latestPrice > 0) {
      const qty = D(position.qty);
      const avgCost = D(position.avgCostUsd);
      const costBasis = qty.mul(avgCost);
      const currentPrice = D(latestPrice);

      const newValueUsd = qty.mul(currentPrice);
      const newUnrealizedUsd = newValueUsd.sub(costBasis);
      const newUnrealizedPercent = costBasis.gt(0)
        ? newUnrealizedUsd.div(costBasis).mul(100)
        : D(0);

      position.valueUsd = newValueUsd.toFixed(2); // 2 decimals for USD
      position.unrealizedUsd = newUnrealizedUsd.toFixed(2); // 2 decimals for USD
      position.unrealizedPercent = newUnrealizedPercent.toFixed(2); // 2 decimals for percentage
    }
  }

  // Recalculate totals using Decimal
  const totalValueUsd = portfolio.positions.reduce((sum, pos) =>
    sum.add(D(pos.valueUsd)), D(0)
  );
  const totalUnrealizedUsd = portfolio.positions.reduce((sum, pos) =>
    sum.add(D(pos.unrealizedUsd)), D(0)
  );

  portfolio.totals.totalValueUsd = totalValueUsd.toFixed(2); // 2 decimals for USD
  portfolio.totals.totalUnrealizedUsd = totalUnrealizedUsd.toFixed(2); // 2 decimals for USD
  portfolio.totals.totalPnlUsd = totalUnrealizedUsd.add(D(portfolio.totals.totalRealizedUsd)).toFixed(2); // 2 decimals for USD

  return portfolio;
}