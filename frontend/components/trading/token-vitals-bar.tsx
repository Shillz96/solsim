"use client"

import { TrendingUp, TrendingDown, Users, DollarSign, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatUSD, formatNumber } from "@/lib/format"

interface TokenVitalsBarProps {
  volume24h?: number
  holders?: number
  priceChange5m?: number
  userRank?: number | null
  className?: string
}

export function TokenVitalsBar({
  volume24h,
  holders,
  priceChange5m,
  userRank,
  className
}: TokenVitalsBarProps) {
  const priceChangeColor = priceChange5m && priceChange5m >= 0 
    ? "text-[var(--luigi-green)]" 
    : "text-[var(--mario-red)]"
  
  const PriceIcon = priceChange5m && priceChange5m >= 0 ? TrendingUp : TrendingDown

  return (
    <div className={cn(
      "mario-card p-2 sm:p-3",
      "grid grid-cols-2 sm:grid-cols-4 gap-2",
      className
    )}>
      {/* 24h Volume */}
      <div className="flex items-center gap-2 px-2 py-1.5 bg-gradient-to-br from-[var(--coin-gold)]/20 to-[var(--star-yellow)]/10 rounded-lg border-2 border-[var(--outline-black)]/10">
        <div className="h-7 w-7 rounded-full bg-[var(--coin-gold)] border-2 border-[var(--outline-black)] flex items-center justify-center">
          <DollarSign className="h-3.5 w-3.5 text-[var(--outline-black)]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[9px] font-bold uppercase text-muted-foreground font-mario">24h Vol</div>
          <div className="font-mono text-xs font-bold text-foreground truncate">
            {volume24h ? formatUSD(volume24h) : "$0"}
          </div>
        </div>
      </div>

      {/* Holders */}
      <div className="flex items-center gap-2 px-2 py-1.5 bg-gradient-to-br from-[var(--sky-blue)]/20 to-blue-100/10 rounded-lg border-2 border-[var(--outline-black)]/10">
        <div className="h-7 w-7 rounded-full bg-[var(--sky-blue)] border-2 border-[var(--outline-black)] flex items-center justify-center">
          <Users className="h-3.5 w-3.5 text-[var(--outline-black)]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[9px] font-bold uppercase text-muted-foreground font-mario">Holders</div>
          <div className="font-mono text-xs font-bold text-foreground truncate">
            {holders ? formatNumber(holders) : "0"}
          </div>
        </div>
      </div>

      {/* 5m Price Change */}
      <div className={cn(
        "flex items-center gap-2 px-2 py-1.5 rounded-lg border-2 border-[var(--outline-black)]/10",
        priceChange5m && priceChange5m >= 0 
          ? "bg-gradient-to-br from-[var(--luigi-green)]/20 to-green-100/10"
          : "bg-gradient-to-br from-[var(--mario-red)]/20 to-red-100/10"
      )}>
        <div className={cn(
          "h-7 w-7 rounded-full border-2 border-[var(--outline-black)] flex items-center justify-center",
          priceChange5m && priceChange5m >= 0 ? "bg-[var(--luigi-green)]" : "bg-[var(--mario-red)]"
        )}>
          <PriceIcon className="h-3.5 w-3.5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[9px] font-bold uppercase text-muted-foreground font-mario">5m Change</div>
          <div className={cn("font-mono text-xs font-bold truncate", priceChangeColor)}>
            {priceChange5m !== undefined && priceChange5m !== null
              ? `${priceChange5m >= 0 ? '+' : ''}${priceChange5m.toFixed(2)}%`
              : "N/A"}
          </div>
        </div>
      </div>

      {/* User Rank */}
      <div className="flex items-center gap-2 px-2 py-1.5 bg-gradient-to-br from-[var(--star-yellow)]/20 to-yellow-100/10 rounded-lg border-2 border-[var(--outline-black)]/10">
        <div className="h-7 w-7 rounded-full bg-[var(--star-yellow)] border-2 border-[var(--outline-black)] flex items-center justify-center">
          <Trophy className="h-3.5 w-3.5 text-[var(--outline-black)]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[9px] font-bold uppercase text-muted-foreground font-mario">Your Rank</div>
          <div className="font-mono text-xs font-bold text-foreground truncate">
            {userRank ? `#${userRank}` : "Unranked"}
          </div>
        </div>
      </div>
    </div>
  )
}
