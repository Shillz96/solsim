/**
 * Token Card Component - Horizontal pump.fun-style layout
 *
 * Comprehensive horizontal token display with:
 * - Large token logo
 * - Inline metadata (time, socials, community)
 * - Security badges
 * - Market data (MC, Volume, Price change)
 * - Bonding curve progress
 * - Action button
 */

"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import {
  Droplet,
  Heart,
  Zap,
  Twitter,
  MessageCircle,
  Globe,
  Flame,
  Info,
  TrendingUp,
  TrendingDown
} from "lucide-react"
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
  const sec = securityBadge(data.freezeRevoked, data.mintRenounced);
  const volChange = data.volumeChange24h ?? null;
  const priceChg = data.priceChange24h ?? null;

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
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={cn("w-full p-3", className)}
      >
        {/* Main Card */}
        <div
          className="flex items-center justify-between gap-4 rounded-xl p-3 border-3 shadow-mario hover:shadow-mario-lg hover:-translate-y-0.5 transition-all duration-200"
          style={{
            borderColor: colors.ring,
            background: `linear-gradient(180deg, ${colors.gradFrom}15, transparent)`
          }}
        >
          {/* LEFT: Avatar */}
          <div className="relative shrink-0">
            <div
              className="h-12 w-12 rounded-lg overflow-hidden border-3 shadow-[2px_2px_0_rgba(0,0,0,0.2)] bg-white"
              style={{ borderColor: colors.ring }}
            >
              {img ? (
                <img src={img} alt={data.symbol} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full grid place-items-center text-xs text-pipe-400">🪙</div>
              )}
            </div>
            <div
              className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full ring-2 ring-white"
              style={{ background: colors.ring }}
            />
          </div>

          {/* MIDDLE: Title + meta */}
          <div className="flex-1 min-w-0">
            {/* Title row */}
            <div className="flex items-center gap-2 min-w-0 mb-1">
              <div className="truncate font-bold text-base tracking-wide text-pipe-900">
                {data.symbol}
              </div>
              <div className="truncate text-xs text-pipe-600">
                {data.name}
              </div>
              <div className="text-[10px] px-1.5 py-0.5 rounded bg-pipe-100 border border-pipe-300 ml-1 font-mono">
                {shorten(data.mint, 4, 4)}
              </div>
            </div>

            {/* Meta row: time + socials + counts */}
            <div className="flex flex-wrap items-center gap-3 text-xs mb-2">
              {/* first seen */}
              <div className="text-pipe-600">{timeAgo(data.firstSeenAt)}</div>

              {/* socials */}
              {(data.twitter || data.telegram || data.website) && (
                <div className="flex items-center gap-1.5">
                  {data.twitter && (
                    <a
                      href={data.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-sky-600 hover:text-sky-700 transition-colors"
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
                      className="text-sky-600 hover:text-sky-700 transition-colors"
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
                      className="text-sky-600 hover:text-sky-700 transition-colors"
                    >
                      <Globe className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              )}

              {/* community */}
              <div className="flex items-center gap-3 ml-2">
                <div className="flex items-center gap-1 text-pipe-700">
                  <Flame className="h-3.5 w-3.5 text-star-yellow-600" />
                  <span className="font-semibold">{data.hotScore ?? "—"}</span>
                </div>
                <button
                  onClick={handleToggleWatch}
                  className="flex items-center gap-1 text-pipe-700 hover:text-mario-red-600 transition-colors"
                >
                  <Heart className={`h-3.5 w-3.5 ${data.isWatched ? "fill-current text-mario-red-500" : ""}`} />
                  <span className="font-semibold">{data.watcherCount ?? 0}</span>
                </button>
              </div>
            </div>

            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-2 text-[11px] mb-2">
              {/* Security badges */}
              <div className={`px-2 py-0.5 rounded-full border-2 font-bold ${sec.cls}`}>
                {sec.label}
              </div>
              <div className={`px-2 py-0.5 rounded-full border-2 font-bold ${
                data.freezeRevoked
                  ? "border-green-500 text-green-600 bg-green-500/10"
                  : "border-red-500 text-red-600 bg-red-500/10"
              }`}>
                Freeze {data.freezeRevoked ? "✓" : "✗"}
              </div>
              <div className={`px-2 py-0.5 rounded-full border-2 font-bold ${
                data.mintRenounced
                  ? "border-green-500 text-green-600 bg-green-500/10"
                  : "border-red-500 text-red-600 bg-red-500/10"
              }`}>
                Mint {data.mintRenounced ? "✓" : "✗"}
              </div>

              {/* Liquidity & trading */}
              <div className="px-2 py-0.5 rounded-full border-2 border-pipe-300 bg-pipe-50 flex items-center gap-1 font-bold text-pipe-900">
                <Droplet className="h-3.5 w-3.5 text-blue-600" />
                {fmtCurrency(data.liqUsd)}
              </div>
              <div className="px-2 py-0.5 rounded-full border-2 border-pipe-300 bg-pipe-50 flex items-center gap-1 font-bold text-pipe-900">
                <Zap className="h-3.5 w-3.5 text-star-yellow-600" />
                {fmtPct(data.priceImpactPctAt1pct)}
              </div>
              {data.poolAgeMin != null && (
                <div className="px-2 py-0.5 rounded-full border-2 border-pipe-300 bg-pipe-50 font-bold text-pipe-900">
                  Pool: {Math.max(0, Math.floor(data.poolAgeMin))}m
                </div>
              )}
            </div>

            {/* Bonding curve progress */}
            {typeof data.bondingCurveProgress === "number" && (
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1 text-pipe-700">
                  <span className="font-semibold">Bonding Curve</span>
                  <span className="font-bold">{data.bondingCurveProgress.toFixed(1)}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden border-2 border-pipe-400 bg-pipe-100">
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
          </div>

          {/* RIGHT: Market + Action */}
          <div className="flex items-center gap-4 shrink-0">
            {/* Market data */}
            <div className="flex flex-col items-end gap-1 text-sm min-w-[180px]">
              <div className="flex items-center gap-2">
                <span className="text-xs text-pipe-600 font-semibold">MC</span>
                <span className="font-bold text-pipe-900">{fmtCurrency(data.marketCapUsd)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-pipe-600 font-semibold">Vol</span>
                <span className="font-bold text-pipe-900">{fmtCurrency(data.volume24h)}</span>
                {volChange != null && (
                  <span className={`text-xs flex items-center gap-0.5 font-bold ${
                    volChange >= 0 ? "text-green-600" : "text-red-600"
                  }`}>
                    {volChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {fmtPct(Math.abs(volChange), 0)}
                  </span>
                )}
              </div>
              {priceChg != null && (
                <div className={`flex items-center gap-1 text-xs font-bold ${
                  priceChg >= 0 ? "text-green-600" : "text-red-600"
                }`}>
                  {priceChg >= 0 ? "↑" : "↓"}{fmtPct(Math.abs(priceChg), 1)}
                </div>
              )}
            </div>

            {/* Action button */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              className="h-9 px-4 rounded-full border-3 font-bold shadow-[3px_3px_0_rgba(0,0,0,0.2)] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_rgba(0,0,0,0.2)] transition-all duration-200 bg-white"
              style={{ borderColor: colors.ring }}
            >
              0 SOL
            </button>
          </div>
        </div>

        {/* Footer meta row */}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-pipe-600">
          <div className="flex items-center gap-1">
            <Info className="h-3.5 w-3.5" />
            State: <b className="ml-1 capitalize text-pipe-900">{data.state}</b>
          </div>
          {data.poolType && <div>Pool: <b className="text-pipe-900">{data.poolType}</b></div>}
          {data.bondingCurveKey && <div>BC: <b className="font-mono text-pipe-900">{shorten(data.bondingCurveKey, 4, 4)}</b></div>}
          {data.poolAddress && <div>Pool: <b className="font-mono text-pipe-900">{shorten(data.poolAddress, 4, 4)}</b></div>}
          {data.lastUpdatedAt && <div>Updated {timeAgo(data.lastUpdatedAt)}</div>}
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
    <div className="w-full p-3">
      <div className="flex items-center justify-between gap-4 rounded-xl p-3 border-3 border-pipe-300 shadow-mario animate-pulse">
        {/* Avatar skeleton */}
        <div className="h-12 w-12 rounded-lg bg-pipe-200 border-3 border-pipe-300" />

        {/* Content skeleton */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-4 bg-pipe-200 rounded w-24" />
            <div className="h-3 bg-pipe-100 rounded w-32" />
            <div className="h-3 bg-pipe-100 rounded w-16" />
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-3 bg-pipe-100 rounded w-12" />
            <div className="h-3 bg-pipe-100 rounded w-20" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-5 bg-pipe-100 rounded-full w-16" />
            <div className="h-5 bg-pipe-100 rounded-full w-20" />
            <div className="h-5 bg-pipe-100 rounded-full w-16" />
          </div>
        </div>

        {/* Market data skeleton */}
        <div className="flex flex-col items-end gap-1 min-w-[180px]">
          <div className="h-4 bg-pipe-100 rounded w-24" />
          <div className="h-4 bg-pipe-100 rounded w-32" />
          <div className="h-3 bg-pipe-100 rounded w-16" />
        </div>

        {/* Button skeleton */}
        <div className="h-9 w-20 rounded-full bg-pipe-200 border-3 border-pipe-300" />
      </div>
    </div>
  );
}
