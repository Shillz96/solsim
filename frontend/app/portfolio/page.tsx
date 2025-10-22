"use client"

import { Suspense } from "react"
import { AuthGuard } from "@/components/auth/auth-guard"
import { PnLCard } from "@/components/portfolio/pnl-card"
import { UnifiedPositions } from "@/components/portfolio/unified-positions"
import { PortfolioMetrics } from "@/components/portfolio/PortfolioMetrics"
import { TradingStatsSummary } from "@/components/portfolio/trading-stats-summary"
import { EnhancedTrendingList } from "@/components/leaderboard/enhanced-trending-list"
import { TradeHistory } from "@/components/trading/trade-history"
import { PortfolioChart } from "@/components/portfolio/portfolio-chart-dynamic"
import { SimplePageHeader, PortfolioPageActions } from "@/components/shared/simple-page-header"
import { EnhancedCard, CardGrid, CardSection } from "@/components/ui/enhanced-card-system"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, History, BarChart3, Wallet, Target, Loader2, Star, Trophy, Zap } from "lucide-react"
import { motion } from "framer-motion"
import { useAuth } from "@/hooks/use-auth"
import { useWallet } from "@solana/wallet-adapter-react"
import { MarioPageHeader } from "@/components/shared/mario-page-header"
import Image from "next/image"

function PortfolioPageContent() {
  const { user, isAuthenticated } = useAuth()
  const { publicKey } = useWallet()

  return (
    <div className="min-h-screen bg-sky-100">
      <main className="w-full px-4 sm:px-6 lg:px-8 py-2 sm:py-4 max-w-page-xl mx-auto">
        {/* Mario Page Header with Pixel Art */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 relative"
        >
          {/* Mario-themed header with coins and stars */}
          <div className="bg-white border-4 border-pipe-800 rounded-xl p-6 shadow-[8px_8px_0_0_rgba(0,0,0,0.3)] relative overflow-hidden">
            {/* Decorative Mario icons */}
            <div className="absolute top-2 right-2 flex gap-2">
              <Image src="/icons/mario/star.png" alt="Star" width={24} height={24} className="animate-pulse" />
              <Image src="/icons/mario/money-bag.png" alt="Coin" width={24} height={24} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-mario-red-500 p-3 rounded-lg border-4 border-mario-red-700 shadow-[4px_4px_0_0_rgba(0,0,0,0.3)]">
                  <Image src="/icons/mario/money-bag.png" alt="Portfolio" width={32} height={32} />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-pipe-900" style={{ fontFamily: "'Press Start 2P', monospace", textShadow: '3px 3px 6px rgba(0,0,0,0.2)' }}>
                    YOUR WORLD
                  </h1>
                  <p className="text-sm text-pipe-600 mt-1">Track your coin collection and power-ups!</p>
                </div>
              </div>

              {/* Level Badge */}
              <div className="bg-star-yellow-500 border-4 border-star-yellow-600 rounded-lg px-4 py-2 shadow-[4px_4px_0_0_rgba(0,0,0,0.3)]">
                <div className="flex items-center gap-2">
                  <Image src="/icons/mario/trophey.png" alt="Trophy" width={20} height={20} />
                  <div className="text-right">
                    <div className="text-xs font-bold text-pipe-900">LEVEL</div>
                    <div className="text-lg font-bold text-pipe-900">1</div>
                  </div>
                </div>
              </div>
            </div>

            {/* XP Progress Bar - Mario style */}
            <div className="mt-4 bg-pipe-300 border-3 border-pipe-700 rounded-full h-6 overflow-hidden relative">
              <motion.div
                className="bg-gradient-to-r from-luigi-green-500 to-luigi-green-400 h-full flex items-center justify-center"
                initial={{ width: 0 }}
                animate={{ width: "35%" }}
                transition={{ duration: 1, delay: 0.5 }}
              >
                <span className="text-xs font-bold text-white z-10">350 / 1000 XP</span>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Portfolio Metrics - Mario Game Stats Style */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-6"
        >
          <PortfolioMetrics />
        </motion.div>

        {/* Enhanced Main Grid Layout */}
        <CardGrid
          columns={{ desktop: 4, tablet: 2, mobile: 1 }}
          gap="lg"
          className="xl:grid-cols-[3fr_1fr]"
        >
          {/* Left Column - Main Content (3/4 width) */}
          <div className="xl:col-span-1 space-y-6">
            {/* Portfolio Summary - Question Block Style */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <PnLCard />
            </motion.div>

            {/* Mario World Navigator - Warp Pipe Tabs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Tabs defaultValue="positions" className="w-full">
                {/* Mario-themed tab navigation */}
                <TabsList className="grid w-full grid-cols-3 mb-6 bg-white border-4 border-pipe-700 rounded-xl p-2 shadow-[4px_4px_0_0_rgba(0,0,0,0.2)]">
                  <TabsTrigger
                    value="positions"
                    className="gap-2 data-[state=active]:bg-mario-red-500 data-[state=active]:text-white data-[state=active]:border-3 data-[state=active]:border-mario-red-700 data-[state=active]:shadow-[2px_2px_0_0_rgba(0,0,0,0.3)] rounded-lg font-bold text-xs sm:text-sm transition-all"
                  >
                    <Image src="/icons/mario/mushroom.png" alt="Positions" width={16} height={16} />
                    <span>COINS</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="performance"
                    className="gap-2 data-[state=active]:bg-luigi-green-500 data-[state=active]:text-white data-[state=active]:border-3 data-[state=active]:border-luigi-green-700 data-[state=active]:shadow-[2px_2px_0_0_rgba(0,0,0,0.3)] rounded-lg font-bold text-xs sm:text-sm transition-all"
                  >
                    <Image src="/icons/mario/star.png" alt="Performance" width={16} height={16} />
                    <span>STATS</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="history"
                    className="gap-2 data-[state=active]:bg-star-yellow-500 data-[state=active]:text-pipe-900 data-[state=active]:border-3 data-[state=active]:border-star-yellow-700 data-[state=active]:shadow-[2px_2px_0_0_rgba(0,0,0,0.3)] rounded-lg font-bold text-xs sm:text-sm transition-all"
                  >
                    <Image src="/icons/mario/trophey.png" alt="History" width={16} height={16} />
                    <span>QUEST LOG</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="positions" className="mt-0">
                  <UnifiedPositions
                    variant="full"
                    showHeader={false}
                    showSummary={true}
                  />
                </TabsContent>

                <TabsContent value="performance" className="mt-0">
                  <div className="space-y-6">
                    <div className="bg-white border-4 border-pipe-700 rounded-xl shadow-[6px_6px_0_0_rgba(0,0,0,0.3)] p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Image src="/icons/mario/fire.png" alt="Fire" width={24} height={24} />
                        <h3 className="text-lg font-bold text-pipe-900">POWER-UP PERFORMANCE</h3>
                      </div>
                      <PortfolioChart />
                    </div>

                    {/* Trading Stats Summary */}
                    <TradingStatsSummary />
                  </div>
                </TabsContent>

                <TabsContent value="history" className="mt-0">
                  <div className="bg-white border-4 border-pipe-700 rounded-xl shadow-[6px_6px_0_0_rgba(0,0,0,0.3)] p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Image src="/icons/mario/game.png" alt="Quest" width={24} height={24} />
                      <h3 className="text-lg font-bold text-pipe-900">QUEST LOG</h3>
                    </div>
                    <TradeHistory showHeader={false} noCard={true} />
                  </div>
                </TabsContent>
              </Tabs>
            </motion.div>
          </div>

          {/* Enhanced Right Sidebar - Power-Up Panel */}
          <aside className="space-y-6 order-first xl:order-last">
            <div className="xl:sticky xl:top-6 space-y-6">
              {/* Achievement Badges Panel */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div className="bg-white border-4 border-pipe-700 rounded-xl shadow-[6px_6px_0_0_rgba(0,0,0,0.3)] p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Image src="/icons/mario/star.png" alt="Star" width={24} height={24} className="animate-pulse" />
                    <h3 className="text-lg font-bold text-pipe-900">ACHIEVEMENTS</h3>
                  </div>

                  {/* Achievement badges */}
                  <div className="space-y-3">
                    <div className="bg-star-yellow-100 border-3 border-star-yellow-500 rounded-lg p-3 flex items-center gap-3">
                      <Image src="/icons/mario/trophey.png" alt="Trophy" width={32} height={32} />
                      <div>
                        <div className="text-sm font-bold text-pipe-900">First Trade!</div>
                        <div className="text-xs text-pipe-600">Started your journey</div>
                      </div>
                    </div>

                    <div className="bg-pipe-100 border-3 border-pipe-400 rounded-lg p-3 flex items-center gap-3 opacity-50">
                      <Image src="/icons/mario/fire.png" alt="Fire" width={32} height={32} />
                      <div>
                        <div className="text-sm font-bold text-pipe-900">Hot Streak</div>
                        <div className="text-xs text-pipe-600">Win 5 trades in a row</div>
                      </div>
                    </div>

                    <div className="bg-pipe-100 border-3 border-pipe-400 rounded-lg p-3 flex items-center gap-3 opacity-50">
                      <Image src="/icons/mario/money-bag.png" alt="Coins" width={32} height={32} />
                      <div>
                        <div className="text-sm font-bold text-pipe-900">Coin Collector</div>
                        <div className="text-xs text-pipe-600">Earn 1000 SOL profit</div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Trending Tokens - Warp Pipe Style */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <div className="bg-white border-4 border-luigi-green-700 rounded-xl shadow-[6px_6px_0_0_rgba(0,0,0,0.3)] p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Image src="/icons/mario/fire.png" alt="Hot" width={24} height={24} />
                    <h3 className="text-lg font-bold text-pipe-900">HOT TOKENS</h3>
                  </div>
                  <EnhancedTrendingList />
                </div>
              </motion.div>
            </div>
          </aside>
        </CardGrid>

        {/* Mario Decorative Elements - Floating Coins and Stars */}
        <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
          {/* Subtle Mario background elements */}
          <div className="absolute top-20 left-10 opacity-10">
            <Image src="/icons/mario/mushroom.png" alt="" width={60} height={60} />
          </div>
          <div className="absolute bottom-20 right-10 opacity-10">
            <Image src="/icons/mario/star.png" alt="" width={50} height={50} />
          </div>
        </div>
      </main>
    </div>
  )
}

export default function PortfolioPage() {
  return (
    <AuthGuard>
      <Suspense fallback={
        <div className="min-h-screen bg-sky-100">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center space-y-4">
              {/* Mario-themed loading spinner */}
              <div className="relative">
                <div className="h-20 w-20 border-4 border-mario-red-300 border-t-mario-red-600 rounded-full animate-spin mx-auto"></div>
                <div className="absolute inset-0 h-20 w-20 flex items-center justify-center">
                  <Image src="/icons/mario/star.png" alt="Loading" width={32} height={32} className="animate-pulse" />
                </div>
              </div>
              <div className="bg-white border-4 border-pipe-700 rounded-xl p-6 shadow-[6px_6px_0_0_rgba(0,0,0,0.3)]">
                <h3 className="text-lg font-bold text-pipe-900" style={{ fontFamily: "'Press Start 2P', monospace" }}>
                  LOADING...
                </h3>
                <p className="text-sm text-pipe-600 mt-2">Collecting your coins!</p>
              </div>
            </div>
          </div>
        </div>
      }>
        <PortfolioPageContent />
      </Suspense>
    </AuthGuard>
  )
}
