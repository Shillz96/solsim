/**
 * Health Capsule Component - Mario-themed health indicators
 *
 * Shows token health status using Mario colors:
 * - Luigi Green (✅) = Safe/Healthy
 * - Star Yellow (⚠️) = Caution/Warning
 * - Mario Red (🔥) = Danger/Risky
 */

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { TokenRow, HealthLevel } from "@/lib/types/warp-pipes"

interface HealthCapsuleProps {
  token: TokenRow
  className?: string
}

/**
 * Get health level from liquidity
 */
function getLiquidityHealth(liqUsd?: number | null): HealthLevel {
  if (!liqUsd) return "red"
  if (liqUsd >= 50000) return "green" // $50k+ = Luigi Green
  if (liqUsd >= 10000) return "yellow" // $10k-$50k = Star Yellow
  return "red" // <$10k = Mario Red
}

/**
 * Get health level from price impact
 */
function getPriceImpactHealth(priceImpact?: number | null): HealthLevel {
  if (!priceImpact) return "yellow"
  if (priceImpact <= 1) return "green" // <1% = Safe
  if (priceImpact <= 5) return "yellow" // 1-5% = Caution
  return "red" // >5% = Danger
}

/**
 * Get security health from freeze/mint status
 */
function getSecurityHealth(freezeRevoked?: boolean | null, mintRenounced?: boolean | null): HealthLevel {
  if (freezeRevoked && mintRenounced) return "green" // Both revoked = Safe
  if (freezeRevoked || mintRenounced) return "yellow" // One revoked = Caution
  return "red" // Neither revoked = Danger
}

export function HealthCapsule({ token, className }: HealthCapsuleProps) {
  const liquidityHealth = getLiquidityHealth(token.liqUsd ?? undefined)
  const priceImpactHealth = getPriceImpactHealth(token.priceImpactPctAt1pct ?? undefined)
  const securityHealth = getSecurityHealth(token.freezeRevoked ?? undefined, token.mintRenounced ?? undefined)

  // Overall health = worst of the three
  const overall: HealthLevel =
    [liquidityHealth, priceImpactHealth, securityHealth].includes("red")
      ? "red"
      : [liquidityHealth, priceImpactHealth, securityHealth].includes("yellow")
        ? "yellow"
        : "green"

  // Mario-themed color classes
  const healthColors = {
    green: "bg-luigi-green-500 text-white border-pipe-900 shadow-[2px_2px_0_rgba(0,0,0,0.2)]", // Luigi Green
    yellow: "bg-star-yellow-500 text-pipe-900 border-pipe-900 shadow-[2px_2px_0_rgba(0,0,0,0.2)]", // Star Yellow
    red: "bg-mario-red-500 text-white border-pipe-900 shadow-[2px_2px_0_rgba(0,0,0,0.2)]", // Mario Red
  }

  const healthIcons = {
    green: "✅", // 1-Up Mushroom
    yellow: "⚠️", // ? Block
    red: "🔥", // Bowser/Danger
  }

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {/* Liquidity Badge */}
      {token.state === "new" && (
        <Badge
          variant="outline"
          className={cn(
            "text-xs font-bold border-3 rounded-[8px] px-2 py-0.5",
            healthColors[liquidityHealth]
          )}
        >
          {healthIcons[liquidityHealth]} ${token.liqUsd ? `${(token.liqUsd / 1000).toFixed(0)}k` : "?"}
        </Badge>
      )}

      {/* Price Impact Badge */}
      {token.priceImpactPctAt1pct != null && (
        <Badge
          variant="outline"
          className={cn(
            "text-xs font-bold border-3 rounded-[8px] px-2 py-0.5",
            healthColors[priceImpactHealth]
          )}
        >
          {healthIcons[priceImpactHealth]} {token.priceImpactPctAt1pct.toFixed(1)}%
        </Badge>
      )}

      {/* Security Badge */}
      <Badge
        variant="outline"
        className={cn(
          "text-xs font-bold border-3 rounded-[8px] px-2 py-0.5",
          healthColors[securityHealth]
        )}
        title={`Freeze: ${token.freezeRevoked ? "✓" : "✗"}, Mint: ${token.mintRenounced ? "✓" : "✗"}`}
      >
        {healthIcons[securityHealth]}{" "}
        {token.freezeRevoked && token.mintRenounced
          ? "Safe"
          : token.freezeRevoked || token.mintRenounced
            ? "Partial"
            : "Risky"}
      </Badge>

      {/* Pool Age (for NEW tokens) */}
      {token.state === "new" && token.poolAgeMin != null && (
        <Badge variant="outline" className="text-xs font-mono font-bold border-3 border-pipe-900 bg-sky-50 text-pipe-900 px-2 py-0.5 rounded-[8px] shadow-[2px_2px_0_rgba(0,0,0,0.2)]">
          🕐 {token.poolAgeMin < 60 ? `${token.poolAgeMin}m` : `${Math.floor(token.poolAgeMin / 60)}h`}
        </Badge>
      )}

      {/* Bonding Progress (for BONDED/GRADUATING) */}
      {(token.state === "bonded" || token.state === "graduating") && token.bondingCurveProgress != null && (
        <Badge variant="outline" className="text-xs font-mono font-bold border-3 border-pipe-900 bg-coin-yellow-100 text-pipe-900 px-2 py-0.5 rounded-[8px] shadow-[2px_2px_0_rgba(0,0,0,0.2)]">
          📈 {token.bondingCurveProgress.toFixed(0)}%
        </Badge>
      )}
    </div>
  )
}

/**
 * Compact Health Capsule - Single badge showing overall health
 */
export function CompactHealthCapsule({ token, className }: HealthCapsuleProps) {
  const liquidityHealth = getLiquidityHealth(token.liqUsd ?? undefined)
  const priceImpactHealth = getPriceImpactHealth(token.priceImpactPctAt1pct ?? undefined)
  const securityHealth = getSecurityHealth(token.freezeRevoked ?? undefined, token.mintRenounced ?? undefined)

  const overall: HealthLevel =
    [liquidityHealth, priceImpactHealth, securityHealth].includes("red")
      ? "red"
      : [liquidityHealth, priceImpactHealth, securityHealth].includes("yellow")
        ? "yellow"
        : "green"

  const healthColors = {
    green: "bg-luigi-green-500 text-white border-pipe-900 shadow-[2px_2px_0_rgba(0,0,0,0.2)]",
    yellow: "bg-star-yellow-500 text-pipe-900 border-pipe-900 shadow-[2px_2px_0_rgba(0,0,0,0.2)]",
    red: "bg-mario-red-500 text-white border-pipe-900 shadow-[2px_2px_0_rgba(0,0,0,0.2)]",
  }

  const healthLabels = {
    green: "✅ Healthy",
    yellow: "⚠️ Caution",
    red: "🔥 Risky",
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs font-bold border-3 rounded-[8px] px-2 py-0.5",
        healthColors[overall],
        className
      )}
    >
      {healthLabels[overall]}
    </Badge>
  )
}
