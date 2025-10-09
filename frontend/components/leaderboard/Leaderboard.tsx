"use client";

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as api from '@/lib/api';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
  MedalIcon,
  AlertCircle,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

interface LeaderboardProps {
  className?: string;
  limit?: number;
  showSelf?: boolean;
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
    queryFn: () => api.getLeaderboard(),
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  });

  // Limit the number of entries to display
  const leaderboardEntries = leaderboardData 
    ? leaderboardData.slice(0, limit)
    : [];

  // Function to render rank badge
  const renderRankBadge = (rank: number) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <MedalIcon className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <MedalIcon className="h-5 w-5 text-amber-700" />;
    return <span className="text-sm font-medium">{rank}</span>;
  };

  // Function to get trend icon with threshold to prevent flickering
  const getTrendIcon = (value: number) => {
    if (value > 0.01) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (value < -0.01) return <TrendingDown className="h-4 w-4 text-destructive" />;
    return null;
  };

  // Function to get trend text color with threshold
  const getTrendColor = (value: number) => {
    if (value > 0.01) return 'text-green-600';
    if (value < -0.01) return 'text-destructive';
    return 'text-muted-foreground';
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle>Leaderboard</CardTitle>
          <div className="flex items-center space-x-2">
            <div className="flex items-center rounded-md border">
              <Button
                variant={displayMode === 'cards' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-r-none border-r"
                onClick={() => setDisplayMode('cards')}
              >
                Cards
              </Button>
              <Button
                variant={displayMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-l-none"
                onClick={() => setDisplayMode('table')}
              >
                Table
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
            >
              {isRefetching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="sr-only">Refresh</span>
            </Button>
          </div>
        </div>
        <CardDescription>
          Top traders ranked by portfolio performance
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <>
            {displayMode === 'cards' ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <LeaderboardCardSkeleton key={i} />
                ))}
              </div>
            ) : (
              <div className="rounded-md border">
                <LeaderboardTableSkeleton />
              </div>
            )}
          </>
        )}

        {isError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {(error as Error)?.message || 'Failed to load leaderboard data'}
            </AlertDescription>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="mt-2"
            >
              {isRefetching ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Try Again
            </Button>
          </Alert>
        )}

        {!isLoading && !isError && leaderboardEntries.length === 0 && (
          <div className="text-center py-8">
            <Trophy className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No leaderboard data available</p>
          </div>
        )}

        {!isLoading && !isError && leaderboardEntries.length > 0 && (
          <>
            {displayMode === 'cards' ? (
              <div className="space-y-3">
                {leaderboardEntries.map((entry) => (
                  <div 
                    key={entry.userId} 
                    className={cn(
                      "flex items-center justify-between p-3 border rounded-md",
                      entry.userId === 'current-user' && "bg-muted"
                    )}
                  >
                    <div className="flex items-center">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full mr-3">
                        {renderRankBadge(entry.rank)}
                      </div>
                      <div className="flex items-center">
                        <Avatar className="h-8 w-8 mr-2">
                          <AvatarImage src={entry.avatarUrl ?? undefined} alt={entry.displayName || 'User'} />
                          <AvatarFallback>{(entry.displayName || 'U').substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {entry.displayName || 'Unknown User'}
                            {entry.userId === 'current-user' && (
                              <Badge variant="secondary" className="ml-2">You</Badge>
                            )}
                          </div>
                          <div className={cn(
                            "text-xs flex items-center",
                            getTrendColor(parseFloat(entry.totalPnlUsd || '0'))
                          )}>
                            {getTrendIcon(parseFloat(entry.totalPnlUsd || '0'))}
                            <span className="ml-1">
                              {parseFloat(entry.totalPnlUsd || '0') > 0 && '+'}
                              {parseFloat(entry.totalPnlUsd || '0').toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        ${entry.totalPnlUsd.toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Rank</TableHead>
                      <TableHead>Trader</TableHead>
                      <TableHead className="text-right">Portfolio Value</TableHead>
                      <TableHead className="text-right">Performance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaderboardEntries.map((entry) => (
                      <TableRow 
                        key={entry.userId}
                        className={entry.userId === 'current-user' ? "bg-muted" : undefined}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center justify-center">
                            {renderRankBadge(entry.rank)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Avatar className="h-8 w-8 mr-2">
                              <AvatarImage src={entry.avatarUrl ?? undefined} alt={entry.displayName || 'User'} />
                              <AvatarFallback>{(entry.displayName || 'U').substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">
                              {entry.displayName || 'Unknown User'}
                              {entry.userId === 'current-user' && (
                                <Badge variant="secondary" className="ml-2">You</Badge>
                              )}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${entry.totalPnlUsd.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className={cn(
                            "flex items-center justify-end",
                            getTrendColor(parseFloat(entry.totalPnlUsd || '0'))
                          )}>
                            {getTrendIcon(parseFloat(entry.totalPnlUsd || '0'))}
                            <span className="ml-1">
                              {parseFloat(entry.totalPnlUsd || '0') > 0 && '+'}
                              {parseFloat(entry.totalPnlUsd || '0').toFixed(2)}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        Rankings update hourly based on portfolio performance
      </CardFooter>
    </Card>
  );
}

// Card skeleton loader for leaderboard
function LeaderboardCardSkeleton() {
  return (
    <div className="flex items-center justify-between p-3 border rounded-md">
      <div className="flex items-center">
        <Skeleton className="h-8 w-8 rounded-full mr-3" />
        <div className="flex items-center">
          <Skeleton className="h-8 w-8 rounded-full mr-2" />
          <div>
            <Skeleton className="h-5 w-24 mb-1" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </div>
      <div className="text-right">
        <Skeleton className="h-5 w-16" />
      </div>
    </div>
  );
}

// Table skeleton loader for leaderboard
function LeaderboardTableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">
            <Skeleton className="h-4 w-8" />
          </TableHead>
          <TableHead>
            <Skeleton className="h-4 w-20" />
          </TableHead>
          <TableHead className="text-right">
            <Skeleton className="h-4 w-24 ml-auto" />
          </TableHead>
          <TableHead className="text-right">
            <Skeleton className="h-4 w-16 ml-auto" />
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...Array(5)].map((_, i) => (
          <TableRow key={i}>
            <TableCell>
              <Skeleton className="h-8 w-8 mx-auto rounded-full" />
            </TableCell>
            <TableCell>
              <div className="flex items-center">
                <Skeleton className="h-8 w-8 rounded-full mr-2" />
                <Skeleton className="h-5 w-24" />
              </div>
            </TableCell>
            <TableCell className="text-right">
              <Skeleton className="h-5 w-20 ml-auto" />
            </TableCell>
            <TableCell className="text-right">
              <Skeleton className="h-5 w-16 ml-auto" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}