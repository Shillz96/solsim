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
  const img = data.logoURI || data.imageUrl || undefined;
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
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className={cn("w-full", className)}
      >
        {/* Horizontal Stock-Style Card with Mario Theme */}
        <div className="relative rounded-xl overflow-hidden bg-card border-4 border-outline hover:border-outline-light shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200">

          {/* Horizontal Layout: Square Logo | Content | Market Data */}
          <div className="flex items-stretch">

            {/* LEFT: Square Token Logo (Full Height) */}
            <div className="relative shrink-0 w-32 bg-neutral-100">
              {img ? (
                <img src={img} alt={data.symbol} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full grid place-items-center bg-neutral-100 text-neutral-400 text-5xl">🪙</div>
              )}
            </div>

            {/* MIDDLE: Token Info & Metrics */}
            <div className="flex-1 min-w-0 p-5">
              {/* Symbol & Name */}
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-xl text-foreground">
                  {data.symbol}
                </h3>
                <span className="text-sm text-muted-foreground truncate">
                  {data.name}
                </span>
              </div>

              {/* Price */}
              <div className="text-3xl font-bold text-foreground mb-2">
                {fmtCurrency(data.marketCapUsd)}
              </div>

              {/* 24h Change */}
              {priceChg != null && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">24h Change</span>
                  <span className={cn(
                    "text-lg font-bold",
                    priceChg >= 0 ? "text-profit" : "text-loss"
                  )}>
                    {priceChg >= 0 ? "+" : ""}{priceChg.toFixed(2)}%
                  </span>
                </div>
              )}
            </div>

            {/* RIGHT: Market Cap & Volume Display */}
            <div className="shrink-0 flex flex-col justify-center items-end pr-5 border-l-2 border-border min-w-[180px]">
              {/* Volume 24h */}
              <div className="text-right mb-4">
                <div className="text-xs text-muted-foreground mb-1">Volume 24h</div>
                <div className="text-lg font-bold text-foreground">
                  {fmtCurrency(data.volume24h)}
                </div>
              </div>

              {/* Market Cap */}
              <div className="text-right">
                <div className="text-xs text-muted-foreground mb-1">Market Cap</div>
                <div className="text-lg font-bold text-foreground">
                  {fmtCurrency(data.marketCapUsd)}
                </div>
              </div>
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
      <div className="rounded-xl overflow-hidden bg-card border-4 border-neutral-200 shadow-card animate-pulse">
        <div className="flex items-stretch">
          {/* Square logo skeleton */}
          <div className="w-32 bg-neutral-200 shrink-0" />

          {/* Content skeleton */}
          <div className="flex-1 p-5">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-6 bg-neutral-200 rounded w-24" />
              <div className="h-4 bg-neutral-100 rounded w-32" />
            </div>
            <div className="h-9 bg-neutral-200 rounded w-32 mb-2" />
            <div className="h-6 bg-neutral-100 rounded w-40" />
          </div>

          {/* Market data skeleton */}
          <div className="flex flex-col justify-center items-end pr-5 border-l-2 border-neutral-200 min-w-[180px]">
            <div className="text-right mb-4">
              <div className="h-3 bg-neutral-100 rounded w-16 mb-1 ml-auto" />
              <div className="h-5 bg-neutral-200 rounded w-24 ml-auto" />
            </div>
            <div className="text-right">
              <div className="h-3 bg-neutral-100 rounded w-20 mb-1 ml-auto" />
              <div className="h-5 bg-neutral-200 rounded w-24 ml-auto" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
