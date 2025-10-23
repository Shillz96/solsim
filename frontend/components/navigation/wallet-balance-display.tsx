'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, ArrowDownToLine, ArrowUpFromLine, ExternalLink, Power, AlertTriangle, Sparkles } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useTradingMode } from '@/lib/trading-mode-context';
import { Button } from '@/components/ui/button';
import { DepositModal } from '@/components/modals/deposit-modal';
import { WithdrawModal } from '@/components/modals/withdraw-modal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/utils';
import { AnimatedNumber } from '@/components/ui/animated-number';

interface WalletBalanceDisplayProps {
  className?: string;
  onDepositClick?: () => void;
  onWithdrawClick?: () => void;
  onConnectWalletClick?: () => void;
  showDropdown?: boolean;
  variant?: "compact" | "minimal";
}

/**
 * Wallet Balance Display for Top Navigation
 *
 * Context-aware display that shows different information based on:
 * - Trading mode (PAPER/REAL)
 * - Funding source (DEPOSITED/WALLET)
 * - Wallet connection status
 * - Balance amounts
 *
 * Features:
 * - Animated balance updates
 * - Mode-specific icons and colors
 * - Quick action dropdown
 * - Warning states for 0 balance
 */
export function WalletBalanceDisplay({
  className,
  onDepositClick,
  onWithdrawClick,
  onConnectWalletClick,
  showDropdown = true,
  variant = "compact",
}: WalletBalanceDisplayProps) {
  const {
    tradeMode,
    fundingSource,
    virtualSolBalance,
    realSolBalance,
    walletSolBalance,
    activeBalance,
  } = useTradingMode();

  const { publicKey, disconnect, connected } = useWallet();
  
  // Modal states
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  const isPaperMode = tradeMode === 'PAPER';
  const isDepositedFunding = fundingSource === 'DEPOSITED';
  const hasZeroBalance = activeBalance === 0;
  const isWalletConnected = connected && publicKey;

  // Format wallet address
  const walletAddress = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : null;

  // Determine display state
  const getDisplayConfig = () => {
    if (isPaperMode) {
      return {
        icon: Sparkles,
        label: 'Virtual',
        balance: virtualSolBalance,
        color: 'luigi-green',
        badge: 'PRACTICE',
      };
    }

    if (isDepositedFunding) {
      return {
        icon: Wallet,
        label: 'Deposited',
        balance: realSolBalance,
        color: hasZeroBalance ? 'mario-red' : 'star-yellow',
        badge: hasZeroBalance ? 'FUND' : 'LIVE',
      };
    }

    if (isWalletConnected) {
      return {
        icon: Wallet,
        label: walletAddress || 'Wallet',
        balance: walletSolBalance || 0,
        color: hasZeroBalance ? 'mario-red' : 'coin-yellow',
        badge: 'WALLET',
      };
    }

    return {
      icon: AlertTriangle,
      label: 'Connect',
      balance: 0,
      color: 'mario-red',
      badge: 'SETUP',
    };
  };

  const config = getDisplayConfig();
  const Icon = config.icon;

  // Balance display component
  const BalanceButton = () => (
    <motion.div
      whileHover={{ y: -1 }}
      className={cn(
        "h-9 px-2.5 rounded-md flex items-center gap-2 tabular-nums cursor-pointer",
        variant === "minimal"
          ? [
              // Minimal: thin border, no big shadows, neutral background
              "border border-[var(--color-border)] bg-white text-foreground/90 shadow-none",
              // Subtle hover
              "hover:bg-[color-mix(in_oklab,white,black_3%)] transition-colors"
            ]
          : [
              // keep your current colorful card look for non-header uses
              "border-2 text-sm font-semibold",
              config.color === "luigi-green" && "bg-luigi-green-50 border-luigi-green-500 text-luigi-green-700",
              config.color === "star-yellow" && "bg-star-yellow-50 border-star-yellow-500 text-star-yellow-900",
              config.color === "coin-yellow" && "bg-coin-yellow-50 border-coin-yellow-500 text-coin-yellow-900",
              config.color === "mario-red" && "bg-mario-red-50 border-mario-red-500 text-mario-red-700",
            ],
        className
      )}
    >
      {/* left: tiny icon + label */}
      <div className="flex items-center gap-1.5 min-w-0">
        <Icon className="w-4 h-4 opacity-80" />
        <span className="text-[11px] leading-none truncate opacity-80">
          {config.label}
        </span>
      </div>

      {/* middle: strong number */}
      <div className="flex items-baseline gap-1 ml-1">
        <AnimatedNumber value={config.balance} decimals={2} className="text-sm font-bold leading-none" />
        <span className="text-[11px] leading-none opacity-70">SOL</span>
      </div>

      {/* right: micro badge */}
      <span className="ml-1 text-[10px] leading-none px-1 py-[2px] rounded border uppercase tracking-wide opacity-80">
        {config.badge}
      </span>

      {/* Warning indicator for 0 balance */}
      <AnimatePresence>
        {hasZeroBalance && !isPaperMode && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          >
            <AlertTriangle className="w-3 h-3 text-mario-red-600" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  if (!showDropdown) {
    return <BalanceButton />;
  }

  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div>
          <BalanceButton />
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64 border-3 border-pipe-400 shadow-mario">
        {/* Header */}
        <DropdownMenuLabel className="font-mario text-xs">
          Account Balance
        </DropdownMenuLabel>

        {/* Balance details */}
        <div className="px-2 py-3 space-y-2 text-xs">
          {/* Virtual balance */}
          <div className="flex items-center justify-between p-2 bg-luigi-green-50 rounded border border-luigi-green-200">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-luigi-green-600" />
              <span className="text-pipe-700">Virtual (Paper)</span>
            </div>
            <span className="font-mono font-semibold text-luigi-green-700">
              {formatNumber(virtualSolBalance, 2)} SOL
            </span>
          </div>

          {/* Deposited balance */}
          <div className={cn(
            "flex items-center justify-between p-2 rounded border",
            realSolBalance > 0 ? "bg-star-yellow-50 border-star-yellow-200" : "bg-pipe-50 border-pipe-200"
          )}>
            <div className="flex items-center gap-2">
              <Wallet className={cn("w-4 h-4", realSolBalance > 0 ? "text-star-yellow-700" : "text-pipe-500")} />
              <span className="text-pipe-700">Deposited (Live)</span>
            </div>
            <span className={cn(
              "font-mono font-semibold",
              realSolBalance > 0 ? "text-star-yellow-800" : "text-pipe-600"
            )}>
              {formatNumber(realSolBalance, 2)} SOL
            </span>
          </div>

          {/* Wallet balance (if connected) */}
          {isWalletConnected && (
            <div className="flex items-center justify-between p-2 bg-coin-yellow-50 rounded border border-coin-yellow-200">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-coin-yellow-700" />
                <span className="text-pipe-700 text-[10px]">
                  {walletAddress}
                </span>
              </div>
              <span className="font-mono font-semibold text-coin-yellow-800">
                {formatNumber(walletSolBalance || 0, 2)} SOL
              </span>
            </div>
          )}
        </div>

        <DropdownMenuSeparator />

        {/* Quick actions */}
        {!isPaperMode && (
          <>
            <DropdownMenuItem
              onClick={() => {
                setShowDepositModal(true);
                onDepositClick?.();
              }}
              className="cursor-pointer"
            >
              <ArrowDownToLine className="mr-2 h-4 w-4 text-luigi-green-600" />
              Deposit SOL
            </DropdownMenuItem>

            {realSolBalance > 0 && (
              <DropdownMenuItem
                onClick={() => {
                  setShowWithdrawModal(true);
                  onWithdrawClick?.();
                }}
                className="cursor-pointer"
              >
                <ArrowUpFromLine className="mr-2 h-4 w-4 text-mario-red-600" />
                Withdraw SOL
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />
          </>
        )}

        {/* Wallet actions */}
        {isWalletConnected ? (
          <>
            <DropdownMenuItem
              onClick={() => {
                const address = publicKey?.toBase58();
                if (address) {
                  window.open(`https://solscan.io/account/${address}`, '_blank');
                }
              }}
              className="cursor-pointer"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              View on Solscan
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => disconnect()}
              className="cursor-pointer text-mario-red-600"
            >
              <Power className="mr-2 h-4 w-4" />
              Disconnect Wallet
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem
            onClick={onConnectWalletClick}
            className="cursor-pointer"
          >
            <Wallet className="mr-2 h-4 w-4 text-luigi-green-600" />
            Connect Wallet
          </DropdownMenuItem>
        )}

        {/* Current mode indicator */}
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-[10px] text-pipe-500">
          <div className="flex items-center justify-between">
            <span>Active Mode:</span>
            <span className={cn(
              "font-bold",
              isPaperMode ? "text-luigi-green-600" : "text-mario-red-600"
            )}>
              {isPaperMode ? 'PAPER' : 'LIVE'} • {formatNumber(activeBalance, 2)} SOL
            </span>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>

      {/* Modals */}
      <DepositModal open={showDepositModal} onOpenChange={setShowDepositModal} />
      <WithdrawModal open={showWithdrawModal} onOpenChange={setShowWithdrawModal} />
    </>
  );
}
