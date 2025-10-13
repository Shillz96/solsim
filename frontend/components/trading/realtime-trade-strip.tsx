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
  autoScroll?: boolean
}

export function RealtimeTradeStrip({ 
  tokenAddress, 
  maxTrades = 15,
  className,
  autoScroll = true 
}: RealtimeTradeStripProps) {
  const [trades, setTrades] = useState<Backend.EnrichedTrade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number | undefined>(undefined)

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

  // Auto-scroll animation for horizontal ticker
  useEffect(() => {
    if (!autoScroll || !scrollRef.current || loading || trades.length === 0) return

    const scrollContainer = scrollRef.current
    let scrollAmount = 0
    
    const animate = () => {
      scrollAmount += 0.5 // Adjust speed as needed
      
      if (scrollAmount >= scrollContainer.scrollWidth / 2) {
        scrollAmount = 0
      }
      
      scrollContainer.scrollLeft = scrollAmount
      animationRef.current = requestAnimationFrame(animate)
    }
    
    // Start animation after a short delay
    const timeout = setTimeout(() => {
      animationRef.current = requestAnimationFrame(animate)
    }, 1000)
    
    return () => {
      clearTimeout(timeout)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [autoScroll, loading, trades])

  const calculatePriceChange = (trade: Backend.EnrichedTrade) => {
    // Calculate a simulated price change for demo purposes
    // In production, this would come from actual price data
    const change = (Math.random() - 0.5) * 30
    return change
  }

  if (loading) {
    return (
      <div className={cn("w-full bg-background border-t border-b py-1.5", className)}>
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
      <div className={cn("w-full bg-background border-t border-b py-2", className)}>
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

  // Duplicate trades for seamless scrolling
  const displayTrades = trades.length > 0 ? [...trades, ...trades] : []

  return (
    <div 
      className={cn(
        "w-full bg-background border-t border-b overflow-hidden",
        "hover:pause-animation group",
        className
      )}
      onMouseEnter={() => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current)
        }
      }}
      onMouseLeave={() => {
        if (autoScroll && scrollRef.current && trades.length > 0) {
          const scrollContainer = scrollRef.current
          let scrollAmount = scrollContainer.scrollLeft
          
          const animate = () => {
            scrollAmount += 0.5
            
            if (scrollAmount >= scrollContainer.scrollWidth / 2) {
              scrollAmount = 0
            }
            
            scrollContainer.scrollLeft = scrollAmount
            animationRef.current = requestAnimationFrame(animate)
          }
          
          animationRef.current = requestAnimationFrame(animate)
        }
      }}
    >
      <div
        ref={scrollRef}
        className="flex items-center py-2 px-2 space-x-6 overflow-x-auto scrollbar-none"
        style={{ scrollBehavior: 'auto' }}
      >
        {displayTrades.length === 0 ? (
          <div className="flex items-center justify-center w-full py-1 text-sm text-muted-foreground">
            No recent trades
          </div>
        ) : (
           displayTrades.map((trade, index) => {
             const priceChange = calculatePriceChange(trade)
             const isPositive = priceChange >= 0
             const price = parseFloat(trade.priceUsd) || (parseFloat(trade.totalCost) / parseFloat(trade.qty))
            
            return (
              <div 
                key={`${trade.id}-${index}`}
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
                
                <span 
                  className={cn(
                    "text-sm font-medium",
                    isPositive ? "text-green-500" : "text-red-500"
                  )}
                >
                  {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}