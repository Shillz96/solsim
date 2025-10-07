'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Wallet, ExternalLink, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WalletConnectButtonProps {
  onWalletConnected?: (walletAddress: string) => void;
  onWalletDisconnected?: () => void;
  className?: string;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'secondary';
  showBalance?: boolean;
}

/**
 * Wallet Connect Button Component
 * Integrates with Solana wallet adapter to provide wallet connection functionality
 * Shows wallet status, balance, and handles connection/disconnection
 */
export function WalletConnectButton({
  onWalletConnected,
  onWalletDisconnected,
  className,
  size = 'default',
  variant = 'default',
  showBalance = false,
}: WalletConnectButtonProps) {
  const { 
    publicKey, 
    wallet, 
    connect, 
    disconnect, 
    connecting, 
    connected, 
    disconnecting 
  } = useWallet();
  
  const { setVisible } = useWalletModal();
  const [error, setError] = useState<string | null>(null);

  // Format wallet address for display
  const walletAddress = useMemo(() => {
    if (!publicKey) return null;
    const address = publicKey.toBase58();
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  }, [publicKey]);

  // Handle wallet connection
  const handleConnect = useCallback(async () => {
    setError(null);
    
    try {
      if (!wallet) {
        setVisible(true);
        return;
      }
      
      await connect();
      
      if (publicKey && onWalletConnected) {
        onWalletConnected(publicKey.toBase58());
      }
    } catch (err) {
      console.error('Wallet connection error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
    }
  }, [wallet, connect, publicKey, onWalletConnected, setVisible]);

  // Handle wallet disconnection
  const handleDisconnect = useCallback(async () => {
    setError(null);
    
    try {
      await disconnect();
      
      if (onWalletDisconnected) {
        onWalletDisconnected();
      }
    } catch (err) {
      console.error('Wallet disconnection error:', err);
      setError(err instanceof Error ? err.message : 'Failed to disconnect wallet');
    }
  }, [disconnect, onWalletDisconnected]);

  // Loading state
  if (connecting || disconnecting) {
    return (
      <Button
        disabled
        size={size}
        variant={variant}
        className={cn('min-w-[140px]', className)}
      >
        <Wallet className="mr-2 h-4 w-4 animate-spin" />
        {connecting ? 'Connecting...' : 'Disconnecting...'}
      </Button>
    );
  }

  // Connected state
  if (connected && publicKey) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Button
            onClick={handleDisconnect}
            size={size}
            variant={variant}
            className={cn('min-w-[140px]', className)}
          >
            <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
            {walletAddress}
          </Button>
          
          {wallet && (
            <Badge variant="secondary" className="text-xs">
              {wallet.adapter.name}
            </Badge>
          )}
        </div>
        
        {error && (
          <Alert className="border-destructive bg-destructive/10 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  // Disconnected state
  return (
    <div className="space-y-2">
      <Button
        onClick={handleConnect}
        size={size}
        variant={variant}
        className={cn('min-w-[140px]', className)}
      >
        <Wallet className="mr-2 h-4 w-4" />
        Connect Wallet
      </Button>
      
      {error && (
        <Alert className="border-destructive bg-destructive/10 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}