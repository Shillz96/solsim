// safeUpsert.ts - Safe database operations with validation
import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import * as bcrypt from 'bcryptjs';
import { logger } from './logger.js';

export async function safeUpsertToken(prisma: PrismaClient, token: any) {
  // Minimal validation - address is required for Token model
  if (!token || !token.address) {
    logger.warn('Skipping upsert: missing address', token);
    return null;
  }

  // Canonicalize address
  const address = token.address.trim().toLowerCase();
  const symbol = (token.symbol || '').trim();

  // Build a safe "where" clause using address (primary key)
  const where = { address };

  try {
    const result = await prisma.token.upsert({
      where,
      create: {
        address,
        symbol,
        name: token.name || null,
        imageUrl: token.imageUrl || null,
        lastPrice: token.lastPrice ? new Decimal(token.lastPrice) : null,
        lastTs: token.lastTs ? new Date(token.lastTs) : null,
        firstSeenAt: token.firstSeenAt ? new Date(token.firstSeenAt) : new Date(),
        lastUpdatedAt: new Date()
      },
      update: {
        name: token.name || undefined,
        imageUrl: token.imageUrl || undefined,
        lastPrice: token.lastPrice ? new Decimal(token.lastPrice) : undefined,
        lastTs: token.lastTs ? new Date(token.lastTs) : undefined,
        lastUpdatedAt: new Date()
      }
    });
    return result;
  } catch (e: any) {
    logger.error('Prisma upsert failed for', { symbol, address, error: e && e.stack ? e.stack : e });
    // Swallow DB error so the entire ingestion job doesn't crash
    return null;
  }
}

export async function safeUpsertUser(prisma: PrismaClient, userData: {
  email: string;
  username: string; 
  password: string;
  solanaWallet?: string;
}) {
  if (!userData.email || !userData.username || !userData.password) {
    throw new Error('Missing required user data: email, username, or password');
  }

  // Canonicalize email
  const email = userData.email.trim().toLowerCase();
  const username = userData.username.trim();
  const solanaWallet = userData.solanaWallet?.trim() || undefined;

  try {
    // First, try to find existing user by email
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      // User exists, verify password
      const isPasswordValid = await bcrypt.compare(userData.password, existingUser.passwordHash);
      if (isPasswordValid) {
        // Return existing user if password matches
        return { user: existingUser, isNew: false };
      } else {
        // Password doesn't match, this is an error
        throw new Error('User already exists with different password');
      }
    }

    // User doesn't exist, create new one
    const passwordHash = await bcrypt.hash(userData.password, 10);
    const newUser = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        solanaWallet,
        virtualSolBalance: new Decimal(100) // Initial balance: 100 SOL for all users
      }
    });

    return { user: newUser, isNew: true };
  } catch (error: any) {
    // Handle unique constraint on username as well
    if (error.code === 'P2002') {
      const constraintField = error.meta?.target?.[0];
      if (constraintField === 'email') {
        throw new Error('Email already exists');
      } else if (constraintField === 'username') {
        throw new Error('Username already exists');
      } else {
        throw new Error('User already exists');
      }
    }
    throw error;
  }
}

// Safe wrapper for any async operation
export async function safeAsyncOperation<T>(
  operation: () => Promise<T>,
  fallback: T,
  context: string = 'operation'
): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    logger.error(`Safe operation failed for ${context}:`, error);
    return fallback;
  }
}

// Safe DexScreener response normalization
export function normalizeDexScreenerPairs(response: any): any[] {
  try {
    // Handle various response shapes
    if (Array.isArray(response)) {
      return response;
    }
    if (response && Array.isArray(response.pairs)) {
      return response.pairs;
    }
    if (response && response.data && Array.isArray(response.data)) {
      return response.data;
    }
    logger.warn('Unexpected DexScreener response shape:', typeof response);
    return [];
  } catch (error) {
    logger.error('Error normalizing DexScreener response:', error);
    return [];
  }
}
