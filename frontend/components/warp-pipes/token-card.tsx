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
        {/* Mario-Themed Token Card */}
        <div className="relative rounded-[16px] overflow-hidden bg-white border-4 border-pipe-900 shadow-[6px_6px_0_rgba(0,0,0,0.3)] hover:shadow-[8px_8px_0_rgba(0,0,0,0.3)] hover:-translate-y-[2px] transition-all duration-200 cursor-pointer">

          {/* Vertical Layout: Logo on top, content below */}
          <div className="flex flex-col">

            {/* TOP: Token Header with Logo */}
            <div className="flex items-center gap-3 p-4 bg-sky-50 border-b-4 border-pipe-900">
              {/* Token Logo */}
              <div className="relative shrink-0 w-12 h-12 rounded-[10px] overflow-hidden border-3 border-pipe-900 shadow-[2px_2px_0_rgba(0,0,0,0.2)]">
                {img && !imageError ? (
                  <img
                    src={img}
                    alt={data.symbol}
                    className="h-full w-full object-cover"
                    onError={() => setImageError(true)}
                    loading="lazy"
                  />
                ) : (
                  <div className="h-full w-full grid place-items-center bg-star-yellow-500 text-pipe-900 text-2xl font-bold">🪙</div>
                )}
              </div>

              {/* Symbol & Name */}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-[18px] text-pipe-900">
                  {data.symbol}
                </h3>
                <span className="text-[12px] text-pipe-600 truncate block">
                  {data.name}
                </span>
              </div>

              {/* 24h Change Badge */}
              {priceChg != null && (
                <div className={cn(
                  "px-3 py-1 rounded-[10px] border-3 border-pipe-900 shadow-[2px_2px_0_rgba(0,0,0,0.2)]",
                  priceChg >= 0 ? "bg-luigi-green-500" : "bg-mario-red-500"
                )}>
                  <span className="text-white font-bold text-[14px]">
                    {priceChg >= 0 ? "+" : ""}{priceChg.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>

            {/* BOTTOM: Market Data */}
            <div className="p-4 space-y-3 bg-white">
              {/* Market Cap - Large Display */}
              <div className="text-center">
                <div className="text-[24px] font-bold text-pipe-900 mb-1 font-mono">
                  {fmtCurrency(data.marketCapUsd)}
                </div>
                <div className="text-[12px] text-pipe-600 uppercase tracking-wide font-semibold">
                  Market Cap
                </div>
              </div>

              {/* Volume 24h */}
              <div className="flex justify-between items-center bg-sky-50 rounded-[10px] p-3 border-2 border-pipe-300">
                <span className="text-[12px] text-pipe-600 font-semibold">Volume 24h</span>
                <span className="text-[14px] font-bold text-pipe-900 font-mono">
                  {fmtCurrency(data.volume24h)}
                </span>
              </div>

              {/* Trade Now Button */}
              <button className="w-full bg-mario-red-500 text-white font-bold py-3 px-4 rounded-[12px] border-3 border-pipe-900 shadow-[4px_4px_0_rgba(0,0,0,0.3)] hover:shadow-[6px_6px_0_rgba(0,0,0,0.3)] hover:-translate-y-[2px] transition-all">
                🎮 Trade Now
              </button>
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
        <div className="flex flex-col">
          {/* Header skeleton */}
          <div className="flex items-center gap-3 p-4 bg-sky-50 border-b-4 border-pipe-900">
            <div className="w-12 h-12 bg-pipe-200 rounded-[10px] border-3 border-pipe-900" />
            <div className="flex-1">
              <div className="h-5 bg-pipe-200 rounded w-24 mb-1" />
              <div className="h-3 bg-pipe-100 rounded w-32" />
            </div>
            <div className="h-8 w-16 bg-pipe-200 rounded-[10px] border-3 border-pipe-900" />
          </div>

          {/* Content skeleton */}
          <div className="p-4 space-y-3 bg-white">
            <div className="text-center">
              <div className="h-7 bg-pipe-200 rounded w-32 mx-auto mb-1" />
              <div className="h-3 bg-pipe-100 rounded w-20 mx-auto" />
            </div>
            <div className="h-10 bg-sky-50 rounded-[10px] border-2 border-pipe-300" />
            <div className="h-12 bg-pipe-200 rounded-[12px] border-3 border-pipe-900" />
          </div>
        </div>
      </div>
    </div>
  );
}
