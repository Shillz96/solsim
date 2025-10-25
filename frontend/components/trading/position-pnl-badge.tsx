"use client"

/**
 * Position PnL Badge - Real-Time
 *
 * Shows live PnL for a specific token position
 * - Subscribes to real-time PnL WebSocket
 * - Animated number updates
 * - Color-coded (green profit / red loss)
 * - Compact badge for headers
 */

import { useRealtimePnL } from "@/hooks/use-realtime-pnl"
import { AnimatedNumber } from "@/components/ui/animated-number"
import { TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface PositionPnLBadgeProps {
  mint: string
  tradeMode?: 'PAPER' | 'REAL'
  className?: string
}

export function PositionPnLBadge({
  mint,
  tradeMode = 'PAPER',
  className
}: PositionPnLBadgeProps) {
  const { positions, connected } = useRealtimePnL(tradeMode)

  const position = positions.get(mint)
  if (!position || !connected) return null

  const totalPnL = position.totalPnL || 0
  const isProfitable = totalPnL >= 0

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-2 py-1 rounded-lg",
      "border-2 border-[var(--outline-black)]",
      "shadow-[2px_2px_0_var(--outline-black)]",
      "transition-all",
      isProfitable
        ? "bg-gradient-to-br from-[var(--luigi-green)]/20 to-emerald-100/30"
        : "bg-gradient-to-br from-[var(--mario-red)]/20 to-red-100/30",
      className
    )}>
      {isProfitable ? (
        <TrendingUp className="h-3 w-3 text-[var(--luigi-green)]" />
      ) : (
        <TrendingDown className="h-3 w-3 text-[var(--mario-red)]" />
      )}
      <div className="text-xs font-mario font-bold">PnL:</div>
      <AnimatedNumber
        value={totalPnL}
        prefix={isProfitable ? '+$' : '-$'}
        decimals={2}
        className={cn(
          "text-xs font-mono font-bold",
          isProfitable ? "text-[var(--luigi-green)]" : "text-[var(--mario-red)]"
        )}
        colorize={false}
        glowOnChange={true}
      />
    </div>
  )
}
