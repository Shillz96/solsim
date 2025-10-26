'use client';

/**
 * Portfolio Metrics Component - Mario Theme Edition
 *
 * Mario-themed trading stats with:
 * - Question block style cards with 3D shadows
 * - Power-up icons and coin imagery
 * - Bold borders (4px) and vibrant Mario colors
 * - Pixel font headers with text shadows
 * - Game-inspired stat display
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
  Sparkles,
  Star,
  Trophy,
  Zap
} from 'lucide-react';
import { motion } from 'framer-motion';
import * as Backend from '@/lib/types/backend';
import { formatUSD, safePercent } from '@/lib/format';
import { UsdWithSol } from '@/lib/sol-equivalent';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { usePortfolio } from '@/hooks/use-portfolio';
import Image from 'next/image';

interface StatCardProps {
  title: string;
  value: number | string;
  icon?: React.ElementType;
  iconSrc?: string; // Mario PNG icon path
  description?: string;
  change?: number;
  showSolEquiv?: boolean;
  isLoading?: boolean;
  variant?: 'default' | 'success' | 'danger';
  format?: 'currency' | 'number' | 'percent';
}

/**
 * Mario Question Block Style Stat Card
 * Bold borders, 3D shadows, vibrant colors
 */
function StatCard({
  title,
  value,
  icon: Icon,
  iconSrc,
  description,
  change,
  showSolEquiv = true,
  isLoading = false,
  variant = 'default',
  format = 'currency'
}: StatCardProps) {
  // Mario theme variant styles - bold borders and colors
  const variantStyles = {
    default: {
      bg: 'bg-sky/20',
      border: 'border-outline',
      iconBg: 'bg-sky',
      iconColor: 'text-white'
    },
    success: {
      bg: 'bg-luigi/10',
      border: 'border-outline',
      iconBg: 'bg-luigi',
      iconColor: 'text-white'
    },
    danger: {
      bg: 'bg-mario/10',
      border: 'border-outline',
      iconBg: 'bg-mario',
      iconColor: 'text-white'
    }
  };

  const changeColor = change !== undefined
    ? change >= 0 ? 'text-luigi' : 'text-mario'
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

  const style = variantStyles[variant];

  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {/* Mario Question Block Style Card */}
      <div className={cn(
        "relative overflow-hidden rounded-xl border-4 transition-all",
        style.bg,
        style.border,
        "shadow-[6px_6px_0_var(--outline-black)]",
        "hover:shadow-[8px_8px_0_var(--outline-black)] hover:-translate-y-1"
      )}>
        <CardContent className="relative p-6">
          {/* Icon Badge */}
          <div className="flex items-center justify-between mb-3">
            <div className={cn(
              "p-3 rounded-lg border-3",
              style.iconBg,
              "border-outline",
              "shadow-[3px_3px_0_var(--outline-black)]",
              "flex items-center justify-center"
            )}>
              {iconSrc ? (
                <Image src={iconSrc} alt={title} width={24} height={24} />
              ) : Icon ? (
                <Icon className={cn("h-6 w-6", style.iconColor)} />
              ) : null}
            </div>
            {change !== undefined && ChangeIcon && (
              <div className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-lg border-3 border-outline shadow-[2px_2px_0_var(--outline-black)]",
                change >= 0 ? "bg-luigi/10" : "bg-mario/10",
                "font-bold text-xs"
              )}>
                <ChangeIcon className="h-3 w-3" />
                <span className={changeColor}>{Math.abs(change).toFixed(2)}%</span>
              </div>
            )}
          </div>

          {/* Title - Pixel Font */}
          <p className="text-xs font-mario font-bold text-outline mb-2 uppercase tracking-wide">{title}</p>

          {/* Value */}
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-8 bg-muted rounded animate-pulse w-3/4" />
              <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
            </div>
          ) : (
            <>
              {format === 'currency' && showSolEquiv && typeof value === 'number' ? (
                <UsdWithSol
                  usd={value}
                  className="text-2xl font-bold text-outline"
                  solClassName="text-xs text-muted-foreground font-bold"
                />
              ) : (
                <p className="text-2xl font-bold text-outline mb-1">{formattedValue}</p>
              )}
            </>
          )}

          {/* Description */}
          {description && !isLoading && (
            <p className="text-xs text-muted-foreground font-bold mt-2">{description}</p>
          )}
        </CardContent>
      </div>
    </motion.div>
  );
}

/**
 * Mario-themed loading skeleton
 */
function MetricsLoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="bg-sky/20 border-4 border-outline rounded-xl shadow-[6px_6px_0_var(--outline-black)] p-6 animate-pulse"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-muted border-2 border-outline rounded-lg" />
          </div>
          <div className="h-4 bg-muted rounded w-1/2 mb-2" />
          <div className="h-8 bg-muted rounded w-3/4 mb-2" />
          <div className="h-3 bg-pipe-200 rounded w-2/3" />
        </div>
      ))}
    </div>
  );
}

/**
 * Mario-themed empty state - Start your adventure!
 */
function EmptyMetricsState({ onAction }: { onAction: () => void }) {
  return (
    <div className="bg-card border-4 border-pipe-700 rounded-xl shadow-[8px_8px_0_0_rgba(0,0,0,0.3)] p-12">
      <div className="flex flex-col items-center space-y-6 text-center">
        {/* Mario Mushroom Icon */}
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="relative"
        >
          <Image src="/icons/mario/mushroom.png" alt="Power Up" width={80} height={80} />
          <div className="absolute -top-2 -right-2">
            <Star className="h-6 w-6 text-star-yellow-500 animate-pulse" />
          </div>
        </motion.div>

        <div className="space-y-3">
          <h3 className="text-2xl font-bold text-pipe-900" style={{ fontFamily: "'Press Start 2P', monospace" }}>
            GAME START!
          </h3>
          <p className="text-sm text-pipe-600 max-w-md">
            Power up your trading journey! Begin collecting coins and leveling up on the leaderboard.
          </p>
        </div>

        <Button
          onClick={onAction}
          className="gap-2 bg-mario-red-500 hover:bg-mario-red-600 text-white border-4 border-mario-red-700 rounded-lg px-6 py-3 font-bold shadow-[4px_4px_0_0_rgba(0,0,0,0.3)] hover:shadow-[2px_2px_0_0_rgba(0,0,0,0.3)] transition-all"
        >
          <Image src="/icons/mario/star.png" alt="Start" width={20} height={20} />
          START ADVENTURE
        </Button>
      </div>
    </div>
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

  // Empty state - only show if user has NEVER traded before
  // If they have trading history but no current positions, still show metrics
  const hasTradingHistory = portfolio?.totals?.totalTrades && portfolio.totals.totalTrades > 0;
  if (!portfolio || !hasTradingHistory) {
    return <EmptyMetricsState onAction={() => window.location.href = '/warp-pipes'} />;
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
  const unrealizedCostBasis = totalValue - unrealizedPnL;
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
          iconSrc="/icons/mario/money-bag.png"
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
          iconSrc={totalPnL >= 0 ? "/icons/mario/star.png" : "/icons/mario/fire.png"}
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
          iconSrc={unrealizedPnL >= 0 ? "/icons/mario/mushroom.png" : "/icons/mario/carnivorous-plant.png"}
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
          iconSrc="/icons/mario/trophy.png"
          description={`${totalTrades} total trade${totalTrades !== 1 ? 's' : ''}`}
          isLoading={isLoading}
          showSolEquiv={false}
          format="percent"
          variant={winRate >= 50 ? 'success' : 'danger'}
        />
      </div>

      {/* Additional compact metrics row - Mario Pipe Style */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4"
      >
        {/* Active Positions */}
        <div className="bg-card border-3 border-pipe-600 rounded-lg shadow-[3px_3px_0_0_rgba(0,0,0,0.2)] p-3 flex items-center gap-3">
          <div className="bg-star-yellow-500 p-2 rounded-lg border-2 border-star-yellow-700 flex items-center justify-center">
            <Image src="/icons/mario/mushroom.png" alt="Active" width={16} height={16} />
          </div>
          <div>
            <p className="text-xs font-bold text-pipe-700 uppercase">Active</p>
            <p className="text-xl font-bold text-pipe-900">{activePositions}</p>
          </div>
        </div>

        {/* Total Trades */}
        <div className="bg-card border-3 border-pipe-600 rounded-lg shadow-[3px_3px_0_0_rgba(0,0,0,0.2)] p-3 flex items-center gap-3">
          <div className="bg-mario-red-500 p-2 rounded-lg border-2 border-mario-red-700 flex items-center justify-center">
            <Image src="/icons/mario/game.png" alt="Trades" width={16} height={16} />
          </div>
          <div>
            <p className="text-xs font-bold text-pipe-700 uppercase">Trades</p>
            <p className="text-xl font-bold text-pipe-900">{totalTrades}</p>
          </div>
        </div>

        {/* Realized PnL */}
        <div className="bg-card border-3 border-pipe-600 rounded-lg shadow-[3px_3px_0_0_rgba(0,0,0,0.2)] p-3 flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-lg border-2 flex items-center justify-center",
            realizedPnL >= 0 ? "bg-profit border-luigi-green-700" : "bg-loss border-mario-red-700"
          )}>
            <Image
              src={realizedPnL >= 0 ? "/icons/mario/star.png" : "/icons/mario/fire.png"}
              alt="Realized PnL"
              width={16}
              height={16}
            />
          </div>
          <div>
            <p className="text-xs font-bold text-pipe-700 uppercase">Realized</p>
            <UsdWithSol
              usd={realizedPnL}
              className={cn("text-lg font-bold", realizedPnL >= 0 ? "text-profit" : "text-loss")}
              solClassName="text-xs text-pipe-600"
            />
          </div>
        </div>

        {/* Avg P&L */}
        <div className="bg-card border-3 border-pipe-600 rounded-lg shadow-[3px_3px_0_0_rgba(0,0,0,0.2)] p-3 flex items-center gap-3">
          <div className="bg-pipe-500 p-2 rounded-lg border-2 border-pipe-700 flex items-center justify-center">
            <Image src="/icons/mario/money-bag.png" alt="Avg PnL" width={16} height={16} />
          </div>
          <div>
            <p className="text-xs font-bold text-pipe-700 uppercase">Avg P&L</p>
            <UsdWithSol
              usd={totalTrades > 0 ? totalPnL / totalTrades : 0}
              className={cn("text-lg font-bold", (totalTrades > 0 ? totalPnL / totalTrades : 0) >= 0 ? "text-profit" : "text-loss")}
              solClassName="text-xs text-pipe-600"
            />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
