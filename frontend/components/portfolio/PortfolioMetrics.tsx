'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendIndicator } from '@/components/shared/TrendIndicator';
import { Wallet, TrendingUp, TrendingDown, Activity, Briefcase } from 'lucide-react';
import { formatNumber } from '@/lib/utils';
import { PortfolioMetricsProps } from '../trading/types';

/**
 * PortfolioMetrics component for displaying portfolio performance
 * 
 * Follows the UX pattern guidelines for portfolio performance:
 * - Card-based metrics with consistent styling
 * - Semantic coloring for profit/loss
 * - Group related metrics together
 * - Use appropriate icons to reinforce meaning
 */
export function PortfolioMetrics({
  portfolioValue,
  portfolioChange24h,
  totalPnL,
  pnlChangePercent,
  activePositionsCount,
  totalTradesCount,
  isLoading = false
}: PortfolioMetricsProps) {
  const normalizedTotalPnL = totalPnL ?? 0;
  const isPnLPositive = normalizedTotalPnL >= 0;

  if (isLoading) {
    return <PortfolioMetricsSkeleton />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <StatCard
        title="Portfolio Value"
        value={`$${formatNumber(portfolioValue)}`}
        change={portfolioChange24h}
        changeSuffix="%"
        icon={<Wallet className="h-4 w-4" />}
      />
      
      <StatCard
        title="Total Profit/Loss"
        value={`$${formatNumber(normalizedTotalPnL)}`}
        change={pnlChangePercent}
        changeSuffix="%"
        icon={isPnLPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
        trend={isPnLPositive ? 'positive' : 'negative'}
      />
      
      <StatCard
        title="Active Positions"
        value={activePositionsCount.toString()}
        icon={<Briefcase className="h-4 w-4" />}
      />
      
      <StatCard
        title="Total Trades"
        value={totalTradesCount.toString()}
        icon={<Activity className="h-4 w-4" />}
      />
    </div>
  );
}

/**
 * StatCard component for individual portfolio metrics
 */
interface StatCardProps {
  title: string;
  value: string;
  change?: number;
  changeSuffix?: string;
  icon?: React.ReactNode;
  trend?: 'positive' | 'negative' | 'neutral';
}

export function StatCard({
  title,
  value,
  change,
  changeSuffix = '',
  icon,
  trend = 'neutral'
}: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{title}</p>
            {icon && <div className="text-muted-foreground">{icon}</div>}
          </div>
          
          <div className="flex items-baseline justify-between">
            <h3 className={`
              text-2xl font-semibold tabular-nums
              ${trend === 'positive' ? 'text-profit' : trend === 'negative' ? 'text-loss' : ''}
            `}>
              {value}
            </h3>
            {typeof change === 'number' && (
              <TrendIndicator 
                value={change} 
                suffix={changeSuffix}
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Loading skeleton for portfolio metrics
 */
function PortfolioMetricsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </div>
              <div className="flex items-baseline justify-between">
                <Skeleton className="h-8 w-28" />
                <Skeleton className="h-4 w-12" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}