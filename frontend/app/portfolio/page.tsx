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
import { WalletManagementPanel } from "@/components/portfolio/wallet-management-panel"
import Image from "next/image"

function PortfolioPageContent() {
  const { user, isAuthenticated } = useAuth()
  const { publicKey } = useWallet()

  return (
    <div className="min-h-dvh-screen bg-gradient-to-br from-background via-background to-muted/20">
      <main className="w-full px-4 sm:px-6 lg:px-8 py-2 sm:py-4 max-w-page-xl mx-auto">
        {/* Mario Page Header with Pixel Art */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 relative"
        >
          {/* Mario-themed header with coins and stars */}
          <div className="bg-[var(--sky-blue)]/20 border-4 border-[var(--outline-black)] rounded-xl p-6 shadow-[8px_8px_0_var(--outline-black)] relative overflow-hidden">
            {/* Decorative Mario icons */}
            <div className="absolute top-2 right-2 flex gap-2">
              <Image src="/icons/mario/star.png" alt="Star" width={24} height={24} className="animate-pulse" />
              <Image src="/icons/mario/money-bag.png" alt="Coin" width={24} height={24} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-[var(--mario-red)] p-3 rounded-lg border-4 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)]">
                  <Image src="/icons/mario/money-bag.png" alt="Portfolio" width={32} height={32} />
                </div>
                <div>
                  <h1 className="text-3xl font-mario font-bold text-[var(--outline-black)]">
                    YOUR WORLD
                  </h1>
                  <p className="text-sm text-muted-foreground font-bold mt-1">Track your coin collection and power-ups!</p>
                </div>
              </div>

              {/* Level Badge with User Avatar */}
              <div className="bg-[var(--star-yellow)] border-4 border-[var(--outline-black)] rounded-lg px-4 py-2 shadow-[4px_4px_0_var(--outline-black)]">
                <div className="flex items-center gap-2">
                  {user?.avatarUrl ? (
                    <div className="w-10 h-10 rounded-full border-3 border-[var(--outline-black)] overflow-hidden bg-white">
                      <img src={user.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <Image src="/icons/mario/user.png" alt="Profile" width={40} height={40} className="rounded-full" />
                  )}
                  <div className="text-right">
                    <div className="text-xs font-mario font-bold text-[var(--outline-black)]">LEVEL</div>
                    <div className="text-lg font-bold text-[var(--outline-black)]">1</div>
                  </div>
                </div>
              </div>
            </div>

            {/* XP Progress Bar - Mario style */}
            <div className="mt-4 bg-gray-200 border-3 border-[var(--outline-black)] rounded-full h-6 overflow-hidden relative">
              <motion.div
                className="bg-gradient-to-r from-[var(--luigi-green)] to-[var(--luigi-green)]/80 h-full flex items-center justify-center border-r-3 border-[var(--outline-black)]"
                initial={{ width: 0 }}
                animate={{ width: "35%" }}
                transition={{ duration: 1, delay: 0.5 }}
              >
                <span className="text-xs font-mario font-bold text-white z-10">350 / 1000 XP</span>
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
                <TabsList className="inline-flex w-auto mb-6 bg-[var(--sky-blue)]/20 border-4 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)] rounded-xl p-2 gap-2">
                  <TabsTrigger
                    value="positions"
                    className="gap-2 data-[state=active]:bg-[var(--mario-red)] data-[state=active]:text-white data-[state=active]:border-3 data-[state=active]:border-[var(--outline-black)] data-[state=active]:shadow-[2px_2px_0_var(--outline-black)] rounded-lg font-mario text-xs sm:text-sm transition-all px-4 py-2"
                  >
                    <Image src="/icons/mario/mushroom.png" alt="Positions" width={16} height={16} />
                    <span>COINS</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="performance"
                    className="gap-2 data-[state=active]:bg-[var(--luigi-green)] data-[state=active]:text-white data-[state=active]:border-3 data-[state=active]:border-[var(--outline-black)] data-[state=active]:shadow-[2px_2px_0_var(--outline-black)] rounded-lg font-mario text-xs sm:text-sm transition-all px-4 py-2"
                  >
                    <Image src="/icons/mario/star.png" alt="Performance" width={16} height={16} />
                    <span>STATS</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="history"
                    className="gap-2 data-[state=active]:bg-[var(--star-yellow)] data-[state=active]:text-[var(--outline-black)] data-[state=active]:border-3 data-[state=active]:border-[var(--outline-black)] data-[state=active]:shadow-[2px_2px_0_var(--outline-black)] rounded-lg font-mario text-xs sm:text-sm transition-all px-4 py-2"
                  >
                    <Image src="/icons/mario/trophy.png" alt="History" width={16} height={16} />
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
                    <div className="bg-[var(--sky-blue)]/20 border-4 border-[var(--outline-black)] rounded-xl shadow-[6px_6px_0_var(--outline-black)] p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Image src="/icons/mario/fire.png" alt="Fire" width={24} height={24} />
                        <h3 className="text-lg font-mario font-bold text-[var(--outline-black)]">POWER-UP PERFORMANCE</h3>
                      </div>
                      <PortfolioChart />
                    </div>

                    {/* Trading Stats Summary */}
                    <TradingStatsSummary />
                  </div>
                </TabsContent>

                <TabsContent value="history" className="mt-0">
                  <div className="bg-[var(--sky-blue)]/20 border-4 border-[var(--outline-black)] rounded-xl shadow-[6px_6px_0_var(--outline-black)] p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Image src="/icons/mario/game.png" alt="Quest" width={24} height={24} />
                      <h3 className="text-lg font-mario font-bold text-[var(--outline-black)]">QUEST LOG</h3>
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
              {/* Wallet Management Panel - NEW! */}
              <WalletManagementPanel />

              {/* Achievement Badges Panel */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div className="bg-[var(--sky-blue)]/20 border-4 border-[var(--outline-black)] rounded-xl shadow-[6px_6px_0_var(--outline-black)] p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Image src="/icons/mario/star.png" alt="Star" width={24} height={24} className="animate-pulse" />
                    <h3 className="text-lg font-mario font-bold text-[var(--outline-black)]">ACHIEVEMENTS</h3>
                  </div>

                  {/* Achievement badges */}
                  <div className="space-y-3">
                    <div className="bg-[var(--star-yellow)]/20 border-3 border-[var(--star-yellow)] shadow-[3px_3px_0_var(--outline-black)] rounded-lg p-3 flex items-center gap-3">
                      <Image src="/icons/mario/trophy.png" alt="Trophy" width={32} height={32} />
                      <div>
                        <div className="text-sm font-mario font-bold text-[var(--outline-black)]">First Trade!</div>
                        <div className="text-xs text-muted-foreground font-bold">Started your journey</div>
                      </div>
                    </div>

                    <div className="bg-gray-100 border-3 border-gray-400 rounded-lg p-3 flex items-center gap-3 opacity-50">
                      <Image src="/icons/mario/fire.png" alt="Fire" width={32} height={32} />
                      <div>
                        <div className="text-sm font-mario font-bold text-[var(--outline-black)]">Hot Streak</div>
                        <div className="text-xs text-muted-foreground font-bold">Win 5 trades in a row</div>
                      </div>
                    </div>

                    <div className="bg-gray-100 border-3 border-gray-400 rounded-lg p-3 flex items-center gap-3 opacity-50">
                      <Image src="/icons/mario/money-bag.png" alt="Coins" width={32} height={32} />
                      <div>
                        <div className="text-sm font-mario font-bold text-[var(--outline-black)]">Coin Collector</div>
                        <div className="text-xs text-muted-foreground font-bold">Earn 1000 SOL profit</div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </aside>
        </CardGrid>

      </main>
    </div>
  )
}

export default function PortfolioPage() {
  return (
    <AuthGuard>
      <Suspense fallback={
        <div className="min-h-dvh-screen bg-gradient-to-br from-background via-background to-muted/20">
          <div className="flex items-center justify-center min-h-dvh-screen">
            <div className="text-center space-y-4">
              {/* Mario-themed loading spinner */}
              <div className="relative">
                <div className="h-20 w-20 border-4 border-[var(--mario-red)]/30 border-t-[var(--mario-red)] rounded-full animate-spin mx-auto"></div>
                <div className="absolute inset-0 h-20 w-20 flex items-center justify-center">
                  <Image src="/icons/mario/star.png" alt="Loading" width={32} height={32} className="animate-pulse" />
                </div>
              </div>
              <div className="bg-[var(--sky-blue)]/20 border-4 border-[var(--outline-black)] rounded-xl p-6 shadow-[6px_6px_0_var(--outline-black)]">
                <h3 className="text-lg font-mario font-bold text-[var(--outline-black)]">
                  LOADING...
                </h3>
                <p className="text-sm text-muted-foreground font-bold mt-2">Collecting your coins!</p>
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
