'use client';

import { motion } from 'framer-motion';
import { Wallet, Sparkles, ArrowDownToLine, AlertCircle } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useTradingMode, type FundingSource } from '@/lib/trading-mode-context';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/utils';

interface FundingSourceSelectorProps {
  className?: string;
  onDepositClick?: () => void;
  onConnectWalletClick?: () => void;
}

/**
 * Funding Source Selector for Real Trading
 *
 * Displays when in REAL trading mode.
 * Allows user to choose between:
 * - Deposited Balance (1% fee)
 * - Connected Wallet (0.5% fee)
 *
 * Features:
 * - Segmented control style
 * - Shows balance for each source
 * - Disabled states when not available
 * - Quick actions to fund/connect
 */
export function FundingSourceSelector({
  className,
  onDepositClick,
  onConnectWalletClick,
}: FundingSourceSelectorProps) {
  const {
    fundingSource,
    setFundingSource,
    realSolBalance,
    walletSolBalance,
    tradeMode,
  } = useTradingMode();

  const { connected, publicKey } = useWallet();

  const isPaperMode = tradeMode === 'PAPER';
  const walletAddress = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : null;

  // Don't show in paper mode
  if (isPaperMode) {
    return null;
  }

  const handleSelectSource = (source: FundingSource) => {
    // Can't select wallet if not connected
    // Note: WALLET type currently not in FundingSource union (paper mode only)
    // if (source === 'WALLET' && !connected) {
    //   return;
    // }

    setFundingSource(source);
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Label */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-pipe-900">
          Funding Source
        </label>
        <span className="text-xs text-pipe-600">
          {fundingSource === 'DEPOSITED' ? '1% fee' : '0.5% fee'}
        </span>
      </div>

      {/* Segmented Control */}
      <div className="grid grid-cols-2 gap-3">
        {/* Deposited Option */}
        <motion.button
          whileHover={{ scale: connected && fundingSource !== 'DEPOSITED' ? 1.02 : 1, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleSelectSource('DEPOSITED')}
          className={cn(
            'relative p-4 rounded-xl border-4 transition-all duration-300',
            'flex flex-col items-start gap-2',
            fundingSource === 'DEPOSITED'
              ? 'bg-star-yellow-500 border-star-yellow-700 shadow-[6px_6px_0_0_rgba(0,0,0,1)]'
              : 'bg-card border-pipe-900 hover:border-star-yellow-400 shadow-[4px_4px_0_0_rgba(0,0,0,1)]'
          )}
        >
          {/* Icon & Title */}
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-8 h-8 rounded flex items-center justify-center",
              fundingSource === 'DEPOSITED'
                ? "bg-card"
                : "bg-star-yellow-100"
            )}>
              <Sparkles className={cn(
                "w-4 h-4",
                fundingSource === 'DEPOSITED'
                  ? "text-star-yellow-700"
                  : "text-star-yellow-600"
              )} />
            </div>
            <div className="flex flex-col items-start">
              <span className={cn(
                "text-xs font-bold",
                fundingSource === 'DEPOSITED'
                  ? "text-pipe-900"
                  : "text-pipe-700"
              )}>
                Deposited
              </span>
              <span className={cn(
                "text-[10px]",
                fundingSource === 'DEPOSITED'
                  ? "text-pipe-800"
                  : "text-pipe-600"
              )}>
                1% fee
              </span>
            </div>
          </div>

          {/* Balance */}
          <div className={cn(
            "font-mono text-sm font-semibold",
            fundingSource === 'DEPOSITED'
              ? "text-pipe-900"
              : "text-pipe-700"
          )}>
            {formatNumber(realSolBalance, 2)} SOL
          </div>

          {/* Selected indicator */}
          {fundingSource === 'DEPOSITED' && (
            <div className="absolute top-2 right-2 w-2 h-2 bg-luigi-green-500 rounded-full border-2 border-white" />
          )}

          {/* Empty state CTA */}
          {realSolBalance === 0 && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onDepositClick?.();
              }}
              size="sm"
              variant="outline"
              className="w-full mt-1 text-xs border-2 border-pipe-400"
            >
              <ArrowDownToLine className="mr-1 h-3 w-3" />
              Deposit
            </Button>
          )}
        </motion.button>

        {/* Wallet Option */}
        <motion.button
          whileHover={{ scale: connected && fundingSource !== 'WALLET' ? 1.02 : 1, y: -2 }}
          whileTap={{ scale: connected ? 0.98 : 1 }}
          onClick={() => handleSelectSource('WALLET')}
          disabled={!connected}
          className={cn(
            'relative p-4 rounded-xl border-4 transition-all duration-300',
            'flex flex-col items-start gap-2',
            !connected && 'opacity-50 cursor-not-allowed',
            fundingSource === 'WALLET' && connected
              ? 'bg-coin-yellow-500 border-coin-yellow-700 shadow-[6px_6px_0_0_rgba(0,0,0,1)]'
              : 'bg-card border-pipe-900 hover:border-coin-yellow-400 shadow-[4px_4px_0_0_rgba(0,0,0,1)]'
          )}
        >
          {/* Icon & Title */}
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-8 h-8 rounded flex items-center justify-center",
              fundingSource === 'WALLET' && connected
                ? "bg-card"
                : "bg-coin-yellow-100"
            )}>
              <Wallet className={cn(
                "w-4 h-4",
                fundingSource === 'WALLET' && connected
                  ? "text-coin-yellow-700"
                  : "text-coin-yellow-600"
              )} />
            </div>
            <div className="flex flex-col items-start">
              <span className={cn(
                "text-xs font-bold",
                fundingSource === 'WALLET' && connected
                  ? "text-pipe-900"
                  : "text-pipe-700"
              )}>
                Wallet
              </span>
              <span className={cn(
                "text-[10px]",
                fundingSource === 'WALLET' && connected
                  ? "text-pipe-800"
                  : "text-pipe-600"
              )}>
                0.5% fee
              </span>
            </div>
          </div>

          {/* Balance or Address */}
          {connected ? (
            <>
              <div className={cn(
                "font-mono text-sm font-semibold",
                fundingSource === 'WALLET'
                  ? "text-pipe-900"
                  : "text-pipe-700"
              )}>
                {formatNumber(walletSolBalance || 0, 2)} SOL
              </div>
              <div className={cn(
                "text-[10px] font-mono",
                fundingSource === 'WALLET'
                  ? "text-pipe-800"
                  : "text-pipe-600"
              )}>
                {walletAddress}
              </div>
            </>
          ) : (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onConnectWalletClick?.();
              }}
              size="sm"
              variant="outline"
              className="w-full mt-1 text-xs border-2 border-pipe-400"
            >
              <Wallet className="mr-1 h-3 w-3" />
              Connect
            </Button>
          )}

          {/* Selected indicator */}
          {fundingSource === 'WALLET' && connected && (
            <div className="absolute top-2 right-2 w-2 h-2 bg-luigi-green-500 rounded-full border-2 border-white" />
          )}
        </motion.button>
      </div>

      {/* Info/Warning Messages */}
      {fundingSource === 'DEPOSITED' && realSolBalance === 0 && (
        <Alert className="border-2 border-star-yellow-500 bg-star-yellow-50">
          <AlertCircle className="h-4 w-4 text-star-yellow-700" />
          <AlertDescription className="text-xs text-star-yellow-900">
            No deposited balance. Click <strong>Deposit</strong> to fund your account or switch to wallet trading.
          </AlertDescription>
        </Alert>
      )}

      {fundingSource === 'WALLET' && !connected && (
        <Alert className="border-2 border-coin-yellow-500 bg-coin-yellow-50">
          <AlertCircle className="h-4 w-4 text-coin-yellow-700" />
          <AlertDescription className="text-xs text-coin-yellow-900">
            No wallet connected. Click <strong>Connect</strong> to trade from your wallet (lower fees: 0.5%).
          </AlertDescription>
        </Alert>
      )}

      {fundingSource === 'WALLET' && connected && (walletSolBalance || 0) === 0 && (
        <Alert className="border-2 border-mario-red-500 bg-mario-red-50">
          <AlertCircle className="h-4 w-4 text-mario-red-700" />
          <AlertDescription className="text-xs text-mario-red-900">
            Your wallet has 0 SOL. Please fund your wallet to trade.
          </AlertDescription>
        </Alert>
      )}

      {/* Comparison hint */}
      <div className="flex items-center justify-between text-[10px] text-pipe-600 px-1">
        <span>Deposited: Easier, 1% fee</span>
        <span className="text-pipe-400">•</span>
        <span>Wallet: Lower fee (0.5%), approve each trade</span>
      </div>
    </div>
  );
}
