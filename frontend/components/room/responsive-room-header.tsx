'use client'

/**
 * Responsive Room Header Component
 * 
 * UX Best Practices Applied:
 * - Progressive disclosure: Stats collapse on mobile
 * - Touch-first: 44x44px minimum touch targets
 * - Visual hierarchy: Token info always visible, stats contextual
 * - Responsive typography: Fluid sizing with clamp()
 * - Accessibility: Proper ARIA labels and semantic HTML
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { cn, marioStyles } from '@/lib/utils'
import { 
  ArrowLeft, 
  Share2, 
  ExternalLink, 
  Check, 
  TrendingUp, 
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react'
import { formatUSD, formatTokenQuantity } from '@/lib/format'
import { formatPrice } from '@/lib/token-utils'

interface ResponsiveRoomHeaderProps {
  ca: string
  tokenDetails: {
    name: string
    symbol: string
    imageUrl?: string
  }
  currentPrice: number
  priceChange24h: number
  marketCap: number
  volume24h?: number
  holderCount?: number
  tokenHolding?: {
    qty: string
  } | null
}

export function ResponsiveRoomHeader({
  ca,
  tokenDetails,
  currentPrice,
  priceChange24h,
  marketCap,
  volume24h,
  holderCount,
  tokenHolding
}: ResponsiveRoomHeaderProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [shareCopied, setShareCopied] = useState(false)
  const [statsExpanded, setStatsExpanded] = useState(false)

  const handleCopyCA = async () => {
    try {
      await navigator.clipboard.writeText(ca)
      setShareCopied(true)
      toast({ 
        title: "Contract address copied!", 
        description: "Token CA copied to clipboard" 
      })
      setTimeout(() => setShareCopied(false), 2000)
    } catch (err) {
      toast({ 
        title: "Failed to copy", 
        description: "Please copy the CA manually", 
        variant: "destructive" 
      })
    }
  }

  return (
    <header className="bg-sky/20 border-4 border-outline rounded-xl mx-3 mt-3 mb-0 flex-shrink-0 shadow-[6px_6px_0_var(--outline-black)]">
      <div className="p-4">
        {/* Row 1: Token Info + Actions */}
        <div className="flex items-center justify-between gap-3 mb-2">
          {/* Left: Back Button + Token Info */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
              className="h-11 w-11 p-0 rounded-full border-3 border-outline shadow-[2px_2px_0_var(--outline-black)] hover:scale-105 transition-transform flex-shrink-0"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            {tokenDetails.imageUrl && (
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-3 border-outline shadow-[2px_2px_0_var(--outline-black)] overflow-hidden flex-shrink-0">
                <img
                  src={tokenDetails.imageUrl}
                  alt={tokenDetails.symbol || 'Token'}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-xl font-mario font-bold text-outline truncate">
                {tokenDetails.name || 'Unknown Token'}
              </h1>
              <div className="flex items-center gap-1.5 sm:gap-2 text-xs flex-wrap">
                <span className="font-mono font-bold text-sm sm:text-base">
                  ${formatPrice(currentPrice)}
                </span>
                <span
                  className={cn(
                    "mario-badge text-white border-outline text-xs flex items-center gap-1",
                    priceChange24h >= 0 ? "bg-luigi" : "bg-mario"
                  )}
                >
                  {priceChange24h >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {priceChange24h >= 0 ? "+" : ""}{priceChange24h.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyCA}
              className="h-11 w-11 p-0 rounded-lg border-3 border-outline shadow-[2px_2px_0_var(--outline-black)] hover:scale-105 transition-transform"
              aria-label="Copy Contract Address"
            >
              {shareCopied ? (
                <Check className="h-5 w-5 text-luigi" />
              ) : (
                <Share2 className="h-5 w-5" />
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              asChild
              className="h-11 w-11 p-0 rounded-lg border-3 border-outline shadow-[2px_2px_0_var(--outline-black)] hover:scale-105 transition-transform"
            >
              <a
                href={`https://dexscreener.com/solana/${ca}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View on DexScreener"
              >
                <ExternalLink className="h-5 w-5" />
              </a>
            </Button>

            {/* Mobile Stats Toggle - Hidden on desktop (>= 1280px) */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStatsExpanded(!statsExpanded)}
              className="h-11 w-11 p-0 rounded-lg border-3 border-outline shadow-[2px_2px_0_var(--outline-black)] hover:scale-105 transition-transform xl:hidden"
              aria-label="Toggle stats"
            >
              {statsExpanded ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <Info className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Row 2: Holding Badge (if applicable) */}
        {tokenHolding && parseFloat(tokenHolding.qty) > 0 && (
          <div className="mb-2">
            <span className="mario-badge bg-star text-outline text-xs inline-flex">
              Holding: {formatTokenQuantity(tokenHolding.qty)}
            </span>
          </div>
        )}

        {/* Row 3: Market Stats - Collapsible on mobile/tablet, always visible on desktop */}
        <AnimatePresence>
          {statsExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="xl:block overflow-hidden"
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 pt-2 border-t-2 border-outline/20">
                {/* Market Cap */}
                <div className="bg-background/30 rounded-lg p-2 border-2 border-outline/30">
                  <div className="text-[10px] text-foreground/70 uppercase tracking-wide font-bold mb-0.5">
                    MCAP
                  </div>
                  <div className="text-sm sm:text-base font-bold text-outline truncate">
                    {formatUSD(marketCap)}
                  </div>
                </div>

                {/* Volume 24h */}
                {volume24h !== undefined && (
                  <div className="bg-background/30 rounded-lg p-2 border-2 border-outline/30">
                    <div className="text-[10px] text-foreground/70 uppercase tracking-wide font-bold mb-0.5">
                      VOL 24H
                    </div>
                    <div className="text-sm sm:text-base font-bold text-outline truncate">
                      {formatUSD(volume24h)}
                    </div>
                  </div>
                )}

                {/* Holder Count */}
                {holderCount !== undefined && (
                  <div className="bg-background/30 rounded-lg p-2 border-2 border-outline/30">
                    <div className="text-[10px] text-foreground/70 uppercase tracking-wide font-bold mb-0.5">
                      HOLDERS
                    </div>
                    <div className="text-sm sm:text-base font-bold text-outline truncate">
                      {holderCount.toLocaleString()}
                    </div>
                  </div>
                )}

                {/* Price Change */}
                <div className="bg-background/30 rounded-lg p-2 border-2 border-outline/30">
                  <div className="text-[10px] text-foreground/70 uppercase tracking-wide font-bold mb-0.5">
                    24H CHANGE
                  </div>
                  <div className={cn(
                    "text-sm sm:text-base font-bold truncate",
                    priceChange24h >= 0 ? "text-luigi" : "text-mario"
                  )}>
                    {priceChange24h >= 0 ? "+" : ""}{priceChange24h.toFixed(2)}%
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Desktop Stats - Always visible on XL screens */}
        <div className="hidden xl:block">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 pt-2 border-t-2 border-outline/20">
            {/* Market Cap */}
            <div className="bg-background/30 rounded-lg p-2 border-2 border-outline/30">
              <div className="text-[10px] text-foreground/70 uppercase tracking-wide font-bold mb-0.5">
                MCAP
              </div>
              <div className="text-sm sm:text-base font-bold text-outline truncate">
                {formatUSD(marketCap)}
              </div>
            </div>

            {/* Volume 24h */}
            {volume24h !== undefined && (
              <div className="bg-background/30 rounded-lg p-2 border-2 border-outline/30">
                <div className="text-[10px] text-foreground/70 uppercase tracking-wide font-bold mb-0.5">
                  VOL 24H
                </div>
                <div className="text-sm sm:text-base font-bold text-outline truncate">
                  {formatUSD(volume24h)}
                </div>
              </div>
            )}

            {/* Holder Count */}
            {holderCount !== undefined && (
              <div className="bg-background/30 rounded-lg p-2 border-2 border-outline/30">
                <div className="text-[10px] text-foreground/70 uppercase tracking-wide font-bold mb-0.5">
                  HOLDERS
                </div>
                <div className="text-sm sm:text-base font-bold text-outline truncate">
                  {holderCount.toLocaleString()}
                </div>
              </div>
            )}

            {/* Price Change */}
            <div className="bg-background/30 rounded-lg p-2 border-2 border-outline/30">
              <div className="text-[10px] text-foreground/70 uppercase tracking-wide font-bold mb-0.5">
                24H CHANGE
              </div>
              <div className={cn(
                "text-sm sm:text-base font-bold truncate",
                priceChange24h >= 0 ? "text-luigi" : "text-mario"
              )}>
                {priceChange24h >= 0 ? "+" : ""}{priceChange24h.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
