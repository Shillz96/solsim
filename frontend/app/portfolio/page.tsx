"use client"

import { Suspense } from "react"
import { AuthGuard } from "@/components/auth/auth-guard"
import { PnLCard } from "@/components/portfolio/pnl-card"
import { UnifiedPositions } from "@/components/portfolio/unified-positions"
import { RewardsCard } from "@/components/portfolio/rewards-card"
import { PortfolioMetrics } from "@/components/portfolio/PortfolioMetrics"
import { EnhancedTrendingList } from "@/components/leaderboard/enhanced-trending-list"
import { TradeHistory } from "@/components/trading/trade-history"
import { PortfolioChart } from "@/components/portfolio/portfolio-chart-dynamic"
import { SimplePageHeader, PortfolioPageActions } from "@/components/shared/simple-page-header"
import { EnhancedCard, CardGrid, CardSection } from "@/components/ui/enhanced-card-system"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, History, BarChart3, Wallet, Target, Loader2 } from "lucide-react"
import { motion } from "framer-motion"
import { useAuth } from "@/hooks/use-auth"

function PortfolioPageContent() {
  const { user, isAuthenticated } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <main className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-page-xl mx-auto">
        {/* Enhanced Header */}
        <SimplePageHeader
          title="Portfolio"
          subtitle="Track your positions and performance"
          icon={<Wallet className="h-6 w-6 text-primary" />}
          actions={<PortfolioPageActions />}
        />

        {/* Portfolio Metrics - Top Level */}
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
            {/* Portfolio Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <PnLCard />
            </motion.div>

            {/* Enhanced Tabbed Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Tabs defaultValue="positions" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6 bg-muted/50 backdrop-blur-sm border border-border/50">
                  <TabsTrigger value="positions" className="gap-2 data-[state=active]:bg-primary/20">
                    <TrendingUp className="h-4 w-4" />
                    <span className="hidden sm:inline">Positions</span>
                  </TabsTrigger>
                  <TabsTrigger value="performance" className="gap-2 data-[state=active]:bg-primary/20">
                    <BarChart3 className="h-4 w-4" />
                    <span className="hidden sm:inline">Performance</span>
                  </TabsTrigger>
                  <TabsTrigger value="history" className="gap-2 data-[state=active]:bg-primary/20">
                    <History className="h-4 w-4" />
                    <span className="hidden sm:inline">History</span>
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
                  <EnhancedCard variant="elevated" size="lg">
                    <CardSection 
                      title="Portfolio Performance" 
                      description="Track your portfolio value over time"
                      spacing="normal"
                    >
                      <PortfolioChart />
                    </CardSection>
                  </EnhancedCard>
                </TabsContent>

                <TabsContent value="history" className="mt-0">
                  <EnhancedCard variant="default" size="lg">
                    <CardSection 
                      title="Trade History" 
                      description="Your recent trading activity"
                      spacing="normal"
                    >
                      <TradeHistory />
                    </CardSection>
                  </EnhancedCard>
                </TabsContent>
              </Tabs>
            </motion.div>
          </div>

          {/* Enhanced Right Sidebar (1/4 width) */}
          <aside className="space-y-6 order-first xl:order-last">
            <div className="xl:sticky xl:top-6 space-y-6">
              {/* Rewards Card */}
              {isAuthenticated && user && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <RewardsCard
                    userId={user.id}
                    walletAddress={undefined}
                  />
                </motion.div>
              )}

              {/* Trending Tokens */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <EnhancedCard variant="elevated" size="md" className="overflow-hidden">
                  <div className="p-6 space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold">Trending Tokens</h3>
                      <p className="text-sm text-muted-foreground">Popular tokens on SolSim</p>
                    </div>
                    <EnhancedTrendingList />
                  </div>
                </EnhancedCard>
              </motion.div>
            </div>
          </aside>
        </CardGrid>

        {/* Decorative Elements */}
        <div className="fixed inset-0 pointer-events-none -z-20 overflow-hidden">
          <div className="absolute top-1/3 left-1/5 w-96 h-96 bg-primary/3 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/3 right-1/5 w-96 h-96 bg-green-500/3 rounded-full blur-3xl"></div>
          <div className="absolute top-2/3 left-2/3 w-64 h-64 bg-blue-500/3 rounded-full blur-2xl"></div>
        </div>
      </main>
    </div>
  )
}

export default function PortfolioPage() {
  return (
    <AuthGuard>
      <Suspense fallback={
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center space-y-4">
              <div className="relative">
                <div className="h-16 w-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
                <div className="absolute inset-0 h-16 w-16 border-2 border-green-500/20 border-b-green-500 rounded-full animate-spin mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
              </div>
              <div>
                <h3 className="text-lg font-semibold">Loading Portfolio</h3>
                <p className="text-sm text-muted-foreground">Analyzing your positions...</p>
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
