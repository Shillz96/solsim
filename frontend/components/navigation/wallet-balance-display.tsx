'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, ArrowDownToLine, ArrowUpFromLine, ExternalLink, Power, AlertTriangle, Sparkles } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useTradingMode } from '@/lib/trading-mode-context';
import { Button } from '@/components/ui/button';
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
      whileHover={{ scale: 1.02 }}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-300',
        'border-2 text-sm font-semibold cursor-pointer',
        config.color === 'luigi-green' && 'bg-luigi-green-50 border-luigi-green-500 text-luigi-green-700',
        config.color === 'star-yellow' && 'bg-star-yellow-50 border-star-yellow-500 text-star-yellow-900',
        config.color === 'coin-yellow' && 'bg-coin-yellow-50 border-coin-yellow-500 text-coin-yellow-900',
        config.color === 'mario-red' && 'bg-mario-red-50 border-mario-red-500 text-mario-red-700',
        hasZeroBalance && !isPaperMode && 'animate-pulse',
        className
      )}
    >
      {/* Icon */}
      <Icon className="w-4 h-4" />

      {/* Balance */}
      <div className="flex flex-col items-start">
        <span className="text-[10px] leading-none opacity-80">
          {config.label}
        </span>
        <div className="flex items-center gap-1">
          <AnimatedNumber
            value={config.balance}
            decimals={2}
            className="font-mono text-xs leading-none font-bold"
          />
          <span className="text-[10px] leading-none">SOL</span>
        </div>
      </div>

      {/* Badge */}
      <div className={cn(
        "text-[8px] px-1.5 py-0.5 rounded font-bold border",
        config.color === 'luigi-green' && 'bg-luigi-green-500 text-white border-luigi-green-700',
        config.color === 'star-yellow' && 'bg-star-yellow-500 text-star-yellow-900 border-star-yellow-700',
        config.color === 'coin-yellow' && 'bg-coin-yellow-500 text-coin-yellow-900 border-coin-yellow-700',
        config.color === 'mario-red' && 'bg-mario-red-500 text-white border-mario-red-700',
      )}>
        {config.badge}
      </div>

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
              onClick={onDepositClick}
              className="cursor-pointer"
            >
              <ArrowDownToLine className="mr-2 h-4 w-4 text-luigi-green-600" />
              Deposit SOL
            </DropdownMenuItem>

            {realSolBalance > 0 && (
              <DropdownMenuItem
                onClick={onWithdrawClick}
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
  );
}
