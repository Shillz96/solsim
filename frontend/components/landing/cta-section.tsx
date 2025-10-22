"use client"

import { Star } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"

export function CTASection() {
  return (
    <section className="py-20 md:py-32 bg-gradient-to-br from-mario-red via-mario-yellow to-mario-green relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10">
        <motion.div
          className="absolute top-1/4 left-1/4"
          animate={{ rotate: 360, scale: [1, 1.2, 1] }}
          transition={{ duration: 10, repeat: Infinity }}
        >
          <img src="/icons/mario/mushroom.png" alt="" className="w-24 h-24 object-contain" />
        </motion.div>
        <motion.div
          className="absolute bottom-1/4 right-1/4"
          animate={{ y: [0, -30, 0] }}
          transition={{ duration: 4, repeat: Infinity }}
        >
          <img src="/icons/mario/star.png" alt="" className="w-20 h-20 object-contain" />
        </motion.div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="relative overflow-hidden p-12 md:p-16 text-center space-y-8">
          <div className="space-y-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="mb-4"
            >
              <img src="/icons/mario/controller.png" alt="" className="w-20 h-20 object-contain mx-auto" />
            </motion.div>
            <h2 className="font-mario text-4xl md:text-5xl font-bold text-white flex items-center justify-center gap-3" style={{ textShadow: '3px 3px 6px rgba(0,0,0,0.9), 0px 0px 10px rgba(0,0,0,0.5)' }}>
              Ready to Level Up?
              <img src="/icons/mario/trophy.png" alt="" className="w-10 h-10 object-contain inline-block" />
            </h2>
            <p className="text-xl text-white max-w-2xl mx-auto font-bold flex items-center justify-center gap-2" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.9), 0px 0px 8px rgba(0,0,0,0.6)' }}>
              Join traders leveling up with 1UP SOL! Earn XP, unlock achievements, and compete on leaderboards - all risk-free!
              <img src="/icons/mario/star.png" alt="" className="w-6 h-6 object-contain inline-block" />
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/trade">
              <button className="mario-btn mario-btn-lg bg-mario-green hover:bg-mario-green/90 text-white w-full sm:w-auto group">
                <span className="flex items-center justify-center gap-2">
                  Start Trading Now!
                  <img src="/icons/mario/controller.png" alt="" className="w-5 h-5 object-contain inline-block" />
                  <img src="/icons/mario/right-arrow.png" alt="" className="w-5 h-5 object-contain inline-block group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
            </Link>
            <Link href="/docs">
              <button className="mario-btn mario-btn-lg mario-btn-outline border-2 border-white text-white hover:bg-white hover:text-mario-red w-full sm:w-auto">
                <span className="flex items-center justify-center gap-2">
                  Learn How to Play
                  <img src="/icons/mario/game.png" alt="" className="w-5 h-5 object-contain inline-block" />
                </span>
              </button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
