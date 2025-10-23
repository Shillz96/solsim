/**
 * Deposit Monitoring Service
 *
 * Processes incoming SOL deposits from Helius webhooks
 * and credits user accounts.
 */

import prisma from "../plugins/prisma.js";
import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { validateDepositAddress } from "../utils/depositAddressGenerator.js";
import { Decimal } from "@prisma/client/runtime/library";

interface DepositTransaction {
  signature: string;
  toAddress: string;
  fromAddress: string;
  amount: number; // lamports
  blockTime?: number; // Unix timestamp
  slot?: number;
}

interface ProcessDepositResult {
  success: boolean;
  userId?: string;
  amount?: number; // SOL
  message: string;
}

// Cache to prevent double-processing
const processedSignatures = new Set<string>();

// Cleanup old signatures every hour (keep last 10k)
setInterval(() => {
  if (processedSignatures.size > 10000) {
    const arr = Array.from(processedSignatures);
    const toKeep = arr.slice(-10000);
    processedSignatures.clear();
    toKeep.forEach(sig => processedSignatures.add(sig));
  }
}, 60 * 60 * 1000);

/**
 * Process a deposit transaction from Helius webhook
 */
export async function processDepositTransaction(
  tx: DepositTransaction
): Promise<ProcessDepositResult> {
  const { signature, toAddress, fromAddress, amount, blockTime, slot } = tx;

  // Check if already processed
  if (processedSignatures.has(signature)) {
    return {
      success: false,
      message: `Transaction ${signature} already processed`,
    };
  }

  // Convert lamports to SOL
  const solAmount = amount / LAMPORTS_PER_SOL;

  // Minimum deposit amount (0.001 SOL to avoid dust)
  if (solAmount < 0.001) {
    console.log(`Deposit too small: ${solAmount} SOL from ${signature}`);
    return {
      success: false,
      message: `Deposit amount too small: ${solAmount} SOL (minimum 0.001 SOL)`,
    };
  }

  try {
    // Find user by deposit address
    const platformSeed = process.env.PLATFORM_DEPOSIT_SEED;
    if (!platformSeed) {
      throw new Error('PLATFORM_DEPOSIT_SEED not configured');
    }

    // Find which user owns this deposit address
    const user = await findUserByDepositAddress(toAddress, platformSeed);

    if (!user) {
      console.warn(`No user found for deposit address: ${toAddress}`);
      return {
        success: false,
        message: `No user found for deposit address ${toAddress}`,
      };
    }

    // Verify transaction on-chain (optional but recommended)
    const verified = await verifyTransactionOnChain(signature);
    if (!verified) {
      console.warn(`Transaction ${signature} not verified on-chain`);
      return {
        success: false,
        message: `Transaction ${signature} not verified on-chain`,
      };
    }

    // Credit user's balance in database
    await creditUserDeposit({
      userId: user.id,
      amount: solAmount,
      signature,
      depositAddress: toAddress,
      fromAddress,
      blockTime,
      slot,
    });

    // Mark as processed
    processedSignatures.add(signature);

    console.log(`✅ Deposited ${solAmount} SOL to user ${user.id} (${signature})`);

    return {
      success: true,
      userId: user.id,
      amount: solAmount,
      message: `Successfully credited ${solAmount} SOL to user ${user.id}`,
    };
  } catch (error: any) {
    console.error(`Error processing deposit ${signature}:`, error);
    return {
      success: false,
      message: error.message || 'Failed to process deposit',
    };
  }
}

/**
 * Find user by checking all users' deposit addresses
 *
 * TODO: Optimize by storing deposit addresses in database
 * or using a reverse lookup map (address -> userId)
 */
async function findUserByDepositAddress(
  address: string,
  platformSeed: string
): Promise<{ id: string; email: string | null } | null> {
  // Get all users
  const users = await prisma.user.findMany({
    select: { id: true, email: true },
  });

  // Check each user's deposit address
  for (const user of users) {
    const isValid = validateDepositAddress(user.id, address, platformSeed);
    if (isValid) {
      return user;
    }
  }

  return null;
}

/**
 * Verify transaction exists on-chain with sufficient confirmations
 */
async function verifyTransactionOnChain(signature: string): Promise<boolean> {
  try {
    const rpcUrl = process.env.HELIUS_RPC_URL || process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');

    const tx = await connection.getTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) {
      return false;
    }

    // Check if transaction was successful
    if (tx.meta?.err) {
      console.warn(`Transaction ${signature} failed on-chain:`, tx.meta.err);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Error verifying transaction ${signature}:`, error);
    return false;
  }
}

/**
 * Credit user's realSolBalance in database
 */
async function creditUserDeposit(params: {
  userId: string;
  amount: number;
  signature: string;
  depositAddress: string;
  fromAddress: string;
  blockTime?: number;
  slot?: number;
}) {
  const { userId, amount, signature, depositAddress, fromAddress, blockTime, slot } = params;

  await prisma.$transaction(async (tx) => {
    // Update user's balance
    const user = await tx.user.update({
      where: { id: userId },
      data: {
        realSolBalance: {
          increment: new Decimal(amount),
        },
      },
      select: {
        id: true,
        email: true,
        realSolBalance: true,
      },
    });

    console.log(`User ${userId} new balance: ${user.realSolBalance.toString()} SOL`);

    // TODO: Optional - Create deposit record in database
    // This requires adding a Deposit model to Prisma schema
    // await tx.deposit.create({
    //   data: {
    //     userId,
    //     amount: new Decimal(amount),
    //     txSignature: signature,
    //     depositAddress,
    //     fromAddress,
    //     status: 'CONFIRMED',
    //     confirmedAt: blockTime ? new Date(blockTime * 1000) : new Date(),
    //     slot,
    //   },
    // });
  });
}

/**
 * Get deposit history for a user
 * (Requires Deposit model in Prisma schema)
 */
export async function getUserDepositHistory(userId: string) {
  // TODO: Implement when Deposit model is added
  // return await prisma.deposit.findMany({
  //   where: { userId },
  //   orderBy: { createdAt: 'desc' },
  //   take: 50,
  // });

  return {
    message: 'Deposit history not implemented yet. Add Deposit model to Prisma schema.',
    deposits: [],
  };
}

/**
 * Get total deposits for a user
 */
export async function getUserTotalDeposits(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { realSolBalance: true },
  });

  return user?.realSolBalance ? parseFloat(user.realSolBalance.toString()) : 0;
}
