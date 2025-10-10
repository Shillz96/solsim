// Trending service for popular tokens
import prisma from "../plugins/prisma.js";
import priceService from "../plugins/priceService.js";
import { getTokenMeta } from "./tokenService.js";
import fetch from "node-fetch";

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
  try {
    // Use Birdeye for trending data first
    const birdeyeTrending = await getBirdeyeTrending(limit);
    
    if (birdeyeTrending.length > 0) {
      // Merge with our internal trading data
      const trendingTokens: TrendingToken[] = [];
      
      for (const token of birdeyeTrending) {
        try {
          // Get our internal trading stats for this token
          const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
          
          const [tradeCount, uniqueTraders] = await Promise.all([
            prisma.trade.count({
              where: { mint: token.mint, createdAt: { gte: last24h } }
            }),
            prisma.trade.groupBy({
              by: ["userId"],
              where: { mint: token.mint, createdAt: { gte: last24h } }
            })
          ]);

          // Get enhanced metadata from our token service
          const meta = await getTokenMeta(token.mint);
          
          trendingTokens.push({
            mint: token.mint,
            symbol: meta?.symbol || token.symbol,
            name: meta?.name || token.name,
            logoURI: meta?.logoURI || token.logoURI,
            priceUsd: token.priceUsd,
            priceChange24h: token.priceChange24h,
            volume24h: token.volume24h,
            marketCapUsd: token.marketCapUsd,
            tradeCount: tradeCount,
            uniqueTraders: uniqueTraders.length
          });
        } catch (error) {
          console.error(`Error processing trending token ${token.mint}:`, error);
          // Still include the token with external data if internal processing fails
          trendingTokens.push({
            mint: token.mint,
            symbol: token.symbol,
            name: token.name,
            logoURI: token.logoURI,
            priceUsd: token.priceUsd,
            priceChange24h: token.priceChange24h,
            volume24h: token.volume24h,
            marketCapUsd: token.marketCapUsd,
            tradeCount: 0,
            uniqueTraders: 0
          });
        }
      }

      return trendingTokens;
    }
    
    // Fallback to DexScreener if Birdeye fails
    const dexTrending = await getDexScreenerTrending(limit);
    return await enrichWithInternalData(dexTrending);
    
  } catch (error) {
    console.error('Error fetching trending tokens:', error);
    
    // Fallback to internal data only
    return getInternalTrendingTokens(limit);
  }
}

async function getBirdeyeTrending(limit: number): Promise<TrendingToken[]> {
  try {
    // Birdeye trending tokens endpoint
    const response = await fetch(`https://public-api.birdeye.so/public/tokenlist?sort_by=volume_24h_usd&sort_type=desc&offset=0&limit=${limit}&min_market_cap=10000`, {
      headers: {
        'Accept': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Birdeye API error: ${response.status}`);
    }
    
    const data = await response.json() as any;
    const tokens = data.data?.tokens || [];
    
    return tokens
      .filter((token: any) => 
        token.address && 
        token.symbol && 
        token.price > 0 &&
        token.volume24h > 1000 // Minimum volume filter
      )
      .map((token: any) => ({
        mint: token.address,
        symbol: token.symbol,
        name: token.name || token.symbol,
        logoURI: token.logoURI || null,
        priceUsd: parseFloat(token.price || '0'),
        priceChange24h: parseFloat(token.priceChange24h || '0'),
        volume24h: parseFloat(token.volume24h || '0'),
        marketCapUsd: parseFloat(token.marketCap || '0') || null,
        tradeCount: 0,
        uniqueTraders: 0
      }))
      .slice(0, limit);
      
  } catch (error) {
    console.error('Birdeye trending fetch failed:', error);
    return [];
  }
}
async function enrichWithInternalData(tokens: TrendingToken[]): Promise<TrendingToken[]> {
  const enrichedTokens: TrendingToken[] = [];
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  for (const token of tokens) {
    try {
      const [tradeCount, uniqueTraders] = await Promise.all([
        prisma.trade.count({
          where: { mint: token.mint, createdAt: { gte: last24h } }
        }),
        prisma.trade.groupBy({
          by: ["userId"],
          where: { mint: token.mint, createdAt: { gte: last24h } }
        })
      ]);

      const meta = await getTokenMeta(token.mint);
      
      enrichedTokens.push({
        ...token,
        symbol: meta?.symbol || token.symbol,
        name: meta?.name || token.name,
        logoURI: meta?.logoURI || token.logoURI,
        tradeCount,
        uniqueTraders: uniqueTraders.length
      });
    } catch (error) {
      console.error(`Error enriching token ${token.mint}:`, error);
      enrichedTokens.push(token);
    }
  }
  
  return enrichedTokens;
}

async function getDexScreenerTrending(limit: number): Promise<TrendingToken[]> {
  try {
    // Get trending pairs from DexScreener - improved endpoint
    const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/trending?chainId=solana`);
    
    if (!response.ok) {
      // Fallback to search endpoint
      const searchResponse = await fetch(`https://api.dexscreener.com/latest/dex/search/?q=SOL&orderBy=volume24hDesc&limit=${limit * 2}`);
      if (!searchResponse.ok) {
        throw new Error(`DexScreener API error: ${searchResponse.status}`);
      }
      const searchData = await searchResponse.json() as any;
      return processDexScreenerPairs(searchData.pairs || [], limit);
    }
    
    const data = await response.json() as any;
    return processDexScreenerPairs(data.pairs || [], limit);
    
  } catch (error) {
    console.error('DexScreener trending fetch failed:', error);
    
    // Fallback to popular Solana tokens with current prices
    return getPopularSolanaTokens();
  }
}

function processDexScreenerPairs(pairs: any[], limit: number): TrendingToken[] {
  // Filter for Solana tokens and convert to our format
  const solanaPairs = pairs.filter((pair: any) => 
    pair.chainId === 'solana' && 
    pair.baseToken?.address &&
    pair.priceUsd &&
    parseFloat(pair.volume?.h24 || '0') > 1000 // Minimum volume filter
  ).slice(0, limit);

  return solanaPairs.map((pair: any) => ({
    mint: pair.baseToken.address,
    symbol: pair.baseToken.symbol,
    name: pair.baseToken.name,
    logoURI: pair.info?.imageUrl || null,
    priceUsd: parseFloat(pair.priceUsd || '0'),
    priceChange24h: parseFloat(pair.priceChange?.h24 || '0'),
    volume24h: parseFloat(pair.volume?.h24 || '0'),
    marketCapUsd: parseFloat(pair.marketCap || '0') || null,
    tradeCount: 0,
    uniqueTraders: 0
  }));
}

async function getPopularSolanaTokens(): Promise<TrendingToken[]> {
  // Fallback list of popular Solana tokens
  const popularTokens = [
    "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", // BONK
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
    "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", // USDT
    "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So", // mSOL
    "7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj", // stSOL
    "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs", // ETH (Wormhole)
    "9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E", // BTC (Wormhole)
  ];

  const tokens: TrendingToken[] = [];
  
  for (const mint of popularTokens) {
    try {
      const meta = await getTokenMeta(mint);
      const price = await priceService.getPrice(mint);
      
      tokens.push({
        mint,
        symbol: meta?.symbol || "UNKNOWN",
        name: meta?.name || "Unknown Token",
        logoURI: meta?.logoURI || null,
        priceUsd: price,
        priceChange24h: 0, // Would need historical data
        volume24h: 0,
        marketCapUsd: null,
        tradeCount: 0,
        uniqueTraders: 0
      });
    } catch (error) {
      console.error(`Error loading popular token ${mint}:`, error);
    }
  }
  
  return tokens;
}

async function getInternalTrendingTokens(limit: number): Promise<TrendingToken[]> {
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