import axios, { AxiosInstance } from 'axios';
import { Connection, Keypair, VersionedTransaction, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import config from '../config/env';
import logger from '../utils/logger';

export interface SwapQuote {
  inAmount: string;
  outAmount: string;
  priceImpactPct: number;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  quoteResponse: any; // Full quote response for swap execution
}

export interface SwapResult {
  signature: string;
  solReceived: number;
}

class SwapService {
  private jupiterApiUrl: string = 'https://lite-api.jup.ag';
  private axiosInstance: AxiosInstance;
  private connection: Connection;
  private wallet: Keypair | null = null;
  private SOL_MINT = 'So11111111111111111111111111111111111111112';

  constructor() {
    this.axiosInstance = axios.create({ timeout: 30000 });
    this.connection = new Connection(config.HELIUS_RPC_URL, 'confirmed');

    // Initialize wallet from private key
    if (config.PRIVATE_KEY) {
      try {
        // Try base58 format first (Phantom export format)
        const secretKey = bs58.decode(config.PRIVATE_KEY);
        this.wallet = Keypair.fromSecretKey(secretKey);
        logger.info(`[SwapService] Wallet initialized: ${this.wallet.publicKey.toString()}`);
      } catch (error) {
        logger.error('[SwapService] Failed to initialize wallet from PRIVATE_KEY');
      }
    } else {
      logger.warning('[SwapService] No PRIVATE_KEY found - swaps will not work');
    }
  }

  /**
   * Get swap quote from Jupiter
   */
  async getQuote(
    inputMint: string,
    outputMint: string,
    amount: number,
    slippageBps: number = 100 // 1% default slippage
  ): Promise<SwapQuote | null> {
    try {
      // Get token decimals from blockchain
      let decimals = 9; // default for SOL and most SPL tokens

      try {
        const mintInfo = await this.connection.getParsedAccountInfo(new PublicKey(inputMint));
        if (mintInfo.value && 'parsed' in mintInfo.value.data) {
          decimals = mintInfo.value.data.parsed.info.decimals;
          logger.debug(`[SwapService] Token ${inputMint.slice(0, 8)} has ${decimals} decimals`);
        } else {
          logger.warning(`[SwapService] Could not get decimals for ${inputMint.slice(0, 8)}, using default: ${decimals}`);
        }
      } catch (decimalError: any) {
        logger.warning(`[SwapService] Error getting decimals: ${decimalError.message}, using default: ${decimals}`);
      }

      // Convert to smallest unit using correct decimals
      const amountInSmallestUnit = Math.floor(amount * Math.pow(10, decimals));

      if (amountInSmallestUnit <= 0) {
        logger.error(`[SwapService] Invalid amount after decimal conversion: ${amountInSmallestUnit}`);
        return null;
      }

      const params = {
        inputMint,
        outputMint,
        amount: amountInSmallestUnit.toString(),
        slippageBps,
        onlyDirectRoutes: false, // Allow all routes for pump.fun tokens
        asLegacyTransaction: false,
        maxAccounts: 64, // Limit accounts to avoid compute limits
      };

      logger.debug(`[SwapService] Getting quote: ${JSON.stringify(params)}`);

      const response = await this.axiosInstance.get(`${this.jupiterApiUrl}/swap/v1/quote`, {
        params,
        headers: { 'Accept': 'application/json' }
      });

      if (response.data) {
        const quote = response.data;
        const priceImpact = parseFloat(quote.priceImpactPct || '0');

        // Warn about high price impact
        if (priceImpact > 5) {
          logger.warning(`[SwapService] High price impact: ${priceImpact.toFixed(2)}% - token may be illiquid`);
        }

        return {
          inAmount: quote.inAmount,
          outAmount: quote.outAmount,
          priceImpactPct: priceImpact,
          otherAmountThreshold: quote.otherAmountThreshold,
          swapMode: quote.swapMode,
          slippageBps: quote.slippageBps,
          quoteResponse: quote, // Store full quote for swap execution
        };
      }

      logger.error('[SwapService] No data in quote response');
      return null;
    } catch (error: any) {
      if (error.response) {
        logger.error(`[SwapService] Quote API error (${error.response.status}): ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        logger.error(`[SwapService] No response from Jupiter API: ${error.message}`);
      } else {
        logger.error(`[SwapService] Failed to get quote: ${error.message}`);
      }
      return null;
    }
  }

  /**
   * Execute swap on Jupiter with retry logic
   */
  async executeSwap(
    tokenMint: string,
    amount: number,
    slippageBps: number = 100
  ): Promise<SwapResult | null> {
    // Try with normal slippage first, then increase if needed
    // For illiquid tokens, we need higher slippage tolerance
    const slippageAttempts = [slippageBps, slippageBps * 3, slippageBps * 6, slippageBps * 10];

    for (let i = 0; i < slippageAttempts.length; i++) {
      const currentSlippage = slippageAttempts[i];

      try {
        if (!this.wallet) {
          logger.error('[SwapService] No wallet available - cannot execute swap');
          return null;
        }

        // Get fresh quote for each attempt
        const quote = await this.getQuote(tokenMint, this.SOL_MINT, amount, currentSlippage);

        if (!quote) {
          logger.error('[SwapService] Could not get quote for swap');
          return null;
        }

        const solReceived = parseFloat(quote.outAmount) / 1_000_000_000;

        if (i === 0) {
          logger.info(`[SwapService] Quote: ${quote.outAmount} lamports (${solReceived.toFixed(6)} SOL)`);
          logger.info(`[SwapService] Price Impact: ${quote.priceImpactPct.toFixed(2)}%`);
        } else {
          logger.warning(`[SwapService] Retry ${i} with ${currentSlippage / 100}% slippage`);
        }

        // Get swap transaction from Jupiter
        logger.info('[SwapService] Getting swap transaction from Jupiter...');

        let swapResponse;
        try {
          swapResponse = await this.axiosInstance.post(`${this.jupiterApiUrl}/swap/v1/swap`, {
            quoteResponse: quote.quoteResponse,
            userPublicKey: this.wallet.publicKey.toString(),
            wrapAndUnwrapSol: true,
            dynamicComputeUnitLimit: true,
            prioritizationFeeLamports: 'auto',
          });
        } catch (swapError: any) {
          if (swapError.response) {
            logger.error(`[SwapService] Swap API error (${swapError.response.status}): ${JSON.stringify(swapError.response.data)}`);
          } else if (swapError.request) {
            logger.error(`[SwapService] No response from Jupiter swap API: ${swapError.message}`);
          } else {
            logger.error(`[SwapService] Failed to get swap transaction: ${swapError.message}`);
          }
          return null;
        }

        if (!swapResponse.data || !swapResponse.data.swapTransaction) {
          logger.error('[SwapService] Invalid swap response from Jupiter (missing swapTransaction)');
          if (swapResponse.data) {
            logger.debug(`[SwapService] Response data: ${JSON.stringify(swapResponse.data)}`);
          }
          return null;
        }

        // Deserialize and sign transaction
        let transaction;
        try {
          const swapTransactionBuf = Buffer.from(swapResponse.data.swapTransaction, 'base64');
          transaction = VersionedTransaction.deserialize(swapTransactionBuf);
        } catch (deserializeError: any) {
          logger.error(`[SwapService] Failed to deserialize transaction: ${deserializeError.message}`);
          return null;
        }

        logger.info('[SwapService] Signing transaction...');
        try {
          transaction.sign([this.wallet]);
        } catch (signError: any) {
          logger.error(`[SwapService] Failed to sign transaction: ${signError.message}`);
          return null;
        }

        // Send transaction (skip preflight on retries for volatile tokens)
        logger.info('[SwapService] Sending transaction to blockchain...');
        const rawTransaction = transaction.serialize();

        let signature;
        try {
          signature = await this.connection.sendRawTransaction(rawTransaction, {
            skipPreflight: i > 0, // Skip preflight on retries
            maxRetries: 3,
          });
        } catch (sendError: any) {
          const errorMsg = sendError.message || '';
          logger.error(`[SwapService] Failed to send transaction: ${errorMsg}`);

          // Check for slippage errors in simulation
          const isSlippageError = errorMsg.includes('0x1788') || errorMsg.includes('6024');

          if (sendError.logs) {
            // Only log first and last few logs to avoid spam
            const logs = sendError.logs;
            if (logs.length > 10) {
              logger.debug(`[SwapService] First 3 logs: ${logs.slice(0, 3).join(', ')}`);
              logger.debug(`[SwapService] Last 3 logs: ${logs.slice(-3).join(', ')}`);
            } else {
              logger.debug(`[SwapService] Transaction logs: ${JSON.stringify(logs)}`);
            }
          }

          // Continue to retry with higher slippage if applicable
          if (isSlippageError && i < slippageAttempts.length - 1) {
            logger.warning(`[SwapService] Slippage error detected - retrying with higher tolerance...`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s for price to stabilize
            continue;
          }

          if (i < slippageAttempts.length - 1) {
            logger.warning('[SwapService] Retrying with higher slippage...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }

          return null;
        }

        logger.info(`[SwapService] Transaction sent: ${signature}`);
        logger.info('[SwapService] Confirming transaction...');

        // Confirm transaction with timeout
        let confirmation;
        try {
          confirmation = await this.connection.confirmTransaction(signature, 'confirmed');
        } catch (confirmError: any) {
          logger.error(`[SwapService] Transaction confirmation failed: ${confirmError.message}`);
          logger.warning(`[SwapService] Signature: ${signature} - Check manually on explorer`);
          return null;
        }

        if (confirmation.value.err) {
          const errorStr = JSON.stringify(confirmation.value.err);
          logger.error(`[SwapService] Transaction failed on-chain: ${errorStr}`);

          // Decode common error codes
          if (errorStr.includes('0x1771')) {
            logger.error('[SwapService] Error: Insufficient funds for transaction');
          } else if (errorStr.includes('0x1788') || errorStr.includes('6024')) {
            logger.error('[SwapService] Error: Slippage tolerance exceeded (price changed during execution)');
            // Check if we can retry with higher slippage
            if (i < slippageAttempts.length - 1) {
              logger.warning('[SwapService] Retrying with higher slippage...');
              await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
              continue;
            }
          } else if (errorStr.includes('0x1')) {
            logger.error('[SwapService] Error: Insufficient lamports for rent');
          }

          return null;
        }

        logger.success(`[SwapService] ✅ Swap successful! Signature: ${signature}`);
        logger.success(`[SwapService] Received: ${solReceived.toFixed(6)} SOL`);

        return {
          signature,
          solReceived,
        };
      } catch (error: any) {
        const isSlippageError = error.message?.includes('0x1788') || error.message?.includes('slippage') || error.message?.includes('6024');
        const isInsufficientLiquidity = error.message?.includes('No routes found') || error.message?.includes('insufficient liquidity');

        // Log detailed error information
        logger.error(`[SwapService] Swap attempt ${i + 1}/${slippageAttempts.length} failed: ${error.message}`);

        if (error.response?.data) {
          logger.error(`[SwapService] API error details: ${JSON.stringify(error.response.data)}`);
        }

        if (error.stack) {
          logger.debug(`[SwapService] Stack trace: ${error.stack}`);
        }

        // If it's a slippage error and we have more attempts, retry
        if (isSlippageError && i < slippageAttempts.length - 1) {
          logger.warning(`[SwapService] Slippage exceeded, retrying with ${slippageAttempts[i + 1] / 100}% tolerance...`);
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
          continue;
        }

        // If insufficient liquidity, don't retry
        if (isInsufficientLiquidity) {
          logger.error('[SwapService] Insufficient liquidity for this token - cannot execute swap');
          return null;
        }

        // If this was the last attempt, give up
        if (i === slippageAttempts.length - 1) {
          logger.error(`[SwapService] ❌ All ${slippageAttempts.length} retry attempts exhausted`);
          logger.error(`[SwapService] 💡 Token may be too illiquid to swap. Consider manual intervention.`);
          return null;
        }

        // Otherwise retry
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
    }

    return null;
  }

  /**
   * Sell token for SOL
   */
  async sellForSol(
    tokenMint: string,
    amount: number,
    slippagePercent: number = 1.0
  ): Promise<SwapResult | null> {
    const slippageBps = Math.floor(slippagePercent * 100); // Convert % to basis points
    logger.info(`[SwapService] Selling ${amount} tokens for SOL (slippage: ${slippagePercent}%)`);

    return await this.executeSwap(tokenMint, amount, slippageBps);
  }
}

export default new SwapService();
