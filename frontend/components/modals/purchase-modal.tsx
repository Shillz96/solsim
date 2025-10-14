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
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
                  <Sparkles className="h-6 w-6 text-primary-foreground" />
                </div>
                <DialogTitle className="text-3xl font-black text-white dark:text-white">
                  Purchase Simulated SOL
                </DialogTitle>
              </div>
              <DialogDescription className="text-base text-center text-gray-300 dark:text-gray-300">
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
                <Alert variant="destructive" className="animate-in slide-in-from-top-2 border-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="font-medium">{error}</AlertDescription>
                </Alert>
              )}

              {!connected && (
                <Alert className="bg-gradient-to-r from-primary/10 to-primary/5 border-2 border-primary/20 animate-in slide-in-from-bottom-2">
                  <Wallet className="h-5 w-5 text-primary" />
                  <AlertDescription className="text-foreground font-medium">
                    <strong className="font-bold text-foreground">Connect your wallet</strong> to purchase simulated SOL and start trading
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3 justify-end pt-4 border-t border-border/50">
                <Button 
                  variant="outline" 
                  onClick={handleClose}
                  className="px-8"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleContinue}
                  disabled={!selectedTier || isConnecting}
                  className="min-w-[180px] bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg font-bold"
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
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
                  <CheckCircle className="h-6 w-6 text-primary-foreground" />
                </div>
                <DialogTitle className="text-3xl font-black text-white dark:text-white">
                  Confirm Purchase
                </DialogTitle>
              </div>
              <DialogDescription className="text-base text-center text-gray-300 dark:text-gray-300">
                Review your purchase details before proceeding
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <div className="relative">
                {/* Decorative background */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 rounded-2xl" />
                
                <div className="relative bg-gradient-to-br from-muted/80 to-muted/40 rounded-2xl p-8 space-y-6 border-2 border-border/50 backdrop-blur-sm">
                  {/* Tier badge */}
                  <div className="flex justify-center">
                    <Badge className="text-base px-4 py-1.5 bg-gradient-to-r from-primary/20 to-primary/10 border-2 border-primary/30 text-primary font-bold">
                      {selectedTier?.label} TIER
                    </Badge>
                  </div>
                  
                  {/* Main transaction details */}
                  <div className="space-y-4">
                    {/* You pay */}
                    <div className="flex justify-between items-center p-4 rounded-xl bg-background/80 border border-border/50">
                      <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">You Pay</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-primary">
                          {selectedTier?.realSol}
                        </span>
                        <span className="text-lg font-bold text-primary/70">SOL</span>
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex justify-center">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                      </div>
                    </div>

                    {/* You receive */}
                    <div className="flex justify-between items-center p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-2 border-green-500/30">
                      <span className="text-sm font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide">You Receive</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-green-600 dark:text-green-400">
                          {selectedTier?.simulatedSol}
                        </span>
                        <span className="text-lg font-bold text-green-600/70 dark:text-green-400/70">SIM SOL</span>
                      </div>
                    </div>
                  </div>

                  {/* Bonus */}
                  {selectedTier && selectedTier.bonus > 0 && (
                    <div className="flex justify-center">
                      <div className="px-6 py-3 rounded-full bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-2 border-green-500/40">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-green-600 dark:text-green-400" />
                          <span className="text-base font-bold text-green-700 dark:text-green-400">
                            +{selectedTier.bonus}% BONUS INCLUDED
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Transaction details */}
                  <div className="pt-4 border-t border-border/50">
                    <div className="space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground font-medium">Network:</span>
                        <span className="text-foreground/80 font-semibold">Solana Mainnet</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground font-medium">Recipient:</span>
                        <code className="text-foreground/80 bg-background/80 px-2 py-1 rounded font-mono text-xs">
                          8i6H...xf1iL
                        </code>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="border-2 animate-in slide-in-from-top-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="font-medium">{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3 justify-end pt-4 border-t border-border/50">
                <Button 
                  variant="outline" 
                  onClick={handleCancel}
                  className="px-8"
                >
                  Back
                </Button>
                <Button 
                  onClick={handlePurchase}
                  className="min-w-[200px] bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg font-bold"
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
              <DialogTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle className="h-5 w-5" />
                Purchase Successful!
              </DialogTitle>
              <DialogDescription>
                Your simulated SOL has been added to your balance
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg p-8 text-center space-y-4">
                <Sparkles className="h-12 w-12 mx-auto text-green-600 dark:text-green-400" />
                <div>
                  <div className="text-sm text-muted-foreground mb-2">New Balance</div>
                  <div className="text-4xl font-bold text-green-600 dark:text-green-400">
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
      <DialogContent className="max-w-[95vw] lg:max-w-7xl max-h-[95vh] overflow-y-auto p-8">
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
