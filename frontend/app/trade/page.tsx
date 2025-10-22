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
      <main className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-page-xl mx-auto">
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

        {/* DESKTOP LAYOUT: Original 3-Column Grid */}
        <div className="hidden lg:block space-y-6">
          {/* Sliding Trending Ticker - Desktop (Moved to Top) */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <SlidingTrendingTicker />
          </motion.div>

          {/* Token details header - Desktop */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <TokenDetailsHeader tokenAddress={currentTokenAddress} />
          </motion.div>

          <div className="lg:grid lg:grid-cols-12 gap-4 lg:gap-6 min-h-[calc(100vh-10rem)]">
          {/* Left Sidebar */}
          <motion.aside
            className="lg:col-span-2 space-y-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="lg:sticky lg:top-4 lg:h-[calc(100vh-8rem)] lg:overflow-y-auto space-y-4">
              <TradeDetails
                tokenAddress={currentTokenAddress}
                tokenSymbol={tokenSymbol}
                tokenName={tokenName}
                variant="sidebar"
                maxTrades={20}
              />
            </div>
          </motion.aside>

          {/* Main Content Area */}
          <motion.div
            className="lg:col-span-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="space-y-6">
              {/* Chart Section */}
              <div className="h-[600px] overflow-hidden">
                <Suspense fallback={<ChartSkeleton />}>
                  <DexScreenerChart tokenAddress={currentTokenAddress} />
                </Suspense>
              </div>

              {/* Mario Position P&L - Compact & Gamified Under Chart */}
              <MarioPositionPnL
                tokenAddress={currentTokenAddress}
                tokenSymbol={tokenSymbol}
                tokenName={tokenName}
              />
            </div>
          </motion.div>

          {/* Right Sidebar - Mario Trading Panel + Recent Trades */}
          <motion.aside
            className="lg:col-span-2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="lg:sticky lg:top-4 space-y-4">
              <MarioTradingPanel tokenAddress={currentTokenAddress} />
              <TradeTimeline
                tokenAddress={currentTokenAddress}
                maxTrades={5}
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
