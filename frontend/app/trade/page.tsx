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
      <main className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-3 max-w-page-xl mx-auto">
        {/* MOBILE-OPTIMIZED LAYOUT: Chart + Trading Panel Adjacent */}
        <div className="lg:hidden space-y-4">
          {/* Sliding Trending Ticker - Mobile (Moved to Top) */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <SlidingTrendingTicker />
          </motion.div>

          {/* Token details header - Mobile */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <TokenDetailsHeader tokenAddress={currentTokenAddress} />
          </motion.div>

          {/* Chart Section - Mobile */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="h-[300px] sm:h-[380px] md:h-[420px] overflow-hidden">
              <Suspense fallback={<ChartSkeleton />}>
                <DexScreenerChart tokenAddress={currentTokenAddress} />
              </Suspense>
            </div>
          </motion.div>

          {/* Mario Trading Panel - Mobile (Immediately Below Chart) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="space-y-4"
          >
            <MarioTradingPanel tokenAddress={currentTokenAddress} />
            {/* Trade Timeline - Mobile (Compact under trading panel) */}
            <TradeTimeline
              tokenAddress={currentTokenAddress}
              maxTrades={5}
              variant="compact"
            />
          </motion.div>

          {/* Mario Position P&L - Mobile (Compact & Gamified) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <MarioPositionPnL
              tokenAddress={currentTokenAddress}
              tokenSymbol={tokenSymbol}
              tokenName={tokenName}
            />
          </motion.div>

          {/* Collapsible Secondary Content - Mobile */}
          <motion.div
            className="space-y-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="mario-card bg-gradient-to-br from-[var(--super-blue)]/10 to-[var(--super-blue)]/5">
              <button
                onClick={() => toggleSection('history')}
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-[var(--super-blue)]/10 transition-all active:scale-[0.99] w-full"
              >
                <div className="flex items-center gap-3">
                  <div className="mario-badge px-2 py-2 bg-[var(--super-blue)]">
                    <BarChart3 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <span className="mario-font text-sm text-foreground">TRADE LOG</span>
                    <p className="text-xs text-muted-foreground">Recent transactions</p>
                  </div>
                </div>
                <svg
                  className={`w-5 h-5 transition-transform ${expandedSections.history ? 'rotate-180' : ''} text-[var(--outline-black)]`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedSections.history && (
                <div className="px-4 pb-4 pt-2">
                  <TradeDetails
                    tokenAddress={currentTokenAddress}
                    tokenSymbol={tokenSymbol}
                    tokenName={tokenName}
                    variant="sidebar"
                    maxTrades={20}
                  />
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* DESKTOP LAYOUT: Optimized for Viewport Fit */}
        <div className="hidden lg:block space-y-2">
          {/* Sliding Trending Ticker - Desktop (Compact) */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <SlidingTrendingTicker />
          </motion.div>

          {/* Token details header - Desktop (Compact) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <TokenDetailsHeader tokenAddress={currentTokenAddress} />
          </motion.div>

          {/* Grid height: 100dvh - (navbar + padding-top + ticker + token-header + 2×spacing + padding-bottom) */}
          <div className="lg:grid lg:grid-cols-12 lg:items-stretch gap-3 h-[calc(100dvh-var(--navbar-height)-0.75rem-var(--trending-ticker-height)-var(--token-header-compact-height)-1rem-0.75rem)]">
          {/* Left Sidebar - PnL Above Trade Activity */}
          <motion.aside
            className="lg:col-span-3 flex flex-col gap-3 min-h-0 overflow-hidden"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {/* Mario Position P&L - Top Priority */}
            <div className="flex-shrink-0">
              <MarioPositionPnL
                tokenAddress={currentTokenAddress}
                tokenSymbol={tokenSymbol}
                tokenName={tokenName}
              />
            </div>

            {/* Trade Activity - Scrollable Below PnL */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              <TradeDetails
                tokenAddress={currentTokenAddress}
                tokenSymbol={tokenSymbol}
                tokenName={tokenName}
                variant="sidebar"
                maxTrades={20}
              />
            </div>
          </motion.aside>

          {/* Chart - Matches Right Panel Height */}
          <motion.div
            className="lg:col-span-7 flex flex-col min-h-0"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="flex-1 min-h-0 overflow-hidden">
              <Suspense fallback={<ChartSkeleton />}>
                <DexScreenerChart tokenAddress={currentTokenAddress} />
              </Suspense>
            </div>
          </motion.div>

          {/* Right Sidebar - Trading Panel + Timeline */}
          <motion.aside
            className="lg:col-span-2 flex flex-col gap-3 min-h-0 overflow-hidden"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="flex-shrink-0">
              <MarioTradingPanel tokenAddress={currentTokenAddress} />
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <TradeTimeline
                tokenAddress={currentTokenAddress}
                maxTrades={10}
                variant="compact"
              />
            </div>
          </motion.aside>
          </div>
        </div>

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
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="flex items-center justify-center min-h-screen">
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
