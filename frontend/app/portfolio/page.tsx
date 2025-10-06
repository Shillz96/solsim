"use client"

import { PnLCard } from "@/components/portfolio/pnl-card"
import { ActivePositions } from "@/components/portfolio/active-positions"
import { TokenSearch } from "@/components/trading/token-search"
import { EnhancedTrendingList } from "@/components/leaderboard/enhanced-trending-list"
import { TradeHistory } from "@/components/trading/trade-history"
import { PortfolioChart } from "@/components/portfolio/portfolio-chart"
import { PortfolioFilters } from "@/components/portfolio/portfolio-filters"
import { Card } from "@/components/ui/card"
import { Bell } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function PortfolioPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="w-full px-2 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Sidebar - Search & Filters */}
          <aside className="lg:col-span-2 space-y-4">
            <div className="lg:sticky lg:top-6 space-y-4">
              <TokenSearch />
              <PortfolioFilters />
            </div>
          </aside>

          {/* Main Content */}
          <div className="lg:col-span-7 space-y-4">
            {/* Portfolio Summary */}
            <PnLCard />

            {/* Active Positions */}
            <ActivePositions />

            {/* Portfolio Performance Chart */}
            <Card className="bento-card p-6">
              <h3 className="font-semibold text-lg mb-4">Portfolio Performance</h3>
              <PortfolioChart />
            </Card>

            {/* Trade History */}
            <TradeHistory />
          </div>

          {/* Right Sidebar - Trending & Alerts */}
          <aside className="lg:col-span-3 space-y-4">
            <div className="lg:sticky lg:top-6 space-y-4">
              {/* Alerts */}
              <Card className="trading-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-sm">Alerts</h3>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    2
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="rounded-lg bg-secondary/10 border border-secondary/20 p-3">
                    <p className="text-xs font-medium text-secondary">BONK +15%</p>
                    <p className="text-xs text-muted-foreground mt-1">Up 15% in last hour</p>
                  </div>
                  <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                    <p className="text-xs font-medium text-destructive">WIF -10%</p>
                    <p className="text-xs text-muted-foreground mt-1">Down 10% in last hour</p>
                  </div>
                </div>
              </Card>

              {/* Trending Tokens */}
              <div>
                <h3 className="font-semibold text-sm mb-3 px-1">Discover New Tokens</h3>
                <EnhancedTrendingList />
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}
