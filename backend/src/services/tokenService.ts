// Token service with enhanced metadata sources
import prisma from "../plugins/prisma.js";
import { robustFetch, fetchJSON } from "../utils/fetch.js";

const HELIUS = process.env.HELIUS_API!;
const DEX = "https://api.dexscreener.com";
const JUPITER = "https://price.jup.ag/v6";

// Enrich token metadata (caches in DB)
export async function getTokenMeta(mint: string) {
  // Try DB cache first
  let token = await prisma.token.findUnique({ where: { address: mint } });
  const fresh = token && token.lastUpdated && Date.now() - token.lastUpdated.getTime() < 86400000; // 24h cache

  if (token && fresh) return token;

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
      return token;
    }
  } catch (e: any) {
    console.warn(`Jupiter token list failed (${e.code || e.message}):`, e.message);
  }

  // 2. Try Helius token metadata
  try {
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
      return token;
    }
  } catch (e: any) {
    console.warn(`Helius metadata failed (${e.code || e.message}):`, e.message);
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
    console.warn(`Jupiter price failed (${e.code || e.message}):`, e.message);
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
