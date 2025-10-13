"use client"

import { useState, useEffect, useCallback, useRef, memo } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, TrendingUp, TrendingDown, Loader2, AlertCircle } from "lucide-react"
import { formatUSD, formatNumber } from "@/lib/format"
import { UsdWithSol } from "@/lib/sol-equivalent"
import { cn } from "@/lib/utils"
import * as api from "@/lib/api"
import * as Backend from "@/lib/types/backend"
import { useAuth } from "@/hooks/use-auth"
import { usePriceStreamContext } from "@/lib/price-stream-provider"

interface VirtualizedTradeHistoryProps {
  tokenAddress?: string
  showHeader?: boolean
  limit?: number
}

function VirtualizedTradeHistoryComponent({ 
  tokenAddress, 
  showHeader = true, 
  limit = 100 
}: VirtualizedTradeHistoryProps = {}) {
  const { user } = useAuth()
  const { prices: livePrices } = usePriceStreamContext()
  const solPrice = livePrices.get('So11111111111111111111111111111111111111112')?.price || 0
  
  const [trades, setTrades] = useState<Backend.EnrichedTrade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  
  const parentRef = useRef<HTMLDivElement>(null)
  const [containerHeight, setContainerHeight] = useState(600)

  // Load trades with memoization
  const loadTrades = useCallback(async (isRefresh = false) => {
    if (!user?.id) return
    
    if (!isRefresh) setLoading(true)
    else setRefreshing(true)
    
    try {
      let response: Backend.TradesResponse
      
      if (tokenAddress) {
        // Get trades for specific token
        response = await api.getTokenTrades(tokenAddress, limit)
      } else {
        // Get all user trades
        response = await api.getUserTrades(user.id, limit)
      }
      
      setTrades(response.trades)
      setError(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user?.id, tokenAddress, limit])

  // Load trades on mount and when dependencies change
  useEffect(() => {
    if (user?.id) {
      loadTrades()
    }
  }, [loadTrades, user?.id])

  // Set container height based on viewport
  useEffect(() => {
    const updateHeight = () => {
      const viewportHeight = window.innerHeight
      const maxHeight = Math.min(viewportHeight * 0.6, 800)
      setContainerHeight(maxHeight)
    }
    
    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [])

  // Initialize virtualizer
  const virtualizer = useVirtualizer({
    count: trades.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72, // Estimated height of each trade row
    overscan: 5, // Render 5 items outside of the visible area
  })

  const handleRefresh = useCallback(() => {
    loadTrades(true)
  }, [loadTrades])

  const formatTimestamp = useCallback((timestamp: string) => {
    const date = new Date(timestamp)
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }, [])

  // Loading state
  if (loading) {
    return (
      <Card className="glass-solid">
        {showHeader && (
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Trade History</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading trades...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className="glass-solid">
        {showHeader && (
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Trade History</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <span className="ml-2 text-muted-foreground">Failed to load trades</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Empty state
  if (trades.length === 0) {
    return (
      <Card className="glass-solid">
        {showHeader && (
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Trade History</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No trades yet. Start trading to see your history here.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass-solid">
      {showHeader && (
        <CardHeader className="pb-4 flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Trade History</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
            className="h-8 w-8"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </Button>
        </CardHeader>
      )}
      
      <CardContent className="p-0">
        {/* Virtual scrollable container */}
        <div
          ref={parentRef}
          className="overflow-auto"
          style={{ height: `${containerHeight}px` }}
        >
          {/* Virtual list container */}
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {/* Render only visible items */}
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const trade = trades[virtualItem.index]
              const realizedPnl = trade.realizedPnL ? parseFloat(trade.realizedPnL) : 0
              const isProfit = realizedPnl > 0

              return (
                <div
                  key={virtualItem.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <div className="px-4 py-3 border-b border-border hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={trade.side === 'BUY' ? 'default' : 'secondary'}
                          className={cn(
                            "font-bold",
                            trade.side === 'BUY' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'
                          )}
                        >
                          {trade.side}
                        </Badge>
                        
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{trade.symbol || 'Unknown'}</span>
                            {trade.realizedPnL && realizedPnl !== 0 && (
                              <div className={cn("flex items-center gap-1", isProfit ? "text-green-500" : "text-red-500")}>
                                {isProfit ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                <span className="text-sm font-medium">
                                  {isProfit ? '+' : ''}{formatUSD(Math.abs(realizedPnl))}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatNumber(parseFloat(trade.qty))} @ {formatUSD(parseFloat(trade.priceUsd))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <UsdWithSol
                          usd={parseFloat(trade.costUsd)}
                          className="font-medium"
                          solClassName="text-xs text-muted-foreground"
                        />
                        <div className="text-xs text-muted-foreground">
                          {formatTimestamp(trade.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export const VirtualizedTradeHistory = memo(VirtualizedTradeHistoryComponent)
