/**
 * Wallet Encryption Service
 * 
 * Handles encryption/decryption of imported wallet private keys.
 * Uses AES-256-GCM for authenticated encryption.
 */

import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits

// Get encryption secret from environment
const ENCRYPTION_SECRET = process.env.WALLET_ENCRYPTION_SECRET || process.env.PLATFORM_SEED || '';

if (!ENCRYPTION_SECRET) {
  console.warn('⚠️  WALLET_ENCRYPTION_SECRET not set. Using default (INSECURE for production!)');
}

/**
 * Encrypt a private key for storage
 * 
 * @param privateKey - Private key as array of numbers or base64 string
 * @param userId - User ID (used as additional authenticated data)
 * @returns Encrypted string in format: salt:iv:tag:encryptedData
 */
export function encryptPrivateKey(privateKey: number[] | string, userId: string): string {
  try {
    // Convert private key to buffer
    let keyBuffer: Buffer;
    if (Array.isArray(privateKey)) {
      keyBuffer = Buffer.from(privateKey);
    } else if (typeof privateKey === 'string') {
      // Assume base64 encoded
      keyBuffer = Buffer.from(privateKey, 'base64');
    } else {
      throw new Error('Invalid private key format');
    }

    // Generate random salt for key derivation
    const salt = crypto.randomBytes(SALT_LENGTH);
    
    // Derive encryption key from secret + salt
    const key = crypto.pbkdf2Sync(ENCRYPTION_SECRET, salt, 100000, 32, 'sha256');
    
    // Generate random IV
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    // Add userId as additional authenticated data (AAD)
    cipher.setAAD(Buffer.from(userId, 'utf8'));
    
    // Encrypt
    const encrypted = Buffer.concat([
      cipher.update(keyBuffer),
      cipher.final()
    ]);
    
    // Get authentication tag
    const tag = cipher.getAuthTag();
    
    // Combine salt:iv:tag:encrypted and encode as base64
    const combined = Buffer.concat([salt, iv, tag, encrypted]);
    
    return combined.toString('base64');
    
  } catch (error) {
    console.error('Failed to encrypt private key:', error);
    throw new Error('Private key encryption failed');
  }
}

/**
 * Decrypt a private key for export
 * 
 * @param encryptedKey - Encrypted key string (format: salt:iv:tag:encryptedData in base64)
 * @param userId - User ID (must match the one used during encryption)
 * @returns Decrypted private key as array of numbers
 */
export function decryptPrivateKey(encryptedKey: string, userId: string): number[] {
  try {
    // Decode from base64
    const combined = Buffer.from(encryptedKey, 'base64');
    
    // Extract components
    const salt = combined.slice(0, SALT_LENGTH);
    const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = combined.slice(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encrypted = combined.slice(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    
    // Derive decryption key
    const key = crypto.pbkdf2Sync(ENCRYPTION_SECRET, salt, 100000, 32, 'sha256');
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    
    // Set authentication tag
    decipher.setAuthTag(tag);
    
    // Add userId as AAD (must match encryption)
    decipher.setAAD(Buffer.from(userId, 'utf8'));
    
    // Decrypt
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
    
    // Convert to number array
    return Array.from(decrypted);
    
  } catch (error) {
    console.error('Failed to decrypt private key:', error);
    throw new Error('Private key decryption failed. This may indicate tampering or corruption.');
  }
}

/**
 * Validate that a private key can be encrypted and decrypted
 * Used for testing encryption integrity
 */
export function validateEncryption(privateKey: number[], userId: string): boolean {
  try {
    const encrypted = encryptPrivateKey(privateKey, userId);
    const decrypted = decryptPrivateKey(encrypted, userId);
    
    // Check if decrypted matches original
    if (decrypted.length !== privateKey.length) {
      return false;
    }
    
    for (let i = 0; i < privateKey.length; i++) {
      if (decrypted[i] !== privateKey[i]) {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

export default {
  encryptPrivateKey,
  decryptPrivateKey,
  validateEncryption,
};

