"use client"

import { EnhancedCard } from "@/components/ui/enhanced-card-system"
import { Star, Zap, Trophy, Target, TrendingUp, Award } from "lucide-react"
import { motion } from "framer-motion"
import { MarioPageHeader } from "@/components/shared/mario-page-header"

const levelUpFeatures = [
  {
    icon: TrendingUp,
    iconSrc: "/icons/mario/arrow-up.png",
    title: "Trade to Earn XP",
    description: "Every trade earns you XP! Bigger trades = more XP. Profitable trades earn bonus XP multipliers.",
  },
  {
    icon: Star,
    iconSrc: "/icons/mario/star.png",
    title: "20 Unique Levels",
    description: "Progress from Goomba Trader to Legendary Luigi! Each level unlocks new titles and achievements.",
  },
  {
    icon: Zap,
    iconSrc: "/icons/mario/lightning.png",
    title: "Achievement Bonuses",
    description: "Unlock special achievements for 10x trades, Diamond Hands, portfolio ATHs, and more. Each worth massive XP!",
  },
  {
    icon: Trophy,
    iconSrc: "/icons/mario/trophy.png",
    title: "Leaderboard Rankings",
    description: "Top traders earn XP bonuses! Reach Top 100, Top 10, or #1 for huge XP rewards and bragging rights.",
  },
]

const levelExamples = [
  { level: 1, title: "Goomba Trader", iconSrc: "/icons/mario/mushroom.png", xp: "0 XP", color: "text-[var(--brick-brown)]" },
  { level: 5, title: "Super Trader", iconSrc: "/icons/mario/star.png", xp: "1,000 XP", color: "text-[var(--star-yellow)]" },
  { level: 10, title: "Wing Cap", iconSrc: "/icons/mario/play.png", xp: "20,000 XP", color: "text-[var(--super-blue)]" },
  { level: 20, title: "Legendary Luigi", iconSrc: "/icons/mario/fire.png", xp: "570,000 XP", color: "text-[var(--luigi-green)]" },
]

export function LevelUpSection() {
  return (
    <section className="py-20 md:py-32 bg-gradient-to-b from-mario-blue/20 via-mario-red/10 to-mario-yellow/20 border-t-4 border-mario-yellow">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center space-y-4 mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[var(--mario-yellow)]/20 to-[var(--mario-orange)]/20 border-2 border-[var(--mario-yellow)]/50 mb-4">
            <Star className="h-5 w-5 text-[var(--mario-yellow)] animate-pulse" />
            <span className="text-sm font-bold text-foreground">Level Up System</span>
          </div>

          {/* Mario header */}
          <div className="mb-6 max-w-3xl mx-auto">
            <MarioPageHeader
              src="/level-up-header.svg"
              alt="Level Up"
              width={700}
              height={150}
            />
          </div>

          <h2 className="font-mario text-4xl md:text-5xl font-bold text-balance text-[var(--mario-red)] flex items-center justify-center gap-3" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
            Level Up Your Trading Game!
            <img src="/icons/mario/controller.png" alt="" className="w-10 h-10 object-contain inline-block" />
          </h2>
          <p className="text-xl text-foreground max-w-2xl mx-auto leading-relaxed font-bold" style={{ textShadow: '1px 1px 2px rgba(255,255,255,0.8)' }}>
            Earn XP with every trade, unlock achievements, and climb through 20 epic levels - from Goomba to Legendary!
          </p>
        </motion.div>

        {/* XP earning methods */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-12">
          {levelUpFeatures.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
            >
              <div className="mario-card p-6 bg-gradient-to-br from-white/90 to-white/70 border-4 border-[var(--mario-yellow)]/50 hover:border-[var(--mario-yellow)] transition-all duration-300 group h-full hover:shadow-xl hover:-translate-y-1">
                <div className="space-y-4">
                  <div className="mb-2 group-hover:scale-110 transition-transform duration-300">
                    <img src={feature.iconSrc} alt="" className="w-12 h-12 object-contain" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-mario text-xl text-[var(--mario-red)]">{feature.title}</h3>
                    <p className="text-base text-foreground/70 leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Level examples */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mb-12"
        >
          <div className="max-w-5xl mx-auto">
            <h3 className="font-mario text-3xl text-center text-[var(--mario-red)] mb-8 flex items-center justify-center gap-3" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
            Level Progression
            <img src="/icons/mario/star.png" alt="" className="w-8 h-8 object-contain inline-block" />
          </h3>
            <div className="grid gap-4 md:grid-cols-4">
              {levelExamples.map((example, index) => (
                <motion.div
                  key={example.level}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.4 }}
                  className="mario-card bg-gradient-to-br from-[var(--star-yellow)]/90 to-[var(--coin-gold)]/80 border-4 border-[var(--outline-black)] p-5 text-center hover:scale-105 transition-transform shadow-xl"
                >
                  <div className="mb-3">
                    <img src={example.iconSrc} alt="" className="w-12 h-12 object-contain mx-auto" />
                  </div>
                  <div className="font-mario text-xl text-[var(--outline-black)] mb-2" style={{ textShadow: '1px 1px 3px rgba(255,255,255,0.8)' }}>
                    LEVEL {example.level}
                  </div>
                  <div className="text-sm font-bold text-[var(--outline-black)] mb-2 leading-tight px-1 uppercase" style={{ textShadow: '1px 1px 2px rgba(255,255,255,0.8)' }}>
                    {example.title}
                  </div>
                  <div className="text-xs font-bold text-[var(--outline-black)]" style={{ textShadow: '1px 1px 2px rgba(255,255,255,0.8)' }}>
                    {example.xp}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* How it works explanation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <div className="max-w-4xl mx-auto mario-card p-8 bg-gradient-to-br from-[var(--mario-yellow)]/10 via-[var(--mario-orange)]/10 to-[var(--mario-red)]/10 border-4 border-[var(--mario-yellow)]/60">
            <div className="text-center space-y-4">
              <div className="mb-4">
                <img src="/icons/mario/controller.png" alt="" className="w-16 h-16 object-contain mx-auto" />
              </div>
              <h3 className="font-mario text-2xl md:text-3xl text-[var(--mario-red)]">
                How to Level Up
              </h3>
              <div className="space-y-3 text-base md:text-lg text-foreground/80 max-w-2xl mx-auto">
                <p>
                  <span className="font-bold text-[var(--mario-red)]">1. Trade to Earn XP:</span> Every trade earns base XP + volume bonuses. Profitable trades earn 2x XP multipliers!
                </p>
                <p>
                  <span className="font-bold text-[var(--super-blue)]">2. Unlock Achievements:</span> Hit milestones like "10-Bagger" (10x return) or "Diamond Hands" (hold for 7+ days) for massive XP bonuses!
                </p>
                <p>
                  <span className="font-bold text-[var(--luigi-green)]">3. Dominate the Leaderboard:</span> Reach Top 100 for +200 XP, Top 10 for +1,500 XP, or #1 for a whopping +5,000 XP!
                </p>
                <p className="pt-4 border-t-2 border-[var(--mario-yellow)]/50">
                  <span className="font-mario text-xl text-[var(--star-yellow)] flex items-center justify-center gap-2" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.6)' }}>
                    <img src="/icons/mario/mushroom.png" alt="" className="w-6 h-6 object-contain inline-block" />
                    From Goomba to Legend - Start Your Journey Today!
                    <img src="/icons/mario/trophy.png" alt="" className="w-6 h-6 object-contain inline-block" />
                  </span>
                </p>
              </div>

              {/* CTA button */}
              <div className="pt-4">
                <a href="/trade">
                  <button className="mario-btn mario-btn-lg bg-[var(--luigi-green)] hover:bg-[var(--luigi-green)]/90 text-white">
                    <span className="flex items-center justify-center gap-2">
                      Start Earning XP Now!
                      <img src="/icons/mario/controller.png" alt="" className="w-5 h-5 object-contain inline-block" />
                    </span>
                  </button>
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
