/**
 * PumpPortal Local Transaction API Service
 *
 * Handles real mainnet trading using PumpPortal's Local Transaction API
 * - Fee: 0.5% per trade (half of Lightning API)
 * - User signs transactions with their own wallet on frontend
 * - Backend builds unsigned transactions and submits signed ones
 *
 * API Documentation: https://pumpportal.fun/local-trading-api/trading-api/
 */

import { loggers } from "../utils/logger.js";
import { Connection, Transaction, VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";

const logger = loggers.trade;

const PUMPPORTAL_LOCAL_API_URL = "https://pumpportal.fun/api/trade-local";
export const LOCAL_FEE_PERCENT = 0.5; // 0.5% fee for Local Transaction API

export interface LocalTradeParams {
  publicKey: string; // User's wallet public key
  action: "buy" | "sell";
  mint: string;
  amount: number;
  denominatedInSol: boolean;
  slippage: number;
  priorityFee: number;
  pool?: "auto" | "pump" | "raydium" | "pump-amm" | "launchlab" | "raydium-cpmm" | "bonk";
}

export interface BuildTransactionResult {
  serializedTransaction: string; // Base64 encoded transaction
  success: boolean;
  error?: string;
}

export interface SubmitTransactionResult {
  signature: string;
  success: boolean;
  error?: string;
}

/**
 * Build an unsigned transaction using PumpPortal Local Transaction API
 * Returns serialized transaction for user to sign on frontend
 */
export async function buildTransaction(
  params: LocalTradeParams
): Promise<BuildTransactionResult> {
  const apiKey = process.env.PUMPPORTAL_API_KEY;

  if (!apiKey) {
    logger.error("PUMPPORTAL_API_KEY not configured");
    throw new Error("PumpPortal API key not configured. Cannot build transactions.");
  }

  // Validate parameters
  if (!params.publicKey || params.publicKey.length < 32) {
    throw new Error("Invalid wallet public key");
  }

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
    publicKey: params.publicKey.slice(0, 8),
    amount: params.amount,
    denominatedInSol: params.denominatedInSol,
    pool: params.pool || "auto"
  }, "Building Local API transaction");

  try {
    const response = await fetch(`${PUMPPORTAL_LOCAL_API_URL}?api-key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        publicKey: params.publicKey,
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
        mint: params.mint.slice(0, 8),
        publicKey: params.publicKey.slice(0, 8)
      }, "Local API request failed");

      return {
        serializedTransaction: "",
        success: false,
        error: `PumpPortal API error: ${response.status} - ${errorText}`
      };
    }

    const result = await response.arrayBuffer();

    // Convert ArrayBuffer to Base64 for transport to frontend
    const serializedTransaction = Buffer.from(result).toString("base64");

    logger.info({
      mint: params.mint.slice(0, 8),
      publicKey: params.publicKey.slice(0, 8),
      action: params.action,
      txLength: serializedTransaction.length
    }, "Local API transaction built successfully");

    return {
      serializedTransaction,
      success: true
    };
  } catch (error: any) {
    logger.error({
      error: error.message,
      mint: params.mint.slice(0, 8),
      publicKey: params.publicKey.slice(0, 8),
      action: params.action
    }, "Failed to build Local API transaction");

    return {
      serializedTransaction: "",
      success: false,
      error: error.message || "Unknown error building transaction"
    };
  }
}

/**
 * Submit a signed transaction to Solana network via Helius
 * After user signs the transaction on frontend, submit it
 */
export async function submitSignedTransaction(
  signedTransactionBase64: string
): Promise<SubmitTransactionResult> {
  const heliusRpcUrl = process.env.HELIUS_RPC_URL || process.env.SOLANA_RPC_URL;

  if (!heliusRpcUrl) {
    logger.error("No RPC URL configured for transaction submission");
    throw new Error("RPC URL not configured. Cannot submit transactions.");
  }

  try {
    const connection = new Connection(heliusRpcUrl, "confirmed");

    // Decode the signed transaction
    const transactionBuffer = Buffer.from(signedTransactionBase64, "base64");
    const transaction = VersionedTransaction.deserialize(transactionBuffer);

    logger.info({
      txLength: transactionBuffer.length
    }, "Submitting signed transaction");

    // Send the transaction
    const signature = await connection.sendRawTransaction(transactionBuffer, {
      skipPreflight: false, // Simulate first to catch errors early
      maxRetries: 3,
    });

    logger.info({
      signature: signature.slice(0, 8)
    }, "Transaction submitted successfully");

    return {
      signature,
      success: true
    };
  } catch (error: any) {
    logger.error({
      error: error.message
    }, "Failed to submit signed transaction");

    return {
      signature: "",
      success: false,
      error: error.message || "Unknown error submitting transaction"
    };
  }
}

/**
 * Alternative: Submit via Jito bundle for better execution
 * Useful for time-sensitive trades or high congestion
 */
export async function submitViaJitoBundle(
  signedTransactionBase64: string
): Promise<SubmitTransactionResult> {
  // Note: Jito bundle submission would go here
  // For now, falling back to regular submission
  logger.warn("Jito bundle submission not yet implemented, using regular submission");
  return submitSignedTransaction(signedTransactionBase64);
}

/**
 * Calculate PumpPortal Local API fee (0.5%)
 */
export function calculateLocalFee(amount: number): number {
  return amount * (LOCAL_FEE_PERCENT / 100);
}

/**
 * Verify transaction signature format
 */
export function isValidSignature(signature: string): boolean {
  try {
    const decoded = bs58.decode(signature);
    return decoded.length === 64; // Solana signatures are 64 bytes
  } catch {
    return false;
  }
}

export default {
  buildTransaction,
  submitSignedTransaction,
  submitViaJitoBundle,
  calculateLocalFee,
  isValidSignature,
  LOCAL_FEE_PERCENT
};
