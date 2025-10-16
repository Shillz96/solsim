// Token service with enhanced metadata sources
import prisma from "../plugins/prisma.js";
import redis from "../plugins/redis.js";
import { robustFetch, fetchJSON } from "../utils/fetch.js";
import { safeStringify, safeParse } from "../utils/json.js";
import { tokenMetadataCoalescer } from "../utils/requestCoalescer.js";

const HELIUS = process.env.HELIUS_API!;
const DEX = "https://api.dexscreener.com";
const JUPITER = "https://price.jup.ag/v6";

// Redis cache TTL: 1 hour for metadata (logos, names rarely change)
const REDIS_TOKEN_META_TTL = 3600;
const REDIS_TOKEN_META_VERSION = 'v3'; // Increment to invalidate old cache (v3: added Jupiter "all" list + logo fallback)

// In-memory cache for Jupiter token lists (refreshed every hour)
let jupiterStrictCache: Map<string, any> | null = null;
let jupiterAllCache: Map<string, any> | null = null;
let jupiterCacheExpiry = 0;
const JUPITER_CACHE_TTL = 3600000; // 1 hour in milliseconds

// Helper function to get Jupiter token lists with caching
async function getJupiterToken(mint: string, useAllList: boolean = false): Promise<any | null> {
  const now = Date.now();

  // Check if cache is expired
  if (now > jupiterCacheExpiry) {
    jupiterStrictCache = null;
    jupiterAllCache = null;
  }

  const cache = useAllList ? jupiterAllCache : jupiterStrictCache;

  // Return from cache if available
  if (cache) {
    return cache.get(mint) || null;
  }

  // Fetch and cache the token list
  try {
    const url = useAllList ? 'https://token.jup.ag/all' : 'https://token.jup.ag/strict';
    const tokenList = await fetchJSON<any[]>(url, {
      timeout: 15000, // Increased timeout for large list
      retries: 1,
      retryDelay: 500
    });

    // Build cache map
    const cacheMap = new Map<string, any>();
    tokenList.forEach(token => {
      if (token.address) {
        cacheMap.set(token.address, token);
      }
    });

    // Store cache
    if (useAllList) {
      jupiterAllCache = cacheMap;
    } else {
      jupiterStrictCache = cacheMap;
    }
    jupiterCacheExpiry = now + JUPITER_CACHE_TTL;

    console.log(`[TokenService] Cached ${cacheMap.size} tokens from Jupiter ${useAllList ? 'all' : 'strict'} list`);

    return cacheMap.get(mint) || null;
  } catch (e: any) {
    console.warn(`Failed to fetch Jupiter ${useAllList ? 'all' : 'strict'} list:`, e.message);
    return null;
  }
}

// Enrich token metadata (caches in Redis -> DB -> external APIs)
// Wrapped with request coalescing to prevent duplicate concurrent API calls
export async function getTokenMeta(mint: string) {
  return tokenMetadataCoalescer.coalesce(`token:meta:${mint}`, () => getTokenMetaUncached(mint), 30000);
}

// Internal function: Fetch token metadata without coalescing
async function getTokenMetaUncached(mint: string) {
  // Try Redis cache first (fastest - in-memory cache)
  try {
    const cached = await redis.get(`token:meta:${REDIS_TOKEN_META_VERSION}:${mint}`);
    if (cached) {
      return safeParse(cached);
    }
  } catch (error) {
    // Redis failure is non-critical, continue to DB
    console.warn(`Redis cache miss for token ${mint}:`, error);
  }

  // Try DB cache second
  let token = await prisma.token.findUnique({ where: { address: mint } });
  const fresh = token && token.lastUpdated && Date.now() - token.lastUpdated.getTime() < 86400000; // 24h cache
  const hasImage = token && token.logoURI; // Only use cache if we have an image

  if (token && fresh && hasImage) {
    // Store in Redis for next time
    try {
      await redis.setex(`token:meta:${REDIS_TOKEN_META_VERSION}:${mint}`, REDIS_TOKEN_META_TTL, safeStringify(token));
    } catch (error) {
      console.warn(`Failed to cache token metadata in Redis:`, error);
    }
    return token;
  }

  // 1. Try Jupiter token list first (fastest and most reliable)
  // Try strict list first (verified tokens with logos)
  try {
    const jupiterToken = await getJupiterToken(mint, false); // Use strict list with caching

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

      // Cache in Redis with version key
      try {
        await redis.setex(`token:meta:${REDIS_TOKEN_META_VERSION}:${mint}`, REDIS_TOKEN_META_TTL, safeStringify(token));
      } catch (error) {
        console.warn(`Failed to cache token metadata in Redis:`, error);
      }

      return token;
    }
  } catch (e: any) {
    // Only log non-DNS errors to reduce noise
    if (e.code !== 'ENOTFOUND') {
      console.warn(`Jupiter strict list failed (${e.code || e.message}):`, e.message);
    }
  }

  // 1b. Try Jupiter "all" list (includes unverified tokens)
  try {
    const jupiterToken = await getJupiterToken(mint, true); // Use "all" list with caching

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

      // Cache in Redis with version key
      try {
        await redis.setex(`token:meta:${REDIS_TOKEN_META_VERSION}:${mint}`, REDIS_TOKEN_META_TTL, safeStringify(token));
      } catch (error) {
        console.warn(`Failed to cache token metadata in Redis:`, error);
      }

      return token;
    }
  } catch (e: any) {
    // Only log non-DNS errors to reduce noise
    if (e.code !== 'ENOTFOUND') {
      console.warn(`Jupiter all list failed (${e.code || e.message}):`, e.message);
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

      // Cache in Redis with version key
      try {
        await redis.setex(`token:meta:${REDIS_TOKEN_META_VERSION}:${mint}`, REDIS_TOKEN_META_TTL, safeStringify(token));
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

      // Cache in Redis with version key
      try {
        await redis.setex(`token:meta:${REDIS_TOKEN_META_VERSION}:${mint}`, REDIS_TOKEN_META_TTL, safeStringify(token));
      } catch (error) {
        console.warn(`Failed to cache token metadata in Redis:`, error);
      }

      return token;
    }
  } catch (e: any) {
    console.warn(`DexScreener metadata failed (${e.code || e.message}):`, e.message);
  }

  // 4. Final fallback: If we have token data but NO logo, try Jupiter one more time for just the image
  if (token && !token.logoURI) {
    try {
      const jupiterToken = await getJupiterToken(mint, true); // Use cached "all" list

      if (jupiterToken && jupiterToken.logoURI) {
        token = await prisma.token.update({
          where: { address: mint },
          data: {
            logoURI: jupiterToken.logoURI,
            lastUpdated: new Date()
          }
        });

        // Cache in Redis
        try {
          await redis.setex(`token:meta:${REDIS_TOKEN_META_VERSION}:${mint}`, REDIS_TOKEN_META_TTL, safeStringify(token));
        } catch (error) {
          console.warn(`Failed to cache token metadata in Redis:`, error);
        }

        console.log(`✓ Found missing logo for ${token.symbol || mint} on Jupiter`);
      }
    } catch (e: any) {
      // Silent fail - this is just a bonus attempt
    }
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
// Wrapped with request coalescing to prevent duplicate concurrent API calls
async function getTokenPriceData(mint: string) {
  return tokenMetadataCoalescer.coalesce(`token:price:${mint}`, () => getTokenPriceDataUncached(mint), 5000);
}

// Internal function: Fetch token price data without coalescing
async function getTokenPriceDataUncached(mint: string) {
  // Try Jupiter price API first
  try {
    const data = await fetchJSON<any>(
      `${JUPITER}/price?ids=${mint}`,
      { timeout: 8000, retries: 0, retryDelay: 500 } // No retries - fail fast, DexScreener is fallback
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
