"use client"

import { Suspense } from "react"
import dynamic from "next/dynamic"
import { useSearchParams } from "next/navigation"
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
import { TradingStatsWidget, QuickActionsWidget } from "@/components/trading/sidebar-widgets"

const DexScreenerChart = dynamic(
  () => import("@/components/trading/dexscreener-chart").then((mod) => ({ default: mod.DexScreenerChart })),
  {
    ssr: false,
    loading: () => <ChartSkeleton />,
  },
)

function TradePageContent() {
  const searchParams = useSearchParams()
  const currentTokenAddress = searchParams.get("token") ?? "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"
  const tokenSymbol = searchParams.get("symbol") || undefined
  const tokenName = searchParams.get("name") || undefined

  return (
    <div className="min-h-screen bg-background">
      <main className="px-4 lg:px-6 py-4 lg:py-6">
        {/* Token details header */}
        <div className="mb-6">
          <TokenDetailsHeader tokenAddress={currentTokenAddress} />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 min-h-[calc(100vh-10rem)]">
          {/* Left Sidebar */}
          <aside className="lg:col-span-2 space-y-4 order-2 lg:order-1">
            <div className="lg:sticky lg:top-4 lg:h-[calc(100vh-8rem)] lg:overflow-y-auto space-y-4">
              <TokenSearch />
              <EnhancedTrendingList />
              <UnifiedPositions 
                variant="compact" 
                maxPositions={5}
                showViewAllButton={true}
              />
              <TradingStatsWidget />
              <QuickActionsWidget />
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="lg:col-span-8 order-1 lg:order-2">
            <div className="space-y-6">
              {/* Chart Section */}
              <div className="h-[400px] md:h-[500px] lg:h-[600px] border border-border/50 rounded-lg overflow-hidden bg-card">
                <Suspense fallback={<ChartSkeleton />}>
                  <DexScreenerChart tokenAddress={currentTokenAddress} />
                </Suspense>
              </div>
              
              {/* Analytics Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                <TradeDetails 
                  tokenAddress={currentTokenAddress} 
                  tokenSymbol={tokenSymbol}
                  tokenName={tokenName}
                />
                <TokenPositionPnL 
                  tokenAddress={currentTokenAddress}
                  tokenSymbol={tokenSymbol}
                  tokenName={tokenName}
                />
              </div>
            </div>
          </div>

          {/* Right Sidebar - Trading Panel */}
          <aside className="lg:col-span-2 order-3">
            <div className="lg:sticky lg:top-4 lg:h-[calc(100vh-8rem)]">
              <TradingPanel tokenAddress={currentTokenAddress} />
            </div>
          </aside>
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
