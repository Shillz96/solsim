"use client"

/**
 * PnL Card Component (Production Ready - Refactored)
 *
 * Key improvements:
 * - All USD values include SOL equivalents
 * - Proper colorization (green-400/red-400) for P&L
 * - Guards against Infinity%, NaN, undefined
 * - Animated gradient background based on P&L direction
 * - Enhanced empty state with call-to-action
 * - Share P&L dialog integration
 * - Loading state with skeleton
 * - Data validation diagnostics
 * - Compact 2-column responsive layout
 */

import dynamic from "next/dynamic"
import { EnhancedCard } from "@/components/ui/enhanced-card-system"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Activity,
  AlertCircle,
  RefreshCw,
  Share2,
  Sparkles,
  Target,
  Award,
  DollarSign
} from "lucide-react"
import { motion } from "framer-motion"
import { memo, useState, useCallback } from "react"

// Dynamic import for SharePnLDialog to reduce initial bundle size
const SharePnLDialog = dynamic(() => import("@/components/modals/share-pnl-dialog").then(mod => ({ default: mod.SharePnLDialog })), {
  ssr: false
})
import { useAuth } from "@/hooks/use-auth"
import { useRealtimePortfolio } from "@/hooks/use-realtime-portfolio"
import { useQuery } from "@tanstack/react-query"
import * as Backend from "@/lib/types/backend"
import * as api from "@/lib/api"
import { formatUSD, safePercent } from "@/lib/format"
import { UsdWithSol } from "@/lib/sol-equivalent"
import { CurrencyValue, PnLDisplay } from "@/components/shared/currency-display"
import { cn, marioStyles } from "@/lib/utils"

/**
 * Animated gradient background based on P&L performance
 */
const AnimatedBackground = memo(({ isPositive }: { isPositive: boolean }) => {
  return (
    <motion.div
      className="absolute inset-0 opacity-10"
      animate={{
        background: isPositive
          ? [
              "radial-gradient(circle at 0% 0%, rgb(67, 176, 71) 0%, transparent 50%)",
              "radial-gradient(circle at 100% 0%, rgb(67, 176, 71) 0%, transparent 50%)",
              "radial-gradient(circle at 100% 100%, rgb(67, 176, 71) 0%, transparent 50%)",
              "radial-gradient(circle at 0% 100%, rgb(67, 176, 71) 0%, transparent 50%)",
              "radial-gradient(circle at 0% 0%, rgb(67, 176, 71) 0%, transparent 50%)",
            ]
          : [
              "radial-gradient(circle at 0% 0%, rgb(229, 37, 33) 0%, transparent 50%)",
              "radial-gradient(circle at 100% 0%, rgb(229, 37, 33) 0%, transparent 50%)",
              "radial-gradient(circle at 100% 100%, rgb(229, 37, 33) 0%, transparent 50%)",
              "radial-gradient(circle at 0% 100%, rgb(229, 37, 33) 0%, transparent 50%)",
              "radial-gradient(circle at 0% 0%, rgb(229, 37, 33) 0%, transparent 50%)",
            ],
      }}
      transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
    />
  )
})

AnimatedBackground.displayName = "AnimatedBackground"

/**
 * Empty state when no P&L data exists
 */
function EmptyPnLState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="relative mb-4">
        <div className={cn(
          marioStyles.vitalsIcon('var(--star-yellow)', 'md'),
          'bg-gradient-to-br from-[var(--star-yellow)] to-[var(--coin-gold)]'
        )}>
          <Activity className="w-8 h-8 text-white" />
        </div>
        <Sparkles className="w-4 h-4 text-star absolute -top-1 -right-1 animate-pulse" />
      </div>
      
      <h3 className="text-lg font-mario font-bold mb-2">No Trading Activity Yet</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4 font-bold">
        Start trading to see your profit & loss performance here.
      </p>
      
      <button 
        onClick={() => window.location.href = '/warp-pipes'}
        className="gap-2 h-10 px-6 rounded-[14px] border-3 border-outline bg-luigi text-white hover:bg-luigi/90 shadow-[3px_3px_0_var(--outline-black)] hover:shadow-[4px_4px_0_var(--outline-black)] hover:-translate-y-0.5 transition-all flex items-center font-mario"
      >
        <TrendingUp className="w-4 h-4" />
        Start Trading
      </button>
    </div>
  );
}

/**
 * Loading skeleton for P&L card
 */
function PnLLoadingSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="h-6 bg-muted rounded w-32 animate-pulse" />
        <div className="flex gap-2">
          <div className="h-9 w-9 bg-muted rounded animate-pulse" />
          <div className="h-9 w-20 bg-muted rounded animate-pulse" />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 bg-muted rounded w-24 animate-pulse" />
            <div className="h-8 bg-muted rounded w-32 animate-pulse" />
            <div className="h-3 bg-muted rounded w-20 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Stat item component for P&L metrics
 */
interface StatItemProps {
  label: string;
  value: number;
  showSolEquiv?: boolean;
  color?: 'default' | 'positive' | 'negative';
  percentage?: string;
  icon?: React.ReactNode;
}

function StatItem({ 
  label, 
  value, 
  showSolEquiv = true, 
  color = 'default',
  percentage,
  icon 
}: StatItemProps) {
  const colorStyles = {
    default: 'text-foreground',
    positive: 'text-green-400',
    negative: 'text-red-400'
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
      
      {/* Use new CurrencyValue component - never mix glyphs */}
      <CurrencyValue
        usd={value}
        primary="USD"
        showSecondary={showSolEquiv}
        primaryClassName={cn("text-2xl font-bold", colorStyles[color])}
        secondaryClassName="text-xs text-muted-foreground"
      />
      
      {percentage && (
        <p className={cn("text-xs", colorStyles[color])}>
          {percentage}
        </p>
      )}
    </div>
  );
}

export function PnLCard() {
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const { user, isAuthenticated } = useAuth();

  // Use real-time portfolio hook with WebSocket prices
  const {
    data: portfolio,
    isLoading,
    error,
    refetch,
    isRefetching,
    isLiveUpdating
  } = useRealtimePortfolio();

  // Fetch user profile for share dialog
  const { data: userProfile } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      return api.getUserProfile(user.id);
    },
    enabled: !!user?.id,
    staleTime: 30000, // 30 seconds - fresher data for avatar updates
    refetchOnMount: 'always', // Always refetch when component mounts
  });

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleShare = useCallback(() => {
    setShareDialogOpen(true);
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl border-4 border-outline shadow-[6px_6px_0_var(--outline-black)] relative overflow-hidden">
        <PnLLoadingSkeleton />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-card rounded-2xl border-4 border-outline shadow-[6px_6px_0_var(--outline-black)] relative overflow-hidden">
        <div className="p-6">
          <Alert variant="destructive" className="border-3 border-mario shadow-[3px_3px_0_var(--outline-black)]">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span className="font-bold">
                Failed to load P&L data: {error instanceof Error ? error.message : 'Unknown error'}
              </span>
              <button 
                onClick={handleRefresh}
                className="h-8 px-3 rounded-[14px] border-3 border-outline bg-card hover:bg-muted shadow-[2px_2px_0_var(--outline-black)] hover:shadow-[3px_3px_0_var(--outline-black)] hover:-translate-y-0.5 transition-all font-mario text-sm"
              >
                Retry
              </button>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // Empty state
  if (!portfolio || !portfolio.positions || portfolio.positions.length === 0) {
    return (
      <div className="bg-card rounded-2xl border-4 border-outline shadow-[6px_6px_0_var(--outline-black)] relative overflow-hidden">
        <EmptyPnLState />
      </div>
    );
  }

  // Calculate metrics with guards
  const totalValue = parseFloat(portfolio.totals.totalValueUsd) || 0;
  const totalPnL = parseFloat(portfolio.totals.totalPnlUsd) || 0;
  const realizedPnL = parseFloat(portfolio.totals.totalRealizedUsd) || 0;
  const unrealizedPnL = parseFloat(portfolio.totals.totalUnrealizedUsd) || 0;
  const winRate = parseFloat(portfolio.totals.winRate) || 0;
  const totalTrades = portfolio.totals.totalTrades || 0;
  
  const costBasis = totalValue - totalPnL;
  const totalPnLPercent = safePercent(totalPnL, costBasis);
  const realizedPnLPercent = safePercent(realizedPnL, costBasis);
  const unrealizedPnLPercent = safePercent(unrealizedPnL, costBasis);

  const isPositive = totalPnL >= 0;
  const PnLIcon = isPositive ? TrendingUp : TrendingDown;
  const pnlColor = isPositive ? 'positive' : 'negative';

  return (
    <>
      <div className="bg-card rounded-2xl border-4 border-outline shadow-[6px_6px_0_var(--outline-black)] relative overflow-hidden">
        {/* Animated Background */}
        <AnimatedBackground isPositive={isPositive} />

        <div className="relative p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-[14px] border-3 border-outline shadow-[2px_2px_0_var(--outline-black)]",
                isPositive ? "bg-luigi" : "bg-mario"
              )}>
                <PnLIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-mario font-bold">Profit & Loss</h3>
                  {isLiveUpdating && (
                    <Badge variant="outline" className="gap-1 text-[10px] px-1.5 py-0 h-5 border-luigi text-luigi bg-luigi/5">
                      <div className="w-1.5 h-1.5 rounded-full bg-luigi animate-pulse" />
                      LIVE
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground font-bold">
                  {totalTrades} trade{totalTrades !== 1 ? 's' : ''} • {winRate.toFixed(1)}% win rate
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleRefresh}
                disabled={isRefetching}
                className="shrink-0 h-9 w-9 rounded-[14px] border-3 border-outline bg-card hover:bg-muted shadow-[2px_2px_0_var(--outline-black)] hover:shadow-[3px_3px_0_var(--outline-black)] hover:-translate-y-0.5 transition-all flex items-center justify-center"
              >
                <RefreshCw className={cn(
                  "h-4 w-4",
                  isRefetching && "animate-spin"
                )} />
              </button>
              
              <button
                onClick={handleShare}
                className="gap-2 h-9 px-4 rounded-[14px] border-3 border-outline bg-card hover:bg-muted shadow-[2px_2px_0_var(--outline-black)] hover:shadow-[3px_3px_0_var(--outline-black)] hover:-translate-y-0.5 transition-all flex items-center font-mario text-sm"
              >
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline">Share</span>
              </button>
            </div>
          </div>

          {/* Main P&L Display - Featured */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className={cn(
              marioStyles.card(false),
              'p-6',
              isPositive 
                ? "bg-luigi/10" 
                : "bg-mario/10"
            )}
          >
            <StatItem
              label="Total P&L"
              value={totalPnL}
              showSolEquiv={true}
              color={pnlColor}
              percentage={totalPnLPercent}
              icon={<Award className={cn(
                "h-4 w-4",
                isPositive ? "text-green-400" : "text-red-400"
              )} />}
            />
          </motion.div>

          {/* Detailed Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-outline">
            <StatItem
              label="Realized P&L"
              value={realizedPnL}
              showSolEquiv={true}
              color={realizedPnL >= 0 ? 'positive' : 'negative'}
              percentage={realizedPnLPercent}
              icon={<Target className="h-4 w-4 text-muted-foreground" />}
            />

            <StatItem
              label="Unrealized P&L"
              value={unrealizedPnL}
              showSolEquiv={true}
              color={unrealizedPnL >= 0 ? 'positive' : 'negative'}
              percentage={unrealizedPnLPercent}
              icon={<Activity className="h-4 w-4 text-muted-foreground" />}
            />

            <StatItem
              label="Portfolio Value"
              value={totalValue}
              showSolEquiv={true}
              color="default"
              icon={<Wallet className="h-4 w-4 text-muted-foreground" />}
            />

            <StatItem
              label="Cost Basis"
              value={costBasis}
              showSolEquiv={true}
              color="default"
              icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
            />
          </div>

          {/* Performance Badge */}
          {totalTrades >= 5 && (
            <div className="flex items-center gap-2 pt-4 border-t border-outline">
              <Badge 
                variant={winRate >= 50 ? "default" : "secondary"}
                className="gap-1 border-2 border-outline shadow-[2px_2px_0_var(--outline-black)] font-mario"
              >
                <Award className="h-3 w-3" />
                {winRate >= 70 ? "Outstanding" : winRate >= 50 ? "Profitable" : "Building Experience"}
              </Badge>
              <span className="text-xs text-muted-foreground font-bold">
                {winRate.toFixed(1)}% success rate across {totalTrades} trades
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Share Dialog */}
      <SharePnLDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        totalPnL={totalPnL}
        totalPnLPercent={parseFloat(totalPnLPercent.replace(/[^0-9.-]/g, '')) || 0}
        currentValue={totalValue}
        initialBalance={costBasis}
        userHandle={(userProfile as any)?.handle || (userProfile as any)?.displayName || undefined}
        userAvatarUrl={(userProfile as any)?.avatarUrl || undefined}
        userEmail={(userProfile as any)?.email || user?.email || undefined}
      />
    </>
  );
}
