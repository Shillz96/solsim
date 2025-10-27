"use client"

import React from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * 1UP SOL — Public Roadmap (Mario vibes, clearer “Practice → Go Live → Get Paid” story)
 * Focus: Phase 2 mixes real + paper trading; live fees + creator rewards boost payouts.
 */

const phases = [
  {
    id: "phase1",
    title: "Phase 1 — Practice-to-Earn",
    eta: "Live Now",
    items: [
      "Real-time Solana prices + token trends",
      "Paper trading with full PnL & XP",
      "Mario-style levels, badges, and streaks",
      "Global leaderboards & copy trading",
      "Earn $1UP Points from activity (no risk)"
    ],
    footnote: "Sharpen your skills with virtual SOL and stack $1UP Points as you learn.",
    icon: "🎮",
  },
  {
    id: "phase2",
    title: "Phase 2 — Go Live: Real Rewards",
    eta: "Next Up",
    items: [
      "Trade real SOL (Jupiter-powered) when you’re ready",
      "Keep paper trading anytime—both still earn",
      "Fee-Back Pool: a slice of platform swap fees funds rewards",
      "Creator Rewards: the project’s token incentives boost payouts",
      "Live-trade XP multipliers (paper still earns too)",
      "Early-trader snapshots & special drops"
    ],
    footnote: "Mix paper + live trading. Practice without risk, go live for boosted rewards.",
    icon: "🪙",
  },
  {
    id: "phase3",
    title: "Phase 3 — Power Trader Era",
    eta: "Soon™",
    items: [
      "Claim $1UP airdrop in-app",
      "Mystery boxes, quests, and team events",
      "NFT badges with perk tiers",
      "Seasonal cups & rivalry ladders",
      "Pro analytics for momentum & risk"
    ],
    footnote: "Turn your skills into status, perks, and bigger prize pools.",
    icon: "🌟",
  },
]

// Simple, hype-forward timeline
const timeline = [
  { date: "Now", items: [
    "Practice-to-Earn live: paper trades, XP, leaderboards",
    "$1UP Points accrue from activity & streaks",
    "Wallet tracking and copy trading",
  ]},
  { date: "Phase 2 Launch", items: [
    "Live SOL trading unlocks (Jupiter swaps)",
    "Fee-Back & Creator Rewards boost payouts",
    "XP multipliers for live trades",
  ]},
  { date: "Always On", items: [
    "Regular snapshot events for active users",
    "Continuous polish, new quests, better tools",
  ]},
  { date: "Phase 3", items: [
    "In-app $1UP claim, perk NFTs",
    "Seasonal competitions & governance",
  ]},
]

// Clear, exciting rewards explainer
const airdropPoints = [
  { label: "Practice-to-Earn",  desc: "Paper trades award $1UP Points—perfect for learning with zero risk." },
  { label: "Live Fee-Back",     desc: "When live trading is on, a slice of platform fees powers extra rewards." },
  { label: "Creator Rewards",   desc: "The project’s token incentives add fuel to the prize pool." },
  { label: "Hype Multipliers",  desc: "Tokens with momentum can boost XP/points—ride the meta, earn more." },
  { label: "XP & Levels",       desc: "Level up for persistent multipliers on your earnings." },
  { label: "Consistency Bonus", desc: "Daily streaks = bonus points. Show up, stack up." },
  { label: "Leaderboard Rank",  desc: "Climb ranks to unlock 2×–10× event multipliers during snapshots." },
  { label: "Referral Boost",    desc: "Invite friends—earn a cut of their points as a bonus." },
]

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`mario-card bg-card rounded-2xl border-4 border-outline shadow-[6px_6px_0_var(--outline-black)] ${className}`}>
    {children}
  </div>
)

const Bullet = ({ children }: { children: React.ReactNode }) => (
  <li className="flex items-start gap-2 leading-relaxed">
    <span className="mt-1 text-base">🍄</span>
    <span className="text-outline">{children}</span>
  </li>
)

export default function RoadmapPage() {
  return (
    <div className="min-h-screen bg-background overflow-y-auto">
      <div className="container mx-auto px-4 py-12 max-w-6xl pb-20">
        {/* Back Button */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <Link href="/">
            <Button 
              variant="ghost" 
              className="gap-2 mario-btn bg-card border-3 border-outline hover:shadow-[3px_3px_0_var(--outline-black)]"
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
          className="mb-10 space-y-4"
        >
          <div className="flex items-center justify-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-star border-3 border-outline flex items-center justify-center shadow-[3px_3px_0_var(--outline-black)]">
              <span className="text-2xl">🗺️</span>
            </div>
            <h1 className="font-mario text-4xl md:text-5xl text-outline">
              1UP SOL Roadmap
            </h1>
          </div>
          <p className="mx-auto mt-3 max-w-2xl text-xl text-outline font-semibold text-center">
            Practice with paper. Go live when ready. Earn all the way. 🍄💰
          </p>
        </motion.div>

        {/* Phases */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6 mb-12"
        >
          <h2 className="font-mario text-3xl text-outline">Roadmap Phases</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {phases.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                viewport={{ once: true, amount: 0.2 }}
              >
                <Card className="p-5 h-full">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-2xl">{p.icon}</div>
                    <span className="rounded-full border-2 border-outline px-3 py-1 text-xs font-bold bg-star text-outline">
                      {p.eta}
                    </span>
                  </div>
                  <h3 className="mb-2 text-lg font-extrabold text-outline">{p.title}</h3>
                  <ul className="mb-3 space-y-2 text-sm">
                    {p.items.map((item) => (
                      <Bullet key={item}>{item}</Bullet>
                    ))}
                  </ul>
                  <p className="text-xs font-semibold text-outline opacity-70">{p.footnote}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Meme-Coin Momentum Explainer */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-6 mb-12"
        >
          <h2 className="font-mario text-3xl text-outline">Why This Is Easy (and Fun)</h2>
          <Card className="p-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div>
                <h3 className="mb-2 text-sm font-black uppercase tracking-wide text-outline">Ride the Hype</h3>
                <ul className="space-y-2 text-sm">
                  <Bullet>See trending tokens and momentum at a glance.</Bullet>
                  <Bullet>Practice on the same memes everyone’s watching.</Bullet>
                  <Bullet>Turn hot streaks into points, XP, and rank.</Bullet>
                </ul>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-black uppercase tracking-wide text-outline">Zero-Pressure On-Ramp</h3>
                <ul className="space-y-2 text-sm">
                  <Bullet>Paper first. No risk. Learn fast.</Bullet>
                  <Bullet>Switch to live whenever you feel ready.</Bullet>
                  <Bullet>Paper + live both count toward rewards.</Bullet>
                </ul>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-black uppercase tracking-wide text-outline">Bigger Rewards Over Time</h3>
                <ul className="space-y-2 text-sm">
                  <Bullet>Fee-Back Pool from live swaps juicing payouts.</Bullet>
                  <Bullet>Creator Rewards add extra prize fuel.</Bullet>
                  <Bullet>Leaderboards + snapshots = event pop-offs.</Bullet>
                </ul>
              </div>
            </div>
          </Card>
        </motion.section>

        {/* Rewards & Airdrop */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6 mb-12"
        >
          <h2 className="font-mario text-3xl text-outline">Rewards & Airdrop Details</h2>
          <Card className="p-6">
            <div className="mb-4 flex items-center gap-3">
              <span className="text-2xl">💎</span>
              <h3 className="text-xl font-extrabold text-outline">$1UP Rewards: How You Get Paid</h3>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-black uppercase tracking-wide text-outline">What Counts</h3>
                <ul className="space-y-2 text-sm">
                  {airdropPoints.map((pt) => (
                    <Bullet key={pt.label}>
                      <span className="font-semibold">{pt.label}:</span> {pt.desc}
                    </Bullet>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-black uppercase tracking-wide text-outline">Development Timeline</h3>
                <ul className="space-y-2 text-sm">
                  {timeline.map((t) => (
                    <Bullet key={t.date}>
                      <span className="font-semibold">{t.date}:</span>&nbsp;
                      <span>{t.items.join(" · ")}</span>
                    </Bullet>
                  ))}
                </ul>
              </div>
            </div>
            <div className="mt-4 rounded-xl border-2 border-outline bg-luigi px-4 py-3 text-sm font-semibold text-outline">
              Start earning now! Paper or live—every trade stacks $1UP Points. When live trading launches, the Fee-Back Pool and Creator Rewards kick rewards up a level. 🚀
            </div>
          </Card>
        </motion.section>

        {/* CTA */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          <Card className="mt-8 bg-gradient-to-br from-[var(--mario-red)] via-[var(--star-yellow)] to-[var(--luigi-green)] p-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <h3 className="text-xl font-extrabold text-outline">Trade. Level Up. Get Paid.</h3>
              <p className="text-sm text-outline opacity-80 font-semibold">
                Practice safely, switch to live when ready, and let hype + skill multiply your rewards.
              </p>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
                <Link href="/warp-pipes">
                  <Button
                    className="inline-flex items-center justify-center rounded-xl border-[3px] border-outline bg-star px-4 py-2 text-sm font-black shadow-[4px_4px_0_var(--outline-black)] transition-transform active:translate-y-0.5 hover:bg-coin text-outline"
                  >
                    Start Trading 🚀
                  </Button>
                </Link>
                <Link href="/rewards">
                  <Button
                    className="inline-flex items-center justify-center rounded-xl border-[3px] border-outline bg-card px-4 py-2 text-sm font-black shadow-[4px_4px_0_var(--outline-black)] transition-transform active:translate-y-0.5 hover:bg-muted text-outline"
                  >
                    View Rewards Dashboard 💰
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </motion.section>
      </div>
    </div>
  )
}
