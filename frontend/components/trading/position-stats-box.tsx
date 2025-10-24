"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { formatUSD } from "@/lib/format"
import { CheckCircle2, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

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
  const { getUserId } = useAuth()
  const [stats, setStats] = useState<TokenStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      const userId = getUserId()
      if (!userId || !tokenAddress) return

      setLoading(true)
      setError(null)

      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
        const res = await fetch(
          `${API_URL}/api/portfolio/token-stats?userId=${userId}&mint=${tokenAddress}&tradeMode=${tradeMode}`
        )

        if (!res.ok) {
          throw new Error('Failed to fetch token stats')
        }

        const data = await res.json()
        setStats(data)
      } catch (err) {
        console.error('Error fetching token stats:', err)
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [tokenAddress, tradeMode, getUserId])

  if (loading) {
    return (
      <div className={cn(
        "flex items-center justify-center p-3",
        "bg-[var(--sky-blue)]/20 text-[var(--outline-black)]",
        "border-3 border-[var(--outline-black)]",
        "shadow-[3px_3px_0_var(--outline-black)]",
        "rounded-lg",
        className
      )}>
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <span className="text-xs font-bold font-mario">Loading stats...</span>
      </div>
    )
  }

  if (error || !stats) {
    return null // Gracefully hide if no data
  }

  const totalPnL = parseFloat(stats.totalPnL)
  const isProfitable = totalPnL >= 0

  return (
    <div className={cn(
      "grid grid-cols-4 gap-0 p-3",
      "bg-gradient-to-br from-[var(--coin-gold)]/30 to-[var(--star-yellow)]/20",
      "border-3 border-[var(--outline-black)]",
      "shadow-[3px_3px_0_var(--outline-black)]",
      "rounded-lg",
      "transition-all hover:shadow-[4px_4px_0_var(--outline-black)] hover:-translate-y-[1px]",
      className
    )}>
      {/* Bought */}
      <div className="flex flex-col items-center justify-center border-r-2 border-[var(--outline-black)]/20 px-2">
        <div className="text-[10px] font-bold uppercase text-[var(--outline-black)]/70 mb-1 font-mario">
          Bought
        </div>
        <div className="font-mono text-[13px] font-extrabold text-[var(--outline-black)]">
          {formatUSD(parseFloat(stats.totalBoughtUsd))}
        </div>
      </div>

      {/* Sold */}
      <div className="flex flex-col items-center justify-center border-r-2 border-[var(--outline-black)]/20 px-2">
        <div className="text-[10px] font-bold uppercase text-[var(--outline-black)]/70 mb-1 font-mario">
          Sold
        </div>
        <div className="font-mono text-[13px] font-extrabold text-[var(--outline-black)]">
          {formatUSD(parseFloat(stats.totalSoldUsd))}
        </div>
      </div>

      {/* Holding */}
      <div className="flex flex-col items-center justify-center border-r-2 border-[var(--outline-black)]/20 px-2">
        <div className="text-[10px] font-bold uppercase text-[var(--outline-black)]/70 mb-1 font-mario">
          Holding
        </div>
        <div className="font-mono text-[13px] font-extrabold text-[var(--outline-black)]">
          {formatUSD(parseFloat(stats.currentHoldingValue))}
        </div>
      </div>

      {/* PnL */}
      <div className="flex flex-col items-center justify-center px-2">
        <div className="text-[10px] font-bold uppercase text-[var(--outline-black)]/70 mb-1 font-mario">
          PnL
        </div>
        <div className="flex items-center gap-1">
          <CheckCircle2
            className={cn(
              "h-3 w-3",
              isProfitable ? "text-[var(--luigi-green)]" : "text-[var(--mario-red)]"
            )}
          />
          <div className={cn(
            "font-mono text-[13px] font-extrabold",
            isProfitable ? "text-[var(--luigi-green)]" : "text-[var(--mario-red)]"
          )}>
            {isProfitable ? '+' : ''}{formatUSD(totalPnL)}
          </div>
        </div>
        <div className={cn(
          "text-[9px] font-bold",
          isProfitable ? "text-[var(--luigi-green)]" : "text-[var(--mario-red)]"
        )}>
          ({stats.unrealizedPnL !== '0.00' && parseFloat(stats.currentHoldingValue) > 0
            ? ((totalPnL / parseFloat(stats.currentHoldingValue)) * 100).toFixed(1)
            : '0.0'}%)
        </div>
      </div>
    </div>
  )
}
