"use client"

import { AuthGuard } from "@/components/auth/auth-guard"
import { PnLCard } from "@/components/portfolio/pnl-card"
import { ActivePositions } from "@/components/portfolio/active-positions"
import { RewardsCard } from "@/components/portfolio/rewards-card"
import { EnhancedTrendingList } from "@/components/leaderboard/enhanced-trending-list"
import { TradeHistory } from "@/components/trading/trade-history"
import { PortfolioChart } from "@/components/portfolio/portfolio-chart-dynamic"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, History, BarChart3 } from "lucide-react"
import { useState, useEffect } from "react"

export default function PortfolioPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)

  useEffect(() => {
    // Get userId from localStorage or auth service
    if (typeof window !== 'undefined') {
      const storedUserId = localStorage.getItem('userId')
      setUserId(storedUserId)
      
      // TODO: Get wallet address from wallet connection
      // For now, we'll use a placeholder
      const storedWallet = localStorage.getItem('walletAddress')
      setWalletAddress(storedWallet)
    }
  }, [])

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-6 py-8 max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold tracking-tight mb-4">Portfolio</h1>
            <p className="text-lg text-muted-foreground">Track your positions and performance</p>
          </div>

          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Main Content (2/3 width) */}
            <div className="lg:col-span-2 space-y-8">
              {/* Portfolio Summary */}
              <PnLCard />

              {/* Tabbed Content */}
              <Tabs defaultValue="positions" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6">
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
                  <Card className="p-6 border border-border rounded-none shadow-none">
                    <h3 className="font-bold text-lg mb-6">Portfolio Performance</h3>
                    <PortfolioChart />
                  </Card>
                </TabsContent>

                <TabsContent value="history" className="mt-0">
                  <TradeHistory />
                </TabsContent>
              </Tabs>
            </div>

            {/* Right Sidebar - Rewards & Trending (1/3 width) */}
            <aside className="space-y-6">
              <div className="lg:sticky lg:top-8 space-y-6">
                {/* Rewards Card */}
                {userId && (
                  <RewardsCard 
                    userId={userId} 
                    walletAddress={walletAddress || undefined}
                  />
                )}
                
                {/* Trending Tokens */}
                <div>
                  <h3 className="font-bold text-lg mb-6">Trending Tokens</h3>
                  <EnhancedTrendingList />
                </div>
              </div>
            </aside>
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}
