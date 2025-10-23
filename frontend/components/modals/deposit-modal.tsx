'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowDownToLine,
  Copy,
  CheckCircle2,
  Loader2,
  ExternalLink,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import QRCode from 'qrcode';

interface DepositModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  depositAddress: string;
  onDepositDetected?: (amount: number, signature: string) => void;
  isLoadingAddress?: boolean;
}

type DepositStatus = 'waiting' | 'detecting' | 'confirming' | 'confirmed' | 'error';

/**
 * Deposit Modal with QR Code
 *
 * Features:
 * - Displays deposit address with QR code
 * - Copy address functionality
 * - Optional amount input (for tracking expected deposits)
 * - Status tracking (waiting → detecting → confirming → confirmed)
 * - Coin rain animation on success
 * - Mario-themed styling
 */
export function DepositModal({
  open,
  onOpenChange,
  depositAddress,
  onDepositDetected,
  isLoadingAddress = false,
}: DepositModalProps) {
  const { toast } = useToast();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [expectedAmount, setExpectedAmount] = useState('');
  const [depositStatus, setDepositStatus] = useState<DepositStatus>('waiting');
  const [depositedAmount, setDepositedAmount] = useState<number>(0);
  const [txSignature, setTxSignature] = useState<string>('');
  const [showCoinRain, setShowCoinRain] = useState(false);

  // Generate QR code
  useEffect(() => {
    if (!depositAddress || isLoadingAddress) return;

    QRCode.toDataURL(depositAddress, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFAE9',
      },
    })
      .then((url) => setQrCodeUrl(url))
      .catch((err) => console.error('Error generating QR code:', err));
  }, [depositAddress, isLoadingAddress]);

  // Copy address to clipboard
  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(depositAddress);
      setCopied(true);

      toast({
        title: '✓ Address Copied!',
        description: 'Deposit address copied to clipboard',
        duration: 2000,
      });

      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      toast({
        title: 'Copy Failed',
        description: 'Please copy the address manually',
        variant: 'destructive',
      });
    }
  };

  // Simulate deposit detection (in production, this would poll backend)
  useEffect(() => {
    if (!open || depositStatus !== 'waiting') return;

    // In production, you would poll the backend here
    // For now, this is just a placeholder
    // const interval = setInterval(async () => {
    //   const response = await fetch(`/api/real-trade/check-deposit/${depositAddress}`);
    //   const data = await response.json();
    //   if (data.detected) {
    //     setDepositStatus('detecting');
    //     setDepositedAmount(data.amount);
    //     setTxSignature(data.signature);
    //     // ... continue flow
    //   }
    // }, 3000);
    // return () => clearInterval(interval);
  }, [open, depositStatus, depositAddress]);

  // Handle deposit confirmation flow
  useEffect(() => {
    if (depositStatus === 'detecting') {
      // Simulated: detecting → confirming (2 seconds)
      const timer = setTimeout(() => {
        setDepositStatus('confirming');
      }, 2000);
      return () => clearTimeout(timer);
    }

    if (depositStatus === 'confirming') {
      // Simulated: confirming → confirmed (3 seconds)
      const timer = setTimeout(() => {
        setDepositStatus('confirmed');
        setShowCoinRain(true);

        if (onDepositDetected) {
          onDepositDetected(depositedAmount, txSignature);
        }

        toast({
          title: '🎉 Deposit Confirmed!',
          description: `${depositedAmount} SOL added to your account`,
          duration: 5000,
        });

        // Hide coin rain after 3 seconds
        setTimeout(() => setShowCoinRain(false), 3000);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [depositStatus, depositedAmount, txSignature, onDepositDetected, toast]);

  // Reset state when modal closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setDepositStatus('waiting');
      setExpectedAmount('');
      setShowCoinRain(false);
    }
    onOpenChange(newOpen);
  };

  // Get status config
  const getStatusConfig = () => {
    switch (depositStatus) {
      case 'waiting':
        return {
          icon: Clock,
          color: 'pipe',
          title: 'Waiting for Transaction...',
          description: 'Send SOL to the address above from any wallet',
        };
      case 'detecting':
        return {
          icon: Loader2,
          color: 'star-yellow',
          title: 'Transaction Detected!',
          description: 'Waiting for network confirmation...',
        };
      case 'confirming':
        return {
          icon: Loader2,
          color: 'star-yellow',
          title: 'Confirming on Blockchain...',
          description: 'This usually takes 30-60 seconds',
        };
      case 'confirmed':
        return {
          icon: CheckCircle2,
          color: 'luigi-green',
          title: 'Deposit Confirmed!',
          description: `${depositedAmount} SOL added to your account`,
        };
      case 'error':
        return {
          icon: AlertCircle,
          color: 'mario-red',
          title: 'Deposit Failed',
          description: 'Please try again or contact support',
        };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;
  const isLoading = depositStatus === 'detecting' || depositStatus === 'confirming';
  const isComplete = depositStatus === 'confirmed';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg border-4 border-star-yellow-500 shadow-mario overflow-hidden">
        {/* Coin rain animation */}
        <AnimatePresence>
          {showCoinRain && <CoinRainAnimation />}
        </AnimatePresence>

        <DialogHeader>
          <DialogTitle className="font-mario text-xl text-star-yellow-700 flex items-center gap-2">
            <ArrowDownToLine className="w-6 h-6" />
            Deposit SOL to Your Account
          </DialogTitle>
          <DialogDescription>
            Send SOL from any wallet to fund your live trading account
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Loading state */}
          {isLoadingAddress ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-star-yellow-600 animate-spin mb-4" />
              <p className="text-sm text-pipe-600">Generating deposit address...</p>
            </div>
          ) : (
            <>
              {/* QR Code */}
              <div className="flex justify-center">
                <div className="p-4 bg-white rounded-xl border-4 border-pipe-900 shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
                  {qrCodeUrl ? (
                    <img
                      src={qrCodeUrl}
                      alt="Deposit Address QR Code"
                      className="w-64 h-64"
                    />
                  ) : (
                    <div className="w-64 h-64 bg-pipe-100 animate-pulse rounded" />
                  )}
                </div>
              </div>

              {/* Deposit Address */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-pipe-900">
                  Deposit Address
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={depositAddress}
                    readOnly
                    className="font-mono text-xs bg-pipe-50 border-2 border-pipe-300"
                  />
                  <Button
                    onClick={handleCopyAddress}
                    size="sm"
                    variant="outline"
                    className={cn(
                      "border-2 transition-all duration-300",
                      copied
                        ? "bg-luigi-green-500 text-white border-luigi-green-700"
                        : "border-pipe-400"
                    )}
                  >
                    {copied ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-pipe-600">
                  This is your unique deposit address. Send SOL from any wallet.
                </p>
              </div>

              {/* Optional Expected Amount */}
              {!isComplete && (
                <div className="space-y-2">
                  <Label htmlFor="expected-amount" className="text-sm font-semibold text-pipe-900">
                    Expected Amount (Optional)
                  </Label>
                  <Input
                    id="expected-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g., 5.0"
                    value={expectedAmount}
                    onChange={(e) => setExpectedAmount(e.target.value)}
                    className="border-2 border-pipe-300"
                  />
                  <p className="text-xs text-pipe-600">
                    Helps us notify you faster when the deposit is detected
                  </p>
                </div>
              )}

              {/* Instructions */}
              {!isComplete && (
                <Alert className="border-2 border-star-yellow-500 bg-star-yellow-50">
                  <Sparkles className="h-4 w-4 text-star-yellow-700" />
                  <AlertDescription className="text-sm text-star-yellow-900">
                    <p className="font-semibold mb-1">How to deposit:</p>
                    <ol className="list-decimal list-inside space-y-1 text-xs">
                      <li>Open your Solana wallet (Phantom, Solflare, etc.)</li>
                      <li>Send SOL to the address above (or scan QR code)</li>
                      <li>Wait ~30 seconds for blockchain confirmation</li>
                      <li>Your balance will update automatically!</li>
                    </ol>
                  </AlertDescription>
                </Alert>
              )}

              {/* Status Indicator */}
              <motion.div
                layout
                className={cn(
                  "p-4 rounded-lg border-3 flex items-center gap-3",
                  statusConfig.color === 'pipe' && "bg-pipe-50 border-pipe-300",
                  statusConfig.color === 'star-yellow' && "bg-star-yellow-50 border-star-yellow-500",
                  statusConfig.color === 'luigi-green' && "bg-luigi-green-50 border-luigi-green-500",
                  statusConfig.color === 'mario-red' && "bg-mario-red-50 border-mario-red-500"
                )}
              >
                <StatusIcon
                  className={cn(
                    "w-6 h-6",
                    isLoading && "animate-spin",
                    statusConfig.color === 'pipe' && "text-pipe-600",
                    statusConfig.color === 'star-yellow' && "text-star-yellow-700",
                    statusConfig.color === 'luigi-green' && "text-luigi-green-700",
                    statusConfig.color === 'mario-red' && "text-mario-red-700"
                  )}
                />
                <div className="flex-1">
                  <p className="font-semibold text-sm text-pipe-900">
                    {statusConfig.title}
                  </p>
                  <p className="text-xs text-pipe-700">
                    {statusConfig.description}
                  </p>
                </div>
              </motion.div>

              {/* Transaction link (if confirmed) */}
              {isComplete && txSignature && (
                <Button
                  variant="outline"
                  className="w-full border-2 border-pipe-400"
                  onClick={() => {
                    window.open(`https://solscan.io/tx/${txSignature}`, '_blank');
                  }}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Transaction on Solscan
                </Button>
              )}
            </>
          )}
        </div>

        {/* Close button (only show when complete) */}
        {isComplete && (
          <div className="flex justify-end pt-2">
            <Button
              onClick={() => handleOpenChange(false)}
              className="bg-luigi-green-500 hover:bg-luigi-green-600 text-white border-3 border-luigi-green-700 shadow-mario font-semibold"
            >
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Coin Rain Animation (success celebration)
 */
function CoinRainAnimation() {
  const coins = Array.from({ length: 20 }, (_, i) => i);

  return (
    <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
      {coins.map((i) => (
        <motion.div
          key={i}
          initial={{
            y: -20,
            x: `${Math.random() * 100}%`,
            rotate: 0,
            opacity: 1,
          }}
          animate={{
            y: '100vh',
            rotate: 360 * (Math.random() > 0.5 ? 1 : -1),
            opacity: 0,
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            delay: Math.random() * 0.5,
            ease: 'linear',
          }}
          className="absolute text-2xl"
        >
          🪙
        </motion.div>
      ))}
    </div>
  );
}
