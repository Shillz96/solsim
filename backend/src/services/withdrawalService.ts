/**
 * Withdrawal Service
 * 
 * Handles SOL withdrawals from user's real balance:
 * - Validate withdrawal requests
 * - Execute SOL transfers from platform wallet
 * - Track withdrawal history
 * - Handle errors and notifications
 */

import { 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction
} from '@solana/web3.js';
import prisma from '../plugins/prisma.js';
import { Decimal } from '@prisma/client/runtime/library';
import { getDepositKeypair } from '../utils/depositAddressGenerator.js';
import * as notificationService from './notificationService.js';

const D = (x: Decimal | number | string) => new Decimal(x);

// Configuration
const PLATFORM_SEED = process.env.PLATFORM_SEED || '';
const RPC_ENDPOINT = process.env.HELIUS_RPC_URL || process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const MIN_WITHDRAWAL_AMOUNT = parseFloat(process.env.MIN_WITHDRAWAL_AMOUNT || '0.01');
const MAX_WITHDRAWAL_AMOUNT = parseFloat(process.env.MAX_WITHDRAWAL_AMOUNT || '100');
const WITHDRAWAL_FEE = parseFloat(process.env.WITHDRAWAL_FEE || '0');
const NETWORK_FEE_ESTIMATE = 0.000005; // ~5000 lamports

/**
 * Validate withdrawal request
 */
function validateWithdrawal(
  amount: number,
  userBalance: Decimal,
  toAddress: string
): { valid: boolean; error?: string } {
  // Check minimum amount
  if (amount < MIN_WITHDRAWAL_AMOUNT) {
    return {
      valid: false,
      error: `Minimum withdrawal amount is ${MIN_WITHDRAWAL_AMOUNT} SOL`
    };
  }

  // Check maximum amount (if configured)
  if (MAX_WITHDRAWAL_AMOUNT > 0 && amount > MAX_WITHDRAWAL_AMOUNT) {
    return {
      valid: false,
      error: `Maximum withdrawal amount is ${MAX_WITHDRAWAL_AMOUNT} SOL`
    };
  }

  // Check sufficient balance (including fees)
  const totalRequired = amount + WITHDRAWAL_FEE;
  if (D(totalRequired).gt(userBalance)) {
    return {
      valid: false,
      error: `Insufficient balance. Required: ${totalRequired.toFixed(4)} SOL, Available: ${userBalance.toString()} SOL`
    };
  }

  // Validate address format
  try {
    new PublicKey(toAddress);
  } catch (error) {
    return {
      valid: false,
      error: 'Invalid Solana address format'
    };
  }

  return { valid: true };
}

/**
 * Execute withdrawal transaction
 */
export async function executeWithdrawal(params: {
  userId: string;
  amount: number;
  toAddress: string;
}): Promise<{
  success: boolean;
  withdrawalId?: string;
  txSignature?: string;
  newBalance?: string;
  error?: string;
}> {
  const { userId, amount, toAddress } = params;

  try {
    // Get user and validate
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true,
        handle: true,
        realSolBalance: true 
      }
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Validate withdrawal
    const validation = validateWithdrawal(amount, user.realSolBalance, toAddress);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Calculate amounts
    const fee = D(WITHDRAWAL_FEE);
    const netAmount = D(amount);
    const totalDeduction = netAmount.add(fee);

    // Create pending withdrawal record
    const withdrawal = await prisma.withdrawal.create({
      data: {
        userId,
        amount: netAmount,
        fee,
        netAmount,
        toAddress,
        status: 'PENDING'
      }
    });

    console.log(`🔄 Processing withdrawal: ${amount} SOL to ${toAddress.slice(0, 8)}... (ID: ${withdrawal.id})`);

    // Update status to PROCESSING
    await prisma.withdrawal.update({
      where: { id: withdrawal.id },
      data: { 
        status: 'PROCESSING',
        processedAt: new Date()
      }
    });

    // Execute blockchain transaction
    let txSignature: string;
    try {
      txSignature = await sendWithdrawal(toAddress, amount);
      console.log(`✅ Withdrawal transaction sent: ${txSignature}`);
    } catch (txError: any) {
      // Transaction failed - mark as failed
      await prisma.withdrawal.update({
        where: { id: withdrawal.id },
        data: {
          status: 'FAILED',
          errorMessage: txError.message || 'Transaction failed'
        }
      });

      return {
        success: false,
        withdrawalId: withdrawal.id,
        error: `Transaction failed: ${txError.message}`
      };
    }

    // Transaction succeeded - update database atomically
    const result = await prisma.$transaction(async (tx) => {
      // Update withdrawal record
      await tx.withdrawal.update({
        where: { id: withdrawal.id },
        data: {
          txSignature,
          status: 'CONFIRMED',
          confirmedAt: new Date()
        }
      });

      // Deduct from user's real SOL balance
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          realSolBalance: {
            decrement: totalDeduction
          }
        },
        select: { realSolBalance: true }
      });

      return { updatedUser };
    });

    console.log(`✅ Withdrawal completed: ${amount} SOL (tx: ${txSignature.slice(0, 8)}...)`);

    // Send notification
    await notificationService.createNotification({
      userId,
      type: 'SYSTEM',
      category: 'SYSTEM',
      title: '💸 Withdrawal Confirmed',
      message: `Your withdrawal of ${amount.toFixed(4)} SOL has been processed successfully.`,
      actionUrl: `/wallet`,
      metadata: {
        amount: amount.toString(),
        fee: fee.toString(),
        toAddress,
        txSignature,
        withdrawalId: withdrawal.id
      }
    });

    return {
      success: true,
      withdrawalId: withdrawal.id,
      txSignature,
      newBalance: result.updatedUser.realSolBalance.toString()
    };

  } catch (error: any) {
    console.error('Withdrawal processing error:', error);
    return {
      success: false,
      error: error.message || 'Withdrawal failed'
    };
  }
}

/**
 * Send SOL withdrawal transaction on-chain
 */
async function sendWithdrawal(
  toAddress: string,
  amount: number
): Promise<string> {
  if (!PLATFORM_SEED) {
    throw new Error('PLATFORM_SEED not configured');
  }

  const connection = new Connection(RPC_ENDPOINT, 'confirmed');

  // Get platform keypair (we control this)
  // For withdrawals, we need a platform hot wallet
  // Using user's deposit keypair generator as fallback - in production, use dedicated hot wallet
  const platformKeypair = getDepositKeypair('platform-hot-wallet', PLATFORM_SEED);

  const toPubkey = new PublicKey(toAddress);
  const lamports = Math.floor(amount * LAMPORTS_PER_SOL);

  // Build transaction
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: platformKeypair.publicKey,
      toPubkey,
      lamports
    })
  );

  // Get recent blockhash
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = platformKeypair.publicKey;

  // Sign and send
  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [platformKeypair],
    {
      commitment: 'confirmed',
      skipPreflight: false,
      maxRetries: 3
    }
  );

  return signature;
}

/**
 * Get withdrawal history for user
 */
export async function getWithdrawalHistory(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{
  withdrawals: Array<{
    id: string;
    amount: string;
    fee: string;
    netAmount: string;
    toAddress: string;
    txSignature?: string;
    status: string;
    errorMessage?: string;
    requestedAt: Date;
    processedAt?: Date;
    confirmedAt?: Date;
  }>;
  total: number;
}> {
  const [withdrawals, total] = await Promise.all([
    prisma.withdrawal.findMany({
      where: { userId },
      orderBy: { requestedAt: 'desc' },
      take: limit,
      skip: offset
    }),
    prisma.withdrawal.count({ where: { userId } })
  ]);

  return {
    withdrawals: withdrawals.map(w => ({
      id: w.id,
      amount: w.amount.toString(),
      fee: w.fee.toString(),
      netAmount: w.netAmount.toString(),
      toAddress: w.toAddress,
      txSignature: w.txSignature || undefined,
      status: w.status,
      errorMessage: w.errorMessage || undefined,
      requestedAt: w.requestedAt,
      processedAt: w.processedAt || undefined,
      confirmedAt: w.confirmedAt || undefined
    })),
    total
  };
}

/**
 * Get platform hot wallet balance (for monitoring)
 */
export async function getPlatformHotWalletBalance(): Promise<number> {
  if (!PLATFORM_SEED) {
    return 0;
  }

  try {
    const connection = new Connection(RPC_ENDPOINT, 'confirmed');
    const platformKeypair = getDepositKeypair('platform-hot-wallet', PLATFORM_SEED);
    const balance = await connection.getBalance(platformKeypair.publicKey);
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error('Error fetching platform wallet balance:', error);
    return 0;
  }
}

export default {
  executeWithdrawal,
  getWithdrawalHistory,
  getPlatformHotWalletBalance
};

