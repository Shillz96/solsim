// Search routes for token discovery
import { FastifyInstance } from "fastify";
import { getTokenMeta, getTokenInfo } from "../services/tokenService.js";
import { robustFetch } from "../utils/fetch.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEX = process.env.DEXSCREENER_BASE || "https://api.dexscreener.com";
const BIRDEYE = process.env.BIRDEYE_BASE || "https://public-api.birdeye.so";

export default async function searchRoutes(app: FastifyInstance) {
  // Test endpoint for Helius holder count service
  app.get("/test/holders/:mint", async (req, reply) => {
    const { mint } = req.params as { mint: string };
    
    if (!mint) {
      return reply.code(400).send({ error: "mint required" });
    }
    
    try {
      // Check if HELIUS_API is configured
      const heliusApiKey = process.env.HELIUS_API;
      if (!heliusApiKey) {
        return reply.code(500).send({ 
          error: "HELIUS_API environment variable not configured",
          mint,
          timestamp: new Date().toISOString()
        });
      }

      const { holderCountService } = await import("../services/holderCountService.js");
      
      const startTime = Date.now();
      const holderCount = await holderCountService.getHolderCount(mint);
      const duration = Date.now() - startTime;
      
      return reply.send({
        mint,
        holderCount,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
        source: "Helius RPC getProgramAccounts",
        heliusConfigured: !!heliusApiKey,
        heliusKeyPrefix: heliusApiKey.substring(0, 8) + '...'
      });
    } catch (error: any) {
      console.error("[Test] Holder count error:", error);
      return reply.code(500).send({ 
        error: error.message,
        stack: error.stack?.split('\n').slice(0, 3).join('\n'),
        details: "Check HELIUS_API environment variable is set",
        mint,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Manual holder count update endpoint (for immediate updates)
  app.post("/update-holder-count/:mint", async (req, reply) => {
    const { mint } = req.params as { mint: string };
    
    if (!mint) {
      return reply.code(400).send({ error: "mint required" });
    }
    
    try {
      const { holderCountService } = await import("../services/holderCountService.js");
      
      // Fetch fresh holder count
      const holderCount = await holderCountService.getHolderCount(mint);
      
      if (holderCount === null) {
        return reply.code(404).send({ 
          error: "Unable to fetch holder count",
          mint 
        });
      }
      
      // Update TokenDiscovery table
      const updated = await prisma.tokenDiscovery.update({
        where: { mint },
        data: { 
          holderCount,
          lastUpdatedAt: new Date()
        }
      });
      
      return reply.send({
        success: true,
        mint,
        holderCount,
        previousCount: updated.holderCount,
        updated: true,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error("[Update] Holder count error:", error);
      
      // If token doesn't exist in TokenDiscovery, provide helpful message
      if (error.code === 'P2025') {
        return reply.code(404).send({ 
          error: "Token not found in TokenDiscovery table",
          mint,
          suggestion: "Token may not be tracked yet. Worker will add it on next discovery cycle."
        });
      }
      
      return reply.code(500).send({ 
        error: error.message,
        mint
      });
    }
  });

  // Get token details by mint address with price data
  app.get("/token/:mint", async (req, reply) => {
    const { mint } = req.params as { mint: string };
    
    if (!mint) {
      return reply.code(400).send({ error: "mint required" });
    }
    
    try {
      let tokenInfo = await getTokenInfo(mint);
      
      // Always check TokenDiscovery for newer/better data (especially holderCount)
      const warpPipesToken = await prisma.tokenDiscovery.findUnique({
        where: { mint },
      });

      // If found in TokenDiscovery, use it (or merge with Token table data)
      if (warpPipesToken) {
        // If we have data from both tables, merge them (TokenDiscovery takes precedence for holder count)
        if (tokenInfo) {
          tokenInfo = {
            ...tokenInfo,
            // Override with TokenDiscovery data (especially holderCount)
            holderCount: warpPipesToken.holderCount !== null && warpPipesToken.holderCount !== undefined 
              ? warpPipesToken.holderCount 
              : tokenInfo.holderCount,
            volume24h: warpPipesToken.volume24h ? parseFloat(warpPipesToken.volume24h.toString()) : tokenInfo.volume24h,
            priceChange24h: warpPipesToken.priceChange24h ? parseFloat(warpPipesToken.priceChange24h.toString()) : tokenInfo.priceChange24h,
            marketCapUsd: warpPipesToken.marketCapUsd ? parseFloat(warpPipesToken.marketCapUsd.toString()) : tokenInfo.marketCapUsd,
            lastUpdated: warpPipesToken.lastUpdatedAt,
          };
        } else {
          // Only in TokenDiscovery - convert to expected format
          tokenInfo = {
            address: warpPipesToken.mint,
            symbol: warpPipesToken.symbol || '',
            name: warpPipesToken.name || '',
            logoURI: warpPipesToken.logoURI || warpPipesToken.imageUrl,
            website: warpPipesToken.website,
            twitter: warpPipesToken.twitter,
            telegram: warpPipesToken.telegram,
            socials: warpPipesToken.twitter || warpPipesToken.telegram 
              ? JSON.stringify([warpPipesToken.twitter, warpPipesToken.telegram].filter(Boolean))
              : null,
            websites: warpPipesToken.website ? JSON.stringify([warpPipesToken.website]) : null,
            lastPrice: warpPipesToken.priceUsd ? warpPipesToken.priceUsd.toString() : null,
            lastTs: warpPipesToken.lastUpdatedAt,
            volume24h: warpPipesToken.volume24h ? parseFloat(warpPipesToken.volume24h.toString()) : null,
            priceChange24h: warpPipesToken.priceChange24h ? parseFloat(warpPipesToken.priceChange24h.toString()) : null,
            marketCapUsd: warpPipesToken.marketCapUsd ? parseFloat(warpPipesToken.marketCapUsd.toString()) : null,
            liquidityUsd: warpPipesToken.liquidityUsd ? parseFloat(warpPipesToken.liquidityUsd.toString()) : null,
            holderCount: warpPipesToken.holderCount !== null && warpPipesToken.holderCount !== undefined ? warpPipesToken.holderCount : null,
            firstSeenAt: warpPipesToken.firstSeenAt,
            isNew: warpPipesToken.state === 'new',
            isTrending: false,
            lastUpdated: warpPipesToken.lastUpdatedAt,
          };
        }
      }
      
      if (!tokenInfo) {
        return reply.code(404).send({ error: "Token not found" });
      }
      
      // Build socials array from individual fields and socials JSON
      const socialsArray: string[] = [];
      if (tokenInfo.twitter) socialsArray.push(tokenInfo.twitter);
      if (tokenInfo.telegram) socialsArray.push(tokenInfo.telegram);

      // Parse and merge socials JSON if it exists
      try {
        const parsedSocials = tokenInfo.socials ? JSON.parse(tokenInfo.socials) : [];
        if (Array.isArray(parsedSocials)) {
          socialsArray.push(...parsedSocials.filter((s: string) =>
            s && !socialsArray.includes(s)
          ));
        }
      } catch (e) {
        // Ignore parse errors
      }

      // Build websites array from individual field and websites JSON
      const websitesArray: string[] = [];
      if (tokenInfo.website) websitesArray.push(tokenInfo.website);

      // Parse and merge websites JSON if it exists
      try {
        const parsedWebsites = tokenInfo.websites ? JSON.parse(tokenInfo.websites) : [];
        if (Array.isArray(parsedWebsites)) {
          websitesArray.push(...parsedWebsites.filter((w: string) =>
            w && !websitesArray.includes(w)
          ));
        }
      } catch (e) {
        // Ignore parse errors
      }

      // Convert BigInt fields to strings/numbers to avoid serialization errors
      const response = {
        mint: tokenInfo.address,
        address: tokenInfo.address, // For compatibility
        symbol: tokenInfo.symbol,
        name: tokenInfo.name,
        logoURI: tokenInfo.logoURI,
        imageUrl: tokenInfo.logoURI, // For compatibility
        website: tokenInfo.website,
        twitter: tokenInfo.twitter,
        telegram: tokenInfo.telegram,
        websites: JSON.stringify(websitesArray),
        socials: JSON.stringify(socialsArray),
        lastPrice: tokenInfo.lastPrice,
        lastTs: tokenInfo.lastTs ? (tokenInfo.lastTs instanceof Date ? tokenInfo.lastTs.toISOString() : tokenInfo.lastTs) : null,
        volume24h: typeof tokenInfo.volume24h === 'bigint' ? Number(tokenInfo.volume24h) : tokenInfo.volume24h,
        priceChange24h: typeof tokenInfo.priceChange24h === 'bigint' ? Number(tokenInfo.priceChange24h) : tokenInfo.priceChange24h,
        marketCapUsd: typeof tokenInfo.marketCapUsd === 'bigint' ? Number(tokenInfo.marketCapUsd) : tokenInfo.marketCapUsd,
        liquidityUsd: typeof tokenInfo.liquidityUsd === 'bigint' ? Number(tokenInfo.liquidityUsd) : tokenInfo.liquidityUsd,
        holderCount: typeof tokenInfo.holderCount === 'bigint' ? Number(tokenInfo.holderCount) : tokenInfo.holderCount,
        firstSeenAt: tokenInfo.firstSeenAt ? (tokenInfo.firstSeenAt instanceof Date ? tokenInfo.firstSeenAt.toISOString() : tokenInfo.firstSeenAt) : null,
        isNew: tokenInfo.isNew,
        isTrending: tokenInfo.isTrending,
        lastUpdated: tokenInfo.lastUpdated ? (tokenInfo.lastUpdated instanceof Date ? tokenInfo.lastUpdated.toISOString() : tokenInfo.lastUpdated) : null
      };
      
      return response;
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

      // Parallelize metadata enrichment for better performance
      const enrichedTokens = await Promise.all(
        pairs.slice(0, limit)
          .filter((pair: any) => pair.chainId === "solana" && pair.baseToken)
          .map(async (pair: any) => {
            // Enrich with metadata from multiple sources (Jupiter, Helius, etc.)
            const meta = await getTokenMeta(pair.baseToken.address);

            return {
              mint: pair.baseToken.address,
              symbol: meta?.symbol || pair.baseToken.symbol,
              name: meta?.name || pair.baseToken.name,
              logoURI: meta?.logoURI || pair.info?.imageUrl || null,
              priceUsd: parseFloat(pair.priceUsd || "0"),
              marketCapUsd: pair.marketCap || pair.fdv || null,
              liquidity: pair.liquidity?.usd || null,
              volume24h: pair.volume?.h24 || null,
              priceChange24h: pair.priceChange?.h24 || null,
              source: "dexscreener"
            };
          })
      );

      results.push(...enrichedTokens);
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

        // Filter out duplicates first, then parallelize metadata enrichment
        const uniqueTokens = tokens.slice(0, limit)
          .filter((token: any) => !results.find(r => r.mint === token.address));

        const enrichedTokens = await Promise.all(
          uniqueTokens.map(async (token: any) => {
            // Enrich with metadata from multiple sources (Jupiter, Helius, etc.)
            const meta = await getTokenMeta(token.address);

            return {
              mint: token.address,
              symbol: meta?.symbol || token.symbol,
              name: meta?.name || token.name,
              logoURI: meta?.logoURI || token.logoURI || null,
              priceUsd: parseFloat(token.price || "0"),
              marketCapUsd: token.marketCap || null,
              liquidity: token.liquidity || null,
              volume24h: token.volume24h || null,
              priceChange24h: token.priceChange24h || null,
              source: "birdeye"
            };
          })
        );

        results.push(...enrichedTokens);
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
