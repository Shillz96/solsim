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

        {/* Trading Modes */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6 mb-12"
        >
          <h2 className="font-mario text-3xl text-[var(--outline-black)]">Trading Modes</h2>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="mario-card bg-white p-6 border-4 border-[var(--luigi-green)] shadow-[6px_6px_0_var(--luigi-green)]">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-[var(--luigi-green)] border-3 border-[var(--outline-black)] flex items-center justify-center shadow-[2px_2px_0_var(--outline-black)]">
                    <Wallet className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-bold text-xl text-[var(--outline-black)]">Paper Trading</h3>
                </div>
                <div className="space-y-3 text-[var(--outline-black)]">
                  <p><strong className="text-[var(--outline-black)]">Virtual SOL Balance:</strong> Start with 100 virtual SOL for risk-free trading</p>
                  <p><strong className="text-[var(--outline-black)]">No Real Money:</strong> All trades are simulated using real market data</p>
                  <p><strong className="text-[var(--outline-black)]">Learn & Practice:</strong> Perfect for beginners to learn trading strategies</p>
                  <p><strong className="text-[var(--outline-black)]">Reset Anytime:</strong> Reset your virtual balance to start fresh</p>
                  <p className="text-sm bg-[var(--sky-blue)] p-3 rounded-lg border-2 border-[var(--outline-black)]">
                    <strong>Perfect for:</strong> Learning, testing strategies, and building confidence before real trading
                  </p>
                </div>
              </div>
            </div>

            <div className="mario-card bg-white p-6 border-4 border-[var(--mario-red)] shadow-[6px_6px_0_var(--mario-red)]">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-[var(--mario-red)] border-3 border-[var(--outline-black)] flex items-center justify-center shadow-[2px_2px_0_var(--outline-black)]">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-bold text-xl text-[var(--outline-black)]">Real Trading</h3>
                </div>
                <div className="space-y-3 text-[var(--outline-black)]">
                  <p><strong className="text-[var(--outline-black)]">Two Options:</strong> Trade with deposited SOL or your connected wallet</p>
                  <p><strong className="text-[var(--outline-black)]">Deposited Mode:</strong> Deposit real SOL to platform, simple one-click trading (1% fee)</p>
                  <p><strong className="text-[var(--outline-black)]">Wallet Mode:</strong> Use your wallet directly, sign each trade (0.5% fee)</p>
                  <p><strong className="text-[var(--outline-black)]">Real Transactions:</strong> Actual on-chain trades with real tokens</p>
                  <p className="text-sm bg-[var(--mario-red)] text-white p-3 rounded-lg border-2 border-[var(--outline-black)]">
                    <strong>⚠️ Real Money:</strong> Only trade with money you can afford to lose
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
          transition={{ delay: 0.4 }}
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
            </div>
          </div>
        </motion.section>

        {/* Wallet Tracker */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-6 mb-12"
        >
          <h2 className="font-mario text-3xl text-[var(--outline-black)]">Wallet Tracker & Copy Trading</h2>

          <div className="mario-card bg-white p-6 border-4 border-[var(--star-yellow)] shadow-[6px_6px_0_var(--star-yellow)]">
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="font-bold text-lg flex items-center gap-2 text-[var(--outline-black)]">
                  <div className="h-8 w-8 rounded-lg bg-[var(--star-yellow)] border-2 border-[var(--outline-black)] flex items-center justify-center">
                    <Wallet className="h-4 w-4 text-[var(--outline-black)]" />
                  </div>
                  Track Successful Traders
                </h3>
                <div className="space-y-2 text-[var(--outline-black)] pl-10">
                  <p><strong className="text-[var(--outline-black)]">Follow KOL Wallets:</strong> Track successful traders and copy their moves</p>
                  <p><strong className="text-[var(--outline-black)]">Real-time Updates:</strong> Get notified when tracked wallets make trades</p>
                  <p><strong className="text-[var(--outline-black)]">Smart Filtering:</strong> Set filters for market cap, trade size, and token types</p>
                  <p><strong className="text-[var(--outline-black)]">Copy Trades:</strong> Instantly copy trades with customizable position sizing</p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-lg flex items-center gap-2 text-[var(--outline-black)]">
                  <div className="h-8 w-8 rounded-lg bg-[var(--mario-red)] border-2 border-[var(--outline-black)] flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-white" />
                  </div>
                  How Copy Trading Works
                </h3>
                <div className="space-y-2 text-[var(--outline-black)] pl-10">
                  <p><strong className="text-[var(--outline-black)]">1. Add Wallet:</strong> Enter a wallet address to start tracking</p>
                  <p><strong className="text-[var(--outline-black)]">2. Set Filters:</strong> Choose what types of trades to see (buys only, minimum market cap, etc.)</p>
                  <p><strong className="text-[var(--outline-black)]">3. Copy Trades:</strong> When they make a trade, you can copy it at any percentage (10%, 50%, 100%)</p>
                  <p><strong className="text-[var(--outline-black)]">4. Auto-Execute:</strong> Your copy trade executes immediately with your virtual SOL</p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-lg flex items-center gap-2 text-[var(--outline-black)]">
                  <div className="h-8 w-8 rounded-lg bg-[var(--sky-blue)] border-2 border-[var(--outline-black)] flex items-center justify-center">
                    <Shield className="h-4 w-4 text-[var(--outline-black)]" />
                  </div>
                  Smart Features
                </h3>
                <div className="space-y-2 text-[var(--outline-black)] pl-10">
                  <p><strong className="text-[var(--outline-black)]">Market Cap Filters:</strong> Only show trades above/below certain market caps</p>
                  <p><strong className="text-[var(--outline-black)]">Trade Size Filters:</strong> Filter by minimum/maximum trade amounts</p>
                  <p><strong className="text-[var(--outline-black)]">Image Requirements:</strong> Only show tokens with proper images</p>
                  <p><strong className="text-[var(--outline-black)]">Buy/Sell Toggle:</strong> Choose to see only buys, only sells, or both</p>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* XP & Rewards System */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="space-y-6 mb-12"
        >
          <h2 className="font-mario text-3xl text-[var(--outline-black)]">XP & Rewards System</h2>

          <div className="mario-card bg-white p-6 border-4 border-[var(--outline-black)] shadow-[6px_6px_0_var(--outline-black)]">
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="font-bold text-lg flex items-center gap-2 text-[var(--outline-black)]">
                  <div className="h-8 w-8 rounded-lg bg-[var(--star-yellow)] border-2 border-[var(--outline-black)] flex items-center justify-center">
                    <Star className="h-4 w-4 text-[var(--outline-black)]" />
                  </div>
                  How to Earn XP
                </h3>
                <div className="space-y-3 text-[var(--outline-black)] pl-10">
                  <div className="bg-[var(--sky-blue)] p-4 rounded-lg border-2 border-[var(--outline-black)]">
                    <p><strong className="text-[var(--outline-black)]">Base XP per Trade:</strong> 10 XP + (Trade Volume × 0.1)</p>
                    <p className="text-sm">• $100 trade = 20 XP • $500 trade = 60 XP • $1,000 trade = 110 XP</p>
                  </div>
                  <div className="bg-[var(--luigi-green)] p-4 rounded-lg border-2 border-[var(--outline-black)]">
                    <p><strong className="text-[var(--outline-black)]">Profit Bonus:</strong> 25 XP + (Profit × 0.5)</p>
                    <p className="text-sm">• $50 profit = 50 bonus XP • $200 profit = 125 bonus XP</p>
                  </div>
                  <div className="bg-[var(--coin-yellow)] p-4 rounded-lg border-2 border-[var(--outline-black)]">
                    <p><strong className="text-[var(--outline-black)]">Milestone Bonuses:</strong></p>
                    <p className="text-sm">• First trade: +100 XP • 10th trade: +250 XP • 50th trade: +500 XP • 100th trade: +1,000 XP</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-lg flex items-center gap-2 text-[var(--outline-black)]">
                  <div className="h-8 w-8 rounded-lg bg-[var(--mario-red)] border-2 border-[var(--outline-black)] flex items-center justify-center">
                    <Trophy className="h-4 w-4 text-white" />
                  </div>
                  Level System & Rewards
                </h3>
                <div className="space-y-2 text-[var(--outline-black)] pl-10">
                  <p><strong className="text-[var(--outline-black)]">20 Mario Levels:</strong> From "Goomba Trader" to "Legendary Luigi"</p>
                  <p><strong className="text-[var(--outline-black)]">$1UP Rewards:</strong> Earn $1UP tokens based on your performance</p>
                  <p><strong className="text-[var(--outline-black)]">Reward Calculation:</strong></p>
                  <div className="bg-[var(--star-yellow)] p-3 rounded-lg border-2 border-[var(--outline-black)] ml-4">
                    <p className="text-sm">• 1 point per trade = 1,000 $1UP</p>
                    <p className="text-sm">• 2 points per $100 volume = 2,000 $1UP</p>
                    <p className="text-sm">• 10 points per 10% win rate = 10,000 $1UP</p>
                    <p className="text-sm">• Maximum: 200 points = 200,000 $1UP per claim</p>
                  </div>
                  <p><strong className="text-[var(--outline-black)]">Claim Rewards:</strong> Visit the Rewards page to claim your earned $1UP tokens</p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-lg flex items-center gap-2 text-[var(--outline-black)]">
                  <div className="h-8 w-8 rounded-lg bg-[var(--sky-blue)] border-2 border-[var(--outline-black)] flex items-center justify-center">
                    <BarChart3 className="h-4 w-4 text-[var(--outline-black)]" />
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

        {/* Platform Features */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="space-y-6 mb-12"
        >
          <h2 className="font-mario text-3xl text-[var(--outline-black)]">Platform Features</h2>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="mario-card bg-white p-6 border-4 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)]">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-[var(--mario-red)] border-3 border-[var(--outline-black)] flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0_var(--outline-black)]">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-lg text-[var(--outline-black)]">Trade Page</h3>
                  <p className="text-[var(--outline-black)] text-sm">
                    Main trading interface with real-time charts, order placement, and market data.
                  </p>
                </div>
              </div>
            </div>

            <div className="mario-card bg-white p-6 border-4 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)]">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-[var(--luigi-green)] border-3 border-[var(--outline-black)] flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0_var(--outline-black)]">
                  <Wallet className="h-5 w-5 text-white" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-lg text-[var(--outline-black)]">Portfolio</h3>
                  <p className="text-[var(--outline-black)] text-sm">
                    Track your positions, P&L, trading history, and performance metrics.
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
                  <h3 className="font-bold text-lg text-[var(--outline-black)]">Leaderboard</h3>
                  <p className="text-[var(--outline-black)] text-sm">
                    Compete globally and see how you rank against other traders.
                  </p>
                </div>
              </div>
            </div>

            <div className="mario-card bg-white p-6 border-4 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)]">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-[var(--sky-blue)] border-3 border-[var(--outline-black)] flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0_var(--outline-black)]">
                  <BarChart3 className="h-5 w-5 text-[var(--outline-black)]" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-lg text-[var(--outline-black)]">Trending</h3>
                  <p className="text-[var(--outline-black)] text-sm">
                    Discover hot tokens and trending opportunities on Solana.
                  </p>
                </div>
              </div>
            </div>

            <div className="mario-card bg-white p-6 border-4 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)]">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-[var(--coin-yellow)] border-3 border-[var(--outline-black)] flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0_var(--outline-black)]">
                  <Coins className="h-5 w-5 text-[var(--outline-black)]" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-lg text-[var(--outline-black)]">Rewards</h3>
                  <p className="text-[var(--outline-black)] text-sm">
                    Claim $1UP rewards based on your trading performance and XP.
                  </p>
                </div>
              </div>
            </div>

            <div className="mario-card bg-white p-6 border-4 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)]">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-[var(--mario-red)] border-3 border-[var(--outline-black)] flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0_var(--outline-black)]">
                  <Wallet className="h-5 w-5 text-white" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-lg text-[var(--outline-black)]">Wallet Tracker</h3>
                  <p className="text-[var(--outline-black)] text-sm">
                    Follow successful traders and copy their trades automatically.
                  </p>
                </div>
              </div>
            </div>

            <div className="mario-card bg-white p-6 border-4 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)]">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-[var(--luigi-green)] border-3 border-[var(--outline-black)] flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0_var(--outline-black)]">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-lg text-[var(--outline-black)]">Perps Trading</h3>
                  <p className="text-[var(--outline-black)] text-sm">
                    Trade perpetual futures with leverage (coming soon).
                  </p>
                </div>
              </div>
            </div>

            <div className="mario-card bg-white p-6 border-4 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)]">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-[var(--star-yellow)] border-3 border-[var(--outline-black)] flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0_var(--outline-black)]">
                  <Zap className="h-5 w-5 text-[var(--outline-black)]" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-lg text-[var(--outline-black)]">Warp Pipes</h3>
                  <p className="text-[var(--outline-black)] text-sm">
                    Fast token discovery and filtering tools for finding gems.
                  </p>
                </div>
              </div>
            </div>

            <div className="mario-card bg-white p-6 border-4 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)]">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-[var(--sky-blue)] border-3 border-[var(--outline-black)] flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0_var(--outline-black)]">
                  <BarChart3 className="h-5 w-5 text-[var(--outline-black)]" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-lg text-[var(--outline-black)]">Trade Rooms</h3>
                  <p className="text-[var(--outline-black)] text-sm">
                    Dedicated trading rooms for specific tokens with live chat.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Safety & Risk */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="space-y-6 mb-12"
        >
          <h2 className="font-mario text-3xl text-[var(--outline-black)]">Safety & Disclaimer</h2>

          <div className="space-y-4">
            <div className="mario-card bg-white p-6 border-4 border-[var(--luigi-green)] shadow-[6px_6px_0_var(--luigi-green)]">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-[var(--luigi-green)] border-3 border-[var(--outline-black)] flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0_var(--outline-black)]">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <div className="space-y-3">
                  <h3 className="font-bold text-lg text-[var(--outline-black)]">Paper Trading (Safe Mode)</h3>
                  <div className="space-y-2 text-[var(--outline-black)] text-sm">
                    <p>
                      <strong className="text-[var(--outline-black)]">Virtual SOL Only:</strong> Paper trading uses virtual SOL balance.
                      No real money is at risk when trading in paper mode.
                    </p>
                    <p>
                      <strong className="text-[var(--outline-black)]">Educational Purpose:</strong> Perfect for learning trading strategies
                      and building confidence before real trading.
                    </p>
                    <p>
                      <strong className="text-[var(--outline-black)]">Real Market Data:</strong> Uses live Solana price feeds for authentic
                      trading experience without financial risk.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mario-card bg-white p-6 border-4 border-[var(--mario-red)] shadow-[6px_6px_0_var(--mario-red)]">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-[var(--mario-red)] border-3 border-[var(--outline-black)] flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0_var(--outline-black)]">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <div className="space-y-3">
                  <h3 className="font-bold text-lg text-[var(--outline-black)]">Real Trading (High Risk)</h3>
                  <div className="space-y-2 text-[var(--outline-black)] text-sm">
                    <p>
                      <strong className="text-[var(--outline-black)]">⚠️ REAL MONEY AT RISK:</strong> Real trading involves actual SOL and tokens.
                      You can lose money quickly. Only trade what you can afford to lose.
                    </p>
                    <p>
                      <strong className="text-[var(--outline-black)]">Market Risks:</strong> Cryptocurrency markets are highly volatile.
                      Prices can change rapidly and unpredictably.
                    </p>
                    <p>
                      <strong className="text-[var(--outline-black)]">Technical Risks:</strong> Network congestion, failed transactions,
                      and slippage can affect your trades.
                    </p>
                    <p>
                      <strong className="text-[var(--outline-black)]">Not Financial Advice:</strong> 1UP SOL does not provide investment advice.
                      Always do your own research before trading real cryptocurrency.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mario-card bg-white p-6 border-4 border-[var(--star-yellow)] shadow-[6px_6px_0_var(--star-yellow)]">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-[var(--star-yellow)] border-3 border-[var(--outline-black)] flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0_var(--outline-black)]">
                  <Shield className="h-5 w-5 text-[var(--outline-black)]" />
                </div>
                <div className="space-y-3">
                  <h3 className="font-bold text-lg text-[var(--outline-black)]">General Safety</h3>
                  <div className="space-y-2 text-[var(--outline-black)] text-sm">
                    <p>
                      <strong className="text-[var(--outline-black)]">Secure Your Account:</strong> Use strong passwords and enable
                      two-factor authentication when available.
                    </p>
                    <p>
                      <strong className="text-[var(--outline-black)]">Wallet Security:</strong> Never share your private keys or seed phrases.
                      Keep your wallet secure and backed up.
                    </p>
                    <p>
                      <strong className="text-[var(--outline-black)]">Start Small:</strong> Begin with paper trading to learn the platform
                      before risking real money.
                    </p>
                    <p>
                      <strong className="text-[var(--outline-black)]">Stay Informed:</strong> Keep up with market news and understand
                      the risks before making any trades.
                    </p>
                  </div>
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
