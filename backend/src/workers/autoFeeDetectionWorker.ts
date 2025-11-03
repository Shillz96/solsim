/**
 * Automatic Fee Detection Worker
 *
 * Monitors the creator wallet for incoming pump.fun fee transactions
 * and automatically records them in the hourly reward pool.
 *
 * Features:
 * - Only tracks pump.fun creator fees (ignores manual transfers)
 * - Prevents double-counting with processed transaction tracking
 * - Runs every 5 minutes
 * - Handles manual withdrawals gracefully
 */

import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import prisma from "../plugins/prisma.js";
import { recordCreatorFees } from "../services/pumpfunRewardCollector.js";

const RPC_URL = process.env.HELIUS_RPC_URL || process.env.SOLANA_RPC || "https://api.mainnet-beta.solana.com";
const connection = new Connection(RPC_URL, "confirmed");

const CREATOR_WALLET = process.env.PUMPFUN_CREATOR_WALLET;
const AUTO_DETECT_ENABLED = process.env.AUTO_DETECT_FEES === "true";
const PUMP_FUN_PROGRAM_ID = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"; // Pump.fun program

// In-memory set of processed transaction signatures (prevents double-counting)
const processedSignatures = new Set<string>();

interface DetectedFee {
  signature: string;
  amount: number;
  timestamp: Date;
  source: string;
}

/**
 * Check if auto-detection is enabled
 */
function isAutoDetectionEnabled(): boolean {
  if (!AUTO_DETECT_ENABLED) {
    console.log("ℹ️ Auto fee detection disabled (set AUTO_DETECT_FEES=true to enable)");
    return false;
  }
  if (!CREATOR_WALLET) {
    console.error("❌ PUMPFUN_CREATOR_WALLET not configured");
    return false;
  }
  return true;
}

/**
 * Check if a transaction signature has already been processed
 */
async function isTransactionProcessed(signature: string): Promise<boolean> {
  // Check in-memory cache first
  if (processedSignatures.has(signature)) {
    return true;
  }

  // Check database for persistence across restarts
  // TODO: Uncomment when processedTransaction table is added to schema
  // const existing = await prisma.processedTransaction.findUnique({
  //   where: { signature }
  // });

  // if (existing) {
  //   processedSignatures.add(signature);
  //   return true;
  // }

  return false;
}

/**
 * Mark transaction as processed
 */
async function markTransactionProcessed(signature: string, amount: number, source: string): Promise<void> {
  try {
    // TODO: Uncomment when processedTransaction table is added to schema
    // await prisma.processedTransaction.create({
    //   data: {
    //     signature,
    //     amount,
    //     source,
    //     processedAt: new Date()
    //   }
    // });
    processedSignatures.add(signature);
  } catch (error) {
    // Ignore duplicate key errors (race condition protection)
    console.warn(`⚠️ Transaction ${signature} already marked as processed`);
  }
}

/**
 * Detect if a transaction is a pump.fun creator fee
 *
 * This looks for transactions from the pump.fun program to the creator wallet
 */
async function isPumpFunCreatorFee(signature: string): Promise<{ isFee: boolean; amount: number }> {
  try {
    const tx = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
      commitment: "confirmed"
    });

    if (!tx || !tx.meta) {
      return { isFee: false, amount: 0 };
    }

    // Check if transaction involves pump.fun program
    const accountKeys = tx.transaction.message.accountKeys;
    const involvesPumpFun = accountKeys.some(
      key => key.pubkey.toBase58() === PUMP_FUN_PROGRAM_ID
    );

    if (!involvesPumpFun) {
      return { isFee: false, amount: 0 };
    }

    // Get balance changes for creator wallet
    const creatorPubkey = new PublicKey(CREATOR_WALLET!);
    const creatorIndex = accountKeys.findIndex(
      key => key.pubkey.equals(creatorPubkey)
    );

    if (creatorIndex === -1) {
      return { isFee: false, amount: 0 };
    }

    const preBalance = tx.meta.preBalances[creatorIndex];
    const postBalance = tx.meta.postBalances[creatorIndex];
    const change = postBalance - preBalance;

    // Only count positive changes (incoming SOL)
    if (change > 0) {
      const amountSOL = change / LAMPORTS_PER_SOL;
      return { isFee: true, amount: amountSOL };
    }

    return { isFee: false, amount: 0 };
  } catch (error) {
    console.error(`❌ Failed to parse transaction ${signature}:`, error);
    return { isFee: false, amount: 0 };
  }
}

/**
 * Scan for new creator fee transactions
 */
async function scanForNewFees(): Promise<DetectedFee[]> {
  if (!CREATOR_WALLET) {
    return [];
  }

  try {
    const creatorPubkey = new PublicKey(CREATOR_WALLET);

    // Get recent signatures (last 20 transactions)
    const signatures = await connection.getSignaturesForAddress(creatorPubkey, {
      limit: 20
    });

    const detectedFees: DetectedFee[] = [];

    for (const sigInfo of signatures) {
      const signature = sigInfo.signature;

      // Skip if already processed
      if (await isTransactionProcessed(signature)) {
        continue;
      }

      // Check if this is a pump.fun creator fee
      const { isFee, amount } = await isPumpFunCreatorFee(signature);

      if (isFee && amount > 0) {
        detectedFees.push({
          signature,
          amount,
          timestamp: sigInfo.blockTime ? new Date(sigInfo.blockTime * 1000) : new Date(),
          source: "pump.fun-auto-detected"
        });
      } else {
        // Mark as processed anyway to avoid re-checking
        await markTransactionProcessed(signature, 0, "not-creator-fee");
      }
    }

    return detectedFees;
  } catch (error) {
    console.error("❌ Failed to scan for new fees:", error);
    return [];
  }
}

/**
 * Process detected fees and record them
 */
async function processDetectedFees(fees: DetectedFee[]): Promise<void> {
  if (fees.length === 0) {
    return;
  }

  console.log(`\n💰 Detected ${fees.length} new creator fee transaction(s)`);

  for (const fee of fees) {
    try {
      console.log(`   Processing: ${fee.amount.toFixed(6)} SOL from ${fee.signature.slice(0, 16)}...`);

      // Record the fee (10%/90% split)
      const result = await recordCreatorFees(fee.amount, fee.source);

      if (result.success) {
        console.log(`   ✅ Recorded: ${result.hourlyPoolAmount.toFixed(6)} SOL to pool, ${result.platformAmount.toFixed(6)} SOL to platform`);

        // Mark as processed
        await markTransactionProcessed(fee.signature, fee.amount, fee.source);
      } else {
        console.error(`   ❌ Failed to record fee: ${result.error}`);
      }
    } catch (error) {
      console.error(`   ❌ Error processing fee:`, error);
    }
  }
}

/**
 * Main auto-detection cycle
 */
export async function runAutoFeeDetection(): Promise<void> {
  if (!isAutoDetectionEnabled()) {
    return;
  }

  try {
    // Scan for new fees
    const detectedFees = await scanForNewFees();

    // Process and record them
    if (detectedFees.length > 0) {
      await processDetectedFees(detectedFees);
      console.log(`✅ Auto fee detection cycle complete\n`);
    }
  } catch (error) {
    console.error("❌ Auto fee detection cycle failed:", error);
  }
}

/**
 * Start the auto fee detection worker
 * Runs every 5 minutes
 */
export function startAutoFeeDetectionWorker(): void {
  if (!isAutoDetectionEnabled()) {
    console.log("⏭️ Auto fee detection worker disabled");
    return;
  }

  console.log("🚀 Starting auto fee detection worker (runs every 5 minutes)");

  // Run immediately on startup
  runAutoFeeDetection();

  // Then run every 5 minutes
  setInterval(async () => {
    await runAutoFeeDetection();
  }, 5 * 60 * 1000); // 5 minutes

  console.log("✅ Auto fee detection worker started successfully");
}
