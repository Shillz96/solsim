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
 */

import { useEffect, useState, Suspense, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { MarioTradingPanel } from '@/components/trading/mario-trading-panel'
import { TokenVitalsBar } from '@/components/trading/token-vitals-bar'
import { useAuth } from '@/hooks/use-auth'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api'
import { Loader2, Share2, ExternalLink, ArrowLeft, TrendingUp, TrendingDown, Check } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { usePortfolio, usePosition } from '@/hooks/use-portfolio'
import { usePriceStreamContext } from '@/lib/price-stream-provider'
import { formatTokenQuantity, formatUSD, formatNumber } from '@/lib/format'
import { MarketDataPanels } from '@/components/trading/market-data-panels'
import { ChatRoom } from '@/components/chat/chat-room'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { cn, marioStyles } from '@/lib/utils'
import { DexScreenerChart } from '@/components/trading/dexscreener-chart'
import { ResizableSplit } from '@/components/ui/resizable-split'
import { PositionPnLBadge } from '@/components/trading/position-pnl-badge'

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

  // Track price changes for loading animation (will be initialized after tokenDetails)
  const prevPriceRef = useRef<number | undefined>(undefined)

  // Early return if no CA
  if (!ca) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Invalid Token Address</h1>
          <p className="text-[var(--outline-black)]/70 mb-4">No contract address provided</p>
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
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-[var(--luigi-green)]" />
          <div>
            <h3 className="text-lg font-semibold">Loading Token Data</h3>
            <p className="text-sm text-[var(--outline-black)]/70">Fetching market information...</p>
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
            <p className="text-[var(--outline-black)]/70">Unable to load token information</p>
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

  return (
    <div className="flex flex-col bg-[var(--background)] h-full">
      {/* Header - Token Info */}
      <header className={cn(
        marioStyles.border('lg'),
        'border-b-4 bg-white p-2 sm:p-2.5 flex-shrink-0'
      )}>
        <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-2">
          {/* Left: Back + Token Info */}
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
              className={cn(
                marioStyles.iconButton('outline'),
                'h-8 w-8 p-0'
              )}
              aria-label="Go back"
            >
              <ArrowLeft className="h-3 w-3" />
            </Button>

            {tokenDetails.imageUrl && (
              <img
                src={tokenDetails.imageUrl}
                alt={tokenDetails.symbol || 'Token'}
                className={cn(
                  marioStyles.card(),
                  'h-8 w-8 sm:h-10 sm:w-10 rounded-lg'
                )}
              />
            )}

            <div className="min-w-0">
              <div className={cn(marioStyles.heading(3), 'text-sm sm:text-base truncate')}>
                {tokenDetails.name || 'Unknown Token'}
              </div>
              <div className={cn(
                marioStyles.bodyText('normal'),
                'text-xs text-[var(--outline-black)]/70 flex items-center gap-2 flex-wrap'
              )}>
                <span className={marioStyles.bodyText('bold')}>{tokenDetails.symbol}</span>
                <span>•</span>
                <span className={cn(
                  "font-mono transition-colors duration-300",
                  priceUpdating && "animate-pulse text-[var(--star-yellow)]"
                )}>
                  ${formatPrice(currentPrice)}
                </span>
                <span
                  className={cn(
                    marioStyles.bodyText('bold'),
                    "flex items-center gap-1",
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
                {/* Position Indicator - moved inline */}
                {tokenHolding && parseFloat(tokenHolding.qty) > 0 && (
                  <>
                    <span>•</span>
                    <span className={cn(
                      marioStyles.bodyText('bold'),
                      'text-[var(--mario-red)]'
                    )}>
                      Holding: {formatTokenQuantity(tokenHolding.qty)}
                    </span>
                    <span>•</span>
                    <PositionPnLBadge mint={ca} tradeMode="PAPER" className="inline-flex" />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: Stats + Actions */}
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-wrap justify-end min-w-0">
            {/* Market Cap - Always show */}
            <div className="text-right min-w-0">
              <div className={cn(
                marioStyles.bodyText('normal'),
                'text-[10px] text-[var(--outline-black)]/60 uppercase leading-tight'
              )}>MCap</div>
              <div className={cn(
                marioStyles.bodyText('bold'),
                'text-xs sm:text-sm truncate max-w-[80px] sm:max-w-none'
              )}>{formatUSD(marketCap)}</div>
            </div>

            {/* Volume - Hidden on mobile, shown on tablet+ */}
            <div className="hidden md:block text-right min-w-0">
              <div className={cn(
                marioStyles.bodyText('normal'),
                'text-[10px] text-[var(--outline-black)]/60 uppercase leading-tight'
              )}>Vol 24h</div>
              <div className={cn(
                marioStyles.bodyText('bold'),
                'text-sm truncate max-w-[80px]'
              )}>{formatUSD(volume24h)}</div>
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
              className={cn(
                marioStyles.iconButton('secondary'),
                'shrink-0 h-8 w-8 p-0'
              )}
              aria-label="Share token page"
            >
              {shareCopied ? (
                <Check className="h-3 w-3 text-green-600" />
              ) : (
                <Share2 className="h-3 w-3" />
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              asChild
              className={cn(
                marioStyles.iconButton('outline'),
                'shrink-0 h-8 w-8 p-0'
              )}
            >
              <a
                href={`https://dexscreener.com/solana/${ca}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View on DexScreener"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex flex-1 w-full overflow-hidden">
        {/* MOBILE LAYOUT */}
        <div className="md:hidden flex flex-col w-full h-full overflow-hidden">
          {/* Chart */}
          <div className={cn(
            marioStyles.border('lg'),
            'bg-white border-b-4'
          )}>
            <div className="min-h-[400px] h-[400px]">
              <DexScreenerChart tokenAddress={ca} />
            </div>
          </div>

          {/* Market Data Panels */}
          <div className="bg-white flex-1 overflow-hidden">
            <MarketDataPanels tokenMint={ca} />
          </div>
        </div>

        {/* Mobile Floating Trade Button */}
        <div className="md:hidden fixed bottom-6 right-6 z-50">
          <Dialog open={showTradeModal} onOpenChange={setShowTradeModal}>
            <DialogTrigger asChild>
              <Button
                size="lg"
                className={cn(
                  marioStyles.button('danger', 'lg'),
                  'rounded-full h-14 w-14 text-sm'
                )}
                aria-label="Open trade panel"
              >
                TRADE
              </Button>
            </DialogTrigger>
            <DialogContent className={cn(
              marioStyles.cardLg(false),
              'max-w-md mx-4 bg-white'
            )}>
              <DialogHeader>
                <DialogTitle className={cn(
                  marioStyles.heading(2),
                  'text-lg text-center'
                )}>
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
        <div className="hidden md:flex lg:hidden w-full h-full overflow-hidden">
          {/* Left: Chat Room */}
          <aside className={cn(
            marioStyles.border('lg'),
            'flex flex-col w-[280px] border-r-4 bg-white overflow-hidden'
          )}>
            <div className="flex-1 overflow-hidden">
              <ChatRoom tokenMint={ca} />
            </div>
          </aside>

          {/* Center: Resizable Chart & Data */}
          <section className="flex-1 flex flex-col bg-white overflow-hidden">
            <ResizableSplit
              orientation="vertical"
              defaultRatio={50}
              minRatio={30}
              maxRatio={70}
              storageKey="trade-room-chart-split-tablet"
              className="h-full"
            >
              <div className={cn(
                marioStyles.border('lg'),
                'h-full border-b-4'
              )}>
                <DexScreenerChart tokenAddress={ca} />
              </div>
              <div className="h-full overflow-y-auto">
                <MarketDataPanels tokenMint={ca} />
              </div>
            </ResizableSplit>
          </section>

          {/* Right: Trade Panel */}
          <aside className={cn(
            marioStyles.border('lg'),
            'flex flex-col w-[280px] border-l-4 bg-white'
          )}>
            <div className="flex-1 p-3 overflow-y-auto space-y-3">
              <MarioTradingPanel tokenAddress={ca} />
              <TokenVitalsBar
                tokenAddress={ca}
                volume24h={volume24h}
                holders={tokenDetails.holderCount ? parseInt(tokenDetails.holderCount) : undefined}
                userRank={null}
              />
            </div>
          </aside>
        </div>

        {/* DESKTOP LAYOUT */}
        <div className="hidden lg:flex w-full h-full overflow-hidden">
          {/* Left Sidebar - Chat Room */}
          <aside className={cn(
            marioStyles.border('lg'),
            'flex flex-col w-[320px] border-r-4 bg-white overflow-hidden'
          )}>
            <div className="flex-1 overflow-hidden">
              <ChatRoom tokenMint={ca} />
            </div>
          </aside>

          {/* Center Section - Resizable Chart & Data Panels */}
          <section className="flex-1 flex flex-col bg-white overflow-hidden">
            <ResizableSplit
              orientation="vertical"
              defaultRatio={60}
              minRatio={30}
              maxRatio={70}
              storageKey="trade-room-chart-split"
              className="h-full"
            >
              <div className={cn(
                marioStyles.border('lg'),
                'h-full border-b-4'
              )}>
                <DexScreenerChart tokenAddress={ca} />
              </div>
              <div className="h-full overflow-y-auto">
                <MarketDataPanels tokenMint={ca} />
              </div>
            </ResizableSplit>
          </section>

          {/* Right Sidebar - Trade Panel Only */}
          <aside className={cn(
            marioStyles.border('lg'),
            'flex flex-col w-[380px] border-l-4 bg-white'
          )}>
            <div className="flex-1 p-3 overflow-y-auto space-y-3">
              <MarioTradingPanel tokenAddress={ca} />
              <TokenVitalsBar
                tokenAddress={ca}
                volume24h={volume24h}
                holders={tokenDetails.holderCount ? parseInt(tokenDetails.holderCount) : undefined}
                userRank={null}
              />
            </div>
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
              <p className="text-sm text-[var(--outline-black)]/70">Preparing your trading interface...</p>
            </div>
          </div>
        </div>
      }
    >
      <TradeRoomContent />
    </Suspense>
  )
}
