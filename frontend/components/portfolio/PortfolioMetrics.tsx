'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendIndicator } from '@/components/shared/TrendIndicator';
import { Wallet, TrendingUp, TrendingDown, Activity, Briefcase } from 'lucide-react';
import { formatNumber } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import * as api from '@/lib/api';
import * as Backend from '@/lib/types/backend';

interface PortfolioMetricsProps {
  isLoading?: boolean;
}

interface StatCardProps {
  title: string;
  value: string;
  change?: string | number;
  changeType?: 'positive' | 'negative' | 'neutral';
  changeSuffix?: string;
  isLoading?: boolean;
  icon?: React.ReactNode;
  valueColor?: string;
  subtitle?: string;
}

/**
 * PortfolioMetrics component for displaying portfolio performance
 * 
 * Updated to use the new backend API structure:
 * - Fetches data directly from portfolio service
 * - Uses standardized portfolio types
 * - Displays all key metrics from backend
 */
export function StatCard({ title, value, change, changeType, changeSuffix, isLoading, icon, valueColor, subtitle }: StatCardProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="flex items-center gap-2">
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <p className={`text-2xl font-bold ${valueColor || ''}`}>{value}</p>
            )}
            {icon}
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {change !== undefined && changeType && (
          <div className={`flex items-center gap-1 text-sm ${
            changeType === 'positive' ? 'text-green-600' :
            changeType === 'negative' ? 'text-red-600' : 'text-muted-foreground'
          }`}>
            {changeType === 'positive' && <TrendingUp className="h-4 w-4" />}
            {changeType === 'negative' && <TrendingDown className="h-4 w-4" />}
            <span>{change}{changeSuffix || ''}</span>
          </div>
        )}
      </div>
    </Card>
  )
}

export function PortfolioMetrics({ isLoading: externalLoading = false }: PortfolioMetricsProps) {
  // Use React Query to fetch portfolio data directly
  const { 
    data: portfolio, 
    isLoading: dataLoading, 
    error 
  } = useQuery({
    queryKey: ['portfolio'],
    queryFn: async () => {
      const userId = localStorage.getItem('userId');
      if (!userId) throw new Error('User not authenticated');
      return api.getPortfolio(userId);
    },
    enabled: typeof window !== 'undefined' && !!localStorage.getItem('userId'),
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  })

  const isLoading = externalLoading || dataLoading

  if (isLoading) {
    return <PortfolioMetricsSkeleton />;
  }

  if (error || !portfolio) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Unable to load portfolio metrics</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const totalValue = parseFloat(portfolio.totals.totalValueUsd)
  const totalPnL = parseFloat(portfolio.totals.totalPnlUsd)
  const unrealizedPnL = parseFloat(portfolio.totals.totalUnrealizedUsd)
  const realizedPnL = parseFloat(portfolio.totals.totalRealizedUsd)
  
  // Calculate cost basis and PnL percentage
  const costBasis = totalValue - unrealizedPnL
  const totalPnLPercent = costBasis > 0 ? (totalPnL / costBasis) * 100 : 0
  
  const isPnLPositive = totalPnL >= 0
  const positionsCount = portfolio.positions.length
  const activePositionsCount = portfolio.positions.filter(p => parseFloat(p.qty) > 0).length

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <StatCard
        title="Portfolio Value"
        value={`$${formatNumber(totalValue)}`}
        icon={<Wallet className="h-4 w-4" />}
      />
      
      <StatCard
        title="Total P&L"
        value={`${totalPnL >= 0 ? '+' : ''}$${formatNumber(Math.abs(totalPnL))}`}
        change={totalPnLPercent}
        changeSuffix="%"
        icon={isPnLPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
        valueColor={isPnLPositive ? 'text-green-500' : 'text-red-500'}
      />
      
      <StatCard
        title="Unrealized P&L"
        value={`${unrealizedPnL >= 0 ? '+' : ''}$${formatNumber(Math.abs(unrealizedPnL))}`}
        icon={<Activity className="h-4 w-4" />}
        valueColor={unrealizedPnL >= 0 ? 'text-green-500' : 'text-red-500'}
      />
      
      <StatCard
        title="Active Positions"
        value={activePositionsCount.toString()}
        icon={<Briefcase className="h-4 w-4" />}
        subtitle={`${positionsCount} total`}
      />
    </div>
  );
}


function PortfolioMetricsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-8 w-[120px]" />
              <Skeleton className="h-4 w-[80px]" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}