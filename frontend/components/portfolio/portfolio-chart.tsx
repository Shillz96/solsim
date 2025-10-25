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
    if (!performanceResponse?.performance || performanceResponse.performance.length === 0) {
      console.log('No performance data available')
      return []
    }

    const data = performanceResponse.performance.map((point) => ({
      date: point.date,
      value: typeof point.value === 'string' ? parseFloat(point.value) : point.value,
      formattedDate: new Date(point.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      })
    }))

    console.log('Chart data points:', data.length, 'Sample:', data[0])
    return data
  }, [performanceResponse])

  // Calculate value range for better Y-axis scaling
  const valueRange = useMemo(() => {
    if (chartData.length === 0) return { min: 0, max: 100 }

    const values = chartData.map(d => d.value)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const padding = (max - min) * 0.1 || 10 // 10% padding or minimum 10

    return {
      min: Math.max(0, min - padding),
      max: max + padding
    }
  }, [chartData])

  if (isLoading) {
    return (
      <div className="h-[350px] w-full flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading performance data...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-[350px] w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
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
      <div className="h-[350px] w-full flex items-center justify-center">
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
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex gap-2">
        {(['7d', '30d', '90d'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              period === p
                ? 'bg-primary text-primary-foreground shadow-[2px_2px_0_var(--outline-black)]'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--pipe-200)"
              opacity={0.3}
              vertical={false}
            />
            <XAxis
              dataKey="formattedDate"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: 'var(--outline-black)', strokeWidth: 2 }}
              interval="preserveStartEnd"
              tick={{ fill: 'var(--outline-black)', fontWeight: 'bold' }}
              className="text-[var(--outline-black)]"
            />
            <YAxis
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: 'var(--outline-black)', strokeWidth: 2 }}
              tickFormatter={(value) => `$${Number(value).toFixed(0)}`}
              domain={[valueRange.min, valueRange.max]}
              tick={{ fill: 'var(--outline-black)', fontWeight: 'bold' }}
              className="text-[var(--outline-black)]"
              label={{
                value: 'Portfolio Value',
                angle: -90,
                position: 'insideLeft',
                style: {
                  fontSize: 12,
                  fontWeight: 500,
                  fill: 'currentColor'
                },
                className: 'text-foreground'
              }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload
                  return (
                    <div className="rounded-lg border-3 border-[var(--outline-black)] bg-[var(--card)] p-3 shadow-[4px_4px_0_var(--outline-black)]">
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
              stroke="#2ecc71"
              strokeWidth={4}
              dot={chartData.length <= 7}
              activeDot={{
                r: 8,
                fill: "#2ecc71",
                strokeWidth: 3,
                stroke: "#fff"
              }}
              isAnimationActive={true}
              animationDuration={1000}
              animationEasing="ease-in-out"
              connectNulls={true}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export const PortfolioChart = memo(PortfolioChartComponent)