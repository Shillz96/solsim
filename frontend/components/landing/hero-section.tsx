"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight, TrendingUp, Sparkles } from "lucide-react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { motion } from "framer-motion"

const DexScreenerChart = dynamic(
  () => import("@/components/trading/dexscreener-chart").then((mod) => mod.DexScreenerChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-[400px] w-full animate-pulse rounded-2xl bg-card/50 border border-border flex items-center justify-center">
        <TrendingUp className="h-12 w-12 text-muted-foreground animate-pulse" />
      </div>
    ),
  },
)

export function HeroSection() {
  return (
    <section className="relative overflow-hidden py-20 md:py-32">
      <div className="absolute inset-0 gradient-mesh" />
      <motion.div
        className="absolute inset-0 opacity-30"
        animate={{
          background: [
            "radial-gradient(circle at 20% 50%, oklch(0.55 0.22 250 / 0.15) 0%, transparent 50%)",
            "radial-gradient(circle at 80% 50%, oklch(0.70 0.20 180 / 0.15) 0%, transparent 50%)",
            "radial-gradient(circle at 20% 50%, oklch(0.55 0.22 250 / 0.15) 0%, transparent 50%)",
          ],
        }}
        transition={{ duration: 10, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
      />
      
      {/* Floating elements */}
      <motion.div
        className="absolute top-20 left-1/4 w-2 h-2 bg-primary/30 rounded-full float"
        animate={{ y: [0, -20, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-1/3 right-1/4 w-1 h-1 bg-accent/40 rounded-full float"
        animate={{ y: [0, -15, 0], x: [0, 10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
      <motion.div
        className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-chart-3/30 rounded-full float"
        animate={{ y: [0, -25, 0], rotate: [0, 180, 360] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />

      <div className="container relative mx-auto px-4">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          {/* Left: Headline + CTA */}
          <motion.div
            className="space-y-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20"
              >
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">Practice Trading Platform</span>
              </motion.div>

              <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl font-bold leading-tight text-balance">
                Trade Solana <span className="gradient-text">Without Risk</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-xl leading-relaxed">
                Practice trading real Solana tokens with live market data. No financial risk, learn faster, trade
                smarter.
              </p>
            </div>

            <motion.div
              className="flex flex-col sm:flex-row gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <Link href="/trade">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 glow-primary group"
                >
                  Start Trading
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto bg-transparent hover:bg-card"
                onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
              >
                Learn More
              </Button>
            </motion.div>

            <motion.div
              className="grid grid-cols-3 gap-6 pt-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <div className="space-y-1">
                <div className="text-3xl font-bold gradient-text">100 SOL</div>
                <p className="text-sm text-muted-foreground">Virtual balance</p>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold gradient-text">Real-time</div>
                <p className="text-sm text-muted-foreground">Live data</p>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold gradient-text">Zero Risk</div>
                <p className="text-sm text-muted-foreground">Practice safely</p>
              </div>
            </motion.div>
          </motion.div>

          {/* Right: Animated chart */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <div className="absolute -inset-4 gradient-trading opacity-30 blur-3xl rounded-full" />
            <div className="relative rounded-2xl overflow-hidden glass shadow-2xl glow-primary">
              <DexScreenerChart tokenAddress="DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263" />
              {/* Overlay gradient for better chart integration */}
              <div className="absolute inset-0 bg-gradient-to-t from-card/20 via-transparent to-transparent pointer-events-none" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
