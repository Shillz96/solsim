'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Star, AlertTriangle, TrendingUp } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useTradingMode } from '@/lib/trading-mode-context';

export function ModeSwitchDialog() {
  const {
    showModeConfirm,
    setShowModeConfirm,
    pendingMode,
    handleConfirmModeSwitch,
    handleCancelModeSwitch,
    switchError,
    tradeMode,
    realSolBalance,
  } = useTradingMode();

  const isSwitchingToReal = pendingMode === 'REAL';
  const hasZeroBalance = tradeMode === 'REAL' && realSolBalance === 0;

  // Handle ESC key to dismiss dialog
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showModeConfirm) {
        handleCancelModeSwitch();
      }
    };

    if (showModeConfirm) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showModeConfirm, handleCancelModeSwitch]);

  return (
    <AlertDialog open={showModeConfirm} onOpenChange={setShowModeConfirm}>
      <AlertDialogContent className={cn(
        "border-4 shadow-mario",
        isSwitchingToReal ? "border-mario-red-500" : "border-luigi-green-500"
      )}>
        <AlertDialogHeader>
          <AlertDialogTitle className={cn(
            "font-mario text-lg flex items-center gap-2",
            isSwitchingToReal ? "text-mario-red-600" : "text-luigi-green-600"
          )}>
            {isSwitchingToReal ? (
              <>
                <AlertTriangle className="w-5 h-5" />
                You're in PAPER mode. Switch to LIVE?
              </>
            ) : (
              <>
                <Coins className="w-5 h-5" />
                You're in LIVE mode. Switch to PAPER?
              </>
            )}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm">
            {isSwitchingToReal ? (
              <>
                <div className="mb-3">
                  Switch to <strong>LIVE trading mode</strong> with real SOL on Solana mainnet.
                </div>
                {hasZeroBalance && (
                  <div className="bg-star-yellow-50 border-2 border-star-yellow-500 rounded-lg p-3 mb-3">
                    <p className="text-star-yellow-900 font-semibold text-xs flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" />
                      You'll need to fund your account or connect a wallet before trading.
                    </p>
                  </div>
                )}
                <div className="space-y-1 text-pipe-600 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1 bg-mario-red-500 rounded-full"></div>
                    <span>Trades execute on-chain with real money</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1 bg-mario-red-500 rounded-full"></div>
                    <span>Fees: 0.5% (deposited) or 1% (wallet)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1 bg-mario-red-500 rounded-full"></div>
                    <span>Transactions cannot be reversed</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="mb-3">
                  Switch to <strong>PAPER trading mode</strong> with virtual SOL for practice.
                </div>
                <div className="space-y-1 text-pipe-600 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1 bg-luigi-green-500 rounded-full"></div>
                    <span>No real money involved</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1 bg-luigi-green-500 rounded-full"></div>
                    <span>Perfect for learning and practicing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1 bg-luigi-green-500 rounded-full"></div>
                    <span>Positions are separate from live trading</span>
                  </div>
                </div>
              </>
            )}

            {/* Error message */}
            {switchError && (
              <div className="mt-4 bg-mario-red-50 border-2 border-mario-red-500 rounded-lg p-3">
                <p className="text-mario-red-900 font-semibold text-xs flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  Error: {switchError}
                </p>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancelModeSwitch} className="border-2">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirmModeSwitch}
            className={cn(
              "border-3 font-semibold shadow-mario",
              isSwitchingToReal
                ? "bg-mario-red-500 hover:bg-mario-red-600 text-white border-mario-red-700"
                : "bg-luigi-green-500 hover:bg-luigi-green-600 text-white border-luigi-green-700"
            )}
          >
            {isSwitchingToReal ? 'Switch to LIVE' : 'Switch to PAPER'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
