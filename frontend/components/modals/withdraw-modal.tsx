'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowUpFromLine, AlertTriangle, CheckCircle, Loader2, ExternalLink } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useTradingMode } from '@/lib/trading-mode-context';
import { useToast } from '@/hooks/use-toast';
import { PublicKey } from '@solana/web3.js';
import { cn } from '@/lib/utils';

interface WithdrawModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WithdrawModal({ open, onOpenChange }: WithdrawModalProps) {
  const { user, getUserId } = useAuth();
  const { realSolBalance, refreshBalances } = useTradingMode();
  const { toast } = useToast();

  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [addressError, setAddressError] = useState('');
  const [amountError, setAmountError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [txSignature, setTxSignature] = useState('');

  const MIN_WITHDRAWAL = 0.01;
  const NETWORK_FEE = 0.000005;
  const netAmount = parseFloat(amount) || 0;

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setToAddress('');
      setAmount('');
      setAddressError('');
      setAmountError('');
      setShowConfirmation(false);
      setTxSignature('');
    }
  }, [open]);

  // Validate Solana address
  const validateAddress = (addr: string) => {
    if (!addr) {
      setAddressError('');
      return;
    }

    try {
      new PublicKey(addr);
      setAddressError('');
    } catch (error) {
      setAddressError('Invalid Solana address format');
    }
  };

  // Validate amount
  const validateAmount = (amt: string) => {
    if (!amt) {
      setAmountError('');
      return;
    }

    const num = parseFloat(amt);
    if (isNaN(num) || num <= 0) {
      setAmountError('Amount must be greater than 0');
    } else if (num < MIN_WITHDRAWAL) {
      setAmountError(`Minimum withdrawal is ${MIN_WITHDRAWAL} SOL`);
    } else if (num > realSolBalance) {
      setAmountError(`Insufficient balance. Available: ${realSolBalance.toFixed(4)} SOL`);
    } else {
      setAmountError('');
    }
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setToAddress(value);
    validateAddress(value);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAmount(value);
    validateAmount(value);
  };

  const setMaxAmount = () => {
    const max = Math.max(0, realSolBalance - NETWORK_FEE);
    setAmount(max.toFixed(4));
    validateAmount(max.toString());
  };

  const canProceed = toAddress && amount && !addressError && !amountError && netAmount >= MIN_WITHDRAWAL;

  const handleWithdraw = async () => {
    if (!canProceed) return;

    const userId = getUserId();
    if (!userId) return;

    setIsProcessing(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/wallet/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          amount,
          toAddress,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Withdrawal failed');
      }

      // Success!
      setTxSignature(data.txSignature);
      setShowConfirmation(true);

      // Refresh balances
      await refreshBalances();

      toast({
        title: '✅ Withdrawal Successful!',
        description: `${amount} SOL has been sent to your wallet`,
        duration: 5000,
      });

    } catch (error: any) {
      console.error('Withdrawal error:', error);
      toast({
        title: 'Withdrawal Failed',
        description: error.message || 'Failed to process withdrawal',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] border-3 border-pipe-400 shadow-mario">
        <DialogHeader>
          <DialogTitle className="font-mario text-lg flex items-center gap-2">
            <ArrowUpFromLine className="w-5 h-5 text-mario-red-500" />
            Withdraw SOL
          </DialogTitle>
          <DialogDescription>
            Send SOL from your real trading balance to any Solana wallet
          </DialogDescription>
        </DialogHeader>

        {!showConfirmation ? (
          <div className="space-y-6 py-4">
            {/* Available Balance */}
            <div className="p-4 bg-pipe-50 rounded-lg border-2 border-pipe-300">
              <div className="text-xs font-bold text-pipe-600 mb-1">Available Balance:</div>
              <div className="font-mono text-2xl font-bold text-pipe-800">
                {realSolBalance.toFixed(4)} SOL
              </div>
            </div>

            {/* Recipient Address */}
            <div className="space-y-2">
              <Label htmlFor="toAddress" className="font-bold text-sm">
                Recipient Address
              </Label>
              <Input
                id="toAddress"
                placeholder="Enter Solana wallet address"
                value={toAddress}
                onChange={handleAddressChange}
                className={cn(
                  'font-mono text-sm border-2',
                  addressError && 'border-mario-red-500'
                )}
              />
              {addressError && (
                <p className="text-xs text-mario-red-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {addressError}
                </p>
              )}
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount" className="font-bold text-sm">
                Amount (SOL)
              </Label>
              <div className="flex gap-2">
                <Input
                  id="amount"
                  type="number"
                  inputMode="decimal"
                  step="0.001"
                  placeholder="0.00"
                  value={amount}
                  onChange={handleAmountChange}
                  className={cn(
                    'font-mono text-lg border-2',
                    amountError && 'border-mario-red-500'
                  )}
                />
                <Button
                  onClick={setMaxAmount}
                  variant="outline"
                  className="border-2 whitespace-nowrap"
                >
                  MAX
                </Button>
              </div>
              {amountError && (
                <p className="text-xs text-mario-red-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {amountError}
                </p>
              )}
            </div>

            {/* Transaction Summary */}
            {amount && !amountError && (
              <div className="p-4 bg-star-yellow-50 rounded-lg border-2 border-star-yellow-200 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-pipe-600">Amount:</span>
                  <span className="font-mono font-bold">{netAmount.toFixed(4)} SOL</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-pipe-600">Network Fee:</span>
                  <span className="font-mono">~{NETWORK_FEE.toFixed(6)} SOL</span>
                </div>
                <div className="border-t border-star-yellow-300 pt-2 flex justify-between font-bold">
                  <span>You'll Receive:</span>
                  <span className="font-mono">{(netAmount - NETWORK_FEE).toFixed(4)} SOL</span>
                </div>
              </div>
            )}

            {/* Warning for large withdrawals */}
            {netAmount > realSolBalance * 0.5 && !amountError && (
              <Alert className="border-2 border-mario-red-300 bg-mario-red-50">
                <AlertTriangle className="w-4 h-4 text-mario-red-600" />
                <AlertDescription className="text-sm text-mario-red-700">
                  <strong>Large Withdrawal:</strong> You're withdrawing more than 50% of your balance. 
                  Make sure you have enough left for trading!
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={() => onOpenChange(false)}
                variant="outline"
                className="flex-1 border-2"
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleWithdraw}
                disabled={!canProceed || isProcessing}
                className="flex-1 mario-btn mario-btn-red"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ArrowUpFromLine className="w-4 h-4 mr-2" />
                    Withdraw
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          /* Success State */
          <div className="space-y-6 py-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-luigi-green-100 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-luigi-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-xl mb-2">Withdrawal Successful!</h3>
                <p className="text-pipe-600 text-sm">
                  {amount} SOL has been sent to your wallet
                </p>
              </div>

              {/* Transaction Link */}
              <a
                href={`https://solscan.io/tx/${txSignature}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-mario-red-600 hover:text-mario-red-700 font-medium"
              >
                View on Solscan
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            <Button
              onClick={() => onOpenChange(false)}
              className="w-full mario-btn mario-btn-green"
            >
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}


