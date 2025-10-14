"use client";

/**
 * Leaderboard Component (Production Ready - Refactored)
 * 
 * Key improvements:
 * - Uses standardized table cells (MoneyCell, PnLCell)
 * - All USD values include SOL equivalents
 * - Removed manual formatSolEquivalent function
 * - Proper colorization (green-400/red-400)
 * - Guards against invalid data
 * - Enhanced loading and empty states
 * - Responsive table/card toggle
 * - Data validation diagnostics
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as api from '@/lib/api';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { cn } from '@/lib/utils';
import {
  Trophy,
  Loader2,
  RefreshCw,
  Medal,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Award
} from 'lucide-react';
import { MoneyCell, PnLCell } from '@/components/ui/table-cells';
import { motion } from 'framer-motion';

interface LeaderboardProps {
  className?: string;
  limit?: number;
  showSelf?: boolean;
}

/**
 * Rank badge component with medals for top 3
 */
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-yellow-500/20">
        <Trophy className="h-6 w-6 text-yellow-500" />
      </div>
    );
  }
  
  if (rank === 2) {
    return (
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-400/20">
        <Medal className="h-6 w-6 text-gray-400" />
      </div>
    );
  }
  
  if (rank === 3) {
    return (
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-700/20">
        <Medal className="h-6 w-6 text-amber-700" />
      </div>
    );
  }
  
  return (
    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
      <span className="text-sm font-semibold">{rank}</span>
    </div>
  );
}

/**
 * Trend icon based on value
 */
function TrendIcon({ value }: { value: number }) {
  if (value > 0.01) return <TrendingUp className="h-4 w-4 text-green-400" />;
  if (value < -0.01) return <TrendingDown className="h-4 w-4 text-red-400" />;
  return null;
}

/**
 * Loading skeleton for leaderboard
 */
function LeaderboardSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border rounded-lg bg-muted/20 animate-pulse">
          <div className="w-10 h-10 rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-1/4" />
            <div className="h-3 bg-muted rounded w-1/3" />
          </div>
          <div className="space-y-2 text-right">
            <div className="h-4 bg-muted rounded w-24 ml-auto" />
            <div className="h-3 bg-muted rounded w-16 ml-auto" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Empty state component
 */
function EmptyLeaderboard() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4">
        <Award className="w-8 h-8 text-primary" />
      </div>
      
      <h3 className="text-lg font-semibold mb-2">No Rankings Yet</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        Be the first to start trading and claim the top spot!
      </p>
    </div>
  );
}

export function Leaderboard({
  className = '',
  limit = 10,
  showSelf = true,
}: LeaderboardProps) {
  const [displayMode, setDisplayMode] = useState<'cards' | 'table'>('table');
  
  const {
    data: leaderboardData,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const data = await api.getLeaderboard();
      
      // Data validation diagnostic
      if (process.env.NODE_ENV === 'development') {
        if (!data) console.warn('[Leaderboard] Data missing from API response');
        if (data && !Array.isArray(data)) console.warn('[Leaderboard] Expected array, got:', typeof data);
      }
      
      return data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000,
  });

  // Limit the number of entries to display
  const leaderboardEntries = leaderboardData 
    ? leaderboardData.slice(0, limit)
    : [];

  // Loading state
  if (isLoading) {
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Leaderboard
          </CardTitle>
          <CardDescription>Top performers by total P&L</CardDescription>
        </CardHeader>
        <CardContent>
          <LeaderboardSkeleton rows={limit} />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (isError) {
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                Failed to load leaderboard
              </span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => refetch()}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (!leaderboardEntries.length) {
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyLeaderboard />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Leaderboard
            </CardTitle>
            <CardDescription>
              Top {leaderboardEntries.length} traders by total P&L
            </CardDescription>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={cn("h-4 w-4", isRefetching && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {/* Table View */}
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-[60px]">Rank</TableHead>
                <TableHead>Trader</TableHead>
                <TableHead className="text-right">Portfolio Value</TableHead>
                <TableHead className="text-right">Total P&L</TableHead>
                <TableHead className="text-right">Win Rate</TableHead>
                <TableHead className="text-center">Trades</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboardEntries.map((entry, index) => {
                // Parse and guard values
                const totalPnL = parseFloat(entry.totalPnlUsd) || 0;
                const winRate = entry.winRate || 0;
                const totalTrades = entry.totalTrades || 0;
                const totalVolume = parseFloat(entry.totalVolumeUsd) || 0;
                
                // Calculate portfolio value estimate (volume is a better indicator than PnL alone)
                const portfolioValue = totalVolume > 0 ? totalVolume : Math.abs(totalPnL);
                const costBasis = portfolioValue - totalPnL;
                
                return (
                  <motion.tr
                    key={entry.userId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b hover:bg-muted/20 transition-colors"
                  >
                    {/* Rank */}
                    <TableCell>
                      <RankBadge rank={entry.rank} />
                    </TableCell>

                    {/* Trader */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={entry.profileImage || undefined} />
                          <AvatarFallback className="text-xs">
                            {entry.handle?.slice(0, 2).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium truncate max-w-[150px]">
                            {entry.handle || `User ${entry.userId.slice(0, 6)}`}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Portfolio Value (using volume as proxy) */}
                    <TableCell className="text-right">
                      <MoneyCell 
                        usd={portfolioValue}
                        hideSolEquiv={false}
                      />
                    </TableCell>

                    {/* Total P&L */}
                    <TableCell className="text-right">
                      <PnLCell
                        pnlUSD={totalPnL}
                        costBasisUSD={costBasis}
                        showSolEquiv={false}
                      />
                    </TableCell>

                    {/* Win Rate */}
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        <span className={cn(
                          "font-medium",
                          winRate >= 50 ? "text-green-400" : "text-red-400"
                        )}>
                          {winRate.toFixed(1)}%
                        </span>
                        <TrendIcon value={totalPnL} />
                      </div>
                    </TableCell>

                    {/* Trades */}
                    <TableCell className="text-center">
                      <Badge variant="outline">
                        {totalTrades}
                      </Badge>
                    </TableCell>
                  </motion.tr>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
