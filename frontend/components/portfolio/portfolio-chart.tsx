"use client"

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { usePortfolioPerformance } from "@/lib/api-hooks"
import { Loader2, AlertCircle } from "lucide-react"
import { useState, useMemo } from "react"

export function PortfolioChart() {
  const [period, setPeriod] = useState<'30d' | '7d' | '90d'>('30d')
  const { data: performance, isLoading, error } = usePortfolioPerformance(period)

  // Memoize chart data generation to avoid recalculation on every render
  const chartData = useMemo(() => {
    return performance?.tradeHistory?.map((trade, index) => ({
      time: new Date(trade.timestamp).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      }),
      value: parseFloat(trade.totalCost || '0'),
      pnl: parseFloat(trade.realizedPnL || '0'),
      index
    })) || []
  }, [performance])

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
            {error ? 'Failed to load data' : 'No trading history available'}
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
              tickFormatter={(value) => `${Number(value).toFixed(2)} SOL`}
              label={{ value: 'Spend (SOL)', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: 'hsl(var(--muted-foreground))' } }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload
                  return (
                    <div className="rounded-lg border border-border bg-background p-3 shadow-lg">
                      <p className="text-xs text-muted-foreground">{data.time}</p>
                      <p className="font-mono text-sm font-semibold text-foreground">
                        Spend: {Number(data.value).toFixed(4)} SOL
                      </p>
                      {data.pnl !== 0 && (
                        <p className={`font-mono text-xs ${
                          data.pnl > 0 ? 'text-green-500' : 'text-red-500'
                        }`}>
                          PnL: {data.pnl > 0 ? '+' : ''}{Number(data.pnl).toFixed(4)} SOL
                        </p>
                      )}
                    </div>
                  )
                }
                return null
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
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
