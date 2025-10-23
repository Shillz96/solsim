"use client"

import React from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * 1UP SOL — Rewards & Points System (Mario Theme)
 * Complete redesign matching the roadmap page styling
 */

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-2xl border-[4px] border-[var(--outline-black)] bg-white shadow-[6px_6px_0_var(--outline-black)] ${className}`}>
    {children}
  </div>
)

const Bullet = ({ children }: { children: React.ReactNode }) => (
  <li className="flex items-start gap-2 leading-relaxed">
    <span className="mt-1 text-base">🍄</span>
    <span className="text-[var(--outline-black)]">{children}</span>
  </li>
)

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
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link href="/">
            <Button 
              variant="ghost" 
              className="gap-2 mario-btn bg-white border-3 border-[var(--outline-black)] hover:shadow-[3px_3px_0_var(--outline-black)]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10 text-center"
        >
          <div className="inline-block mb-4 text-5xl">🪙</div>
          <h1 className="font-mario text-3xl sm:text-4xl md:text-5xl tracking-tight text-[var(--outline-black)] font-black mb-3">
            1UP Points & Rewards System
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-xl sm:text-2xl text-[var(--outline-black)] font-bold">
            "Trade. Level Up. Get Paid."
          </p>
        </motion.div>

        {/* What Are 1UP Points */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🍄</span>
              <h2 className="text-2xl font-extrabold text-[var(--outline-black)]">What Are 1UP Points?</h2>
            </div>
            <div className="space-y-3 text-[var(--outline-black)]">
              <p className="text-base leading-relaxed">
                1UP Points are the core currency of progression on the platform. They turn your trading activity — paper or real — into XP, tokens, badges, and rewards.
              </p>
              <p className="text-base leading-relaxed">
                Every trade, win, or daily action gives you 1UPs, which can later be converted into real $1UP tokens or used for in-game perks and competitions.
              </p>
              <p className="text-base leading-relaxed font-bold">
                Think of them as Mario coins for traders — the more you collect, the more you unlock.
              </p>
            </div>
          </Card>
        </motion.div>

        {/* How to Earn 1UP Points */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, delay: 0.05 }}
        >
          <Card className="p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🎯</span>
              <h2 className="text-2xl font-extrabold text-[var(--outline-black)]">How to Earn 1UP Points</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {earningMethods.map((method, i) => (
                <Card key={i} className="p-4 bg-gradient-to-br from-white to-gray-50">
                  <div className="flex items-start gap-3 mb-2">
                    <span className="text-2xl">{method.icon}</span>
                    <h3 className="text-lg font-bold text-[var(--outline-black)]">{method.title}</h3>
                  </div>
                  <p className="text-sm text-[var(--outline-black)] opacity-80 mb-3">{method.description}</p>
                  {method.formula && (
                    <div className="bg-[var(--star-yellow)] border-2 border-[var(--outline-black)] rounded-lg p-2 mb-2">
                      <code className="text-xs font-mono font-bold text-[var(--outline-black)]">{method.formula}</code>
                    </div>
                  )}
                  {method.example && (
                    <p className="text-xs font-semibold text-[var(--outline-black)]">Example: {method.example}</p>
                  )}
                  {method.tasks && (
                    <ul className="space-y-1 text-sm">
                      {method.tasks.map((task, j) => (
                        <li key={j} className="flex items-start gap-1 text-[var(--outline-black)]">
                          <span>•</span>
                          <span>{task}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {method.benefits && (
                    <ul className="space-y-1 text-sm">
                      {method.benefits.map((benefit, j) => (
                        <li key={j} className="flex items-start gap-1 text-[var(--outline-black)]">
                          <span>•</span>
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Level Progression */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🎮</span>
              <h2 className="text-2xl font-extrabold text-[var(--outline-black)]">Level Progression — "Power-Up Ladder"</h2>
            </div>
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
          </Card>
        </motion.div>

        {/* Redeeming Points */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <Card className="p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">💰</span>
              <h2 className="text-2xl font-extrabold text-[var(--outline-black)]">Redeeming Points</h2>
            </div>
            <p className="text-[var(--outline-black)] mb-4 font-semibold">1UP Points = real utility. You can:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {redemptionOptions.map((option, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-gradient-to-br from-white to-gray-50 rounded-lg border-2 border-[var(--outline-black)]">
                  <span className="text-2xl">{option.icon}</span>
                  <div>
                    <h3 className="font-bold text-[var(--outline-black)] mb-1">{option.option}</h3>
                    <p className="text-sm text-[var(--outline-black)] opacity-80">{option.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Weekly Rewards */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">📊</span>
              <h2 className="text-2xl font-extrabold text-[var(--outline-black)]">Weekly Rewards System</h2>
            </div>
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
            <p className="text-sm text-[var(--outline-black)] mt-4 font-semibold">
              You'll be able to see your weekly stats and claimable rewards in the Rewards Dashboard.
            </p>
          </Card>
        </motion.div>

        {/* Achievement System */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, delay: 0.25 }}
        >
          <Card className="p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">💎</span>
              <h2 className="text-2xl font-extrabold text-[var(--outline-black)]">Achievement System</h2>
            </div>
            <p className="text-[var(--outline-black)] mb-4">
              Achievements = hidden challenges that give instant XP, badges, or boosts.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[var(--luigi-green)]">
                    <th className="border-2 border-[var(--outline-black)] p-2 text-left font-bold text-[var(--outline-black)]">Achievement</th>
                    <th className="border-2 border-[var(--outline-black)] p-2 text-left font-bold text-[var(--outline-black)]">Requirement</th>
                    <th className="border-2 border-[var(--outline-black)] p-2 text-left font-bold text-[var(--outline-black)]">Reward</th>
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
          </Card>
        </motion.div>

        {/* Airdrop Connection */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="p-6 mb-8 bg-gradient-to-br from-[var(--mario-red)] via-[var(--star-yellow)] to-[var(--luigi-green)]">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🪙</span>
              <h2 className="text-2xl font-extrabold text-[var(--outline-black)]">The Airdrop Connection</h2>
            </div>
            <p className="text-[var(--outline-black)] mb-4 font-semibold">
              All your XP, volume, and 1UP Points feed directly into your airdrop eligibility.
            </p>
            <div className="bg-white border-2 border-[var(--outline-black)] rounded-lg p-4 mb-4">
              <h3 className="font-bold text-[var(--outline-black)] mb-2">🧾 Airdrop Formula</h3>
              <code className="block text-sm font-mono text-[var(--outline-black)] whitespace-pre-wrap">
{`Base = 1000 tokens
+ (Total Volume / 100) 
+ (Profit × 0.5)
+ (Days Active × 50)
+ (Leaderboard Rank Bonus)`}
              </code>
            </div>
            <ul className="space-y-2 text-sm">
              <Bullet>Week 1: Volume & XP tracking begins</Bullet>
              <Bullet>Week 2: Dashboard opens — see your estimated drop</Bullet>
              <Bullet>Week 3: 1UP Airdrop #1 goes live</Bullet>
            </ul>
          </Card>
        </motion.div>

        {/* Long-Term Vision */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, delay: 0.35 }}
        >
          <Card className="p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🧩</span>
              <h2 className="text-2xl font-extrabold text-[var(--outline-black)]">Long-Term Rewards Vision</h2>
            </div>
            <ul className="space-y-2 text-base">
              <Bullet><strong>NFT Badges</strong> – mintable proof of achievements</Bullet>
              <Bullet><strong>1UP Marketplace</strong> – trade points, boosts, and badges</Bullet>
              <Bullet><strong>Seasonal Leagues</strong> – monthly resets with massive prize pools</Bullet>
              <Bullet><strong>Team Battles</strong> – squads compete for collective 1UP earnings</Bullet>
              <Bullet><strong>Power-Up Events</strong> – random limited boosts and lootboxes</Bullet>
            </ul>
          </Card>
        </motion.div>

        {/* TL;DR Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Card className="p-6 bg-gradient-to-br from-white to-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">✨</span>
              <h2 className="text-2xl font-extrabold text-[var(--outline-black)]">TL;DR</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-start gap-2">
                <span className="font-bold text-[var(--outline-black)]">Trade any token →</span>
                <span className="text-[var(--outline-black)]">Earn 1UP Points</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-[var(--outline-black)]">Make profits →</span>
                <span className="text-[var(--outline-black)]">Earn bonus XP</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-[var(--outline-black)]">Invite friends →</span>
                <span className="text-[var(--outline-black)]">Get 10% of their earnings</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-[var(--outline-black)]">Climb ranks →</span>
                <span className="text-[var(--outline-black)]">Unlock perks & fee rebates</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-[var(--outline-black)]">Stay active →</span>
                <span className="text-[var(--outline-black)]">Qualify for airdrops</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-[var(--outline-black)]">Dominate leaderboard →</span>
                <span className="text-[var(--outline-black)]">Win weekly prize pools</span>
              </div>
            </div>
            <div className="mt-6 text-center">
              <p className="text-xl font-black text-[var(--outline-black)] mb-4">
                Every trade is a power-up. Every win brings you closer to the 1UP Drop.
              </p>
              <p className="text-lg font-bold text-[var(--outline-black)]">
                Start trading. Start leveling. Get rewarded. 🍄💰
              </p>
            </div>
          </Card>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, delay: 0.45 }}
        >
          <Card className="mt-8 bg-gradient-to-br from-[var(--star-yellow)] to-[var(--coin-gold)] p-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <h3 className="text-2xl font-extrabold text-[var(--outline-black)]">Ready to Start Earning?</h3>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
                <Link href="/trade">
                  <Button
                    className="inline-flex items-center justify-center rounded-xl border-[3px] border-[var(--outline-black)] bg-[var(--mario-red)] px-6 py-3 text-base font-black shadow-[4px_4px_0_var(--outline-black)] transition-transform active:translate-y-0.5 hover:bg-red-600 text-white"
                  >
                    Start Trading Now 🚀
                  </Button>
                </Link>
                <Link href="/leaderboard">
                  <Button
                    className="inline-flex items-center justify-center rounded-xl border-[3px] border-[var(--outline-black)] bg-white px-6 py-3 text-base font-black shadow-[4px_4px_0_var(--outline-black)] transition-transform active:translate-y-0.5 hover:bg-gray-100 text-[var(--outline-black)]"
                  >
                    View Leaderboard 🏆
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}