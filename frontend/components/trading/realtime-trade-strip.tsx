"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { cn } from "@/lib/utils"
import * as api from "@/lib/api"
import * as Backend from "@/lib/types/backend"
import { formatNumber } from "@/lib/format"

interface RealtimeTradeStripProps {
  tokenAddress?: string
  maxTrades?: number
  className?: string
  style?: React.CSSProperties
}

export function RealtimeTradeStrip({ 
  tokenAddress, 
  maxTrades = 15,
  className,
  style 
}: RealtimeTradeStripProps) {
  const [trades, setTrades] = useState<Backend.EnrichedTrade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load recent trades
  const loadTrades = useCallback(async () => {
    setLoading(true)
    
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
    }
  }, [tokenAddress, maxTrades])

  // Load trades on mount and when tokenAddress changes
  useEffect(() => {
    loadTrades()
  }, [loadTrades])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadTrades()
    }, 30000)
    
    return () => clearInterval(interval)
  }, [loadTrades])



  if (loading) {
    return (
      <div className={cn("w-full bg-background border-t border-b py-1.5", className)} style={style}>
        <div className="flex items-center space-x-6 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center space-x-2">
              <div className="w-12 h-3 bg-muted rounded" />
              <div className="w-16 h-3 bg-muted rounded" />
              <div className="w-12 h-3 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn("w-full bg-background border-t border-b py-2", className)} style={style}>
        <div className="flex items-center justify-center text-sm text-muted-foreground">
          <span>Unable to load trades</span>
          <button
            onClick={() => loadTrades()}
            className="ml-2 underline hover:text-foreground transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div 
      className={cn(
        "w-full bg-background border-t border-b overflow-hidden",
        className
      )}
      style={style}
    >
      <div className="flex items-center py-2 px-2 space-x-6 overflow-x-auto scrollbar-none">
        {trades.length === 0 ? (
          <div className="flex items-center justify-center w-full py-1 text-sm text-muted-foreground">
            No recent trades
          </div>
        ) : (
           trades.map((trade) => {
             const price = parseFloat(trade.priceUsd) || (parseFloat(trade.totalCost) / parseFloat(trade.qty))
            
            return (
              <div 
                key={trade.id}
                className="flex items-center space-x-2 whitespace-nowrap flex-shrink-0"
              >
                {trade.logoURI && (
                  <img 
                    src={trade.logoURI} 
                    alt={trade.symbol || 'Token'} 
                    className="w-4 h-4 rounded-full"
                  />
                )}
                
                <span className="font-medium text-sm">
                  {trade.symbol || 'Unknown'}
                </span>
                
                <span className="text-sm text-muted-foreground">
                  ${formatNumber(price)}
                </span>
                
                <span className={cn(
                  "text-xs font-medium px-2 py-1 rounded",
                  trade.side === 'BUY' ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                )}>
                  {trade.side}
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}