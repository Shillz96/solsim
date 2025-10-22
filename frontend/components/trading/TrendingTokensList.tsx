"use client";

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import * as api from '@/lib/api';
import * as Backend from '@/lib/types/backend';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  ChevronRight, 
  RefreshCw, 
  Loader2, 
  TrendingUp,
  Info
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { usePriceStreamContext } from "@/lib/price-stream-provider";
// ✅ Import standardized table cells instead of manual formatting
import { PriceCell, formatUSD, safePercent } from "@/components/ui/table-cells"

interface TrendingTokensListProps {
  limit?: number;
  showRefresh?: boolean;
  className?: string;
  onSelectToken?: (tokenAddress: string) => void;
}

export function TrendingTokensList({
  limit = 10,
  showRefresh = true,
  className = '',
  onSelectToken
}: TrendingTokensListProps) {
  const [timeframe, setTimeframe] = useState<'1h' | '24h' | '7d'>('24h');
  const router = useRouter();
  const queryClient = useQueryClient();
  
  // Get SOL price for equivalents
  const { prices: livePrices } = usePriceStreamContext()
  const solPrice = livePrices.get('So11111111111111111111111111111111111111112')?.price || 0
  
  const { 
    data: tokens, 
    isLoading, 
    isError, 
    error, 
    refetch, 
    isRefetching 
  } = useQuery({
    queryKey: ['trending-tokens', limit],
    queryFn: () => api.getTrendingTokens(),
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  });

  // Function to handle manual refresh
  const handleRefresh = () => {
    refetch();
  };

  // Function to handle token selection
  const handleTokenSelect = (tokenAddress: string) => {
    if (onSelectToken) {
      onSelectToken(tokenAddress);
    } else {
      // Navigate to trade page with token parameter
      router.push(`/trade?token=${tokenAddress}`);
    }
  };

  // Function to get trend badge color
  const getTrendColor = (change: number) => {
    if (change > 0) return 'text-green-400';
    if (change < 0) return 'text-red-400';
    return 'text-muted-foreground';
  };

  // Function to render trend icon
  const renderTrendIcon = (change: number) => {
    if (change > 0) {
      return <ArrowUpRight className="h-4 w-4 text-green-400" />;
    } else if (change < 0) {
      return <ArrowDownRight className="h-4 w-4 text-red-400" />;
    }
    return null;
  };

  // Get the correct change percentage based on selected timeframe
  const getChangePercent = (token: Backend.TrendingToken) => {
    switch (timeframe) {
      case '1h': 
        // For 1h, we could use a shorter term calculation if available
        // For now, fall back to 24h data as it's the only available metric
        return token.priceChange24h || 0;
      case '7d': 
        // For 7d, we could calculate a weekly average if we had historical data
        // For now, fall back to 24h data as it's the only available metric
        return token.priceChange24h || 0;
      default: 
        return token.priceChange24h || 0;
    }
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle>Trending Tokens</CardTitle>
          {showRefresh && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isRefetching}
            >
              {isRefetching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="sr-only">Refresh</span>
            </Button>
          )}
        </div>
        <CardDescription>
          Top performing tokens by market activity
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs 
          value={timeframe} 
          onValueChange={(v) => setTimeframe(v as '1h' | '24h' | '7d')}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="1h">1H</TabsTrigger>
            <TabsTrigger value="24h">24H</TabsTrigger>
            <TabsTrigger value="7d">7D</TabsTrigger>
          </TabsList>
          
          <div className="space-y-2">
            {isLoading && (
              <>
                {[...Array(5)].map((_, i) => (
                  <TokenSkeleton key={i} />
                ))}
              </>
            )}
            
            {isError && (
              <div className="text-center py-8">
                <p className="text-red-400 mb-2">Failed to load trending tokens</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {(error as Error)?.message || 'An unknown error occurred'}
                </p>
                <Button 
                  variant="outline" 
                  onClick={handleRefresh}
                  disabled={isRefetching}
                >
                  {isRefetching ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Try Again
                </Button>
              </div>
            )}
            
            {!isLoading && !isError && tokens && tokens.length === 0 && (
              <div className="text-center py-8">
                <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No trending tokens available</p>
              </div>
            )}
            
            {!isLoading && !isError && tokens && tokens.map((token, index) => (
              <div
                key={token.mint}
                className={cn(
                  "flex items-center justify-between p-4 rounded-xl border-4 border-outline-black bg-card",
                  onSelectToken ? "cursor-pointer hover:-translate-y-0.5 transition-transform duration-200" : ""
                )}
                onClick={() => handleTokenSelect(token.mint)}
              >
                <div className="flex items-center">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 mr-3 overflow-hidden">
                    {token.logoURI ? (
                      <img
                        src={token.logoURI}
                        alt={token.symbol || "Token"}
                        className="w-full h-full object-cover"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <span className="text-sm">{token.symbol?.substring(0, 2) || 'TKN'}</span>
                    )}
                  </div>
                  <div>
                    <div className="font-medium">
                      {token.name || 'Unknown Token'}
                      <Badge variant="outline" className="ml-2 font-normal">
                        #{index + 1}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {token.symbol || '???'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    {/* ✅ Use PriceCell for standardized price display with SOL equivalent */}
                    <PriceCell 
                      priceUSD={token.priceUsd || 0}
                      priceChangePercent={getChangePercent(token)}
                      className="font-medium"
                      showSolEquiv={true}
                    />
                    <div className={cn(
                      "text-xs flex items-center justify-end mt-1",
                      getTrendColor(getChangePercent(token))
                    )}>
                      {renderTrendIcon(getChangePercent(token))}
                      <span>
                        {getChangePercent(token) >= 0 ? '+' : ''}{getChangePercent(token).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  {onSelectToken && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </div>
              </div>
            ))}
          </div>
        </Tabs>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground flex items-center">
        <Info className="h-3 w-3 mr-1" />
        Data refreshes every 5 minutes
      </CardFooter>
    </Card>
  );
}

// Skeleton loader for tokens
function TokenSkeleton() {
  return (
    <div className="flex items-center justify-between p-4 border-4 border-outline-black rounded-xl bg-card animate-pulse">
      <div className="flex items-center">
        <div className="h-8 w-8 rounded-full mr-3 bg-muted" />
        <div>
          <div className="h-5 w-24 mb-1 bg-muted rounded" />
          <div className="h-3 w-12 bg-muted rounded" />
        </div>
      </div>
      <div className="text-right">
        <div className="h-5 w-16 mb-1 bg-muted rounded" />
        <div className="h-3 w-12 bg-muted rounded" />
      </div>
    </div>
  );
}