'use client';

/**
 * Transfer Funds Modal Component
 * 
 * Allows users to transfer SOL between their wallets.
 * Features Mario-themed styling with:
 * - Bold borders (border-3, border-4)
 * - Mario color palette (mario-red, luigi-green, pipe-*, star-yellow)
 * - 3D block shadows (shadow-mario)
 * - Mario card styling
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowRightLeft, AlertTriangle, Wallet2, ArrowRight, Coins } from 'lucide-react';
import api from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { formatNumber } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';

interface Wallet {
  id: string;
  name: string;
  walletType: 'PLATFORM_GENERATED' | 'IMPORTED';
  address: string;
  balance: string;
  isActive: boolean;
}

interface TransferFundsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  wallets: Wallet[];
  defaultFromWalletId?: string;
}

export function TransferFundsModal({
  open,
  onOpenChange,
  userId,
  wallets,
  defaultFromWalletId,
}: TransferFundsModalProps) {
  const [fromWalletId, setFromWalletId] = useState('');
  const [toWalletId, setToWalletId] = useState('');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Set default from wallet
  useEffect(() => {
    if (open && defaultFromWalletId) {
      setFromWalletId(defaultFromWalletId);
    } else if (open && wallets.length > 0) {
      // Default to active wallet
      const activeWallet = wallets.find(w => w.isActive);
      if (activeWallet) {
        setFromWalletId(activeWallet.id);
      }
    }
  }, [open, defaultFromWalletId, wallets]);

  const fromWallet = wallets.find(w => w.id === fromWalletId);
  const toWallet = wallets.find(w => w.id === toWalletId);
  const availableBalance = fromWallet ? parseFloat(fromWallet.balance) : 0;

  const handleMaxClick = () => {
    if (fromWallet) {
      setAmount(fromWallet.balance);
    }
  };

  const handleTransfer = async () => {
    setError('');

    // Validation
    if (!fromWalletId) {
      setError('Please select a source wallet');
      return;
    }

    if (!toWalletId) {
      setError('Please select a destination wallet');
      return;
    }

    if (fromWalletId === toWalletId) {
      setError('Cannot transfer to the same wallet');
      return;
    }

    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (transferAmount > availableBalance) {
      setError(`Insufficient balance. Available: ${formatNumber(availableBalance)} SOL`);
      return;
    }

    setIsLoading(true);

    try {
      await api.transferBetweenWallets(userId, fromWalletId, toWalletId, amount);

      // Invalidate wallet queries
      await queryClient.invalidateQueries({ queryKey: ['wallets', userId] });
      await queryClient.invalidateQueries({ queryKey: ['activeWallet', userId] });

      toast({
        title: '🎉 Transfer Complete!',
        description: `Transferred ${formatNumber(transferAmount)} SOL from ${fromWallet?.name} to ${toWallet?.name}`,
        // @ts-ignore - success variant exists in our toast
        variant: 'success' as any,
      });

      // Reset and close
      handleClose();
    } catch (err: any) {
      console.error('Failed to transfer funds:', err);
      setError(err.message || 'Failed to transfer funds');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFromWalletId('');
    setToWalletId('');
    setAmount('');
    setError('');
    setShowConfirmation(false);
    onOpenChange(false);
  };

  // Filter destination wallets (exclude source)
  const destinationWallets = wallets.filter(w => w.id !== fromWalletId);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="mario-card bg-card max-w-md border-4 border-pipe-700">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-6 w-6 text-mario-red-500" />
            <DialogTitle className="font-mario text-lg text-pipe-900">
              Transfer Funds
            </DialogTitle>
          </div>
          <DialogDescription className="text-pipe-700">
            Move SOL between your wallets instantly
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* From Wallet */}
          <div className="space-y-2">
            <Label htmlFor="from-wallet" className="text-pipe-800 font-medium">
              From Wallet
            </Label>
            <select
              id="from-wallet"
              value={fromWalletId}
              onChange={(e) => {
                setFromWalletId(e.target.value);
                setError('');
              }}
              disabled={isLoading}
              className="w-full p-3 bg-card border-3 border-pipe-400 rounded text-pipe-900 font-medium hover:border-mario-red-500 focus:border-mario-red-500 focus:outline-none transition-colors"
            >
              <option value="">Select source wallet</option>
              {wallets.map((wallet) => (
                <option key={wallet.id} value={wallet.id}>
                  {wallet.name} - {formatNumber(parseFloat(wallet.balance))} SOL
                </option>
              ))}
            </select>
          </div>

          {/* Arrow Indicator */}
          <div className="flex justify-center">
            <div className="p-2 bg-star-yellow-100 border-3 border-star-yellow-500 rounded-full">
              <ArrowRight className="h-5 w-5 text-star-yellow-700" />
            </div>
          </div>

          {/* To Wallet */}
          <div className="space-y-2">
            <Label htmlFor="to-wallet" className="text-pipe-800 font-medium">
              To Wallet
            </Label>
            <select
              id="to-wallet"
              value={toWalletId}
              onChange={(e) => {
                setToWalletId(e.target.value);
                setError('');
              }}
              disabled={isLoading || !fromWalletId}
              className="w-full p-3 bg-card border-3 border-pipe-400 rounded text-pipe-900 font-medium hover:border-luigi-green-500 focus:border-luigi-green-500 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Select destination wallet</option>
              {destinationWallets.map((wallet) => (
                <option key={wallet.id} value={wallet.id}>
                  {wallet.name} - {formatNumber(parseFloat(wallet.balance))} SOL
                </option>
              ))}
            </select>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="amount" className="text-pipe-800 font-medium">
                Amount (SOL)
              </Label>
              {fromWallet && (
                <span className="text-xs text-pipe-600">
                  Available: {formatNumber(availableBalance)} SOL
                </span>
              )}
            </div>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError('');
                }}
                disabled={isLoading || !fromWalletId}
                step="0.001"
                min="0"
                max={availableBalance}
                className="border-3 border-pipe-400 focus:border-coin-yellow-500 pr-16 font-mono text-lg"
              />
              <button
                type="button"
                onClick={handleMaxClick}
                disabled={isLoading || !fromWalletId}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-coin-yellow-500 text-pipe-900 text-xs font-bold rounded border-2 border-pipe-700 hover:bg-coin-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                MAX
              </button>
            </div>
          </div>

          {/* Transfer Summary */}
          {fromWallet && toWallet && amount && parseFloat(amount) > 0 && (
            <div className="p-4 bg-sky-50 border-3 border-sky-300 rounded space-y-2">
              <div className="flex items-center gap-2 text-sky-800 font-medium">
                <Coins className="h-4 w-4" />
                <span className="text-sm">Transfer Summary</span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-pipe-700">
                  <span>From:</span>
                  <span className="font-medium">{fromWallet.name}</span>
                </div>
                <div className="flex justify-between text-pipe-700">
                  <span>To:</span>
                  <span className="font-medium">{toWallet.name}</span>
                </div>
                <div className="flex justify-between text-pipe-900 font-bold pt-1 border-t-2 border-sky-300">
                  <span>Amount:</span>
                  <span className="font-mono">{formatNumber(parseFloat(amount))} SOL</span>
                </div>
              </div>
              <div className="text-xs text-sky-700 bg-sky-100 p-2 rounded border-2 border-sky-200">
                ⚡ Instant internal transfer (no gas fees)
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive" className="border-3 border-mario-red-500">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            onClick={handleClose}
            disabled={isLoading}
            variant="outline"
            className="border-3 border-pipe-400 hover:bg-pipe-50 text-pipe-800 font-medium"
          >
            Cancel
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={
              isLoading ||
              !fromWalletId ||
              !toWalletId ||
              !amount ||
              parseFloat(amount) <= 0 ||
              parseFloat(amount) > availableBalance
            }
            className="mario-btn bg-luigi-green-500 text-white hover:bg-luigi-green-600 shadow-mario font-bold"
          >
            {isLoading ? 'Transferring...' : '🚀 Transfer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

