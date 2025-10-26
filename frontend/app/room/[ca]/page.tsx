'use client'

/**
 * Trade Room Page - /room/[ca]
 *
 * Full-width trading page with:
 * - DexScreener embedded chart
 * - Enhanced Mario Trading Panel
 * - Live Chat Room (Coming Soon)
 * - Market Data Panels (Trades, Top Traders, Holders)
 * - Real-time WebSocket price updates
 * - Responsive mobile/desktop layouts
 *
 * IMPORTANT: This is a fully dynamic page that re-renders on route changes
 * 
 * @fileoverview Main trading room page with fixed viewport layout
 * @author 1UP SOL Development Team
 * @since 2025-01-27
 */

import { useEffect, useState, Suspense, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { TradePanel } from '@/components/trade-panel'
import { useAuth } from '@/hooks/use-auth'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api'
import { Loader2, Share2, ExternalLink, ArrowLeft, TrendingUp, TrendingDown, Check } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { usePortfolio, usePosition } from '@/hooks/use-portfolio'
import { usePriceStreamContext } from '@/lib/price-stream-provider'
import { formatTokenQuantity, formatUSD, formatNumber } from '@/lib/format'
import { formatPrice, formatTimeAgo, getPriceChangeColor } from '@/lib/token-utils'
import { MarketDataPanels } from '@/components/trading/market-data-panels'
import { ChatRoom } from '@/components/chat/chat-room'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { cn, marioStyles } from '@/lib/utils'
import { DexScreenerChart } from '@/components/trading/dexscreener-chart'
import { ResizableSplit } from '@/components/ui/resizable-split'
import { PositionPnLBadge } from '@/components/trading/position-pnl-badge'

/**
 * Main trade room content component
 * 
 * Handles the core trading interface with responsive layouts:
 * - Mobile: Single column with floating trade button
 * - Tablet: Chat + Chart/Data + Trade panel
 * - Desktop: Full three-column layout
 * 
 * @returns JSX.Element The complete trading room interface
 */
function TradeRoomContent() {
  const params = useParams()
  const router = useRouter()
  const ca = params?.ca as string

  const { isAuthenticated, user, getUserId } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Trading state
  const [isTrading, setIsTrading] = useState(false)
  const [showMobileTradePanel, setShowMobileTradePanel] = useState(false)
  const [showTradeModal, setShowTradeModal] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [priceUpdating, setPriceUpdating] = useState(false)

  // Get portfolio data
  const { data: portfolio, refetch: refreshPortfolio } = usePortfolio()
  const tokenHolding = usePosition(ca)

  // Get live prices and subscribe to price updates
  const priceStreamContext = usePriceStreamContext()
  const { prices: livePrices, subscribe, unsubscribe } = priceStreamContext
  const solPrice = livePrices.get('So11111111111111111111111111111111111111112')?.price || 208
  const currentPriceData = livePrices.get(ca)
  const priceLastUpdated = currentPriceData?.timestamp || Date.now()

  // Subscribe to price updates for this token and SOL
  useEffect(() => {
    if (ca && subscribe) {
      console.log(`[Room] Subscribing to price updates for ${ca.slice(0, 8)}...`)
      subscribe(ca)
      subscribe('So11111111111111111111111111111111111111112') // SOL

      return () => {
        if (unsubscribe) {
          console.log(`[Room] Unsubscribing from price updates for ${ca.slice(0, 8)}...`)
          unsubscribe(ca)
          unsubscribe('So11111111111111111111111111111111111111112')
        }
      }
    }
  }, [ca, subscribe, unsubscribe])

  // Track price changes for loading animation (will be initialized after tokenDetails)
  const prevPriceRef = useRef<number | undefined>(undefined)

  // Early return if no CA
  if (!ca) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Invalid Token Address</h1>
          <p className="text-outline/70 mb-4">No contract address provided</p>
          <Button onClick={() => router.push('/warp-pipes')}>
            Browse Tokens
          </Button>
        </div>
      </div>
    )
  }

  // Fetch token details (improved refresh rate from 2min to 30s)
  const { data: tokenDetails, isLoading: loadingToken } = useQuery({
    queryKey: ['token-details', ca],
    queryFn: () => api.getTokenDetails(ca),
    staleTime: 10000, // 10 seconds - faster updates for holder counts
    refetchInterval: 30000, // Background refetch every 30 seconds
  })

  // Calculate current price
  const currentPrice = livePrices.get(ca)?.price || parseFloat(tokenDetails?.lastPrice || '0')

  // Track price changes for loading animation
  useEffect(() => {
    if (prevPriceRef.current !== currentPrice && prevPriceRef.current !== undefined) {
      setPriceUpdating(true)
      const timer = setTimeout(() => setPriceUpdating(false), 1000)
      return () => clearTimeout(timer)
    }
    prevPriceRef.current = currentPrice
  }, [currentPrice])

  // Loading state
  if (loadingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-luigi" />
          <div>
            <h3 className="text-lg font-semibold">Loading Token Data</h3>
            <p className="text-sm text-outline/70">Fetching market information...</p>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (!tokenDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div>
            <h1 className="text-2xl font-bold mb-2">Token Not Found</h1>
            <p className="text-outline/70">Unable to load token information</p>
          </div>
          <div className="flex gap-3 justify-center">
            <Button
              variant="outline"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['token-details', ca] })}
              className={marioStyles.button('outline')}
            >
              Try Again
            </Button>
            <Button onClick={() => router.push('/warp-pipes')}>
              Browse Tokens
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const priceChange24h = parseFloat(tokenDetails.priceChange24h || '0')
  const volume24h = parseFloat(tokenDetails.volume24h || '0')
  const marketCap = parseFloat(tokenDetails.marketCapUsd || '0')
  const holderCount = tokenDetails.holderCount 
    ? (typeof tokenDetails.holderCount === 'string' 
        ? parseInt(tokenDetails.holderCount, 10) 
        : tokenDetails.holderCount)
    : undefined

  return (
    <div className="w-full h-full flex flex-col bg-background overflow-hidden">
      {/* Header - Token Info */}
      <header className="mario-card-lg mx-4 mt-4 mb-0 flex-shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Left: Token Info */}
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
              className="h-10 w-10 p-0 rounded-full border-3 border-outline shadow-[2px_2px_0_var(--outline-black)]"
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            {tokenDetails.imageUrl && (
              <div className="w-12 h-12 rounded-full border-3 border-outline shadow-[2px_2px_0_var(--outline-black)] overflow-hidden">
                <img
                  src={tokenDetails.imageUrl}
                  alt={tokenDetails.symbol || 'Token'}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {tokenDetails.name || 'Unknown Token'}
              </h1>
              <div className="flex items-center gap-2 text-sm flex-wrap">
                <span className="font-mono">${formatPrice(currentPrice)}</span>
                <span
                  className={cn(
                    "mario-badge text-white border-outline",
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
                {tokenHolding && parseFloat(tokenHolding.qty) > 0 && (
                  <span className="mario-badge bg-star text-outline">
                    Holding: {formatTokenQuantity(tokenHolding.qty)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Stats + Actions */}
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-xs text-foreground opacity-70 uppercase tracking-wide">MCAP</div>
              <div className="text-lg font-bold">{formatUSD(marketCap)}</div>
            </div>
            <div className="text-right hidden md:block">
              <div className="text-xs text-foreground opacity-70 uppercase tracking-wide">VOL 24H</div>
              <div className="text-lg font-bold">{formatUSD(volume24h)}</div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(window.location.href)
                    setShareCopied(true)
                    toast({ title: "Link copied!", description: "Share this token with others" })
                    setTimeout(() => setShareCopied(false), 2000)
                  } catch (err) {
                    toast({ title: "Failed to copy", description: "Please copy the URL manually", variant: "destructive" })
                  }
                }}
                className="h-10 w-10 p-0 rounded-lg border-3 border-outline shadow-[2px_2px_0_var(--outline-black)]"
                aria-label="Share"
              >
                {shareCopied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Share2 className="h-4 w-4" />
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                asChild
                className="h-10 w-10 p-0 rounded-lg border-3 border-outline shadow-[2px_2px_0_var(--outline-black)]"
              >
                <a
                  href={`https://dexscreener.com/solana/${ca}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="View on DexScreener"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - 3 Column Layout */}
      <main className="flex-1 flex gap-4 p-4 overflow-hidden">
        {/* MOBILE LAYOUT */}
        <div className="md:hidden flex flex-col w-full h-full gap-4">
          {/* Chart */}
          <div className="min-h-[400px] h-[400px] overflow-hidden rounded-2xl">
            <DexScreenerChart tokenAddress={ca} />
          </div>

          {/* Market Data Panels - already has its own card styling */}
          <div className="flex-1 overflow-hidden">
            <MarketDataPanels tokenMint={ca} />
          </div>
        </div>

        {/* Mobile Floating Trade Button */}
        <div className="md:hidden fixed right-6 z-50" style={{ bottom: 'calc(var(--bottom-nav-height, 64px) + 1rem)' }}>
          <Dialog open={showTradeModal} onOpenChange={setShowTradeModal}>
            <DialogTrigger asChild>
              <button className="btn-buy h-14 w-14 rounded-full text-sm">
                TRADE
              </button>
            </DialogTrigger>
            <DialogContent className="mario-card-lg max-w-[90vw] sm:max-w-md mx-4">
              <DialogHeader>
                <DialogTitle className="text-lg text-center font-bold">
                  Trade {tokenDetails.symbol}
                </DialogTitle>
              </DialogHeader>
              <div className="mt-4">
                <TradePanel
                  tokenAddress={ca}
                  volume24h={volume24h}
                  holders={holderCount}
                  userRank={null}
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* DESKTOP/TABLET LAYOUT - 3 Columns */}
        <div className="hidden md:flex w-full h-full gap-4">
          {/* Left: Chat Panel */}
          <aside className="w-80 flex-shrink-0 flex flex-col">
            <div className="mario-card-lg h-full overflow-hidden flex flex-col">
              <ChatRoom tokenMint={ca} />
            </div>
          </aside>

          {/* Center: Market Data Panel with Chart */}
          <section className="flex-1 min-w-0 flex flex-col gap-4">
            {/* Chart */}
            <div className="flex-1 min-h-[400px] overflow-hidden rounded-2xl">
              <DexScreenerChart tokenAddress={ca} />
            </div>

            {/* Market Data Tabs - already has its own card styling */}
            <div className="flex-1 overflow-hidden">
              <MarketDataPanels tokenMint={ca} />
            </div>
          </section>

          {/* Right: Trade Panel */}
          <aside className="w-80 flex-shrink-0 flex flex-col">
            <div className="mario-card-lg flex-1 overflow-y-auto">
              <TradePanel
                tokenAddress={ca}
                volume24h={volume24h}
                holders={holderCount}
                userRank={null}
              />
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}

/**
 * Trade Room Page Component
 * 
 * Wraps the main content with Suspense for loading states.
 * Provides fallback UI while the trading interface loads.
 * 
 * @returns JSX.Element The complete trade room page
 */
export default function TradeRoomPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-luigi" />
            <div>
              <h3 className="text-lg font-semibold">Loading Trade Room</h3>
              <p className="text-sm text-outline/70">Preparing your trading interface...</p>
            </div>
          </div>
        </div>
      }
    >
      <TradeRoomContent />
    </Suspense>
  )
}
