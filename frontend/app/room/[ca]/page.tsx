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
 */

import { useEffect, useState, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { MarioTradingPanel } from '@/components/trading/mario-trading-panel'
import { useAuth } from '@/hooks/use-auth'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api'
import { Loader2, Share2, ExternalLink, ArrowLeft } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { usePortfolio, usePosition } from '@/hooks/use-portfolio'
import { usePriceStreamContext } from '@/lib/price-stream-provider'
import { formatTokenQuantity, formatUSD, formatNumber } from '@/lib/format'
import { ErrorBoundary } from '@/components/error-boundary'
import { ChartFallback } from '@/components/trading/chart-fallback'
import { MarketDataPanels } from '@/components/trading/market-data-panels'
import { ChatRoom } from '@/components/chat/chat-room'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'

// Dynamically import chart to prevent SSR issues
const LightweightChart = dynamic(
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
  const { isAuthenticated, user, getUserId } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Trading state
  const [isTrading, setIsTrading] = useState(false)
  const [showMobileTradePanel, setShowMobileTradePanel] = useState(false)

  // Get portfolio data
  const { data: portfolio, refetch: refreshPortfolio } = usePortfolio()
  const tokenHolding = usePosition(ca)

  // Get live prices
  const { prices: livePrices } = usePriceStreamContext()
  const solPrice = livePrices.get('So11111111111111111111111111111111111111112')?.price || 208

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
    staleTime: 30000, // 30 seconds
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
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Token Not Found</h1>
          <p className="text-muted-foreground mb-4">Unable to load token information</p>
          <Button onClick={() => router.push('/warp-pipes')}>
            Browse Tokens
          </Button>
        </div>
      </div>
    )
  }

  const currentPrice = livePrices.get(ca)?.price || parseFloat(tokenDetails.lastPrice || '0')
  const priceChange24h = parseFloat(tokenDetails.priceChange24h || '0')
  const volume24h = parseFloat(tokenDetails.volume24h || '0')
  const marketCap = parseFloat(tokenDetails.marketCapUsd || '0')

  return (
    <div className="flex flex-col h-screen bg-[var(--background)] overflow-hidden">
      {/* Header - Token Info */}
      <header className="border-b-4 border-[var(--outline-black)] bg-white p-3 sm:p-4 flex-shrink-0">
        <div className="w-full flex items-center justify-between gap-4">
          {/* Left: Back + Token Info */}
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
              className="border-2 border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] hover:shadow-[3px_3px_0_var(--outline-black)] transition-all"
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
                <span className="font-mono">${currentPrice.toFixed(6)}</span>
                <span
                  className={cn(
                    "font-bold",
                    priceChange24h >= 0 ? "text-[var(--luigi-green)]" : "text-[var(--mario-red)]"
                  )}
                >
                  {priceChange24h >= 0 ? "+" : ""}{priceChange24h.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          {/* Right: Stats + Actions */}
          <div className="hidden sm:flex items-center gap-4">
            <div className="text-right">
              <div className="text-[10px] text-muted-foreground uppercase">Volume 24h</div>
              <div className="text-sm font-bold">{formatUSD(volume24h)}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-muted-foreground uppercase">Market Cap</div>
              <div className="text-sm font-bold">{formatUSD(marketCap)}</div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href)
                toast({ title: "Link copied!", description: "Share this token with others" })
              }}
              className="border-2 border-[var(--outline-black)] bg-[var(--sky-blue)] shadow-[2px_2px_0_var(--outline-black)] hover:shadow-[3px_3px_0_var(--outline-black)] transition-all"
            >
              <Share2 className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              asChild
              className="border-2 border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] hover:shadow-[3px_3px_0_var(--outline-black)] transition-all"
            >
              <a
                href={`https://dexscreener.com/solana/${ca}`}
                target="_blank"
                rel="noopener noreferrer"
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
        <div className="lg:hidden flex flex-col w-full overflow-y-auto">
          {/* Chart */}
          <div className="p-3">
            <ErrorBoundary fallback={<ChartFallback tokenSymbol={tokenDetails.symbol || undefined} error={true} />}>
              <LightweightChart
                tokenMint={ca}
                tokenSymbol={tokenDetails.symbol || 'TOKEN'}
                className="w-full"
              />
            </ErrorBoundary>
          </div>

          {/* Trade Panel */}
          <div className="p-3 border-t-3 border-[var(--outline-black)] bg-white">
            <MarioTradingPanel tokenAddress={ca} />
          </div>

          {/* Market Data Panels */}
          <div className="border-t-3 border-[var(--outline-black)] bg-[var(--background)] min-h-[300px]">
            <MarketDataPanels tokenMint={ca} />
          </div>
        </div>

        {/* DESKTOP LAYOUT */}
        <div className="hidden lg:flex w-full overflow-hidden">
          {/* Left Section - Chart & Data Panels */}
          <section className="flex-1 flex flex-col bg-[var(--background)] overflow-y-auto">
            {/* Chart Area */}
            <div className="p-4">
              <ErrorBoundary fallback={<ChartFallback tokenSymbol={tokenDetails.symbol || undefined} error={true} />}>
                <LightweightChart
                  tokenMint={ca}
                  tokenSymbol={tokenDetails.symbol || 'TOKEN'}
                  className="w-full"
                />
              </ErrorBoundary>
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
