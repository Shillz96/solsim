/**
 * Token Card Component - Redesigned for better readability and information hierarchy
 *
 * Enhanced horizontal layout with:
 * - Larger token image (120px) with no white border
 * - Clear metric labels and values
 * - Security status indicator
 * - Removed redundant badges
 * - Improved typography and spacing
 * - Better information organization for quick trading decisions
 */

"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { cn, marioStyles } from "@/lib/utils"
import { motion } from "framer-motion"
import { Shield, Users, Activity, TrendingUp, TrendingDown } from "lucide-react"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
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
    return { label: "SAFE", cls: "bg-[var(--luigi-green)]/10 text-[var(--luigi-green)] border-[var(--luigi-green)]" };
  if (freezeRevoked || mintRenounced)
    return { label: "WARN", cls: "bg-[var(--star-yellow)]/10 text-[var(--star-yellow)] border-[var(--star-yellow)]" };
  return { label: "RISK", cls: "bg-[var(--mario-red)]/10 text-[var(--mario-red)] border-[var(--mario-red)]" };
};

export function TokenCard({ data, onToggleWatch, className }: TokenCardProps) {
  const img = data.imageUrl || data.logoURI || undefined;
  const priceChg = data.priceChange24h ?? null;
  const [imageError, setImageError] = useState(false);
  const age = timeAgo(data.firstSeenAt);

  // Security status for shield icon
  const securityStatus = marioStyles.getSecurityStatus(data.freezeRevoked, data.mintRenounced);
  const securityIconColor = marioStyles.getSecurityIconColor(data.freezeRevoked, data.mintRenounced);

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
        className={cn("w-full mb-3", className)}
      >
        {/* Redesigned Token Card - Enhanced Layout */}
        <div className={cn(
          'cursor-pointer transition-all duration-200',
          'rounded-2xl border-4 border-[var(--outline-black)] p-6 bg-[var(--card)]',
          'shadow-[6px_0_0_var(--outline-black)] hover:shadow-[8px_0_0_var(--outline-black)] hover:-translate-y-1',
          'relative overflow-hidden bg-[var(--sky-blue)]/20',
          'h-[var(--token-card-height)] min-h-[var(--token-card-height)]'
        )}>
          <div className="flex items-center gap-4 p-4 h-full">

            {/* LEFT: Larger Token Logo */}
            <div className={cn(
              'relative shrink-0 overflow-hidden rounded-[14px]',
              'w-[var(--token-card-image-size)] h-[var(--token-card-image-size)]'
            )}>
              {img && !imageError ? (
                <img
                  src={img}
                  alt={data.symbol}
                  className="h-full w-full object-cover"
                  onError={() => setImageError(true)}
                  loading="lazy"
                />
              ) : (
                <div className="h-full w-full grid place-items-center bg-[var(--star-yellow)] text-[var(--outline-black)] text-5xl font-bold">🪙</div>
              )}
            </div>

            {/* MIDDLE: Enhanced Token Info */}
            <div className="flex-1 min-w-0 overflow-hidden">
              {/* Header Row: Symbol, Name, Age, Security */}
              <div className="flex items-center gap-3 mb-2">
                <h3 className={cn(marioStyles.heading(4), 'text-[22px] truncate max-w-[120px]')} title={data.symbol}>
                  {data.symbol}
                </h3>
                <span className={cn(marioStyles.bodyText('semibold'), 'text-[15px] truncate max-w-[120px]')} title={data.name || undefined}>
                  {data.name}
                </span>
                <span className={cn(marioStyles.bodyText('bold'), 'text-[12px] ml-auto flex-shrink-0')}>
                  {age}
                </span>
                {/* Security Shield Icon */}
                <Shield className={cn(securityIconColor, 'flex-shrink-0')} />
              </div>

              {/* Description (if available, with better truncation) */}
              {data.description && (
                <div className="text-[12px] text-[var(--outline-black)] font-medium mb-2 line-clamp-2 max-w-[280px] overflow-hidden" title={data.description}>
                  {data.description.length > 120 ? `${data.description.substring(0, 120)}...` : data.description}
                </div>
              )}

              {/* Metrics Grid - 3 columns */}
              <div className="grid grid-cols-3 gap-3 mb-2 flex-shrink-0">
                {/* Market Cap */}
                <div className="flex flex-col">
                  <div className={marioStyles.formatMetricLabel('MC')}>
                    Market Cap
                  </div>
                  <div className={marioStyles.formatMetricValue(data.marketCapUsd)}>
                    {fmtCurrency(data.marketCapUsd)}
                  </div>
                </div>

                {/* Volume */}
                <div className="flex flex-col">
                  <div className={marioStyles.formatMetricLabel('Vol')}>
                    Volume 24h
                  </div>
                  <div className={marioStyles.formatMetricValue(data.volume24h)}>
                    {fmtCurrency(data.volume24h)}
                  </div>
                </div>

                {/* 24h Change */}
                <div className="flex flex-col">
                  <div className={marioStyles.formatMetricLabel('24h')}>
                    24h Change
                  </div>
                  {priceChg != null ? (
                    <div className={cn(
                      marioStyles.formatMetricValue(priceChg, priceChg >= 0 ? 'positive' : 'negative'),
                      'flex items-center gap-1'
                    )}>
                      {priceChg >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {priceChg >= 0 ? "+" : ""}{priceChg.toFixed(1)}%
                    </div>
                  ) : (
                    <div className={marioStyles.formatMetricValue(null)}>—</div>
                  )}
                </div>
              </div>

              {/* Secondary Metrics Row */}
              <div className="grid grid-cols-3 gap-3 mb-2 flex-shrink-0">
                {/* Holders */}
                <div className="flex flex-col">
                  <div className={marioStyles.formatMetricLabel('Holders')}>
                    Holders
                  </div>
                  <div className={marioStyles.formatMetricValue(data.holderCount)}>
                    {data.holderCount ? data.holderCount.toLocaleString() : '—'}
                  </div>
                </div>

                {/* Transactions */}
                <div className="flex flex-col">
                  <div className={marioStyles.formatMetricLabel('Txns')}>
                    Transactions
                  </div>
                  <div className={marioStyles.formatMetricValue(data.txCount24h)}>
                    {data.txCount24h ? data.txCount24h.toLocaleString() : '—'}
                  </div>
                </div>

                {/* Liquidity */}
                <div className="flex flex-col">
                  <div className={marioStyles.formatMetricLabel('Liq')}>
                    Liquidity
                  </div>
                  <div className={marioStyles.formatMetricValue(data.liqUsd)}>
                    {fmtCurrency(data.liqUsd)}
                  </div>
                </div>
              </div>

              {/* SOL to Graduate Progress Bar - Only for ABOUT_TO_BOND */}
              {data.status === 'ABOUT_TO_BOND' && data.bondingCurveProgress != null && data.solToGraduate != null && (
                <div className="mt-2 relative">
                  <div className="bg-[var(--card)] border-2 border-[var(--outline-black)] rounded-full h-3 overflow-hidden relative shadow-[1px_1px_0_var(--outline-black)]">
                    <div
                      className="bg-[var(--star-yellow)] h-full flex items-center justify-center border-r-2 border-[var(--outline-black)] transition-all duration-500 relative"
                      style={{ width: `${Math.min(data.bondingCurveProgress, 100)}%` }}
                    >
                      {/* Glow effect */}
                      <div className="absolute inset-0 bg-[var(--star-yellow)] opacity-50 animate-pulse" />
                      <span className="text-[8px] font-bold text-[var(--outline-black)] z-10 relative drop-shadow-[2px_2px_0_var(--outline-black)]">
                        🎯 {data.solToGraduate.toFixed(1)} SOL
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom Row: Social Links & Creator */}
              <div className="flex items-center gap-2 mt-1 flex-shrink-0">
                {/* Social Links */}
                {(data.twitter || data.telegram || data.website) && (
                  <div className="flex items-center gap-1.5">
                    {data.twitter && (
                      <HoverCard openDelay={200}>
                        <HoverCardTrigger asChild>
                          <a
                            href={data.twitter.startsWith('http') ? data.twitter : `https://twitter.com/${data.twitter}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:scale-110 transition-transform"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Image 
                              src="/x-logo/logo.svg" 
                              alt="X/Twitter" 
                              width={16} 
                              height={16}
                              className="inline-block filter brightness-0"
                            />
                          </a>
                        </HoverCardTrigger>
                        <HoverCardContent 
                          className="w-80 p-4 bg-[var(--card)] border-4 border-[var(--outline-black)] rounded-xl shadow-[6px_6px_0_var(--outline-black)] z-50" 
                          side="top"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="space-y-2">
                            <div className="flex items-start gap-3">
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-xl border-3 border-[var(--outline-black)]">
                                {data.symbol?.[0] || '?'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-bold text-base truncate text-[var(--outline-black)]">{data.name || data.symbol}</div>
                                <div className="text-sm text-pipe-600 truncate">@{data.twitter}</div>
                              </div>
                            </div>
                            <p className="text-sm line-clamp-3 text-[var(--outline-black)]">{data.description || 'No description available'}</p>
                            <div className="flex gap-4 text-xs text-pipe-600 font-bold">
                              <span>Click to view on X →</span>
                            </div>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    )}
                    {data.telegram && (
                      <HoverCard openDelay={200}>
                        <HoverCardTrigger asChild>
                          <a
                            href={data.telegram.startsWith('http') ? data.telegram : `https://t.me/${data.telegram}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:scale-110 transition-transform"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Image 
                              src="/icons/social/telegram-icon.svg" 
                              alt="Telegram" 
                              width={16} 
                              height={16}
                              className="inline-block"
                            />
                          </a>
                        </HoverCardTrigger>
                        <HoverCardContent 
                          className="w-80 p-4 bg-[var(--card)] border-4 border-[var(--outline-black)] rounded-xl shadow-[6px_6px_0_var(--outline-black)] z-50" 
                          side="top"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="space-y-2">
                            <div className="flex items-start gap-3">
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-2xl border-3 border-[var(--outline-black)]">
                                ✈️
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-bold text-base truncate text-[var(--outline-black)]">{data.name || data.symbol}</div>
                                <div className="text-sm text-pipe-600 truncate">{data.telegram}</div>
                              </div>
                            </div>
                            <p className="text-sm line-clamp-3 text-[var(--outline-black)]">{data.description || 'Join the Telegram community'}</p>
                            <div className="flex gap-4 text-xs text-pipe-600 font-bold">
                              <span>Click to join Telegram →</span>
                            </div>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    )}
                    {data.website && (
                      <HoverCard openDelay={200}>
                        <HoverCardTrigger asChild>
                          <a
                            href={data.website.startsWith('http') ? data.website : `https://${data.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:scale-110 transition-transform"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Image 
                              src="/icons/social/globe-icon.svg" 
                              alt="Website" 
                              width={16} 
                              height={16}
                              className="inline-block"
                            />
                          </a>
                        </HoverCardTrigger>
                        <HoverCardContent 
                          className="w-80 p-4 bg-[var(--card)] border-4 border-[var(--outline-black)] rounded-xl shadow-[6px_6px_0_var(--outline-black)] z-50" 
                          side="top"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="space-y-2">
                            <div className="flex items-start gap-3">
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl border-3 border-[var(--outline-black)]">
                                🌐
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-bold text-base truncate text-[var(--outline-black)]">{data.name || data.symbol}</div>
                                <div className="text-sm text-pipe-600 truncate break-all">{data.website}</div>
                              </div>
                            </div>
                            <p className="text-sm line-clamp-3 text-[var(--outline-black)]">{data.description || 'Visit official website'}</p>
                            <div className="flex gap-4 text-xs text-pipe-600 font-bold">
                              <span>Click to visit website →</span>
                            </div>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    )}
                  </div>
                )}

                {/* Creator Wallet */}
                {data.creatorWallet && (
                  <div className="text-[11px] text-[var(--outline-black)] opacity-50 font-mono ml-auto" title={data.creatorWallet}>
                    👨‍💻 {shorten(data.creatorWallet, 3, 3)}
                  </div>
                )}
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
      <div className="rounded-[16px] overflow-hidden bg-[var(--card)] border-4 border-[var(--outline-black)] shadow-[6px_6px_0_var(--outline-black)] animate-pulse">
        <div className="flex items-center gap-4 p-4">
          {/* Logo skeleton */}
          <div className="w-20 h-20 bg-[var(--background)] rounded-[14px] border-4 border-[var(--outline-black)]" />

          {/* Middle content skeleton */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-5 bg-[var(--background)] rounded w-20" />
              <div className="h-4 bg-[var(--background)] opacity-60 rounded w-32" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-5 w-12 bg-[var(--background)] rounded-[6px]" />
              <div className="h-4 w-16 bg-[var(--background)] opacity-60 rounded" />
            </div>
          </div>

          {/* Right content skeleton */}
          <div className="text-right shrink-0">
            <div className="h-4 bg-[var(--background)] opacity-60 rounded w-16 mb-1 ml-auto" />
            <div className="h-5 bg-[var(--background)] rounded w-20 mb-2 ml-auto" />
            <div className="h-7 w-16 bg-[var(--background)] rounded-[8px] border-2 border-[var(--outline-black)] ml-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}
