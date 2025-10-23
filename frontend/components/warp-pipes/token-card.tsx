/**
 * Token Card Component - DexScreener-style horizontal layout
 *
 * Large horizontal card with blue gradient background:
 * - Large token logo (64x64)
 * - Symbol and name inline
 * - Time indicator and metrics row
 * - Percentage changes with color coding
 * - Shortened address
 * - Market data on right side
 * - Action button top right
 */

"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import {
  TrendingUp,
  TrendingDown,
  Twitter,
  MessageCircle,
  Globe,
  Users,
  Droplet,
  Calendar,
  Flame,
  Heart
} from "lucide-react"
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
  const priceChg = data.priceChange24h ?? null;
  const volChange = data.volumeChange24h ?? null;

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
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={cn("w-full", className)}
      >
        {/* Main Card - DexScreener-style Horizontal Layout */}
        <div className="relative rounded-xl p-5 bg-gradient-to-br from-sky-500/20 via-blue-500/15 to-indigo-500/20 backdrop-blur-sm border-3 border-sky-400/40 hover:border-sky-400/60 shadow-[4px_4px_0_rgba(56,189,248,0.25)] hover:shadow-[6px_6px_0_rgba(56,189,248,0.35)] hover:-translate-y-1 transition-all duration-200">

          {/* Layout: Left Content | Right Stats */}
          <div className="flex items-start justify-between gap-6">

            {/* LEFT SECTION */}
            <div className="flex-1 min-w-0">
              {/* Top Row: Logo + Symbol/Name + Time */}
              <div className="flex items-center gap-4 mb-3">
                {/* Large Token Logo */}
                <div className="relative shrink-0">
                  <div className="h-16 w-16 rounded-xl overflow-hidden border-3 border-sky-400 shadow-[3px_3px_0_rgba(0,0,0,0.2)] bg-white">
                    {img ? (
                      <img src={img} alt={data.symbol} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full grid place-items-center text-3xl">🪙</div>
                    )}
                  </div>
                  {data.isWatched && (
                    <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-mario-red-500 border-2 border-white grid place-items-center">
                      <Heart className="h-3 w-3 text-white fill-white" />
                    </div>
                  )}
                </div>

                {/* Symbol, Name, Time */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-bold text-2xl text-pipe-900 tracking-tight">
                      {data.symbol}
                    </h3>
                    <Badge variant="outline" className="text-xs font-semibold bg-white/60 border-pipe-400">
                      {data.name}
                    </Badge>
                  </div>
                  <div className="text-sm text-pipe-700 font-medium">
                    {timeAgo(data.firstSeenAt)}
                  </div>
                </div>
              </div>

              {/* Metrics Row: Social + Stats */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {/* Social Links */}
                {data.twitter && (
                  <a
                    href={data.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 text-white transition-colors"
                  >
                    <Twitter className="h-3.5 w-3.5" />
                  </a>
                )}
                {data.telegram && (
                  <a
                    href={data.telegram}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 text-white transition-colors"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                  </a>
                )}
                {data.website && (
                  <a
                    href={data.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 text-white transition-colors"
                  >
                    <Globe className="h-3.5 w-3.5" />
                  </a>
                )}

                {/* Hot Score */}
                {data.hotScore != null && (
                  <Badge className="bg-orange-500 text-white border-0 font-bold">
                    <Flame className="h-3.5 w-3.5 mr-1" />
                    {Math.round(data.hotScore)}
                  </Badge>
                )}

                {/* Liquidity */}
                <Badge className="bg-blue-500 text-white border-0 font-bold">
                  <Droplet className="h-3.5 w-3.5 mr-1" />
                  {fmtCurrency(data.liqUsd)}
                </Badge>

                {/* Watchers */}
                <Badge className="bg-purple-500 text-white border-0 font-bold">
                  <Users className="h-3.5 w-3.5 mr-1" />
                  {data.watcherCount ?? 0}
                </Badge>

                {/* State */}
                <Badge className="bg-indigo-500 text-white border-0 font-bold uppercase text-xs">
                  {data.state}
                </Badge>
              </div>

              {/* Percentage Changes Row */}
              <div className="flex flex-wrap items-center gap-3 mb-3">
                {priceChg != null && (
                  <div className={cn(
                    "flex items-center gap-1 font-bold text-base",
                    priceChg >= 0 ? "text-green-500" : "text-red-500"
                  )}>
                    {priceChg >= 0 ? "▲" : "▼"} {Math.abs(priceChg).toFixed(1)}%
                  </div>
                )}

                {volChange != null && (
                  <div className="flex items-center gap-1 text-sm font-medium text-pipe-700">
                    <span className={cn(
                      "font-bold",
                      volChange >= 0 ? "text-green-500" : "text-red-500"
                    )}>
                      {volChange >= 0 ? "▲" : "▼"} {Math.abs(volChange).toFixed(0)}%
                    </span>
                    <span className="text-xs">7h</span>
                  </div>
                )}

                {/* Bonding Curve Progress */}
                {typeof data.bondingCurveProgress === "number" && (
                  <div className={cn(
                    "flex items-center gap-1 text-sm font-bold",
                    data.bondingCurveProgress >= 95 ? "text-green-500" : "text-blue-600"
                  )}>
                    <TrendingUp className="h-4 w-4" />
                    {data.bondingCurveProgress.toFixed(0)}%
                  </div>
                )}
              </div>

              {/* Bottom: Shortened Address */}
              <div className="text-xs text-pipe-600 font-mono">
                {shorten(data.mint, 6, 6)}
              </div>
            </div>

            {/* RIGHT SECTION: Market Data + Button */}
            <div className="flex flex-col items-end gap-3 shrink-0">
              {/* Market Stats */}
              <div className="text-right space-y-1">
                <div className="flex items-center gap-2 justify-end">
                  <span className="text-xs text-pipe-600 font-semibold">V</span>
                  <span className="text-lg font-bold text-pipe-900">{fmtCurrency(data.volume24h)}</span>
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <span className="text-xs text-pipe-600 font-semibold">MC</span>
                  <span className="text-lg font-bold text-green-600">{fmtCurrency(data.marketCapUsd)}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-pipe-700">
                  <div className="flex items-center gap-1">
                    <Flame className="h-3 w-3" />
                    <span className="font-semibold">{data.hotScore ?? "—"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold">TX</span>
                    <span>{data.txCount24h ?? "—"}</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <Button
                className="px-6 py-2 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold border-3 border-sky-400 shadow-[3px_3px_0_rgba(0,0,0,0.2)] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_rgba(0,0,0,0.25)] transition-all duration-200"
                onClick={(e) => {
                  e.preventDefault();
                }}
              >
                ⚡ 0 SOL
              </Button>
            </div>
          </div>
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
      <div className="rounded-xl p-5 bg-gradient-to-br from-sky-500/10 via-blue-500/5 to-indigo-500/10 border-3 border-sky-400/30 shadow-[4px_4px_0_rgba(56,189,248,0.15)] animate-pulse">
        <div className="flex items-start justify-between gap-6">
          {/* Left section skeleton */}
          <div className="flex-1">
            {/* Logo + Title */}
            <div className="flex items-center gap-4 mb-3">
              <div className="h-16 w-16 rounded-xl bg-sky-200 border-3 border-sky-300 shrink-0" />
              <div className="flex-1">
                <div className="h-7 bg-sky-200 rounded w-32 mb-2" />
                <div className="h-4 bg-sky-100 rounded w-24" />
              </div>
            </div>

            {/* Badges row */}
            <div className="flex gap-2 mb-3">
              <div className="h-7 w-12 bg-sky-100 rounded" />
              <div className="h-7 w-16 bg-sky-100 rounded" />
              <div className="h-7 w-20 bg-sky-100 rounded" />
              <div className="h-7 w-14 bg-sky-100 rounded" />
            </div>

            {/* Percentages row */}
            <div className="flex gap-3 mb-3">
              <div className="h-5 bg-sky-100 rounded w-16" />
              <div className="h-5 bg-sky-100 rounded w-20" />
              <div className="h-5 bg-sky-100 rounded w-12" />
            </div>

            {/* Address */}
            <div className="h-3 bg-sky-100 rounded w-28" />
          </div>

          {/* Right section skeleton */}
          <div className="flex flex-col items-end gap-3">
            <div className="space-y-1">
              <div className="h-6 bg-sky-100 rounded w-24" />
              <div className="h-6 bg-sky-100 rounded w-28" />
              <div className="h-4 bg-sky-100 rounded w-20" />
            </div>
            <div className="h-10 w-24 rounded-full bg-sky-200 border-3 border-sky-300" />
          </div>
        </div>
      </div>
    </div>
  );
}
