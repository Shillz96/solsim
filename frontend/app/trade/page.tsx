"use client"

import { Suspense } from "react"
import dynamic from "next/dynamic"
import { useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { AuthGuard } from "@/components/auth/auth-guard"
import { TokenSearch } from "@/components/trading/token-search"
import { EnhancedTrendingList } from "@/components/leaderboard/enhanced-trending-list"
import { TradingPanel } from "@/components/trading/trading-panel"
import { TokenPositionPnL } from "@/components/trading/token-position-pnl"
import { TradeDetails } from "@/components/shared/trade-details"
import { ChartSkeleton } from "@/components/shared/chart-skeleton"
import { TokenDetailsHeader } from "@/components/trading/token-details-header"
import { UnifiedPositions } from "@/components/portfolio/unified-positions"
import { EnhancedCard, CardGrid, CardSection } from "@/components/ui/enhanced-card-system"
import { TradeEmptyState } from "@/components/trading/trade-empty-state"

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

  // Show empty state if no token is selected
  if (!currentTokenAddress) {
    return <TradeEmptyState />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <main className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-page-xl mx-auto">
        {/* Token details header */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <TokenDetailsHeader tokenAddress={currentTokenAddress} />
        </motion.div>

        {/* MOBILE-OPTIMIZED LAYOUT: Chart + Trading Panel Adjacent */}
        <div className="lg:hidden space-y-4">
          {/* Chart Section - Mobile */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="h-[380px] sm:h-[420px] border border-border/50 rounded-lg overflow-hidden bg-card">
              <Suspense fallback={<ChartSkeleton />}>
                <DexScreenerChart tokenAddress={currentTokenAddress} />
              </Suspense>
            </div>
          </motion.div>

          {/* Trading Panel - Mobile (Immediately Below Chart) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <TradingPanel tokenAddress={currentTokenAddress} />
          </motion.div>

          {/* Position P&L - Mobile */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <TokenPositionPnL
              tokenAddress={currentTokenAddress}
              tokenSymbol={tokenSymbol}
              tokenName={tokenName}
            />
          </motion.div>

          {/* Collapsible Secondary Content - Mobile */}
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <details className="group">
              <summary className="flex items-center justify-between p-4 bg-card border border-border/50 rounded-lg cursor-pointer hover:bg-card/80 transition-colors">
                <span className="font-semibold text-sm">Search & Trending Tokens</span>
                <svg
                  className="w-5 h-5 transition-transform group-open:rotate-180"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="mt-2 space-y-4">
                <TokenSearch />
                <EnhancedTrendingList />
              </div>
            </details>

            <details className="group">
              <summary className="flex items-center justify-between p-4 bg-card border border-border/50 rounded-lg cursor-pointer hover:bg-card/80 transition-colors">
                <span className="font-semibold text-sm">Your Positions</span>
                <svg
                  className="w-5 h-5 transition-transform group-open:rotate-180"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="mt-2">
                <UnifiedPositions
                  variant="compact"
                  maxPositions={5}
                  showViewAllButton={true}
                />
              </div>
            </details>

            <details className="group">
              <summary className="flex items-center justify-between p-4 bg-card border border-border/50 rounded-lg cursor-pointer hover:bg-card/80 transition-colors">
                <span className="font-semibold text-sm">Trade History</span>
                <svg
                  className="w-5 h-5 transition-transform group-open:rotate-180"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="mt-2">
                <TradeDetails
                  tokenAddress={currentTokenAddress}
                  tokenSymbol={tokenSymbol}
                  tokenName={tokenName}
                  variant="sidebar"
                  maxTrades={20}
                />
              </div>
            </details>
          </motion.div>
        </div>

        {/* DESKTOP LAYOUT: Original 3-Column Grid */}
        <div className="hidden lg:grid lg:grid-cols-12 gap-4 lg:gap-6 min-h-[calc(100vh-10rem)]">
          {/* Left Sidebar */}
          <motion.aside
            className="lg:col-span-2 space-y-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="lg:sticky lg:top-4 lg:h-[calc(100vh-8rem)] lg:overflow-y-auto space-y-4">
              <TokenSearch />
              <EnhancedTrendingList />
              <UnifiedPositions
                variant="compact"
                maxPositions={5}
                showViewAllButton={true}
              />
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
              <div className="h-[600px] border border-border/50 rounded-lg overflow-hidden bg-card">
                <Suspense fallback={<ChartSkeleton />}>
                  <DexScreenerChart tokenAddress={currentTokenAddress} />
                </Suspense>
              </div>

              {/* Position P&L - Full Width Under Chart */}
              <TokenPositionPnL
                tokenAddress={currentTokenAddress}
                tokenSymbol={tokenSymbol}
                tokenName={tokenName}
              />
            </div>
          </motion.div>

          {/* Right Sidebar - Trading Panel */}
          <motion.aside
            className="lg:col-span-2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="lg:sticky lg:top-4 lg:h-[calc(100vh-8rem)]">
              <TradingPanel tokenAddress={currentTokenAddress} />
            </div>
          </motion.aside>
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
    <AuthGuard requireAuth={true}>
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
    </AuthGuard>
  )
}
