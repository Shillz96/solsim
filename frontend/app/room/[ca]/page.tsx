'use client'

/**
 * Trade Room Page - /room/[ca]
 *
 * Full-width trading page with:
 * - TradingView Lightweight Charts with trade markers
 * - Enhanced Mario Trading Panel
 * - Live Chat Room (Coming Soon)
 * - Market Data Panels (Trades, Top Traders, Holders)
 * - Real-time WebSocket price updates
 * - Responsive mobile/desktop layouts
 *
 * IMPORTANT: This is a fully dynamic page that re-renders on route changes
 */

import { useEffect, useState, Suspense, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamicImport from 'next/dynamic'
import { MarioTradingPanel } from '@/components/trading/mario-trading-panel'
import { useAuth } from '@/hooks/use-auth'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api'
import { Loader2, Share2, ExternalLink, ArrowLeft, TrendingUp, TrendingDown, Check } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { usePortfolio, usePosition } from '@/hooks/use-portfolio'
import { usePriceStreamContext } from '@/lib/price-stream-provider'
import { formatTokenQuantity, formatUSD, formatNumber } from '@/lib/format'
import { ErrorBoundary } from '@/components/error-boundary'
import { ChartFallback } from '@/components/trading/chart-fallback'
import { MarketDataPanels } from '@/components/trading/market-data-panels'
import { ChatRoom } from '@/components/chat/chat-room'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'

// Dynamically import chart to prevent SSR issues
const LightweightChart = dynamicImport(
  () => import('@/components/trading/lightweight-chart').then(
    (mod) => ({
      default: mod.default || mod.LightweightChart || (() => <ChartFallback error={true} />)
    })
  ).catch(() => ({
    default: () => <ChartFallback error={true} />
  })),
  {
    ssr: false,
    loading: () => <ChartFallback />,
  }
)

function TradeRoomContent() {
  const params = useParams()
  const router = useRouter()
  const ca = params?.ca as string

  // Dynamic price precision based on magnitude
  const formatPrice = (price: number) => {
    if (price >= 100) return price.toFixed(2)
    if (price >= 1) return price.toFixed(4)
    if (price >= 0.01) return price.toFixed(6)
    if (price >= 0.0001) return price.toFixed(8)
    return price.toFixed(10)
  }

  // Format time ago
  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (seconds < 60) return `${seconds}s ago`
    if (minutes < 60) return `${minutes}m ago`
    return `${hours}h ago`
  }
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

  // Get live prices
  const { prices: livePrices } = usePriceStreamContext()
  const solPrice = livePrices.get('So11111111111111111111111111111111111111112')?.price || 208
  const currentPriceData = livePrices.get(ca)
  const priceLastUpdated = currentPriceData?.timestamp || Date.now()

  // Calculate current price (needs to be declared early for useEffect dependencies)
  const currentPrice = livePrices.get(ca)?.price || parseFloat(tokenDetails.lastPrice || '0')

  // Track price changes for loading animation
  const prevPriceRef = useRef(currentPrice)
  useEffect(() => {
    if (prevPriceRef.current !== currentPrice && prevPriceRef.current !== undefined) {
      setPriceUpdating(true)
      const timer = setTimeout(() => setPriceUpdating(false), 1000)
      return () => clearTimeout(timer)
    }
    prevPriceRef.current = currentPrice
  }, [currentPrice])

  // Early return if no CA
  if (!ca) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Invalid Token Address</h1>
          <p className="text-muted-foreground mb-4">No contract address provided</p>
          <Button onClick={() => router.push('/warp-pipes')}>
            Browse Tokens
          </Button>
        </div>
      </div>
    )
  }

  // Fetch token details
  const { data: tokenDetails, isLoading: loadingToken } = useQuery({
    queryKey: ['token-details', ca],
    queryFn: () => api.getTokenDetails(ca),
    staleTime: 120000, // 2 minutes - reduce excessive refetching
  })

  // Loading state
  if (loadingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-[var(--luigi-green)]" />
          <div>
            <h3 className="text-lg font-semibold">Loading Token Data</h3>
            <p className="text-sm text-muted-foreground">Fetching market information...</p>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (!tokenDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-center space-y-4">
          <div>
            <h1 className="text-2xl font-bold mb-2">Token Not Found</h1>
            <p className="text-muted-foreground">Unable to load token information</p>
          </div>
          <div className="flex gap-3 justify-center">
            <Button
              variant="outline"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['token-details', ca] })}
              className="border-2 border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] hover:shadow-[3px_3px_0_var(--outline-black)] transition-all"
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

  return (
    <div className="flex flex-col h-screen bg-[var(--background)] overflow-hidden">
      {/* Header - Token Info */}
      <header className="border-b-4 border-[var(--outline-black)] bg-white p-3 sm:p-4 flex-shrink-0">
        <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
          {/* Left: Back + Token Info */}
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
              className="border-2 border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] hover:shadow-[3px_3px_0_var(--outline-black)] transition-all h-11 w-11 sm:h-9 sm:w-9 p-0"
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            {tokenDetails.imageUrl && (
              <img
                src={tokenDetails.imageUrl}
                alt={tokenDetails.symbol || 'Token'}
                className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg border-3 border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)]"
              />
            )}

            <div className="min-w-0">
              <div className="font-black text-base sm:text-lg truncate">
                {tokenDetails.name || 'Unknown Token'}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                <span className="font-bold">{tokenDetails.symbol}</span>
                <span>•</span>
                <span className={cn(
                  "font-mono transition-colors duration-300",
                  priceUpdating && "animate-pulse text-[var(--star-yellow)]"
                )}>
                  ${formatPrice(currentPrice)}
                </span>
                <span
                  className={cn(
                    "font-bold flex items-center gap-1",
                    priceChange24h >= 0 ? "text-[var(--luigi-green)]" : "text-[var(--mario-red)]"
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
              <div className="text-[10px] text-muted-foreground">
                Updated {formatTimeAgo(priceLastUpdated)}
              </div>
              {/* Position Indicator */}
              {tokenHolding && parseFloat(tokenHolding.qty) > 0 && (
                <div className="text-xs text-[var(--mario-red)] font-bold mt-1">
                  Holding: {formatTokenQuantity(tokenHolding.qty)}
                </div>
              )}
            </div>
          </div>

          {/* Right: Stats + Actions */}
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-wrap justify-end min-w-0">
            {/* Market Cap - Always show */}
            <div className="text-right min-w-0">
              <div className="text-[10px] text-muted-foreground uppercase leading-tight">MCap</div>
              <div className="text-xs sm:text-sm font-bold truncate max-w-[80px] sm:max-w-none">{formatUSD(marketCap)}</div>
            </div>

            {/* Volume - Hidden on mobile, shown on tablet+ */}
            <div className="hidden md:block text-right min-w-0">
              <div className="text-[10px] text-muted-foreground uppercase leading-tight">Vol 24h</div>
              <div className="text-sm font-bold truncate max-w-[80px]">{formatUSD(volume24h)}</div>
            </div>

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
              className="border-2 border-[var(--outline-black)] bg-[var(--sky-blue)] shadow-[2px_2px_0_var(--outline-black)] hover:shadow-[3px_3px_0_var(--outline-black)] transition-all shrink-0 h-11 w-11 sm:h-9 sm:w-9 p-0"
              aria-label="Share token page"
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
              className="border-2 border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] hover:shadow-[3px_3px_0_var(--outline-black)] transition-all shrink-0 h-11 w-11 sm:h-9 sm:w-9 p-0"
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
      </header>

      {/* Main Content Area */}
      <main className="flex flex-1 w-full overflow-hidden">
        {/* MOBILE LAYOUT */}
        <div className="md:hidden flex flex-col w-full overflow-y-auto">
          {/* Chart */}
          <div className="p-3">
            <div className="min-h-[400px]">
              <ErrorBoundary fallback={<ChartFallback tokenSymbol={tokenDetails.symbol || undefined} error={true} />}>
                <LightweightChart
                  key={`chart-mobile-${ca}`}
                  tokenMint={ca}
                  tokenSymbol={tokenDetails.symbol || 'TOKEN'}
                  className="w-full"
                />
              </ErrorBoundary>
            </div>
          </div>

          {/* Market Data Panels */}
          <div className="border-t-3 border-[var(--outline-black)] bg-[var(--background)] min-h-[300px]">
            <MarketDataPanels tokenMint={ca} />
          </div>
        </div>

        {/* Mobile Floating Trade Button */}
        <div className="md:hidden fixed bottom-6 right-6 z-50">
          <Dialog open={showTradeModal} onOpenChange={setShowTradeModal}>
            <DialogTrigger asChild>
              <Button
                size="lg"
                className="rounded-full h-14 w-14 bg-[var(--mario-red)] hover:bg-[var(--mario-red-hover)] text-white border-3 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)] hover:shadow-[6px_6px_0_var(--outline-black)] transition-all font-mario text-sm"
                aria-label="Open trade panel"
              >
                TRADE
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md mx-4 bg-white border-4 border-[var(--outline-black)] shadow-[8px_8px_0_var(--outline-black)]">
              <DialogHeader>
                <DialogTitle className="font-mario text-lg text-center">
                  Trade {tokenDetails.symbol}
                </DialogTitle>
              </DialogHeader>
              <div className="mt-4">
                <MarioTradingPanel tokenAddress={ca} />
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* TABLET LAYOUT */}
        <div className="hidden md:flex lg:hidden w-full overflow-hidden">
          {/* Left: Chart */}
          <section className="flex-1 flex flex-col bg-[var(--background)] overflow-y-auto">
            {/* Chart Area */}
            <div className="p-4">
              <div className="min-h-[400px]">
                <ErrorBoundary fallback={<ChartFallback tokenSymbol={tokenDetails.symbol || undefined} error={true} />}>
                  <LightweightChart
                    key={`chart-tablet-${ca}`}
                    tokenMint={ca}
                    tokenSymbol={tokenDetails.symbol || 'TOKEN'}
                    className="w-full"
                  />
                </ErrorBoundary>
              </div>
            </div>

            {/* Market Data Panels */}
            <div className="flex-1 min-h-[250px]">
              <MarketDataPanels tokenMint={ca} />
            </div>
          </section>

          {/* Right: Trade Panel */}
          <aside className="flex flex-col w-[320px] border-l-4 border-[var(--outline-black)] bg-[var(--background)] overflow-hidden">
            <div className="p-3 border-b-3 border-[var(--outline-black)] bg-white">
              <MarioTradingPanel tokenAddress={ca} />
            </div>
            <div className="flex-1">
              <ChatRoom tokenMint={ca} />
            </div>
          </aside>
        </div>

        {/* DESKTOP LAYOUT */}
        <div className="hidden lg:flex w-full overflow-hidden">
          {/* Left Section - Chart & Data Panels */}
          <section className="flex-1 flex flex-col bg-[var(--background)] overflow-y-auto">
            {/* Chart Area */}
            <div className="p-4">
              <div className="min-h-[400px] lg:min-h-[600px]">
                <ErrorBoundary fallback={<ChartFallback tokenSymbol={tokenDetails.symbol || undefined} error={true} />}>
                  <LightweightChart
                    key={`chart-desktop-${ca}`}
                    tokenMint={ca}
                    tokenSymbol={tokenDetails.symbol || 'TOKEN'}
                    className="w-full"
                  />
                </ErrorBoundary>
              </div>
            </div>

            {/* Market Data Panels */}
            <div className="flex-1 min-h-[300px]">
              <MarketDataPanels tokenMint={ca} />
            </div>
          </section>

          {/* Right Sidebar - Trade Panel & Chat (Desktop) */}
          <aside className="flex flex-col w-[380px] border-l-4 border-[var(--outline-black)] bg-[var(--background)] overflow-hidden">
            {/* Trade Panel */}
            <div className="p-3 border-b-3 border-[var(--outline-black)] bg-white">
              <MarioTradingPanel tokenAddress={ca} />
            </div>

            {/* Chat Room */}
            <ChatRoom tokenMint={ca} />
          </aside>
        </div>
      </main>
    </div>
  )
}

export default function TradeRoomPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-[var(--luigi-green)]" />
            <div>
              <h3 className="text-lg font-semibold">Loading Trade Room</h3>
              <p className="text-sm text-muted-foreground">Preparing your trading interface...</p>
            </div>
          </div>
        </div>
      }
    >
      <TradeRoomContent />
    </Suspense>
  )
}
