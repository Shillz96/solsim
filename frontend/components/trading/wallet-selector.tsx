'use client';

/**
 * Wallet Selector Component
 * 
 * Dropdown component for selecting active trading wallet.
 * Used in trading panels to allow users to quickly switch between wallets.
 * 
 * Features:
 * - Shows active wallet with balance
 * - Quick switch between wallets
 * - Create/Import wallet actions
 * - Mario-themed styling
 */

import { useState } from 'react';
import { Check, ChevronDown, Plus, Download, Wallet2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/contexts/auth-context';
import api from '@/lib/api';
import { formatNumber } from '@/lib/utils/format';
import { ImportWalletModal } from '@/components/modals/import-wallet-modal';
import { useToast } from '@/hooks/use-toast';

interface Wallet {
  id: string;
  name: string;
  walletType: 'PLATFORM_GENERATED' | 'IMPORTED';
  address: string;
  balance: string;
  isActive: boolean;
  createdAt: string;
}

interface WalletSelectorProps {
  onWalletChange?: (wallet: Wallet) => void;
  className?: string;
}

export function WalletSelector({ onWalletChange, className = '' }: WalletSelectorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showImportModal, setShowImportModal] = useState(false);
  const [isChanging, setIsChanging] = useState(false);

  // Fetch user wallets
  const { data: wallets = [], isLoading } = useQuery<Wallet[]>({
    queryKey: ['wallets', user?.id],
    queryFn: () => (user?.id ? api.getUserWallets(user.id) : Promise.resolve([])),
    enabled: !!user?.id,
    staleTime: 30000,
  });

  // Get active wallet
  const activeWallet = wallets.find(w => w.isActive);

  const handleWalletChange = async (walletId: string) => {
    if (!user?.id) return;
    
    setIsChanging(true);
    
    try {
      await api.setActiveWallet(user.id, walletId);
      
      // Invalidate queries
      await queryClient.invalidateQueries({ queryKey: ['wallets', user.id] });
      await queryClient.invalidateQueries({ queryKey: ['activeWallet', user.id] });
      await queryClient.invalidateQueries({ queryKey: ['portfolio', user.id] });
      
      const newActiveWallet = wallets.find(w => w.id === walletId);
      if (newActiveWallet && onWalletChange) {
        onWalletChange(newActiveWallet);
      }

      toast({
        title: 'Wallet Switched',
        description: `Now using ${newActiveWallet?.name}`,
        variant: 'success',
      });
    } catch (error: any) {
      console.error('Failed to switch wallet:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to switch wallet',
        variant: 'destructive',
      });
    } finally {
      setIsChanging(false);
    }
  };

  const handleCreateWallet = async () => {
    if (!user?.id) return;

    const walletName = prompt('Enter wallet name:', `Wallet ${wallets.length + 1}`);
    if (!walletName) return;

    try {
      await api.createWallet(user.id, walletName);
      await queryClient.invalidateQueries({ queryKey: ['wallets', user.id] });
      
      toast({
        title: 'Wallet Created',
        description: `${walletName} has been created`,
        variant: 'success',
      });
    } catch (error: any) {
      console.error('Failed to create wallet:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create wallet',
        variant: 'destructive',
      });
    }
  };

  if (isLoading || !user) {
    return (
      <div className={`flex items-center gap-2 p-2 bg-pipe-100 border-2 border-pipe-300 rounded ${className}`}>
        <Wallet2 className="h-4 w-4 text-pipe-500" />
        <span className="text-sm text-pipe-600">Loading wallets...</span>
      </div>
    );
  }

  if (!activeWallet) {
    return (
      <div className={`flex items-center justify-between p-3 bg-pipe-100 border-2 border-pipe-300 rounded ${className}`}>
        <div className="flex items-center gap-2">
          <Wallet2 className="h-4 w-4 text-pipe-500" />
          <span className="text-sm text-pipe-600">No wallet selected</span>
        </div>
        <Button
          onClick={handleCreateWallet}
          size="sm"
          className="mario-btn bg-mario-red-500 text-white text-xs"
        >
          Create Wallet
        </Button>
      </div>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={`w-full flex items-center justify-between p-3 bg-white border-3 border-pipe-400 rounded hover:border-mario-red-500 transition-colors ${className}`}
            disabled={isChanging}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Wallet2 className="h-4 w-4 text-mario-red-500 flex-shrink-0" />
              <div className="flex flex-col items-start min-w-0 flex-1">
                <span className="text-sm font-medium text-pipe-800 truncate">
                  {activeWallet.name}
                </span>
                <span className="text-xs text-pipe-600 font-mono">
                  {formatNumber(parseFloat(activeWallet.balance))} SOL
                </span>
              </div>
            </div>
            <ChevronDown className="h-4 w-4 text-pipe-600 flex-shrink-0 ml-2" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="start"
          className="w-[300px] mario-card bg-white border-3 border-pipe-400"
        >
          <DropdownMenuLabel className="text-xs text-pipe-600 uppercase">
            Select Trading Wallet
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Wallet List */}
          {wallets.map((wallet) => (
            <DropdownMenuItem
              key={wallet.id}
              onClick={() => handleWalletChange(wallet.id)}
              disabled={wallet.isActive || isChanging}
              className="cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Wallet2 className="h-4 w-4 text-pipe-500 flex-shrink-0" />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm font-medium text-pipe-800 truncate">
                      {wallet.name}
                    </span>
                    <span className="text-xs text-pipe-600 font-mono">
                      {formatNumber(parseFloat(wallet.balance))} SOL
                    </span>
                  </div>
                </div>
                {wallet.isActive && (
                  <Check className="h-4 w-4 text-luigi-green-600 flex-shrink-0" />
                )}
              </div>
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />

          {/* Actions */}
          <DropdownMenuItem onClick={handleCreateWallet} className="cursor-pointer">
            <Plus className="mr-2 h-4 w-4 text-mario-red-500" />
            <span className="text-sm">Create New Wallet</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => setShowImportModal(true)}
            className="cursor-pointer"
          >
            <Download className="mr-2 h-4 w-4 text-mario-red-500" />
            <span className="text-sm">Import Wallet</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Import Wallet Modal */}
      {user && (
        <ImportWalletModal
          open={showImportModal}
          onOpenChange={setShowImportModal}
          userId={user.id}
        />
      )}
    </>
  );
}

