"use client"

import { TrendingUp, TrendingDown, Users, DollarSign, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatUSD, formatNumber } from "@/lib/format"
import { useState, useEffect, useRef } from "react"
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

  const priceChangeColor = priceChange5m !== undefined && priceChange5m >= 0
    ? "text-[var(--luigi-green)]"
    : "text-[var(--mario-red)]"

  const PriceIcon = priceChange5m !== undefined && priceChange5m >= 0 ? TrendingUp : TrendingDown

  return (
    <div className={cn(
      "w-full p-4",
      "grid grid-cols-2 gap-4",
      "bg-white rounded-lg border-4 border-[var(--outline-black)]",
      "shadow-mario",
      className
    )}>
      {/* 24h Volume */}
      <div className="flex flex-col items-center justify-center gap-3 p-6 aspect-square bg-gradient-to-br from-[var(--coin-gold)]/20 to-[var(--star-yellow)]/10 rounded-lg border-3 border-[var(--outline-black)] shadow-[3px_3px_0_var(--outline-black)]">
        <div className="h-16 w-16 rounded-full bg-[var(--coin-gold)] border-4 border-[var(--outline-black)] flex items-center justify-center shadow-[3px_3px_0_var(--outline-black)]">
          <DollarSign className="h-8 w-8 text-[var(--outline-black)]" />
        </div>
        <div className="text-center">
          <div className="text-xs font-mario font-bold uppercase text-muted-foreground mb-1">24h Vol</div>
          <div className="font-mono text-lg font-bold text-foreground">
            {volume24h ? formatUSD(volume24h) : "$0"}
          </div>
        </div>
      </div>

      {/* Holders */}
      <div className="flex flex-col items-center justify-center gap-3 p-6 aspect-square bg-gradient-to-br from-[var(--sky-blue)]/20 to-blue-100/10 rounded-lg border-3 border-[var(--outline-black)] shadow-[3px_3px_0_var(--outline-black)]">
        <div className="h-16 w-16 rounded-full bg-[var(--sky-blue)] border-4 border-[var(--outline-black)] flex items-center justify-center shadow-[3px_3px_0_var(--outline-black)]">
          <Users className="h-8 w-8 text-white" />
        </div>
        <div className="text-center">
          <div className="text-xs font-mario font-bold uppercase text-muted-foreground mb-1">Holders</div>
          <div className="font-mono text-lg font-bold text-foreground">
            {holders ? formatNumber(holders) : "0"}
          </div>
        </div>
      </div>

      {/* 5m Price Change - REAL-TIME */}
      <div className={cn(
        "flex flex-col items-center justify-center gap-3 p-6 aspect-square rounded-lg border-3 border-[var(--outline-black)] shadow-[3px_3px_0_var(--outline-black)] transition-all",
        priceChange5m !== undefined && priceChange5m >= 0
          ? "bg-gradient-to-br from-[var(--luigi-green)]/20 to-green-100/10"
          : "bg-gradient-to-br from-[var(--mario-red)]/20 to-red-100/10"
      )}>
        <div className={cn(
          "h-16 w-16 rounded-full border-4 border-[var(--outline-black)] flex items-center justify-center shadow-[3px_3px_0_var(--outline-black)] transition-colors",
          priceChange5m !== undefined && priceChange5m >= 0 ? "bg-[var(--luigi-green)]" : "bg-[var(--mario-red)]"
        )}>
          <PriceIcon className="h-8 w-8 text-white" />
        </div>
        <div className="text-center">
          <div className="text-xs font-mario font-bold uppercase text-muted-foreground mb-1">5m Change</div>
          {priceChange5m !== undefined ? (
            <AnimatedNumber
              value={priceChange5m}
              prefix={priceChange5m >= 0 ? '+' : ''}
              suffix="%"
              decimals={2}
              className={cn("font-mono text-lg font-bold", priceChangeColor)}
              colorize={false}
              glowOnChange={true}
            />
          ) : (
            <div className="font-mono text-lg font-bold text-muted-foreground">N/A</div>
          )}
        </div>
      </div>

      {/* User Rank */}
      <div className="flex flex-col items-center justify-center gap-3 p-6 aspect-square bg-gradient-to-br from-[var(--star-yellow)]/20 to-yellow-100/10 rounded-lg border-3 border-[var(--outline-black)] shadow-[3px_3px_0_var(--outline-black)]">
        <div className="h-16 w-16 rounded-full bg-[var(--star-yellow)] border-4 border-[var(--outline-black)] flex items-center justify-center shadow-[3px_3px_0_var(--outline-black)]">
          <Trophy className="h-8 w-8 text-[var(--outline-black)]" />
        </div>
        <div className="text-center">
          <div className="text-xs font-mario font-bold uppercase text-muted-foreground mb-1">Your Rank</div>
          <div className="font-mono text-lg font-bold text-foreground">
            {userRank ? `#${userRank}` : "Unranked"}
          </div>
        </div>
      </div>
    </div>
  )
}
