"use client"

import { Button } from "@/components/ui/button"
import { Star, Zap, Trophy } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"

export function HeroSection() {
  return (
    <section className="relative overflow-hidden py-20 md:py-32 bg-gradient-to-br from-[var(--background)] via-[var(--background)] to-white">
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
          {/* Hero Text with Breathing Effect */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: [1, 1.05, 1] // Breathing effect
            }}
            transition={{
              duration: 0.8,
              scale: {
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }
            }}
            className="w-full max-w-4xl mb-8"
          >
            <div className="relative w-full flex justify-center">
              <Image
                src="/Master-Solana-Trading-Practi-10-24-2025.png"
                alt="Master Solana Trading - Practice to Pro"
                width={1200}
                height={300}
                className="object-contain w-full h-auto drop-shadow-2xl"
                priority
                style={{
                  filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.3))'
                }}
              />
            </div>
          </motion.div>
          {/* Content below hero */}
          <motion.div
            className="space-y-8 max-w-3xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <p className="text-xl text-[var(--outline-black)] leading-relaxed font-bold drop-shadow-lg flex items-center justify-center gap-2 flex-wrap">
              Discover new Solana tokens, practice with paper trading, then go live with real trades - track wallets, earn XP, and level up your skills in one gamified platform!
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
              {/* Star Power Block - Yellow */}
              <motion.div
                className="relative space-y-2 bg-gradient-to-br from-[var(--star-yellow)] via-[var(--coin-gold)] to-[var(--coin-gold)]/80 rounded-[16px] p-4 sm:p-6 border-4 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)] hover:shadow-[6px_6px_0_var(--outline-black)] hover:-translate-y-1 transition-all duration-200"
                whileHover={{ scale: 1.05 }}
              >
                {/* Shine effect */}
                <div className="absolute top-2 left-2 w-8 h-8 bg-[var(--card)]/40 rounded-full blur-sm"></div>
                <div className="relative">
                  <div className="text-xl sm:text-2xl md:text-3xl font-mario text-[var(--outline-black)] drop-shadow-[2px_2px_0px_rgba(255,255,255,0.5)]">20 Levels</div>
                  <p className="text-xs sm:text-sm text-[var(--outline-black)]/80 font-bold drop-shadow-sm">From Goomba to Legendary</p>
                </div>
              </motion.div>

              {/* 1-Up Block - Green */}
              <motion.div
                className="relative space-y-2 bg-gradient-to-br from-[var(--luigi-green)] via-[var(--luigi-green)]/90 to-[var(--luigi-green)]/80 rounded-[16px] p-4 sm:p-6 border-4 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)] hover:shadow-[6px_6px_0_var(--outline-black)] hover:-translate-y-1 transition-all duration-200"
                whileHover={{ scale: 1.05 }}
              >
                {/* Shine effect */}
                <div className="absolute top-2 left-2 w-8 h-8 bg-[var(--card)]/40 rounded-full blur-sm"></div>
                <div className="relative">
                  <div className="text-xl sm:text-2xl md:text-3xl font-mario text-white drop-shadow-[2px_2px_0px_var(--outline-black)]">Earn XP</div>
                  <p className="text-xs sm:text-sm text-white font-bold drop-shadow-[1px_1px_0px_var(--outline-black)]">Level up with trades</p>
                </div>
              </motion.div>

              {/* Ice Flower Block - Sky Blue */}
              <motion.div
                className="relative space-y-2 bg-gradient-to-br from-[var(--sky-blue)] via-[var(--sky-blue)]/80 to-[var(--sky-blue)]/60 rounded-[16px] p-4 sm:p-6 border-4 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)] hover:shadow-[6px_6px_0_var(--outline-black)] hover:-translate-y-1 transition-all duration-200"
                whileHover={{ scale: 1.05 }}
              >
                {/* Shine effect */}
                <div className="absolute top-2 left-2 w-8 h-8 bg-[var(--card)]/40 rounded-full blur-sm"></div>
                <div className="relative">
                  <div className="text-xl sm:text-2xl md:text-3xl font-mario text-white drop-shadow-[2px_2px_0px_var(--outline-black)]">Zero Risk</div>
                  <p className="text-xs sm:text-sm text-white font-bold drop-shadow-[1px_1px_0px_var(--outline-black)]">Practice safely</p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
