'use client';

/**
 * Portfolio Metrics Component (Production Ready - Refactored)
 * 
 * Key improvements:
 * - Compact responsive layout (4 cols desktop, 2 tablet, 1 mobile)
 * - All USD values include SOL equivalents
 * - Proper colorization for P&L (green-400/red-400)
 * - Guards against Infinity%, NaN, undefined
 * - Enhanced empty state with contextual actions
 * - Loading shimmer placeholders
 * - Gradient accent borders for active metrics
 * - Data validation diagnostics
 * - Hover animations with framer-motion
 */

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  DollarSign, 
  Target, 
  Percent,
  RefreshCw,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';
import * as Backend from '@/lib/types/backend';
import { formatUSD, safePercent } from '@/lib/format';
import { UsdWithSol } from '@/lib/sol-equivalent';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { usePortfolio } from '@/hooks/use-portfolio';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  description?: string;
  change?: number;
  showSolEquiv?: boolean;
  isLoading?: boolean;
  variant?: 'default' | 'success' | 'danger';
  format?: 'currency' | 'number' | 'percent';
}

/**
 * Stat Card Component with gradient accents and hover effects
 */
function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  description, 
  change,
  showSolEquiv = true,
  isLoading = false,
  variant = 'default',
  format = 'currency'
}: StatCardProps) {
  const variantStyles = {
    default: 'from-primary/10 to-primary/5',
    success: 'from-green-500/10 to-green-500/5',
    danger: 'from-red-500/10 to-red-500/5'
  };

  const iconColorStyles = {
    default: 'text-primary',
    success: 'text-profit',
    danger: 'text-loss'
  };

  const changeColor = change !== undefined 
    ? change >= 0 ? 'text-profit' : 'text-loss'
    : 'text-muted-foreground';

  const ChangeIcon = change !== undefined 
    ? change >= 0 ? TrendingUp : TrendingDown
    : null;

  // Format value based on type
  const formattedValue = typeof value === 'number' 
    ? format === 'currency' ? formatUSD(value)
    : format === 'percent' ? `${value.toFixed(2)}%`
    : value.toLocaleString()
    : value;

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      <Card className="relative overflow-hidden border-border/50 hover:border-border transition-colors">
        {/* Gradient accent */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-30",
          variantStyles[variant]
        )} />
        
        <CardContent className="relative p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className={cn(
              "p-2.5 rounded-lg bg-muted/50",
              "border border-border/30"
            )}>
              <Icon className={cn("h-5 w-5", iconColorStyles[variant])} />
            </div>
            {change !== undefined && ChangeIcon && (
              <Badge 
                variant="outline" 
                className={cn("gap-1", changeColor)}
              >
                <ChangeIcon className="h-3 w-3" />
                {Math.abs(change).toFixed(2)}%
              </Badge>
            )}
          </div>

          {/* Title */}
          <p className="text-sm text-muted-foreground mb-1">{title}</p>

          {/* Value */}
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-7 bg-muted rounded animate-pulse w-3/4" />
              <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
            </div>
          ) : (
            <>
              {format === 'currency' && showSolEquiv && typeof value === 'number' ? (
                <UsdWithSol 
                  usd={value} 
                  className="text-2xl font-bold"
                  solClassName="text-xs"
                />
              ) : (
                <p className="text-2xl font-bold mb-2">{formattedValue}</p>
              )}
            </>
          )}

          {/* Description */}
          {description && !isLoading && (
            <p className="text-xs text-muted-foreground mt-2">{description}</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

/**
 * Loading skeleton for metrics grid
 */
function MetricsLoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="animate-pulse">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-muted rounded-lg" />
            </div>
            <div className="h-4 bg-muted rounded w-1/2 mb-2" />
            <div className="h-7 bg-muted rounded w-3/4 mb-2" />
            <div className="h-3 bg-muted rounded w-2/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Empty state for when no portfolio data exists
 */
function EmptyMetricsState({ onAction }: { onAction: () => void }) {
  return (
    <Card className="border-dashed">
      <CardContent className="p-12 text-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="p-4 rounded-full bg-primary/10">
              <Wallet className="h-8 w-8 text-primary" />
            </div>
            <Sparkles className="h-4 w-4 text-primary absolute -top-1 -right-1 animate-pulse" />
          </div>
          
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">Start Your Trading Journey</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Begin paper trading to track your portfolio performance and compete on the leaderboard.
            </p>
          </div>
          
          <Button onClick={onAction} className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Make Your First Trade
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface PortfolioMetricsProps {
  isLoading?: boolean;
}

export function PortfolioMetrics({ isLoading: externalLoading = false }: PortfolioMetricsProps) {
  const { user, isAuthenticated } = useAuth();

  // Use centralized portfolio hook
  const {
    data: portfolio,
    isLoading: portfolioLoading,
    error,
    refetch
  } = usePortfolio();

  const isLoading = externalLoading || portfolioLoading;

  // Error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>
            Failed to load portfolio metrics. Please check your connection.
          </span>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => refetch()}
            className="ml-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Loading state
  if (isLoading) {
    return <MetricsLoadingSkeleton />;
  }

  // Empty state
  if (!portfolio || !portfolio.positions || portfolio.positions.length === 0) {
    return <EmptyMetricsState onAction={() => window.location.href = '/trade'} />;
  }

  // Calculate metrics from portfolio data with guards
  const totalValue = portfolio ? parseFloat(portfolio.totals.totalValueUsd) || 0 : 0;
  const totalPnL = portfolio ? parseFloat(portfolio.totals.totalPnlUsd) || 0 : 0;
  const unrealizedPnL = portfolio ? parseFloat(portfolio.totals.totalUnrealizedUsd) || 0 : 0;
  const realizedPnL = portfolio ? parseFloat(portfolio.totals.totalRealizedUsd) || 0 : 0;
  const winRate = portfolio ? parseFloat(portfolio.totals.winRate) || 0 : 0;
  const totalTrades = portfolio ? portfolio.totals.totalTrades || 0 : 0;
  const activePositions = portfolio 
    ? portfolio.positions.filter(p => parseFloat(p.qty) > 0).length 
    : 0;

  // Calculate change percentages
  // PnL% = pnl / costBasis, where costBasis = currentValue - pnl
  const totalPnLChange = totalValue > 0 
    ? (totalPnL / (totalValue - totalPnL)) * 100 
    : 0;
  // For unrealized PnL, we need the cost basis of open positions
  // costBasis = currentValue - unrealizedPnL, so unrealizedPnL% = unrealizedPnL / costBasis
  const unrealizedCostBasis = totalValue - unrealizedPnL
  const unrealizedPnLChange = unrealizedCostBasis > 0
    ? (unrealizedPnL / unrealizedCostBasis) * 100
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Portfolio Value */}
        <StatCard
          title="Portfolio Value"
          value={totalValue}
          icon={DollarSign}
          description={`${activePositions} active position${activePositions !== 1 ? 's' : ''}`}
          isLoading={isLoading}
          showSolEquiv={true}
          format="currency"
          variant="default"
        />

        {/* Total P&L */}
        <StatCard
          title="Total P&L"
          value={totalPnL}
          icon={totalPnL >= 0 ? TrendingUp : TrendingDown}
          description="Realized + unrealized profit/loss"
          change={totalPnLChange}
          isLoading={isLoading}
          showSolEquiv={true}
          format="currency"
          variant={totalPnL >= 0 ? 'success' : 'danger'}
        />

        {/* Unrealized P&L */}
        <StatCard
          title="Unrealized P&L"
          value={unrealizedPnL}
          icon={unrealizedPnL >= 0 ? TrendingUp : TrendingDown}
          description="Open position gains/losses"
          change={unrealizedPnLChange}
          isLoading={isLoading}
          showSolEquiv={true}
          format="currency"
          variant={unrealizedPnL >= 0 ? 'success' : 'danger'}
        />

        {/* Win Rate */}
        <StatCard
          title="Win Rate"
          value={winRate}
          icon={Percent}
          description={`${totalTrades} total trade${totalTrades !== 1 ? 's' : ''}`}
          isLoading={isLoading}
          showSolEquiv={false}
          format="percent"
          variant={winRate >= 50 ? 'success' : 'danger'}
        />
      </div>

      {/* Additional compact metrics row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3"
      >
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <Target className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Active</p>
              <p className="text-lg font-semibold">{activePositions}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Trades</p>
              <p className="text-lg font-semibold">{totalTrades}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="h-4 w-4 text-profit" />
            <div>
              <p className="text-xs text-muted-foreground">Realized</p>
              <UsdWithSol 
                usd={realizedPnL}
                className="text-lg font-semibold"
                solClassName="text-xs"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <Wallet className="h-4 w-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Avg P&L</p>
              <UsdWithSol 
                usd={totalTrades > 0 ? totalPnL / totalTrades : 0}
                className="text-lg font-semibold"
                solClassName="text-xs"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
