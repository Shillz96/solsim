import axios from 'axios';
import config from '../config/env';
import logger from '../utils/logger';
import jupiterService from './jupiter.service';
import tokenMetadataService from './token-metadata.service';

export interface TokenBalance {
  mint: string;
  symbol: string | null;
  name: string | null;
  amount: number;
  decimals: number;
  uiAmount: number;
}

// Minimum token value to be considered (filters dust)
const MIN_TOKEN_VALUE_USD = 0.01;

// Minimum token amount to be considered (filters tiny balances)
const MIN_TOKEN_AMOUNT = 0.0001;

class BalanceService {
  private rpcUrl: string;

  constructor() {
    this.rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${config.HELIUS_API_KEY}`;
  }

  async getSOLBalance(walletAddress: string): Promise<number> {
    try {
      const response = await axios.post(this.rpcUrl, {
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance',
        params: [walletAddress]
      });

      if (response.data.error) {
        throw new Error(response.data.error.message);
      }

      const lamports = response.data.result.value;
      return lamports / 1_000_000_000;
    } catch (error: any) {
      logger.error(`Failed to get SOL balance: ${error.message}`);
      return 0;
    }
  }

  async getTokenAccounts(walletAddress: string): Promise<TokenBalance[]> {
    try {
      const response = await axios.post(this.rpcUrl, {
        jsonrpc: '2.0',
        id: 1,
        method: 'getTokenAccountsByOwner',
        params: [
          walletAddress,
          { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
          { encoding: 'jsonParsed' }
        ]
      });

      if (response.data.error) {
        throw new Error(response.data.error.message);
      }

      const accounts = response.data.result.value || [];
      const balances: TokenBalance[] = [];

      for (const account of accounts) {
        const tokenInfo = account.account.data.parsed.info;
        const tokenAmount = tokenInfo.tokenAmount;

        // Filter: Only include tokens with meaningful balance
        if (tokenAmount.uiAmount > MIN_TOKEN_AMOUNT) {
          // Fetch token metadata
          const metadata = await tokenMetadataService.getMetadata(tokenInfo.mint);

          balances.push({
            mint: tokenInfo.mint,
            symbol: metadata?.symbol || null,
            name: metadata?.name || null,
            amount: parseFloat(tokenAmount.amount),
            decimals: tokenAmount.decimals,
            uiAmount: tokenAmount.uiAmount
          });
        }
      }

      return balances;
    } catch (error: any) {
      logger.error(`Failed to get token accounts: ${error.message}`);
      return [];
    }
  }

  async getAllBalances(walletAddress: string): Promise<TokenBalance[]> {
    logger.info('Fetching current wallet balances...');

    const balances: TokenBalance[] = [];

    // Get SOL balance
    const solBalance = await this.getSOLBalance(walletAddress);
    if (solBalance > MIN_TOKEN_AMOUNT) {
      balances.push({
        mint: 'So11111111111111111111111111111111111111112',
        symbol: 'SOL',
        name: 'Solana',
        amount: solBalance * 1_000_000_000,
        decimals: 9,
        uiAmount: solBalance
      });
      logger.success(`SOL Balance: ${solBalance.toFixed(6)} SOL`);
    }

    // Get all SPL token balances (with metadata)
    logger.info('Fetching SPL token balances and metadata...');
    const tokenBalances = await this.getTokenAccounts(walletAddress);
    balances.push(...tokenBalances);

    if (tokenBalances.length > 0) {
      logger.success(`Found ${tokenBalances.length} SPL token(s) with balance > ${MIN_TOKEN_AMOUNT}`);
    }

    logger.success(`Total assets: ${balances.length}`);
    return balances;
  }

  async getBalancesWithPrices(walletAddress: string): Promise<Array<TokenBalance & { priceSol: number | null; valueSol: number }>> {
    const balances = await this.getAllBalances(walletAddress);

    if (balances.length === 0) return [];

    // Get SOL price for conversion
    const solPriceUsd = await jupiterService.getPrice('So11111111111111111111111111111111111111112');
    if (!solPriceUsd) {
      logger.warning('Could not fetch SOL price');
      return [];
    }

    // Fetch USD prices for all tokens
    const mints = balances.map(b => b.mint);
    const pricesUsd = await jupiterService.getPrices(mints);

    const balancesWithPrices = balances.map(balance => {
      // Convert USD price to SOL price
      const tokenPriceUsd = pricesUsd.get(balance.mint);
      const priceSol = tokenPriceUsd ? tokenPriceUsd / solPriceUsd : null;
      const valueSol = priceSol ? balance.uiAmount * priceSol : 0;

      return {
        ...balance,
        priceSol,
        valueSol
      };
    });

    // Filter out dust tokens (< 0.00001 SOL value ~= $0.01 at $200/SOL)
    const MIN_TOKEN_VALUE_SOL = 0.00005;
    const filteredBalances = balancesWithPrices.filter(balance => {
      // Always keep SOL
      if (balance.symbol === 'SOL') return true;

      // Keep tokens with value >= MIN_TOKEN_VALUE_SOL or no price data
      return balance.priceSol === null || balance.valueSol >= MIN_TOKEN_VALUE_SOL;
    });

    const dustCount = balancesWithPrices.length - filteredBalances.length;
    if (dustCount > 0) {
      logger.info(`Filtered ${dustCount} dust token(s) (value < ${MIN_TOKEN_VALUE_SOL} SOL)`);
    }

    return filteredBalances;
  }
}

export default new BalanceService();
