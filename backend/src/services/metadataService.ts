import { logger } from '../utils/logger.js';
import { monitoringService } from './monitoringService.js';

interface TokenMetadata {
  symbol: string;
  name: string;
  logoUri: string | null;
}

interface MetadataSource {
  name: string;
  fetch: (address: string) => Promise<TokenMetadata | null>;
  timeout: number;
}

export class MetadataService {
  private cache = new Map<string, { data: TokenMetadata; timestamp: number; isFallback: boolean }>();
  private static readonly CACHE_TTL = 15 * 60 * 1000; // 15 minutes
  private static readonly CACHE_TTL_FALLBACK = 2 * 60 * 1000; // 2 minutes for fallbacks
  private static readonly RETRY_ATTEMPTS = 3;
  private static readonly RETRY_DELAY = 1000; // 1 second
  
  // Cache stampede protection: track in-flight requests
  private inflightRequests = new Map<string, Promise<TokenMetadata | null>>();

  // Multiple metadata sources for better reliability (prioritized)
  private sources: MetadataSource[] = [
    // 1. Helius DAS API (MOST RELIABLE - Primary source)
    {
      name: 'Helius',
      timeout: 7000,
      fetch: async (address: string): Promise<TokenMetadata | null> => {
        return await monitoringService.trackExternalAPICall('Helius', async () => {
          const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
          if (!HELIUS_API_KEY) return null;

          const response = await fetch(
            `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`,
            {
              method: 'POST',
              signal: AbortSignal.timeout(7000),
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                id: 'metadata-fetch',
                method: 'getAsset',
                params: { id: address, displayOptions: { showCollectionMetadata: true } }
              })
            }
          );

          if (!response.ok) return null;

          const data = await response.json() as any;
          if (data.error || !data.result?.content) return null;

          const asset = data.result;
          const metadata = asset.content.metadata || {};
          const content = asset.content || {};

          return {
            symbol: metadata.symbol || content.symbol || null,
            name: metadata.name || content.name || null,
            logoUri: content.links?.image || content.files?.[0]?.uri || null
          };
        });
      }
    },
    // 2. Jupiter Token API (COMPREHENSIVE - Secondary source)
    {
      name: 'Jupiter',
      timeout: 6000,
      fetch: async (address: string): Promise<TokenMetadata | null> => {
        return await monitoringService.trackExternalAPICall('Jupiter', async () => {
          const response = await fetch(
            `https://token.jup.ag/strict/${address}`,
            {
              signal: AbortSignal.timeout(6000),
              headers: { 'Accept': 'application/json' }
            }
          );

          if (!response.ok) return null;

          const data = await response.json() as any;
          if (!data || data.error) return null;

          return {
            symbol: data.symbol || null,
            name: data.name || null,
            logoUri: data.logoURI || data.logo_uri || null
          };
        });
      }
    },
    // 3. DexScreener (POPULAR - Tertiary source)
    {
      name: 'DexScreener',
      timeout: 5000,
      fetch: async (address: string): Promise<TokenMetadata | null> => {
        return await monitoringService.trackExternalAPICall('DexScreener', async () => {
          const response = await fetch(
            `https://api.dexscreener.com/latest/dex/tokens/${address}`,
            {
              signal: AbortSignal.timeout(5000),
              headers: { 'Accept': 'application/json' }
            }
          );

          if (!response.ok) return null;

          const data = await response.json() as any;
          const pair = data.pairs?.[0];
          
          if (!pair) return null;

          return {
            symbol: pair.baseToken?.symbol || null,
            name: pair.baseToken?.name || null,
            logoUri: pair.info?.imageUrl || null
          };
        });
      }
    },
    // 4. Birdeye (DETAILED - Quaternary source)
    {
      name: 'Birdeye',
      timeout: 5000,
      fetch: async (address: string): Promise<TokenMetadata | null> => {
        return await monitoringService.trackExternalAPICall('Birdeye', async () => {
          const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY;
          if (!BIRDEYE_API_KEY) return null;

          const response = await fetch(
            `https://public-api.birdeye.so/defi/token_overview?address=${address}`,
            {
              signal: AbortSignal.timeout(5000),
              headers: { 
                'Accept': 'application/json',
                'X-API-KEY': BIRDEYE_API_KEY
              }
            }
          );

          if (!response.ok) return null;

          const data = await response.json() as any;
          
          if (!data.success || !data.data) return null;

          return {
            symbol: data.data.symbol || null,
            name: data.data.name || null,
            logoUri: data.data.logoURI || null
          };
        });
      }
    },
    // 5. CoinGecko (MAJOR TOKENS - Quinary source)
    {
      name: 'CoinGecko',
      timeout: 5000,
      fetch: async (address: string): Promise<TokenMetadata | null> => {
        return await monitoringService.trackExternalAPICall('CoinGecko', async () => {
          const response = await fetch(
            `https://api.coingecko.com/api/v3/coins/solana/contract/${address}`,
            {
              signal: AbortSignal.timeout(5000),
              headers: { 'Accept': 'application/json' }
            }
          );

          if (!response.ok) return null;

          const data = await response.json() as any;
          if (!data || data.error) return null;

          return {
            symbol: data.symbol?.toUpperCase() || null,
            name: data.name || null,
            logoUri: data.image?.large || data.image?.small || null
          };
        });
      }
    }
  ];

  /**
   * Validate metadata is complete and usable
   */
  private isValidMetadata(metadata: TokenMetadata | null): boolean {
    if (!metadata) {
      logger.warn('[MetadataService] Validation failed: metadata is null');
      return false;
    }
    
    const hasSymbol = metadata.symbol && metadata.symbol.length > 0;
    const hasName = metadata.name && metadata.name.length > 0;
    
    if (!hasSymbol || !hasName) {
      logger.warn(`[MetadataService] Validation failed: symbol=${metadata.symbol}, name=${metadata.name}`);
      return false;
    }
    
    // Reject obvious fallback patterns like "Token DezXAZ8z" or "DEZXAZ8Z" / "Token DezXAZ8z"
    const isFallbackPattern = metadata.name?.startsWith('Token ') && 
                              metadata.symbol === metadata.name?.substring(6, 14).toUpperCase();
    
    if (isFallbackPattern) {
      logger.warn(`[MetadataService] Validation failed: looks like fallback data (${metadata.symbol} / ${metadata.name})`);
      return false;
    }
    
    return true;
  }

  /**
   * Get token metadata with multiple sources, retries, and comprehensive caching
   */
  async getMetadata(address: string): Promise<TokenMetadata> {
    // Check cache first
    const cached = this.cache.get(address);
    if (cached) {
      const ttl = cached.isFallback ? MetadataService.CACHE_TTL_FALLBACK : MetadataService.CACHE_TTL;
      if (Date.now() - cached.timestamp < ttl) {
        return cached.data;
      }
      // Cached data expired, remove it
      this.cache.delete(address);
    }

    // Check for in-flight request to prevent cache stampede
    const inFlight = this.inflightRequests.get(address);
    if (inFlight) {
      const result = await inFlight;
      if (result) return result;
      throw new Error(`Failed to fetch metadata for ${address}`);
    }

    // Create new in-flight promise
    const fetchPromise = this.fetchMetadataFromSources(address);
    this.inflightRequests.set(address, fetchPromise);

    try {
      const metadata = await fetchPromise;
      if (!metadata) {
        throw new Error(`All metadata sources failed for token ${address}`);
      }
      return metadata;
    } finally {
      this.inflightRequests.delete(address);
    }
  }

  /**
   * Try all sources in priority order with validation
   */
  private async fetchMetadataFromSources(address: string): Promise<TokenMetadata | null> {
    logger.info(`[MetadataService] Fetching metadata for ${address}`);

    for (const source of this.sources) {
      try {
        logger.info(`[MetadataService] Trying ${source.name}...`);
        
        const metadata = await this.fetchWithRetry(source, address);
        
        if (metadata && this.isValidMetadata(metadata)) {
          logger.info(`[MetadataService] ✅ Success from ${source.name}: ${metadata.symbol} - ${metadata.name}`);
          
          // Cache successful result
          this.cache.set(address, {
            data: metadata,
            timestamp: Date.now(),
            isFallback: false
          });
          
          return metadata;
        } else {
          logger.warn(`[MetadataService] ⚠️ ${source.name} returned invalid/incomplete metadata`);
        }
      } catch (error) {
        logger.error(`[MetadataService] ❌ ${source.name} failed:`, error);
        continue;
      }
    }

    // If all sources fail, DO NOT return fallback metadata
    // Throw error to prevent saving bad data to database
    logger.error(`[MetadataService] ❌ All sources failed for ${address}`);
    return null;
  }

  /**
   * Fetch with exponential backoff retry logic
   */
  private async fetchWithRetry(source: MetadataSource, address: string): Promise<TokenMetadata | null> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MetadataService.RETRY_ATTEMPTS; attempt++) {
      try {
        const result = await source.fetch(address);
        if (result) return result;
        
        // No result but no error - source returned null cleanly
        return null;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < MetadataService.RETRY_ATTEMPTS) {
          const delay = MetadataService.RETRY_DELAY * Math.pow(2, attempt - 1);
          logger.warn(`[MetadataService] ${source.name} attempt ${attempt} failed, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    if (lastError) {
      logger.error(`[MetadataService] ${source.name} exhausted all ${MetadataService.RETRY_ATTEMPTS} attempts:`, lastError);
    }
    
    return null;
  }

  /**
   * Clear cache for specific token
   */
  clearCache(address: string): void {
    this.cache.delete(address);
  }

  /**
   * Clear all cached metadata
   */
  clearAllCache(): void {
    this.cache.clear();
  }
}

export const metadataService = new MetadataService();
