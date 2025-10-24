'use client';

import { useState, useEffect, useRef } from 'react';
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
import { useToast } from '@/hooks/use-toast';

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
    showModeConfirm,
    setShowModeConfirm,
    pendingMode,
    setPendingMode,
    switchError,
    setSwitchError,
    handleToggleMode,
    handleConfirmModeSwitch,
    handleCancelModeSwitch,
  } = useTradingMode();

  const [isVisible, setIsVisible] = useState(true);
  const [zeroBalanceDetectedAt, setZeroBalanceDetectedAt] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const isPaperMode = tradeMode === 'PAPER';
  const hasZeroBalance = tradeMode === 'REAL' && realSolBalance === 0;

  // Track when zero balance is first detected
  useEffect(() => {
    if (hasZeroBalance && !zeroBalanceDetectedAt) {
      setZeroBalanceDetectedAt(Date.now());
    } else if (!hasZeroBalance) {
      setZeroBalanceDetectedAt(null);
    }
  }, [hasZeroBalance, zeroBalanceDetectedAt]);

  // Pulse for 10 seconds after zero balance detection, then static
  const shouldPulse = hasZeroBalance && zeroBalanceDetectedAt && (Date.now() - zeroBalanceDetectedAt) < 10000;

  // Visibility detection to pause animations when not visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);


  // Toggle button content
  const ToggleButton = () => (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => handleToggleMode(isPaperMode ? 'REAL' : 'PAPER')}
      disabled={isSwitchingMode}
      aria-label={isSwitchingMode ? "Switching trading mode, please wait" : `Switch to ${isPaperMode ? 'LIVE' : 'PAPER'} trading mode`}
      className={cn(
        'relative flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300',
        'border-3 font-semibold text-sm',
        isPaperMode
          ? 'bg-luigi-green-500 hover:bg-luigi-green-600 text-white border-luigi-green-700 shadow-mario'
          : 'text-pipe-900 border-star-700 shadow-mario',
        shouldPulse && 'animate-pulse-ring',
        className
      )}
      style={isPaperMode ? {} : {
        background: 'linear-gradient(to right, var(--color-star), var(--color-coin))'
      }}
    >
      {/* Icon with optimized animation */}
      <motion.div
        animate={isVisible && !isSwitchingMode ? (isPaperMode ? {
          rotate: [0, 360],
          transition: { duration: 3, repeat: 2, ease: 'linear' }
        } : {
          scale: [1, 1.1, 1],
          rotate: [0, 5, -5, 0],
          transition: { duration: 2, repeat: 1, ease: 'easeInOut' }
        }) : false}
      >
        {isPaperMode ? (
          <Coins className="w-5 h-5 fill-current" />
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
          className="ml-2"
        >
          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full" />
        </motion.div>
      )}
    </motion.button>
  );

  // Render with or without dropdown
  if (!showDropdown) {
    return <ToggleButton />;
  }

  return (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="relative" ref={containerRef}>
            <ToggleButton />
            <ChevronDown className="absolute -bottom-1 right-1 w-3 h-3 text-current opacity-70" />
          </div>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-64 border-3 border-pipe-400 shadow-mario">
          {/* Trading fees & limits */}
          <div className="px-2 py-1.5 text-xs text-pipe-600">
            <div className="flex items-center justify-between mb-1">
              <span>Trading Fee:</span>
              <span className="font-mono font-semibold">
                {isPaperMode ? 'FREE' : realSolBalance > 0 ? '0.5%' : '1%'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Min. Trade:</span>
              <span className="font-mono font-semibold">0.01 SOL</span>
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
            You're in {isPaperMode ? 'PAPER' : 'LIVE'} mode. Switch to {isPaperMode ? 'LIVE' : 'PAPER'}?
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

          {/* Account status */}
          <DropdownMenuSeparator />
          <div className="px-2 py-1.5 text-xs text-pipe-500">
            <div className="flex justify-between mb-0.5">
              <span>Status:</span>
              <span className={cn(
                "font-semibold",
                hasZeroBalance ? "text-mario-red-600" : "text-luigi-green-600"
              )}>
                {hasZeroBalance ? 'Fund Required' : 'Ready to Trade'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Total Balance:</span>
              <span className="font-mono font-semibold">{formatNumber(activeBalance, 2)} SOL</span>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
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
