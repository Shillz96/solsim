/**
 * Token Card Component - Vertical stock-style layout with Mario theme
 *
 * Clean vertical card matching site design system:
 * - Token logo at top
 * - Symbol and name
 * - Large market cap display
 * - 24h change with color coding
 * - Volume and Market Cap row
 * - Green "Trade Now" button
 * - Uses theme tokens from tailwind.config.js
 */

"use client"

import { useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
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
  const img = data.imageUrl || data.logoURI || undefined;
  const priceChg = data.priceChange24h ?? null;
  const [imageError, setImageError] = useState(false);
  const security = securityBadge(data.freezeRevoked, data.mintRenounced);
  const age = timeAgo(data.firstSeenAt);

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
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className={cn("w-full", className)}
      >
        {/* Horizontal Layout Token Card - Axiom Style */}
        <div className="relative rounded-[16px] overflow-hidden bg-white border-4 border-pipe-900 shadow-[6px_6px_0_rgba(0,0,0,0.3)] hover:shadow-[8px_8px_0_rgba(0,0,0,0.3)] hover:-translate-y-[2px] transition-all duration-200 cursor-pointer">
          <div className="flex items-center gap-4 p-4">
            
            {/* LEFT: Token Logo */}
            <div className="relative shrink-0 w-16 h-16 rounded-[12px] overflow-hidden border-3 border-pipe-900 shadow-[2px_2px_0_rgba(0,0,0,0.2)]">
              {img && !imageError ? (
                <img
                  src={img}
                  alt={data.symbol}
                  className="h-full w-full object-cover"
                  onError={() => setImageError(true)}
                  loading="lazy"
                />
              ) : (
                <div className="h-full w-full grid place-items-center bg-star-yellow-500 text-pipe-900 text-3xl font-bold">🪙</div>
              )}
            </div>

            {/* MIDDLE: Token Info */}
            <div className="flex-1 min-w-0">
              {/* Top Row: Symbol, Name, Age */}
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-bold text-[20px] text-pipe-900">
                  {data.symbol}
                </h3>
                <span className="text-[14px] text-pipe-600 truncate max-w-[150px]">
                  {data.name}
                </span>
                <span className="text-[12px] text-pipe-500 ml-auto">
                  {age}
                </span>
              </div>

              {/* Middle Row: Stats and Badges */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* Security Badge */}
                <div className={cn(
                  "px-2 py-0.5 rounded-[6px] border-2 text-[11px] font-bold uppercase",
                  security.cls
                )}>
                  {security.label}
                </div>

                {/* Bonding Progress (if available) */}
                {data.bondingCurveProgress != null && (
                  <div className="flex items-center gap-1 text-[12px]">
                    <span className="text-pipe-600">⚡</span>
                    <span className="font-mono font-bold text-pipe-900">
                      {data.bondingCurveProgress.toFixed(0)}%
                    </span>
                  </div>
                )}

                {/* Holders/Txns */}
                {data.txCount24h != null && (
                  <div className="text-[12px] text-pipe-600">
                    <span className="font-mono">{data.txCount24h}</span> txns
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: Price & Volume */}
            <div className="text-right shrink-0">
              {/* Market Cap */}
              <div className="mb-1">
                <div className="text-[11px] text-pipe-500 uppercase">MC</div>
                <div className="text-[18px] font-bold text-pipe-900 font-mono">
                  {fmtCurrency(data.marketCapUsd)}
                </div>
              </div>

              {/* Volume */}
              <div className="mb-2">
                <div className="text-[11px] text-pipe-500 uppercase">Vol 24h</div>
                <div className="text-[14px] font-bold text-pipe-700 font-mono">
                  {fmtCurrency(data.volume24h)}
                </div>
              </div>

              {/* 24h Change */}
              {priceChg != null && (
                <div className={cn(
                  "inline-flex items-center gap-1 px-2 py-1 rounded-[8px] border-2 border-pipe-900",
                  priceChg >= 0 ? "bg-luigi-green-500" : "bg-mario-red-500"
                )}>
                  <span className="text-white font-bold text-[13px] font-mono">
                    {priceChg >= 0 ? "+" : ""}{priceChg.toFixed(1)}%
                  </span>
                </div>
              )}
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
      <div className="rounded-[16px] overflow-hidden bg-white border-4 border-pipe-900 shadow-[6px_6px_0_rgba(0,0,0,0.3)] animate-pulse">
        <div className="flex items-center gap-4 p-4">
          {/* Logo skeleton */}
          <div className="w-16 h-16 bg-pipe-200 rounded-[12px] border-3 border-pipe-900" />
          
          {/* Middle content skeleton */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-5 bg-pipe-200 rounded w-20" />
              <div className="h-4 bg-pipe-100 rounded w-32" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-5 w-12 bg-pipe-200 rounded-[6px]" />
              <div className="h-4 w-16 bg-pipe-100 rounded" />
            </div>
          </div>

          {/* Right content skeleton */}
          <div className="text-right shrink-0">
            <div className="h-4 bg-pipe-100 rounded w-16 mb-1 ml-auto" />
            <div className="h-5 bg-pipe-200 rounded w-20 mb-2 ml-auto" />
            <div className="h-7 w-16 bg-pipe-200 rounded-[8px] border-2 border-pipe-900 ml-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}
