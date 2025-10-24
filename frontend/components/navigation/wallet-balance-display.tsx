'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, ArrowDownToLine, ArrowUpFromLine, ExternalLink, Power, AlertTriangle, Sparkles, KeyRound } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useTradingMode } from '@/lib/trading-mode-context';
import { Button } from '@/components/ui/button';
import { DepositModal } from '@/components/modals/deposit-modal';
import { WithdrawModal } from '@/components/modals/withdraw-modal';
import { ExportPrivateKeyModal } from '@/components/modals/export-private-key-modal';
import { useAuth } from '@/hooks/use-auth';
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
  variant?: "compact" | "minimal" | "mario";
  badgeText?: string;
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
  badgeText,
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
  const { user } = useAuth();
  
  // Modal state - single state to prevent race conditions
  const [activeModal, setActiveModal] = useState<'deposit' | 'withdraw' | 'export' | null>(null);

  // Sync wallet connection state to prevent stale data
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  useEffect(() => {
    setIsWalletConnected(connected && !!publicKey);
  }, [connected, publicKey]);

  const isPaperMode = tradeMode === 'PAPER';
  const isDepositedFunding = fundingSource === 'DEPOSITED';
  const isLoadingBalance = activeBalance === undefined || activeBalance === null;
  const hasZeroBalance = activeBalance === 0 && !isLoadingBalance;

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
        balance: isLoadingBalance ? 0 : virtualSolBalance,
        color: 'luigi-green',
        badge: 'PRACTICE',
        isLoading: isLoadingBalance,
      };
    }

    if (isDepositedFunding) {
      return {
        icon: Wallet,
        label: 'Deposited',
        balance: isLoadingBalance ? 0 : realSolBalance,
        color: hasZeroBalance ? 'mario-red' : 'star-yellow',
        badge: hasZeroBalance ? 'FUND' : 'LIVE',
        isLoading: isLoadingBalance,
      };
    }

    if (isWalletConnected) {
      return {
        icon: Wallet,
        label: walletAddress || 'Wallet',
        balance: isLoadingBalance ? 0 : (walletSolBalance || 0),
        color: hasZeroBalance ? 'mario-red' : 'coin-yellow',
        badge: 'WALLET',
        isLoading: isLoadingBalance,
      };
    }

    return {
      icon: AlertTriangle,
      label: 'Connect',
      balance: 0,
      color: 'mario-red',
      badge: 'SETUP',
      isLoading: false,
    };
  };

  const config = getDisplayConfig();
  const Icon = config.icon;

  // Mario cartridge variant - big yellow slab with chunky black outline
  if (variant === "mario") {
    const isPractice = isPaperMode;
    const smallLabel = isPractice ? "Virtual SOL" : "Live SOL";
    const badge = badgeText ?? (isPractice ? "P" : "L");

    return (
      <button
        type="button"
        onClick={() => showDropdown && setActiveModal('deposit')}
        aria-label="Balance"
        className={cn(
          // container
          "group relative h-9 md:h-11 min-w-[140px] md:min-w-[180px]",
          "px-2.5 md:px-3.5 rounded-[10px] md:rounded-[14px]",
          "bg-[var(--star-yellow)]",
          "border-3 md:border-4 border-[var(--outline-black)]",
          "shadow-[3px_3px_0_var(--outline-black)] md:shadow-[4px_4px_0_var(--outline-black)]",
          "flex items-center gap-2 md:gap-4",
          "transition-all duration-150",
          "hover:-translate-y-[1px] hover:bg-[var(--star-yellow)]/90",
          "hover:shadow-[4px_4px_0_var(--outline-black)] md:hover:shadow-[6px_6px_0_var(--outline-black)]",
          "active:translate-y-0 active:shadow-[2px_2px_0_var(--outline-black)] md:active:shadow-[3px_3px_0_var(--outline-black)]",
          className
        )}
      >
        {/* Amount + small label */}
        <div className="flex flex-col leading-none -space-y-[1px] md:-space-y-[2px]">
          <span className="tabular-nums font-extrabold text-[13px] md:text-[17px] tracking-tight text-[var(--outline-black)]">
            {Number(activeBalance ?? 0).toFixed(2)}
          </span>
          <span className="text-[9px] md:text-[11px] font-black uppercase text-foreground/80 truncate max-w-[80px] md:max-w-none">
            {smallLabel}
          </span>
        </div>

        {/* Red square badge on the right */}
        <div
          className={cn(
            "ml-auto grid place-items-center flex-shrink-0",
            "h-6 w-6 md:h-8 md:w-8",
            "rounded-[8px] md:rounded-[12px]",
            "bg-[var(--mario-red)] text-white",
            "border-3 md:border-4 border-[var(--outline-black)]"
          )}
        >
          <span className="font-extrabold text-[10px] md:text-[12px] leading-none">
            {badge}
          </span>
        </div>
      </button>
    );
  }

  // Balance display component
  const BalanceButton = () => (
    <motion.div
      whileHover={{ y: -1 }}
      className={cn(
        "h-8 md:h-9 px-2 md:px-2.5 rounded-md flex items-center gap-1.5 md:gap-2 tabular-nums cursor-pointer",
        variant === "minimal"
          ? [
              // Minimal: thin border, no big shadows, neutral background
              "border border-[var(--color-border)] bg-white text-foreground/90 shadow-none",
              // Subtle hover
              "hover:bg-[color-mix(in_oklab,white,black_3%)] transition-colors"
            ]
          : [
              // keep your current colorful card look for non-header uses
              "border-2 text-xs md:text-sm font-semibold",
              config.color === "luigi-green" && "bg-luigi-green-50 border-luigi-green-500 text-luigi-green-700",
              config.color === "star-yellow" && "bg-star-yellow-50 border-star-yellow-500 text-star-yellow-900",
              config.color === "coin-yellow" && "bg-coin-yellow-50 border-coin-yellow-500 text-coin-yellow-900",
              config.color === "mario-red" && "bg-mario-red-50 border-mario-red-500 text-mario-red-700",
            ],
        className
      )}
    >
      {/* left: tiny icon + label */}
      <div className="flex items-center gap-1 md:gap-1.5 min-w-0">
        <Icon className="w-3.5 md:w-4 h-3.5 md:h-4 opacity-80 flex-shrink-0" />
        <span className="text-[10px] md:text-[11px] leading-none truncate opacity-80 max-w-[60px] md:max-w-none">
          {config.label}
        </span>
      </div>

      {/* middle: strong number */}
      <div className="flex items-baseline gap-0.5 md:gap-1 ml-0.5 md:ml-1">
        {config.isLoading ? (
          <span className="text-xs md:text-sm font-bold leading-none opacity-50">--</span>
        ) : (
          <AnimatedNumber value={config.balance} decimals={2} className="text-xs md:text-sm font-bold leading-none" />
        )}
        <span className="text-[10px] md:text-[11px] leading-none opacity-70">SOL</span>
      </div>

      {/* right: micro badge */}
      <span className="ml-0.5 md:ml-1 text-[9px] md:text-[10px] leading-none px-1 py-[2px] rounded border uppercase tracking-wide opacity-80">
        {config.badge}
      </span>

      {/* Badge serves as the warning indicator */}
    </motion.div>
  );

  if (!showDropdown) {
    return <BalanceButton />;
  }

  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div role="button" aria-haspopup="menu">
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
                setActiveModal('deposit');
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
                  setActiveModal('withdraw');
                  onWithdrawClick?.();
                }}
                className="cursor-pointer"
              >
                <ArrowUpFromLine className="mr-2 h-4 w-4 text-mario-red-600" />
                Withdraw SOL
              </DropdownMenuItem>
            )}

            {realSolBalance > 0 && (
              <DropdownMenuItem
                onClick={() => setActiveModal('export')}
                className="cursor-pointer"
              >
                <KeyRound className="mr-2 h-4 w-4 text-pipe-600" />
                Export Private Key
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
      <DepositModal
        open={activeModal === 'deposit'}
        onOpenChange={(open) => setActiveModal(open ? 'deposit' : null)}
      />
      <WithdrawModal
        open={activeModal === 'withdraw'}
        onOpenChange={(open) => setActiveModal(open ? 'withdraw' : null)}
      />
      {user && (
        <ExportPrivateKeyModal
          open={activeModal === 'export'}
          onOpenChange={(open) => setActiveModal(open ? 'export' : null)}
          userId={user.id}
          balance={realSolBalance.toString()}
        />
      )}
    </>
  );
}
