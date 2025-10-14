// Token service with enhanced metadata sources
import prisma from "../plugins/prisma.js";
import redis from "../plugins/redis.js";
import { robustFetch, fetchJSON } from "../utils/fetch.js";

const HELIUS = process.env.HELIUS_API!;
const DEX = "https://api.dexscreener.com";
const JUPITER = "https://price.jup.ag/v6";

// Redis cache TTL: 10 minutes (balances freshness vs performance)
const REDIS_TOKEN_META_TTL = 600;

// Enrich token metadata (caches in Redis -> DB -> external APIs)
export async function getTokenMeta(mint: string) {
  // Try Redis cache first (fastest - in-memory cache)
  try {
    const cached = await redis.get(`token:meta:${mint}`);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    // Redis failure is non-critical, continue to DB
    console.warn(`Redis cache miss for token ${mint}:`, error);
  }

  // Try DB cache second
  let token = await prisma.token.findUnique({ where: { address: mint } });
  const fresh = token && token.lastUpdated && Date.now() - token.lastUpdated.getTime() < 86400000; // 24h cache

  if (token && fresh) {
    // Store in Redis for next time
    try {
      await redis.setex(`token:meta:${mint}`, REDIS_TOKEN_META_TTL, JSON.stringify(token));
    } catch (error) {
      console.warn(`Failed to cache token metadata in Redis:`, error);
    }
    return token;
  }

  // 1. Try Jupiter token list first (fastest and most reliable)
  try {
    const tokenList = await fetchJSON<any[]>(`https://token.jup.ag/strict`, {
      timeout: 8000,
      retries: 2,
      retryDelay: 500
    });
    const jupiterToken = tokenList.find(t => t.address === mint);

    if (jupiterToken) {
      token = await prisma.token.upsert({
        where: { address: mint },
        update: {
          symbol: jupiterToken.symbol || null,
          name: jupiterToken.name || null,
          logoURI: jupiterToken.logoURI || null,
          lastUpdated: new Date()
        },
        create: {
          address: mint,
          symbol: jupiterToken.symbol || null,
          name: jupiterToken.name || null,
          logoURI: jupiterToken.logoURI || null,
        }
      });

      // Cache in Redis
      try {
        await redis.setex(`token:meta:${mint}`, REDIS_TOKEN_META_TTL, JSON.stringify(token));
      } catch (error) {
        console.warn(`Failed to cache token metadata in Redis:`, error);
      }

      return token;
    }
  } catch (e: any) {
    // Only log non-DNS errors to reduce noise
    if (e.code !== 'ENOTFOUND') {
      console.warn(`Jupiter token list failed (${e.code || e.message}):`, e.message);
    }
  }

  // 2. Try Helius token metadata
  try {
    // Validate mint address format (base58, 32-44 chars)
    if (!mint || mint.length < 32 || mint.length > 44 || !/^[1-9A-HJ-NP-Za-km-z]+$/.test(mint)) {
      console.warn(`Invalid mint address format: ${mint}`);
      return token;
    }

    const json = await fetchJSON<any[]>(
      `https://api.helius.xyz/v0/token-metadata?api-key=${HELIUS}&mintAccounts=${mint}`,
      { timeout: 8000, retries: 2, retryDelay: 500 }
    );
    const meta = json[0]?.onChainMetadata?.metadata || json[0]?.offChainMetadata?.metadata;
    if (meta) {
      token = await prisma.token.upsert({
        where: { address: mint },
        update: {
          symbol: meta.symbol || null,
          name: meta.name || null,
          logoURI: meta.image || null,
          website: meta.external_url || null,
          twitter: meta.extensions?.twitter || null,
          telegram: meta.extensions?.telegram || null,
          lastUpdated: new Date()
        },
        create: {
          address: mint,
          symbol: meta.symbol || null,
          name: meta.name || null,
          logoURI: meta.image || null,
          website: meta.external_url || null,
          twitter: meta.extensions?.twitter || null,
          telegram: meta.extensions?.telegram || null,
        }
      });

      // Cache in Redis
      try {
        await redis.setex(`token:meta:${mint}`, REDIS_TOKEN_META_TTL, JSON.stringify(token));
      } catch (error) {
        console.warn(`Failed to cache token metadata in Redis:`, error);
      }

      return token;
    }
  } catch (e: any) {
    // Don't log 400 errors (invalid token addresses) to reduce noise
    if (!e.message?.includes('400') && !e.message?.includes('Bad Request')) {
      console.warn(`Helius metadata failed (${e.code || e.message}):`, e.message);
    }
  }

  // 3. Fallback to Dexscreener
  try {
    const json = await fetchJSON<any>(
      `${DEX}/latest/dex/tokens/${mint}`,
      { timeout: 8000, retries: 2, retryDelay: 500 }
    );
    const pair = json.pairs?.[0];
    if (pair) {
      token = await prisma.token.upsert({
        where: { address: mint },
        update: {
          symbol: pair.baseToken?.symbol || null,
          name: pair.baseToken?.name || null,
          logoURI: pair.info?.imageUrl || null,
          website: pair.info?.websiteUrl || null,
          twitter: pair.info?.twitter || null,
          telegram: pair.info?.telegram || null,
          lastUpdated: new Date()
        },
        create: {
          address: mint,
          symbol: pair.baseToken?.symbol || null,
          name: pair.baseToken?.name || null,
          logoURI: pair.info?.imageUrl || null,
          website: pair.info?.websiteUrl || null,
          twitter: pair.info?.twitter || null,
          telegram: pair.info?.telegram || null,
        }
      });

      // Cache in Redis
      try {
        await redis.setex(`token:meta:${mint}`, REDIS_TOKEN_META_TTL, JSON.stringify(token));
      } catch (error) {
        console.warn(`Failed to cache token metadata in Redis:`, error);
      }

      return token;
    }
  } catch (e: any) {
    console.warn(`DexScreener metadata failed (${e.code || e.message}):`, e.message);
  }

  return token;
}

// Get comprehensive token information with price data
export async function getTokenInfo(mint: string) {
  const [metadata, priceData] = await Promise.all([
    getTokenMeta(mint),
    getTokenPriceData(mint)
  ]);

  return {
    ...metadata,
    ...priceData,
    address: mint,
    mint // Include both for compatibility
  };
}

// Get token price data from multiple sources
async function getTokenPriceData(mint: string) {
  // Try Jupiter price API first
  try {
    const data = await fetchJSON<any>(
      `${JUPITER}/price?ids=${mint}`,
      { timeout: 8000, retries: 2, retryDelay: 500 }
    );
    const price = data.data?.[mint]?.price;

    if (price) {
      return {
        lastPrice: price.toString(),
        lastTs: new Date().toISOString()
      };
    }
  } catch (e: any) {
    // Only log non-DNS errors to reduce noise
    if (e.code !== 'ENOTFOUND') {
      console.warn(`Jupiter price failed (${e.code || e.message}):`, e.message);
    }
  }

  // Fallback to DexScreener for price data
  try {
    const json = await fetchJSON<any>(
      `${DEX}/latest/dex/tokens/${mint}`,
      { timeout: 8000, retries: 2, retryDelay: 500 }
    );
    const pair = json.pairs?.[0];
    if (pair && pair.priceUsd) {
      return {
        lastPrice: pair.priceUsd,
        lastTs: new Date().toISOString(),
        volume24h: pair.volume?.h24 || null,
        priceChange24h: pair.priceChange?.h24 || null,
        marketCapUsd: pair.marketCap || null
      };
    }
  } catch (e: any) {
    console.warn(`DexScreener price failed (${e.code || e.message}):`, e.message);
  }

  return {
    lastPrice: null,
    lastTs: null
  };
}
