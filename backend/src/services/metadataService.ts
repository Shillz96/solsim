import { logger } from '../utils/logger';

interface TokenMetadata {
  symbol: string;
  name: string;
  logoUri: string | null;
}

export class MetadataService {
  private cache = new Map<string, { data: TokenMetadata; timestamp: number }>();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get token metadata with simple DexScreener fetch and fallback
   */
  async getMetadata(address: string): Promise<TokenMetadata> {
    // Check cache first
    const cached = this.cache.get(address);
    if (cached && Date.now() - cached.timestamp < MetadataService.CACHE_TTL) {
      return cached.data;
    }

    try {
      // Try DexScreener only
      const response = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${address}`,
        { 
          signal: AbortSignal.timeout(2000), // 2 second timeout
          headers: { 'Accept': 'application/json' }
        }
      );

      if (response.ok) {
        const data = await response.json() as any;
        const pair = data.pairs?.[0];
        
        if (pair) {
          const metadata: TokenMetadata = {
            symbol: pair.baseToken?.symbol || address.substring(0, 8).toUpperCase(),
            name: pair.baseToken?.name || `Token ${address.substring(0, 8)}`,
            logoUri: pair.info?.imageUrl || null
          };
          
          this.cache.set(address, { data: metadata, timestamp: Date.now() });
          return metadata;
        }
      }
    } catch (error) {
      logger.debug(`Metadata fetch failed for ${address.substring(0, 8)}...`);
    }

    // Fallback metadata
    const fallback: TokenMetadata = {
      symbol: address.substring(0, 8).toUpperCase(),
      name: `Token ${address.substring(0, 8)}`,
      logoUri: null
    };
    
    this.cache.set(address, { data: fallback, timestamp: Date.now() });
    return fallback;
  }
}
