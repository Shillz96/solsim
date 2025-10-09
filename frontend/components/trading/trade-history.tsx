"use client"

import { useState, useEffect, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowUpRight, ArrowDownRight, ChevronDown, Loader2, AlertCircle, TrendingUp } from "lucide-react"
import Link from "next/link"
import { AnimatedNumber } from "@/components/ui/animated-number"
import { useAuth } from "@/hooks/use-auth"
import * as api from "@/lib/api"

interface TradeHistoryProps {
  tokenAddress?: string
  showHeader?: boolean
  limit?: number
}

export function TradeHistory({ 
  tokenAddress, 
  showHeader = true, 
  limit = 50 
}: TradeHistoryProps = {}) {
  const [trades, setTrades] = useState<api.TradeHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  
  const { user, isAuthenticated } = useAuth()

  // Load trade history from actual backend API
  const loadTrades = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setError("Please login to view trade history")
      setIsLoading(false)
      return
    }

    try {
      setError(null)
      setIsLoading(true)

      let response: api.TradesResponse
      
      if (tokenAddress) {
        // Get trades for specific token
        response = await api.getTokenTrades(tokenAddress, limit)
      } else {
        // Get user's trades
        response = await api.getUserTrades(user.id, limit)
      }
      
      setTrades(response.trades)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }, [limit, tokenAddress, user, isAuthenticated])

  useEffect(() => {
    loadTrades()
  }, [loadTrades])

  // Trades are already filtered by the API call
  const displayTrades = showAll ? trades : trades.slice(0, 10)

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  const formatPnL = (realizedPnL: string | null) => {
    if (!realizedPnL) return null
    const pnl = parseFloat(realizedPnL)
    return pnl.toFixed(4)
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading trade history...</span>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load trade history: {error}
          </AlertDescription>
        </Alert>
      </Card>
    )
  }

  return (
    <Card className="p-6 space-y-4">
      {showHeader && (
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">
            {tokenAddress ? "Token Trade History" : "Recent Trades"}
          </h3>
          <Button variant="ghost" size="sm" onClick={loadTrades}>
            Refresh
          </Button>
        </div>
      )}

      {trades.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
            <TrendingUp className="h-8 w-8 text-primary" />
          </div>
          <h3 className="font-semibold text-lg mb-2">
            {tokenAddress ? "No Token Trades" : "No Trade History"}
          </h3>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
            {tokenAddress 
              ? "No trades found for this token. Start trading to see your history here."
              : "Make your first trade to see your transaction history here."
            }
          </p>
          {!tokenAddress && (
            <Button asChild size="lg">
              <Link href="/trade">
                <TrendingUp className="mr-2 h-4 w-4" />
                Start Trading
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {displayTrades.map((trade) => (
            <div
              key={trade.id}
              className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  trade.side === "BUY" 
                    ? "bg-green-100 text-green-600 dark:bg-green-900/20" 
                    : "bg-red-100 text-red-600 dark:bg-red-900/20"
                }`}>
                  {trade.side === "BUY" ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant={trade.side === "BUY" ? "default" : "destructive"} className="text-xs">
                      {trade.side}
                    </Badge>
                    <span className="font-medium">{trade.symbol || 'Unknown'}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {trade.name || 'Unknown Token'}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="flex items-center gap-2">
                  <div>
                    <div className="font-mono text-sm">
                      {parseFloat(trade.qty).toLocaleString()} tokens
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ${parseFloat(trade.priceUsd).toFixed(8)}
                    </div>
                  </div>
                  <div>
                    <div className="font-mono text-sm font-medium">
                      ${parseFloat(trade.costUsd).toFixed(2)}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground w-16 text-right">
                    {formatTimestamp(trade.createdAt)}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {trades.length > 10 && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? "Show Less" : `Show All (${trades.length})`}
              <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${showAll ? "rotate-180" : ""}`} />
            </Button>
          )}
        </div>
      )}
    </Card>
  )
}