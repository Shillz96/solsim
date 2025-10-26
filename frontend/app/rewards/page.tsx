"use client"

import React from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowLeft, Gift } from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * 1UP SOL — Rewards & Points System (Mario Theme)
 * Matching docs page styling
 */

const earningMethods = [
  {
    icon: "💸",
    title: "Trading Activity",
    formula: "10 + (Trade Volume in USD × 0.1)",
    example: "$500 trade = 60 points",
    description: "Every trade earns you base points, no matter what."
  },
  {
    icon: "🏆",
    title: "Profitable Trades",
    formula: "25 + (Profit × 0.5)",
    example: "$100 profit = 75 bonus points",
    description: "Winning trades give bonus multipliers."
  },
  {
    icon: "⚡",
    title: "Daily Missions",
    tasks: [
      "First trade of the day → +100 1UP",
      "5 trades in a day → +250 1UP",
      "Log in daily for 5 days → +500 1UP streak bonus"
    ],
    description: "Complete simple daily tasks for streak bonuses."
  },
  {
    icon: "👥",
    title: "Referrals",
    benefits: [
      "+10% of every 1UP your friend earns",
      "Bonus badge when you refer 5 traders",
      "Leaderboard for 'Top Recruiters'"
    ],
    description: "Invite your friends and earn forever."
  },
  {
    icon: "🔥",
    title: "Event Boosts",
    description: "During special challenges (like 'Pump Week' or 'Boss Battles'), earn 2×–5× multipliers. Stay active during limited events for higher airdrop ranks."
  }
]

const levelData = [
  { level: 1, title: "Goomba Trader", xp: 0, reward: "Start your journey" },
  { level: 3, title: "Koopa Troopa", xp: 250, reward: "1UP Border frame" },
  { level: 5, title: "Super Trader", xp: 1000, reward: "Fee rebate 2%" },
  { level: 10, title: "Wing Cap", xp: 20000, reward: "1UP Airdrop Boost 1.2×" },
  { level: 15, title: "Chain Chomp", xp: 125000, reward: "Early access to features" },
  { level: 20, title: "Legendary Luigi", xp: 750000, reward: "Special NFT badge + lifetime reward boost" }
]

const weeklyRewards = [
  { category: "🥇 Top 10 Traders", payout: "% of total pool based on volume" },
  { category: "🧠 Most Profitable", payout: "Flat reward + XP bonus" },
  { category: "🔥 Most Active", payout: "Weighted by number of trades" },
  { category: "👑 Referral King", payout: "% of volume from referred users" }
]

const achievements = [
  { achievement: "🎯 First Trade", requirement: "Complete 1 trade", reward: "+100 1UP" },
  { achievement: "🪙 Coin Collector", requirement: "10 trades in a day", reward: "+500 1UP" },
  { achievement: "💎 Diamond Hands", requirement: "Hold a position 7+ days", reward: "+500 1UP" },
  { achievement: "⚡ Speed Runner", requirement: "5 trades in 10 minutes", reward: "+250 1UP" },
  { achievement: "🧠 Perfect Week", requirement: "7 profitable trades in a row", reward: "+1,000 1UP" },
  { achievement: "🐉 Boss Slayer", requirement: "Win a leaderboard event", reward: "NFT Badge + XP boost" }
]

const redemptionOptions = [
  { icon: "💎", option: "Convert to Tokens", detail: "Redeem for $1UP after airdrop unlock (1000 Points = 1 $1UP token)" },
  { icon: "🎁", option: "Open Mystery Boxes", detail: "Contain NFTs, boosts, and bonuses" },
  { icon: "🔥", option: "Reduce Trading Fees", detail: "Spend points to get temporary fee discounts" },
  { icon: "🪩", option: "Unlock Cosmetics", detail: "Profile badges, animated cards, level effects" }
]

export default function RewardsPage() {
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
            <Button variant="ghost" className="gap-2 mario-btn bg-[var(--card)] border-3 border-[var(--outline-black)] hover:shadow-[3px_3px_0_var(--outline-black)]">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>

          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-[var(--star-yellow)] border-3 border-[var(--outline-black)] flex items-center justify-center shadow-[3px_3px_0_var(--outline-black)]">
                <Gift className="h-6 w-6 text-[var(--outline-black)]" />
              </div>
              <h1 className="font-mario text-4xl md:text-5xl text-[var(--outline-black)]">1UP Points & Rewards</h1>
            </div>
            <p className="text-xl text-[var(--outline-black)] font-semibold text-center">
              "Trade. Level Up. Get Paid."
            </p>
          </div>
        </motion.div>

        {/* What Are 1UP Points */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6 mb-12"
        >
          <h2 className="font-mario text-3xl text-[var(--outline-black)]">What Are 1UP Points?</h2>

          <div className="mario-card bg-[var(--card)] p-6 border-4 border-[var(--outline-black)] shadow-[6px_6px_0_var(--outline-black)]">
            <div className="space-y-4">
              <p className="text-[var(--outline-black)] leading-relaxed">
                1UP Points are the core currency of progression on the platform. They turn your trading activity — paper or real — into XP, tokens, badges, and rewards.
              </p>
              <p className="text-[var(--outline-black)] leading-relaxed">
                Every trade, win, or daily action gives you 1UPs, which can later be converted into real $1UP tokens or used for in-game perks and competitions.
              </p>
              <p className="text-[var(--outline-black)] leading-relaxed font-bold">
                Think of them as Mario coins for traders — the more you collect, the more you unlock.
              </p>
            </div>
          </div>
        </motion.section>

        {/* How to Earn */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6 mb-12"
        >
          <h2 className="font-mario text-3xl text-[var(--outline-black)]">How to Earn 1UP Points</h2>

          <div className="grid gap-4 md:grid-cols-2">
            {earningMethods.map((method, i) => (
              <div key={i} className="mario-card bg-[var(--card)] p-6 border-4 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)]">
                <div className="flex items-start gap-4 mb-3">
                  <div className="text-2xl">{method.icon}</div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-[var(--outline-black)] mb-2">{method.title}</h3>
                    <p className="text-sm text-[var(--outline-black)]">{method.description}</p>
                  </div>
                </div>
                {method.formula && (
                  <div className="bg-[var(--star-yellow)] border-2 border-[var(--outline-black)] rounded-lg p-2 mb-2">
                    <code className="text-xs font-mono font-bold text-[var(--outline-black)]">{method.formula}</code>
                  </div>
                )}
                {method.example && (
                  <p className="text-xs font-semibold text-[var(--outline-black)]">Example: {method.example}</p>
                )}
                {method.tasks && (
                  <ul className="space-y-1 text-sm mt-2">
                    {method.tasks.map((task, j) => (
                      <li key={j} className="flex items-start gap-1 text-[var(--outline-black)]">
                        <span>•</span>
                        <span>{task}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {method.benefits && (
                  <ul className="space-y-1 text-sm mt-2">
                    {method.benefits.map((benefit, j) => (
                      <li key={j} className="flex items-start gap-1 text-[var(--outline-black)]">
                        <span>•</span>
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </motion.section>

        {/* Level Progression */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6 mb-12"
        >
          <h2 className="font-mario text-3xl text-[var(--outline-black)]">Level Progression — "Power-Up Ladder"</h2>

          <div className="mario-card bg-[var(--card)] p-6 border-4 border-[var(--outline-black)] shadow-[6px_6px_0_var(--outline-black)]">
            <p className="text-[var(--outline-black)] mb-4">
              Every trader climbs through 20 Mario-inspired levels, each with unique visuals, perks, and XP requirements.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[var(--star-yellow)]">
                    <th className="border-2 border-[var(--outline-black)] p-2 text-left font-bold text-[var(--outline-black)]">Level</th>
                    <th className="border-2 border-[var(--outline-black)] p-2 text-left font-bold text-[var(--outline-black)]">Title</th>
                    <th className="border-2 border-[var(--outline-black)] p-2 text-left font-bold text-[var(--outline-black)]">XP</th>
                    <th className="border-2 border-[var(--outline-black)] p-2 text-left font-bold text-[var(--outline-black)]">Reward</th>
                  </tr>
                </thead>
                <tbody>
                  {levelData.map((level) => (
                    <tr key={level.level} className="hover:bg-gray-50">
                      <td className="border-2 border-[var(--outline-black)] p-2 font-bold text-[var(--outline-black)]">{level.level}</td>
                      <td className="border-2 border-[var(--outline-black)] p-2 text-[var(--outline-black)]">{level.title}</td>
                      <td className="border-2 border-[var(--outline-black)] p-2 text-[var(--outline-black)]">{level.xp.toLocaleString()}</td>
                      <td className="border-2 border-[var(--outline-black)] p-2 text-[var(--outline-black)]">{level.reward}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.section>

        {/* Redeeming Points */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-6 mb-12"
        >
          <h2 className="font-mario text-3xl text-[var(--outline-black)]">Redeeming Points</h2>

          <div className="mario-card bg-[var(--card)] p-6 border-4 border-[var(--outline-black)] shadow-[6px_6px_0_var(--outline-black)]">
            <p className="text-[var(--outline-black)] mb-4 font-semibold">1UP Points = real utility. You can:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {redemptionOptions.map((option, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border-2 border-[var(--outline-black)]">
                  <span className="text-2xl">{option.icon}</span>
                  <div>
                    <h3 className="font-bold text-[var(--outline-black)] mb-1">{option.option}</h3>
                    <p className="text-sm text-[var(--outline-black)]">{option.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Weekly Rewards */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-6 mb-12"
        >
          <h2 className="font-mario text-3xl text-[var(--outline-black)]">Weekly Rewards System</h2>

          <div className="mario-card bg-[var(--card)] p-6 border-4 border-[var(--outline-black)] shadow-[6px_6px_0_var(--outline-black)]">
            <p className="text-[var(--outline-black)] mb-4">
              Every week, a portion of platform fees (50%) goes into a trader rewards pool.
            </p>
            <div className="space-y-2">
              {weeklyRewards.map((reward, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gradient-to-r from-[var(--star-yellow)] to-[var(--coin-gold)] rounded-lg border-2 border-[var(--outline-black)]">
                  <span className="font-bold text-[var(--outline-black)]">{reward.category}</span>
                  <span className="text-sm text-[var(--outline-black)]">{reward.payout}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Achievements */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="space-y-6 mb-12"
        >
          <h2 className="font-mario text-3xl text-[var(--outline-black)]">Achievement System</h2>

          <div className="mario-card bg-[var(--card)] p-6 border-4 border-[var(--outline-black)] shadow-[6px_6px_0_var(--outline-black)]">
            <p className="text-[var(--outline-black)] mb-4">
              Achievements = hidden challenges that give instant XP, badges, or boosts.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[var(--luigi-green)]">
                    <th className="border-2 border-[var(--outline-black)] p-2 text-left font-bold text-white">Achievement</th>
                    <th className="border-2 border-[var(--outline-black)] p-2 text-left font-bold text-white">Requirement</th>
                    <th className="border-2 border-[var(--outline-black)] p-2 text-left font-bold text-white">Reward</th>
                  </tr>
                </thead>
                <tbody>
                  {achievements.map((ach, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="border-2 border-[var(--outline-black)] p-2 text-[var(--outline-black)]">{ach.achievement}</td>
                      <td className="border-2 border-[var(--outline-black)] p-2 text-[var(--outline-black)]">{ach.requirement}</td>
                      <td className="border-2 border-[var(--outline-black)] p-2 font-semibold text-[var(--outline-black)]">{ach.reward}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.section>

        {/* CTA */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="space-y-6"
        >
          <div className="mario-card bg-gradient-to-br from-[var(--star-yellow)] to-[var(--coin-gold)] p-6 border-4 border-[var(--outline-black)] shadow-[6px_6px_0_var(--outline-black)]">
            <div className="text-center space-y-4">
              <h3 className="text-2xl font-mario text-[var(--outline-black)]">Ready to Start Earning?</h3>
              <p className="text-[var(--outline-black)] font-semibold">
                Every trade is a power-up. Every win brings you closer to the 1UP Drop. 🍄💰
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link href="/warp-pipes">
                  <Button className="mario-btn bg-[var(--mario-red)] text-white border-4 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)] hover:shadow-[2px_2px_0_var(--outline-black)] font-bold px-6 py-3">
                    Start Trading 🚀
                  </Button>
                </Link>
                <Link href="/leaderboard">
                  <Button className="mario-btn bg-[var(--card)] text-[var(--outline-black)] border-4 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)] hover:shadow-[2px_2px_0_var(--outline-black)] font-bold px-6 py-3">
                    View Leaderboard 🏆
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  )
}
