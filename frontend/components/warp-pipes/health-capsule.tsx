/**
 * Health Capsule Component - Mario-themed health indicators
 *
 * Shows token health status using Mario colors:
 * - Luigi Green (✅) = Safe/Healthy
 * - Star Yellow (⚠️) = Caution/Warning
 * - Mario Red (🔥) = Danger/Risky
 */

import { Badge } from "@/components/ui/badge"
import { cn, marioStyles } from "@/lib/utils"
import type { TokenRow, HealthLevel } from "@/lib/types/warp-pipes"

interface HealthCapsuleProps {
  token: TokenRow
  className?: string
}

// Consolidated health styling configuration
const HEALTH_CONFIG = {
  green: {
    color: "bg-luigi text-white border-outline shadow-[2px_2px_0_var(--outline-black)]",
    icon: "✅",
    label: "Healthy"
  },
  yellow: {
    color: "bg-star text-outline border-outline shadow-[2px_2px_0_var(--outline-black)]",
    icon: "⚠️",
    label: "Caution"
  },
  red: {
    color: "bg-mario text-white border-outline shadow-[2px_2px_0_var(--outline-black)]",
    icon: "🔥",
    label: "Risky"
  }
}

/**
 * Get health level based on value and thresholds
 */
function getHealthLevel(
  value: number | null | undefined,
  thresholds: { green: number; yellow: number },
  inverted = false
): HealthLevel {
  if (value == null) return "yellow"
  
  if (inverted) {
    // For metrics where lower is better (e.g., price impact)
    if (value <= thresholds.green) return "green"
    if (value <= thresholds.yellow) return "yellow"
    return "red"
  } else {
    // For metrics where higher is better (e.g., liquidity)
    if (value >= thresholds.green) return "green"
    if (value >= thresholds.yellow) return "yellow"
    return "red"
  }
}

/**
 * Get security health from freeze/mint status
 */
function getSecurityHealth(freezeRevoked?: boolean | null, mintRenounced?: boolean | null): HealthLevel {
  if (freezeRevoked && mintRenounced) return "green"
  if (freezeRevoked || mintRenounced) return "yellow"
  return "red"
}

/**
 * Calculate overall health level (worst of all checks)
 */
function getOverallHealth(...levels: HealthLevel[]): HealthLevel {
  if (levels.includes("red")) return "red"
  if (levels.includes("yellow")) return "yellow"
  return "green"
}

export function HealthCapsule({ token, className }: HealthCapsuleProps) {
  const liquidityHealth = getHealthLevel(token.liqUsd, { green: 50000, yellow: 10000 })
  const priceImpactHealth = getHealthLevel(token.priceImpactPctAt1pct, { green: 1, yellow: 5 }, true)
  const securityHealth = getSecurityHealth(token.freezeRevoked, token.mintRenounced)

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {/* Liquidity Badge */}
      {token.state === "new" && (
        <Badge
          variant="outline"
          className={cn(
            "text-xs font-bold border-3 rounded px-2 py-0.5",
            HEALTH_CONFIG[liquidityHealth].color
          )}
        >
          {HEALTH_CONFIG[liquidityHealth].icon} ${token.liqUsd ? `${(token.liqUsd / 1000).toFixed(0)}k` : "?"}
        </Badge>
      )}

      {/* Price Impact Badge */}
      {token.priceImpactPctAt1pct != null && (
        <Badge
          variant="outline"
          className={cn(
            "text-xs font-bold border-3 rounded px-2 py-0.5",
            HEALTH_CONFIG[priceImpactHealth].color
          )}
        >
          {HEALTH_CONFIG[priceImpactHealth].icon} {token.priceImpactPctAt1pct.toFixed(1)}%
        </Badge>
      )}

      {/* Security Badge */}
      <Badge
        variant="outline"
        className={cn(
          "text-xs font-bold border-3 rounded px-2 py-0.5",
          HEALTH_CONFIG[securityHealth].color
        )}
        title={`Freeze: ${token.freezeRevoked ? "✓" : "✗"}, Mint: ${token.mintRenounced ? "✓" : "✗"}`}
      >
        {HEALTH_CONFIG[securityHealth].icon}{" "}
        {token.freezeRevoked && token.mintRenounced
          ? "Safe"
          : token.freezeRevoked || token.mintRenounced
            ? "Partial"
            : "Risky"}
      </Badge>

      {/* Pool Age (for NEW tokens) */}
      {token.state === "new" && token.poolAgeMin != null && (
        <Badge variant="outline" className={cn(
          marioStyles.badgeLg('gold'),
          'text-xs font-mono bg-background text-outline px-2 py-0.5 rounded'
        )}>
          🕐 {token.poolAgeMin < 60 ? `${token.poolAgeMin}m` : `${Math.floor(token.poolAgeMin / 60)}h`}
        </Badge>
      )}

      {/* Bonding Progress (for BONDED/GRADUATING) */}
      {(token.state === "bonded" || token.state === "graduating") && token.bondingCurveProgress != null && (
        <Badge variant="outline" className={cn(
          marioStyles.badgeLg('gold'),
          'text-xs font-mono bg-coin/20 text-outline px-2 py-0.5 rounded'
        )}>
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
  const liquidityHealth = getHealthLevel(token.liqUsd, { green: 50000, yellow: 10000 })
  const priceImpactHealth = getHealthLevel(token.priceImpactPctAt1pct, { green: 1, yellow: 5 }, true)
  const securityHealth = getSecurityHealth(token.freezeRevoked, token.mintRenounced)
  const overall = getOverallHealth(liquidityHealth, priceImpactHealth, securityHealth)

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs font-bold border-3 rounded px-2 py-0.5",
        HEALTH_CONFIG[overall].color,
        className
      )}
    >
      {HEALTH_CONFIG[overall].icon} {HEALTH_CONFIG[overall].label}
    </Badge>
  )
}
