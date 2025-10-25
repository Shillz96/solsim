"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { formatUSD } from "@/lib/format"
import { CheckCircle2, Loader2, TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePriceStreamContext } from "@/lib/price-stream-provider"
import { AnimatedNumber } from "@/components/ui/animated-number"

interface PositionStatsBoxProps {
  tokenAddress: string
  tradeMode?: 'PAPER' | 'REAL'
  className?: string
}

interface TokenStats {
  mint: string
  totalBoughtUsd: string
  totalSoldUsd: string
  currentHoldingValue: string
  currentHoldingQty: string
  costBasis: string
  realizedPnL: string
  unrealizedPnL: string
  totalPnL: string
  totalFeesSol: string
  totalFeesUsd: string
  tradeCount: number
}

export function PositionStatsBox({
  tokenAddress,
  tradeMode = 'PAPER',
  className
}: PositionStatsBoxProps) {
  const { user } = useAuth()
  const { prices: livePrices } = usePriceStreamContext()
  const [stats, setStats] = useState<TokenStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [livePnL, setLivePnL] = useState<number | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      const userId = user?.id
      
      console.log('[PositionStatsBox] Fetching stats:', { userId, tokenAddress, tradeMode })
      
      if (!userId || !tokenAddress) {
        console.log('[PositionStatsBox] Skipping fetch - missing userId or tokenAddress')
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
        const url = `${API_URL}/api/portfolio/token-stats?userId=${userId}&mint=${tokenAddress}&tradeMode=${tradeMode}`
        
        console.log('[PositionStatsBox] Fetching from:', url)
        
        const res = await fetch(url)

        console.log('[PositionStatsBox] Response status:', res.status)

        if (!res.ok) {
          const errorText = await res.text()
          console.error('[PositionStatsBox] Error response:', errorText)
          throw new Error(`Failed to fetch token stats: ${res.status}`)
        }

        const data = await res.json()
        console.log('[PositionStatsBox] Received data:', data)
        setStats(data)
      } catch (err) {
        console.error('[PositionStatsBox] Error fetching token stats:', err)
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()

    // Set up polling to refresh stats every 10 seconds
    const interval = setInterval(() => {
      fetchStats()
    }, 10000)

    return () => clearInterval(interval)
  }, [tokenAddress, tradeMode, user?.id])

  // Update PnL in real-time when price changes
  useEffect(() => {
    if (!stats) return

    const currentPrice = livePrices.get(tokenAddress)?.price
    if (!currentPrice) return

    const qty = parseFloat(stats.currentHoldingQty)
    if (qty <= 0) return

    const costBasis = parseFloat(stats.costBasis)
    const realizedPnL = parseFloat(stats.realizedPnL)

    // Calculate live unrealized PnL
    const liveHoldingValue = qty * currentPrice
    const liveUnrealizedPnL = liveHoldingValue - costBasis
    const liveTotalPnL = realizedPnL + liveUnrealizedPnL

    setLivePnL(liveTotalPnL)
  }, [livePrices, tokenAddress, stats])

  if (loading) {
    return (
      <div className={cn(
        "flex items-center justify-center p-3",
        "bg-gradient-to-br from-yellow-100 to-amber-100",
        "border-4 border-[var(--outline-black)]",
        "shadow-[4px_4px_0_var(--outline-black)]",
        "rounded-[12px]",
        className
      )}>
        <Loader2 className="h-4 w-4 animate-spin mr-2 text-[var(--star-yellow)]" />
        <span className="text-xs font-bold font-mario text-[var(--outline-black)]">Loading stats...</span>
      </div>
    )
  }

  if (error || !stats) {
    return null // Gracefully hide if no data
  }

  // Use live PnL if available, otherwise use stats PnL
  const totalPnL = livePnL !== null ? livePnL : parseFloat(stats.totalPnL)
  const isProfitable = totalPnL >= 0

  // Calculate percentage based on cost basis
  const costBasis = parseFloat(stats.costBasis)
  const pnlPercentage = costBasis > 0 ? ((totalPnL / costBasis) * 100).toFixed(1) : '0.0'

  return (
    <div className={cn(
      "bg-gradient-to-br from-yellow-100 via-amber-50 to-orange-100",
      "border-4 border-[var(--outline-black)]",
      "shadow-[4px_4px_0_var(--outline-black)]",
      "rounded-[14px]",
      "p-0 overflow-hidden",
      "transition-all hover:shadow-[5px_5px_0_var(--outline-black)] hover:-translate-y-[1px]",
      className
    )}>
      <div className="grid grid-cols-4 gap-0">
        {/* Bought */}
        <div className="flex flex-col items-center justify-center border-r-3 border-[var(--outline-black)] px-2 py-3 bg-white/40">
          <div className="text-[10px] font-bold uppercase text-[var(--outline-black)]/70 mb-1 font-mario">
            Bought
          </div>
          <div className="font-mono text-[13px] font-extrabold text-[var(--outline-black)]">
            {formatUSD(parseFloat(stats.totalBoughtUsd))}
          </div>
        </div>

        {/* Sold */}
        <div className="flex flex-col items-center justify-center border-r-3 border-[var(--outline-black)] px-2 py-3 bg-white/40">
          <div className="text-[10px] font-bold uppercase text-[var(--outline-black)]/70 mb-1 font-mario">
            Sold
          </div>
          <div className="font-mono text-[13px] font-extrabold text-[var(--outline-black)]">
            {formatUSD(parseFloat(stats.totalSoldUsd))}
          </div>
        </div>

        {/* Holding */}
        <div className="flex flex-col items-center justify-center border-r-3 border-[var(--outline-black)] px-2 py-3 bg-white/40">
          <div className="text-[10px] font-bold uppercase text-[var(--outline-black)]/70 mb-1 font-mario">
            Holding
          </div>
          <div className="font-mono text-[13px] font-extrabold text-[var(--outline-black)]">
            {formatUSD(parseFloat(stats.currentHoldingValue))}
          </div>
        </div>

        {/* PnL */}
        <div className={cn(
          "flex flex-col items-center justify-center px-2 py-3",
          isProfitable
            ? "bg-gradient-to-br from-[var(--luigi-green)]/20 to-emerald-100/50"
            : "bg-gradient-to-br from-[var(--mario-red)]/20 to-red-100/50"
        )}>
          <div className="text-[10px] font-bold uppercase text-[var(--outline-black)]/70 mb-1 font-mario">
            PnL
          </div>
          <div className="flex items-center gap-1">
            {isProfitable ? (
              <TrendingUp className="h-3 w-3 text-[var(--luigi-green)]" />
            ) : (
              <TrendingDown className="h-3 w-3 text-[var(--mario-red)]" />
            )}
            <AnimatedNumber
              value={totalPnL}
              prefix={isProfitable ? '+$' : '-$'}
              decimals={2}
              className={cn(
                "font-mono text-[13px] font-extrabold",
                isProfitable ? "text-[var(--luigi-green)]" : "text-[var(--mario-red)]"
              )}
              colorize={false}
              glowOnChange={true}
            />
          </div>
          <div className={cn(
            "text-[9px] font-bold",
            isProfitable ? "text-[var(--luigi-green)]" : "text-[var(--mario-red)]"
          )}>
            ({pnlPercentage}%)
          </div>
        </div>
      </div>
    </div>
  )
}
