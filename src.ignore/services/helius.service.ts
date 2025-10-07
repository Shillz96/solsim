import axios, { AxiosInstance } from 'axios';
import config from '../config/env';
import logger from '../utils/logger';
import { sleep } from '../utils/helpers';

class HeliusService {
  private apiKey: string;
  private rpcUrl: string;
  private axiosInstance: AxiosInstance;

  constructor() {
    this.apiKey = config.HELIUS_API_KEY;
    this.rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${this.apiKey}`;
    this.axiosInstance = axios.create({
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async getTransactionHistory(walletAddress: string, before?: string): Promise<any[]> {
    try {
      const response = await this.axiosInstance.post(this.rpcUrl, {
        jsonrpc: '2.0',
        id: 'helius-tx-history',
        method: 'getSignaturesForAddress',
        params: [
          walletAddress,
          {
            limit: 100,
            ...(before ? { before } : {})
          }
        ]
      });

      if (response.data.error) {
        throw new Error(response.data.error.message);
      }

      const signatures = response.data.result || [];
      if (signatures.length === 0) return [];

      // Get parsed transactions
      const parsedTxs = await this.getParsedTransactions(signatures.map((s: any) => s.signature));
      return parsedTxs;
    } catch (error: any) {
      logger.error(`Failed to fetch transactions: ${error.message}`);
      throw error;
    }
  }

  async getParsedTransactions(signatures: string[]): Promise<any[]> {
    const parsedTxs: any[] = [];

    // Fetch transactions sequentially to avoid rate limits
    for (const sig of signatures) {
      const tx = await this.getParsedTransaction(sig);
      if (tx !== null) {
        parsedTxs.push(tx);
      }
      await sleep(200); // 200ms delay between requests
    }

    return parsedTxs;
  }

  async getParsedTransaction(signature: string): Promise<any | null> {
    try {
      const response = await this.axiosInstance.post(this.rpcUrl, {
        jsonrpc: '2.0',
        id: 'helius-parsed-tx',
        method: 'getTransaction',
        params: [
          signature,
          {
            encoding: 'jsonParsed',
            maxSupportedTransactionVersion: 0
          }
        ]
      });

      if (response.data.error) {
        // Don't spam logs with every error
        return null;
      }

      return response.data.result;
    } catch (error: any) {
      // Only log rate limit errors once, suppress 429 spam
      if (error.response?.status === 429) {
        // Return null to signal rate limit (caller handles)
        return null;
      }
      // Log other errors at debug level only
      return null;
    }
  }

  async getRecentTransactions(walletAddress: string, limit: number = 10): Promise<any[]> {
    logger.info(`Fetching recent ${limit} transactions for wallet...`);

    try {
      // Get signatures
      const response = await this.axiosInstance.post(this.rpcUrl, {
        jsonrpc: '2.0',
        id: 'helius-recent-sigs',
        method: 'getSignaturesForAddress',
        params: [walletAddress, { limit }]
      });

      if (response.data.error) {
        throw new Error(response.data.error.message);
      }

      const signatures = response.data.result || [];
      if (signatures.length === 0) {
        logger.info('No recent transactions found');
        return [];
      }

      logger.info(`Found ${signatures.length} recent signatures`);

      // Get parsed transactions (sequentially with longer delay to avoid rate limits)
      const transactions: any[] = [];
      let consecutiveFailures = 0;
      const MAX_CONSECUTIVE_FAILURES = 3; // Stop after 3 failed fetches in a row

      for (const sig of signatures) {
        // Stop if we hit too many failures (likely rate limited)
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          logger.warning(`⚠️  Rate limit detected - stopping early (fetched ${transactions.length}/${signatures.length})`);
          break;
        }

        const tx = await this.getParsedTransaction(sig.signature);
        if (tx !== null) {
          transactions.push(tx);
          consecutiveFailures = 0; // Reset on success
        } else {
          consecutiveFailures++;
        }

        await sleep(300); // 300ms between requests to respect rate limits
      }

      if (transactions.length > 0) {
        logger.success(`Fetched ${transactions.length} recent transactions`);
      }
      return transactions;
    } catch (error: any) {
      logger.error(`Error fetching recent transactions: ${error.message}`);
      return [];
    }
  }

  async getAllTransactions(walletAddress: string): Promise<any[]> {
    const allTransactions: any[] = [];
    let before: string | undefined;
    let pageCount = 0;
    const MAX_PAGES = 100;

    logger.info(`Fetching all transactions for wallet: ${walletAddress}`);

    while (pageCount < MAX_PAGES) {
      try {
        const transactions = await this.getTransactionHistory(walletAddress, before);
        if (transactions.length === 0) break;

        allTransactions.push(...transactions);
        pageCount++;

        logger.debug(`Fetched page ${pageCount}: ${transactions.length} transactions (Total: ${allTransactions.length})`);

        const lastTx = transactions[transactions.length - 1];
        before = lastTx?.transaction?.signatures?.[0];
        await sleep(100);
      } catch (error: any) {
        logger.error(`Error fetching page ${pageCount}: ${error.message}`);
        break;
      }
    }

    logger.success(`Fetched total of ${allTransactions.length} transactions`);
    return allTransactions;
  }
}

export default new HeliusService();
