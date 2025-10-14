"use client"

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts"
import { Loader2, AlertCircle } from "lucide-react"
import { useState, useMemo, useEffect, useCallback, memo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/hooks/use-auth"
import { usePriceStreamContext } from "@/lib/price-stream-provider"
import * as api from "@/lib/api"
import { formatUSD } from "@/lib/format"
import { PortfolioValue } from "@/components/ui/financial-value"
import type * as Backend from "@/lib/types/backend"

interface ChartData {
  date: string;
  value: number;
  formattedDate: string;
}

function PortfolioChartComponent() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d')
  
  const { user, isAuthenticated, getUserId } = useAuth()
  
  // Get SOL price for equivalents
  const { prices: livePrices } = usePriceStreamContext()
  const solPrice = livePrices.get('So11111111111111111111111111111111111111112')?.price || 0

  // Calculate days for API call
  const periodDays = period === '7d' ? 7 : period === '30d' ? 30 : 90

  // Use React Query to fetch portfolio performance data
  const { data: performanceResponse, isLoading, error, refetch } = useQuery<Backend.PortfolioPerformanceResponse>({
    queryKey: ['portfolio-performance', user?.id, periodDays],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated')
      const userId = getUserId()
      if (!userId) throw new Error('User ID not available')
      
      return await api.getPortfolioPerformance(userId, periodDays)
    },
    enabled: isAuthenticated && !!user,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  })

  // Memoize chart data generation
  const chartData: ChartData[] = useMemo(() => {
    if (!performanceResponse?.performance || performanceResponse.performance.length === 0) return []
    
    return performanceResponse.performance.map((point) => ({
      date: point.date,
      value: typeof point.value === 'string' ? parseFloat(point.value) : point.value,
      formattedDate: new Date(point.date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })
    }))
  }, [performanceResponse])

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

  if (error) {
    return (
      <div className="h-[300px] w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <AlertCircle className="h-8 w-8" />
          <span className="text-sm">Failed to load performance data</span>
          <button
            onClick={() => refetch()}
            className="text-xs text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (chartData.length === 0) {
    return (
      <div className="h-[300px] w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="p-4 bg-muted rounded-full">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">No trading activity yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Start trading to see your portfolio performance
            </p>
          </div>
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
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis 
              dataKey="formattedDate" 
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
              label={{ 
                value: 'Portfolio Value ($)', 
                angle: -90, 
                position: 'insideLeft', 
                style: { fontSize: 12, fill: 'hsl(var(--muted-foreground))' } 
              }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload
                  return (
                    <div className="rounded-lg border border-border bg-background p-3 shadow-lg">
                      <p className="text-xs text-muted-foreground mb-2">{data.formattedDate}</p>
                      <div>
                        <p className="font-mono text-sm font-semibold text-foreground">
                          {formatUSD(Number(data.value))}
                        </p>
                        <PortfolioValue 
                          usd={Number(data.value)} 
                          className="text-xs text-muted-foreground"
                          showSolEquivalent={true}
                        />
                      </div>
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
              activeDot={{ r: 6, fill: "hsl(var(--primary))", strokeWidth: 2, stroke: "hsl(var(--background))" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export const PortfolioChart = memo(PortfolioChartComponent)