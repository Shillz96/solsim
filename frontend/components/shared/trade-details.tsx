"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  TrendingUp, 
  TrendingDown, 
  Coins, 
  Clock, 
  User, 
  Activity,
  Loader2, 
  AlertCircle, 
  RefreshCw
} from "lucide-react"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { formatDistanceToNow } from "date-fns"
import * as api from "@/lib/api"
import * as Backend from "@/lib/types/backend"
import { AnimatedNumber } from "@/components/ui/animated-number"

interface TradeDetailsProps {
  tokenAddress: string
  tokenSymbol?: string
  tokenName?: string
}

export function TradeDetails({ 
  tokenAddress,
  tokenSymbol,
  tokenName
}: TradeDetailsProps) {
  const [limit] = useState(10) // Show last 10 trades
  
  // Fetch recent trades for this specific token
  const { 
    data: tradesData, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['token-trades', tokenAddress, limit],
    queryFn: () => api.getTokenTrades(tokenAddress, limit, 0),
    staleTime: 30000, // Cache for 30 seconds
    retry: 2,
  })

  const trades = tradesData?.trades || []

  // Calculate some statistics from the trades
  const stats = trades.length > 0 ? {
    totalVolume: trades.reduce((sum, trade) => sum + parseFloat(trade.totalCost), 0),
    buyTrades: trades.filter(trade => trade.action === 'BUY').length,
    sellTrades: trades.filter(trade => trade.action === 'SELL').length,
    avgPrice: trades.length > 0 
      ? trades.reduce((sum, trade) => sum + parseFloat(trade.price), 0) / trades.length 
      : 0,
    priceRange: trades.length > 0 ? {
      high: Math.max(...trades.map(trade => parseFloat(trade.price))),
      low: Math.min(...trades.map(trade => parseFloat(trade.price)))
    } : null
  } : null

  const formatCurrency = (value: number, decimals = 6) => {
    if (value < 0.000001) return '<$0.000001'
    if (value < 1) return `$${value.toFixed(decimals)}`
    if (value < 1000) return `$${value.toFixed(2)}`
    if (value < 1000000) return `$${(value / 1000).toFixed(1)}K`
    return `$${(value / 1000000).toFixed(1)}M`
  }

  const formatQuantity = (quantity: string) => {
    const num = parseFloat(quantity)
    if (num < 1) return num.toFixed(6)
    if (num < 1000) return num.toFixed(2)
    if (num < 1000000) return `${(num / 1000).toFixed(1)}K`
    return `${(num / 1000000).toFixed(1)}M`
  }

  if (isLoading) {
    return (
      <Card className="border border-border rounded-none shadow-none min-h-[300px]">
        <CardContent className="flex items-center justify-center h-full p-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading trade details...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border border-border rounded-none shadow-none">
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{(error as Error).message || 'Failed to load trade details'}</span>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border border-border rounded-none shadow-none">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <CardTitle className="text-lg">Trade Details</CardTitle>
          </div>
          <Badge variant="secondary" className="text-xs">
            {trades.length} Recent
          </Badge>
        </div>
        
        {/* Quick Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-border">
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Volume (SOL)</div>
              <div className="font-mono text-sm font-medium">
                <AnimatedNumber value={stats.totalVolume} decimals={2} />
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Buy/Sell</div>
              <div className="font-mono text-sm font-medium">
                <span className="text-green-500">{stats.buyTrades}</span>
                /
                <span className="text-red-500">{stats.sellTrades}</span>
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Avg Price</div>
              <div className="font-mono text-sm font-medium">
                {formatCurrency(stats.avgPrice)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Range</div>
              <div className="font-mono text-xs">
                {stats.priceRange ? (
                  <>
                    <div className="text-green-500">{formatCurrency(stats.priceRange.high)}</div>
                    <div className="text-red-500">{formatCurrency(stats.priceRange.low)}</div>
                  </>
                ) : (
                  '-'
                )}
              </div>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {trades.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No recent trades for this token</p>
            <p className="text-xs mt-1">
              {tokenSymbol ? `${tokenSymbol} trades will appear here` : 'Trade activity will appear here'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {trades.map((trade, index) => {
              const isRecent = index < 3 // Highlight the 3 most recent trades
              const timeAgo = formatDistanceToNow(new Date(trade.timestamp), { addSuffix: true })
              
              return (
                <div
                  key={trade.id}
                  className={`
                    rounded-none border p-3 transition-colors hover:border-primary/50
                    ${isRecent ? 'border-primary/20 bg-primary/5' : 'border-border bg-card'}
                  `}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={trade.action === 'BUY' ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {trade.action === 'BUY' ? (
                          <TrendingUp className="h-3 w-3 mr-1" />
                        ) : (
                          <TrendingDown className="h-3 w-3 mr-1" />
                        )}
                        {trade.action}
                      </Badge>
                      
                      {trade.user && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>{trade.user.handle || 'Anonymous'}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{timeAgo}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <div className="text-muted-foreground">Quantity</div>
                      <div className="font-mono font-medium flex items-center gap-1">
                        <Coins className="h-3 w-3" />
                        {formatQuantity(trade.quantity)}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-muted-foreground">Price</div>
                      <div className="font-mono font-medium">
                        {formatCurrency(parseFloat(trade.price))}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-muted-foreground">Total (SOL)</div>
                      <div className="font-mono font-medium">
                        {parseFloat(trade.totalCost).toFixed(4)}
                      </div>
                    </div>
                  </div>

                  {trade.realizedPnL && parseFloat(trade.realizedPnL) !== 0 && (
                    <div className="mt-2 pt-2 border-t border-border/50">
                      <div className="text-xs">
                        <span className="text-muted-foreground">P&L: </span>
                        <span className={`font-mono font-medium ${
                          parseFloat(trade.realizedPnL) > 0 ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {parseFloat(trade.realizedPnL) > 0 ? '+' : ''}
                          {parseFloat(trade.realizedPnL).toFixed(4)} SOL
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {trades.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border text-center">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => refetch()}
              className="gap-2"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}