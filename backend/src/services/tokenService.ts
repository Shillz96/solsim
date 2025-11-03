// Token service with enhanced metadata sources
import prisma from "../plugins/prisma.js";
import redis from "../plugins/redis.js";
import { robustFetch, fetchJSON } from "../utils/fetch.js";
import { safeStringify, safeParse } from "../utils/json.js";
import { tokenMetadataCoalescer } from "../utils/requestCoalescer.js";

const HELIUS = process.env.HELIUS_API!;
const DEX = "https://api.dexscreener.com";
const JUPITER = "https://lite-api.jup.ag/price/v3";

// Redis cache TTL: 1 hour for metadata (logos, names rarely change)
const REDIS_TOKEN_META_TTL = 3600;
const REDIS_TOKEN_META_VERSION = 'v4'; // Increment to invalidate old cache (v4: added Helius DAS API on-chain metadata + CDN URIs)

// In-memory cache for Jupiter token lists (refreshed every hour)
let jupiterStrictCache: Map<string, any> | null = null;
let jupiterAllCache: Map<string, any> | null = null;
let jupiterCacheExpiry = 0;
const JUPITER_CACHE_TTL = 3600000; // 1 hour in milliseconds

// Minimal image URL normalizer (avoid new files)
function normalizeLogo(u?: string | null): string | null {
  if (!u) return null;
  let url = u.trim();
  if (/^http:\/\/\d+\.\d+\.\d+\.\d+/.test(url)) return null;
  if (url.startsWith('//')) url = `https:${url}`;
  if (url.startsWith('ipfs://')) url = `https://ipfs.io/ipfs/${url.replace('ipfs://', '').replace(/^ipfs\//, '')}`;
  else if (/^[a-zA-Z0-9]{46,100}$/.test(url)) url = `https://ipfs.io/ipfs/${url}`;
  else if (url.startsWith('ar://')) url = `https://arweave.net/${url.replace('ar://', '')}`;
  else if (!/^https?:\/\//.test(url) && url.startsWith('dd.dexscreener.com')) url = `https://${url}`;
  return url;
}

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

  // Note: Jupiter token list endpoints now require authentication
  // Skip Jupiter token list and rely on other metadata sources
  console.log('[TokenService] Skipping Jupiter token list (requires auth) - using other metadata sources');
  return null;
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
  const hasImage = token && token.logoURI; // Check if we have an image

  // Only use cache if:
  // 1. Token has an image (hasImage), OR
  // 2. Token was updated in last 24h AND we've already tried Jupiter "all" list (cache v3+)
  // This ensures tokens without logos get re-checked with the new Jupiter lists
  const isCacheValid = token && token.lastUpdated && Date.now() - token.lastUpdated.getTime() < 86400000;

  if (token && hasImage && isCacheValid) {
    // Store in Redis for next time
    try {
      await redis.setex(`token:meta:${REDIS_TOKEN_META_VERSION}:${mint}`, REDIS_TOKEN_META_TTL, safeStringify(token));
    } catch (error) {
      console.warn(`Failed to cache token metadata in Redis:`, error);
    }
    return token;
  }

  // If token exists but has no logo and cache is still valid (fresh but no image),
  // we'll fall through and try fetching from Jupiter again
  // This allows us to backfill logos for tokens that were cached before Jupiter "all" list was added

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
          logoURI: normalizeLogo(jupiterToken.logoURI) || null,
          lastUpdated: new Date()
        },
        create: {
          address: mint,
          symbol: jupiterToken.symbol || null,
          name: jupiterToken.name || null,
          logoURI: normalizeLogo(jupiterToken.logoURI) || null,
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
          logoURI: normalizeLogo(meta.image),
          website: meta.external_url || null,
          twitter: meta.extensions?.twitter || null,
          telegram: meta.extensions?.telegram || null,
          lastUpdated: new Date()
        },
        create: {
          address: mint,
          symbol: meta.symbol || null,
          name: meta.name || null,
          logoURI: normalizeLogo(meta.image),
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
          logoURI: normalizeLogo(pair.info?.imageUrl || pair.baseToken?.imageUrl || null),
          website: pair.info?.websiteUrl || null,
          twitter: pair.info?.twitter || null,
          telegram: pair.info?.telegram || null,
          lastUpdated: new Date()
        },
        create: {
          address: mint,
          symbol: pair.baseToken?.symbol || null,
          name: pair.baseToken?.name || null,
          logoURI: normalizeLogo(pair.info?.imageUrl || pair.baseToken?.imageUrl || null),
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
            logoURI: normalizeLogo(jupiterToken.logoURI),
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

  // 5. FINAL fallback for pump.fun and low-cap tokens: Fetch on-chain Metaplex metadata
  // This catches tokens that creators uploaded logos for but aren't indexed by aggregators yet
  if (token && !token.logoURI) {
    try {
      // Use Helius DAS (Digital Asset Standard) API for Metaplex metadata
      const dasData = await fetchJSON<any>(
        `https://mainnet.helius-rpc.com/?api-key=${HELIUS}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 'metadata-fetch',
            method: 'getAsset',
            params: { id: mint }
          }),
          timeout: 5000,
          retries: 1
        }
      );

      const content = dasData.result?.content;
      // Try multiple image sources: primary link, CDN-cached version, original file, or metadata JSON
      const imageUri = content?.links?.image || content?.files?.[0]?.cdn_uri || content?.files?.[0]?.uri || content?.json_uri;

      if (imageUri) {
        token = await prisma.token.update({
          where: { address: mint },
          data: {
            logoURI: imageUri,
            lastUpdated: new Date()
          }
        });

        // Cache in Redis
        try {
          await redis.setex(`token:meta:${REDIS_TOKEN_META_VERSION}:${mint}`, REDIS_TOKEN_META_TTL, safeStringify(token));
        } catch (error) {
          console.warn(`Failed to cache token metadata in Redis:`, error);
        }

        console.log(`✓ Found on-chain logo for ${token.symbol || mint}: ${imageUri}`);
      }
    } catch (e: any) {
      // Silent fail - this is optional on-chain metadata
    }
  }

  // If still no token data, create a minimal entry to prevent repeated lookups
  if (!token) {
    try {
      token = await prisma.token.create({
        data: {
          address: mint,
          symbol: mint.substring(0, 8), // Use truncated address as fallback symbol
          name: `Unknown Token (${mint.substring(0, 8)}...)`,
          logoURI: null,
          lastUpdated: new Date()
        }
      });

      // Cache minimal entry for 1 hour to prevent repeated failed lookups
      try {
        await redis.setex(`token:meta:${REDIS_TOKEN_META_VERSION}:${mint}`, REDIS_TOKEN_META_TTL, safeStringify(token));
      } catch (error) {
        console.warn(`Failed to cache token metadata in Redis:`, error);
      }
    } catch (e: any) {
      console.warn(`Failed to create minimal token entry for ${mint}:`, e.message);
    }
  }

  // Special handling for native SOL token
  if (mint === 'So11111111111111111111111111111111111111112') {
    return {
      ...token,
      name: 'SOL',
      symbol: 'SOL',
      logoURI: 'https://cryptologos.cc/logos/solana-sol-logo.png?v=040'
    };
  }

  return token;
}

// Batch fetch token metadata for multiple mints using Helius DAS API
// Up to 1000 tokens per call - massive performance improvement over individual fetches
export async function getTokenMetaBatch(mints: string[]) {
  if (!mints || mints.length === 0) return [];

  try {
    // Check Redis cache first for all mints
    const cacheKeys = mints.map(mint => `token:meta:${REDIS_TOKEN_META_VERSION}:${mint}`);
    const cachedResults = await Promise.allSettled(
      cacheKeys.map(key => redis.get(key))
    );

    const results: any[] = [];
    const uncachedMints: string[] = [];

    // Separate cached vs uncached
    mints.forEach((mint, index) => {
      const cached = cachedResults[index];
      if (cached.status === 'fulfilled' && cached.value) {
        results[index] = safeParse(cached.value);
      } else {
        uncachedMints.push(mint);
      }
    });

    // If all cached, return early
    if (uncachedMints.length === 0) {
      return results.filter(Boolean);
    }

    // Try DB cache for uncached mints
    const dbTokens = await prisma.token.findMany({
      where: { address: { in: uncachedMints } }
    });

    const dbTokensMap = new Map(dbTokens.map(t => [t.address, t]));
    const missingMints: string[] = [];

    uncachedMints.forEach(mint => {
      const dbToken = dbTokensMap.get(mint);
      const hasImage = dbToken && dbToken.logoURI;
      const isCacheValid = dbToken && dbToken.lastUpdated && Date.now() - dbToken.lastUpdated.getTime() < 86400000;

      if (dbToken && hasImage && isCacheValid) {
        const index = mints.indexOf(mint);
        results[index] = dbToken;

        // Cache in Redis
        redis.setex(`token:meta:${REDIS_TOKEN_META_VERSION}:${mint}`, REDIS_TOKEN_META_TTL, safeStringify(dbToken)).catch(() => {});
      } else {
        missingMints.push(mint);
      }
    });

    // If nothing missing from cache/DB, return
    if (missingMints.length === 0) {
      return results.filter(Boolean);
    }

    console.log(`[TokenService] Batch fetching ${missingMints.length} tokens from Helius DAS API`);

    // Batch fetch missing tokens from Helius DAS API (max 1000 per call)
    const dasResponse = await fetchJSON<any>(
      `https://mainnet.helius-rpc.com/?api-key=${HELIUS}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'batch-meta',
          method: 'getAssetBatch',
          params: {
            ids: missingMints,
            displayOptions: {
              showFungible: true
            }
          }
        }),
        timeout: 15000,
        retries: 1
      }
    );

    const assets = dasResponse.result || [];

    // Process batch results
    const upsertPromises = assets.map(async (asset: any) => {
      if (!asset) return null;

      const mint = asset.id;
      const content = asset.content;
      const metadata = content?.metadata;

      const token = await prisma.token.upsert({
        where: { address: mint },
        update: {
          symbol: metadata?.symbol || null,
          name: metadata?.name || null,
          logoURI: content?.links?.image || content?.files?.[0]?.cdn_uri || content?.files?.[0]?.uri || null,
          lastUpdated: new Date()
        },
        create: {
          address: mint,
          symbol: metadata?.symbol || null,
          name: metadata?.name || null,
          logoURI: content?.links?.image || content?.files?.[0]?.cdn_uri || content?.files?.[0]?.uri || null,
        }
      });

      // Cache in Redis
      redis.setex(`token:meta:${REDIS_TOKEN_META_VERSION}:${mint}`, REDIS_TOKEN_META_TTL, safeStringify(token)).catch(() => {});

      const index = mints.indexOf(mint);
      results[index] = token;

      return token;
    });

    await Promise.all(upsertPromises);

    console.log(`[TokenService] ✓ Batch fetched ${assets.length} tokens (${mints.length - uncachedMints.length} from cache)`);

    return results.filter(Boolean);
  } catch (e: any) {
    console.error(`Batch metadata fetch failed:`, e.message);

    // Fallback to individual fetches
    console.log(`[TokenService] Falling back to individual token fetches for ${mints.length} tokens`);
    return Promise.all(mints.map(mint => getTokenMeta(mint)));
  }
}

// Get comprehensive token information with price data
export async function getTokenInfo(mint: string) {
  const startTime = Date.now(); // PERFORMANCE LOGGING: Track API call duration

  try {
    const [metadata, priceData] = await Promise.all([
      getTokenMeta(mint).catch(err => {
        console.warn(`getTokenMeta failed for ${mint.slice(0, 8)}:`, err.message);
        return null;
      }),
      getTokenPriceData(mint).catch(err => {
        console.warn(`getTokenPriceData failed for ${mint.slice(0, 8)}:`, err.message);
        return { lastPrice: null, lastTs: null };
      })
    ]);

    const duration = Date.now() - startTime;

    // PERFORMANCE LOGGING: Warn if API calls took longer than 3 seconds
    if (duration > 3000) {
      console.warn(`⚠️ SLOW API: getTokenInfo for ${mint.slice(0, 8)} took ${duration}ms (>3000ms threshold)`);
      console.warn(`   - External APIs (Jupiter/DexScreener) may be slow or rate-limiting`);
      console.warn(`   - Consider checking TokenDiscovery table for cached data first`);
    } else if (duration > 1000) {
      console.log(`⏱️ getTokenInfo for ${mint.slice(0, 8)}: ${duration}ms`);
    }

    // If metadata is completely missing, return null (token not found)
    if (!metadata) {
      return null;
    }

    return {
      ...metadata,
      ...priceData,
      address: mint,
      mint // Include both for compatibility
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`❌ getTokenInfo failed for ${mint.slice(0, 8)} after ${duration}ms:`, error.message);
    return null;
  }
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
