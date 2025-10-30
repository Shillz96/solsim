/**
 * Token Metadata Service
 *
 * Fetches and enriches token metadata from multiple sources:
 * 1. IPFS metadata (description, social links, image)
 * 2. DexScreener (market cap, volume, price, transactions)
 */

import fetch from 'node-fetch';

export interface TokenMetadata {
  description?: string;
  imageUrl?: string;
  twitter?: string;
  telegram?: string;
  website?: string;
}

export interface MarketData {
  marketCapUsd?: number;
  volume24h?: number;
  volumeChange24h?: number;
  priceUsd?: number;
  priceChange24h?: number;
  txCount24h?: number;
}

class TokenMetadataService {
  private dexScreenerBase = 'https://api.dexscreener.com/latest';
  private ipfsGateways = [
    'https://ipfs.io/ipfs/',
    'https://cloudflare-ipfs.com/ipfs/',
    'https://gateway.pinata.cloud/ipfs/',
  ];

  /**
   * Fetch metadata from IPFS URI with fallback gateway support
   */
  async fetchMetadataFromIPFS(uri: string): Promise<TokenMetadata> {
    if (!uri) return {};

    // Convert IPFS URI to hash
    let ipfsHash = uri;
    if (uri.startsWith('ipfs://')) {
      ipfsHash = uri.replace('ipfs://', '');
    } else if (!uri.startsWith('http')) {
      // Already a hash
      ipfsHash = uri;
    } else {
      // It's already a full URL, use directly
      return await this.fetchFromSingleGateway(uri);
    }

    // Try each gateway in sequence until one succeeds
    let lastError: Error | null = null;
    for (const gateway of this.ipfsGateways) {
      try {
        const metadataUrl = `${gateway}${ipfsHash}`;
        return await this.fetchFromSingleGateway(metadataUrl);
      } catch (error: any) {
        lastError = error;
        // Continue to next gateway
        continue;
      }
    }

    // All gateways failed
    const isExpectedError =
      (lastError as any)?.code === 'ENOTFOUND' ||
      lastError?.name === 'AbortError' ||
      lastError?.name === 'TimeoutError' ||
      lastError?.message?.includes('404') ||
      lastError?.message?.includes('fetch failed');

    if (!isExpectedError) {
      console.error('[TokenMetadata] All IPFS gateways failed:', lastError?.message);
    }
    return {};
  }

  /**
   * Fetch from a single IPFS gateway
   */
  private async fetchFromSingleGateway(metadataUrl: string): Promise<TokenMetadata> {
    const response = await fetch(metadataUrl, {
      signal: AbortSignal.timeout(5000), // Reduced from 8s for faster fallback
    });

    if (!response.ok) {
      throw new Error(`IPFS fetch failed: ${response.status}`);
    }

    const metadata = await response.json() as any;

    // Extract social links from various formats
    const twitter = this.extractTwitter(metadata);
    const telegram = this.extractTelegram(metadata);
    const website = this.extractWebsite(metadata);
    const description = metadata.description || metadata.desc || undefined;
    const imageUrl = this.extractImageUrl(metadata);

    return {
      description,
      imageUrl,
      twitter,
      telegram,
      website,
    };
  }

  /**
   * Fetch market data from DexScreener
   * Re-enabled with proper rate limiting (50ms delay configured in worker)
   */
  async fetchMarketData(mint: string): Promise<MarketData> {
    try {
      const response = await fetch(`${this.dexScreenerBase}/dex/tokens/${mint}`, {
        signal: AbortSignal.timeout(8000),
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'SolSim/1.0'
        }
      });

      if (!response.ok) {
        // Log ALL errors with status code for debugging
        console.error(`[TokenMetadata] DexScreener API error for ${mint.slice(0, 8)}: ${response.status} ${response.statusText}`);
        if (response.status === 429) {
          console.warn(`[TokenMetadata] RATE LIMITED by DexScreener`);
        }
        return {};
      }

      const data = await response.json() as any;
      
      // DexScreener returns { pairs: [...] }
      // Find the best pair (highest liquidity or volume)
      const pairs = data?.pairs || [];
      if (pairs.length === 0) {
        console.warn(`[TokenMetadata] No pairs found for ${mint.slice(0, 8)}`);
        return {};
      }

      // Sort by liquidity USD descending, take first pair
      const sortedPairs = pairs.sort((a: any, b: any) => 
        (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
      );
      const bestPair = sortedPairs[0];

      const marketData = {
        marketCapUsd: bestPair.marketCap || bestPair.fdv, // ✅ FIX: Prioritize actual marketCap over FDV
        volume24h: bestPair.volume?.h24,
        priceUsd: parseFloat(bestPair.priceUsd || '0'),
        priceChange24h: bestPair.priceChange?.h24,
        txCount24h: bestPair.txns?.h24?.buys + bestPair.txns?.h24?.sells || undefined,
      };

      // Log successful fetch
      console.log(`[TokenMetadata] Fetched market data for ${mint.slice(0, 8)}: vol=$${marketData.volume24h?.toFixed(0)}, price_chg=${marketData.priceChange24h?.toFixed(2)}%`);

      return marketData;
    } catch (error: any) {
      // Log ALL errors for debugging
      console.error(`[TokenMetadata] Error fetching market data for ${mint.slice(0, 8)}:`, {
        name: error.name,
        message: error.message,
        code: error.code
      });
      return {};
    }
  }

  /**
   * Extract Twitter handle from metadata
   */
  private extractTwitter(metadata: any): string | undefined {
    // Check various possible fields
    if (metadata.twitter) {
      return this.normalizeTwitterUrl(metadata.twitter);
    }
    if (metadata.socials?.twitter) {
      return this.normalizeTwitterUrl(metadata.socials.twitter);
    }
    if (metadata.extensions?.twitter) {
      return this.normalizeTwitterUrl(metadata.extensions.twitter);
    }
    return undefined;
  }

  /**
   * Extract Telegram link from metadata
   */
  private extractTelegram(metadata: any): string | undefined {
    if (metadata.telegram) {
      return this.normalizeTelegramUrl(metadata.telegram);
    }
    if (metadata.socials?.telegram) {
      return this.normalizeTelegramUrl(metadata.socials.telegram);
    }
    if (metadata.extensions?.telegram) {
      return this.normalizeTelegramUrl(metadata.extensions.telegram);
    }
    return undefined;
  }

  /**
   * Extract website from metadata
   */
  private extractWebsite(metadata: any): string | undefined {
    if (metadata.website) {
      return this.normalizeUrl(metadata.website);
    }
    if (metadata.socials?.website) {
      return this.normalizeUrl(metadata.socials.website);
    }
    if (metadata.extensions?.website) {
      return this.normalizeUrl(metadata.extensions.website);
    }
    return undefined;
  }

  /**
   * Extract image URL from metadata
   */
  private extractImageUrl(metadata: any): string | undefined {
    let imageUrl = metadata.image || metadata.logo || metadata.icon;

    if (!imageUrl) return undefined;

    // Convert IPFS URI to HTTP gateway URL
    if (imageUrl.startsWith('ipfs://')) {
      const ipfsHash = imageUrl.replace('ipfs://', '');
      imageUrl = `${this.ipfsGateways[0]}${ipfsHash}`;
    }

    return imageUrl;
  }

  /**
   * Normalize Twitter URL
   */
  private normalizeTwitterUrl(url: string): string {
    if (!url) return '';

    // Remove trailing slashes and normalize
    url = url.trim().replace(/\/$/, '');

    // Already a full URL
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    // Handle @username format
    if (url.startsWith('@')) {
      return `https://twitter.com/${url.substring(1)}`;
    }

    // Handle plain username
    if (!url.includes('/') && !url.includes('.')) {
      return `https://twitter.com/${url}`;
    }

    // Assume it's already formatted correctly
    return url;
  }

  /**
   * Normalize Telegram URL
   */
  private normalizeTelegramUrl(url: string): string {
    if (!url) return '';

    url = url.trim().replace(/\/$/, '');

    // Already a full URL
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    // Handle @username format
    if (url.startsWith('@')) {
      return `https://t.me/${url.substring(1)}`;
    }

    // Handle plain username
    if (!url.includes('/') && !url.includes('.')) {
      return `https://t.me/${url}`;
    }

    return url;
  }

  /**
   * Normalize generic URL
   */
  private normalizeUrl(url: string): string {
    if (!url) return '';

    url = url.trim();

    // Add https:// if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }

    return url;
  }

  /**
   * Get complete enriched metadata for a token
   */
  async getEnrichedMetadata(
    mint: string,
    metadataUri?: string
  ): Promise<TokenMetadata & MarketData> {
    const [metadata, marketData] = await Promise.allSettled([
      metadataUri ? this.fetchMetadataFromIPFS(metadataUri) : Promise.resolve({}),
      this.fetchMarketData(mint),
    ]);

    return {
      ...(metadata.status === 'fulfilled' ? metadata.value : {}),
      ...(marketData.status === 'fulfilled' ? marketData.value : {}),
    };
  }
}

// Singleton instance
export const tokenMetadataService = new TokenMetadataService();
