'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Star, AlertTriangle, TrendingUp, Wallet, ArrowDownToLine, ChevronDown } from 'lucide-react';
import { useTradingMode } from '@/lib/trading-mode-context';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { formatNumber } from '@/lib/utils';

interface EnhancedTradingModeToggleProps {
  className?: string;
  showDropdown?: boolean;
  onDepositClick?: () => void;
  onConnectWalletClick?: () => void;
}

/**
 * Enhanced Trading Mode Toggle with Mario Theme
 *
 * Features:
 * - Animated coin/star icons based on mode
 * - Prominent balance display
 * - Pulsing alert when 0 balance in REAL mode
 * - Dropdown menu with quick actions
 * - Mode switch confirmation dialog
 */
export function EnhancedTradingModeToggle({
  className,
  showDropdown = true,
  onDepositClick,
  onConnectWalletClick,
}: EnhancedTradingModeToggleProps) {
  const {
    tradeMode,
    activeBalance,
    virtualSolBalance,
    realSolBalance,
    isSwitchingMode,
    switchToRealTrading,
    switchToPaperTrading,
  } = useTradingMode();

  const [showModeConfirm, setShowModeConfirm] = useState(false);
  const [pendingMode, setPendingMode] = useState<'PAPER' | 'REAL' | null>(null);

  const isPaperMode = tradeMode === 'PAPER';
  const hasZeroBalance = tradeMode === 'REAL' && realSolBalance === 0;

  // Handle mode toggle
  const handleToggleMode = (newMode: 'PAPER' | 'REAL') => {
    if (newMode === tradeMode || isSwitchingMode) return;
    setPendingMode(newMode);
    setShowModeConfirm(true);
  };

  const handleConfirmModeSwitch = async () => {
    if (!pendingMode) return;

    try {
      if (pendingMode === 'REAL') {
        await switchToRealTrading();
      } else {
        await switchToPaperTrading();
      }
      setShowModeConfirm(false);
      setPendingMode(null);
    } catch (error) {
      console.error('Error switching trading mode:', error);
    }
  };

  const handleCancelModeSwitch = () => {
    setShowModeConfirm(false);
    setPendingMode(null);
  };

  // Toggle button content
  const ToggleButton = () => (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => handleToggleMode(isPaperMode ? 'REAL' : 'PAPER')}
      disabled={isSwitchingMode}
      className={cn(
        'relative flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300',
        'border-3 font-semibold text-sm',
        isPaperMode
          ? 'bg-luigi-green-500 hover:bg-luigi-green-600 text-white border-luigi-green-700 shadow-mario'
          : 'bg-gradient-to-r from-star-yellow-500 to-coin-yellow-500 hover:from-star-yellow-600 hover:to-coin-yellow-600 text-pipe-900 border-star-yellow-700 shadow-mario',
        hasZeroBalance && 'animate-pulse-ring',
        className
      )}
    >
      {/* Icon with animation */}
      <motion.div
        animate={isPaperMode ? {
          rotate: [0, 360],
          transition: { duration: 2, repeat: Infinity, ease: 'linear' }
        } : {
          scale: [1, 1.2, 1],
          rotate: [0, 10, -10, 0],
          transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
        }}
      >
        {isPaperMode ? (
          <Coins className="w-5 h-5" />
        ) : (
          <Star className="w-5 h-5 fill-current" />
        )}
      </motion.div>

      {/* Mode label */}
      <div className="flex flex-col items-start">
        <span className="font-mario text-xs leading-none">
          {isPaperMode ? 'PAPER' : 'LIVE'}
        </span>
        <span className={cn(
          "text-[10px] font-mono leading-none mt-0.5",
          isPaperMode ? "text-luigi-green-100" : "text-star-yellow-900"
        )}>
          {formatNumber(activeBalance, 2)} SOL
        </span>
      </div>

      {/* Warning badge for 0 balance */}
      <AnimatePresence>
        {hasZeroBalance && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute -top-1 -right-1 bg-mario-red-500 text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold border-2 border-white"
          >
            FUND
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading spinner */}
      {isSwitchingMode && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 flex items-center justify-center bg-pipe-900/50 rounded-lg"
        >
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
        </motion.div>
      )}
    </motion.button>
  );

  // Render with or without dropdown
  if (!showDropdown) {
    return (
      <>
        <ToggleButton />
        {/* Confirmation Dialog */}
        <ModeSwitchDialog
          open={showModeConfirm}
          onOpenChange={setShowModeConfirm}
          pendingMode={pendingMode}
          onConfirm={handleConfirmModeSwitch}
          onCancel={handleCancelModeSwitch}
          hasZeroBalance={hasZeroBalance}
        />
      </>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="relative">
            <ToggleButton />
            <ChevronDown className="absolute -bottom-1 right-1 w-3 h-3 text-current opacity-70" />
          </div>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56 border-3 border-pipe-400 shadow-mario">
          {/* Mode info */}
          <div className="px-2 py-1.5 text-xs text-pipe-600">
            <div className="flex items-center justify-between mb-1">
              <span>Current Mode:</span>
              <span className={cn(
                "font-bold",
                isPaperMode ? "text-luigi-green-600" : "text-mario-red-600"
              )}>
                {isPaperMode ? 'PAPER' : 'LIVE'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Available:</span>
              <span className="font-mono font-semibold">{formatNumber(activeBalance, 2)} SOL</span>
            </div>
          </div>

          <DropdownMenuSeparator />

          {/* Switch mode */}
          <DropdownMenuItem
            onClick={() => handleToggleMode(isPaperMode ? 'REAL' : 'PAPER')}
            disabled={isSwitchingMode}
            className="cursor-pointer"
          >
            <TrendingUp className="mr-2 h-4 w-4" />
            Switch to {isPaperMode ? 'Live' : 'Paper'} Trading
          </DropdownMenuItem>

          {/* Show funding options when in REAL mode */}
          {!isPaperMode && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDepositClick}
                className="cursor-pointer"
              >
                <ArrowDownToLine className="mr-2 h-4 w-4" />
                Deposit SOL
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onConnectWalletClick}
                className="cursor-pointer"
              >
                <Wallet className="mr-2 h-4 w-4" />
                Connect Wallet
              </DropdownMenuItem>
            </>
          )}

          {/* Balance details */}
          <DropdownMenuSeparator />
          <div className="px-2 py-1.5 text-xs text-pipe-500">
            <div className="flex justify-between mb-0.5">
              <span>Virtual:</span>
              <span className="font-mono">{formatNumber(virtualSolBalance, 2)} SOL</span>
            </div>
            <div className="flex justify-between">
              <span>Deposited:</span>
              <span className="font-mono">{formatNumber(realSolBalance, 2)} SOL</span>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Confirmation Dialog */}
      <ModeSwitchDialog
        open={showModeConfirm}
        onOpenChange={setShowModeConfirm}
        pendingMode={pendingMode}
        onConfirm={handleConfirmModeSwitch}
        onCancel={handleCancelModeSwitch}
        hasZeroBalance={hasZeroBalance}
      />
    </>
  );
}

/**
 * Mode Switch Confirmation Dialog
 */
interface ModeSwitchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingMode: 'PAPER' | 'REAL' | null;
  onConfirm: () => void;
  onCancel: () => void;
  hasZeroBalance: boolean;
}

function ModeSwitchDialog({
  open,
  onOpenChange,
  pendingMode,
  onConfirm,
  onCancel,
  hasZeroBalance,
}: ModeSwitchDialogProps) {
  const isSwitchingToReal = pendingMode === 'REAL';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
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
                Switch to LIVE Trading?
              </>
            ) : (
              <>
                <Coins className="w-5 h-5" />
                Switch to PAPER Trading?
              </>
            )}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm">
            {isSwitchingToReal ? (
              <>
                <p className="mb-2">
                  You're about to switch to <strong>live trading mode</strong> where you'll use <strong>real SOL</strong> to execute trades on Solana mainnet.
                </p>
                {hasZeroBalance && (
                  <div className="bg-star-yellow-50 border-2 border-star-yellow-500 rounded-lg p-3 mb-2">
                    <p className="text-star-yellow-900 font-semibold text-xs flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" />
                      You'll need to fund your account or connect a wallet before trading.
                    </p>
                  </div>
                )}
                <p className="text-pipe-600 text-xs">
                  • Trades execute on-chain with real money<br />
                  • Fees apply: 1% (deposited) or 0.5% (wallet)<br />
                  • Transactions cannot be reversed
                </p>
              </>
            ) : (
              <>
                <p className="mb-2">
                  You're about to switch to <strong>paper trading mode</strong> where you'll use <strong>virtual SOL</strong> to practice trading without risk.
                </p>
                <p className="text-pipe-600 text-xs">
                  • No real money involved<br />
                  • Perfect for learning and practicing<br />
                  • Positions are separate from live trading
                </p>
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} className="border-2">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
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

/**
 * Custom animation for pulsing ring effect
 * Add to globals.css:
 *
 * @keyframes pulse-ring {
 *   0%, 100% {
 *     box-shadow: 0 0 0 0 theme('colors.mario-red.500 / 0.7');
 *   }
 *   50% {
 *     box-shadow: 0 0 0 8px theme('colors.mario-red.500 / 0');
 *   }
 * }
 *
 * .animate-pulse-ring {
 *   animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
 * }
 */
