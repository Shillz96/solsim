// Trending service for popular tokens
import prisma from "../plugins/prisma.js";
import priceService from "../plugins/priceService.js";
import { getTokenMeta } from "./tokenService.js";

export interface TrendingToken {
  mint: string;
  symbol: string | null;
  name: string | null;
  logoURI: string | null;
  priceUsd: number;
  priceChange24h: number;
  volume24h: number;
  marketCapUsd: number | null;
  tradeCount: number;
  uniqueTraders: number;
}

export async function getTrendingTokens(limit: number = 20): Promise<TrendingToken[]> {
  // Get tokens with most trading activity in last 24 hours
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const trendingData = await prisma.trade.groupBy({
    by: ["mint"],
    where: {
      createdAt: { gte: last24h }
    },
    _count: {
      id: true,
      userId: true
    },
    _sum: {
      costUsd: true
    },
    orderBy: {
      _count: {
        id: "desc"
      }
    },
    take: limit
  });

  // Get current prices and metadata for trending tokens
  const trendingTokens: TrendingToken[] = [];
  
  for (const data of trendingData) {
    try {
      // Get current price
      const currentPrice = await priceService.getPrice(data.mint);
      
      // Get price 24h ago (simplified - would use historical data)
      const price24hAgo = currentPrice * (0.95 + Math.random() * 0.1); // Mock 24h price
      const priceChange24h = ((currentPrice - price24hAgo) / price24hAgo) * 100;
      
      // Get token metadata
      const meta = await getTokenMeta(data.mint);
      
      // Get unique traders count
      const uniqueTraders = await prisma.trade.groupBy({
        by: ["userId"],
        where: {
          mint: data.mint,
          createdAt: { gte: last24h }
        }
      });

      trendingTokens.push({
        mint: data.mint,
        symbol: meta?.symbol || null,
        name: meta?.name || null,
        logoURI: meta?.logoURI || null,
        priceUsd: currentPrice,
        priceChange24h: parseFloat(priceChange24h.toFixed(2)),
        volume24h: parseFloat(data._sum.costUsd?.toString() || "0"),
        marketCapUsd: null, // Calculate from supply * price
        tradeCount: data._count.id,
        uniqueTraders: uniqueTraders.length
      });
    } catch (error) {
      console.error(`Error processing trending token ${data.mint}:`, error);
    }
  }

  return trendingTokens.sort((a, b) => b.volume24h - a.volume24h);
}

export async function getTokenTrendingScore(mint: string): Promise<number> {
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const [tradeCount, uniqueTraders, volume] = await Promise.all([
    prisma.trade.count({
      where: { mint, createdAt: { gte: last24h } }
    }),
    prisma.trade.groupBy({
      by: ["userId"],
      where: { mint, createdAt: { gte: last24h } }
    }),
    prisma.trade.aggregate({
      where: { mint, createdAt: { gte: last24h } },
      _sum: { costUsd: true }
    })
  ]);

  const volumeUsd = parseFloat(volume._sum.costUsd?.toString() || "0");
  
  // Calculate trending score based on multiple factors
  let score = 0;
  score += tradeCount * 1; // 1 point per trade
  score += uniqueTraders.length * 5; // 5 points per unique trader
  score += Math.log10(volumeUsd + 1) * 10; // Volume bonus (logarithmic)
  
  return Math.round(score);
}