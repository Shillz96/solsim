"use client"

import { AuthWrapper } from "@/components/auth/auth-wrapper"
import { PnLCard } from "@/components/portfolio/pnl-card"
import { ActivePositions } from "@/components/portfolio/active-positions"
import { EnhancedTrendingList } from "@/components/leaderboard/enhanced-trending-list"
import { TradeHistory } from "@/components/trading/trade-history"
import { PortfolioChart } from "@/components/portfolio/portfolio-chart-dynamic"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, History, BarChart3 } from "lucide-react"

export default function PortfolioPage() {
  return (
    <AuthWrapper requireAuth={true}>
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-6 max-w-7xl">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Portfolio</h1>
            <p className="text-muted-foreground">Track your positions and performance</p>
          </div>

          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Content (2/3 width) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Portfolio Summary */}
              <PnLCard />

              {/* Tabbed Content */}
              <Tabs defaultValue="positions" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="positions" className="gap-2">
                    <TrendingUp className="h-4 w-4" />
                    <span className="hidden sm:inline">Positions</span>
                  </TabsTrigger>
                  <TabsTrigger value="performance" className="gap-2">
                    <BarChart3 className="h-4 w-4" />
                    <span className="hidden sm:inline">Performance</span>
                  </TabsTrigger>
                  <TabsTrigger value="history" className="gap-2">
                    <History className="h-4 w-4" />
                    <span className="hidden sm:inline">History</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="positions" className="mt-0">
                  <ActivePositions />
                </TabsContent>

                <TabsContent value="performance" className="mt-0">
                  <Card className="bento-card p-6">
                    <h3 className="font-semibold text-lg mb-4">Portfolio Performance</h3>
                    <PortfolioChart />
                  </Card>
                </TabsContent>

                <TabsContent value="history" className="mt-0">
                  <TradeHistory />
                </TabsContent>
              </Tabs>
            </div>

            {/* Right Sidebar - Trending (1/3 width) */}
            <aside className="space-y-6">
              <div className="lg:sticky lg:top-6">
                <h3 className="font-semibold text-lg mb-4 px-1">Trending Tokens</h3>
                <EnhancedTrendingList />
              </div>
            </aside>
          </div>
        </main>
      </div>
    </AuthWrapper>
  )
}
