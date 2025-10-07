import axios from 'axios';
import config from '../config/env';
import logger from '../utils/logger';

interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
}

class TokenMetadataService {
  private rpcUrl: string;
  private cache: Map<string, TokenMetadata>;

  constructor() {
    this.rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${config.HELIUS_API_KEY}`;
    this.cache = new Map();
  }

  async getTokenMetadata(mintAddress: string): Promise<TokenMetadata | null> {
    // Check cache first
    if (this.cache.has(mintAddress)) {
      return this.cache.get(mintAddress)!;
    }

    try {
      const response = await axios.post(this.rpcUrl, {
        jsonrpc: '2.0',
        id: 'token-metadata',
        method: 'getAccountInfo',
        params: [
          mintAddress,
          {
            encoding: 'jsonParsed'
          }
        ]
      });

      if (response.data.error || !response.data.result?.value) {
        return null;
      }

      const accountData = response.data.result.value.data;

      if (accountData.parsed?.info) {
        const info = accountData.parsed.info;

        // Try to get metadata from extensions (Token-2022)
        let name = null;
        let symbol = null;

        if (info.extensions) {
          const metadata = info.extensions.find((ext: any) => ext.extension === 'tokenMetadata');
          if (metadata) {
            name = metadata.state?.name;
            symbol = metadata.state?.symbol;
          }
        }

        const tokenData: TokenMetadata = {
          name: (name || `Token ${mintAddress.slice(0, 4)}...${mintAddress.slice(-4)}`).trim(),
          symbol: (symbol || mintAddress.slice(0, 6).toUpperCase()).trim(),
          decimals: info.decimals || 9,
        };

        this.cache.set(mintAddress, tokenData);
        return tokenData;
      }

      return null;
    } catch (error: any) {
      logger.debug(`Failed to fetch metadata for ${mintAddress}: ${error.message}`);
      return null;
    }
  }

  async getTokenMetadataFromJupiter(mintAddress: string): Promise<TokenMetadata | null> {
    try {
      // Jupiter Token List API (more complete)
      const response = await axios.get('https://token.jup.ag/strict');
      const tokens = response.data;

      const token = tokens.find((t: any) => t.address === mintAddress);

      if (token) {
        const metadata: TokenMetadata = {
          name: (token.name || '').trim(),
          symbol: (token.symbol || '').trim(),
          decimals: token.decimals,
          logoURI: token.logoURI
        };

        this.cache.set(mintAddress, metadata);
        return metadata;
      }

      return null;
    } catch (error: any) {
      logger.debug(`Failed to fetch Jupiter metadata: ${error.message}`);
      return null;
    }
  }

  async getMetadataFromDexScreener(mintAddress: string): Promise<TokenMetadata | null> {
    try {
      const response = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${mintAddress}`, {
        timeout: 5000
      });

      if (response.data?.pairs && response.data.pairs.length > 0) {
        // Get the pair with highest liquidity
        const sortedPairs = response.data.pairs.sort((a: any, b: any) =>
          (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
        );

        const token = sortedPairs[0].baseToken;
        if (token && token.address.toLowerCase() === mintAddress.toLowerCase()) {
          const metadata: TokenMetadata = {
            name: (token.name || token.symbol || '').trim(),
            symbol: (token.symbol || mintAddress.slice(0, 6).toUpperCase()).trim(),
            decimals: 9, // DexScreener doesn't provide decimals
          };

          this.cache.set(mintAddress, metadata);
          return metadata;
        }
      }

      return null;
    } catch (error: any) {
      logger.debug(`Failed to fetch DexScreener metadata: ${error.message}`);
      return null;
    }
  }

  async getMetadata(mintAddress: string): Promise<TokenMetadata | null> {
    // Try cache first
    if (this.cache.has(mintAddress)) {
      return this.cache.get(mintAddress)!;
    }

    // Try DexScreener first (works for pump.fun tokens)
    let metadata = await this.getMetadataFromDexScreener(mintAddress);

    if (!metadata) {
      // Try Jupiter token list
      metadata = await this.getTokenMetadataFromJupiter(mintAddress);
    }

    if (!metadata) {
      // Fallback to on-chain data
      metadata = await this.getTokenMetadata(mintAddress);
    }

    return metadata;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export default new TokenMetadataService();
