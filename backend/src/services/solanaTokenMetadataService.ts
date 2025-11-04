/**
 * Solana Token Metadata Service
 * 
 * Fetches token metadata directly from Solana blockchain using Metaplex Token Metadata program
 * This provides more reliable data than relying only on IPFS metadata
 */

import { Connection } from '@solana/web3.js';
import fetch from 'node-fetch';
import { loggers } from '../utils/logger.js';

const logger = loggers.server;

export interface SolanaTokenMetadata {
  name?: string;
  symbol?: string;
  description?: string;
  imageUrl?: string;
  uri?: string;
  updateAuthority?: string;
  mint?: string;
}

export interface OnChainMetadata {
  name: string;
  symbol: string;
  uri: string;
  sellerFeeBasisPoints: number;
  creators?: Array<{
    address: string;
    verified: boolean;
    share: number;
  }>;
}

class SolanaTokenMetadataService {
  private connection: Connection;
  private ipfsGateways = [
    'https://ipfs.io/ipfs/',
    'https://cloudflare-ipfs.com/ipfs/',
    'https://gateway.pinata.cloud/ipfs/',
  ];

  constructor() {
    // Use Helius RPC for metadata queries (DAS API requires Helius endpoint)
    const rpcUrl = process.env.HELIUS_RPC_URL || process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com';
    this.connection = new Connection(rpcUrl, 'confirmed');

    // Warn if using standard Solana RPC (DAS API won't work)
    if (!rpcUrl.includes('helius')) {
      console.warn('[SolanaTokenMetadataService] Warning: Not using Helius RPC endpoint. DAS API methods will not work. Set HELIUS_RPC_URL or SOLANA_RPC to a Helius endpoint.');
    }
  }

  /**
   * Fetch on-chain metadata for a token mint using Helius DAS API
   */
  async fetchOnChainMetadata(mintAddress: string): Promise<OnChainMetadata | null> {
    try {
      // Use Helius DAS API to get metadata
      const response = await fetch(`${this.connection.rpcEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'metadata-fetch',
          method: 'getAsset',
          params: {
            id: mintAddress,
            options: {
              showFungible: true  // Required for plain SPL tokens without Metaplex metadata
            }
          }
        })
      });

      if (!response.ok) {
        logger.debug(`Helius DAS API error for ${mintAddress}: ${response.status}`);
        return null;
      }

      const data = await response.json() as any;

      if (data.error || !data.result) {
        logger.debug(`No asset data found for ${mintAddress}`);
        return null;
      }

      const asset = data.result;

      // Extract metadata from the DAS response
      return this.parseAssetMetadata(asset);
    } catch (error: any) {
      logger.error({ mintAddress, error: error?.message || String(error) }, 'Error fetching on-chain metadata');
      return null;
    }
  }

  /**
   * Parse asset metadata from Helius DAS response
   */
  private parseAssetMetadata(asset: any): OnChainMetadata {
    return {
      name: asset.content?.metadata?.name || '',
      symbol: asset.content?.metadata?.symbol || '',
      uri: asset.content?.json_uri || '',
      sellerFeeBasisPoints: asset.royalty?.basis_points || 0,
      creators: asset.creators?.map((creator: any) => ({
        address: creator.address,
        verified: creator.verified,
        share: creator.share
      }))
    };
  }

  /**
   * Fetch metadata from URI (usually IPFS)
   */
  async fetchMetadataFromURI(uri: string): Promise<Partial<SolanaTokenMetadata>> {
    if (!uri) return {};

    // Convert IPFS URI to HTTP gateway URL
    let httpUrl = uri;
    if (uri.startsWith('ipfs://')) {
      const ipfsHash = uri.replace('ipfs://', '');
      httpUrl = `${this.ipfsGateways[0]}${ipfsHash}`;
    }

    // Try each gateway until one succeeds
    for (const gateway of this.ipfsGateways) {
      try {
        const gatewayUrl = uri.startsWith('ipfs://') 
          ? `${gateway}${uri.replace('ipfs://', '')}`
          : httpUrl;

        const response = await fetch(gatewayUrl, {
          signal: AbortSignal.timeout(5000),
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'SolSim/1.0'
          }
        });

        if (!response.ok) {
          continue; // Try next gateway
        }

        const metadata = await response.json() as any;
        
        return {
          description: metadata.description || metadata.desc,
          imageUrl: this.normalizeImageUrl(metadata.image || metadata.logo || metadata.icon),
        };
      } catch (error) {
        // Continue to next gateway
        continue;
      }
    }

    logger.debug(`Failed to fetch metadata from URI: ${uri}`);
    return {};
  }

  /**
   * Get complete token metadata combining on-chain and off-chain data
   */
  async getCompleteTokenMetadata(mintAddress: string): Promise<SolanaTokenMetadata> {
    try {
      // First, fetch on-chain metadata
      const onChainMetadata = await this.fetchOnChainMetadata(mintAddress);
      
      if (!onChainMetadata) {
        logger.debug(`No on-chain metadata found for ${mintAddress}`);
        return { mint: mintAddress };
      }

      // Then fetch off-chain metadata from URI
      const offChainMetadata = onChainMetadata.uri 
        ? await this.fetchMetadataFromURI(onChainMetadata.uri)
        : {};

      // Combine all metadata
      const completeMetadata: SolanaTokenMetadata = {
        mint: mintAddress,
        name: onChainMetadata.name || undefined,
        symbol: onChainMetadata.symbol || undefined,
        uri: onChainMetadata.uri || undefined,
        description: offChainMetadata.description,
        imageUrl: offChainMetadata.imageUrl,
      };

      // Remove empty strings and replace with undefined
      Object.keys(completeMetadata).forEach(key => {
        if (completeMetadata[key as keyof SolanaTokenMetadata] === '') {
          completeMetadata[key as keyof SolanaTokenMetadata] = undefined;
        }
      });

      logger.debug({
        mint: mintAddress,
        hasName: !!completeMetadata.name,
        hasSymbol: !!completeMetadata.symbol,
        hasDescription: !!completeMetadata.description,
        hasImage: !!completeMetadata.imageUrl
      }, 'Fetched complete token metadata');

      return completeMetadata;
    } catch (error: any) {
      logger.error({ mintAddress, error: error?.message || String(error) }, 'Error getting complete token metadata');
      return { mint: mintAddress };
    }
  }

  /**
   * Normalize image URL (convert IPFS to HTTP if needed)
   */
  private normalizeImageUrl(imageUrl: string | undefined): string | undefined {
    if (!imageUrl) return undefined;

    if (imageUrl.startsWith('ipfs://')) {
      const ipfsHash = imageUrl.replace('ipfs://', '');
      return `${this.ipfsGateways[0]}${ipfsHash}`;
    }

    return imageUrl;
  }

  /**
   * Batch fetch metadata for multiple tokens using getAssetBatch (optimized)
   * Uses Helius getAssetBatch endpoint which is 90% more efficient than individual calls
   */
  async batchFetchMetadata(mintAddresses: string[]): Promise<Map<string, SolanaTokenMetadata>> {
    const results = new Map<string, SolanaTokenMetadata>();

    // Process in batches of 100 (getAssetBatch supports up to 1,000)
    // Using 100 to balance performance with rate limits
    const batchSize = 100;

    for (let i = 0; i < mintAddresses.length; i += batchSize) {
      const batch = mintAddresses.slice(i, i + batchSize);

      try {
        // Use getAssetBatch for efficient batch processing
        const response = await fetch(`${this.connection.rpcEndpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 'batch-metadata-fetch',
            method: 'getAssetBatch',
            params: {
              ids: batch
            }
          })
        });

        if (!response.ok) {
          logger.error({ batchSize: batch.length, status: response.status }, 'Helius getAssetBatch API error');
          // Fallback: mark all as failed with empty metadata
          batch.forEach(mint => results.set(mint, { mint }));
          continue;
        }

        const data = await response.json() as any;

        if (data.error || !data.result) {
          logger.error({ batchSize: batch.length, error: data.error }, 'No batch asset data returned');
          batch.forEach(mint => results.set(mint, { mint }));
          continue;
        }

        // Process all assets from batch response
        if (Array.isArray(data.result)) {
          for (const asset of data.result) {
            if (!asset || !asset.id) continue;

            const mint = asset.id;

            try {
              // Parse on-chain metadata
              const onChainMetadata = this.parseAssetMetadata(asset);

              // Fetch off-chain metadata from URI if available
              const offChainMetadata = onChainMetadata.uri
                ? await this.fetchMetadataFromURI(onChainMetadata.uri)
                : {};

              // Combine metadata
              const completeMetadata: SolanaTokenMetadata = {
                mint,
                name: onChainMetadata.name || undefined,
                symbol: onChainMetadata.symbol || undefined,
                uri: onChainMetadata.uri || undefined,
                description: offChainMetadata.description,
                imageUrl: offChainMetadata.imageUrl,
              };

              // Remove empty strings
              Object.keys(completeMetadata).forEach(key => {
                if (completeMetadata[key as keyof SolanaTokenMetadata] === '') {
                  completeMetadata[key as keyof SolanaTokenMetadata] = undefined;
                }
              });

              results.set(mint, completeMetadata);
            } catch (error) {
              logger.error({ mint, error }, 'Error processing individual asset from batch');
              results.set(mint, { mint });
            }
          }
        }

        logger.debug({
          batchSize: batch.length,
          processedCount: data.result?.length || 0
        }, 'Batch metadata fetch completed');

      } catch (error) {
        logger.error({ batchSize: batch.length, error }, 'Error in batch metadata fetch');
        // Mark all as failed with empty metadata
        batch.forEach(mint => results.set(mint, { mint }));
      }

      // Small delay between batches to be respectful to RPC
      if (i + batchSize < mintAddresses.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  /**
   * Check if token has metadata available
   */
  async hasMetadataAccount(mintAddress: string): Promise<boolean> {
    try {
      const metadata = await this.fetchOnChainMetadata(mintAddress);
      return metadata !== null;
    } catch (error) {
      return false;
    }
  }
}

// Singleton instance
export const solanaTokenMetadataService = new SolanaTokenMetadataService();