import { UserPlus, Search, TrendingUp, BarChart2, Star } from "lucide-react"
import { MarioHeaderPlaceholder } from "@/components/placeholders/mario-header-placeholder"
import { motion } from "framer-motion"

const steps = [
  {
    icon: UserPlus,
    emoji: "👤",
    title: "Sign up & start",
    description: "Create your account and get 10 SOL instantly (100 SOL for $UP holders). No wallet needed!",
  },
  {
    icon: Search,
    emoji: "🔍",
    title: "Explore & learn",
    description: "Browse trending tokens and track successful wallets to learn winning strategies.",
  },
  {
    icon: TrendingUp,
    emoji: "📈",
    title: "Trade & earn XP",
    description: "Buy and sell tokens with virtual SOL. Earn XP from every trade!",
  },
  {
    icon: Star,
    emoji: "⭐",
    title: "Level up",
    description: "Unlock achievements, progress through 20 levels, and earn exclusive titles!",
  },
  {
    icon: BarChart2,
    emoji: "🏆",
    title: "Compete & dominate",
    description: "Monitor your portfolio, climb the leaderboard, and become a trading legend!",
  },
]

export function HowItWorksSection() {
  return (
    <section className="py-20 md:py-32 bg-gradient-to-b from-mario-yellow/10 via-mario-blue/5 to-background border-t-4 border-mario-yellow/30">
      <div className="container mx-auto px-4">
        <div className="text-center space-y-4 mb-16">
          {/* Mario header placeholder */}
          <div className="mb-6 max-w-3xl mx-auto">
            <MarioHeaderPlaceholder variant="how-it-works" className="w-full h-auto rounded-xl shadow-lg border-4 border-mario-yellow/50" />
          </div>

          <h2 className="font-mario text-4xl md:text-5xl font-bold text-mario-red text-shadow-sm">
            How to Play the Game 🎮
          </h2>
          <p className="text-xl text-foreground/80 max-w-2xl mx-auto font-medium">
            Start trading, leveling up, and earning in minutes. No wallet connection required!
          </p>
        </div>

        <div className="relative">
          {/* Connection line */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-mario-red via-mario-yellow to-mario-green rounded-full opacity-30" />

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
                    <div className="h-20 w-20 rounded-full bg-gradient-to-br from-mario-yellow to-mario-orange border-4 border-mario-yellow/60 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                      <span className="text-4xl">{step.emoji}</span>
                    </div>
                    <div className="absolute -top-2 -right-2 h-10 w-10 rounded-full bg-mario-red text-white border-3 border-white flex items-center justify-center text-lg font-mario shadow-lg">
                      {index + 1}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-mario text-xl text-mario-red">{step.title}</h3>
                    <p className="text-base text-foreground/70 leading-relaxed max-w-xs">{step.description}</p>
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
