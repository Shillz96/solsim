"use client"

import { EnhancedCard } from "@/components/ui/enhanced-card-system"
import { Star, Zap, Trophy, Target, TrendingUp, Award } from "lucide-react"
import { motion } from "framer-motion"
import { MarioPageHeader } from "@/components/shared/mario-page-header"

const levelUpFeatures = [
  {
    icon: TrendingUp,
    emoji: "📈",
    title: "Trade to Earn XP",
    description: "Every trade earns you XP! Bigger trades = more XP. Profitable trades earn bonus XP multipliers.",
  },
  {
    icon: Star,
    emoji: "⭐",
    title: "20 Unique Levels",
    description: "Progress from Goomba Trader to Legendary Luigi! Each level unlocks new titles and achievements.",
  },
  {
    icon: Zap,
    emoji: "⚡",
    title: "Achievement Bonuses",
    description: "Unlock special achievements for 10x trades, Diamond Hands, portfolio ATHs, and more. Each worth massive XP!",
  },
  {
    icon: Trophy,
    emoji: "🏆",
    title: "Leaderboard Rankings",
    description: "Top traders earn XP bonuses! Reach Top 100, Top 10, or #1 for huge XP rewards and bragging rights.",
  },
]

const levelExamples = [
  { level: 1, title: "Goomba Trader", icon: "🍄", xp: "0 XP", color: "text-mario-brown" },
  { level: 5, title: "Super Trader", icon: "⭐", xp: "1,000 XP", color: "text-mario-yellow" },
  { level: 10, title: "Wing Cap", icon: "🦅", xp: "20,000 XP", color: "text-mario-blue" },
  { level: 20, title: "Legendary Luigi", icon: "💚🔥", xp: "570,000 XP", color: "text-mario-green" },
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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-mario-yellow/20 to-mario-orange/20 border-2 border-mario-yellow/50 mb-4">
            <Star className="h-5 w-5 text-mario-yellow animate-pulse" />
            <span className="text-sm font-bold text-foreground">Level Up System</span>
          </div>

          {/* Mario header */}
          <div className="mb-6 max-w-3xl mx-auto">
            <MarioPageHeader
              src="/level-up-header.png"
              alt="Level Up"
              width={700}
              height={150}
            />
          </div>

          <h2 className="font-mario text-4xl md:text-5xl font-bold text-balance text-mario-red" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
            Level Up Your Trading Game! 🎮
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
              <div className="mario-card p-6 bg-gradient-to-br from-white/90 to-white/70 border-4 border-mario-yellow/50 hover:border-mario-yellow transition-all duration-300 group h-full hover:shadow-xl hover:-translate-y-1">
                <div className="space-y-4">
                  <div className="text-5xl mb-2 group-hover:scale-110 transition-transform duration-300">
                    {feature.emoji}
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-mario text-xl text-mario-red">{feature.title}</h3>
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
            <h3 className="font-mario text-3xl text-center text-mario-red mb-8">Level Progression 🌟</h3>
            <div className="grid gap-4 md:grid-cols-4">
              {levelExamples.map((example, index) => (
                <motion.div
                  key={example.level}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.4 }}
                  className="mario-badge bg-gradient-to-br from-mario-yellow/30 to-mario-orange/30 border-3 border-mario-yellow/80 p-5 text-center hover:scale-105 transition-transform shadow-lg"
                >
                  <div className="text-5xl mb-3">{example.icon}</div>
                  <div className="font-mario text-xl text-mario-red mb-2" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}>
                    Level {example.level}
                  </div>
                  <div className="text-sm font-bold text-foreground mb-2 leading-tight px-1" style={{ textShadow: '1px 1px 2px rgba(255,255,255,0.5)' }}>
                    {example.title}
                  </div>
                  <div className={`text-xs font-bold ${example.color}`} style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}>
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
          <div className="max-w-4xl mx-auto mario-card p-8 bg-gradient-to-br from-mario-yellow/10 via-mario-orange/10 to-mario-red/10 border-4 border-mario-yellow/60">
            <div className="text-center space-y-4">
              <div className="text-7xl mb-4">🎮</div>
              <h3 className="font-mario text-2xl md:text-3xl text-mario-red">
                How to Level Up
              </h3>
              <div className="space-y-3 text-base md:text-lg text-foreground/80 max-w-2xl mx-auto">
                <p>
                  <span className="font-bold text-mario-red">1. Trade to Earn XP:</span> Every trade earns base XP + volume bonuses. Profitable trades earn 2x XP multipliers!
                </p>
                <p>
                  <span className="font-bold text-mario-blue">2. Unlock Achievements:</span> Hit milestones like "10-Bagger" (10x return) or "Diamond Hands" (hold for 7+ days) for massive XP bonuses!
                </p>
                <p>
                  <span className="font-bold text-mario-green">3. Dominate the Leaderboard:</span> Reach Top 100 for +200 XP, Top 10 for +1,500 XP, or #1 for a whopping +5,000 XP!
                </p>
                <p className="pt-4 border-t-2 border-mario-yellow/50">
                  <span className="font-mario text-xl text-mario-yellow text-shadow-sm">
                    🍄 From Goomba to Legend - Start Your Journey Today! 🏆
                  </span>
                </p>
              </div>

              {/* CTA button */}
              <div className="pt-4">
                <a href="/trade">
                  <button className="mario-btn mario-btn-lg bg-mario-green hover:bg-mario-green/90 text-white">
                    Start Earning XP Now! 🎮
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
