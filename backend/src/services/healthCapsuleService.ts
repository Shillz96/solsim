/**
 * Health Capsule Enrichment Service
 *
 * Computes health metrics for tokens:
 * 1. Freeze/Mint authority status (via Solana RPC)
 * 2. Price impact for reference swap (via Jupiter)
 * 3. Liquidity (via DexScreener or pool account)
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { getMint } from '@solana/spl-token';
import fetch from 'node-fetch';

export interface HealthData {
  freezeRevoked: boolean;
  mintRenounced: boolean;
  priceImpact1Pct?: number; // Price impact as percentage
  liquidityUsd?: number;
}

class HealthCapsuleService {
  private connection: Connection;
  private jupiterApiBase = 'https://quote-api.jup.ag/v6';
  private dexScreenerBase = 'https://api.dexscreener.com/latest';

  constructor() {
    const rpcUrl = process.env.HELIUS_RPC_URL || process.env.SOLANA_RPC || '';
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  /**
   * Get complete health data for a token
   */
  async getHealthData(mint: string): Promise<HealthData> {
    try {
      const [authorityStatus, priceImpact, liquidity] = await Promise.allSettled([
        this.checkAuthorities(mint),
        this.getPriceImpact(mint),
        this.getLiquidity(mint),
      ]);

      return {
        freezeRevoked: authorityStatus.status === 'fulfilled' ? authorityStatus.value.freezeRevoked : false,
        mintRenounced: authorityStatus.status === 'fulfilled' ? authorityStatus.value.mintRenounced : false,
        priceImpact1Pct: priceImpact.status === 'fulfilled' ? priceImpact.value : undefined,
        liquidityUsd: liquidity.status === 'fulfilled' ? liquidity.value : undefined,
      };
    } catch (error) {
      console.error('[HealthCapsule] Error getting health data:', error);
      return {
        freezeRevoked: false,
        mintRenounced: false,
      };
    }
  }

  /**
   * Check if freeze and mint authorities are revoked
   */
  async checkAuthorities(mint: string): Promise<{ freezeRevoked: boolean; mintRenounced: boolean }> {
    try {
      const mintPubkey = new PublicKey(mint);
      const mintInfo = await getMint(this.connection, mintPubkey, 'confirmed');

      return {
        freezeRevoked: mintInfo.freezeAuthority === null,
        mintRenounced: mintInfo.mintAuthority === null,
      };
    } catch (error) {
      console.error('[HealthCapsule] Error checking authorities for', mint, ':', error);
      return {
        freezeRevoked: false,
        mintRenounced: false,
      };
    }
  }

  /**
   * Get price impact for a reference swap (1% of typical trade size)
   * Uses Jupiter quote API
   */
  async getPriceImpact(mint: string): Promise<number | undefined> {
    try {
      // Get quote for 1 SOL → token
      const SOL_MINT = 'So11111111111111111111111111111111111111112';
      const amount = 1_000_000_000; // 1 SOL in lamports

      const params = new URLSearchParams({
        inputMint: SOL_MINT,
        outputMint: mint,
        amount: amount.toString(),
        slippageBps: '50', // 0.5%
      });

      const quoteUrl = `${this.jupiterApiBase}/quote?${params.toString()}`;

      const response = await fetch(quoteUrl, {
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`Jupiter API error: ${response.status}`);
      }

      const quote = await response.json() as any;

      if (quote.priceImpactPct !== undefined) {
        // Jupiter returns price impact as decimal (0.01 = 1%)
        return Math.abs(parseFloat(quote.priceImpactPct));
      }

      // Fallback: estimate from in/out amounts if no explicit price impact
      if (quote.inAmount && quote.outAmount) {
        const expectedOut = parseFloat(quote.inAmount);
        const actualOut = parseFloat(quote.outAmount);
        const impact = ((expectedOut - actualOut) / expectedOut) * 100;
        return Math.abs(impact);
      }

      return undefined;
    } catch (error) {
      console.error('[HealthCapsule] Error getting price impact for', mint, ':', error);
      return undefined;
    }
  }

  /**
   * Get liquidity in USD from DexScreener
   */
  async getLiquidity(mint: string): Promise<number | undefined> {
    try {
      const url = `${this.dexScreenerBase}/dex/tokens/${mint}`;

      const response = await fetch(url, {
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`DexScreener API error: ${response.status}`);
      }

      const data = await response.json() as any;

      // Get the pair with highest liquidity
      if (data.pairs && data.pairs.length > 0) {
        const pairs = data.pairs;

        // Sort by liquidity USD descending
        pairs.sort((a: any, b: any) => {
          const liqA = parseFloat(a.liquidity?.usd || '0');
          const liqB = parseFloat(b.liquidity?.usd || '0');
          return liqB - liqA;
        });

        const topPair = pairs[0];
        const liquidityUsd = parseFloat(topPair.liquidity?.usd || '0');

        return liquidityUsd > 0 ? liquidityUsd : undefined;
      }

      return undefined;
    } catch (error) {
      console.error('[HealthCapsule] Error getting liquidity for', mint, ':', error);
      return undefined;
    }
  }

  /**
   * Batch health check for multiple tokens
   */
  async batchGetHealthData(mints: string[]): Promise<Map<string, HealthData>> {
    const results = new Map<string, HealthData>();

    // Process in batches of 10 to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < mints.length; i += batchSize) {
      const batch = mints.slice(i, i + batchSize);
      const promises = batch.map(async (mint) => {
        const health = await this.getHealthData(mint);
        return { mint, health };
      });

      const batchResults = await Promise.all(promises);
      for (const { mint, health } of batchResults) {
        results.set(mint, health);
      }

      // Rate limit: wait 100ms between batches
      if (i + batchSize < mints.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  /**
   * Calculate pool age in minutes from block time
   */
  calculatePoolAge(blockTime: number): number {
    const now = Math.floor(Date.now() / 1000);
    const ageSeconds = now - blockTime;
    return Math.floor(ageSeconds / 60);
  }

  /**
   * Quick check - just authorities (faster than full health check)
   */
  async quickAuthCheck(mint: string): Promise<{ freezeRevoked: boolean; mintRenounced: boolean }> {
    return this.checkAuthorities(mint);
  }
}

// Singleton instance
export const healthCapsuleService = new HealthCapsuleService();
