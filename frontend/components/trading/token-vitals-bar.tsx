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
      "w-full p-1.5 sm:p-2",
      "grid grid-cols-2 sm:grid-cols-4 gap-1.5",
      "bg-white rounded-lg border-3 border-[var(--outline-black)]",
      "shadow-[2px_2px_0_var(--outline-black)]",
      className
    )}>
      {/* 24h Volume */}
      <div className="flex items-center gap-1.5 px-1.5 py-1 bg-gradient-to-br from-[var(--coin-gold)]/20 to-[var(--star-yellow)]/10 rounded-md">
        <div className="h-6 w-6 rounded-full bg-[var(--coin-gold)] border-2 border-[var(--outline-black)] flex items-center justify-center flex-shrink-0">
          <DollarSign className="h-3 w-3 text-[var(--outline-black)]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[8px] font-bold uppercase text-muted-foreground font-mario">24h Vol</div>
          <div className="font-mono text-[10px] font-bold text-foreground truncate">
            {volume24h ? formatUSD(volume24h) : "$0"}
          </div>
        </div>
      </div>

      {/* Holders */}
      <div className="flex items-center gap-1.5 px-1.5 py-1 bg-gradient-to-br from-[var(--sky-blue)]/20 to-blue-100/10 rounded-md">
        <div className="h-6 w-6 rounded-full bg-[var(--sky-blue)] border-2 border-[var(--outline-black)] flex items-center justify-center flex-shrink-0">
          <Users className="h-3 w-3 text-[var(--outline-black)]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[8px] font-bold uppercase text-muted-foreground font-mario">Holders</div>
          <div className="font-mono text-[10px] font-bold text-foreground truncate">
            {holders ? formatNumber(holders) : "0"}
          </div>
        </div>
      </div>

      {/* 5m Price Change */}
      <div className={cn(
        "flex items-center gap-1.5 px-1.5 py-1 rounded-md",
        priceChange5m && priceChange5m >= 0 
          ? "bg-gradient-to-br from-[var(--luigi-green)]/20 to-green-100/10"
          : "bg-gradient-to-br from-[var(--mario-red)]/20 to-red-100/10"
      )}>
        <div className={cn(
          "h-6 w-6 rounded-full border-2 border-[var(--outline-black)] flex items-center justify-center flex-shrink-0",
          priceChange5m && priceChange5m >= 0 ? "bg-[var(--luigi-green)]" : "bg-[var(--mario-red)]"
        )}>
          <PriceIcon className="h-3 w-3 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[8px] font-bold uppercase text-muted-foreground font-mario">5m Change</div>
          <div className={cn("font-mono text-[10px] font-bold truncate", priceChangeColor)}>
            {priceChange5m !== undefined && priceChange5m !== null
              ? `${priceChange5m >= 0 ? '+' : ''}${priceChange5m.toFixed(2)}%`
              : "N/A"}
          </div>
        </div>
      </div>

      {/* User Rank */}
      <div className="flex items-center gap-1.5 px-1.5 py-1 bg-gradient-to-br from-[var(--star-yellow)]/20 to-yellow-100/10 rounded-md">
        <div className="h-6 w-6 rounded-full bg-[var(--star-yellow)] border-2 border-[var(--outline-black)] flex items-center justify-center flex-shrink-0">
          <Trophy className="h-3 w-3 text-[var(--outline-black)]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[8px] font-bold uppercase text-muted-foreground font-mario">Your Rank</div>
          <div className="font-mono text-[10px] font-bold text-foreground truncate">
            {userRank ? `#${userRank}` : "Unranked"}
          </div>
        </div>
      </div>
    </div>
  )
}
