"use client"

import { EnhancedCard } from "@/components/ui/enhanced-card-system"
import { TrendingUp, Wallet, BarChart3, Trophy } from "lucide-react"
import { motion } from "framer-motion"

const features = [
  {
    icon: TrendingUp,
    title: "Hybrid Trending System",
    description: "Real-time trending tokens from Birdeye and Pump.fun. Stay ahead of the market with live data.",
  },
  {
    icon: Wallet,
    title: "Virtual SOL Balance",
    description: "Start with 100 SOL virtual balance. Trade without losing real money while you learn.",
  },
  {
    icon: BarChart3,
    title: "Real Market Data",
    description: "Practice with live prices and charts. Experience real market conditions without the risk.",
  },
  {
    icon: Trophy,
    title: "Performance Analytics",
    description: "Track your PnL, analyze your trades, and compete on the leaderboard with other traders.",
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 md:py-32 bg-background border-t border-b border-border">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center space-y-4 mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="font-heading text-4xl md:text-5xl font-bold text-balance">
            Why Sol Sim?
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Everything you need to master Solana trading without risking real capital.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
            >
              <EnhancedCard className="p-6 bg-card border-2 border-foreground hover:border-foreground transition-all duration-300 group h-full">
                <div className="space-y-4">
                  <div className="h-12 w-12 rounded-full bg-foreground flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <feature.icon className="h-6 w-6 text-background" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-heading text-xl font-bold">{feature.title}</h3>
                    <p className="text-base text-muted-foreground leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              </EnhancedCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
