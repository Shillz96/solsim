"use client"

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Loader2, AlertCircle } from "lucide-react"
import { useState, useMemo, useEffect, useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/hooks/use-auth"
import * as api from "@/lib/api"

interface TradeData {
  time: string;
  value: number;
  cumulative: number;
  index: number;
}

export function PortfolioChart() {
  const [period, setPeriod] = useState<'30d' | '7d' | '90d'>('30d')
  const [trades, setTrades] = useState<api.TradeHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
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
      
      // Calculate limit based on period (more trades for longer periods)
      const limit = period === '7d' ? 50 : period === '30d' ? 100 : 200
      
      const response = await api.getUserTrades(user.id, limit)
      
      // Filter trades by date based on period
      const now = new Date()
      const periodDays = period === '7d' ? 7 : period === '30d' ? 30 : 90
      const cutoffDate = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000)
      
      const filteredTrades = response.trades.filter(trade => 
        new Date(trade.createdAt) >= cutoffDate
      )
      
      setTrades(filteredTrades.reverse()) // Chronological order (oldest first)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }, [period, user, isAuthenticated])

  useEffect(() => {
    loadTrades()
  }, [loadTrades])

  // Memoize chart data generation to avoid recalculation on every render
  const chartData: TradeData[] = useMemo(() => {
    let cumulativeValue = 0
    
    return trades.map((trade, index) => {
      const tradeValue = parseFloat(trade.costUsd)
      
      // Add to cumulative if it's a buy, subtract if it's a sell
      if (trade.side === 'BUY') {
        cumulativeValue += tradeValue
      } else {
        cumulativeValue -= tradeValue
      }
      
      return {
        time: new Date(trade.createdAt).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        }),
        value: tradeValue,
        cumulative: cumulativeValue,
        index
      }
    })
  }, [trades])

  if (isLoading) {
    return (
      <div className="h-[300px] w-full flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading performance data...</span>
        </div>
      </div>
    )
  }

  if (error || chartData.length === 0) {
    return (
      <div className="h-[300px] w-full flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">
            {error ? `Failed to load data: ${error}` : 'No trading history available'}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex gap-2">
        {(['7d', '30d', '90d'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              period === p
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <XAxis 
              dataKey="time" 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `$${Number(value).toFixed(0)}`}
              label={{ value: 'Trade Value ($)', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: 'hsl(var(--muted-foreground))' } }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload
                  return (
                    <div className="rounded-lg border border-border bg-background p-3 shadow-lg">
                      <p className="text-xs text-muted-foreground">{data.time}</p>
                      <p className="font-mono text-sm font-semibold text-foreground">
                        Trade: ${Number(data.value).toFixed(2)}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground">
                        Cumulative: ${Number(data.cumulative).toFixed(2)}
                      </p>
                    </div>
                  )
                }
                return null
              }}
            />
            <Line
              type="monotone"
              dataKey="cumulative"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "hsl(var(--primary))" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}