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
import { TrendIndicator } from "@/components/shared/TrendIndicator";
import { formatNumber } from "@/lib/utils";
import { TradeConfirmationProps } from "./types";
import { AlertCircle } from "lucide-react";

/**
 * TradeConfirmation component for confirming trade details
 * 
 * Follows the UX pattern guidelines for trade confirmations:
 * - Two-step confirmation for trades
 * - Display complete order details
 * - Show token information clearly
 * - Display total value prominently
 * - Provide easy cancellation option
 * - Show loading state during submission
 * - Display slippage and min-received information
 * - Show inline error alerts
 */
export function TradeConfirmation({
  open,
  onOpenChange,
  tradeDetails,
  isSubmitting = false,
  onConfirm,
  onCancel
}: TradeConfirmationProps) {
  const [error, setError] = useState<string | null>(null);

  const { 
    token, 
    tradeType, 
    tokenAmount, 
    executionPrice, 
    totalValue,
    networkFee,
    slippageBps,
    minReceived,
    priceImpactPct
  } = tradeDetails;

  const handleConfirm = async () => {
    if (isSubmitting) return;
    
    setError(null);
    
    try {
      await onConfirm();
      // Success - dialog will close from parent
    } catch (err) {
      // Show error inline
      const errorMessage = err instanceof Error ? err.message : 'Failed to confirm trade. Please try again.';
      setError(errorMessage);
    }
  };

  // Reset error when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setError(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            Confirm {tradeType.toUpperCase()} Order
          </DialogTitle>
          <DialogDescription>
            Please review your order details before confirming.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={token.logoUrl} alt={token.name} />
                <AvatarFallback>{token.symbol.substring(0, 2)}</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">{token.name}</div>
                <div className="text-xs text-muted-foreground">{token.symbol}</div>
              </div>
            </div>
            {parseFloat(token.priceChange24h || '0') !== undefined && (
              <TrendIndicator value={parseFloat(token.priceChange24h || '0')} />
            )}
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Type</span>
              <span className="font-medium capitalize">{tradeType}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Amount</span>
              <span className="font-medium">
                {formatNumber(tokenAmount, 6)} {token.symbol}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Price</span>
              <span className="font-medium">${formatNumber(executionPrice)}</span>
            </div>
            
            {/* Network Fee - always show */}
            <div className="flex justify-between text-sm">
              <span>Network Fee</span>
              <span className="font-medium">
                ${formatNumber(networkFee ?? 0)}
              </span>
            </div>

            {/* Slippage (if provided) */}
            {typeof slippageBps === 'number' && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Slippage Tolerance</span>
                <span>{(slippageBps / 100).toFixed(2)}%</span>
              </div>
            )}

            {/* Minimum Received (if provided) */}
            {typeof minReceived === 'number' && (
              <div className="flex justify-between text-sm">
                <span>Minimum Received</span>
                <span className="font-medium">
                  {formatNumber(minReceived, 6)} {token.symbol}
                </span>
              </div>
            )}

            {/* Price Impact (if provided) */}
            {typeof priceImpactPct === 'number' && priceImpactPct > 0 && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Price Impact</span>
                <span className={priceImpactPct > 5 ? 'text-destructive' : ''}>
                  {priceImpactPct.toFixed(2)}%
                </span>
              </div>
            )}
            
            <Separator className="my-1" />
            <div className="flex justify-between text-sm font-semibold">
              <span>Total Value</span>
              <span>${formatNumber(totalValue)}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={isSubmitting}
            className={tradeType === 'buy' ? 'bg-profit hover:bg-profit/90' : 'bg-loss hover:bg-loss/90'}
          >
            {isSubmitting ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Processing...
              </>
            ) : (
              `Confirm ${tradeType}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}