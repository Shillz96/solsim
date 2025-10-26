'use client';

import React, { useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Button } from '@/components/ui/button';

export function WalletDebugButton() {
  const { publicKey, wallet, connect, disconnect, connecting, connected } = useWallet();
  const { visible, setVisible } = useWalletModal();

  const handleDebugConnect = useCallback(() => {
    console.log('Debug: Button clicked');
    console.log('Debug: Current wallet:', wallet);
    console.log('Debug: Connected:', connected);
    console.log('Debug: Modal visible:', visible);
    
    // Try to open the modal
    console.log('Debug: Setting modal visible to true');
    setVisible(true);
    
    // Log after setting
    setTimeout(() => {
      console.log('Debug: Modal visible after set:', visible);
    }, 100);
  }, [wallet, connected, visible, setVisible]);

  const handleDirectConnect = useCallback(async () => {
    console.log('Debug: Direct connect attempt');
    try {
      if (wallet) {
        console.log('Debug: Wallet exists, attempting connect');
        await connect();
        console.log('Debug: Connect successful');
      } else {
        console.log('Debug: No wallet, opening modal');
        setVisible(true);
      }
    } catch (error) {
      console.error('Debug: Connect error:', error);
    }
  }, [wallet, connect, setVisible]);

  return (
    <div className="flex flex-col gap-2 p-4 border rounded bg-card">
      <div className="text-sm font-mono">
        <div>Wallet: {wallet?.adapter.name || 'None'}</div>
        <div>Connected: {connected ? 'Yes' : 'No'}</div>
        <div>PublicKey: {publicKey?.toBase58().slice(0, 8) || 'None'}</div>
        <div>Modal Visible: {visible ? 'Yes' : 'No'}</div>
      </div>
      
      <Button onClick={handleDebugConnect} className="w-full">
        Debug: Open Modal
      </Button>
      
      <Button onClick={handleDirectConnect} className="w-full">
        Debug: Direct Connect
      </Button>
      
      {connected && (
        <Button onClick={disconnect} className="w-full">
          Disconnect
        </Button>
      )}
    </div>
  );
}
