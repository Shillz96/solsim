"use client"

import React from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * 1UP SOL — Public Roadmap Section (Mario vibes)
 * Matches the Mario theme design system with bold borders, chunky shadows, vibrant palette.
 */

const phases = [
  {
    id: "phase1",
    title: "Phase 1 — The Game Begins",
    eta: "Live Now",
    items: [
      "Real-time Solana prices",
      "Paper trading with full PnL",
      "Mario-style levels & badges",
      "Global leaderboards + daily rewards"
    ],
    footnote: "Build skills before real trading unlocks.",
    icon: "🎮",
  },
  {
    id: "phase2",
    title: "Phase 2 — The 1UP Revolution",
    eta: "Week 1–2",
    items: [
      "Real SOL trading (Jupiter-powered)",
      "1UP Points → Tokenized rewards",
      "Airdrop snapshots for early players",
      "Weekly competitions + social leaderboards",
    ],
    footnote: "Every trade counts toward your airdrop.",
    icon: "🪙",
  },
  {
    id: "phase3",
    title: "Phase 3 — Power Trader Era",
    eta: "Week 3+",
    items: [
      "Claim 1UP Airdrop #1 in-app",
      "Mystery boxes & trader missions",
      "NFT badges with perks",
      "Seasonal leaderboards & team battles",
    ],
    footnote: "The most fun, rewarding trading on Solana.",
    icon: "🌟",
  },
]

const timeline = [
  { date: "Week 1", items: [
    "Real trading goes live (Jupiter)",
    "Dual Mode: Paper ↔ Real",
    "Safety: slippage & scam filters",
    "XP multiplier for early testers (2×)",
  ]},
  { date: "End of Week 1", items: [
    "Airdrop Snapshot #1 (activity, volume, XP)",
  ]},
  { date: "Mid Week 2", items: [
    "Airdrop Dashboard opens (live estimate)",
  ]},
  { date: "End of Week 2", items: [
    "Airdrop Snapshot #2 (finalize eligibility)",
  ]},
  { date: "Week 3", items: [
    "Airdrop #1 claim in-app (Phantom/Solflare)",
    "Trading rewards pool goes live (50% fees → traders)",
  ]},
]

const airdropPoints = [
  { label: "Volume Bonus", desc: "+1 token / $100 volume (example rate for launch)" },
  { label: "Profit Bonus", desc: "Up to +20% multiplier for profitable traders" },
  { label: "Early Adopter", desc: "+50 tokens / active day during launch window" },
  { label: "Rank Bonus", desc: "2×–10× multipliers based on leaderboard finish" },
  { label: "Referral Bonus", desc: "+10% of referred trader's earned score" },
]

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`mario-card bg-white rounded-2xl border-4 border-[var(--outline-black)] shadow-[6px_6px_0_var(--outline-black)] ${className}`}>
    {children}
  </div>
)

const Bullet = ({ children }: { children: React.ReactNode }) => (
  <li className="flex items-start gap-2 leading-relaxed">
    <span className="mt-1 text-base">🍄</span>
    <span className="text-[var(--outline-black)]">{children}</span>
  </li>
)

export default function RoadmapPage() {
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
          className="mb-10 space-y-4"
        >
          <div className="flex items-center justify-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-[var(--star-yellow)] border-3 border-[var(--outline-black)] flex items-center justify-center shadow-[3px_3px_0_var(--outline-black)]">
              <span className="text-2xl">🗺️</span>
            </div>
            <h1 className="font-mario text-4xl md:text-5xl text-[var(--outline-black)]">
              1UP SOL Roadmap
            </h1>
          </div>
          <p className="mx-auto mt-3 max-w-2xl text-xl text-[var(--outline-black)] font-semibold text-center">
            From paper trades to real rewards — every trade is a power‑up. 🍄💰
          </p>
        </motion.div>

        {/* Phases */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6 mb-12"
        >
          <h2 className="font-mario text-3xl text-[var(--outline-black)]">Roadmap Phases</h2>
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
                  <span className="rounded-full border-2 border-[var(--outline-black)] px-3 py-1 text-xs font-bold bg-[var(--star-yellow)] text-[var(--outline-black)]">
                    {p.eta}
                  </span>
                </div>
                <h3 className="mb-2 text-lg font-extrabold text-[var(--outline-black)]">{p.title}</h3>
                <ul className="mb-3 space-y-2 text-sm">
                  {p.items.map((item) => (
                    <Bullet key={item}>{item}</Bullet>
                  ))}
                </ul>
                <p className="text-xs font-semibold text-[var(--outline-black)] opacity-70">{p.footnote}</p>
              </Card>
            </motion.div>
          ))}
          </div>
        </motion.section>

        {/* Airdrop Explainer */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6 mb-12"
        >
          <h2 className="font-mario text-3xl text-[var(--outline-black)]">Airdrop Details</h2>
          <Card className="p-6">
            <div className="mb-4 flex items-center gap-3">
              <span className="text-2xl">💎</span>
              <h3 className="text-xl font-extrabold text-[var(--outline-black)]">Airdrop — How It Works (2–3 weeks)</h3>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-black uppercase tracking-wide text-[var(--outline-black)]">Scoring (public‑friendly)</h3>
                <ul className="space-y-2 text-sm">
                  {airdropPoints.map((pt) => (
                    <Bullet key={pt.label}>
                      <span className="font-semibold">{pt.label}:</span> {pt.desc}
                    </Bullet>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-black uppercase tracking-wide text-[var(--outline-black)]">Timeline</h3>
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
            <div className="mt-4 rounded-xl border-2 border-[var(--outline-black)] bg-[var(--luigi-green)] px-4 py-3 text-sm font-semibold text-[var(--outline-black)]">
              TL;DR: Trade now, stay active for both snapshots, then claim your 1UP in Week 3. 🚀
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
              <h3 className="text-xl font-extrabold text-[var(--outline-black)]">Trade. Level Up. Get Paid.</h3>
              <p className="text-sm text-[var(--outline-black)] opacity-80 font-semibold">
                Every trade is a power‑up. Your XP and 1UP Points flow straight into the airdrop.
              </p>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
                <Link href="/trade">
                  <Button
                    className="inline-flex items-center justify-center rounded-xl border-[3px] border-[var(--outline-black)] bg-[var(--star-yellow)] px-4 py-2 text-sm font-black shadow-[4px_4px_0_var(--outline-black)] transition-transform active:translate-y-0.5 hover:bg-[var(--coin-yellow)] text-[var(--outline-black)]"
                  >
                    Start Trading 🚀
                  </Button>
                </Link>
                <Link href="/rewards">
                  <Button
                    className="inline-flex items-center justify-center rounded-xl border-[3px] border-[var(--outline-black)] bg-white px-4 py-2 text-sm font-black shadow-[4px_4px_0_var(--outline-black)] transition-transform active:translate-y-0.5 hover:bg-gray-100 text-[var(--outline-black)]"
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
