"use client"

import { Suspense, useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { TrendingUp, Wallet, BarChart3, Coins } from "lucide-react"
import { TokenSearch } from "@/components/trading/token-search"
import { TradeDetails } from "@/components/shared/trade-details"
import { ChartSkeleton } from "@/components/shared/chart-skeleton"
import { TokenDetailsHeader } from "@/components/trading/token-details-header"
import { UnifiedPositions } from "@/components/portfolio/unified-positions"
import { EnhancedCard, CardGrid, CardSection } from "@/components/ui/enhanced-card-system"
import { TradeEmptyState } from "@/components/trading/trade-empty-state"
import { TradeTimeline } from "@/components/trading/trade-timeline"
// Mario-themed components
import { SlidingTrendingTicker } from "@/components/trading/sliding-trending-ticker"
import { MarioPositionPnL } from "@/components/trading/mario-position-pnl"
import { MarioTradingPanel } from "@/components/trading/mario-trading-panel"
import { TokenChatRoom } from "@/components/chat/token-chat-room"
import { TokenChatProvider } from "@/lib/contexts/TokenChatContext"

const DexScreenerChart = dynamic(
  () => import("@/components/trading/dexscreener-chart").then((mod) => ({ default: mod.DexScreenerChart })),
  {
    ssr: false,
    loading: () => <ChartSkeleton />,
  },
)

function TradePageContent() {
  const searchParams = useSearchParams()
  const currentTokenAddress = searchParams.get("token")
  const tokenSymbol = searchParams.get("symbol") || undefined
  const tokenName = searchParams.get("name") || undefined

  // Collapsible section state with localStorage persistence
  const [expandedSections, setExpandedSections] = useState({
    trending: false,
    positions: false,
    history: false
  })

  // Load expanded state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('trade-page-expanded-sections')
    if (stored) {
      try {
        setExpandedSections(JSON.parse(stored))
      } catch (e) {
        console.warn('Failed to parse stored expanded sections:', e)
      }
    }
  }, [])

  // Save expanded state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('trade-page-expanded-sections', JSON.stringify(expandedSections))
  }, [expandedSections])

  const toggleSection = (section: 'trending' | 'positions' | 'history') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  // Show empty state if no token is selected
  if (!currentTokenAddress) {
    return <TradeEmptyState />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <main className="container mx-auto px-4 py-6">
        {/* MOBILE LAYOUT: Responsive layout */}
        <div className="lg:hidden space-y-4">
          {/* Trending Ticker - Mobile - Compact */}
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0"
          >
            <SlidingTrendingTicker />
          </motion.div>

          {/* Token details header - Mobile - Compact */}
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="flex-shrink-0"
          >
            <TokenDetailsHeader tokenAddress={currentTokenAddress} />
          </motion.div>

          {/* Chart Section - Mobile */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="min-h-[400px]"
          >
            <div className="h-[400px] overflow-hidden rounded-lg">
              <Suspense fallback={<ChartSkeleton />}>
                <DexScreenerChart tokenAddress={currentTokenAddress} />
              </Suspense>
            </div>
          </motion.div>

          {/* Mario Trading Panel - Mobile - Compact */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="flex-shrink-0"
          >
            <MarioTradingPanel tokenAddress={currentTokenAddress} />
          </motion.div>

          {/* Token Chat - Mobile */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="flex-shrink-0"
          >
            <TokenChatProvider roomId={currentTokenAddress}>
              <div className="h-[300px]">
                <TokenChatRoom tokenMint={currentTokenAddress} />
              </div>
            </TokenChatProvider>
          </motion.div>
        </div>

        {/* DESKTOP LAYOUT: Grid layout */}
        <div className="hidden lg:grid lg:grid-cols-12 lg:gap-4">
          {/* Trending Ticker - Desktop - Full width */}
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:col-span-12"
          >
            <SlidingTrendingTicker />
          </motion.div>

          {/* Token details header - Desktop */}
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="lg:col-span-12"
          >
            <TokenDetailsHeader tokenAddress={currentTokenAddress} />
          </motion.div>
          {/* Left Sidebar - PnL Above Trade Activity */}
          <motion.aside
            className="lg:col-span-3 space-y-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <MarioPositionPnL
              tokenAddress={currentTokenAddress}
              tokenSymbol={tokenSymbol}
              tokenName={tokenName}
            />
            <TradeDetails
              tokenAddress={currentTokenAddress}
              tokenSymbol={tokenSymbol}
              tokenName={tokenName}
              variant="sidebar"
              maxTrades={20}
            />
          </motion.aside>

          {/* Chart */}
          <motion.div
            className="lg:col-span-7"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="h-[600px] overflow-hidden rounded-lg">
              <Suspense fallback={<ChartSkeleton />}>
                <DexScreenerChart tokenAddress={currentTokenAddress} />
              </Suspense>
            </div>
          </motion.div>

          {/* Right Sidebar - Trading Panel + Timeline */}
          <motion.aside
            className="lg:col-span-2 space-y-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <MarioTradingPanel tokenAddress={currentTokenAddress} />
            <TradeTimeline
              tokenAddress={currentTokenAddress}
              maxTrades={10}
              variant="compact"
            />
          </motion.aside>
        </div>

        {/* Token Chat Section - Full width below main content */}
        <motion.div
          className="mt-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <TokenChatProvider roomId={currentTokenAddress}>
            <div className="h-[400px]">
              <TokenChatRoom tokenMint={currentTokenAddress} />
            </div>
          </TokenChatProvider>
        </motion.div>

        {/* Decorative Elements */}
        <div className="fixed inset-0 pointer-events-none -z-20 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/3 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/3 rounded-full blur-3xl"></div>
          <div className="absolute top-3/4 left-3/4 w-64 h-64 bg-accent/3 rounded-full blur-2xl"></div>
        </div>
      </main>
    </div>
  )
}

export default function TradePage() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="flex items-center justify-center min-h-dvh-screen">
          <div className="text-center space-y-4">
            <div className="relative">
              <div className="h-16 w-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
              <div className="absolute inset-0 h-16 w-16 border-2 border-blue-500/20 border-b-blue-500 rounded-full animate-spin mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Loading Trading Interface</h3>
              <p className="text-sm text-muted-foreground">Preparing your dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    }>
      <TradePageContent />
    </Suspense>
  )
}
