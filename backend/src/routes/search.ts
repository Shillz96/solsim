// Search routes for token discovery
import { FastifyInstance } from "fastify";
import { getTokenMeta, getTokenInfo } from "../services/tokenService.js";
import { robustFetch } from "../utils/fetch.js";

const DEX = process.env.DEXSCREENER_BASE || "https://api.dexscreener.com";
const BIRDEYE = process.env.BIRDEYE_BASE || "https://public-api.birdeye.so";

export default async function searchRoutes(app: FastifyInstance) {
  // Get token details by mint address with price data
  app.get("/token/:mint", async (req, reply) => {
    const { mint } = req.params as { mint: string };
    
    if (!mint) {
      return reply.code(400).send({ error: "mint required" });
    }
    
    try {
      const tokenInfo = await getTokenInfo(mint);
      
      if (!tokenInfo) {
        return reply.code(404).send({ error: "Token not found" });
      }
      
      return {
        mint: tokenInfo.address,
        address: tokenInfo.address, // For compatibility
        symbol: tokenInfo.symbol,
        name: tokenInfo.name,
        logoURI: tokenInfo.logoURI,
        imageUrl: tokenInfo.logoURI, // For compatibility
        website: tokenInfo.website,
        twitter: tokenInfo.twitter,
        telegram: tokenInfo.telegram,
        lastPrice: tokenInfo.lastPrice,
        lastTs: tokenInfo.lastTs,
        volume24h: tokenInfo.volume24h,
        priceChange24h: tokenInfo.priceChange24h,
        marketCapUsd: tokenInfo.marketCapUsd,
        lastUpdated: tokenInfo.lastUpdated
      };
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({ error: error.message || "Failed to fetch token details" });
    }
  });

  // Search tokens by symbol/name
  app.get("/tokens", async (req, reply) => {
    const { q, limit = "20" } = req.query as any;
    
    if (!q || q.length < 2) {
      return reply.code(400).send({ error: "Query must be at least 2 characters" });
    }
    
    try {
      const results = await searchTokens(q, parseInt(limit));
      return { query: q, results };
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({ error: error.message || "Search failed" });
    }
  });
}

async function searchTokens(query: string, limit: number = 20) {
  const results: any[] = [];
  
  // Search Dexscreener
  try {
    const res = await robustFetch(`${DEX}/latest/dex/search/?q=${encodeURIComponent(query)}`, {
      timeout: 10000,
      retries: 2,
      retryDelay: 1000
    });
    if (res.ok) {
      const data = await res.json() as any;
      const pairs = data.pairs || [];

      for (const pair of pairs.slice(0, limit)) {
        if (pair.chainId === "solana" && pair.baseToken) {
          results.push({
            mint: pair.baseToken.address,
            symbol: pair.baseToken.symbol,
            name: pair.baseToken.name,
            logoURI: pair.info?.imageUrl || null,
            priceUsd: parseFloat(pair.priceUsd || "0"),
            marketCapUsd: pair.marketCap || pair.fdv || null,
            liquidity: pair.liquidity?.usd || null,
            volume24h: pair.volume?.h24 || null,
            priceChange24h: pair.priceChange?.h24 || null,
            source: "dexscreener"
          });
        }
      }
    }
  } catch (error: any) {
    console.warn(`DexScreener search failed (${error.code || error.message}):`, error.message);
  }
  
  // Search Birdeye (if API key available)
  if (process.env.BIRDEYE_API_KEY) {
    try {
      const res = await robustFetch(`${BIRDEYE}/defi/search?keyword=${encodeURIComponent(query)}&chain=solana`, {
        headers: { "X-API-KEY": process.env.BIRDEYE_API_KEY },
        timeout: 10000,
        retries: 2,
        retryDelay: 1000
      });

      if (res.ok) {
        const data = await res.json() as any;
        const tokens = data.data || [];

        for (const token of tokens.slice(0, limit)) {
          // Avoid duplicates
          if (!results.find(r => r.mint === token.address)) {
            results.push({
              mint: token.address,
              symbol: token.symbol,
              name: token.name,
              logoURI: token.logoURI || null,
              priceUsd: parseFloat(token.price || "0"),
              marketCapUsd: token.marketCap || null,
              liquidity: token.liquidity || null,
              volume24h: token.volume24h || null,
              priceChange24h: token.priceChange24h || null,
              source: "birdeye"
            });
          }
        }
      }
    } catch (error: any) {
      console.warn(`Birdeye search failed (${error.code || error.message}):`, error.message);
    }
  }
  
  // Sort by relevance (exact matches first, then by market cap)
  return results
    .sort((a, b) => {
      const aExact = a.symbol?.toLowerCase() === query.toLowerCase() ? 1 : 0;
      const bExact = b.symbol?.toLowerCase() === query.toLowerCase() ? 1 : 0;
      
      if (aExact !== bExact) return bExact - aExact;
      
      const aMcap = a.marketCapUsd || 0;
      const bMcap = b.marketCapUsd || 0;
      return bMcap - aMcap;
    })
    .slice(0, limit);
}
