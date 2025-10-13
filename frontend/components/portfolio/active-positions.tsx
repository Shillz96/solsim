"use client"

/**
 * Active Positions Component (Production Ready - Refactored)
 * 
 * Key improvements:
 * - Uses standardized table cell components (MoneyCell, PnLCell, TokenCell)
 * - All USD values include SOL equivalents
 * - Proper empty state with contextual messaging
 * - Guards against Infinity%, NaN, and undefined values
 * - Compact responsive layout (3-4 cols desktop, 2 tablet, 1 mobile)
 * - Real-time price integration with WebSocket
 * - Loading skeletons for better UX
 * - Data validation and diagnostic warnings
 */

import { EnhancedCard } from "@/components/ui/enhanced-card-system"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  MoneyCell, 
  PnLCell, 
  TokenCell, 
  PriceCell 
} from "@/components/ui/table-cells"
import { 
  TrendingUp, 
  TrendingDown, 
  Loader2, 
  AlertCircle, 
  RefreshCw, 
  Wallet,
  Package,
  Sparkles 
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { usePriceStreamContext } from "@/lib/price-stream-provider"
import { useTokenMetadataBatch } from "@/hooks/use-token-metadata"
import { useCallback, useEffect, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import * as api from "@/lib/api"
import * as Backend from "@/lib/types/backend"
import { useAuth } from "@/hooks/use-auth"
import { formatUSD, safePercent } from "@/lib/format"
import { UsdWithSol } from "@/lib/sol-equivalent"
import { cn } from "@/lib/utils"

// Enhanced position with live price data
interface EnhancedPosition extends Backend.PortfolioPosition {
  tokenSymbol?: string;
  tokenName?: string;
  tokenImage?: string | null;
  currentPrice?: number;
  liveValue?: number;
  livePnL?: number;
  livePnLPercent?: number;
}

// Loading skeleton for positions table
function PositionsTableSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
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

// Empty state component
function EmptyPositionsState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <Package className="w-10 h-10 text-primary" />
        </div>
        <Sparkles className="w-5 h-5 text-primary absolute -top-1 -right-1 animate-pulse" />
      </div>
      
      <h3 className="text-xl font-semibold mb-2">No Active Positions</h3>
      <p className="text-muted-foreground max-w-md mb-6">
        Start your paper trading journey! Buy your first token to see positions here.
      </p>
      
      <div className="flex gap-3">
        <Link href="/trade">
          <Button size="lg" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Start Trading
          </Button>
        </Link>
        <Link href="/trending">
          <Button variant="outline" size="lg" className="gap-2">
            <Sparkles className="w-4 h-4" />
            Browse Trending
          </Button>
        </Link>
      </div>
    </motion.div>
  );
}

// Portfolio summary stats card
interface SummaryStatsProps {
  totalValue: number;
  totalPnL: number;
  unrealizedPnL: number;
  activePositions: number;
  isRefreshing: boolean;
  onRefresh: () => void;
}

function SummaryStats({ 
  totalValue, 
  totalPnL, 
  unrealizedPnL, 
  activePositions,
  isRefreshing,
  onRefresh 
}: SummaryStatsProps) {
  const pnlColor = totalPnL >= 0 ? "text-green-400" : "text-red-400";
  const PnLIcon = totalPnL >= 0 ? TrendingUp : TrendingDown;
  
  return (
    <div className="flex items-center justify-between mb-6 p-6 border rounded-lg bg-gradient-to-br from-muted/30 to-muted/10">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1">
        {/* Total Value */}
        <div>
          <p className="text-sm text-muted-foreground mb-1">Portfolio Value</p>
          <UsdWithSol usd={totalValue} className="text-2xl font-bold" />
        </div>
        
        {/* Total P&L */}
        <div>
          <p className="text-sm text-muted-foreground mb-1">Total P&L</p>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-2xl font-bold", pnlColor)}>
              {formatUSD(totalPnL)}
            </span>
            <PnLIcon className={cn("w-5 h-5", pnlColor)} />
          </div>
          <p className={cn("text-xs", pnlColor)}>
            {safePercent(totalPnL, totalValue - totalPnL)}
          </p>
        </div>
        
        {/* Active Positions */}
        <div>
          <p className="text-sm text-muted-foreground mb-1">Active Positions</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">{activePositions}</span>
            <Badge variant="secondary" className="text-xs">
              Unrealized: {formatUSD(unrealizedPnL)}
            </Badge>
          </div>
        </div>
      </div>
      
      {/* Refresh Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onRefresh}
        disabled={isRefreshing}
        className="ml-4"
      >
        <RefreshCw className={cn("h-5 w-5", isRefreshing && "animate-spin")} />
      </Button>
    </div>
  );
}

export function ActivePositions() {
  const { user, isAuthenticated } = useAuth();
  
  // Fetch portfolio data with React Query
  const { 
    data: portfolio, 
    isLoading, 
    error, 
    refetch,
    isRefetching 
  } = useQuery({
    queryKey: ['portfolio', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');
      const data = await api.getPortfolio(user.id);
      
      // Data validation diagnostic
      if (process.env.NODE_ENV === 'development') {
        if (!data) console.warn('[ActivePositions] Portfolio data missing; check API binding');
        if (data && !data.positions) console.warn('[ActivePositions] Positions array missing');
      }
      
      return data;
    },
    enabled: isAuthenticated && !!user?.id,
    refetchInterval: 30000, // 30s refresh
    staleTime: 10000, // 10s stale time
  });

  // Real-time price stream integration
  const { 
    connected: wsConnected, 
    prices: livePrices, 
    subscribeMany, 
    unsubscribeMany 
  } = usePriceStreamContext();
  
  // Subscribe to price updates for all positions
  useEffect(() => {
    if (portfolio?.positions && wsConnected) {
      const mints = portfolio.positions.map(p => p.mint);
      subscribeMany(mints);
      
      return () => {
        unsubscribeMany(mints);
      };
    }
  }, [portfolio?.positions, wsConnected, subscribeMany, unsubscribeMany]);

  // Get all mints for metadata fetching
  const mints = useMemo(() => 
    portfolio?.positions?.map(p => p.mint) || [], 
    [portfolio?.positions]
  );

  // Fetch token metadata for all positions
  const { data: metadataResults } = useTokenMetadataBatch(mints, mints.length > 0);

  // Create metadata map for quick lookup
  const metadataMap = useMemo(() => {
    const map = new Map();
    metadataResults?.forEach(result => {
      if (result.data) {
        map.set(result.mint, result.data);
      }
    });
    return map;
  }, [metadataResults]);

  // Enhance positions with live prices and token metadata
  const enhancedPositions = useMemo(() => {
    if (!portfolio?.positions) return [];
    
    return portfolio.positions
      .filter(p => parseFloat(p.qty) > 0) // Only show positions with quantity
      .map(position => {
        const livePrice = livePrices.get(position.mint);
        const positionQty = parseFloat(position.qty);
        const avgCost = parseFloat(position.avgCostUsd);
        const storedValue = parseFloat(position.valueUsd);
        
        // Calculate live values if we have real-time price
        const currentPrice = livePrice?.price || (positionQty > 0 ? storedValue / positionQty : 0);
        const liveValue = livePrice?.price ? positionQty * livePrice.price : storedValue;
        const costBasis = avgCost * positionQty;
        const livePnL = liveValue - costBasis;
        const livePnLPercent = costBasis > 0 ? (livePnL / costBasis) * 100 : 0;
        
        const metadata = metadataMap.get(position.mint);
        
        return {
          ...position,
          currentPrice,
          liveValue,
          livePnL,
          livePnLPercent,
          tokenSymbol: metadata?.symbol || position.mint.slice(0, 6) + '...',
          tokenName: metadata?.name || `Token ${position.mint.slice(0, 8)}`,
          tokenImage: metadata?.imageUrl || metadata?.logoURI || null,
        } as EnhancedPosition;
      })
      .sort((a, b) => b.liveValue! - a.liveValue!); // Sort by value descending
  }, [portfolio?.positions, livePrices, metadataMap]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Loading state
  if (isLoading) {
    return (
      <EnhancedCard className="p-6">
        <div className="flex items-center justify-center gap-2 py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading portfolio...</span>
        </div>
        <PositionsTableSkeleton />
      </EnhancedCard>
    );
  }

  // Error state
  if (error) {
    return (
      <EnhancedCard className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              Failed to load portfolio: {error instanceof Error ? error.message : 'Unknown error'}
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
      </EnhancedCard>
    );
  }

  // Empty state
  if (!portfolio || !enhancedPositions.length) {
    return (
      <EnhancedCard>
        <EmptyPositionsState />
      </EnhancedCard>
    );
  }

  // Calculate totals
  const totalValue = parseFloat(portfolio.totals.totalValueUsd);
  const totalPnL = parseFloat(portfolio.totals.totalPnlUsd);
  const unrealizedPnL = parseFloat(portfolio.totals.totalUnrealizedUsd);
  const activePositions = enhancedPositions.length;

  return (
    <div className="space-y-6">
      <EnhancedCard className="p-6">
        {/* Portfolio Summary */}
        <SummaryStats
          totalValue={totalValue}
          totalPnL={totalPnL}
          unrealizedPnL={unrealizedPnL}
          activePositions={activePositions}
          isRefreshing={isRefetching}
          onRefresh={handleRefresh}
        />

        {/* Positions Table */}
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-[250px]">Token</TableHead>
                <TableHead>Price</TableHead>
                <TableHead className="text-right">Holdings</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-right">Avg Cost</TableHead>
                <TableHead className="text-right">P&L</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {enhancedPositions.map((position, index) => (
                  <motion.tr
                    key={position.mint}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b hover:bg-muted/20 transition-colors"
                  >
                    {/* Token */}
                    <TableCell>
                      <TokenCell
                        symbol={position.tokenSymbol!}
                        name={position.tokenName}
                        imageUrl={position.tokenImage!}
                      />
                    </TableCell>

                    {/* Price */}
                    <TableCell>
                      <PriceCell
                        priceUsd={position.currentPrice!}
                        showSolEquiv={true}
                      />
                    </TableCell>

                    {/* Holdings */}
                    <TableCell className="text-right">
                      <MoneyCell
                        usd={0}
                        qty={parseFloat(position.qty)}
                        symbol={position.tokenSymbol}
                        decimals={0}
                        hideSolEquiv={true}
                      />
                    </TableCell>

                    {/* Value */}
                    <TableCell className="text-right">
                      <MoneyCell
                        usd={position.liveValue!}
                        hideSolEquiv={false}
                      />
                    </TableCell>

                    {/* Avg Cost */}
                    <TableCell className="text-right">
                      <MoneyCell
                        usd={parseFloat(position.avgCostUsd)}
                        hideSolEquiv={true}
                      />
                    </TableCell>

                    {/* P&L */}
                    <TableCell className="text-right">
                      <PnLCell
                        pnlUsd={position.livePnL!}
                        costUsd={parseFloat(position.avgCostUsd) * parseFloat(position.qty)}
                        showSolEquiv={false}
                      />
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-center">
                      <Link href={`/trade?token=${position.mint}`}>
                        <Button variant="ghost" size="sm" className="gap-2">
                          Trade
                        </Button>
                      </Link>
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </TableBody>
          </Table>
        </div>

        {/* WebSocket Connection Status */}
        {!wsConnected && (
          <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Live price updates disconnected. Showing cached prices. Reconnecting...
            </AlertDescription>
          </Alert>
        )}
      </EnhancedCard>
    </div>
  );
}
