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
   * Fetch metadata from IPFS URI
   */
  async fetchMetadataFromIPFS(uri: string): Promise<TokenMetadata> {
    if (!uri) return {};

    try {
      // Convert IPFS URI to HTTP gateway URL
      let metadataUrl = uri;
      if (uri.startsWith('ipfs://')) {
        const ipfsHash = uri.replace('ipfs://', '');
        metadataUrl = `${this.ipfsGateways[0]}${ipfsHash}`;
      }

      // Reduced verbosity - only log on success or unexpected errors
      const response = await fetch(metadataUrl, {
        signal: AbortSignal.timeout(8000),
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
    } catch (error: any) {
      // Silently skip common errors (404, timeouts, network issues)
      // Only log unexpected errors for debugging
      const isExpectedError =
        error.code === 'ENOTFOUND' ||
        error.name === 'AbortError' ||
        error.name === 'TimeoutError' ||
        error.message?.includes('404') ||
        error.message?.includes('fetch failed');

      if (!isExpectedError) {
        console.error('[TokenMetadata] Unexpected IPFS error:', error.message);
      }
      return {};
    }
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
        // Return empty object on rate limit or other errors (don't break worker)
        if (response.status === 429) {
          console.warn(`[TokenMetadata] DexScreener rate limit hit for ${mint.slice(0, 8)}...`);
        }
        return {};
      }

      const data = await response.json() as any;
      
      // DexScreener returns { pairs: [...] }
      // Find the best pair (highest liquidity or volume)
      const pairs = data?.pairs || [];
      if (pairs.length === 0) return {};

      // Sort by liquidity USD descending, take first pair
      const sortedPairs = pairs.sort((a: any, b: any) => 
        (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
      );
      const bestPair = sortedPairs[0];

      return {
        marketCapUsd: bestPair.fdv || bestPair.marketCap,
        volume24h: bestPair.volume?.h24,
        priceUsd: parseFloat(bestPair.priceUsd || '0'),
        priceChange24h: bestPair.priceChange?.h24,
        txCount24h: bestPair.txns?.h24?.buys + bestPair.txns?.h24?.sells || undefined,
      };
    } catch (error: any) {
      // Silently handle expected errors (timeouts, network issues)
      const isExpectedError =
        error.name === 'AbortError' ||
        error.name === 'TimeoutError' ||
        error.code === 'ENOTFOUND';

      if (!isExpectedError) {
        console.error(`[TokenMetadata] Unexpected error fetching market data for ${mint.slice(0, 8)}:`, error.message);
      }
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
