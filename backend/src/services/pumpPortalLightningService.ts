/**
 * PumpPortal Lightning API Service
 *
 * Handles real mainnet trading using PumpPortal's Lightning Transaction API
 * - Fee: 1% per trade
 * - Trades execute from platform's funded wallet (PUMPPORTAL_API_KEY)
 * - Users trade from their deposited balance (realSolBalance)
 *
 * API Documentation: https://pumpportal.fun/trading-api/
 */

import { loggers } from "../utils/logger.js";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";

const logger = loggers.tradeService;

const PUMPPORTAL_API_URL = "https://pumpportal.fun/api/trade";
const LIGHTNING_FEE_PERCENT = 1.0; // 1% fee for Lightning API

export interface LightningTradeParams {
  action: "buy" | "sell";
  mint: string;
  amount: number;
  denominatedInSol: boolean;
  slippage: number;
  priorityFee: number;
  pool?: "auto" | "pump" | "raydium" | "pump-amm" | "launchlab" | "raydium-cpmm" | "bonk";
}

export interface LightningTradeResult {
  signature: string;
  success: boolean;
  error?: string;
}

export interface TransactionStatus {
  signature: string;
  status: "PENDING" | "CONFIRMED" | "FAILED";
  confirmations?: number;
  error?: string;
  blockTime?: number;
}

/**
 * Execute a real trade using PumpPortal Lightning API
 * Trades execute from the API key's wallet (platform wallet)
 */
export async function executeLightningTrade(
  params: LightningTradeParams
): Promise<LightningTradeResult> {
  const apiKey = process.env.PUMPPORTAL_API_KEY;

  if (!apiKey) {
    logger.error("PUMPPORTAL_API_KEY not configured");
    throw new Error("PumpPortal API key not configured. Cannot execute real trades.");
  }

  // Validate parameters
  if (!params.mint || params.mint.length < 32) {
    throw new Error("Invalid mint address");
  }

  if (params.amount <= 0) {
    throw new Error("Amount must be greater than 0");
  }

  if (params.slippage < 0 || params.slippage > 100) {
    throw new Error("Slippage must be between 0 and 100");
  }

  logger.info({
    action: params.action,
    mint: params.mint.slice(0, 8),
    amount: params.amount,
    denominatedInSol: params.denominatedInSol,
    pool: params.pool || "auto"
  }, "Executing Lightning API trade");

  try {
    const response = await fetch(`${PUMPPORTAL_API_URL}?api-key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: params.action,
        mint: params.mint,
        amount: params.amount,
        denominatedInSol: params.denominatedInSol.toString(),
        slippage: params.slippage,
        priorityFee: params.priorityFee,
        pool: params.pool || "auto",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({
        status: response.status,
        error: errorText,
        mint: params.mint.slice(0, 8)
      }, "Lightning API request failed");

      return {
        signature: "",
        success: false,
        error: `PumpPortal API error: ${response.status} - ${errorText}`
      };
    }

    const result = await response.json();

    if (result.signature) {
      logger.info({
        signature: result.signature,
        mint: params.mint.slice(0, 8),
        action: params.action
      }, "Lightning API trade successful");

      return {
        signature: result.signature,
        success: true
      };
    } else {
      logger.error({
        result,
        mint: params.mint.slice(0, 8)
      }, "Lightning API returned no signature");

      return {
        signature: "",
        success: false,
        error: "No transaction signature returned"
      };
    }
  } catch (error: any) {
    logger.error({
      error: error.message,
      mint: params.mint.slice(0, 8),
      action: params.action
    }, "Lightning API trade execution failed");

    return {
      signature: "",
      success: false,
      error: error.message || "Unknown error executing trade"
    };
  }
}

/**
 * Verify a transaction on-chain using Helius RPC
 * Checks if the transaction was successfully confirmed
 */
export async function verifyTransaction(signature: string): Promise<boolean> {
  const heliusRpcUrl = process.env.HELIUS_RPC_URL || process.env.SOLANA_RPC_URL;

  if (!heliusRpcUrl) {
    logger.error("No RPC URL configured for transaction verification");
    return false;
  }

  try {
    const connection = new Connection(heliusRpcUrl, "confirmed");

    // Get transaction with retries (sometimes takes a moment to propagate)
    let attempts = 0;
    const maxAttempts = 10;
    const delayMs = 1000;

    while (attempts < maxAttempts) {
      const tx = await connection.getTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });

      if (tx) {
        // Check if transaction succeeded (no error)
        const success = tx.meta?.err === null;

        logger.info({
          signature: signature.slice(0, 8),
          success,
          slot: tx.slot,
          blockTime: tx.blockTime
        }, "Transaction verified on-chain");

        return success;
      }

      // Wait and retry
      attempts++;
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    logger.warn({
      signature: signature.slice(0, 8),
      attempts: maxAttempts
    }, "Transaction not found on-chain after retries");

    return false;
  } catch (error: any) {
    logger.error({
      error: error.message,
      signature: signature.slice(0, 8)
    }, "Failed to verify transaction");

    return false;
  }
}

/**
 * Get detailed transaction status including confirmations
 */
export async function getTransactionStatus(signature: string): Promise<TransactionStatus> {
  const heliusRpcUrl = process.env.HELIUS_RPC_URL || process.env.SOLANA_RPC_URL;

  if (!heliusRpcUrl) {
    return {
      signature,
      status: "FAILED",
      error: "No RPC URL configured"
    };
  }

  try {
    const connection = new Connection(heliusRpcUrl, "confirmed");

    // Check if transaction exists
    const tx = await connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) {
      return {
        signature,
        status: "PENDING",
      };
    }

    // Transaction found - check if it succeeded
    const success = tx.meta?.err === null;

    // Get confirmations
    const status = await connection.getSignatureStatus(signature);
    const confirmations = status?.value?.confirmations || 0;

    return {
      signature,
      status: success ? "CONFIRMED" : "FAILED",
      confirmations,
      blockTime: tx.blockTime || undefined,
      error: success ? undefined : JSON.stringify(tx.meta?.err)
    };
  } catch (error: any) {
    logger.error({
      error: error.message,
      signature: signature.slice(0, 8)
    }, "Failed to get transaction status");

    return {
      signature,
      status: "FAILED",
      error: error.message
    };
  }
}

/**
 * Calculate PumpPortal Lightning API fee (1%)
 */
export function calculateLightningFee(amount: number): number {
  return amount * (LIGHTNING_FEE_PERCENT / 100);
}

export default {
  executeLightningTrade,
  verifyTransaction,
  getTransactionStatus,
  calculateLightningFee,
  LIGHTNING_FEE_PERCENT
};
