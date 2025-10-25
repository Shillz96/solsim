"use client"

import { Suspense } from "react"
import { AuthGuard } from "@/components/auth/auth-guard"
import { UnifiedPositions } from "@/components/portfolio/unified-positions"
import { TradingStatsSummary } from "@/components/portfolio/trading-stats-summary"
import { TradeHistory } from "@/components/trading/trade-history"
import { PortfolioChart } from "@/components/portfolio/portfolio-chart-dynamic"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { motion } from "framer-motion"
import { useAuth } from "@/hooks/use-auth"
import { useWallet } from "@solana/wallet-adapter-react"
import { OverviewTab } from "@/components/portfolio/overview-tab"
import { AchievementsTab } from "@/components/portfolio/achievements-tab"
import { WalletTab } from "@/components/portfolio/wallet-tab"
import Image from "next/image"
import { useSearchParams } from "next/navigation"

function PortfolioPageContent() {
  const { user, isAuthenticated } = useAuth()
  const { publicKey } = useWallet()
  const searchParams = useSearchParams()
  const defaultTab = searchParams.get('tab') || 'overview'

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <main className="container mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="bg-[var(--sky-blue)]/20 border-4 border-[var(--outline-black)] rounded-xl p-6 shadow-[8px_8px_0_var(--outline-black)] relative overflow-hidden">
            <div className="absolute top-2 right-2 flex gap-2">
              <Image src="/icons/mario/star.png" alt="Star" width={24} height={24} className="animate-pulse" />
              <Image src="/icons/mario/money-bag.png" alt="Coin" width={24} height={24} />
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-[var(--mario-red)] p-3 rounded-lg border-4 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)]">
                <Image src="/icons/mario/money-bag.png" alt="Portfolio" width={32} height={32} />
              </div>
              <div>
                <h1 className="text-3xl font-mario font-bold text-[var(--outline-black)]">YOUR WORLD</h1>
                <p className="text-sm text-muted-foreground font-bold mt-1">Track your coin collection and power-ups!</p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
          <Tabs defaultValue={defaultTab} className="w-full">
                        <TabsList className="inline-flex w-auto mb-6 flex-wrap">
              <TabsTrigger value="overview" className="mario-tab-yellow text-xs sm:text-sm">
                📊 Overview
              </TabsTrigger>
              <TabsTrigger value="coins" className="mario-tab-red text-xs sm:text-sm">
                🪙 Coins
              </TabsTrigger>
              <TabsTrigger value="stats" className="mario-tab-green text-xs sm:text-sm">
                📈 Stats
              </TabsTrigger>
              <TabsTrigger value="history" className="mario-tab-yellow text-xs sm:text-sm">
                🕒 History
              </TabsTrigger>
              <TabsTrigger value="wallet" className="mario-tab-red text-xs sm:text-sm">
                👛 Wallet
              </TabsTrigger>
              <TabsTrigger value="achievements" className="mario-tab-green text-xs sm:text-sm">
                🏆 Achievements
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="min-h-[600px] mt-0">
              <OverviewTab />
            </TabsContent>

            <TabsContent value="coins" className="min-h-[600px] mt-0">
              <div className="bg-[var(--sky-blue)]/20 border-4 border-[var(--outline-black)] rounded-xl shadow-[6px_6px_0_var(--outline-black)] p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Image src="/icons/mario/mushroom.png" alt="Coins" width={24} height={24} />
                  <h3 className="text-lg font-mario font-bold text-[var(--outline-black)]">YOUR COINS</h3>
                </div>
                <UnifiedPositions variant="full" showHeader={false} showSummary={true} />
              </div>
            </TabsContent>

            <TabsContent value="stats" className="min-h-[600px] mt-0">
              <div className="space-y-6">
                <div className="bg-[var(--sky-blue)]/20 border-4 border-[var(--outline-black)] rounded-xl shadow-[6px_6px_0_var(--outline-black)] p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Image src="/icons/mario/fire.png" alt="Fire" width={24} height={24} />
                    <h3 className="text-lg font-mario font-bold text-[var(--outline-black)]">POWER-UP PERFORMANCE</h3>
                  </div>
                  <PortfolioChart />
                </div>
                <TradingStatsSummary />
              </div>
            </TabsContent>

            <TabsContent value="history" className="min-h-[600px] mt-0">
              <div className="bg-[var(--sky-blue)]/20 border-4 border-[var(--outline-black)] rounded-xl shadow-[6px_6px_0_var(--outline-black)] p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Image src="/icons/mario/game.png" alt="Quest" width={24} height={24} />
                  <h3 className="text-lg font-mario font-bold text-[var(--outline-black)]">QUEST LOG</h3>
                </div>
                <TradeHistory showHeader={false} noCard={true} />
              </div>
            </TabsContent>

            <TabsContent value="wallet" className="min-h-[600px] mt-0">
              <WalletTab />
            </TabsContent>

            <TabsContent value="achievements" className="min-h-[600px] mt-0">
              <AchievementsTab />
            </TabsContent>
          </Tabs>
        </motion.div>
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
              <div className="relative">
                <div className="h-20 w-20 border-4 border-[var(--mario-red)]/30 border-t-[var(--mario-red)] rounded-full animate-spin mx-auto"></div>
                <div className="absolute inset-0 h-20 w-20 flex items-center justify-center">
                  <Image src="/icons/mario/star.png" alt="Loading" width={32} height={32} className="animate-pulse" />
                </div>
              </div>
              <div className="bg-[var(--sky-blue)]/20 border-4 border-[var(--outline-black)] rounded-xl p-6 shadow-[6px_6px_0_var(--outline-black)]">
                <h3 className="text-lg font-mario font-bold text-[var(--outline-black)]">LOADING...</h3>
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
