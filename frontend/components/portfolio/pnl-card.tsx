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
import { SharePnLDialog } from "@/components/modals/share-pnl-dialog"
import { memo, useState, useCallback } from "react"
import { useAuth } from "@/hooks/use-auth"
import { usePortfolio } from "@/hooks/use-portfolio"
import { useQuery } from "@tanstack/react-query"
import * as Backend from "@/lib/types/backend"
import * as api from "@/lib/api"
import { formatUSD, safePercent } from "@/lib/format"
import { UsdWithSol } from "@/lib/sol-equivalent"
import { CurrencyValue, PnLDisplay } from "@/components/shared/currency-display"
import { cn } from "@/lib/utils"

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
              "radial-gradient(circle at 0% 0%, rgb(34, 197, 94) 0%, transparent 50%)",
              "radial-gradient(circle at 100% 0%, rgb(34, 197, 94) 0%, transparent 50%)",
              "radial-gradient(circle at 100% 100%, rgb(34, 197, 94) 0%, transparent 50%)",
              "radial-gradient(circle at 0% 100%, rgb(34, 197, 94) 0%, transparent 50%)",
              "radial-gradient(circle at 0% 0%, rgb(34, 197, 94) 0%, transparent 50%)",
            ]
          : [
              "radial-gradient(circle at 0% 0%, rgb(239, 68, 68) 0%, transparent 50%)",
              "radial-gradient(circle at 100% 0%, rgb(239, 68, 68) 0%, transparent 50%)",
              "radial-gradient(circle at 100% 100%, rgb(239, 68, 68) 0%, transparent 50%)",
              "radial-gradient(circle at 0% 100%, rgb(239, 68, 68) 0%, transparent 50%)",
              "radial-gradient(circle at 0% 0%, rgb(239, 68, 68) 0%, transparent 50%)",
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
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <Activity className="w-8 h-8 text-primary" />
        </div>
        <Sparkles className="w-4 h-4 text-primary absolute -top-1 -right-1 animate-pulse" />
      </div>
      
      <h3 className="text-lg font-semibold mb-2">No Trading Activity Yet</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">
        Start trading to see your profit & loss performance here.
      </p>
      
      <Button className="gap-2" onClick={() => window.location.href = '/trade'}>
        <TrendingUp className="w-4 h-4" />
        Start Trading
      </Button>
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

  // Use centralized portfolio hook
  const {
    data: portfolio,
    isLoading,
    error,
    refetch,
    isRefetching
  } = usePortfolio();

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
      <EnhancedCard className="relative overflow-hidden">
        <PnLLoadingSkeleton />
      </EnhancedCard>
    );
  }

  // Error state
  if (error) {
    return (
      <EnhancedCard className="relative overflow-hidden">
        <div className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                Failed to load P&L data: {error instanceof Error ? error.message : 'Unknown error'}
              </span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleRefresh}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </EnhancedCard>
    );
  }

  // Empty state
  if (!portfolio || !portfolio.positions || portfolio.positions.length === 0) {
    return (
      <EnhancedCard className="relative overflow-hidden">
        <EmptyPnLState />
      </EnhancedCard>
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
      <EnhancedCard className="relative overflow-hidden">
        {/* Animated Background */}
        <AnimatedBackground isPositive={isPositive} />

        <div className="relative p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                isPositive ? "bg-green-500/10" : "bg-red-500/10"
              )}>
                <PnLIcon className={cn(
                  "h-5 w-5",
                  isPositive ? "text-green-400" : "text-red-400"
                )} />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Profit & Loss</h3>
                <p className="text-sm text-muted-foreground">
                  {totalTrades} trade{totalTrades !== 1 ? 's' : ''} • {winRate.toFixed(1)}% win rate
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={isRefetching}
                className="shrink-0"
              >
                <RefreshCw className={cn(
                  "h-4 w-4",
                  isRefetching && "animate-spin"
                )} />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                className="gap-2"
              >
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline">Share</span>
              </Button>
            </div>
          </div>

          {/* Main P&L Display - Featured */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className={cn(
              "p-6 rounded-xl border-2",
              isPositive 
                ? "bg-green-500/5 border-green-500/20" 
                : "bg-red-500/5 border-red-500/20"
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
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
            <div className="flex items-center gap-2 pt-4 border-t">
              <Badge 
                variant={winRate >= 50 ? "default" : "secondary"}
                className="gap-1"
              >
                <Award className="h-3 w-3" />
                {winRate >= 70 ? "Outstanding" : winRate >= 50 ? "Profitable" : "Building Experience"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {winRate.toFixed(1)}% success rate across {totalTrades} trades
              </span>
            </div>
          )}
        </div>
      </EnhancedCard>

      {/* Share Dialog */}
      <SharePnLDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        totalPnL={totalPnL}
        totalPnLPercent={parseFloat(totalPnLPercent.replace(/[^0-9.-]/g, '')) || 0}
        currentValue={totalValue}
        initialBalance={costBasis}
        userHandle={(userProfile as any)?.handle || (userProfile as any)?.username || (userProfile as any)?.displayName || undefined}
        userAvatarUrl={
          (userProfile as any)?.avatar ||
          (userProfile as any)?.avatarUrl ||
          (userProfile as any)?.profileImage ||
          undefined
        }
        userEmail={(userProfile as any)?.email || user?.email || undefined}
      />
    </>
  );
}
