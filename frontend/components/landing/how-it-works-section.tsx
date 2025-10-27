"use client"

import { UserPlus, Search, TrendingUp, BarChart2, Star } from "lucide-react"
import { MarioPageHeader } from "@/components/shared/mario-page-header"
import { motion } from "framer-motion"
import Image from "next/image"

const steps = [
  {
    icon: UserPlus,
    iconSrc: "/icons/mario/checkered-flag.png",
    title: "Sign up & start",
    description: "Create your account and get 10 SOL virtual balance instantly (100 SOL for $UP holders). No wallet connection required!",
  },
  {
    icon: Search,
    iconSrc: "/icons/mario/magnifying-glass.png",
    title: "Discover tokens",
    description: "Explore Warp Pipes for real-time token discovery, trending tokens, and track successful wallets to find winning plays.",
  },
  {
    icon: TrendingUp,
    iconSrc: "/icons/mario/arrow-up.png",
    title: "Practice trading",
    description: "Start trading with virtual SOL risk-free. Perfect your strategies and learn the market without any financial risk!",
  },
  {
    icon: Star,
    iconSrc: "/icons/mario/star.png",
    title: "Earn XP & level up",
    description: "Every trade earns XP! Progress through 20 levels, unlock achievements, and earn exclusive titles!",
  },
  {
    icon: BarChart2,
    iconSrc: "/icons/mario/trophy.png",
    title: "Track & compete",
    description: "Monitor your portfolio analytics, climb the leaderboard, and become a trading legend!",
  },
]

export function HowItWorksSection() {
  // Solid Mario-themed icon backgrounds using theme tokens
  const iconColors = [
    'bg-mario',      // 1. Sign up - Red
    'bg-sky',       // 2. Explore - Blue
    'bg-luigi',    // 3. Trade - Green
    'bg-star',    // 4. Level up - Yellow
    'bg-coin',      // 5. Compete - Gold
  ]

  return (
    <section className="py-20 md:py-32 bg-background border-t-4 border-outline/20">
      <div className="container mx-auto px-4">
        <div className="text-center space-y-4 mb-16">
          {/* Mario header */}
          <div className="mb-6 max-w-3xl mx-auto">
            <MarioPageHeader
              src="/how-it-works-header.svg"
              alt="How It Works"
              width={800}
              height={140}
            />
          </div>

          <h2 className="font-mario text-4xl md:text-5xl font-bold text-mario flex items-center justify-center gap-3" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
            How to Play the Game
            <Image src="/icons/mario/controller.png" alt="" width={40} height={40} className="object-contain inline-block" />
          </h2>
          <p className="text-xl text-foreground max-w-2xl mx-auto font-bold" style={{ textShadow: '1px 1px 2px rgba(255,255,255,0.8)' }}>
            Start trading, leveling up, and earning in minutes. No wallet connection required!
          </p>
        </div>

        <div className="relative">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5 relative">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className="relative"
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  {/* Step icon */}
                  <div className="relative">
                    <div className={`h-20 w-20 rounded-lg ${iconColors[index]} border-4 border-outline flex items-center justify-center hover:scale-110 transition-all shadow-[6px_6px_0_var(--outline-black)]`}>
                      <Image src={step.iconSrc} alt="" width={40} height={40} className="object-contain" />
                    </div>
                    <div className="absolute -top-2 -right-2 h-10 w-10 rounded-full bg-outline text-white border-4 border-mario flex items-center justify-center text-lg font-mario font-bold shadow-[4px_4px_0_rgba(0,0,0,0.4)]">
                      {index + 1}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-mario text-xl text-mario font-bold" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.2)' }}>{step.title}</h3>
                    <p className="text-base text-foreground font-semibold leading-relaxed max-w-xs">{step.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
