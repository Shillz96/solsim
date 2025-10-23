'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, XCircle, ExternalLink } from "lucide-react";
import { getTransactionStatus } from "@/lib/real-trade-api";

export type TransactionStep =
  | 'building'
  | 'signing'
  | 'submitting'
  | 'confirming'
  | 'confirmed'
  | 'failed';

export interface TransactionStatusTrackerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  signature?: string;
  currentStep: TransactionStep;
  error?: string;
  onClose?: () => void;
}

interface StepInfo {
  label: string;
  description: string;
}

const STEP_INFO: Record<TransactionStep, StepInfo> = {
  building: {
    label: 'Building Transaction',
    description: 'Preparing your trade transaction...',
  },
  signing: {
    label: 'Waiting for Signature',
    description: 'Please sign the transaction in your wallet...',
  },
  submitting: {
    label: 'Submitting Transaction',
    description: 'Sending transaction to Solana network...',
  },
  confirming: {
    label: 'Confirming Transaction',
    description: 'Waiting for blockchain confirmation...',
  },
  confirmed: {
    label: 'Transaction Confirmed',
    description: 'Your trade has been successfully executed!',
  },
  failed: {
    label: 'Transaction Failed',
    description: 'Your trade could not be completed.',
  },
};

/**
 * TransactionStatusTracker - Real-time transaction status display
 *
 * Features:
 * - Step-by-step progress visualization
 * - Real-time status polling for pending transactions
 * - Solscan transaction link
 * - Mario-themed styling
 * - Success/failure states with appropriate visuals
 */
export function TransactionStatusTracker({
  open,
  onOpenChange,
  signature,
  currentStep,
  error,
  onClose,
}: TransactionStatusTrackerProps) {
  const [pollingStatus, setPollingStatus] = useState<'PENDING' | 'CONFIRMED' | 'FAILED' | null>(null);
  const [confirmations, setConfirmations] = useState<number>(0);

  // Poll transaction status if signature is provided and transaction is confirming
  useEffect(() => {
    if (!signature || currentStep !== 'confirming') {
      return;
    }

    let intervalId: NodeJS.Timeout;

    const pollStatus = async () => {
      try {
        const result = await getTransactionStatus(signature);

        if (result.success && result.status) {
          setPollingStatus(result.status);
          setConfirmations(result.confirmations ?? 0);

          // Stop polling if confirmed or failed
          if (result.status === 'CONFIRMED' || result.status === 'FAILED') {
            clearInterval(intervalId);
          }
        }
      } catch (err) {
        console.error('Error polling transaction status:', err);
      }
    };

    // Initial poll
    pollStatus();

    // Poll every 2 seconds
    intervalId = setInterval(pollStatus, 2000);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [signature, currentStep]);

  const handleClose = () => {
    onClose?.();
    onOpenChange(false);
  };

  const isComplete = currentStep === 'confirmed' || currentStep === 'failed';
  const isSuccess = currentStep === 'confirmed';
  const isFailed = currentStep === 'failed';

  const getSolscanUrl = () => {
    if (!signature) return null;
    return `https://solscan.io/tx/${signature}`;
  };

  const getStepIcon = (step: TransactionStep) => {
    if (step === currentStep) {
      if (step === 'confirmed') {
        return <CheckCircle2 className="w-6 h-6 text-luigi-green-500" />;
      }
      if (step === 'failed') {
        return <XCircle className="w-6 h-6 text-mario-red-500" />;
      }
      return <Loader2 className="w-6 h-6 text-coin-yellow-500 animate-spin" />;
    }

    const stepOrder: TransactionStep[] = ['building', 'signing', 'submitting', 'confirming', 'confirmed'];
    const currentIndex = stepOrder.indexOf(currentStep);
    const stepIndex = stepOrder.indexOf(step);

    if (stepIndex < currentIndex) {
      return <CheckCircle2 className="w-6 h-6 text-luigi-green-500" />;
    }

    return <div className="w-6 h-6 rounded-full border-2 border-pipe-300 bg-white" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-dialog-md border-4 border-coin-yellow-500 shadow-mario"
        onPointerDownOutside={(e) => {
          // Prevent closing while transaction is in progress
          if (!isComplete) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle className="font-mario text-coin-yellow-600 flex items-center gap-2">
            {isSuccess && <CheckCircle2 className="w-5 h-5 text-luigi-green-500" />}
            {isFailed && <XCircle className="w-5 h-5 text-mario-red-500" />}
            {!isComplete && <Loader2 className="w-5 h-5 animate-spin" />}
            Transaction Status
          </DialogTitle>
          <DialogDescription>
            {STEP_INFO[currentStep].description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {isSuccess && (
            <Alert className="border-luigi-green-500 bg-luigi-green-50">
              <CheckCircle2 className="h-4 w-4 text-luigi-green-600" />
              <AlertDescription className="text-luigi-green-700">
                <strong>Success!</strong> Your trade has been confirmed on the Solana blockchain.
              </AlertDescription>
            </Alert>
          )}

          {/* Progress Steps */}
          <div className="space-y-4">
            {/* Building */}
            <div className="flex items-start gap-3">
              {getStepIcon('building')}
              <div className="flex-1">
                <div className={`font-semibold ${currentStep === 'building' ? 'text-coin-yellow-600' : 'text-pipe-900'}`}>
                  Building Transaction
                </div>
                <div className="text-xs text-pipe-600">Preparing trade parameters</div>
              </div>
            </div>

            {/* Signing (only for wallet trades) */}
            {currentStep === 'signing' || (currentStep !== 'building' && signature) ? (
              <div className="flex items-start gap-3">
                {getStepIcon('signing')}
                <div className="flex-1">
                  <div className={`font-semibold ${currentStep === 'signing' ? 'text-coin-yellow-600' : 'text-pipe-900'}`}>
                    Signing Transaction
                  </div>
                  <div className="text-xs text-pipe-600">Awaiting wallet signature</div>
                </div>
              </div>
            ) : null}

            {/* Submitting */}
            {(currentStep === 'submitting' || currentStep === 'confirming' || currentStep === 'confirmed') && (
              <div className="flex items-start gap-3">
                {getStepIcon('submitting')}
                <div className="flex-1">
                  <div className={`font-semibold ${currentStep === 'submitting' ? 'text-coin-yellow-600' : 'text-pipe-900'}`}>
                    Submitting Transaction
                  </div>
                  <div className="text-xs text-pipe-600">Sending to Solana network</div>
                </div>
              </div>
            )}

            {/* Confirming */}
            {(currentStep === 'confirming' || currentStep === 'confirmed') && (
              <div className="flex items-start gap-3">
                {getStepIcon('confirming')}
                <div className="flex-1">
                  <div className={`font-semibold ${currentStep === 'confirming' ? 'text-coin-yellow-600' : 'text-pipe-900'}`}>
                    Confirming Transaction
                  </div>
                  <div className="text-xs text-pipe-600">
                    {pollingStatus === 'CONFIRMED' ? 'Confirmed!' : `Waiting for confirmation${confirmations > 0 ? ` (${confirmations} confirmations)` : '...'}`}
                  </div>
                </div>
              </div>
            )}

            {/* Confirmed */}
            {currentStep === 'confirmed' && (
              <div className="flex items-start gap-3">
                {getStepIcon('confirmed')}
                <div className="flex-1">
                  <div className="font-semibold text-luigi-green-600">
                    Transaction Confirmed!
                  </div>
                  <div className="text-xs text-pipe-600">Trade executed successfully</div>
                </div>
              </div>
            )}
          </div>

          {/* Transaction Signature */}
          {signature && (
            <div className="p-3 bg-sky-50 rounded-lg border-2 border-pipe-300">
              <div className="text-xs font-semibold text-pipe-700 mb-1">Transaction Signature</div>
              <div className="font-mono text-xs text-pipe-900 break-all mb-2">
                {signature}
              </div>
              <a
                href={getSolscanUrl() || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-coin-yellow-600 hover:text-coin-yellow-700 font-semibold"
              >
                View on Solscan
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        {/* Close Button (only show when complete) */}
        {isComplete && (
          <div className="flex justify-end">
            <Button
              onClick={handleClose}
              className={`font-semibold ${
                isSuccess
                  ? 'bg-luigi-green-500 hover:bg-luigi-green-600 text-white shadow-mario'
                  : 'bg-pipe-600 hover:bg-pipe-700 text-white'
              }`}
            >
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
