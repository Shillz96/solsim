/**
 * Token Card Component - Clean vertical stock-style layout
 *
 * Vertical token card matching stock card design:
 * - Large token logo
 * - Symbol and name
 * - Large market cap display
 * - 24h change percentage
 * - Volume and liquidity metrics
 * - Bonding curve progress
 * - Full-width action button
 */

"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { TrendingUp, TrendingDown, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { TokenRow } from "@/lib/types/warp-pipes"

interface TokenCardProps {
  data: TokenRow
  onToggleWatch?: (mint: string, isWatched: boolean) => Promise<void>
  className?: string
}

// --------- UTILITIES ---------
const fmtCurrency = (n?: number | null) =>
  n == null ? "—" : n >= 1e9 ? `$${(n/1e9).toFixed(1)}B` : n >= 1e6 ? `$${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `$${(n/1e3).toFixed(1)}K` : `$${Math.round(n)}`;

const fmtPct = (n?: number | null, digits = 1) => (n == null ? "—" : `${n.toFixed(digits)}%`);

const timeAgo = (iso?: string | null) => {
  try {
    if (!iso) return "—";
    const ms = Date.now() - new Date(iso).getTime();
    const m = Math.max(0, Math.floor(ms / 60000));
    if (m < 1) return "now";
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const d = Math.floor(h / 24);
    return `${d}d`;
  } catch {
    return "—";
  }
};

const shorten = (addr?: string | null, s = 4, e = 4) => {
  if (!addr) return "—";
  return addr.length <= s + e ? addr : `${addr.slice(0, s)}…${addr.slice(-e)}`;
};

const stateColors = (state: TokenRow["state"]) => {
  switch (state) {
    case "bonded":
      return {
        ring: "#fcd34d",
        gradFrom: "#fde68a",
        gradTo: "#facc15",
      };
    case "graduating":
      return {
        ring: "#34d399",
        gradFrom: "#bbf7d0",
        gradTo: "#10b981",
      };
    default:
      return {
        ring: "#60a5fa",
        gradFrom: "#bfdbfe",
        gradTo: "#60a5fa",
      };
  }
};

const securityBadge = (freezeRevoked?: boolean | null, mintRenounced?: boolean | null) => {
  if (freezeRevoked && mintRenounced)
    return { label: "SAFE", cls: "bg-green-500/10 text-green-600 border-green-500" };
  if (freezeRevoked || mintRenounced)
    return { label: "WARN", cls: "bg-yellow-500/10 text-yellow-600 border-yellow-500" };
  return { label: "RISK", cls: "bg-red-500/10 text-red-600 border-red-500" };
};

export function TokenCard({ data, onToggleWatch, className }: TokenCardProps) {
  const img = data.logoURI || data.imageUrl || undefined;
  const colors = stateColors(data.state);
  const priceChg = data.priceChange24h ?? null;
  const isPriceUp = priceChg != null && priceChg >= 0;

  const handleToggleWatch = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onToggleWatch) {
      onToggleWatch(data.mint, data.isWatched || false);
    }
  };

  return (
    <Link href={`/room/${data.mint}`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className={cn("w-full", className)}
      >
        {/* Main Card - Vertical Stock-style Layout */}
        <div
          className="relative rounded-xl p-4 border-3 bg-white shadow-[4px_4px_0_rgba(0,0,0,0.15)] hover:shadow-[6px_6px_0_rgba(0,0,0,0.2)] hover:-translate-y-1 transition-all duration-200"
          style={{ borderColor: colors.ring }}
        >
          {/* State Badge - Top Right */}
          <Badge
            className="absolute top-3 right-3 text-[10px] font-bold uppercase border-2"
            style={{
              borderColor: colors.ring,
              backgroundColor: `${colors.gradFrom}40`,
              color: colors.ring
            }}
          >
            {data.state}
          </Badge>

          {/* Top Section: Logo + Symbol/Name */}
          <div className="flex items-start gap-3 mb-4">
            {/* Token Logo */}
            <div
              className="h-14 w-14 rounded-full overflow-hidden border-3 shadow-[2px_2px_0_rgba(0,0,0,0.15)] bg-white shrink-0"
              style={{ borderColor: colors.ring }}
            >
              {img ? (
                <img src={img} alt={data.symbol} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full grid place-items-center text-2xl">🪙</div>
              )}
            </div>

            {/* Symbol and Name */}
            <div className="flex-1 min-w-0 pt-1">
              <div className="font-bold text-lg tracking-tight text-pipe-900 truncate">
                {data.symbol}
              </div>
              <div className="text-sm text-pipe-600 truncate">
                {data.name}
              </div>
            </div>
          </div>

          {/* Market Cap Display - Large */}
          <div className="mb-2">
            <div className="text-3xl font-bold text-pipe-900 tracking-tight">
              {fmtCurrency(data.marketCapUsd)}
            </div>
            <div className="text-xs text-pipe-600 font-medium">Market Cap</div>
          </div>

          {/* 24h Change */}
          {priceChg != null && (
            <div className="flex items-center gap-2 mb-4">
              <div
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-sm",
                  isPriceUp ? "bg-green-500 text-white" : "bg-red-500 text-white"
                )}
              >
                {isPriceUp ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {isPriceUp ? "+" : ""}{fmtPct(priceChg, 2)}
              </div>
              <span className="text-xs text-pipe-600">24h Change</span>
            </div>
          )}

          {/* Bonding Curve Progress */}
          {typeof data.bondingCurveProgress === "number" && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs text-pipe-700 mb-1.5">
                <span className="font-semibold">Bonding Curve</span>
                <span className="font-bold">{data.bondingCurveProgress.toFixed(1)}%</span>
              </div>
              <div className="h-2.5 rounded-full overflow-hidden border-2 border-pipe-400 bg-pipe-100">
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${Math.max(0, Math.min(100, data.bondingCurveProgress))}%`,
                    background: `linear-gradient(90deg, ${colors.gradFrom}, ${colors.gradTo})`
                  }}
                />
              </div>
            </div>
          )}

          {/* Bottom Metrics Row */}
          <div className="grid grid-cols-2 gap-3 mb-4 pt-3 border-t-2 border-pipe-200">
            {/* Volume 24h */}
            <div>
              <div className="text-xs text-pipe-600 mb-1">Volume 24h</div>
              <div className="font-mono font-semibold text-sm text-pipe-900">
                {fmtCurrency(data.volume24h)}
              </div>
            </div>

            {/* Liquidity */}
            <div className="text-right">
              <div className="text-xs text-pipe-600 mb-1">Liquidity</div>
              <div className="font-mono font-semibold text-sm text-pipe-900">
                {fmtCurrency(data.liqUsd)}
              </div>
            </div>
          </div>

          {/* Trade Now Button - Full Width */}
          <Button
            className="w-full h-11 rounded-full border-3 font-bold text-base shadow-[3px_3px_0_rgba(0,0,0,0.2)] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_rgba(0,0,0,0.2)] transition-all duration-200"
            style={{
              borderColor: colors.ring,
              backgroundColor: colors.gradTo,
              color: data.state === "new" ? "white" : "black"
            }}
            onClick={(e) => {
              e.preventDefault();
              // Trade action will be handled by Link wrapper
            }}
          >
            Trade Now
            <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </motion.div>
    </Link>
  );
}

/**
 * Token Card Skeleton - Loading state
 */
export function TokenCardSkeleton() {
  return (
    <div className="w-full">
      <div className="rounded-xl p-4 border-3 border-pipe-300 bg-white shadow-[4px_4px_0_rgba(0,0,0,0.15)] animate-pulse">
        {/* Logo + Title skeleton */}
        <div className="flex items-start gap-3 mb-4">
          <div className="h-14 w-14 rounded-full bg-pipe-200 border-3 border-pipe-300 shrink-0" />
          <div className="flex-1 pt-1">
            <div className="h-5 bg-pipe-200 rounded w-24 mb-2" />
            <div className="h-4 bg-pipe-100 rounded w-32" />
          </div>
        </div>

        {/* Market Cap skeleton */}
        <div className="mb-2">
          <div className="h-9 bg-pipe-200 rounded w-32 mb-1" />
          <div className="h-3 bg-pipe-100 rounded w-20" />
        </div>

        {/* Change badge skeleton */}
        <div className="h-7 bg-pipe-100 rounded-full w-24 mb-4" />

        {/* Progress bar skeleton */}
        <div className="mb-4">
          <div className="flex justify-between mb-1.5">
            <div className="h-3 bg-pipe-100 rounded w-24" />
            <div className="h-3 bg-pipe-100 rounded w-12" />
          </div>
          <div className="h-2.5 rounded-full bg-pipe-200 border-2 border-pipe-300" />
        </div>

        {/* Metrics skeleton */}
        <div className="grid grid-cols-2 gap-3 mb-4 pt-3 border-t-2 border-pipe-200">
          <div>
            <div className="h-3 bg-pipe-100 rounded w-16 mb-1" />
            <div className="h-4 bg-pipe-200 rounded w-20" />
          </div>
          <div className="text-right">
            <div className="h-3 bg-pipe-100 rounded w-16 mb-1 ml-auto" />
            <div className="h-4 bg-pipe-200 rounded w-20 ml-auto" />
          </div>
        </div>

        {/* Button skeleton */}
        <div className="h-11 rounded-full bg-pipe-200 border-3 border-pipe-300" />
      </div>
    </div>
  );
}
