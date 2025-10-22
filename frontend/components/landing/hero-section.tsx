"use client"

import { Button } from "@/components/ui/button"
import { Star, Zap, Trophy } from "lucide-react"
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
          className="absolute top-10 left-10"
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <Image src="/icons/mario/mushroom.png" alt="" width={60} height={60} className="object-contain" />
        </motion.div>
        <motion.div
          className="absolute top-20 right-20"
          animate={{ y: [0, 20, 0], rotate: [0, 10, 0] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        >
          <Image src="/icons/mario/star.png" alt="" width={50} height={50} className="object-contain" />
        </motion.div>
        <motion.div
          className="absolute bottom-20 left-1/4"
          animate={{ y: [0, -15, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Image src="/icons/mario/money-bag.png" alt="" width={70} height={70} className="object-contain" />
        </motion.div>
      </div>

      <div className="container relative mx-auto px-4">
        <div className="flex flex-col items-center text-center space-y-8">
          {/* Hero Video */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-4xl"
          >
            <video
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-auto rounded-2xl shadow-2xl"
            >
              <source src="/1UP-Your-Solana-Trading-Skill-10-22-2025.webm" type="video/webm" />
              Your browser does not support the video tag.
            </video>
          </motion.div>

          {/* Content below hero */}
          <motion.div
            className="space-y-8 max-w-3xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <p className="text-xl text-[var(--outline-black)] leading-relaxed font-bold drop-shadow-lg flex items-center justify-center gap-2 flex-wrap">
              Trade real Solana tokens with zero risk. Level up through trades, earn XP, unlock achievements, and compete on the leaderboard - just like your favorite game!
              <Image src="/icons/mario/controller.png" alt="" width={24} height={24} className="object-contain inline-block" />
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/trade">
                <button className="mario-btn mario-btn-lg bg-mario-green hover:bg-mario-green/90 w-full sm:w-auto group">
                  <span className="flex items-center justify-center gap-2">
                    Start Trading
                    <Image src="/icons/mario/controller.png" alt="" width={20} height={20} className="object-contain inline-block" />
                    <Image src="/icons/mario/right-arrow.png" alt="" width={20} height={20} className="object-contain inline-block group-hover:translate-x-1 transition-transform" />
                  </span>
                </button>
              </Link>
              <button
                className="mario-btn mario-btn-lg mario-btn-outline border-2 border-white text-white hover:bg-white hover:text-mario-red w-full sm:w-auto"
                onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
              >
                <span className="flex items-center justify-center gap-2">
                  Learn More
                  <Image src="/icons/mario/game.png" alt="" width={20} height={20} className="object-contain inline-block" />
                </span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:gap-6">
              <div className="space-y-1 bg-black/40 backdrop-blur-md rounded-lg p-3 sm:p-4 border-3 border-[var(--outline-black)] shadow-lg">
                <div className="text-xl sm:text-2xl md:text-3xl font-mario text-[var(--star-yellow)]" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>20 Levels</div>
                <p className="text-xs sm:text-sm text-white font-bold" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.9)' }}>From Goomba to Legendary</p>
              </div>
              <div className="space-y-1 bg-black/40 backdrop-blur-md rounded-lg p-3 sm:p-4 border-3 border-[var(--outline-black)] shadow-lg">
                <div className="text-xl sm:text-2xl md:text-3xl font-mario text-[var(--luigi-green)]" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>Earn XP</div>
                <p className="text-xs sm:text-sm text-white font-semibold" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.9)' }}>Level up with trades</p>
              </div>
              <div className="space-y-1 bg-black/40 backdrop-blur-md rounded-lg p-3 sm:p-4 border-3 border-[var(--outline-black)] shadow-lg">
                <div className="text-xl sm:text-2xl md:text-3xl font-mario text-[var(--super-blue)]" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>Zero Risk</div>
                <p className="text-xs sm:text-sm text-white font-bold" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.9)' }}>Practice safely</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
