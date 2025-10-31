/**
 * Holder Count Service
 * Fetches on-chain holder counts using Helius RPC getTokenLargestAccounts
 */

import { robustFetch } from '../utils/fetch.js';

interface HeliusRpcResponse<T> {
  jsonrpc: string;
  result: T;
  id: number;
  error?: {
    code: number;
    message: string;
  };
}

interface TokenAccount {
  address: string;
  amount: string;
  decimals: number;
  uiAmount: number;
  uiAmountString: string;
}

interface TokenAccountsResponse {
  context: { slot: number };
  value: TokenAccount[];
}

export class HolderCountService {
  private heliusRpcUrl: string;

  constructor() {
    const heliusApiKey = process.env.HELIUS_API;
    if (!heliusApiKey) {
      throw new Error('HELIUS_API environment variable required for HolderCountService');
    }
    // URL format: no trailing slash after the API key
    this.heliusRpcUrl = `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`;
  }

  /**
   * Fetch holder count for a token mint using Helius RPC getProgramAccounts
   * This queries all token accounts for the mint, filters by balance > 0, and dedupes by owner
   */
  async getHolderCount(mint: string): Promise<number | null> {
    try {
      // Use getProgramAccounts to get ALL token accounts for this mint
      // Filter for non-zero balances and dedupe by owner address
      const response = await robustFetch(this.heliusRpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getProgramAccounts',
          params: [
            'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', // SPL Token Program
            {
              encoding: 'jsonParsed',
              filters: [
                { dataSize: 165 }, // Token account size
                { memcmp: { offset: 0, bytes: mint } }, // Filter by mint address
              ],
              commitment: 'finalized',
            },
          ],
        }),
      });

      if (!response.ok) {
        console.warn(`[HolderCount] Helius returned ${response.status} for ${mint}`);
        return null;
      }

      const data = await response.json() as HeliusRpcResponse<any[]>;
      
      if (data.error) {
        console.warn(`[HolderCount] Helius error for ${mint}:`, data.error.message);
        return null;
      }

      // Parse response: filter for non-zero balances and dedupe by owner
      const accounts = data.result || [];
      const uniqueOwners = new Set<string>();

      for (const account of accounts) {
        const tokenInfo = account.account?.data?.parsed?.info;
        if (!tokenInfo) continue;

        const balance = parseFloat(tokenInfo.tokenAmount?.uiAmountString || '0');
        const owner = tokenInfo.owner;

        if (balance > 0 && owner) {
          uniqueOwners.add(owner);
        }
      }

      const holderCount = uniqueOwners.size;
      console.log(`[HolderCount] ${mint}: ${holderCount} holders with balance > 0`);
      return holderCount;
    } catch (error) {
      console.error(`[HolderCount] Error fetching holder count for ${mint}:`, error);
      return null;
    }
  }

  /**
   * Get top holders for a quick widget (top 20 accounts)
   * Uses getTokenLargestAccounts which is faster than getProgramAccounts
   */
  async getTopHolders(mint: string): Promise<TokenAccount[]> {
    try {
      const response = await robustFetch(this.heliusRpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getTokenLargestAccounts',
          params: [mint, { commitment: 'finalized' }],
        }),
      });

      if (!response.ok) {
        console.warn(`[HolderCount] Helius returned ${response.status} for top holders ${mint}`);
        return [];
      }

      const data = await response.json() as HeliusRpcResponse<TokenAccountsResponse>;
      
      if (data.error) {
        console.warn(`[HolderCount] Helius error for top holders ${mint}:`, data.error.message);
        return [];
      }

      const accounts = data.result?.value || [];
      return accounts.filter(acc => parseFloat(acc.amount) > 0);
    } catch (error) {
      console.error(`[HolderCount] Error fetching top holders for ${mint}:`, error);
      return [];
    }
  }

  /**
   * Get token supply and decimals from Helius RPC
   * Uses getTokenSupply method which returns total supply and decimals
   */
  async getTokenSupply(mint: string): Promise<{
    totalSupply: string;
    decimals: number;
  } | null> {
    try {
      const response = await robustFetch(this.heliusRpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'token-supply',
          method: 'getTokenSupply',
          params: [mint]
        })
      });

      if (!response.ok) {
        console.warn(`[HolderCount] Helius returned ${response.status} for supply ${mint}`);
        return null;
      }

      const data = await response.json() as HeliusRpcResponse<{
        context: { slot: number };
        value: {
          amount: string;
          decimals: number;
          uiAmount: number;
          uiAmountString: string;
        };
      }>;

      if (data.error) {
        console.warn(`[HolderCount] Helius error for supply ${mint}:`, data.error.message);
        return null;
      }

      if (data.result?.value) {
        return {
          totalSupply: data.result.value.amount,
          decimals: data.result.value.decimals
        };
      }

      return null;
    } catch (error) {
      console.error(`[HolderCount] Error fetching token supply for ${mint}:`, error);
      return null;
    }
  }

  /**
   * Batch fetch holder counts for multiple mints
   */
  async getHolderCounts(mints: string[]): Promise<Map<string, number | null>> {
    const results = new Map<string, number | null>();

    // Process in parallel with concurrency limit
    const concurrency = 5;
    for (let i = 0; i < mints.length; i += concurrency) {
      const batch = mints.slice(i, i + concurrency);
      const promises = batch.map(async (mint) => {
        const count = await this.getHolderCount(mint);
        results.set(mint, count);
      });
      await Promise.all(promises);
    }

    return results;
  }
}

export const holderCountService = new HolderCountService();
