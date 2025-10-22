"use client"

import { EnhancedCard } from "@/components/ui/enhanced-card-system"
import { TrendingUp, Wallet, BarChart3, Trophy, Eye, Star, LineChart, Zap } from "lucide-react"
import { motion } from "framer-motion"
import Image from "next/image"
import { MarioPageHeader } from "@/components/shared/mario-page-header"

const features = [
  {
    icon: TrendingUp,
    iconSrc: "/icons/mario/arrow-up.png",
    title: "Hybrid Trending System",
    description: "Real-time trending tokens from Birdeye and Pump.fun. Stay ahead of the market with live data.",
  },
  {
    icon: Wallet,
    iconSrc: "/icons/mario/money-bag.png",
    title: "Virtual SOL Balance",
    description: "Start with 10 SOL (100 SOL for $UP holders). Trade without losing real money while you level up!",
  },
  {
    icon: Eye,
    iconSrc: "/icons/mario/eyes.png",
    title: "Wallet Tracker",
    description: "Track any Solana wallet's holdings and performance in real-time. Learn from the pros and copy their trades!",
  },
  {
    icon: LineChart,
    iconSrc: "/icons/mario/game.png",
    title: "Portfolio Analytics",
    description: "Advanced portfolio statistics, PnL tracking, win rates, and detailed performance metrics.",
  },
  {
    icon: Star,
    iconSrc: "/icons/mario/star.png",
    title: "XP & Level System",
    description: "Earn XP from every trade! Progress through 20 levels from Goomba to Legendary Luigi. Unlock achievements and titles!",
  },
  {
    icon: BarChart3,
    iconSrc: "/icons/mario/arrow-down.png",
    title: "Real Market Data",
    description: "Practice with live prices and charts. Experience real market conditions without the risk.",
  },
  {
    icon: Trophy,
    iconSrc: "/icons/mario/trophy.png",
    title: "Competitive Leaderboards",
    description: "Compete with traders worldwide! Climb the rankings to earn XP bonuses and show off your trading prowess.",
  },
  {
    icon: Zap,
    iconSrc: "/icons/mario/lightning.png",
    title: "Achievement System",
    description: "Unlock special achievements like Diamond Hands, 10-Bagger, and Portfolio ATH for massive XP rewards!",
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 md:py-32 bg-gradient-to-b from-background via-mario-blue/5 to-background border-t-4 border-b-4 border-mario-yellow/30">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center space-y-4 mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Mario header */}
          <div className="mb-6 max-w-3xl mx-auto">
            <MarioPageHeader
              src="/features-header.png"
              alt="Features"
              width={650}
              height={140}
            />
          </div>

          <h2 className="font-mario text-4xl md:text-5xl font-bold text-balance text-mario-red flex items-center justify-center gap-3" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
            Power-Up Your Trading Skills!
            <Image src="/icons/mario/mushroom.png" alt="" width={40} height={40} className="object-contain inline-block" />
          </h2>
          <p className="text-xl text-foreground max-w-2xl mx-auto leading-relaxed font-bold" style={{ textShadow: '1px 1px 2px rgba(255,255,255,0.8)' }}>
            Professional-grade tools and features to help you level up your Solana trading game!
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05, duration: 0.4 }}
            >
              <div className="mario-card p-6 bg-gradient-to-br from-white/90 to-white/70 border-3 border-mario-yellow/40 hover:border-mario-yellow transition-all duration-300 group h-full hover:shadow-xl hover:-translate-y-1">
                <div className="space-y-4">
                  <div className="group-hover:scale-110 transition-transform duration-300">
                    <Image src={feature.iconSrc} alt="" width={50} height={50} className="object-contain" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-mario text-lg text-mario-red">{feature.title}</h3>
                    <p className="text-sm text-foreground/70 leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
