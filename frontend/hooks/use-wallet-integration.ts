'use client';

import { useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';

interface WalletConnectionResult {
  success: boolean;
  walletAddress: string;
  verified: boolean;
  tier: 'EMAIL_USER' | 'WALLET_USER' | 'SIM_HOLDER' | 'ADMINISTRATOR';
  benefits: Array<{
    name: string;
    description: string;
    available: boolean;
  }>;
  balanceUpdated: boolean;
}

interface WalletStatusResult {
  walletAddress: string | null;
  simTokenBalance: number;
  lastUpdated: string;
  minimumRequired: number;
  meetsRequirement: boolean;
}

interface TierInfoResult {
  tier: 'EMAIL_USER' | 'WALLET_USER' | 'SIM_HOLDER' | 'ADMINISTRATOR';
  benefits: Array<{
    name: string;
    description: string;
    available: boolean;
  }>;
  balanceUpdated: boolean;
  conversionLimits: {
    dailyLimit: number;
    usedToday: number;
    remainingToday: number;
    nextResetTime: string;
  };
}

/**
 * Custom hook for wallet integration with backend
 * Handles wallet connection, verification, and tier management
 */
export function useWalletIntegration() {
  const { publicKey, signMessage } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Connect and verify wallet with backend
  const connectWallet = useCallback(async (): Promise<WalletConnectionResult | null> => {
    if (!publicKey || !signMessage) {
      setError('Wallet not connected or does not support message signing');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const walletAddress = publicKey.toBase58();
      
      // Create message to sign for verification
      const message = `Verify wallet ownership for SolSim trading simulator.\nWallet: ${walletAddress}\nTime: ${Date.now()}`;
      const messageBytes = new TextEncoder().encode(message);
      
      // Sign the message
      const signature = await signMessage(messageBytes);
      const signatureBase64 = Buffer.from(signature).toString('base64');

      // Send to backend for verification
      const response = await apiClient.post<WalletConnectionResult>('/api/v1/wallet/connect', {
        walletAddress,
        signature: signatureBase64,
        message: message,
      });

      toast.success('Wallet connected successfully!');
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect wallet';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, signMessage]);

  // Verify existing wallet connection
  const verifyWallet = useCallback(async (): Promise<WalletConnectionResult | null> => {
    if (!publicKey) {
      setError('No wallet connected');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.post<WalletConnectionResult>('/api/v1/wallet/verify', {
        walletAddress: publicKey.toBase58(),
      });

      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to verify wallet';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [publicKey]);

  // Get wallet status and $SIM token balance
  const getWalletStatus = useCallback(async (): Promise<WalletStatusResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<WalletStatusResult>('/api/v1/wallet/status');
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get wallet status';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get user tier information
  const getTierInfo = useCallback(async (): Promise<TierInfoResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<TierInfoResult>('/api/v1/wallet/tier-info');
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get tier information';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    clearError,
    connectWallet,
    verifyWallet,
    getWalletStatus,
    getTierInfo,
  };
}