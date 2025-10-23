/**
 * Deposit Service
 * 
 * Handles SOL deposits for real trading:
 * - Generate deterministic deposit addresses per user
 * - Verify deposit transactions on-chain
 * - Credit user accounts atomically
 * - Track deposit history
 */

import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import prisma from '../plugins/prisma.js';
import { Decimal } from '@prisma/client/runtime/library';
import { generateDepositAddress, validateDepositAddress } from '../utils/depositAddressGenerator.js';
import * as notificationService from './notificationService.js';

const D = (x: Decimal | number | string) => new Decimal(x);

// Configuration
const PLATFORM_SEED = process.env.PLATFORM_SEED || '';
const RPC_ENDPOINT = process.env.HELIUS_RPC_URL || process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const MIN_DEPOSIT_AMOUNT = parseFloat(process.env.MIN_DEPOSIT_AMOUNT || '0.01');

/**
 * Generate or retrieve user's deposit address
 */
export async function getUserDepositAddress(userId: string): Promise<{
  address: string;
  addressShort: string;
}> {
  if (!PLATFORM_SEED) {
    throw new Error('PLATFORM_SEED not configured');
  }

  // Check if user already has a deposit address stored
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { realSolDepositAddress: true }
  });

  let depositAddress: string;

  if (user?.realSolDepositAddress) {
    // Use existing address
    depositAddress = user.realSolDepositAddress;
  } else {
    // Generate new deterministic address
    const publicKey = generateDepositAddress(userId, PLATFORM_SEED);
    depositAddress = publicKey.toBase58();

    // Store in database
    await prisma.user.update({
      where: { id: userId },
      data: { realSolDepositAddress: depositAddress }
    });
  }

  // Format shortened version
  const addressShort = `${depositAddress.slice(0, 4)}...${depositAddress.slice(-4)}`;

  return {
    address: depositAddress,
    addressShort
  };
}

/**
 * Verify a deposit transaction on-chain
 */
export async function verifyDepositTransaction(
  txSignature: string,
  expectedAddress: string,
  expectedMinAmount?: number
): Promise<{
  success: boolean;
  error?: string;
  amount?: number;
  fromAddress?: string;
}> {
  try {
    const connection = new Connection(RPC_ENDPOINT, 'confirmed');

    // Fetch transaction with retries
    let transaction = null;
    let retries = 3;
    
    while (retries > 0 && !transaction) {
      transaction = await connection.getTransaction(txSignature, {
        maxSupportedTransactionVersion: 0,
        commitment: 'confirmed'
      });
      
      if (!transaction && retries > 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      retries--;
    }

    if (!transaction) {
      return { success: false, error: 'Transaction not found on blockchain' };
    }

    // Check transaction was successful
    if (transaction.meta?.err) {
      return { success: false, error: 'Transaction failed on blockchain' };
    }

    // Parse transaction to find SOL transfer
    const preBalances = transaction.meta?.preBalances || [];
    const postBalances = transaction.meta?.postBalances || [];
    const accountKeys = transaction.transaction.message.getAccountKeys().staticAccountKeys;

    // Find recipient and sender indices
    const recipientPubkey = new PublicKey(expectedAddress);
    let recipientIndex = -1;
    let senderIndex = -1;

    for (let i = 0; i < accountKeys.length; i++) {
      if (accountKeys[i].equals(recipientPubkey)) {
        recipientIndex = i;
      } else if (i === 0) {
        // First account is typically the sender/fee payer
        senderIndex = i;
      }
    }

    if (recipientIndex === -1) {
      return {
        success: false,
        error: 'Transaction does not send to the expected deposit address'
      };
    }

    // Calculate amount transferred to recipient
    const recipientBalanceChange = postBalances[recipientIndex] - preBalances[recipientIndex];
    const amountSOL = recipientBalanceChange / LAMPORTS_PER_SOL;

    // Verify minimum amount
    const minAmount = expectedMinAmount || MIN_DEPOSIT_AMOUNT;
    if (amountSOL < minAmount) {
      return {
        success: false,
        error: `Amount ${amountSOL.toFixed(4)} SOL is below minimum deposit of ${minAmount} SOL`,
        amount: amountSOL
      };
    }

    // Get sender address
    const fromAddress = senderIndex >= 0 ? accountKeys[senderIndex].toBase58() : undefined;

    return {
      success: true,
      amount: amountSOL,
      fromAddress
    };

  } catch (error: any) {
    console.error('Deposit verification error:', error);
    return {
      success: false,
      error: error.message || 'Failed to verify deposit transaction'
    };
  }
}

/**
 * Credit a deposit to user's account
 * Atomic operation with database transaction
 */
export async function creditDeposit(
  userId: string,
  amount: number,
  txSignature: string,
  depositAddress: string,
  fromAddress?: string
): Promise<{
  success: boolean;
  depositId?: string;
  newBalance?: string;
  error?: string;
}> {
  try {
    const amountDecimal = D(amount);

    // Check if transaction already processed
    const existing = await prisma.deposit.findUnique({
      where: { txSignature }
    });

    if (existing) {
      return {
        success: false,
        error: 'Deposit already processed'
      };
    }

    // Process deposit in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create deposit record
      const deposit = await tx.deposit.create({
        data: {
          userId,
          amount: amountDecimal,
          txSignature,
          status: 'CONFIRMED',
          depositAddress,
          fromAddress,
          confirmedAt: new Date()
        }
      });

      // Update user's real SOL balance
      const user = await tx.user.update({
        where: { id: userId },
        data: {
          realSolBalance: {
            increment: amountDecimal
          }
        },
        select: {
          realSolBalance: true,
          handle: true
        }
      });

      return { deposit, user };
    });

    console.log(`✅ Deposit credited: ${amount} SOL to user ${userId} (tx: ${txSignature.slice(0, 8)}...)`);

    // Send notification
    await notificationService.createNotification({
      userId,
      type: 'SYSTEM',
      category: 'SYSTEM',
      title: '💰 Deposit Confirmed',
      message: `Your deposit of ${amount.toFixed(4)} SOL has been confirmed and added to your account.`,
      actionUrl: `/wallet`,
      metadata: {
        amount: amount.toString(),
        txSignature,
        depositId: result.deposit.id
      }
    });

    return {
      success: true,
      depositId: result.deposit.id,
      newBalance: result.user.realSolBalance.toString()
    };

  } catch (error: any) {
    console.error('Error crediting deposit:', error);
    return {
      success: false,
      error: error.message || 'Failed to credit deposit'
    };
  }
}

/**
 * Get user's deposit history
 */
export async function getDepositHistory(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{
  deposits: Array<{
    id: string;
    amount: string;
    txSignature: string;
    status: string;
    depositAddress: string;
    fromAddress?: string;
    confirmedAt?: Date;
    createdAt: Date;
  }>;
  total: number;
}> {
  const [deposits, total] = await Promise.all([
    prisma.deposit.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    }),
    prisma.deposit.count({ where: { userId } })
  ]);

  return {
    deposits: deposits.map(d => ({
      id: d.id,
      amount: d.amount.toString(),
      txSignature: d.txSignature,
      status: d.status,
      depositAddress: d.depositAddress,
      fromAddress: d.fromAddress || undefined,
      confirmedAt: d.confirmedAt || undefined,
      createdAt: d.createdAt
    })),
    total
  };
}

/**
 * Check if a user has the expected deposit address
 */
export function isValidDepositAddress(userId: string, address: string): boolean {
  if (!PLATFORM_SEED) {
    return false;
  }
  
  return validateDepositAddress(userId, address, PLATFORM_SEED);
}

/**
 * Find user by deposit address
 */
export async function findUserByDepositAddress(address: string): Promise<string | null> {
  const user = await prisma.user.findFirst({
    where: { realSolDepositAddress: address },
    select: { id: true }
  });

  return user?.id || null;
}

export default {
  getUserDepositAddress,
  verifyDepositTransaction,
  creditDeposit,
  getDepositHistory,
  isValidDepositAddress,
  findUserByDepositAddress
};

