'use client';

import React, { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  SolflareWalletAdapter,
  TorusWalletAdapter,
  LedgerWalletAdapter,
  MathWalletAdapter,
  Coin98WalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

// Import the default wallet adapter CSS for styling
import '@solana/wallet-adapter-react-ui/styles.css';

interface SolanaWalletProviderProps {
  children: React.ReactNode;
}

/**
 * Solana Wallet Provider
 * Provides wallet connection functionality to the entire app
 * Supports multiple wallet types with devnet configuration for development
 * Note: PhantomWalletAdapter removed as Phantom now uses Standard Wallet API
 */
export function SolanaWalletProvider({ children }: SolanaWalletProviderProps) {
  // Configure Solana network (devnet for development)
  const network = WalletAdapterNetwork.Devnet;
  
  // You can also provide a custom RPC endpoint
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  // Initialize wallet adapters
  const wallets = useMemo(
    () => {
      try {
        return [
          // Removed PhantomWalletAdapter as it's now a Standard Wallet
          new SolflareWalletAdapter({ network }),
          new TorusWalletAdapter(),
          new LedgerWalletAdapter(),
          new MathWalletAdapter(),
          new Coin98WalletAdapter(),
        ];
      } catch (error) {
        console.warn('Error initializing wallet adapters:', error);
        return [];
      }
    },
    [network]
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}