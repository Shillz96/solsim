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
  compact?: boolean // New prop for compact header display
}

export function TokenVitalsBar({
  tokenAddress,
  volume24h,
  holders,
  priceChange5m: staticPriceChange5m,
  userRank,
  className,
  compact = false
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

  // Compact mode for header display - single row of square cards
  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {/* 24h Volume */}
        <div className="bg-gradient-to-br from-white/80 to-white/60 rounded-lg border-[2px] border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] p-1.5 flex flex-col items-center justify-center min-w-[70px] transition-all hover:shadow-[3px_3px_0_var(--outline-black)] hover:-translate-y-[1px]">
          <div className="h-6 w-6 rounded-full border-[2px] border-[var(--outline-black)] flex items-center justify-center shadow-[1px_1px_0_var(--outline-black)] bg-[var(--coin-gold)] mb-1">
            <DollarSign className="h-3 w-3 text-[var(--outline-black)]" />
          </div>
          <div className="text-[8px] font-mario font-bold uppercase text-[var(--outline-black)]/60 text-center leading-none mb-0.5">VOL</div>
          <div className="font-mono text-[9px] font-bold text-[var(--outline-black)] truncate max-w-full text-center" title={volume24h ? `$${volume24h.toFixed(2)}` : "$0"}>
            {volume24h ? formatUSD(volume24h).replace('$', '') : "0"}
          </div>
        </div>

        {/* Holders */}
        <div className="bg-gradient-to-br from-white/80 to-white/60 rounded-lg border-[2px] border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] p-1.5 flex flex-col items-center justify-center min-w-[70px] transition-all hover:shadow-[3px_3px_0_var(--outline-black)] hover:-translate-y-[1px]">
          <div className="h-6 w-6 rounded-full border-[2px] border-[var(--outline-black)] flex items-center justify-center shadow-[1px_1px_0_var(--outline-black)] bg-[var(--sky-blue)] mb-1">
            <Users className="h-3 w-3 text-white" />
          </div>
          <div className="text-[8px] font-mario font-bold uppercase text-[var(--outline-black)]/60 text-center leading-none mb-0.5">HOLDERS</div>
          <div className="font-mono text-[9px] font-bold text-[var(--outline-black)] truncate max-w-full text-center" title={holders ? holders.toString() : "0"}>
            {holders ? formatNumber(holders) : "0"}
          </div>
        </div>

        {/* 5m Price Change - REAL-TIME */}
        <div className={cn(
          "rounded-lg border-[2px] border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] p-1.5 flex flex-col items-center justify-center min-w-[70px] transition-all hover:shadow-[3px_3px_0_var(--outline-black)] hover:-translate-y-[1px]",
          priceChange5m !== undefined && priceChange5m >= 0
            ? "bg-gradient-to-br from-[var(--luigi-green)]/20 to-white/60"
            : "bg-gradient-to-br from-[var(--mario-red)]/20 to-white/60"
        )}>
          <div className={cn(
            "h-6 w-6 rounded-full border-[2px] border-[var(--outline-black)] flex items-center justify-center shadow-[1px_1px_0_var(--outline-black)] mb-1 transition-colors",
            priceChange5m !== undefined && priceChange5m >= 0
              ? 'bg-[var(--luigi-green)]'
              : 'bg-[var(--mario-red)]'
          )}>
            <PriceIcon className="h-3 w-3 text-white" />
          </div>
          <div className="text-[8px] font-mario font-bold uppercase text-[var(--outline-black)]/60 text-center leading-none mb-0.5">5M</div>
          {priceChange5m !== undefined ? (
            <AnimatedNumber
              value={priceChange5m}
              prefix={priceChange5m >= 0 ? '+' : ''}
              suffix="%"
              decimals={2}
              className={cn(
                "font-mono text-[9px] font-bold truncate text-center",
                priceChange5m >= 0 ? "text-[var(--luigi-green)]" : "text-[var(--mario-red)]"
              )}
              colorize={false}
              glowOnChange={true}
            />
          ) : (
            <div className="font-mono text-[9px] font-bold text-[var(--outline-black)]/60 truncate text-center">N/A</div>
          )}
        </div>

        {/* User Rank */}
        <div className="bg-gradient-to-br from-white/80 to-white/60 rounded-lg border-[2px] border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] p-1.5 flex flex-col items-center justify-center min-w-[70px] transition-all hover:shadow-[3px_3px_0_var(--outline-black)] hover:-translate-y-[1px]">
          <div className="h-6 w-6 rounded-full border-[2px] border-[var(--outline-black)] flex items-center justify-center shadow-[1px_1px_0_var(--outline-black)] bg-[var(--star-yellow)] mb-1">
            <Trophy className="h-3 w-3 text-[var(--outline-black)]" />
          </div>
          <div className="text-[8px] font-mario font-bold uppercase text-[var(--outline-black)]/60 text-center leading-none mb-0.5">RANK</div>
          <div className="font-mono text-[9px] font-bold text-[var(--outline-black)] truncate max-w-full text-center" title={userRank ? `#${userRank}` : "Unranked"}>
            {userRank ? `#${userRank}` : "-"}
          </div>
        </div>
      </div>
    )
  }

  // Default full-size mode for trade panel
  return (
    <div className={cn(
      "trade-meta",
      className
    )}>
      {/* 24h Volume */}
      <div className="card flex items-center gap-2 min-h-[60px] transition-all hover:shadow-[4px_4px_0_var(--outline-black)] hover:-translate-y-[1px]">
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
      <div className="card flex items-center gap-2 min-h-[60px] transition-all hover:shadow-[4px_4px_0_var(--outline-black)] hover:-translate-y-[1px]">
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
        "card flex items-center gap-2 min-h-[60px] transition-all hover:shadow-[4px_4px_0_var(--outline-black)] hover:-translate-y-[1px]",
        priceChange5m !== undefined && priceChange5m >= 0
          ? "bg-gradient-to-br from-[var(--luigi-green)]/15 to-transparent"
          : "bg-gradient-to-br from-[var(--mario-red)]/15 to-transparent"
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
      <div className="card flex items-center gap-2 min-h-[60px] transition-all hover:shadow-[4px_4px_0_var(--outline-black)] hover:-translate-y-[1px]">
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
