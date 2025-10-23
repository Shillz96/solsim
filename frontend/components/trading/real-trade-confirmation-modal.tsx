'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { formatNumber } from "@/lib/utils";
import { AlertCircle, AlertTriangle } from "lucide-react";

export interface RealTradeDetails {
  token: {
    name: string;
    symbol: string;
    logoUrl?: string;
    mint: string;
  };
  tradeType: 'buy' | 'sell';
  tokenAmount: number;
  executionPrice: number;
  totalValue: number;
  fundingSource: 'DEPOSITED' | 'WALLET';
  networkFee: number;
  pumpPortalFee: number;
  slippageBps?: number;
  minReceived?: number;
  priceImpactPct?: number;
  availableBalance: number;
}

export interface RealTradeConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tradeDetails: RealTradeDetails;
  isSubmitting?: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

/**
 * RealTradeConfirmationModal - Confirmation dialog for real money trades
 *
 * Features:
 * - Clear warning about real money
 * - Fee breakdown (PumpPortal + network)
 * - Required confirmation checkbox
 * - Balance verification
 * - Slippage and minimum received display
 * - Visual distinction from paper trading (Mario red theme)
 */
export function RealTradeConfirmationModal({
  open,
  onOpenChange,
  tradeDetails,
  isSubmitting = false,
  onConfirm,
  onCancel
}: RealTradeConfirmationModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [confirmChecked, setConfirmChecked] = useState<boolean>(false);

  const {
    token,
    tradeType,
    tokenAmount,
    executionPrice,
    totalValue,
    fundingSource,
    networkFee,
    pumpPortalFee,
    slippageBps,
    minReceived,
    priceImpactPct,
    availableBalance,
  } = tradeDetails;

  const totalFees = networkFee + pumpPortalFee;
  const totalCost = tradeType === 'buy' ? totalValue + totalFees : totalValue;
  const insufficientBalance = tradeType === 'buy' && totalCost > availableBalance;

  const handleConfirm = async () => {
    if (isSubmitting || !confirmChecked || insufficientBalance) return;

    setError(null);

    try {
      await onConfirm();
      // Success - dialog will close from parent
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute trade. Please try again.';
      setError(errorMessage);
    }
  };

  // Reset state when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setError(null);
      setConfirmChecked(false);
    }
    onOpenChange(newOpen);
  };

  const getFundingSourceLabel = () => {
    if (fundingSource === 'DEPOSITED') {
      return 'Deposited Balance (1% fee)';
    }
    return 'Connected Wallet (0.5% fee)';
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-dialog-md border-4 border-mario-red-500 shadow-mario">
        <DialogHeader>
          <DialogTitle className="font-mario text-mario-red-500 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            LIVE TRADING - REAL MONEY
          </DialogTitle>
          <DialogDescription>
            You are about to execute a real trade on Solana mainnet using real money.
            Please review carefully before confirming.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Warning Alert */}
          <Alert className="border-star-yellow-500 bg-star-yellow-50">
            <AlertTriangle className="h-4 w-4 text-star-yellow-600" />
            <AlertDescription className="text-star-yellow-700">
              <strong>Warning:</strong> This is a real transaction. Once confirmed, it cannot be undone.
              Tokens will be purchased/sold using real SOL from your {fundingSource === 'DEPOSITED' ? 'deposited balance' : 'connected wallet'}.
            </AlertDescription>
          </Alert>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Insufficient Balance Warning */}
          {insufficientBalance && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Insufficient balance. You need {formatNumber(totalCost, 4)} SOL but only have {formatNumber(availableBalance, 4)} SOL.
              </AlertDescription>
            </Alert>
          )}

          {/* Token Info */}
          <div className="flex justify-between items-center p-3 bg-sky-50 rounded-lg border-2 border-pipe-300">
            <div className="flex items-center gap-2">
              <Avatar className="w-10 h-10 border-2 border-pipe-400">
                <AvatarImage src={token.logoUrl} alt={token.name} />
                <AvatarFallback className="bg-luigi-green-500 text-white font-mario text-xs">
                  {token.symbol.substring(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-semibold text-pipe-900">{token.name}</div>
                <div className="text-xs text-pipe-600">{token.symbol}</div>
              </div>
            </div>
            <div className={`px-3 py-1 rounded font-semibold text-sm ${
              tradeType === 'buy'
                ? 'bg-luigi-green-500 text-white'
                : 'bg-mario-red-500 text-white'
            }`}>
              {tradeType.toUpperCase()}
            </div>
          </div>

          <Separator className="bg-pipe-300" />

          {/* Trade Details */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-pipe-600">Trade Type</span>
              <span className="font-semibold text-pipe-900 capitalize">{tradeType}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-pipe-600">Funding Source</span>
              <span className="font-semibold text-pipe-900">{getFundingSourceLabel()}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-pipe-600">Amount</span>
              <span className="font-semibold text-pipe-900">
                {formatNumber(tokenAmount, 6)} {token.symbol}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-pipe-600">Execution Price</span>
              <span className="font-semibold text-pipe-900">${formatNumber(executionPrice, 6)}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-pipe-600">Subtotal</span>
              <span className="font-semibold text-pipe-900">${formatNumber(totalValue, 4)}</span>
            </div>

            <Separator className="my-2 bg-pipe-200" />

            {/* Fees */}
            <div className="flex justify-between text-xs">
              <span className="text-pipe-500">PumpPortal Fee ({fundingSource === 'DEPOSITED' ? '1%' : '0.5%'})</span>
              <span className="text-pipe-700">${formatNumber(pumpPortalFee, 6)}</span>
            </div>

            <div className="flex justify-between text-xs">
              <span className="text-pipe-500">Network Fee</span>
              <span className="text-pipe-700">${formatNumber(networkFee, 6)}</span>
            </div>

            <div className="flex justify-between text-xs">
              <span className="text-pipe-500">Total Fees</span>
              <span className="text-pipe-700 font-semibold">${formatNumber(totalFees, 6)}</span>
            </div>

            <Separator className="my-2 bg-pipe-300" />

            {/* Slippage */}
            {typeof slippageBps === 'number' && (
              <div className="flex justify-between text-xs">
                <span className="text-pipe-500">Slippage Tolerance</span>
                <span className="text-pipe-700">{(slippageBps / 100).toFixed(2)}%</span>
              </div>
            )}

            {/* Minimum Received */}
            {typeof minReceived === 'number' && (
              <div className="flex justify-between text-xs">
                <span className="text-pipe-500">Minimum Received</span>
                <span className="text-pipe-700">
                  {formatNumber(minReceived, 6)} {token.symbol}
                </span>
              </div>
            )}

            {/* Price Impact */}
            {typeof priceImpactPct === 'number' && priceImpactPct > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-pipe-500">Price Impact</span>
                <span className={priceImpactPct > 5 ? 'text-mario-red-600 font-semibold' : 'text-pipe-700'}>
                  {priceImpactPct.toFixed(2)}%
                </span>
              </div>
            )}

            <Separator className="my-2 bg-pipe-300" />

            {/* Total */}
            <div className="flex justify-between text-base">
              <span className="font-semibold text-pipe-900">Total {tradeType === 'buy' ? 'Cost' : 'Proceeds'}</span>
              <span className="font-bold text-pipe-900">{formatNumber(totalCost, 4)} SOL</span>
            </div>

            <div className="flex justify-between text-xs">
              <span className="text-pipe-500">Available Balance</span>
              <span className={insufficientBalance ? 'text-mario-red-600 font-semibold' : 'text-pipe-700'}>
                {formatNumber(availableBalance, 4)} SOL
              </span>
            </div>
          </div>

          <Separator className="bg-pipe-300" />

          {/* Confirmation Checkbox */}
          <div className="flex items-start space-x-2 p-3 bg-pipe-50 rounded-lg border-2 border-pipe-300">
            <Checkbox
              id="confirm-real-trade"
              checked={confirmChecked}
              onCheckedChange={(checked) => setConfirmChecked(checked === true)}
              disabled={isSubmitting || insufficientBalance}
              className="mt-1"
            />
            <label
              htmlFor="confirm-real-trade"
              className="text-sm font-medium leading-tight cursor-pointer select-none text-pipe-900"
            >
              I understand this is a real transaction using real money, and I have reviewed all details including fees and slippage.
            </label>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="border-2 border-pipe-400"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting || !confirmChecked || insufficientBalance}
            className={`border-3 font-semibold ${
              tradeType === 'buy'
                ? 'bg-luigi-green-500 hover:bg-luigi-green-600 text-white shadow-mario'
                : 'bg-mario-red-500 hover:bg-mario-red-600 text-white shadow-mario'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Processing...
              </>
            ) : (
              `Execute ${tradeType.toUpperCase()} Trade`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
