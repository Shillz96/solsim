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
import Image from 'next/image'
import { motion } from 'framer-motion'
import { TradePanel } from '@/components/trade-panel'
import { TokenVitalsBar } from '@/components/trading/token-vitals-bar'
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
import { ResponsiveRoomHeader } from '@/components/room/responsive-room-header'
import { ResponsiveMobileLayout } from '@/components/room/responsive-mobile-layout'

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

  // Fetch token details (optimized for performance - use WebSocket for price updates)
  const { data: tokenDetails, isLoading: loadingToken } = useQuery({
    queryKey: ['token-details', ca],
    queryFn: () => api.getTokenDetails(ca),
    staleTime: 30000, // 30 seconds - holder counts change slowly
    refetchInterval: 60000, // Background refetch every 60 seconds (optimized)
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
    <div id="rooms-section" className="w-full h-full flex flex-col bg-background overflow-hidden">
      {/* Header - Responsive Token Info */}
      <ResponsiveRoomHeader
        ca={ca}
        tokenDetails={{
          name: tokenDetails.name || 'Unknown Token',
          symbol: tokenDetails.symbol || '',
          imageUrl: tokenDetails.imageUrl || undefined
        }}
        currentPrice={currentPrice}
        priceChange24h={priceChange24h}
        marketCap={marketCap}
        volume24h={volume24h}
        holderCount={holderCount}
        tokenHolding={tokenHolding}
      />

      {/* Main Content - Responsive Layouts */}
      <main className="flex-1 flex gap-3 p-3 overflow-hidden">
        {/* MOBILE/TABLET LAYOUT - Enhanced with swipeable panels (< 1280px) */}
        <div className="xl:hidden w-full h-full">
          <ResponsiveMobileLayout tokenAddress={ca} />
        </div>

        {/* Mobile/Tablet Floating Trade Button - Above navbar */}
        <div className="xl:hidden fixed right-4 sm:right-6 bottom-20 sm:bottom-24" style={{ zIndex: 'var(--z-trade-button)' }}>
          <Dialog open={showTradeModal} onOpenChange={setShowTradeModal}>
            <DialogTrigger asChild>
              <button className="btn-buy h-14 w-14 sm:h-16 sm:w-16 rounded-full text-xs sm:text-sm shadow-[6px_6px_0_var(--outline-black)] hover:shadow-[8px_8px_0_var(--outline-black)] hover:scale-110 transition-all active:scale-95">
                TRADE
              </button>
            </DialogTrigger>
            <DialogContent className="w-[90vw] max-w-md mx-auto max-h-[85vh] overflow-y-auto p-4 sm:p-6 bg-[var(--background)] border-4 border-[var(--outline)] shadow-[8px_8px_0_var(--outline-black)] z-50">
              <DialogHeader className="space-y-3 pb-4">
                <DialogTitle className="text-xl sm:text-2xl text-center font-mario font-bold text-outline">
                  Trade {tokenDetails.symbol}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <TradePanel
                  tokenAddress={ca}
                  volume24h={volume24h}
                  holders={holderCount}
                  userRank={null}
                  onTradeSuccess={() => void refreshPortfolio()}
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* DESKTOP LAYOUT - 3 Column Grid (>= 1280px only) */}
        <div className="hidden xl:block w-full h-full">
          <div className="room-grid h-full">
            {/* Chat Panel */}
            <aside className="chat-panel flex flex-col">
              <div className="bg-sky/20 border-4 border-outline rounded-xl shadow-[6px_6px_0_var(--outline-black)] h-full overflow-hidden flex flex-col">
                <ChatRoom tokenMint={ca} />
              </div>
            </aside>

            {/* Chart + Market Data Panel */}
            <section className="chart-panel flex flex-col gap-3">
              {/* Chart - Responsive height */}
              <div className="flex-1 min-h-[400px] overflow-hidden rounded-xl border-4 border-outline shadow-[6px_6px_0_var(--outline-black)]">
                <DexScreenerChart tokenAddress={ca} />
              </div>

              {/* Market Data Tabs */}
              <div className="flex-1 overflow-hidden">
                <MarketDataPanels tokenMint={ca} />
              </div>
            </section>

            {/* Trade Panel */}
            <aside className="trade-panel flex flex-col">
              <TradePanel
                tokenAddress={ca}
                volume24h={volume24h}
                holders={holderCount}
                userRank={null}
                onTradeSuccess={() => void refreshPortfolio()}
              />
            </aside>
          </div>
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
