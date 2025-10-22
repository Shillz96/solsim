'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Wallet, AlertCircle, CheckCircle, ExternalLink, Sparkles } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { TierCard } from '@/components/purchase/tier-card';
import * as api from '@/lib/api';
import * as purchaseTransaction from '@/lib/purchase-transaction';
import type { PurchaseTier } from '@/lib/types/backend';

interface PurchaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

type PurchaseStep = 'select' | 'confirm' | 'processing' | 'verifying' | 'success' | 'error';

export function PurchaseModal({ open, onOpenChange, userId }: PurchaseModalProps) {
  const { connected, publicKey, signTransaction, wallet, connect } = useWallet();
  const { setVisible: setWalletModalVisible } = useWalletModal();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<PurchaseStep>('select');
  const [selectedTier, setSelectedTier] = useState<PurchaseTier | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transactionSignature, setTransactionSignature] = useState<string | null>(null);
  const [newBalance, setNewBalance] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Fetch available tiers
  const { data: tiersData, isLoading: tiersLoading } = useQuery({
    queryKey: ['purchaseTiers'],
    queryFn: api.getPurchaseTiers,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep('select');
        setSelectedTier(null);
        setError(null);
        setTransactionSignature(null);
        setNewBalance(null);
        setIsConnecting(false);
      }, 300);
    }
  }, [open]);

  // Handle wallet connection success
  useEffect(() => {
    if (connected && publicKey && isConnecting) {
      setIsConnecting(false);
      toast({
        title: 'Wallet Connected',
        description: `Connected: ${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`,
      });
      
      // If user selected a tier and is now connected, auto-proceed to confirmation
      if (selectedTier) {
        setTimeout(() => {
          setStep('confirm');
        }, 500);
      }
    }
  }, [connected, publicKey, isConnecting, selectedTier, toast]);

  // Initiate purchase mutation
  const initiateMutation = useMutation({
    mutationFn: async (tier: PurchaseTier) => {
      if (!publicKey) throw new Error('Wallet not connected');
      
      return api.initiatePurchase({
        userId,
        amount: tier.realSol,
        walletAddress: publicKey.toBase58(),
      });
    },
  });

  // Verify purchase mutation
  const verifyMutation = useMutation({
    mutationFn: async (signature: string) => {
      if (!publicKey) throw new Error('Wallet not connected');

      return api.verifyPurchase({
        userId,
        transactionSignature: signature,
        walletAddress: publicKey.toBase58(),
      });
    },
    onSuccess: (data) => {
      setNewBalance(data.newBalance);
      setTransactionSignature(data.transactionSignature);
      setStep('success');
      
      // Invalidate balance queries
      queryClient.invalidateQueries({ queryKey: ['walletBalance', userId] });
      queryClient.invalidateQueries({ queryKey: ['userProfile', userId] });
      queryClient.invalidateQueries({ queryKey: ['purchaseHistory', userId] });

      toast({
        title: 'Purchase Successful! 🎉',
        description: `${data.simulatedSolAdded} SOL added to your balance`,
      });
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to verify purchase');
      setStep('error');
    },
  });

  // Handle tier selection
  const handleTierSelect = (tier: PurchaseTier) => {
    setSelectedTier(tier);
    setError(null);
  };

  // Handle continue to confirmation
  const handleContinue = async () => {
    if (!connected) {
      // If no wallet is connected, show wallet selection modal
      setIsConnecting(true);
      setError(null);
      
      try {
        if (!wallet) {
          // No wallet adapter selected, show wallet modal
          setWalletModalVisible(true);
        } else {
          // Wallet adapter exists but not connected, try to connect
          await connect();
          
          // After successful connection, check if we have public key
          if (publicKey) {
            toast({
              title: 'Wallet Connected',
              description: 'You can now proceed with your purchase',
            });
            setIsConnecting(false);
          }
        }
      } catch (err) {
        console.error('Wallet connection error:', err);
        setError(err instanceof Error ? err.message : 'Failed to connect wallet');
        setIsConnecting(false);
      }
      
      return;
    }

    if (!selectedTier) {
      setError('Please select a tier');
      return;
    }

    setStep('confirm');
  };

  // Handle purchase execution
  const handlePurchase = async () => {
    if (!selectedTier || !publicKey || !signTransaction) {
      setError('Wallet not ready');
      return;
    }

    setStep('processing');
    setError(null);

    try {
      // Check balance
      const hasFunds = await purchaseTransaction.hasSufficientBalance(
        publicKey.toBase58(),
        selectedTier.realSol
      );

      if (!hasFunds) {
        setError('Insufficient SOL balance (including fees)');
        setStep('error');
        return;
      }

      // Initiate purchase on backend
      const initiateResponse = await initiateMutation.mutateAsync(selectedTier);

      // Send transaction
      const txResult = await purchaseTransaction.sendSolTransaction(
        { connected, publicKey, signTransaction } as any,
        initiateResponse.recipientWallet,
        selectedTier.realSol
      );

      if (!txResult.success || !txResult.signature) {
        setError(txResult.error || 'Transaction failed');
        setStep('error');
        return;
      }

      // Verify transaction on backend
      setStep('verifying');
      await verifyMutation.mutateAsync(txResult.signature);

    } catch (err: any) {
      console.error('Purchase error:', err);
      setError(err.message || 'Purchase failed');
      setStep('error');
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (step === 'processing' || step === 'verifying') {
      return; // Don't allow cancel during processing
    }
    setStep('select');
    setError(null);
  };

  // Handle close
  const handleClose = () => {
    if (step === 'processing' || step === 'verifying') {
      return; // Don't allow close during processing
    }
    onOpenChange(false);
  };

  // Render step content
  const renderContent = () => {
    switch (step) {
      case 'select':
        return (
          <>
            <DialogHeader className="space-y-4 pb-6">
              <div className="flex items-center justify-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-[var(--star-yellow)] border-3 border-[var(--outline-black)] flex items-center justify-center shadow-[3px_3px_0_var(--outline-black)]">
                  <Sparkles className="h-6 w-6 text-[var(--outline-black)]" />
                </div>
                <DialogTitle className="text-3xl font-mario text-[var(--outline-black)]">
                  Purchase Simulated SOL
                </DialogTitle>
              </div>
              <DialogDescription className="text-base text-center text-[var(--outline-black)] font-semibold">
                Choose your tier and boost your trading balance instantly
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {tiersLoading ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Loading tiers...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 py-4">
                  {tiersData?.tiers.map((tier, index) => (
                    <TierCard
                      key={index}
                      tier={tier}
                      selected={selectedTier?.realSol === tier.realSol}
                      onSelect={() => handleTierSelect(tier)}
                    />
                  ))}
                </div>
              )}

              {error && (
                <Alert variant="destructive" className="animate-in slide-in-from-top-2 border-3 border-[var(--mario-red)] bg-white shadow-[3px_3px_0_var(--mario-red)]">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="font-semibold">{error}</AlertDescription>
                </Alert>
              )}

              {!connected && (
                <Alert className="bg-[var(--sky-blue)] border-3 border-[var(--outline-black)] shadow-[3px_3px_0_var(--outline-black)] animate-in slide-in-from-bottom-2">
                  <Wallet className="h-5 w-5 text-[var(--outline-black)]" />
                  <AlertDescription className="text-[var(--outline-black)] font-semibold">
                    <strong className="font-bold text-[var(--outline-black)]">Connect your wallet</strong> to purchase simulated SOL and start trading
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3 justify-end pt-4 border-t-4 border-[var(--outline-black)]">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="px-8 mario-btn bg-white border-3 border-[var(--outline-black)] hover:shadow-[3px_3px_0_var(--outline-black)]"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleContinue}
                  disabled={!selectedTier || isConnecting}
                  className="min-w-[180px] mario-btn bg-[var(--luigi-green)] text-white border-3 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)] hover:shadow-[6px_6px_0_var(--outline-black)] font-mario disabled:opacity-50"
                  size="lg"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : !connected ? (
                    <>
                      <Wallet className="h-4 w-4 mr-2" />
                      Connect Wallet
                    </>
                  ) : (
                    <>
                      Continue
                      <Sparkles className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        );

      case 'confirm':
        return (
          <>
            <DialogHeader className="space-y-4 pb-6">
              <div className="flex items-center justify-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-[var(--luigi-green)] border-3 border-[var(--outline-black)] flex items-center justify-center shadow-[3px_3px_0_var(--outline-black)]">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <DialogTitle className="text-3xl font-mario text-[var(--outline-black)]">
                  Confirm Purchase
                </DialogTitle>
              </div>
              <DialogDescription className="text-base text-center text-[var(--outline-black)] font-semibold">
                Review your purchase details before proceeding
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <div className="relative">
                <div className="relative bg-white rounded-2xl p-8 space-y-6 border-4 border-[var(--outline-black)] shadow-[6px_6px_0_var(--outline-black)]">
                  {/* Tier badge */}
                  <div className="flex justify-center">
                    <Badge className="text-base px-4 py-1.5 bg-[var(--star-yellow)] border-3 border-[var(--outline-black)] text-[var(--outline-black)] font-mario shadow-[2px_2px_0_var(--outline-black)]">
                      {selectedTier?.label} TIER
                    </Badge>
                  </div>

                  {/* Main transaction details */}
                  <div className="space-y-4">
                    {/* You pay */}
                    <div className="flex justify-between items-center p-4 rounded-xl bg-[var(--sky-blue)] border-3 border-[var(--outline-black)] shadow-[3px_3px_0_var(--outline-black)]">
                      <span className="text-sm font-bold text-[var(--outline-black)] uppercase tracking-wide">You Pay</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-mario text-[var(--outline-black)]">
                          {selectedTier?.realSol}
                        </span>
                        <span className="text-lg font-bold text-[var(--outline-black)]">SOL</span>
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex justify-center">
                      <div className="h-8 w-8 rounded-lg bg-[var(--star-yellow)] border-3 border-[var(--outline-black)] flex items-center justify-center shadow-[2px_2px_0_var(--outline-black)]">
                        <svg className="h-5 w-5 text-[var(--outline-black)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                      </div>
                    </div>

                    {/* You receive */}
                    <div className="flex justify-between items-center p-4 rounded-xl bg-[var(--luigi-green)] border-3 border-[var(--outline-black)] shadow-[3px_3px_0_var(--outline-black)]">
                      <span className="text-sm font-bold text-white uppercase tracking-wide">You Receive</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-mario text-white">
                          {selectedTier?.simulatedSol}
                        </span>
                        <span className="text-lg font-bold text-white">SIM SOL</span>
                      </div>
                    </div>
                  </div>

                  {/* Bonus */}
                  {selectedTier && selectedTier.bonus > 0 && (
                    <div className="flex justify-center">
                      <div className="px-6 py-3 rounded-full bg-[var(--star-yellow)] border-3 border-[var(--outline-black)] shadow-[3px_3px_0_var(--outline-black)]">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-[var(--outline-black)]" />
                          <span className="text-base font-mario text-[var(--outline-black)]">
                            +{selectedTier.bonus}% BONUS INCLUDED
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Transaction details */}
                  <div className="pt-4 border-t-3 border-[var(--outline-black)]">
                    <div className="space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--outline-black)] font-semibold">Network:</span>
                        <span className="text-[var(--outline-black)] font-bold">Solana Mainnet</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--outline-black)] font-semibold">Recipient:</span>
                        <code className="text-[var(--outline-black)] bg-[var(--sky-blue)] px-2 py-1 rounded-lg border-2 border-[var(--outline-black)] font-mono text-xs font-bold">
                          8i6H...xf1iL
                        </code>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="border-3 border-[var(--mario-red)] bg-white shadow-[3px_3px_0_var(--mario-red)] animate-in slide-in-from-top-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="font-semibold">{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3 justify-end pt-4 border-t-4 border-[var(--outline-black)]">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  className="px-8 mario-btn bg-white border-3 border-[var(--outline-black)] hover:shadow-[3px_3px_0_var(--outline-black)]"
                >
                  Back
                </Button>
                <Button
                  onClick={handlePurchase}
                  className="min-w-[200px] mario-btn bg-[var(--luigi-green)] text-white border-3 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)] hover:shadow-[6px_6px_0_var(--outline-black)] font-mario"
                  size="lg"
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  Complete Purchase
                </Button>
              </div>
            </div>
          </>
        );

      case 'processing':
        return (
          <>
            <DialogHeader>
              <DialogTitle>Processing Transaction</DialogTitle>
              <DialogDescription>
                Please approve the transaction in your wallet
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
              <p className="text-center text-muted-foreground">
                Waiting for wallet approval...
              </p>
              <p className="text-xs text-center text-muted-foreground max-w-md">
                Do not close this window. Your wallet will prompt you to approve the transaction.
              </p>
            </div>
          </>
        );

      case 'verifying':
        return (
          <>
            <DialogHeader>
              <DialogTitle>Verifying Transaction</DialogTitle>
              <DialogDescription>
                Confirming your purchase on the blockchain
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
              <p className="text-center text-muted-foreground">
                Verifying on Solana blockchain...
              </p>
              <p className="text-xs text-center text-muted-foreground max-w-md">
                This may take a few moments. Please wait.
              </p>
            </div>
          </>
        );

      case 'success':
        return (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                Purchase Successful!
              </DialogTitle>
              <DialogDescription>
                Your simulated SOL has been added to your balance
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-8 text-center space-y-4">
                <Sparkles className="h-12 w-12 mx-auto text-green-600" />
                <div>
                  <div className="text-sm text-muted-foreground mb-2">New Balance</div>
                  <div className="text-4xl font-bold text-green-600">
                    {newBalance ? parseFloat(newBalance).toFixed(2) : '0'} SOL
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  +{selectedTier?.simulatedSol} simulated SOL added
                </div>
              </div>

              {transactionSignature && (
                <div className="text-center">
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={`https://solscan.io/tx/${transactionSignature}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2"
                    >
                      View on Solscan
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={handleClose}>
                  Start Trading
                </Button>
              </div>
            </div>
          </>
        );

      case 'error':
        return (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Purchase Failed
              </DialogTitle>
              <DialogDescription>
                There was an error processing your purchase
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error || 'An unknown error occurred'}</AlertDescription>
              </Alert>

              <div className="text-sm text-muted-foreground space-y-2">
                <p>Common issues:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Insufficient SOL balance in wallet</li>
                  <li>Transaction rejected in wallet</li>
                  <li>Network congestion</li>
                  <li>RPC endpoint issues</li>
                </ul>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={handleClose}>
                  Close
                </Button>
                <Button onClick={() => setStep('select')}>
                  Try Again
                </Button>
              </div>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[90vw] lg:max-w-6xl max-h-[90vh] overflow-y-auto p-8 bg-white border-4 border-[var(--outline-black)] shadow-[8px_8px_0_var(--outline-black)]">
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
