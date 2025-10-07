import { logger } from '../utils/logger.js';

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
  private cache = new Map<string, { data: TokenMetadata; timestamp: number }>();
  private static readonly CACHE_TTL = 15 * 60 * 1000; // 15 minutes (increased)
  private static readonly RETRY_ATTEMPTS = 3;
  private static readonly RETRY_DELAY = 1000; // 1 second
  
  // Cache stampede protection: track in-flight requests
  private inflightRequests = new Map<string, Promise<TokenMetadata | null>>();

  // Multiple metadata sources for better reliability
  private sources: MetadataSource[] = [
    {
      name: 'DexScreener',
      timeout: 3000,
      fetch: async (address: string): Promise<TokenMetadata | null> => {
        const response = await fetch(
          `https://api.dexscreener.com/latest/dex/tokens/${address}`,
          {
            signal: AbortSignal.timeout(3000),
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
      }
    },
    {
      name: 'Birdeye',
      timeout: 3000,
      fetch: async (address: string): Promise<TokenMetadata | null> => {
        const response = await fetch(
          `https://public-api.birdeye.so/defi/token_overview?address=${address}`,
          {
            signal: AbortSignal.timeout(3000),
            headers: { 
              'Accept': 'application/json',
              'X-API-KEY': process.env.BIRDEYE_API_KEY || '' // Optional API key
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
      }
    },
    {
      name: 'Jupiter',
      timeout: 2000,
      fetch: async (address: string): Promise<TokenMetadata | null> => {
        const response = await fetch(
          `https://token.jup.ag/strict/${address}`,
          {
            signal: AbortSignal.timeout(2000),
            headers: { 'Accept': 'application/json' }
          }
        );

        if (!response.ok) return null;

        const data = await response.json() as any;
        
        return {
          symbol: data.symbol || null,
          name: data.name || null,
          logoUri: data.logoURI || null
        };
      }
    }
  ];

  /**
   * Get token metadata with multiple sources, retries, and comprehensive caching
   */
  async getMetadata(address: string): Promise<TokenMetadata> {
    // Check cache first
    const cached = this.cache.get(address);
    if (cached && Date.now() - cached.timestamp < MetadataService.CACHE_TTL) {
      return cached.data;
    }

    // Cache stampede protection: Check if request already in-flight
    const inflightRequest = this.inflightRequests.get(address);
    if (inflightRequest) {
      logger.debug(`Metadata request already in-flight, waiting: ${address.substring(0, 8)}...`);
      return await inflightRequest;
    }

    // Create new request and track it
    const requestPromise = this.fetchMetadataFromSources(address);
    this.inflightRequests.set(address, requestPromise);

    try {
      const metadata = await requestPromise;
      return metadata;
    } finally {
      // Clean up in-flight tracker
      this.inflightRequests.delete(address);
    }
  }

  /**
   * Fetch metadata from multiple sources
   * Separated for cache stampede protection
   */
  private async fetchMetadataFromSources(address: string): Promise<TokenMetadata> {
    // Try multiple sources with retries
    for (const source of this.sources) {
      try {
        const metadata = await this.fetchWithRetry(source, address);
        if (metadata && this.isValidMetadata(metadata)) {
          const enrichedMetadata = this.enrichMetadata(metadata, address);
          this.cache.set(address, { data: enrichedMetadata, timestamp: Date.now() });
          logger.debug(`Metadata fetched from ${source.name} for ${address.substring(0, 8)}...`);
          return enrichedMetadata;
        }
      } catch (error) {
        logger.debug(`${source.name} metadata fetch failed for ${address.substring(0, 8)}...`, error);
        continue;
      }
    }

    // Fallback metadata with enhanced fallback logic
    const fallback: TokenMetadata = {
      symbol: address.substring(0, 8).toUpperCase(),
      name: `Token ${address.substring(0, 8)}`,
      logoUri: null
    };
    
    // Cache fallback with shorter TTL (negative caching)
    this.cache.set(address, { 
      data: fallback, 
      timestamp: Date.now() - (MetadataService.CACHE_TTL - 60000) // Cache for only 1 minute
    });
    
    logger.info(`Using fallback metadata for ${address.substring(0, 8)}...`);
    return fallback;
  }

  /**
   * Fetch metadata with exponential backoff retry
   */
  private async fetchWithRetry(source: MetadataSource, address: string): Promise<TokenMetadata | null> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= MetadataService.RETRY_ATTEMPTS; attempt++) {
      try {
        const result = await source.fetch(address);
        if (result) return result;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < MetadataService.RETRY_ATTEMPTS) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = MetadataService.RETRY_DELAY * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    if (lastError) throw lastError;
    return null;
  }

  /**
   * Validate that metadata has useful information
   */
  private isValidMetadata(metadata: TokenMetadata): boolean {
    return !!(metadata.symbol || metadata.name);
  }

  /**
   * Enrich metadata with fallback values
   */
  private enrichMetadata(metadata: TokenMetadata, address: string): TokenMetadata {
    return {
      symbol: metadata.symbol || address.substring(0, 8).toUpperCase(),
      name: metadata.name || `Token ${address.substring(0, 8)}`,
      logoUri: metadata.logoUri
    };
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): number {
    const now = Date.now();
    let cleared = 0;
    
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp >= MetadataService.CACHE_TTL) {
        this.cache.delete(key);
        cleared++;
      }
    }
    
    if (cleared > 0) {
      logger.debug(`Cleared ${cleared} expired metadata cache entries`);
    }
    
    return cleared;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: Array<{ address: string; age: number; symbol: string }> } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([address, { data, timestamp }]) => ({
      address,
      age: now - timestamp,
      symbol: data.symbol
    }));

    return {
      size: this.cache.size,
      entries
    };
  }
}
