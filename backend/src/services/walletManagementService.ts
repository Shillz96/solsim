/**
 * Wallet Management Service
 * 
 * Handles multi-wallet operations for users:
 * - Creating platform-generated wallets
 * - Importing external wallets
 * - Switching active wallets
 * - Transferring funds between wallets
 * - Exporting wallet keys
 */

import prisma from '../plugins/prisma.js';
import { Decimal } from '@prisma/client/runtime/library';
import { Keypair, PublicKey } from '@solana/web3.js';
import { getDepositKeypair, generateDepositAddress } from '../utils/depositAddressGenerator.js';
import { encryptPrivateKey, decryptPrivateKey } from './walletEncryptionService.js';
import * as crypto from 'crypto';

const D = (x: Decimal | number | string) => new Decimal(x);
const PLATFORM_SEED = process.env.PLATFORM_SEED || '';

/**
 * Get all wallets for a user
 */
export async function getUserWallets(userId: string) {
  const wallets = await prisma.userWallet.findMany({
    where: { userId },
    orderBy: [
      { isActive: 'desc' }, // Active wallet first
      { createdAt: 'asc' }  // Then oldest first
    ]
  });

  return wallets.map(wallet => ({
    id: wallet.id,
    name: wallet.name,
    walletType: wallet.walletType,
    address: wallet.address,
    balance: wallet.balance.toString(),
    isActive: wallet.isActive,
    createdAt: wallet.createdAt,
    updatedAt: wallet.updatedAt,
    hasEncryptedKey: !!wallet.encryptedKey
  }));
}

/**
 * Get active wallet for a user
 */
export async function getActiveWallet(userId: string) {
  const activeWallet = await prisma.userWallet.findFirst({
    where: {
      userId,
      isActive: true
    }
  });

  if (!activeWallet) {
    // No active wallet found, try to get first wallet
    const firstWallet = await prisma.userWallet.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' }
    });

    if (firstWallet) {
      // Set it as active
      await setActiveWallet(userId, firstWallet.id);
      return firstWallet;
    }

    return null;
  }

  return activeWallet;
}

/**
 * Create a new platform-generated wallet
 */
export async function createWallet(userId: string, name: string) {
  if (!PLATFORM_SEED) {
    throw new Error('PLATFORM_SEED not configured');
  }

  // Generate unique wallet address deterministically
  // Use userId + timestamp + random component for uniqueness
  const uniqueSeed = `${userId}:wallet:${Date.now()}:${crypto.randomBytes(8).toString('hex')}`;
  const walletHash = crypto
    .createHash('sha256')
    .update(`${PLATFORM_SEED}:${uniqueSeed}`)
    .digest();
  
  const seed = walletHash.slice(0, 32);
  const keypair = Keypair.fromSeed(seed);
  const address = keypair.publicKey.toBase58();

  // Check if user has any wallets - if not, make this one active
  const existingWalletsCount = await prisma.userWallet.count({
    where: { userId }
  });

  const isFirstWallet = existingWalletsCount === 0;

  const wallet = await prisma.userWallet.create({
    data: {
      userId,
      name,
      walletType: 'PLATFORM_GENERATED',
      address,
      encryptedKey: null, // Platform wallets don't store keys
      balance: D(0),
      isActive: isFirstWallet // First wallet is active by default
    }
  });

  return {
    id: wallet.id,
    name: wallet.name,
    walletType: wallet.walletType,
    address: wallet.address,
    balance: wallet.balance.toString(),
    isActive: wallet.isActive,
    createdAt: wallet.createdAt
  };
}

/**
 * Import an external wallet
 */
export async function importWallet(
  userId: string,
  name: string,
  privateKey: number[] | string
) {
  try {
    // Convert private key to keypair to validate and get address
    let keyArray: number[];
    if (typeof privateKey === 'string') {
      // Parse JSON string
      keyArray = JSON.parse(privateKey);
    } else {
      keyArray = privateKey;
    }

    if (!Array.isArray(keyArray) || keyArray.length !== 64) {
      throw new Error('Invalid private key format. Expected 64-byte array.');
    }

    // Create keypair to validate and get address
    const keypair = Keypair.fromSecretKey(Uint8Array.from(keyArray));
    const address = keypair.publicKey.toBase58();

    // Check if wallet already exists (by address)
    const existing = await prisma.userWallet.findUnique({
      where: { address }
    });

    if (existing) {
      if (existing.userId === userId) {
        throw new Error('You have already imported this wallet.');
      } else {
        throw new Error('This wallet is already imported by another user.');
      }
    }

    // Encrypt the private key
    const encryptedKey = encryptPrivateKey(keyArray, userId);

    // Check if user has any wallets
    const existingWalletsCount = await prisma.userWallet.count({
      where: { userId }
    });

    const isFirstWallet = existingWalletsCount === 0;

    // Create wallet entry
    const wallet = await prisma.userWallet.create({
      data: {
        userId,
        name,
        walletType: 'IMPORTED',
        address,
        encryptedKey,
        balance: D(0), // Will be updated when funds are detected
        isActive: isFirstWallet
      }
    });

    console.log(`✅ Wallet imported for user ${userId}: ${address.slice(0, 8)}...`);

    return {
      id: wallet.id,
      name: wallet.name,
      walletType: wallet.walletType,
      address: wallet.address,
      balance: wallet.balance.toString(),
      isActive: wallet.isActive,
      createdAt: wallet.createdAt
    };
  } catch (error: any) {
    console.error('Failed to import wallet:', error);
    throw new Error(error.message || 'Failed to import wallet');
  }
}

/**
 * Set active wallet for trading
 */
export async function setActiveWallet(userId: string, walletId: string) {
  // Verify wallet belongs to user
  const wallet = await prisma.userWallet.findFirst({
    where: {
      id: walletId,
      userId
    }
  });

  if (!wallet) {
    throw new Error('Wallet not found or does not belong to you');
  }

  // Use transaction to ensure only one active wallet
  await prisma.$transaction(async (tx) => {
    // Deactivate all other wallets
    await tx.userWallet.updateMany({
      where: {
        userId,
        id: { not: walletId }
      },
      data: { isActive: false }
    });

    // Activate selected wallet
    await tx.userWallet.update({
      where: { id: walletId },
      data: { isActive: true }
    });
  });

  console.log(`✅ Active wallet set for user ${userId}: ${wallet.address.slice(0, 8)}...`);

  return { success: true, walletId, address: wallet.address };
}

/**
 * Rename a wallet
 */
export async function renameWallet(userId: string, walletId: string, newName: string) {
  const wallet = await prisma.userWallet.findFirst({
    where: {
      id: walletId,
      userId
    }
  });

  if (!wallet) {
    throw new Error('Wallet not found');
  }

  const updated = await prisma.userWallet.update({
    where: { id: walletId },
    data: { name: newName }
  });

  return {
    id: updated.id,
    name: updated.name,
    address: updated.address
  };
}

/**
 * Export wallet private key
 */
export async function exportWalletKey(userId: string, walletId: string) {
  const wallet = await prisma.userWallet.findFirst({
    where: {
      id: walletId,
      userId
    }
  });

  if (!wallet) {
    throw new Error('Wallet not found');
  }

  let privateKey: number[];

  if (wallet.walletType === 'PLATFORM_GENERATED') {
    // Generate from platform seed
    if (!PLATFORM_SEED) {
      throw new Error('PLATFORM_SEED not configured');
    }

    // For platform wallets, we need to regenerate the key
    // This is a challenge - we need to store how we generated it
    // For now, throw error - we need additional metadata
    throw new Error('Cannot export platform-generated wallet keys yet. Please use the deposit address export instead.');
  } else {
    // IMPORTED wallet - decrypt stored key
    if (!wallet.encryptedKey) {
      throw new Error('No encrypted key found for this wallet');
    }

    privateKey = decryptPrivateKey(wallet.encryptedKey, userId);
  }

  // Log export for security audit
  console.warn(`🔑 Private key export for wallet ${walletId} by user ${userId}`);

  return {
    address: wallet.address,
    privateKey,
    privateKeyBase58: Buffer.from(privateKey).toString('base64'),
    walletType: wallet.walletType,
    name: wallet.name,
    exportedAt: new Date().toISOString()
  };
}

/**
 * Transfer funds between wallets (internal transfer)
 */
export async function transferBetweenWallets(
  userId: string,
  fromWalletId: string,
  toWalletId: string,
  amount: number | string
) {
  const transferAmount = D(amount);

  if (transferAmount.lte(0)) {
    throw new Error('Transfer amount must be greater than 0');
  }

  // Verify both wallets belong to user
  const [fromWallet, toWallet] = await Promise.all([
    prisma.userWallet.findFirst({
      where: { id: fromWalletId, userId }
    }),
    prisma.userWallet.findFirst({
      where: { id: toWalletId, userId }
    })
  ]);

  if (!fromWallet) {
    throw new Error('Source wallet not found');
  }

  if (!toWallet) {
    throw new Error('Destination wallet not found');
  }

  if (fromWallet.id === toWallet.id) {
    throw new Error('Cannot transfer to the same wallet');
  }

  // Check sufficient balance
  if ((fromWallet.balance as Decimal).lt(transferAmount)) {
    throw new Error(`Insufficient balance. Available: ${fromWallet.balance.toString()} SOL`);
  }

  // Perform transfer in transaction
  const result = await prisma.$transaction(async (tx) => {
    // Deduct from source
    const updatedFrom = await tx.userWallet.update({
      where: { id: fromWalletId },
      data: {
        balance: {
          decrement: transferAmount
        }
      }
    });

    // Add to destination
    const updatedTo = await tx.userWallet.update({
      where: { id: toWalletId },
      data: {
        balance: {
          increment: transferAmount
        }
      }
    });

    return { updatedFrom, updatedTo };
  });

  console.log(`✅ Transfer: ${transferAmount.toString()} SOL from ${fromWallet.address.slice(0, 8)}... to ${toWallet.address.slice(0, 8)}...`);

  return {
    success: true,
    amount: transferAmount.toString(),
    fromWallet: {
      id: fromWallet.id,
      name: fromWallet.name,
      newBalance: result.updatedFrom.balance.toString()
    },
    toWallet: {
      id: toWallet.id,
      name: toWallet.name,
      newBalance: result.updatedTo.balance.toString()
    }
  };
}

/**
 * Delete a wallet (only if balance is 0 and not active)
 */
export async function deleteWallet(userId: string, walletId: string) {
  const wallet = await prisma.userWallet.findFirst({
    where: {
      id: walletId,
      userId
    }
  });

  if (!wallet) {
    throw new Error('Wallet not found');
  }

  if (wallet.isActive) {
    throw new Error('Cannot delete active wallet. Please switch to another wallet first.');
  }

  if ((wallet.balance as Decimal).gt(0)) {
    throw new Error('Cannot delete wallet with non-zero balance. Please transfer funds first.');
  }

  await prisma.userWallet.delete({
    where: { id: walletId }
  });

  console.log(`✅ Wallet deleted for user ${userId}: ${wallet.address.slice(0, 8)}...`);

  return { success: true };
}

export default {
  getUserWallets,
  getActiveWallet,
  createWallet,
  importWallet,
  setActiveWallet,
  renameWallet,
  exportWalletKey,
  transferBetweenWallets,
  deleteWallet,
};

