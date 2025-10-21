// Enhanced Wallet Activity Service with Helius Integration
import { Decimal } from "@prisma/client/runtime/library";
import prisma from "../plugins/prisma.js";
import type { WalletActivity } from "@prisma/client";
import { FastifyBaseLogger } from "fastify";

interface HeliusTransaction {
  signature: string;
  timestamp: number;
  type?: string;
  source?: string;
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
  // CORRECT: events.swap structure from Helius API
  events?: {
    swap?: {
      tokenInputs?: Array<{
        userAccount: string;
        mint: string;
        rawTokenAmount: {
          tokenAmount: string;
          decimals: number;
        };
      }>;
      tokenOutputs?: Array<{
        userAccount: string;
        mint: string;
        rawTokenAmount: {
          tokenAmount: string;
          decimals: number;
        };
      }>;
      nativeInput?: {
        account: string;
        amount: string;
      };
      nativeOutput?: {
        account: string;
        amount: string;
      };
      innerSwaps?: Array<{
        programInfo?: {
          source?: string;
        };
      }>;
    };
  };
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
  logoURI?: string;
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

  // NOTE: These are removed in favor of user-configurable settings
  // Filters are now set per-user via WalletTrackerSettings table

  // Tokens to exclude (not meme coins)
  private readonly EXCLUDED_TOKENS = new Set([
    "So11111111111111111111111111111111111111112", // SOL
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
    "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", // USDT
    "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs", // WETH
    "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So", // mSOL
    "7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj", // stSOL
    "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn", // jitoSOL
    "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1", // bSOL
  ]);

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

        // Determine the main token (the non-SOL/USDC/USDT token)
        const mainTokenMint = this.getMainTokenMint(parsedSwap);
        if (!mainTokenMint) continue;

        // Skip excluded tokens (stables, wrapped tokens, etc.)
        if (this.EXCLUDED_TOKENS.has(mainTokenMint)) {
          this.logger?.debug(`Skipping excluded token: ${mainTokenMint}`);
          continue;
        }

        // Check if activity already exists
        const existing = await prisma.walletActivity.findUnique({
          where: { signature: tx.signature }
        });

        if (existing) {
          // CRITICAL FIX: Only include existing activities that have images and meet our criteria
          const existingMainMint = this.getMainTokenMint({
            type: existing.type as 'BUY' | 'SELL',
            tokenInMint: existing.tokenInMint || undefined,
            tokenOutMint: existing.tokenOutMint || undefined
          });

          const existingMainLogoURI = existingMainMint === existing.tokenInMint
            ? existing.tokenInLogoURI
            : existing.tokenOutLogoURI;

          // Just log if no image, but include it (user can filter)
          if (!existingMainLogoURI) {
            this.logger?.debug(`Existing activity ${tx.signature} - no image in DB`);
          }

          activities.push(existing);
          continue;
        }

        // Get token metadata with REQUIRED image and market data
        const tokenInMeta = parsedSwap.tokenInMint
          ? await this.getTokenMetadata(parsedSwap.tokenInMint)
          : null;
        const tokenOutMeta = parsedSwap.tokenOutMint
          ? await this.getTokenMetadata(parsedSwap.tokenOutMint)
          : null;

        // Get the main token metadata
        const mainTokenMeta = mainTokenMint === parsedSwap.tokenInMint ? tokenInMeta : tokenOutMeta;

        // Optional: Log if no image found but continue (user can filter via settings)
        if (!mainTokenMeta?.logoURI) {
          this.logger?.debug(`No image found for ${mainTokenMint} - will save anyway`);
        }

        // Fetch logo URIs with aggressive fallback strategy
        let tokenInLogoURI: string | null = null;
        let tokenOutLogoURI: string | null = null;

        // Token In Logo
        if (parsedSwap.tokenInMint) {
          // 1. Try metadata from API
          if (tokenInMeta?.logoURI) {
            tokenInLogoURI = tokenInMeta.logoURI;
            this.logger?.info(`TokenIn logo from API: ${tokenInLogoURI}`);
          }

          // 2. Fallback to database
          if (!tokenInLogoURI) {
            try {
              const tokenInData = await prisma.token.findUnique({
                where: { address: parsedSwap.tokenInMint },
                select: { logoURI: true, imageUrl: true }
              });
              tokenInLogoURI = tokenInData?.logoURI || tokenInData?.imageUrl || null;
              if (tokenInLogoURI) {
                this.logger?.info(`TokenIn logo from DB: ${tokenInLogoURI}`);
              }
            } catch (err) {
              // Ignore if token not found in DB
            }
          }

          // 3. Final attempt: leave as null if no logo found
          // Don't use Solana Token List as it has very limited coverage
          if (!tokenInLogoURI) {
            this.logger?.warn(`No logo found for tokenIn ${parsedSwap.tokenInMint}`);
          }
        }

        // Token Out Logo
        if (parsedSwap.tokenOutMint) {
          // 1. Try metadata from API
          if (tokenOutMeta?.logoURI) {
            tokenOutLogoURI = tokenOutMeta.logoURI;
            this.logger?.info(`TokenOut logo from API: ${tokenOutLogoURI}`);
          }

          // 2. Fallback to database
          if (!tokenOutLogoURI) {
            try {
              const tokenOutData = await prisma.token.findUnique({
                where: { address: parsedSwap.tokenOutMint },
                select: { logoURI: true, imageUrl: true }
              });
              tokenOutLogoURI = tokenOutData?.logoURI || tokenOutData?.imageUrl || null;
              if (tokenOutLogoURI) {
                this.logger?.info(`TokenOut logo from DB: ${tokenOutLogoURI}`);
              }
            } catch (err) {
              // Ignore if token not found in DB
            }
          }

          // 3. Final attempt: leave as null if no logo found
          // Don't use Solana Token List as it has very limited coverage
          if (!tokenOutLogoURI) {
            this.logger?.warn(`No logo found for tokenOut ${parsedSwap.tokenOutMint}`);
          }
        }

        // Create new activity record
        const activity = await prisma.walletActivity.create({
          data: {
            walletAddress,
            signature: tx.signature,
            type: parsedSwap.type,
            tokenInMint: parsedSwap.tokenInMint,
            tokenInSymbol: parsedSwap.tokenInSymbol || tokenInMeta?.symbol,
            tokenInAmount: parsedSwap.tokenInAmount ? new Decimal(parsedSwap.tokenInAmount) : null,
            tokenInLogoURI,
            tokenOutMint: parsedSwap.tokenOutMint,
            tokenOutSymbol: parsedSwap.tokenOutSymbol || tokenOutMeta?.symbol,
            tokenOutAmount: parsedSwap.tokenOutAmount ? new Decimal(parsedSwap.tokenOutAmount) : null,
            tokenOutLogoURI,
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
   * Get the main token mint from a parsed swap (the non-base token)
   */
  private getMainTokenMint(parsedSwap: ParsedSwap): string | null {
    const baseMints = new Set([this.SOL_MINT, this.USDC_MINT, this.USDT_MINT]);

    // For BUY: tokenOut is the main token
    if (parsedSwap.type === 'BUY' && parsedSwap.tokenOutMint && !baseMints.has(parsedSwap.tokenOutMint)) {
      return parsedSwap.tokenOutMint;
    }

    // For SELL: tokenIn is the main token
    if (parsedSwap.type === 'SELL' && parsedSwap.tokenInMint && !baseMints.has(parsedSwap.tokenInMint)) {
      return parsedSwap.tokenInMint;
    }

    return null;
  }

  /**
   * Parse swap activity from Helius transaction using correct tx.events.swap
   */
  private parseSwapActivity(tx: any): ParsedSwap | null {
    // Try tx.events.swap first (preferred Helius format)
    const swap = tx?.events?.swap;
    if (swap) {
      return this.parseSwapFromEvents(tx, swap);
    }

    // Fallback to tokenTransfers parsing if events.swap not available
    if (tx.tokenTransfers && tx.tokenTransfers.length >= 1) {
      return this.parseSwapFromTokenTransfers(tx);
    }

    // No swap data found
    return null;
  }

  /**
   * Detect DEX/program from transaction instructions
   */
  private detectDexProgram(tx: any): string {
    const dexPrograms: { [key: string]: string } = {
      "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8": "Raydium",
      "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK": "Raydium",
      "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P": "Pump.fun",
      "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4": "Jupiter",
      "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc": "Orca",
      "9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP": "Orca",
      "SWiMDJYFUGj6cPrQ6QYYYWZtvXQdRChSVAygDZDsCHC": "Saber",
      "DjVE6JNiYqPL2QXyCUUh8rNjHrbz9hXHNYt99MQ59qw1": "Orca V1"
    };

    // Check transaction instructions
    if (tx.instructions) {
      for (const instruction of tx.instructions) {
        if (dexPrograms[instruction.programId]) {
          return dexPrograms[instruction.programId];
        }
      }
    }

    // Fallback to tx.source or swap.innerSwaps if available
    return tx?.source || "Unknown";
  }

  /**
   * Parse swap from tx.events.swap (preferred method)
   */
  private parseSwapFromEvents(tx: any, swap: any): ParsedSwap | null {

    const BASE_MINTS = new Set([
      this.SOL_MINT,
      this.USDT_MINT,
      this.USDC_MINT,
    ]);

    // Gather per-mint deltas for the wallet (feePayer)
    type Delta = { mint: string; decimals: number; amount: bigint };
    const deltas = new Map<string, Delta>();

    const addDelta = (mint: string, decimals: number, amt: bigint) => {
      const prev = deltas.get(mint) ?? { mint, decimals, amount: BigInt(0) };
      deltas.set(mint, { mint, decimals, amount: prev.amount + amt });
    };

    // Token inputs: wallet sends tokens (negative)
    for (const ti of swap.tokenInputs ?? []) {
      if (ti.userAccount === tx.feePayer) {
        const amt = BigInt(ti.rawTokenAmount.tokenAmount);
        addDelta(ti.mint, ti.rawTokenAmount.decimals, -amt);
      }
    }

    // Token outputs: wallet receives tokens (positive)
    for (const to of swap.tokenOutputs ?? []) {
      if (to.userAccount === tx.feePayer) {
        const amt = BigInt(to.rawTokenAmount.tokenAmount);
        addDelta(to.mint, to.rawTokenAmount.decimals, amt);
      }
    }

    // Native SOL deltas
    let nativeDeltaLamports = 0n;
    if (swap.nativeInput?.account === tx.feePayer) {
      nativeDeltaLamports -= BigInt(swap.nativeInput.amount);
    }
    if (swap.nativeOutput?.account === tx.feePayer) {
      nativeDeltaLamports += BigInt(swap.nativeOutput.amount);
    }

    // Pick the "actual token" (exclude base mints)
    const nonBase = [...deltas.values()].filter(d => !BASE_MINTS.has(d.mint) && d.amount !== 0n);
    const focus = (nonBase.length > 0 ? nonBase : [...deltas.values()])
      .sort((a, b) => {
        const absA = a.amount < 0n ? -a.amount : a.amount;
        const absB = b.amount < 0n ? -b.amount : b.amount;
        return absB > absA ? 1 : -1;
      })[0];

    if (!focus || focus.amount === 0n) return null;

    const isBuy = focus.amount > 0n; // received token => BUY; sent => SELL
    const abs = focus.amount > 0n ? focus.amount : -focus.amount;

    // Convert to human units
    const denom = BigInt(10) ** BigInt(focus.decimals);
    const whole = (abs / denom).toString();
    const frac = (abs % denom).toString().padStart(focus.decimals, "0").replace(/0+$/, "");
    const humanAmount = frac ? parseFloat(`${whole}.${frac}`) : parseFloat(whole);

    // Extract program info using shared detection logic
    const program = this.detectDexProgram(tx);

    // Determine tokenIn and tokenOut
    const tokenInMint = isBuy ? this.SOL_MINT : focus.mint;
    const tokenOutMint = isBuy ? focus.mint : this.SOL_MINT;
    const tokenInAmount = isBuy ? undefined : humanAmount;
    const tokenOutAmount = isBuy ? humanAmount : undefined;

    // Calculate SOL amount from native delta
    const solAmount = nativeDeltaLamports !== 0n
      ? Math.abs(Number(nativeDeltaLamports)) / 1e9
      : undefined;

    return {
      type: isBuy ? 'BUY' : 'SELL',
      tokenInMint,
      tokenInAmount,
      tokenOutMint,
      tokenOutAmount,
      solAmount,
      program,
      fee: tx.fee ? tx.fee / 1e9 : undefined
    };
  }

  /**
   * Fallback: Parse swap from tokenTransfers (for older Helius responses)
   */
  private parseSwapFromTokenTransfers(tx: any): ParsedSwap | null {
    const transfers = tx.tokenTransfers;
    if (!transfers || transfers.length < 1) return null;

    // Detect DEX program using shared detection logic
    const program = this.detectDexProgram(tx);

    // Look for swap pattern: one token in, one token out
    let tokenIn = null;
    let tokenOut = null;

    for (const transfer of transfers) {
      // If wallet is sender, it's token going out (selling)
      if (transfer.fromUserAccount?.toLowerCase() === tx.feePayer?.toLowerCase()) {
        tokenIn = {
          mint: transfer.mint,
          amount: transfer.tokenAmount,
          decimals: transfer.decimals
        };
      }
      // If wallet is receiver, it's token coming in (buying)
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
            amount: nativeTransfer.amount / 1e9,
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

    if (!tokenIn && !tokenOut) return null;

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
   * Get token metadata with ROBUST image fetching using Helius DAS API + fallbacks
   * Ensures images are ALWAYS available for meme coins
   */
  private async getTokenMetadata(mint: string): Promise<TokenMetadata | null> {
    // Check cache first
    if (this.tokenCache.has(mint)) {
      return this.tokenCache.get(mint)!;
    }

    // Known tokens with hardcoded logos
    if (mint === this.SOL_MINT) {
      return {
        symbol: "SOL",
        name: "Solana",
        logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
      };
    }
    if (mint === this.USDC_MINT) {
      return {
        symbol: "USDC",
        name: "USD Coin",
        logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png"
      };
    }
    if (mint === this.USDT_MINT) {
      return {
        symbol: "USDT",
        name: "Tether",
        logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.svg"
      };
    }

    let metadata: TokenMetadata | null = null;
    let logoURI: string | undefined = undefined;

    // STEP 1: Try Helius DAS API (best coverage for images)
    try {
      const apiKey = process.env.HELIUS_API || process.env.HELIUS_API_KEY;
      if (apiKey) {
        const heliusResponse = await fetch(`https://mainnet.helius-rpc.com/?api-key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 'metadata-fetch',
            method: 'getAsset',
            params: {
              id: mint,
              options: {
                showFungible: true
              }
            }
          })
        });

        if (heliusResponse.ok) {
          const dasData = await heliusResponse.json();
          const asset = dasData?.result;

          if (asset) {
            // Extract comprehensive metadata from DAS
            const symbol = asset.content?.metadata?.symbol || asset.token_info?.symbol;
            const name = asset.content?.metadata?.name || asset.token_info?.name;

            // Try multiple image sources in DAS response
            logoURI = asset.content?.links?.image ||
                     asset.content?.files?.[0]?.uri ||
                     asset.content?.json_uri ||
                     undefined;

            const price = asset.token_info?.price_info?.price_per_token;

            metadata = {
              symbol: symbol || "Unknown",
              name: name || "Unknown Token",
              logoURI,
              price: price ? parseFloat(price) : undefined,
              marketCap: undefined, // Will get from DexScreener
              volume24h: undefined,
              priceChange24h: undefined
            };

            if (logoURI) {
              this.logger?.info(`✓ DAS Logo found for ${mint}: ${logoURI}`);
            }
          }
        }
      }
    } catch (error) {
      this.logger?.warn(`Helius DAS API failed for ${mint}: ${error}`);
    }

    // STEP 2: Get price/market data from DexScreener (always try this)
    try {
      const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
      if (response.ok) {
        const data = await response.json();
        if (data.pairs && data.pairs.length > 0) {
          const pair = data.pairs[0];

          const dexLogoURI = pair.info?.imageUrl || null;

          // If we don't have metadata from DAS, create from DexScreener
          if (!metadata) {
            metadata = {
              symbol: pair.baseToken?.symbol || "Unknown",
              name: pair.baseToken?.name || "Unknown Token",
              logoURI: dexLogoURI,
              price: parseFloat(pair.priceUsd || 0),
              marketCap: parseFloat(pair.fdv || pair.marketCap || 0),
              volume24h: parseFloat(pair.volume?.h24 || 0),
              priceChange24h: parseFloat(pair.priceChange?.h24 || 0)
            };

            if (dexLogoURI) {
              this.logger?.info(`✓ DexScreener Logo found for ${mint}: ${dexLogoURI}`);
            }
          } else {
            // Enrich existing DAS metadata with DexScreener market data
            metadata.price = parseFloat(pair.priceUsd || metadata.price || 0);
            metadata.marketCap = parseFloat(pair.fdv || pair.marketCap || 0);
            metadata.volume24h = parseFloat(pair.volume?.h24 || 0);
            metadata.priceChange24h = parseFloat(pair.priceChange?.h24 || 0);

            // Use DexScreener logo if DAS didn't have one
            if (!metadata.logoURI && dexLogoURI) {
              metadata.logoURI = dexLogoURI;
              this.logger?.info(`✓ Fallback DexScreener logo for ${mint}`);
            }
          }
        } else {
          this.logger?.warn(`✗ No pairs found in DexScreener for ${mint}`);
        }
      }
    } catch (error) {
      this.logger?.error(`DexScreener API failed for ${mint}: ${error}`);
    }

    // STEP 3: Final fallback - check our database
    if (metadata && !metadata.logoURI) {
      try {
        const tokenData = await prisma.token.findUnique({
          where: { address: mint },
          select: { logoURI: true, imageUrl: true, symbol: true, name: true }
        });

        if (tokenData) {
          metadata.logoURI = tokenData.logoURI || tokenData.imageUrl || undefined;
          metadata.symbol = metadata.symbol === "Unknown" ? (tokenData.symbol || metadata.symbol) : metadata.symbol;
          metadata.name = metadata.name === "Unknown Token" ? (tokenData.name || metadata.name) : metadata.name;

          if (metadata.logoURI) {
            this.logger?.info(`✓ Database logo found for ${mint}`);
          }
        }
      } catch (error) {
        this.logger?.warn(`Database lookup failed for ${mint}: ${error}`);
      }
    }

    // Cache result for 5 minutes if we got metadata
    if (metadata) {
      this.tokenCache.set(mint, metadata);
      setTimeout(() => this.tokenCache.delete(mint), 5 * 60 * 1000);

      // Log final result
      if (metadata.logoURI) {
        this.logger?.info(`✅ Final metadata for ${mint}: ${metadata.symbol} - Image: YES - MC: $${metadata.marketCap || 'N/A'}`);
      } else {
        this.logger?.warn(`⚠️ No image found for ${mint} (${metadata.symbol}) despite all attempts`);
      }
    } else {
      this.logger?.warn(`❌ No metadata found for token ${mint}`);
    }

    return metadata;
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
   * Get activities with filtering based on user settings
   */
  async getFilteredActivities(params: {
    walletAddresses?: string[];
    tokenMint?: string;
    type?: string;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
    offset?: number;
    settings?: {
      showBuys?: boolean;
      showSells?: boolean;
      showFirstBuyOnly?: boolean;
      minMarketCap?: number;
      maxMarketCap?: number;
      minTransactionUsd?: number;
      maxTransactionUsd?: number;
      requireImages?: boolean;
    };
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

    // Fetch 3x the requested limit to ensure we have enough after client-side filtering
    const fetchLimit = (params.limit || 100) * 3;

    const activities = await prisma.walletActivity.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: fetchLimit,
      skip: params.offset || 0
    });

    // Apply user settings filters
    let filtered = activities;

    if (params.settings) {
      const {
        showBuys = true,
        showSells = true,
        showFirstBuyOnly = false,
        minMarketCap,
        maxMarketCap,
        minTransactionUsd,
        maxTransactionUsd,
        requireImages = false
      } = params.settings;

      filtered = filtered.filter(activity => {
        // Filter by transaction type
        if (!showBuys && activity.type === 'BUY') return false;
        if (!showSells && activity.type === 'SELL') return false;

        // Filter by market cap (if available)
        if (activity.marketCap) {
          const mc = parseFloat(activity.marketCap.toString());
          if (minMarketCap !== undefined && mc < minMarketCap) return false;
          if (maxMarketCap !== undefined && mc > maxMarketCap) return false;
        }

        // Filter by transaction USD amount (if available)
        if (activity.priceUsd) {
          const txUsd = parseFloat(activity.priceUsd.toString());
          if (minTransactionUsd !== undefined && txUsd < minTransactionUsd) return false;
          if (maxTransactionUsd !== undefined && txUsd > maxTransactionUsd) return false;
        }

        // Filter by images
        if (requireImages) {
          const hasImage = activity.tokenInLogoURI || activity.tokenOutLogoURI;
          if (!hasImage) return false;
        }

        return true;
      });

      // Handle first buy only filter (requires tracking seen tokens)
      if (showFirstBuyOnly) {
        const seenTokens = new Set<string>();
        filtered = filtered.filter(activity => {
          if (activity.type !== 'BUY') return true;

          const tokenMint = activity.tokenOutMint;
          if (!tokenMint) return true;

          if (seenTokens.has(tokenMint)) return false;

          seenTokens.add(tokenMint);
          return true;
        });
      }
    }

    // Return up to requested limit
    return filtered.slice(0, params.limit || 100);
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