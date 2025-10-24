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
      {/* Centered Header Image */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex justify-center items-center py-6 flex-shrink-0"
      >
        <Image
          src="/Pipe-Network-10-24-2025.png"
          alt="Pipe Chat"
          width={400}
          height={100}
          className="object-contain"
        />
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
