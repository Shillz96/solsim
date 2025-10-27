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

import { useState, useMemo } from "react"
import Link from "next/link"
import { cn, marioStyles } from "@/lib/utils"
import { motion } from "framer-motion"
import { Shield, TrendingUp, TrendingDown } from "lucide-react"
import { SocialHoverCard } from "./social-hover-card"
import type { TokenRow } from "@/lib/types/warp-pipes"
import { usePumpPortalMetadata, usePumpPortalTrades } from "@/hooks/use-pumpportal-trades"
import { usePriceStreamContext } from "@/lib/price-stream-provider"

interface TokenCardProps {
  data: TokenRow
  onToggleWatch?: (mint: string, isWatched: boolean) => Promise<void>
  className?: string
  enableLiveUpdates?: boolean // Enable real-time WebSocket updates (default: true for priority tokens)
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

export function TokenCard({ data, onToggleWatch, className, enableLiveUpdates = true }: TokenCardProps) {
  const img = data.imageUrl || data.logoURI || undefined;
  const priceChg = data.priceChange24h ?? null;
  const [imageError, setImageError] = useState(false);
  const age = timeAgo(data.firstSeenAt);

  // Get real-time SOL price from price stream
  const { prices: livePrices } = usePriceStreamContext();
  const solPrice = livePrices.get('So11111111111111111111111111111111111111112')?.price || 150; // Fallback to 150 if not available

  // Real-time metadata updates from PumpPortal (if enabled)
  const { metadata: liveMetadata, status: metadataStatus } = usePumpPortalMetadata({
    tokenMint: data.mint,
    enabled: enableLiveUpdates,
  });

  // Real-time trade updates for calculating live volume/txns
  const { trades: liveTrades, status: tradesStatus } = usePumpPortalTrades({
    tokenMint: data.mint,
    maxTrades: 20,
    enabled: enableLiveUpdates,
  });

  // Merge live data with cached data (live data takes priority)
  const mergedData = useMemo(() => {
    if (!enableLiveUpdates || !liveMetadata) return data;

    return {
      ...data,
      holderCount: liveMetadata.holderCount ?? data.holderCount,
      marketCapUsd: liveMetadata.marketCapSol
        ? liveMetadata.marketCapSol * solPrice // Real-time SOL -> USD conversion
        : data.marketCapUsd,
      vSolInBondingCurve: liveMetadata.vSolInBondingCurve ?? data.vSolInBondingCurve,
      bondingCurveProgress: liveMetadata.bondingCurveProgress ?? data.bondingCurveProgress,
    };
  }, [data, liveMetadata, enableLiveUpdates, solPrice]);

  // Calculate live transaction count from recent trades
  const liveTxCount = useMemo(() => {
    if (!enableLiveUpdates || liveTrades.length === 0) return data.txCount24h;
    
    // Count trades from last 24h
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const recentTrades = liveTrades.filter(t => t.ts >= oneDayAgo);
    
    // Combine with cached count (assuming cached is slightly stale)
    return (data.txCount24h || 0) + recentTrades.length;
  }, [liveTrades, data.txCount24h, enableLiveUpdates]);

  const isLive = enableLiveUpdates && (metadataStatus === 'connected' || tradesStatus === 'connected');

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
          'surface cursor-pointer',
          'rounded-2xl border-4 border-outline bg-card',
          'shadow-[6px_0_0_var(--outline-black)] hover:shadow-[8px_0_0_var(--outline-black)] hover:-translate-y-1',
          'relative overflow-hidden bg-sky/20',
          'h-[var(--token-card-height)] min-h-[var(--token-card-height)]'
        )}>
          <div className="flex items-center gap-6 p-4 h-full">

            {/* LEFT: Larger Token Logo */}
            <div className={cn(
              'relative shrink-0 overflow-hidden rounded-lg',
              'w-[var(--token-card-image-size)] h-[var(--token-card-image-size)]'
            )}>
              {img && !imageError ? (
                <img
                  src={img}
                  alt={data.symbol}
                  className="h-full w-full object-cover"
                  onError={() => setImageError(true)}
                  loading="lazy"
                  width={120}
                  height={120}
                />
              ) : (
                <div className="h-full w-full grid place-items-center bg-star text-outline text-5xl font-bold">🪙</div>
              )}
            </div>

            {/* MIDDLE: Enhanced Token Info */}
            <div className="flex-1 min-w-0 overflow-hidden flex flex-col justify-between h-full">
              {/* Header Row: Symbol, Name, Age, Security, Live Indicator */}
              <div className="flex items-center gap-2 mb-1">
                <h3 className={cn(marioStyles.heading(4), 'text-[20px] truncate max-w-[100px]')} title={data.symbol}>
                  {data.symbol}
                </h3>
                <span className={cn(marioStyles.bodyText('semibold'), 'text-[14px] truncate max-w-[140px]')} title={data.name || undefined}>
                  {data.name}
                </span>
                <span className={cn(marioStyles.bodyText('bold'), 'text-[11px] ml-auto flex-shrink-0')}>
                  {age}
                </span>
                {/* Live Indicator */}
                {isLive && (
                  <div className="flex items-center gap-1 text-[10px] font-bold text-luigi bg-luigi/10 px-1.5 py-0.5 rounded-full border border-luigi">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-luigi animate-pulse" />
                    LIVE
                  </div>
                )}
                {/* Security Shield Icon */}
                <Shield className={cn(securityIconColor, 'flex-shrink-0 w-4 h-4')} />
              </div>

              {/* Description (if available, with better truncation) */}
              {data.description && (
                <div className="text-[11px] text-outline font-medium mb-1 line-clamp-1 max-w-full overflow-hidden" title={data.description}>
                  {data.description.length > 100 ? `${data.description.substring(0, 100)}...` : data.description}
                </div>
              )}

              {/* Metrics Grid - 3 columns */}
              <div className="grid grid-cols-3 gap-2 mb-1 flex-shrink-0">
                {/* 24h Change */}
                <div className="flex flex-col">
                  <div className={marioStyles.formatMetricLabel('24h')}>
                    24h Change
                  </div>
                  {priceChg != null ? (
                    <div className={cn(
                      marioStyles.formatMetricValue(priceChg, priceChg >= 0 ? 'positive' : 'negative'),
                      'flex items-center gap-0.5'
                    )}>
                      {priceChg >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {priceChg >= 0 ? "+" : ""}{priceChg.toFixed(1)}%
                    </div>
                  ) : (
                    <div className={marioStyles.formatMetricValue(null)}>—</div>
                  )}
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

                {/* Market Cap */}
                <div className="flex flex-col">
                  <div className={marioStyles.formatMetricLabel('MC')}>
                    Market Cap
                  </div>
                  <div className={cn(
                    marioStyles.formatMetricValue(mergedData.marketCapUsd),
                    // Highlight market cap > $100k in green
                    mergedData.marketCapUsd && mergedData.marketCapUsd >= 100000 && 'text-luigi font-extrabold text-[15px]'
                  )}>
                    {fmtCurrency(mergedData.marketCapUsd)}
                  </div>
                </div>
              </div>

              {/* Secondary Metrics Row */}
              <div className="grid grid-cols-3 gap-2 mb-1 flex-shrink-0">
                {/* Holders - Now with real-time updates */}
                <div className="flex flex-col">
                  <div className={marioStyles.formatMetricLabel('Holders')}>
                    Holders
                  </div>
                  <div className={cn(
                    marioStyles.formatMetricValue(mergedData.holderCount),
                    isLive && 'text-luigi'
                  )}>
                    {mergedData.holderCount ? mergedData.holderCount.toLocaleString() : '—'}
                  </div>
                </div>

                {/* Transactions - Now with real-time updates */}
                <div className="flex flex-col">
                  <div className={marioStyles.formatMetricLabel('Txns')}>
                    Transactions
                  </div>
                  <div className={cn(
                    marioStyles.formatMetricValue(liveTxCount),
                    isLive && 'text-luigi'
                  )}>
                    {liveTxCount ? liveTxCount.toLocaleString() : '—'}
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

              {/* SOL to Graduate Progress Bar - Only for ABOUT_TO_BOND - Now with real-time updates */}
              {data.status === 'ABOUT_TO_BOND' && mergedData.bondingCurveProgress != null && data.solToGraduate != null && (
                <div className="mt-1 relative">
                  <div className="bg-card border-2 border-outline rounded-full h-2.5 overflow-hidden relative shadow-[1px_1px_0_var(--outline-black)]">
                    <div
                      className="bg-star h-full flex items-center justify-center border-r-2 border-outline transition-all duration-500 relative"
                      style={{ width: `${Math.min(mergedData.bondingCurveProgress, 100)}%` }}
                    >
                      {/* Glow effect */}
                      <div className="absolute inset-0 bg-star opacity-50 animate-pulse" />
                      <span className="text-[7px] font-bold text-outline z-10 relative drop-shadow-[1px_1px_0_var(--outline-black)]">
                        🎯 {data.solToGraduate.toFixed(1)} SOL
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom Row: Social Links & Creator */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Social Links */}
                {(data.twitter || data.telegram || data.website) && (
                  <div className="flex items-center gap-1">
                    {data.twitter && (
                      <SocialHoverCard
                        platform="twitter"
                        url={data.twitter}
                        tokenName={data.name || undefined}
                        tokenSymbol={data.symbol}
                        description={data.description || undefined}
                      />
                    )}
                    {data.telegram && (
                      <SocialHoverCard
                        platform="telegram"
                        url={data.telegram}
                        tokenName={data.name || undefined}
                        tokenSymbol={data.symbol}
                        description={data.description || undefined}
                      />
                    )}
                    {data.website && (
                      <SocialHoverCard
                        platform="website"
                        url={data.website}
                        tokenName={data.name || undefined}
                        tokenSymbol={data.symbol}
                        description={data.description || undefined}
                      />
                    )}
                  </div>
                )}

                {/* Creator Wallet */}
                {data.creatorWallet && (
                  <div className="text-[10px] text-outline opacity-50 font-mono ml-auto" title={data.creatorWallet}>
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
      <div className="rounded-xl overflow-hidden bg-card border-4 border-outline shadow-[6px_6px_0_var(--outline-black)] animate-pulse">
        <div className="flex items-center gap-4 p-4">
          {/* Logo skeleton */}
          <div className="w-20 h-20 bg-background rounded-lg border-4 border-outline" />

          {/* Middle content skeleton */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-5 bg-background rounded w-20" />
              <div className="h-4 bg-background opacity-60 rounded w-32" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-5 w-12 bg-background rounded-sm" />
              <div className="h-4 w-16 bg-background opacity-60 rounded" />
            </div>
          </div>

          {/* Right content skeleton */}
          <div className="text-right shrink-0">
            <div className="h-4 bg-background opacity-60 rounded w-16 mb-1 ml-auto" />
            <div className="h-5 bg-background rounded w-20 mb-2 ml-auto" />
            <div className="h-7 w-16 bg-background rounded border-2 border-outline ml-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}
