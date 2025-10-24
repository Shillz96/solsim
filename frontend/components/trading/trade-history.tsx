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
import { useTradingMode } from "@/lib/trading-mode-context"
import { usePriceStreamContext } from "@/lib/price-stream-provider"
import * as api from "@/lib/api"

// ✅ Import standardized table cells instead of manual formatting
import { MoneyCell, PriceCell, QuantityCell, formatUSD } from "@/components/ui/table-cells"

interface TradeHistoryProps {
  tokenAddress?: string
  showHeader?: boolean
  limit?: number
  noCard?: boolean // Don't wrap in Card when already inside CardSection
}

export function TradeHistory({
  tokenAddress,
  showHeader = true,
  limit = 50,
  noCard = false
}: TradeHistoryProps = {}) {
  const [trades, setTrades] = useState<api.TradeHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  
  const { user, isAuthenticated } = useAuth()
  const { tradeMode } = useTradingMode()
  const { prices: livePrices } = usePriceStreamContext()
  
  // Get SOL price for conversions (SOL mint address)
  const solPrice = livePrices.get('So11111111111111111111111111111111111111112')?.price || 0

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
        response = await api.getTokenTrades(tokenAddress, limit, 0, tradeMode)
      } else {
        // Get user's trades
        response = await api.getUserTrades(user.id, limit, 0, tradeMode)
      }
      
      setTrades(response.trades)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }, [limit, tokenAddress, user, isAuthenticated, tradeMode])

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

  if (isLoading) {
    const loadingContent = (
      <div className="flex flex-col items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--mario-red)]" />
        <span className="ml-2 font-bold text-[var(--outline-black)] mt-2">Loading trade history...</span>
      </div>
    )
    return noCard ? loadingContent : <div className="bg-white border-4 border-[var(--outline-black)] rounded-xl shadow-[6px_6px_0_var(--outline-black)] p-6">{loadingContent}</div>
  }

  if (error) {
    const errorContent = (
      <Alert variant="destructive" className="border-3 border-[var(--mario-red)]">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="font-semibold">
          Failed to load trade history: {error}
        </AlertDescription>
      </Alert>
    )
    return noCard ? errorContent : <div className="bg-white border-4 border-[var(--outline-black)] rounded-xl shadow-[6px_6px_0_var(--outline-black)] p-6">{errorContent}</div>
  }

  const content = (
    <>
      {showHeader && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-mario font-bold text-lg text-[var(--outline-black)]">
            {tokenAddress ? "🎮 Token Trades" : "📜 Quest Log"}
          </h3>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadTrades}
            className="border-3 border-[var(--outline-black)] bg-white hover:bg-[var(--mario-red)] hover:text-white shadow-[2px_2px_0_var(--outline-black)] font-bold"
          >
            Refresh
          </Button>
        </div>
      )}

      {trades.length === 0 ? (
        <div className="text-center py-12 bg-[var(--sky-blue)]/10 rounded-lg border-3 border-[var(--outline-black)]">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-[var(--mario-red)]/10 border-3 border-[var(--outline-black)] mb-4">
            <TrendingUp className="h-8 w-8 text-[var(--mario-red)]" />
          </div>
          <h3 className="font-mario font-bold text-lg mb-2 text-[var(--outline-black)]">
            {tokenAddress ? "No Token Trades" : "No Quest History"}
          </h3>
          <p className="text-muted-foreground font-semibold mb-6 max-w-sm mx-auto">
            {tokenAddress
              ? "No trades found for this token. Start trading to see your history here."
              : "Make your first trade to see your quest history here!"
            }
          </p>
          {!tokenAddress && (
            <Button asChild size="lg" className="bg-[var(--mario-red)] hover:bg-[var(--mario-red)]/90 text-white border-3 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)] font-bold">
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
              className="flex items-center justify-between rounded-lg border-3 border-[var(--outline-black)] bg-white p-3 transition-all hover:bg-[var(--sky-blue)]/10 hover:shadow-[3px_3px_0_var(--outline-black)]"
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--outline-black)] ${
                  trade.side === "BUY"
                    ? "bg-[var(--luigi-green)] text-white"
                    : "bg-[var(--mario-red)] text-white"
                }`}>
                  {trade.side === "BUY" ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={trade.side === "BUY" ? "default" : "destructive"} 
                      className={`text-xs font-bold border-2 border-[var(--outline-black)] ${
                        trade.side === "BUY" 
                          ? "bg-[var(--luigi-green)] hover:bg-[var(--luigi-green)]/90"
                          : "bg-[var(--mario-red)] hover:bg-[var(--mario-red)]/90"
                      }`}
                    >
                      {trade.side}
                    </Badge>
                    <span className="font-bold text-[var(--outline-black)]">{trade.symbol || 'Unknown'}</span>
                  </div>
                  <div className="text-sm text-muted-foreground font-semibold">
                    {trade.name || 'Unknown Token'}
                  </div>
                </div>
              </div>

              <div className="text-right flex items-center gap-4">
                {/* ✅ Quantity with standardized formatting */}
                <div>
                  <QuantityCell
                    qty={parseFloat(trade.qty)}
                    symbol={trade.symbol || ''}
                    decimals={6}
                    className="text-sm font-mono font-bold"
                  />
                </div>

                {/* ✅ Price per token with SOL equivalent */}
                <div>
                  <PriceCell
                    priceUSD={parseFloat(trade.priceUsd)}
                    className="text-sm font-bold"
                    showSolEquiv={true}
                  />
                </div>

                {/* ✅ Total cost with SOL equivalent */}
                <div>
                  <MoneyCell
                    usd={parseFloat(trade.costUsd)}
                    className="text-sm font-bold"
                    hideSolEquiv={false}
                  />
                </div>

                {/* Timestamp */}
                <div className="text-xs text-[var(--outline-black)] font-semibold w-16 text-right">
                  {formatTimestamp(trade.createdAt)}
                </div>
              </div>
            </div>
          ))}

          {trades.length > 10 && (
            <Button
              variant="outline"
              className="w-full border-3 border-[var(--outline-black)] bg-white hover:bg-[var(--star-yellow)] hover:text-[var(--outline-black)] shadow-[3px_3px_0_var(--outline-black)] font-bold"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? "Show Less" : `Show All (${trades.length})`}
              <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${showAll ? "rotate-180" : ""}`} />
            </Button>
          )}
        </div>
      )}
    </>
  )

  return noCard ? (
    <div className="space-y-4">{content}</div>
  ) : (
    <div className="bg-white border-4 border-[var(--outline-black)] rounded-xl shadow-[6px_6px_0_var(--outline-black)] p-6 space-y-4">{content}</div>
  )
}