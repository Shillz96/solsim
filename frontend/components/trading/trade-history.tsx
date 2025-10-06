"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowUpRight, ArrowDownRight, ChevronDown, Loader2, AlertCircle } from "lucide-react"
import { useTradeHistory } from "@/lib/api-hooks"
import type { Trade } from "@/lib/types/api-types"

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
  const { data: tradeHistory, isLoading: loading, error, refetch: refresh } = useTradeHistory(limit)
  const [showAll, setShowAll] = useState(false)

  // Filter trades by token address if specified
  const filteredTrades = tokenAddress 
    ? tradeHistory?.trades.filter(trade => trade.tokenAddress === tokenAddress) || []
    : tradeHistory?.trades || []

  const displayTrades = showAll ? filteredTrades : filteredTrades.slice(0, 10)

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

  if (loading) {
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
            Failed to load trade history: {error?.message || 'Unknown error'}
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
          <Button variant="ghost" size="sm" onClick={() => refresh()}>
            Refresh
          </Button>
        </div>
      )}

      {filteredTrades.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          {tokenAddress ? "No trades found for this token" : "No trades yet"}
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
                  trade.action === "BUY" 
                    ? "bg-green-100 text-green-600 dark:bg-green-900/20" 
                    : "bg-red-100 text-red-600 dark:bg-red-900/20"
                }`}>
                  {trade.action === "BUY" ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant={trade.action === "BUY" ? "default" : "destructive"} className="text-xs">
                      {trade.action}
                    </Badge>
                    <span className="font-medium">{trade.tokenSymbol || 'Unknown'}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {trade.tokenName || 'Unknown Token'}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="flex items-center gap-2">
                  <div>
                    <div className="font-mono text-sm">
                      {parseFloat(trade.quantity).toLocaleString()} tokens
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ${parseFloat(trade.price).toFixed(8)}
                    </div>
                  </div>
                  <div>
                    <div className="font-mono text-sm font-medium">
                      {parseFloat(trade.totalCost).toFixed(4)} SOL
                    </div>
                    {trade.realizedPnL && (
                      <div className={`text-xs ${
                        parseFloat(trade.realizedPnL) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {parseFloat(trade.realizedPnL) >= 0 ? '+' : ''}{formatPnL(trade.realizedPnL)} SOL
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground w-16 text-right">
                    {formatTimestamp(trade.timestamp)}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredTrades.length > 10 && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? "Show Less" : `Show All (${filteredTrades.length})`}
              <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${showAll ? "rotate-180" : ""}`} />
            </Button>
          )}
        </div>
      )}
    </Card>
  )
}