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
  const { prices: livePrices } = usePriceStreamContext()
  const [priceChange5m, setPriceChange5m] = useState<number | undefined>(staticPriceChange5m)
  const price5mAgoRef = useRef<number | null>(null)
  const timestampRef = useRef<number>(Date.now())

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
      ? "text-[var(--luigi-green)]"
      : "text-[var(--mario-red)]",
    [priceChange5m]
  )

  const PriceIcon = useMemo(() => 
    priceChange5m !== undefined && priceChange5m >= 0 ? TrendingUp : TrendingDown,
    [priceChange5m]
  )

  return (
    <div className={cn(
      marioStyles.cardLg(false),
      "w-full p-2 grid grid-cols-2 gap-2",
      className
    )}>
      {/* 24h Volume */}
      <div className="flex items-center gap-2 p-2 rounded-lg border-2 border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] bg-gradient-to-br from-[var(--coin-gold)]/20 to-[var(--star-yellow)]/10">
        <div className="h-10 w-10 rounded-full border-2 border-[var(--outline-black)] flex items-center justify-center shadow-[2px_2px_0_var(--outline-black)] bg-[var(--coin-gold)] flex-shrink-0">
          <DollarSign className="h-5 w-5 text-[var(--outline-black)]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-mario font-bold uppercase text-[var(--outline-black)]/60">24h Vol</div>
          <div className="font-mono text-sm font-bold text-[var(--outline-black)] truncate">
            {volume24h ? formatUSD(volume24h) : "$0"}
          </div>
        </div>
      </div>

      {/* Holders */}
      <div className="flex items-center gap-2 p-2 rounded-lg border-2 border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] bg-gradient-to-br from-[var(--sky-blue)]/20 to-[var(--sky-blue)]/10">
        <div className="h-10 w-10 rounded-full border-2 border-[var(--outline-black)] flex items-center justify-center shadow-[2px_2px_0_var(--outline-black)] bg-[var(--sky-blue)] flex-shrink-0">
          <Users className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-mario font-bold uppercase text-[var(--outline-black)]/60">Holders</div>
          <div className="font-mono text-sm font-bold text-[var(--outline-black)] truncate">
            {holders ? formatNumber(holders) : "0"}
          </div>
        </div>
      </div>

      {/* 5m Price Change - REAL-TIME */}
      <div className={cn(
        "flex items-center gap-2 p-2 rounded-lg border-2 border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] transition-all",
        priceChange5m !== undefined && priceChange5m >= 0
          ? "bg-gradient-to-br from-[var(--luigi-green)]/20 to-green-100/10"
          : "bg-gradient-to-br from-[var(--mario-red)]/20 to-red-100/10"
      )}>
        <div className={cn(
          "h-10 w-10 rounded-full border-2 border-[var(--outline-black)] flex items-center justify-center shadow-[2px_2px_0_var(--outline-black)] flex-shrink-0 transition-colors",
          priceChange5m !== undefined && priceChange5m >= 0 
            ? 'bg-[var(--luigi-green)]' 
            : 'bg-[var(--mario-red)]'
        )}>
          <PriceIcon className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-mario font-bold uppercase text-[var(--outline-black)]/60">5m Change</div>
          {priceChange5m !== undefined ? (
            <AnimatedNumber
              value={priceChange5m}
              prefix={priceChange5m >= 0 ? '+' : ''}
              suffix="%"
              decimals={2}
              className={cn("font-mono text-sm font-bold", priceChangeColor)}
              colorize={false}
              glowOnChange={true}
            />
          ) : (
            <div className="font-mono text-sm font-bold text-[var(--outline-black)]/60">N/A</div>
          )}
        </div>
      </div>

      {/* User Rank */}
      <div className="flex items-center gap-2 p-2 rounded-lg border-2 border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] bg-gradient-to-br from-[var(--star-yellow)]/20 to-[var(--star-yellow)]/10">
        <div className="h-10 w-10 rounded-full border-2 border-[var(--outline-black)] flex items-center justify-center shadow-[2px_2px_0_var(--outline-black)] bg-[var(--star-yellow)] flex-shrink-0">
          <Trophy className="h-5 w-5 text-[var(--outline-black)]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-mario font-bold uppercase text-[var(--outline-black)]/60">Your Rank</div>
          <div className="font-mono text-sm font-bold text-[var(--outline-black)] truncate">
            {userRank ? `#${userRank}` : "Unranked"}
          </div>
        </div>
      </div>
    </div>
  )
}
