// Portfolio service for user positions and PnL calculations
import prisma from "../plugins/prisma.js";
import priceService from "../plugins/priceService-optimized.js";
import redis from "../plugins/redis.js";
import { getTokenMetaBatch } from "./tokenService.js";
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

export async function getPortfolio(userId: string, tradeMode: 'PAPER' | 'REAL' = 'PAPER'): Promise<PortfolioResponse> {
  // Use request coalescing to prevent duplicate concurrent requests
  // If 100 users request portfolio at same time, only 1 DB query is made
  return portfolioCoalescer.coalesce(
    `portfolio:${userId}:${tradeMode}`,
    async () => {
      // Get user's positions (including closed positions with trade history)
      const positions = await prisma.position.findMany({
        where: {
          userId,
          tradeMode
        }
      });

      return await calculatePortfolioData(userId, positions, tradeMode);
    },
    5000 // 5 second TTL - reduced for near real-time updates with stale-while-revalidate price caching
  );
}

async function calculatePortfolioData(userId: string, positions: any[], tradeMode: 'PAPER' | 'REAL' = 'PAPER'): Promise<PortfolioResponse> {

  // Get current prices and market data for all tokens
  const mints = positions.map((p: any) => p.mint);
  const prices = await priceService.getPrices(mints);

  // Get full price ticks for market cap and other data (batch operation - much faster!)
  const priceTickMap = await priceService.getLastTicks(mints);

  // Fetch metadata for all tokens using batch API (1 call instead of N calls!)
  const metadataResults = await getTokenMetaBatch(mints).catch(err => {
    console.warn(`Batch metadata fetch failed in portfolio:`, err);
    return [];
  });

  // Create metadata lookup map
  const metadataMap = new Map();
  metadataResults.forEach(token => {
    if (token?.address) {
      metadataMap.set(token.address, token);
    }
  });

  // Get SOL price once for all calculations
  const solPrice = priceService.getSolPrice();

  // Calculate position values and unrealized PnL using Decimal for precision
  const portfolioPositions: PortfolioPosition[] = [];
  let totalValueUsd = D(0);
  let totalUnrealizedUsd = D(0);

  for (const position of positions) {
    let currentPrice = D(prices[position.mint] || 0);

    // If price is missing from batch fetch, try individual fetch with retries
    // This is critical for new tokens that may not be in the batch cache yet
    if (currentPrice.eq(0)) {
      // Silent retry - don't log to reduce noise (price service handles logging)
      try {
        const individualPrice = await priceService.getPrice(position.mint);
        if (individualPrice && individualPrice > 0) {
          currentPrice = D(individualPrice);
        }
        // If still 0, it's cached in negative cache - no need to log
      } catch (err) {
        // Only log unexpected errors
        const error = err as Error;
        if (!error.message?.includes('aborted') && !error.message?.includes('404')) {
          console.error(`[Portfolio] Unexpected error fetching price for ${position.mint.slice(0, 8)}:`, error);
        }
      }
    }

    const qty = position.qty as Decimal;
    const costBasis = position.costBasis as Decimal;
    const metadata = metadataMap.get(position.mint);
    const priceTick = priceTickMap.get(position.mint);

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

  // Get total realized PnL and trading stats in a single batch
  // OPTIMIZATION: Fetch realized PnL records once and calculate both aggregate and stats
  const realizedPnlRecords = await prisma.realizedPnL.findMany({
    where: { userId, tradeMode },
    select: { pnl: true }
  });

  // Calculate total realized PnL
  const totalRealizedPnl = realizedPnlRecords.reduce((sum, record) => {
    const pnl = record.pnl as Decimal;
    return sum.add(pnl);
  }, D(0));

  // Calculate trading stats from the same data (no extra query needed)
  const totalTrades = realizedPnlRecords.length;
  const winningTrades = realizedPnlRecords.filter(record => {
    const pnl = record.pnl as Decimal;
    return pnl.gt(0);
  }).length;
  const losingTrades = totalTrades - winningTrades;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

  const tradingStats = {
    totalTrades,
    winningTrades,
    losingTrades,
    winRate
  };

  // Cache trading stats in Redis for 60 seconds (since we just calculated it)
  try {
    const cacheKey = `portfolio:stats:${userId}:${tradeMode}`;
    await redis.setex(cacheKey, 60, JSON.stringify(tradingStats));
  } catch (error) {
    console.warn(`Failed to cache trading stats in Redis:`, error);
  }

  const totalRealizedUsd = totalRealizedPnl;
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

export async function getPortfolioPerformance(userId: string, days: number = 30, tradeMode: 'PAPER' | 'REAL' = 'PAPER') {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get user's trade history to reconstruct daily portfolio values
  const trades = await prisma.trade.findMany({
    where: {
      userId,
      tradeMode,
      createdAt: { gte: startDate }
    },
    orderBy: { createdAt: "asc" }
  });

  if (trades.length === 0) {
    return [];
  }

  // Get current portfolio
  const currentPortfolio = await getPortfolio(userId, tradeMode);

  // Group trades by day and calculate portfolio value at end of each day
  const dailyMap = new Map<string, Decimal>();

  // Build a timeline of portfolio cost basis changes
  for (const trade of trades) {
    const dateKey = trade.createdAt.toISOString().split('T')[0];
    const tradeValue = D(trade.costUsd?.toString() || trade.totalCost?.toString() || "0");

    const currentValue = dailyMap.get(dateKey) || D(0);
    if (trade.side === "BUY") {
      dailyMap.set(dateKey, currentValue.add(tradeValue));
    } else {
      // For sells, subtract the cost basis (not the sale proceeds)
      dailyMap.set(dateKey, currentValue.sub(tradeValue));
    }
  }

  // Convert to array and sort by date
  const dailyValues = Array.from(dailyMap.entries())
    .map(([date, value]) => ({
      date,
      value: value.toFixed(2)
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Add today's value using current portfolio
  const today = new Date().toISOString().split('T')[0];
  if (dailyValues.length === 0 || dailyValues[dailyValues.length - 1].date !== today) {
    dailyValues.push({
      date: today,
      value: currentPortfolio.totals.totalValueUsd
    });
  }

  return dailyValues;
}

// New function to calculate trading statistics (with 60s Redis cache)
export async function getPortfolioTradingStats(userId: string, tradeMode: 'PAPER' | 'REAL' = 'PAPER') {
  // Try Redis cache first
  const cacheKey = `portfolio:stats:${userId}:${tradeMode}`;
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
    where: { userId, tradeMode },
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
export async function getPortfolioWithRealTimePrices(userId: string, tradeMode: 'PAPER' | 'REAL' = 'PAPER'): Promise<PortfolioResponse> {
  // Use cached prices from Redis for real-time updates
  const portfolio = await getPortfolio(userId, tradeMode);

  // Batch fetch all latest prices at once (OPTIMIZED: no more N+1 queries!)
  const mints = portfolio.positions.map(p => p.mint);
  const latestPrices = await priceService.getPrices(mints);

  // Update with the most recent prices if available using Decimal for precision
  for (const position of portfolio.positions) {
    const latestPrice = latestPrices[position.mint];
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

// Get token-specific trading statistics (total bought/sold/PnL for a specific token)
export async function getTokenTradingStats(
  userId: string,
  mint: string,
  tradeMode: 'PAPER' | 'REAL' = 'PAPER'
) {
  // Try Redis cache first (30s TTL for token stats)
  const cacheKey = `token:stats:${userId}:${mint}:${tradeMode}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn(`Redis cache miss for token stats ${userId}:${mint}:`, error);
  }

  // Get all trades for this token
  const trades = await prisma.trade.findMany({
    where: {
      userId,
      mint,
      tradeMode
    },
    select: {
      side: true,
      costUsd: true,
      proceedsUsd: true,
      totalCost: true,
      realizedPnL: true,
      feesSol: true,
      solUsdAtFill: true
    },
    orderBy: { createdAt: 'asc' }
  });

  let totalBoughtUsd = D(0);
  let totalSoldUsd = D(0);
  let totalRealizedPnL = D(0);
  let totalFeesSol = D(0);
  let totalFeesUsd = D(0);

  for (const trade of trades) {
    const feesSol = trade.feesSol ? D(trade.feesSol) : D(0);
    const solUsdAtFill = trade.solUsdAtFill ? D(trade.solUsdAtFill) : D(0);

    totalFeesSol = totalFeesSol.add(feesSol);
    if (solUsdAtFill.gt(0)) {
      totalFeesUsd = totalFeesUsd.add(feesSol.mul(solUsdAtFill));
    }

    if (trade.side === 'BUY') {
      // For buys, use costUsd if available, otherwise calculate from totalCost (SOL) * solUsdAtFill
      const costUsd = trade.costUsd
        ? D(trade.costUsd)
        : (trade.totalCost && solUsdAtFill.gt(0)
            ? D(trade.totalCost).mul(solUsdAtFill)
            : D(0));
      totalBoughtUsd = totalBoughtUsd.add(costUsd);
    } else if (trade.side === 'SELL') {
      // For sells, use proceedsUsd if available, otherwise calculate from totalCost * solUsdAtFill
      const proceedsUsd = trade.proceedsUsd
        ? D(trade.proceedsUsd)
        : (trade.totalCost && solUsdAtFill.gt(0)
            ? D(trade.totalCost).mul(solUsdAtFill)
            : D(0));
      totalSoldUsd = totalSoldUsd.add(proceedsUsd);

      // Add realized PnL
      if (trade.realizedPnL) {
        totalRealizedPnL = totalRealizedPnL.add(D(trade.realizedPnL));
      }
    }
  }

  // Get current position for unrealized PnL
  const position = await prisma.position.findUnique({
    where: {
      userId_mint_tradeMode: {
        userId,
        mint,
        tradeMode
      }
    },
    select: {
      qty: true,
      costBasis: true
    }
  });

  let currentHoldingValue = D(0);
  let unrealizedPnL = D(0);

  if (position && D(position.qty).gt(0)) {
    // Get current price
    const priceTick = await priceService.getLastTick(mint);
    if (priceTick && priceTick.priceUsd) {
      const qty = D(position.qty);
      const costBasis = D(position.costBasis);
      const currentPrice = D(priceTick.priceUsd);
      currentHoldingValue = qty.mul(currentPrice);
      unrealizedPnL = currentHoldingValue.sub(costBasis);
    }
  }

  const result = {
    mint,
    totalBoughtUsd: totalBoughtUsd.toFixed(2),
    totalSoldUsd: totalSoldUsd.toFixed(2),
    currentHoldingValue: currentHoldingValue.toFixed(2),
    currentHoldingQty: position && D(position.qty).gt(0) ? D(position.qty).toFixed(9) : '0',
    costBasis: position && D(position.qty).gt(0) ? D(position.costBasis).toFixed(2) : '0',
    realizedPnL: totalRealizedPnL.toFixed(2),
    unrealizedPnL: unrealizedPnL.toFixed(2),
    totalPnL: totalRealizedPnL.add(unrealizedPnL).toFixed(2),
    totalFeesSol: totalFeesSol.toFixed(6),
    totalFeesUsd: totalFeesUsd.toFixed(2),
    tradeCount: trades.length
  };

  // Cache for 30 seconds
  try {
    await redis.setex(cacheKey, 30, JSON.stringify(result));
  } catch (error) {
    console.warn(`Failed to cache token stats for ${userId}:${mint}:`, error);
  }

  return result;
}