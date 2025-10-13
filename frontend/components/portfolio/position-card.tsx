"use client"

/**
 * Position Card Component - Mobile-optimized portfolio position display
 * Used as alternative to table view on small screens
 */

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown } from "lucide-react"
import { formatUSD, formatNumber, safePercent } from "@/lib/format"
import { UsdWithSol } from "@/lib/sol-equivalent"
import { cn } from "@/lib/utils"
import type * as Backend from "@/lib/types/backend"
import type { EnhancedPosition } from "./types"

// Extended position with live data for position card
interface LiveEnhancedPosition extends EnhancedPosition {
  livePriceNumber?: number
  liveValue?: number
  livePnL?: number
  livePnLPercent?: number
}

interface PositionCardProps {
  position: LiveEnhancedPosition
}

export function PositionCard({ position }: PositionCardProps) {
  const isProfitable = (position.livePnL || 0) >= 0
  const PnLIcon = isProfitable ? TrendingUp : TrendingDown

  return (
    <div className="p-4 rounded-lg border bg-card hover:bg-muted/20 transition-colors">
      <div className="flex items-start justify-between mb-3">
        {/* Token Info */}
        <div className="flex items-center gap-3">
          {position.tokenImage && (
            <img
              src={position.tokenImage}
              alt={position.tokenSymbol || 'Token'}
              className="w-10 h-10 rounded-full"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          )}
          <div>
            <div className="font-semibold text-base">{position.tokenSymbol}</div>
            <div className="text-xs text-muted-foreground truncate max-w-[150px]">
              {position.tokenName}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <Link href={`/trade?token=${position.mint}`}>
          <Button variant="outline" size="sm">
            Trade
          </Button>
        </Link>
      </div>

      {/* Price and Holdings */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <div className="text-xs text-muted-foreground mb-1">Price</div>
          <div className="font-mono text-sm font-medium">
            ${formatNumber(position.livePriceNumber || 0, { maxDecimals: 6 })}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground mb-1">Holdings</div>
          <div className="font-mono text-sm font-medium">
            {formatNumber(parseFloat(position.qty), { maxDecimals: 0 })}
          </div>
        </div>
      </div>

      {/* Value and Avg Cost */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <div className="text-xs text-muted-foreground mb-1">Value</div>
          <UsdWithSol
            usd={position.liveValue || 0}
            className="text-sm font-semibold"
            solClassName="text-xs"
          />
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground mb-1">Avg Cost</div>
          <div className="font-mono text-sm">
            ${formatNumber(parseFloat(position.avgCostUsd), { maxDecimals: 6 })}
          </div>
        </div>
      </div>

      {/* P&L Badge */}
      <div className="flex items-center justify-between pt-3 border-t">
        <span className="text-xs text-muted-foreground">Profit/Loss</span>
        <div className="flex items-center gap-2">
          <Badge
            variant={isProfitable ? "default" : "destructive"}
            className={cn(
              "font-mono text-sm",
              isProfitable ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-red-500/10 text-red-600 dark:text-red-400"
            )}
          >
            {formatUSD(position.livePnL || 0)}
          </Badge>
          <PnLIcon className={cn("w-4 h-4", isProfitable ? "text-green-500" : "text-red-500")} />
          <span className={cn("text-xs font-medium", isProfitable ? "text-green-500" : "text-red-500")}>
            {safePercent(
              position.livePnL || 0,
              parseFloat(position.avgCostUsd) * parseFloat(position.qty)
            )}
          </span>
        </div>
      </div>
    </div>
  )
}
