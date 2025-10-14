// Enhanced Wallet Activity Service with Helius Integration
import { Decimal } from "@prisma/client/runtime/library";
import prisma from "../plugins/prisma.js";
import type { WalletActivity } from "@prisma/client";
import { FastifyBaseLogger } from "fastify";

interface HeliusTransaction {
  signature: string;
  timestamp: number;
  type?: string;
  description?: string;
  fee?: number;
  feePayer?: string;
  nativeTransfers?: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    amount: number;
  }>;
  tokenTransfers?: Array<{
    tokenStandard: string;
    fromUserAccount: string;
    toUserAccount: string;
    fromTokenAccount?: string;
    toTokenAccount?: string;
    tokenAmount: number;
    mint: string;
    decimals: number;
  }>;
  accountData?: Array<{
    account: string;
    nativeBalanceChange?: number;
    tokenBalanceChanges?: Array<{
      userAccount: string;
      tokenAccount: string;
      rawTokenAmount: {
        tokenAmount: string;
        decimals: number;
      };
      mint: string;
    }>;
  }>;
  transactionError?: any;
  instructions?: Array<{
    programId: string;
    accounts?: string[];
    data?: string;
    innerInstructions?: any[];
  }>;
}

interface TokenMetadata {
  symbol: string;
  name: string;
  price?: number;
  marketCap?: number;
  volume24h?: number;
  priceChange24h?: number;
}

interface ParsedSwap {
  type: 'BUY' | 'SELL' | 'SWAP';
  tokenInMint?: string;
  tokenInSymbol?: string;
  tokenInAmount?: number;
  tokenOutMint?: string;
  tokenOutSymbol?: string;
  tokenOutAmount?: number;
  priceUsd?: number;
  solAmount?: number;
  program?: string;
  fee?: number;
}

export class WalletActivityService {
  private logger?: FastifyBaseLogger;
  private tokenCache: Map<string, TokenMetadata> = new Map();
  private readonly SOL_MINT = "So11111111111111111111111111111111111111112";
  private readonly USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
  private readonly USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";

  constructor(logger?: FastifyBaseLogger) {
    this.logger = logger;
  }

  /**
   * Fetch and cache wallet activities from Helius
   */
  async syncWalletActivities(walletAddress: string, limit: number = 100): Promise<WalletActivity[]> {
    try {
      // Use the correct Helius API endpoint (not RPC endpoint)
      const apiKey = process.env.HELIUS_API || process.env.HELIUS_API_KEY;

      if (!apiKey) {
        throw new Error("Helius API key missing");
      }

      // Fetch enhanced transactions from Helius
      const response = await fetch(
        `https://api.helius.xyz/v0/addresses/${walletAddress}/transactions?api-key=${apiKey}&limit=${limit}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Helius API error: ${response.status}`);
      }

      const transactions: HeliusTransaction[] = await response.json();

      // Process and cache activities
      const activities: WalletActivity[] = [];

      for (const tx of transactions) {
        // Skip failed transactions
        if (tx.transactionError) continue;

        const parsedSwap = this.parseSwapActivity(tx);
        if (!parsedSwap) continue;

        // Check if activity already exists
        const existing = await prisma.walletActivity.findUnique({
          where: { signature: tx.signature }
        });

        if (existing) {
          activities.push(existing);
          continue;
        }

        // Get token metadata
        const tokenInMeta = parsedSwap.tokenInMint
          ? await this.getTokenMetadata(parsedSwap.tokenInMint)
          : null;
        const tokenOutMeta = parsedSwap.tokenOutMint
          ? await this.getTokenMetadata(parsedSwap.tokenOutMint)
          : null;

        // Create new activity record
        const activity = await prisma.walletActivity.create({
          data: {
            walletAddress,
            signature: tx.signature,
            type: parsedSwap.type,
            tokenInMint: parsedSwap.tokenInMint,
            tokenInSymbol: parsedSwap.tokenInSymbol || tokenInMeta?.symbol,
            tokenInAmount: parsedSwap.tokenInAmount ? new Decimal(parsedSwap.tokenInAmount) : null,
            tokenOutMint: parsedSwap.tokenOutMint,
            tokenOutSymbol: parsedSwap.tokenOutSymbol || tokenOutMeta?.symbol,
            tokenOutAmount: parsedSwap.tokenOutAmount ? new Decimal(parsedSwap.tokenOutAmount) : null,
            priceUsd: parsedSwap.priceUsd ? new Decimal(parsedSwap.priceUsd) : null,
            solAmount: parsedSwap.solAmount ? new Decimal(parsedSwap.solAmount) : null,
            program: parsedSwap.program,
            fee: parsedSwap.fee ? new Decimal(parsedSwap.fee) : null,
            marketCap: tokenOutMeta?.marketCap ? new Decimal(tokenOutMeta.marketCap) : null,
            volume24h: tokenOutMeta?.volume24h ? new Decimal(tokenOutMeta.volume24h) : null,
            priceChange24h: tokenOutMeta?.priceChange24h ? new Decimal(tokenOutMeta.priceChange24h) : null,
            timestamp: new Date(tx.timestamp * 1000),
            blockTime: BigInt(tx.timestamp)
          }
        });

        activities.push(activity);
      }

      return activities;
    } catch (error) {
      this.logger?.error(`Failed to sync wallet activities: ${error}`);
      throw error;
    }
  }

  /**
   * Parse swap activity from Helius transaction
   */
  private parseSwapActivity(tx: HeliusTransaction): ParsedSwap | null {
    // Check for token transfers (most swaps have 2 transfers)
    if (!tx.tokenTransfers || tx.tokenTransfers.length < 1) {
      return null;
    }

    // Identify DEX programs
    const dexPrograms: { [key: string]: string } = {
      "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8": "Raydium V4",
      "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK": "Raydium CLMM",
      "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P": "Pump.fun",
      "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4": "Jupiter",
      "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc": "Orca Whirlpool",
      "9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP": "Orca V2"
    };

    let program = "Unknown";
    if (tx.instructions) {
      for (const instruction of tx.instructions) {
        if (dexPrograms[instruction.programId]) {
          program = dexPrograms[instruction.programId];
          break;
        }
      }
    }

    // Simple swap detection based on transfers
    const transfers = tx.tokenTransfers;

    // Look for swap pattern: one token in, one token out
    let tokenIn = null;
    let tokenOut = null;

    for (const transfer of transfers) {
      // If user is sender, it's token going out (selling)
      if (transfer.fromUserAccount?.toLowerCase() === tx.feePayer?.toLowerCase()) {
        tokenIn = {
          mint: transfer.mint,
          amount: transfer.tokenAmount,
          decimals: transfer.decimals
        };
      }
      // If user is receiver, it's token coming in (buying)
      else if (transfer.toUserAccount?.toLowerCase() === tx.feePayer?.toLowerCase()) {
        tokenOut = {
          mint: transfer.mint,
          amount: transfer.tokenAmount,
          decimals: transfer.decimals
        };
      }
    }

    // Check native SOL transfers as well
    if (tx.nativeTransfers) {
      for (const nativeTransfer of tx.nativeTransfers) {
        if (nativeTransfer.fromUserAccount === tx.feePayer && !tokenIn) {
          tokenIn = {
            mint: this.SOL_MINT,
            amount: nativeTransfer.amount / 1e9, // Convert lamports to SOL
            decimals: 9
          };
        } else if (nativeTransfer.toUserAccount === tx.feePayer && !tokenOut) {
          tokenOut = {
            mint: this.SOL_MINT,
            amount: nativeTransfer.amount / 1e9,
            decimals: 9
          };
        }
      }
    }

    if (!tokenIn && !tokenOut) {
      return null;
    }

    // Determine trade type
    let type: 'BUY' | 'SELL' | 'SWAP' = 'SWAP';
    let solAmount = 0;

    if (tokenIn?.mint === this.SOL_MINT) {
      type = 'BUY';
      solAmount = tokenIn.amount;
    } else if (tokenOut?.mint === this.SOL_MINT) {
      type = 'SELL';
      solAmount = tokenOut.amount;
    } else if (tokenIn?.mint === this.USDC_MINT || tokenIn?.mint === this.USDT_MINT) {
      type = 'BUY';
    } else if (tokenOut?.mint === this.USDC_MINT || tokenOut?.mint === this.USDT_MINT) {
      type = 'SELL';
    }

    return {
      type,
      tokenInMint: tokenIn?.mint,
      tokenInAmount: tokenIn?.amount,
      tokenOutMint: tokenOut?.mint,
      tokenOutAmount: tokenOut?.amount,
      solAmount: solAmount || undefined,
      program,
      fee: tx.fee ? tx.fee / 1e9 : undefined
    };
  }

  /**
   * Get token metadata from DexScreener or cache
   */
  private async getTokenMetadata(mint: string): Promise<TokenMetadata | null> {
    // Check cache first
    if (this.tokenCache.has(mint)) {
      return this.tokenCache.get(mint)!;
    }

    // Known tokens
    if (mint === this.SOL_MINT) {
      return { symbol: "SOL", name: "Solana" };
    }
    if (mint === this.USDC_MINT) {
      return { symbol: "USDC", name: "USD Coin" };
    }
    if (mint === this.USDT_MINT) {
      return { symbol: "USDT", name: "Tether" };
    }

    try {
      // Try DexScreener API
      const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
      if (response.ok) {
        const data = await response.json();
        if (data.pairs && data.pairs.length > 0) {
          const pair = data.pairs[0];
          const metadata: TokenMetadata = {
            symbol: pair.baseToken.symbol,
            name: pair.baseToken.name,
            price: parseFloat(pair.priceUsd || 0),
            marketCap: parseFloat(pair.fdv || 0),
            volume24h: parseFloat(pair.volume?.h24 || 0),
            priceChange24h: parseFloat(pair.priceChange?.h24 || 0)
          };

          // Cache for 5 minutes
          this.tokenCache.set(mint, metadata);
          setTimeout(() => this.tokenCache.delete(mint), 5 * 60 * 1000);

          return metadata;
        }
      }
    } catch (error) {
      this.logger?.warn(`Failed to fetch metadata for token ${mint}: ${error}`);
    }

    return null;
  }

  /**
   * Get recent activities for multiple wallets
   */
  async getRecentActivities(
    walletAddresses: string[],
    limit: number = 50
  ): Promise<WalletActivity[]> {
    return await prisma.walletActivity.findMany({
      where: {
        walletAddress: { in: walletAddresses }
      },
      orderBy: { timestamp: 'desc' },
      take: limit
    });
  }

  /**
   * Get activities with filtering
   */
  async getFilteredActivities(params: {
    walletAddresses?: string[];
    tokenMint?: string;
    type?: string;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
    offset?: number;
  }): Promise<WalletActivity[]> {
    const where: any = {};

    if (params.walletAddresses?.length) {
      where.walletAddress = { in: params.walletAddresses };
    }

    if (params.tokenMint) {
      where.OR = [
        { tokenInMint: params.tokenMint },
        { tokenOutMint: params.tokenMint }
      ];
    }

    if (params.type) {
      where.type = params.type;
    }

    if (params.startTime || params.endTime) {
      where.timestamp = {};
      if (params.startTime) where.timestamp.gte = params.startTime;
      if (params.endTime) where.timestamp.lte = params.endTime;
    }

    return await prisma.walletActivity.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: params.limit || 100,
      skip: params.offset || 0
    });
  }

  /**
   * Calculate wallet statistics
   */
  async getWalletStats(walletAddress: string, period: 'day' | 'week' | 'month' = 'day') {
    const now = new Date();
    const startTime = new Date();

    switch (period) {
      case 'day':
        startTime.setDate(now.getDate() - 1);
        break;
      case 'week':
        startTime.setDate(now.getDate() - 7);
        break;
      case 'month':
        startTime.setMonth(now.getMonth() - 1);
        break;
    }

    const activities = await prisma.walletActivity.findMany({
      where: {
        walletAddress,
        timestamp: { gte: startTime }
      }
    });

    const stats = {
      totalTrades: activities.length,
      buys: activities.filter(a => a.type === 'BUY').length,
      sells: activities.filter(a => a.type === 'SELL').length,
      totalVolume: activities.reduce((sum, a) => {
        return sum + (a.priceUsd?.toNumber() || 0);
      }, 0),
      uniqueTokens: new Set([
        ...activities.map(a => a.tokenInMint).filter(Boolean),
        ...activities.map(a => a.tokenOutMint).filter(Boolean)
      ]).size,
      profitLoss: activities.reduce((sum, a) => {
        return sum + (a.profitLoss?.toNumber() || 0);
      }, 0)
    };

    return stats;
  }
}

export default WalletActivityService;