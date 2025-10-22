"use client"

import { motion } from "framer-motion"
import { ArrowLeft, BookOpen, TrendingUp, Wallet, BarChart3, Trophy, Shield, Zap, Star, Coins } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { MarioPageHeader } from "@/components/shared/mario-page-header"

export default function DocumentationPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 mb-12"
        >
          <Link href="/">
            <Button variant="ghost" className="gap-2 mario-btn bg-white border-3 border-[var(--outline-black)] hover:shadow-[3px_3px_0_var(--outline-black)]">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>

          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-[var(--star-yellow)] border-3 border-[var(--outline-black)] flex items-center justify-center shadow-[3px_3px_0_var(--outline-black)]">
                <BookOpen className="h-6 w-6 text-[var(--outline-black)]" />
              </div>
              <h1 className="font-mario text-4xl md:text-5xl text-[var(--outline-black)]">Documentation</h1>
            </div>
            <p className="text-xl text-[var(--outline-black)] font-semibold text-center">
              Everything you need to know about using 1UP SOL
            </p>
          </div>
        </motion.div>

        {/* Getting Started */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6 mb-12"
        >
          <h2 className="font-mario text-3xl text-[var(--outline-black)]">Getting Started</h2>

          <div className="mario-card bg-white p-6 border-4 border-[var(--outline-black)] shadow-[6px_6px_0_var(--outline-black)]">
            <div className="space-y-4">
              <h3 className="font-bold text-xl text-[var(--outline-black)]">Quick Start Guide</h3>
              <ol className="space-y-3 list-decimal list-inside text-[var(--outline-black)]">
                <li className="leading-relaxed">
                  <span className="font-bold text-[var(--outline-black)]">Sign Up:</span> Create your account with email or connect your Solana wallet
                </li>
                <li className="leading-relaxed">
                  <span className="font-bold text-[var(--outline-black)]">Purchase Simulated SOL:</span> Buy simulated SOL with real SOL to start trading (tiers from 0.05 to 1 SOL)
                </li>
                <li className="leading-relaxed">
                  <span className="font-bold text-[var(--outline-black)]">Explore Tokens:</span> Browse trending tokens from Solana DEXes on the Trending page
                </li>
                <li className="leading-relaxed">
                  <span className="font-bold text-[var(--outline-black)]">Place Trades:</span> Buy and sell tokens with real-time market data using your simulated SOL
                </li>
                <li className="leading-relaxed">
                  <span className="font-bold text-[var(--outline-black)]">Earn XP & Climb Leaderboard:</span> Every trade earns XP, compete for the top spot!
                </li>
              </ol>
            </div>
          </div>
        </motion.section>

        {/* Features */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6 mb-12"
        >
          <h2 className="font-mario text-3xl text-[var(--outline-black)]">Platform Features</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="mario-card bg-white p-6 border-4 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)]">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-[var(--sky-blue)] border-3 border-[var(--outline-black)] flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0_var(--outline-black)]">
                  <TrendingUp className="h-5 w-5 text-[var(--outline-black)]" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-lg text-[var(--outline-black)]">Real-Time Trending</h3>
                  <p className="text-[var(--outline-black)] text-sm">
                    Live trending tokens from Solana DEXes including Raydium and Pump.fun. Stay ahead with real-time data.
                  </p>
                </div>
              </div>
            </div>

            <div className="mario-card bg-white p-6 border-4 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)]">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-[var(--coin-yellow)] border-3 border-[var(--outline-black)] flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0_var(--outline-black)]">
                  <Wallet className="h-5 w-5 text-[var(--outline-black)]" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-lg text-[var(--outline-black)]">Simulated Trading</h3>
                  <p className="text-[var(--outline-black)] text-sm">
                    Purchase simulated SOL to trade without risk. Learn and practice strategies safely with real market data.
                  </p>
                </div>
              </div>
            </div>

            <div className="mario-card bg-white p-6 border-4 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)]">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-[var(--luigi-green)] border-3 border-[var(--outline-black)] flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0_var(--outline-black)]">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-lg text-[var(--outline-black)]">Live Market Data</h3>
                  <p className="text-[var(--outline-black)] text-sm">
                    Real-time prices and charts from Helius WebSocket. Experience authentic market conditions risk-free.
                  </p>
                </div>
              </div>
            </div>

            <div className="mario-card bg-white p-6 border-4 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)]">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-[var(--star-yellow)] border-3 border-[var(--outline-black)] flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0_var(--outline-black)]">
                  <Trophy className="h-5 w-5 text-[var(--outline-black)]" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-lg text-[var(--outline-black)]">XP & Leaderboards</h3>
                  <p className="text-[var(--outline-black)] text-sm">
                    Earn XP with every trade and climb the leaderboard. Compete globally and track your progress!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Trading Guide */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6 mb-12"
        >
          <h2 className="font-mario text-3xl text-[var(--outline-black)]">Trading Guide</h2>

          <div className="mario-card bg-white p-6 border-4 border-[var(--outline-black)] shadow-[6px_6px_0_var(--outline-black)]">
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="font-bold text-lg flex items-center gap-2 text-[var(--outline-black)]">
                  <div className="h-8 w-8 rounded-lg bg-[var(--sky-blue)] border-2 border-[var(--outline-black)] flex items-center justify-center">
                    <Zap className="h-4 w-4 text-[var(--outline-black)]" />
                  </div>
                  How to Execute a Trade
                </h3>
                <div className="space-y-2 text-[var(--outline-black)] pl-10">
                  <p>1. Navigate to the Trade page or search for a token using the search bar</p>
                  <p>2. Select a token from trending lists or search results</p>
                  <p>3. Choose BUY or SELL and enter the amount in SOL or tokens</p>
                  <p>4. Review the trade details including price and estimated total</p>
                  <p>5. Confirm the trade and watch your portfolio update in real-time</p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-lg flex items-center gap-2 text-[var(--outline-black)]">
                  <div className="h-8 w-8 rounded-lg bg-[var(--luigi-green)] border-2 border-[var(--outline-black)] flex items-center justify-center">
                    <BarChart3 className="h-4 w-4 text-white" />
                  </div>
                  Understanding P&L
                </h3>
                <p className="text-[var(--outline-black)] pl-10">
                  Your Profit & Loss is calculated using FIFO (First-In-First-Out) accounting. When you sell tokens,
                  the platform uses the oldest purchase price to calculate your realized gains or losses. Your portfolio shows
                  both unrealized P&L (current positions) and realized P&L (completed trades).
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-lg flex items-center gap-2 text-[var(--outline-black)]">
                  <div className="h-8 w-8 rounded-lg bg-[var(--star-yellow)] border-2 border-[var(--outline-black)] flex items-center justify-center">
                    <Star className="h-4 w-4 text-[var(--outline-black)]" />
                  </div>
                  XP & Points System
                </h3>
                <div className="space-y-2 text-[var(--outline-black)] pl-10">
                  <p><strong className="text-[var(--outline-black)]">Earn XP with Every Trade:</strong> Build your level and unlock achievements as you trade!</p>
                  <p><strong className="text-[var(--outline-black)]">How XP Works:</strong> Each successful trade earns you experience points based on trade size and profitability.</p>
                  <p className="text-sm">• Bigger trades = More XP</p>
                  <p className="text-sm">• Profitable trades = Bonus XP</p>
                  <p className="text-sm">• Trading streaks = XP multipliers</p>
                  <p><strong className="text-[var(--outline-black)]">Track Your Progress:</strong> View your current level, XP progress, and rank on your dashboard.</p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-lg flex items-center gap-2 text-[var(--outline-black)]">
                  <div className="h-8 w-8 rounded-lg bg-[var(--mario-red)] border-2 border-[var(--outline-black)] flex items-center justify-center">
                    <Trophy className="h-4 w-4 text-white" />
                  </div>
                  Leaderboard & Competition
                </h3>
                <div className="space-y-2 text-[var(--outline-black)] pl-10">
                  <p><strong className="text-[var(--outline-black)]">Global Rankings:</strong> Compete with traders worldwide for the top spot!</p>
                  <p><strong className="text-[var(--outline-black)]">Ranking Factors:</strong> Total XP, win rate, portfolio value, and trading volume all contribute to your rank.</p>
                  <p className="text-sm">• Top 10 traders get special badges</p>
                  <p className="text-sm">• Weekly leaderboard resets for fair competition</p>
                  <p className="text-sm">• Check your rank anytime on the Leaderboard page</p>
                  <p><strong className="text-[var(--outline-black)]">Climb the Ranks:</strong> Consistent trading and smart strategies are key to reaching the top!</p>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Safety & Risk */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-6 mb-12"
        >
          <h2 className="font-mario text-3xl text-[var(--outline-black)]">Safety & Disclaimer</h2>

          <div className="mario-card bg-white p-6 border-4 border-[var(--mario-red)] shadow-[6px_6px_0_var(--mario-red)]">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-lg bg-[var(--mario-red)] border-3 border-[var(--outline-black)] flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0_var(--outline-black)]">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div className="space-y-3">
                <h3 className="font-bold text-lg text-[var(--outline-black)]">Important Information</h3>
                <div className="space-y-2 text-[var(--outline-black)] text-sm">
                  <p>
                    <strong className="text-[var(--outline-black)]">Simulated Trading Only:</strong> 1UP SOL is a paper trading game.
                    All trades use simulated SOL purchased with real SOL, but no actual token trading occurs.
                  </p>
                  <p>
                    <strong className="text-[var(--outline-black)]">Educational Purpose:</strong> This platform is designed for learning
                    and practicing trading strategies in a safe, gamified environment.
                  </p>
                  <p>
                    <strong className="text-[var(--outline-black)]">Real Market Data:</strong> While we use real-time market data,
                    actual trading results may differ due to slippage, fees, and other market conditions.
                  </p>
                  <p>
                    <strong className="text-[var(--outline-black)]">Not Financial Advice:</strong> 1UP SOL does not provide investment
                    advice. Always do your own research before trading real cryptocurrency.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center space-y-4 py-8"
        >
          <h2 className="font-mario text-2xl text-[var(--outline-black)]">Ready to Start Trading?</h2>
          <p className="text-[var(--outline-black)] font-semibold">Purchase simulated SOL and start practicing today. Level up and climb the leaderboard!</p>
          <Link href="/trade">
            <Button size="lg" className="gap-2 mario-btn bg-[var(--luigi-green)] text-white border-3 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)] hover:shadow-[6px_6px_0_var(--outline-black)] font-mario">
              <TrendingUp className="h-5 w-5" />
              Start Trading Now
            </Button>
          </Link>
        </motion.div>
      </div>
    </div>
  )
}
