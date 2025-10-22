"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight, Star, Zap, Trophy } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"

export function HeroSection() {
  return (
    <section className="relative overflow-hidden py-20 md:py-32 bg-gradient-to-br from-mario-blue via-mario-red to-mario-yellow">
      {/* Mario-themed gradient background */}

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <motion.div
          className="absolute top-10 left-10 text-6xl"
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          🍄
        </motion.div>
        <motion.div
          className="absolute top-20 right-20 text-5xl"
          animate={{ y: [0, 20, 0], rotate: [0, 10, 0] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        >
          ⭐
        </motion.div>
        <motion.div
          className="absolute bottom-20 left-1/4 text-7xl"
          animate={{ y: [0, -15, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          🪙
        </motion.div>
      </div>

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
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 border-2 border-white/40 backdrop-blur-sm"
              >
                <Star className="h-4 w-4 text-mario-yellow animate-pulse" />
                <span className="text-sm font-bold text-white">Level Up Your Trading Game</span>
              </motion.div>

              <h1 className="font-mario text-5xl md:text-6xl lg:text-7xl font-bold leading-tight text-balance text-white text-shadow-mario">
                1UP Your Solana Trading Skills!
              </h1>
              <p className="text-xl text-white/90 max-w-xl leading-relaxed font-medium">
                Trade real Solana tokens with zero risk. Level up through trades, earn XP, unlock achievements, and compete on the leaderboard - just like your favorite game! 🎮
              </p>
            </div>

            <motion.div
              className="flex flex-col sm:flex-row gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <Link href="/trade">
                <button className="mario-btn mario-btn-lg bg-mario-green hover:bg-mario-green/90 w-full sm:w-auto group">
                  <span className="flex items-center justify-center gap-2">
                    Start Trading 🎮
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </button>
              </Link>
              <button
                className="mario-btn mario-btn-lg mario-btn-outline border-2 border-white text-white hover:bg-white hover:text-mario-red w-full sm:w-auto"
                onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
              >
                Learn More 📚
              </button>
            </motion.div>

            <motion.div
              className="grid grid-cols-3 gap-3 sm:gap-6 pt-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <div className="space-y-1 bg-white/10 backdrop-blur-sm rounded-lg p-3 border-2 border-white/20">
                <div className="text-xl sm:text-2xl md:text-3xl font-mario text-mario-yellow">20 Levels</div>
                <p className="text-xs sm:text-sm text-white/80 font-medium">From Goomba to Legendary</p>
              </div>
              <div className="space-y-1 bg-white/10 backdrop-blur-sm rounded-lg p-3 border-2 border-white/20">
                <div className="text-xl sm:text-2xl md:text-3xl font-mario text-mario-green">Earn XP</div>
                <p className="text-xs sm:text-sm text-white/80 font-medium">Level up with trades</p>
              </div>
              <div className="space-y-1 bg-white/10 backdrop-blur-sm rounded-lg p-3 border-2 border-white/20">
                <div className="text-xl sm:text-2xl md:text-3xl font-mario text-white">Zero Risk</div>
                <p className="text-xs sm:text-sm text-white/80 font-medium">Practice safely</p>
              </div>
            </motion.div>
          </motion.div>

          {/* Right: Demo video or Mario header */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <div className="relative rounded-2xl overflow-hidden border-4 border-white/40 shadow-2xl bg-gradient-to-br from-mario-red via-mario-yellow to-mario-green p-1">
              <div className="bg-white rounded-xl overflow-hidden flex items-center justify-center p-8">
                {/* 1UP SOL Logo */}
                <Image
                  src="/logo-2.png"
                  alt="1UP SOL"
                  width={400}
                  height={120}
                  priority
                  className="w-full h-auto max-w-md"
                />
                {/* Uncomment when video is ready:
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-auto object-contain"
                >
                  <source src="/demo-video.mp4?v=2" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                */}
              </div>
            </div>

            {/* Floating Mario elements */}
            <motion.div
              className="absolute -top-8 -right-8 text-7xl z-10"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              🍄
            </motion.div>
            <motion.div
              className="absolute -bottom-6 -left-6 text-6xl z-10"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              ⭐
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
