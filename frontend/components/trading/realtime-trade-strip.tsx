"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { RefreshCw, TrendingUp, TrendingDown, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import * as api from "@/lib/api"
import * as Backend from "@/lib/types/backend"

interface RealtimeTradeStripProps {
  tokenAddress?: string
  maxTrades?: number
  className?: string
}

export function RealtimeTradeStrip({ 
  tokenAddress, 
  maxTrades = 10,
  className 
}: RealtimeTradeStripProps) {
  const [trades, setTrades] = useState<Backend.EnrichedTrade[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load recent trades
  const loadTrades = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true)
    else setRefreshing(true)
    
    try {
      let response: Backend.TradesResponse
      
      if (tokenAddress) {
        // Get trades for specific token
        response = await api.getTokenTrades(tokenAddress, maxTrades)
      } else {
        // Get recent trades globally
        response = await api.getTrades(maxTrades)
      }
      
      setTrades(response.trades)
      setError(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Load trades on mount and when tokenAddress changes
  useEffect(() => {
    loadTrades()
  }, [tokenAddress, maxTrades])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadTrades(true)
    }, 30000)
    
    return () => clearInterval(interval)
  }, [tokenAddress, maxTrades])

  const formatTime = (timestamp: string) => {
    const now = new Date()
    const tradeTime = new Date(timestamp)
    const diffMs = now.getTime() - tradeTime.getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)

    if (diffSeconds < 60) return `${diffSeconds}s ago`
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return tradeTime.toLocaleDateString()
  }

  const formatNumber = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`
    return num.toFixed(2)
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center">
            <Clock className="h-4 w-4 mr-2" />
            Recent Trades
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 animate-pulse">
                <div className="w-20 h-4 bg-muted rounded" />
                <div className="w-16 h-4 bg-muted rounded" />
                <div className="w-12 h-4 bg-muted rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span className="flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              Recent Trades
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => loadTrades(true)}
              disabled={refreshing}
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-muted-foreground text-sm">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadTrades()}
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center">
            <Clock className="h-4 w-4 mr-2" />
            Recent Trades {tokenAddress && '(This Token)'}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadTrades(true)}
            disabled={refreshing}
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-[300px]">
          <div className="space-y-2">
            {trades.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground text-sm">No recent trades</p>
              </div>
            ) : (
              trades.map((trade) => (
                <div
                  key={trade.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    {trade.logoURI && (
                      <img 
                        src={trade.logoURI} 
                        alt={trade.symbol || 'Token'} 
                        className="w-6 h-6 rounded-full"
                      />
                    )}
                    <div>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant={trade.side === 'BUY' ? 'default' : 'destructive'}
                          className="text-xs px-2 py-0"
                        >
                          {trade.side}
                        </Badge>
                        <span className="text-sm font-medium">
                          {trade.symbol || 'Unknown'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(trade.createdAt)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {formatNumber(trade.quantity)} tokens
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ${formatNumber(trade.costUsd || trade.totalCost)}
                    </p>
                  </div>
                  
                  <div className="flex items-center">
                    {trade.side === 'BUY' ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}