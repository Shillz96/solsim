"use client"

import { Suspense } from "react"
import dynamic from "next/dynamic"
import { useSearchParams } from "next/navigation"
import { AuthGuard } from "@/components/auth/auth-guard"
import { TokenSearch } from "@/components/trading/token-search"
import { EnhancedTrendingList } from "@/components/leaderboard/enhanced-trending-list"
import { TradingPanel } from "@/components/trading/trading-panel"
import { ActivePositions } from "@/components/portfolio/active-positions"
import { PnLCard } from "@/components/portfolio/pnl-card"
import { TradeDetails } from "@/components/shared/trade-details"
import { ChartSkeleton } from "@/components/shared/chart-skeleton"
import { TokenDetailsHeader } from "@/components/trading/token-details-header"
import { RealtimeTradeStrip } from "@/components/trading/realtime-trade-strip"

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
      <main className="px-6 py-6">
        {/* Token details header - new component */}
        <TokenDetailsHeader tokenAddress={currentTokenAddress} />
        
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
              <TradeDetails 
                tokenAddress={currentTokenAddress} 
                tokenSymbol={tokenSymbol}
                tokenName={tokenName}
              />
              <PnLCard />
            </div>
            
            {/* Real-time trade strip */}
            <div className="mt-6">
              <RealtimeTradeStrip tokenAddress={currentTokenAddress} />
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
    <AuthGuard requireAuth={true}>
      <Suspense fallback={<div className="min-h-screen bg-background" />}>
        <TradePageContent />
      </Suspense>
    </AuthGuard>
  )
}
