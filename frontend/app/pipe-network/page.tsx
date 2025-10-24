'use client'

/**
 * Pipe Network Page - Community Chat Hub
 *
 * Features:
 * - Large centered community chat (main focus)
 * - Clean, focused design
 * - Mario-themed styling
 */

import { motion } from 'framer-motion'
import Image from 'next/image'
import { ChatRoom } from '@/components/chat/chat-room'

export default function PipeNetworkPage() {
  return (
    <div className="w-full flex flex-col bg-[var(--background)] min-h-full">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="px-4 pt-4 pb-2 flex-shrink-0"
      >
        <div className="bg-gradient-to-r from-[var(--luigi-green)]/20 to-[var(--sky-blue)]/20 border-4 border-[var(--outline-black)] rounded-xl p-6 shadow-[8px_8px_0_var(--outline-black)] relative overflow-hidden">
          <div className="absolute top-2 right-2 flex gap-2">
            <Image src="/icons/mario/star.png" alt="Star" width={24} height={24} className="animate-pulse" />
            <Image src="/icons/mario/mushroom.png" alt="Mushroom" width={24} height={24} />
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-[var(--luigi-green)] p-3 rounded-lg border-4 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)]">
              <Image src="/Pipe-Network-10-24-2025.png" alt="Pipe Network" width={32} height={32} />
            </div>
            <div>
              <h1 className="text-3xl font-mario font-bold text-[var(--outline-black)]">PIPE NETWORK</h1>
              <p className="text-sm text-muted-foreground font-bold mt-1">Connect with the community & learn!</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Chat Area - Centered and Full Height */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex-1 min-h-0 px-4 pb-4"
      >
        <div className="bg-[var(--luigi-green)]/20 border-4 border-[var(--outline-black)] rounded-xl shadow-[8px_8px_0_var(--outline-black)] overflow-hidden h-full">
          <div className="bg-gradient-to-r from-[var(--luigi-green)] to-emerald-500 p-4 border-b-4 border-[var(--outline-black)]">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-white border-3 border-[var(--outline-black)] flex items-center justify-center shadow-[3px_3px_0_var(--outline-black)]">
                💬
              </div>
              <div>
                <h2 className="font-mario font-bold text-xl text-white">COMMUNITY CHAT</h2>
                <p className="text-white/90 text-xs">Connect with traders & get help</p>
              </div>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <ChatRoom tokenMint="community" className="h-full" />
          </div>
        </div>
      </motion.div>
    </div>
  )
}
