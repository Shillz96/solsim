"use client"

import { Suspense } from "react"
import dynamic from "next/dynamic"
import { useSearchParams } from "next/navigation"
import { AuthWrapper } from "@/components/auth/auth-wrapper"
import { TokenSearch } from "@/components/trading/token-search"
import { EnhancedTrendingList } from "@/components/leaderboard/enhanced-trending-list"
import { TradingPanel } from "@/components/trading/trading-panel"
import { ActivePositions } from "@/components/portfolio/active-positions"
import { PnLCard } from "@/components/portfolio/pnl-card"
import { PositionNotes } from "@/components/shared/position-notes"
import { ChartSkeleton } from "@/components/shared/chart-skeleton"

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

  return (
    <div className="min-h-screen bg-background">
      <main className="px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[calc(100vh-5rem)]">
          <aside className="lg:col-span-2 space-y-4 overflow-y-auto lg:sticky lg:top-6 lg:h-[calc(100vh-8rem)]">
            <TokenSearch />
            <EnhancedTrendingList />
          </aside>

          <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="h-[500px] lg:h-[700px] border-l border-border pl-6">
              <Suspense fallback={<ChartSkeleton />}>
                <DexScreenerChart tokenAddress={currentTokenAddress} />
              </Suspense>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
              <PositionNotes tokenAddress={currentTokenAddress} />
              <PnLCard />
            </div>
          </div>

          <aside className="lg:col-span-2 lg:sticky lg:top-6 lg:h-[calc(100vh-8rem)] border-l border-border pl-6">
            <TradingPanel tokenAddress={currentTokenAddress} />
          </aside>
        </div>

        {/* Bottom - Active Positions */}
        <div className="mt-8">
          <ActivePositions />
        </div>
      </main>
    </div>
  )
}

export default function TradePage() {
  return (
    <AuthWrapper requireAuth={true}>
      <Suspense fallback={<div className="min-h-screen bg-background" />}>
        <TradePageContent />
      </Suspense>
    </AuthWrapper>
  )
}
