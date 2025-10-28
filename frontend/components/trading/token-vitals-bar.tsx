"use client"

import { TrendingUp, TrendingDown, Users, DollarSign, Trophy } from "lucide-react"
import { cn, marioStyles } from "@/lib/utils"
import { formatUSD, formatNumber } from "@/lib/format"
import { useState, useEffect, useRef, useMemo } from "react"
import { usePriceStreamContext } from "@/lib/price-stream-provider"
import { AnimatedNumber } from "@/components/ui/animated-number"

interface TokenVitalsBarProps {
  tokenAddress?: string
  volume24h?: number
  holders?: number
  priceChange5m?: number
  userRank?: number | null
  className?: string
}

export function TokenVitalsBar({
  tokenAddress,
  volume24h,
  holders,
  priceChange5m: staticPriceChange5m,
  userRank,
  className
}: TokenVitalsBarProps) {
  const { prices: livePrices, subscribe, unsubscribe } = usePriceStreamContext()
  const [priceChange5m, setPriceChange5m] = useState<number | undefined>(staticPriceChange5m)
  const price5mAgoRef = useRef<number | null>(null)
  const timestampRef = useRef<number>(Date.now())

  // Subscribe to live price updates for this token
  useEffect(() => {
    if (!tokenAddress) return
    subscribe(tokenAddress)
    return () => {
      unsubscribe(tokenAddress)
    }
  }, [tokenAddress, subscribe, unsubscribe])

  // Calculate live 5-minute price change
  useEffect(() => {
    if (!tokenAddress) return

    const currentPrice = livePrices.get(tokenAddress)?.price
    if (!currentPrice) return

    // Store the initial price as 5m baseline
    if (price5mAgoRef.current === null) {
      price5mAgoRef.current = currentPrice
      timestampRef.current = Date.now()
      return
    }

    // Update baseline every 5 minutes
    const elapsed = Date.now() - timestampRef.current
    if (elapsed >= 5 * 60 * 1000) { // 5 minutes
      price5mAgoRef.current = currentPrice
      timestampRef.current = Date.now()
    }

    // Calculate percentage change
    if (price5mAgoRef.current && price5mAgoRef.current > 0) {
      const change = ((currentPrice - price5mAgoRef.current) / price5mAgoRef.current) * 100
      setPriceChange5m(change)
    }
  }, [livePrices, tokenAddress])

  const priceChangeColor = useMemo(() => 
    priceChange5m !== undefined && priceChange5m >= 0
      ? "text-luigi"
      : "text-mario",
    [priceChange5m]
  )

  const PriceIcon = useMemo(() => 
    priceChange5m !== undefined && priceChange5m >= 0 ? TrendingUp : TrendingDown,
    [priceChange5m]
  )

  return (
    <div className={cn(
      "rounded-2xl border-4 border-outline bg-white shadow-[6px_6px_0_var(--outline-black)] transition-all",
      "w-full h-full p-2 grid grid-cols-2 gap-2",
      className
    )}>
      {/* 24h Volume */}
      <div className="flex items-center gap-2 p-2 rounded-lg border-3 border-outline shadow-[4px_4px_0_var(--outline-black)] bg-gradient-to-br from-[var(--coin-gold)]/20 to-[var(--star-yellow)]/10 hover:shadow-[5px_5px_0_var(--outline-black)] hover:-translate-y-[1px] transition-all min-h-[60px]">
        <div className="h-8 w-8 rounded-full border-3 border-outline flex items-center justify-center shadow-[2px_2px_0_var(--outline-black)] bg-coin flex-shrink-0">
          <DollarSign className="h-4 w-4 text-outline" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-mario font-bold uppercase text-outline/60">24h Vol</div>
          <div className="font-mono text-xs font-bold text-outline truncate" title={volume24h ? `$${volume24h.toFixed(2)}` : "$0"}>
            {volume24h ? formatUSD(volume24h) : "$0"}
          </div>
        </div>
      </div>

      {/* Holders */}
      <div className="flex items-center gap-2 p-2 rounded-lg border-3 border-outline shadow-[4px_4px_0_var(--outline-black)] bg-gradient-to-br from-[var(--sky-blue)]/20 to-[var(--sky-blue)]/10 hover:shadow-[5px_5px_0_var(--outline-black)] hover:-translate-y-[1px] transition-all min-h-[60px]">
        <div className="h-8 w-8 rounded-full border-3 border-outline flex items-center justify-center shadow-[2px_2px_0_var(--outline-black)] bg-sky flex-shrink-0">
          <Users className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-mario font-bold uppercase text-outline/60">Holders</div>
          <div className="font-mono text-xs font-bold text-outline truncate" title={holders ? holders.toString() : "0"}>
            {holders ? formatNumber(holders) : "0"}
          </div>
        </div>
      </div>

      {/* 5m Price Change - REAL-TIME */}
      <div className={cn(
        "flex items-center gap-2 p-2 rounded-lg border-3 border-outline shadow-[4px_4px_0_var(--outline-black)] hover:shadow-[5px_5px_0_var(--outline-black)] hover:-translate-y-[1px] transition-all min-h-[60px]",
        priceChange5m !== undefined && priceChange5m >= 0
          ? "bg-gradient-to-br from-[var(--luigi-green)]/20 to-green-100/10"
          : "bg-gradient-to-br from-[var(--mario-red)]/20 to-red-100/10"
      )}>
        <div className={cn(
          "h-8 w-8 rounded-full border-3 border-outline flex items-center justify-center shadow-[2px_2px_0_var(--outline-black)] flex-shrink-0 transition-colors",
          priceChange5m !== undefined && priceChange5m >= 0
            ? 'bg-luigi'
            : 'bg-mario'
        )}>
          <PriceIcon className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-mario font-bold uppercase text-outline/60">5m Change</div>
          {priceChange5m !== undefined ? (
            <AnimatedNumber
              value={priceChange5m}
              prefix={priceChange5m >= 0 ? '+' : ''}
              suffix="%"
              decimals={2}
              className={cn("font-mono text-xs font-bold truncate", priceChangeColor)}
              colorize={false}
              glowOnChange={true}
            />
          ) : (
            <div className="font-mono text-xs font-bold text-outline/60 truncate">N/A</div>
          )}
        </div>
      </div>

      {/* User Rank */}
      <div className="flex items-center gap-2 p-2 rounded-lg border-3 border-outline shadow-[4px_4px_0_var(--outline-black)] bg-gradient-to-br from-[var(--star-yellow)]/20 to-[var(--star-yellow)]/10 hover:shadow-[5px_5px_0_var(--outline-black)] hover:-translate-y-[1px] transition-all min-h-[60px]">
        <div className="h-8 w-8 rounded-full border-3 border-outline flex items-center justify-center shadow-[2px_2px_0_var(--outline-black)] bg-star flex-shrink-0">
          <Trophy className="h-4 w-4 text-outline" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-mario font-bold uppercase text-outline/60">Your Rank</div>
          <div className="font-mono text-xs font-bold text-outline truncate" title={userRank ? `#${userRank}` : "Unranked"}>
            {userRank ? `#${userRank}` : "Unranked"}
          </div>
        </div>
      </div>
    </div>
  )
}
