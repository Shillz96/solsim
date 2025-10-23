/**
 * Deposit Address Generator
 *
 * Generates unique deposit addresses for users using Solana keypair derivation.
 * Uses a deterministic approach: derive sub-account from platform wallet + user ID.
 *
 * Best Practice (2025): Per-user addresses for easier deposit tracking.
 */

import { Keypair, PublicKey } from '@solana/web3.js';
import { derivePath } from 'ed25519-hd-key';
import * as crypto from 'crypto';

/**
 * Generate a deterministic deposit address for a user
 *
 * Strategy: Derive a keypair from platform seed + user ID hash
 * This ensures:
 * - Each user gets a unique address
 * - Address can be regenerated from user ID
 * - Platform controls all deposit addresses
 *
 * @param userId - User's database ID
 * @param platformSeed - Platform's master seed (from env variable)
 * @returns PublicKey for user's deposit address
 */
export function generateDepositAddress(userId: string, platformSeed: string): PublicKey {
  // Create deterministic seed from platform seed + user ID
  const userHash = crypto
    .createHash('sha256')
    .update(`${platformSeed}:deposit:${userId}`)
    .digest();

  // Derive keypair using ed25519 HD derivation
  // This follows Solana's hierarchical deterministic wallet pattern
  const seed = userHash.slice(0, 32); // Use first 32 bytes as seed
  const keypair = Keypair.fromSeed(seed);

  return keypair.publicKey;
}

/**
 * Get the full keypair for a user's deposit address
 *
 * USE WITH CAUTION: Only call this when you need to sign transactions
 * from the deposit address (e.g., consolidating funds to hot wallet)
 *
 * @param userId - User's database ID
 * @param platformSeed - Platform's master seed (from env variable)
 * @returns Full Keypair for signing
 */
export function getDepositKeypair(userId: string, platformSeed: string): Keypair {
  const userHash = crypto
    .createHash('sha256')
    .update(`${platformSeed}:deposit:${userId}`)
    .digest();

  const seed = userHash.slice(0, 32);
  return Keypair.fromSeed(seed);
}

/**
 * Validate that an address belongs to a user
 *
 * @param userId - User's database ID
 * @param address - Address to validate
 * @param platformSeed - Platform's master seed
 * @returns true if address matches user's deposit address
 */
export function validateDepositAddress(
  userId: string,
  address: string | PublicKey,
  platformSeed: string
): boolean {
  const expectedAddress = generateDepositAddress(userId, platformSeed);
  const providedAddress = typeof address === 'string'
    ? new PublicKey(address)
    : address;

  return expectedAddress.equals(providedAddress);
}

/**
 * Get deposit addresses for multiple users (batch operation)
 *
 * @param userIds - Array of user IDs
 * @param platformSeed - Platform's master seed
 * @returns Map of userId -> deposit address
 */
export function generateBatchDepositAddresses(
  userIds: string[],
  platformSeed: string
): Map<string, PublicKey> {
  const addresses = new Map<string, PublicKey>();

  for (const userId of userIds) {
    addresses.set(userId, generateDepositAddress(userId, platformSeed));
  }

  return addresses;
}

/**
 * Format address for display (shortened version)
 *
 * @param address - PublicKey to format
 * @returns Formatted string like "ABC...XYZ"
 */
export function formatAddressForDisplay(address: PublicKey): string {
  const str = address.toBase58();
  return `${str.slice(0, 4)}...${str.slice(-4)}`;
}

export default {
  generateDepositAddress,
  getDepositKeypair,
  validateDepositAddress,
  generateBatchDepositAddresses,
  formatAddressForDisplay,
};
