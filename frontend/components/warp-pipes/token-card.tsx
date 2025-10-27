/**
 * Token Card Component - Compact horizontal layout with theme token compatibility
 *
 * Features:
 * - Ultra-compact horizontal design (fits more cards on screen)
 * - Uses theme CSS variables for consistent sizing
 * - Mario-themed styling with proper shadows and borders
 * - Real-time live updates via WebSocket
 * - Responsive social icons and security indicators
 */

"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { cn, marioStyles } from "@/lib/utils"
import { Shield, ShieldCheck, ShieldAlert } from "lucide-react"
import { SocialHoverCard } from "./social-hover-card"
import type { TokenRow } from "@/lib/types/warp-pipes"
import { usePumpPortalMetadata, usePumpPortalTrades } from "@/hooks/use-pumpportal-trades"
import { usePriceStreamContext } from "@/lib/price-stream-provider"

interface TokenCardProps {
  data: TokenRow
  onToggleWatch?: (mint: string, isWatched: boolean) => Promise<void>
  className?: string
  enableLiveUpdates?: boolean
}

// --------- UTILITIES ---------
const fmtCompact = (n?: number | null) =>
  n == null ? "—" : new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

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
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const age = timeAgo(data.firstSeenAt);

  // Get real-time SOL price from price stream
  const { prices: livePrices } = usePriceStreamContext();
  const solPrice = livePrices.get('So11111111111111111111111111111111111111112')?.price || 150;

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
        ? liveMetadata.marketCapSol * solPrice
        : data.marketCapUsd,
      vSolInBondingCurve: liveMetadata.vSolInBondingCurve ?? data.vSolInBondingCurve,
      bondingCurveProgress: liveMetadata.bondingCurveProgress ?? data.bondingCurveProgress,
    };
  }, [data, liveMetadata, enableLiveUpdates, solPrice]);

  // Calculate live transaction count from recent trades
  const liveTxCount = useMemo(() => {
    if (!enableLiveUpdates || liveTrades.length === 0) return data.txCount24h;
    
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const recentTrades = liveTrades.filter(t => t.ts >= oneDayAgo);
    
    return (data.txCount24h || 0) + recentTrades.length;
  }, [liveTrades, data.txCount24h, enableLiveUpdates]);

  const isLive = enableLiveUpdates && (metadataStatus === 'connected' || tradesStatus === 'connected');

  // Security icon using marioStyles
  const SecurityIcon = () => {
    if (data.mintRenounced && data.freezeRevoked)
      return <span title="Fully secured"><ShieldCheck className="w-3.5 h-3.5 text-luigi" /></span>;
    if (data.mintRenounced || data.freezeRevoked)
      return <span title="Partially secured"><Shield className="w-3.5 h-3.5 text-star" /></span>;
    return <span title="Unsecured"><ShieldAlert className="w-3.5 h-3.5 text-mario" /></span>;
  };

  const priceChg = data.priceChange24h ?? null;

  return (
    <Link href={`/room/${data.mint}`} className={cn('block w-full', className)}>
      {/* Compact horizontal card with Mario theme */}
      <div
        className={cn(
          'surface cursor-pointer',
          'rounded-xl border-3 border-outline bg-card',
          'shadow-[4px_4px_0_var(--outline-black)] hover:shadow-[6px_6px_0_var(--outline-black)]',
          'hover:-translate-y-0.5 hover:border-star',
          'bg-sky/20 p-3 flex gap-3 items-start',
          'transition-all duration-200'
        )}
      >
        {/* Token Image - Using theme variable size */}
        <div className="relative w-16 h-16 flex-shrink-0">
          {img && !imageError ? (
            <Image
              src={img}
              alt={data.symbol}
              fill
              className={cn(
                'rounded-lg object-cover border-2 border-outline transition-opacity',
                imageLoaded ? 'opacity-100' : 'opacity-0'
              )}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              unoptimized
            />
          ) : null}

          {/* Fallback */}
          {(imageError || !img) && (
            <div className="flex items-center justify-center w-full h-full bg-star rounded-lg text-2xl font-bold text-outline border-2 border-outline">
              🪙
            </div>
          )}

          {/* Loading skeleton */}
          {!imageLoaded && img && !imageError && (
            <div className="absolute inset-0 bg-background/50 animate-pulse rounded-lg border-2 border-outline" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1">
          {/* Header Row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <h3 className={cn(marioStyles.heading(4), 'text-sm font-black truncate max-w-[140px]')}>
                {data.symbol}
              </h3>
              <SecurityIcon />
            </div>

            {isLive && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-luigi animate-pulse">
                <span className="w-1.5 h-1.5 bg-luigi rounded-full" />
                LIVE
              </span>
            )}
          </div>

          {/* Age */}
          <p className="text-[10px] text-outline/70 font-bold">{age} ago</p>

          {/* Primary Metrics */}
          <div className="flex items-center gap-2 text-xs font-bold">
            <span
              className={cn(
                priceChg != null && priceChg >= 0 ? 'text-luigi' : 'text-mario'
              )}
            >
              {priceChg != null && priceChg >= 0 ? '↑' : '↓'} {fmtPct(Math.abs(priceChg ?? 0))}
            </span>
            <span className="text-outline/50">•</span>
            <span className="text-outline">${fmtCompact(data.volume24h)} vol</span>
          </div>

          {/* Secondary Metrics */}
          <div className="flex items-center gap-2 text-[10px] text-outline/70 font-bold">
            <span>${fmtCompact(mergedData.marketCapUsd)} MC</span>
            <span>•</span>
            <span>{mergedData.holderCount?.toLocaleString() ?? 0} holders</span>
            {liveTxCount && (
              <>
                <span>•</span>
                <span>{liveTxCount.toLocaleString()} txns</span>
              </>
            )}
          </div>

          {/* Bonding Progress (when relevant) */}
          {data.status === 'ABOUT_TO_BOND' &&
            mergedData.bondingCurveProgress != null &&
            data.solToGraduate != null && (
              <div className="mt-1 space-y-0.5">
                <div className="h-1.5 bg-card border-2 border-outline rounded-full overflow-hidden">
                  <div
                    className="h-full bg-star transition-all duration-500"
                    style={{ width: `${Math.min(mergedData.bondingCurveProgress, 100)}%` }}
                  />
                </div>
                <p className="text-[9px] font-bold text-outline">
                  {mergedData.bondingCurveProgress.toFixed(0)}% • {data.solToGraduate.toFixed(1)} SOL to go
                </p>
              </div>
            )}

          {/* Bottom Row - Socials + Creator */}
          <div className="flex items-center justify-between pt-0.5">
            <div className="flex gap-1">
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

            {data.creatorWallet && (
              <span className="font-mono text-[9px] text-outline/50">
                👨‍💻 {shorten(data.creatorWallet, 3, 3)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}


/**
 * Token Card Skeleton - Compact horizontal layout
 */
export function TokenCardSkeleton() {
  return (
    <div className="w-full">
      <div
        className={cn(
          'rounded-xl border-3 border-outline bg-card p-3',
          'shadow-[4px_4px_0_var(--outline-black)]',
          'flex gap-3 animate-pulse'
        )}
      >
        {/* Image skeleton */}
        <div className="w-16 h-16 bg-background/50 rounded-lg border-2 border-outline shrink-0" />

        {/* Content skeleton */}
        <div className="flex-1 space-y-1.5">
          {/* Header */}
          <div className="flex items-center gap-2">
            <div className="h-4 bg-background/50 rounded w-24" />
            <div className="h-3 bg-background/30 rounded w-3" />
          </div>

          {/* Age */}
          <div className="h-3 bg-background/30 rounded w-16" />

          {/* Metrics */}
          <div className="flex gap-2">
            <div className="h-3 bg-background/40 rounded w-16" />
            <div className="h-3 bg-background/30 rounded w-20" />
          </div>

          {/* Secondary metrics */}
          <div className="flex gap-2">
            <div className="h-3 bg-background/30 rounded w-20" />
            <div className="h-3 bg-background/30 rounded w-16" />
          </div>

          {/* Bottom row */}
          <div className="flex justify-between pt-0.5">
            <div className="flex gap-1">
              <div className="h-4 w-4 bg-background/30 rounded" />
              <div className="h-4 w-4 bg-background/30 rounded" />
            </div>
            <div className="h-3 bg-background/30 rounded w-16" />
          </div>
        </div>
      </div>
    </div>
  );
}
