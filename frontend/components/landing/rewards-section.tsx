"use client"

import { EnhancedCard } from "@/components/ui/enhanced-card-system"
import { Gift, Zap, Trophy, Coins, TrendingUp, Wallet } from "lucide-react"
import { motion } from "framer-motion"

const rewards = [
  {
    icon: TrendingUp,
    title: "Trade & Earn",
    description: "Every trade earns you $1UP rewards! More trades and better performance = higher rewards and multipliers.",
  },
  {
    icon: Zap,
    title: "XP & Levels",
    description: "Climb through 20 levels from Goomba to Legendary Luigi. Higher levels unlock bigger reward multipliers!",
  },
  {
    icon: Trophy,
    title: "Leaderboard Bonuses",
    description: "Top-ranked traders earn 2×–10× multipliers on their rewards. Compete to maximize your earnings!",
  },
  {
    icon: Coins,
    title: "Future Airdrops",
    description: "Active traders will qualify for exclusive $1UP airdrops when live trading launches. Start earning now!",
  },
]

export function RewardsSection() {
  return (
    <section className="py-20 md:py-32 bg-gradient-to-b from-background to-muted border-t border-border">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center space-y-4 mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--star-yellow)]/20 border-4 border-[var(--star-yellow)]/50 mb-4">
            <Gift className="h-5 w-5 text-[var(--star-yellow)]" />
            <span className="text-sm font-bold text-[var(--outline-black)]">Earn $1UP Rewards</span>
          </div>
          <h2 className="font-heading text-4xl md:text-5xl font-bold text-balance">
            Earn $1UP While You Trade
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Trade with paper SOL, climb the leaderboard, and earn real $1UP rewards. Start earning now!
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-12">
          {rewards.map((reward, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
            >
              <div className="mario-card p-6 bg-[var(--card)] border-4 border-[var(--outline-black)] hover:border-[var(--coin-gold)] transition-all duration-300 group h-full shadow-[6px_6px_0_var(--outline-black)] hover:shadow-[8px_8px_0_var(--outline-black)] hover:-translate-y-1">
                <div className="space-y-4">
                  <div className="h-12 w-12 rounded-full bg-[var(--coin-gold)]/20 border-4 border-[var(--outline-black)] flex items-center justify-center group-hover:scale-110 group-hover:bg-[var(--coin-gold)]/30 transition-all duration-300">
                    <reward.icon className="h-6 w-6 text-[var(--coin-gold)]" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-mario text-xl text-[var(--mario-red)]">{reward.title}</h3>
                    <p className="text-base text-[var(--outline-black)]/70 leading-relaxed">{reward.description}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Simplified explanation box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <div className="mario-card max-w-4xl mx-auto p-8 bg-gradient-to-br from-[var(--coin-gold)]/10 via-[var(--star-yellow)]/10 to-[var(--coin-gold)]/10 border-4 border-[var(--coin-gold)]/60 shadow-[6px_6px_0_var(--outline-black)]">
            <div className="text-center space-y-4">
              <div className="inline-flex h-16 w-16 rounded-full bg-[var(--coin-gold)]/30 border-4 border-[var(--outline-black)] items-center justify-center mb-2">
                <Gift className="h-8 w-8 text-[var(--coin-gold)]" />
              </div>
              <h3 className="font-mario text-2xl md:text-3xl text-[var(--outline-black)]">
                How $1UP Rewards Work
              </h3>
              <div className="space-y-3 text-base md:text-lg text-[var(--outline-black)] max-w-2xl mx-auto">
                <p>
                  <span className="font-bold text-[var(--luigi-green)]">Every trade counts.</span> Paper trading earns you XP and $1UP rewards based on your activity and performance.
                </p>
                <p>
                  <span className="font-bold text-[var(--super-blue)]">Level up for multipliers.</span> Progress through 20 levels to unlock bigger reward multipliers. Top ranks earn even more!
                </p>
                <p>
                  <span className="font-bold text-[var(--mario-red)]">Check your earnings.</span> Visit the Rewards page anytime to see your accumulated $1UP and claim when ready.
                </p>
                <p className="pt-2 border-t border-primary/20">
                  <span className="font-semibold text-primary text-lg">Start trading now to maximize your $1UP rewards!</span>
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
