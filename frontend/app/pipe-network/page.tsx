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
    <div className="w-full flex flex-col bg-[var(--background)] h-full">
      {/* Centered Header Image */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex justify-center items-center py-4 flex-shrink-0"
      >
        <Image
          src="/Pipe-Network-10-24-2025.png"
          alt="Pipe Chat"
          width={400}
          height={100}
          className="object-contain"
        />
      </motion.div>

      {/* Main Chat Area - Full Height to Navigation Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex-1 flex flex-col px-4 pb-4 min-h-0"
      >
        <div className="bg-gradient-to-br from-[var(--luigi-green)]/10 via-white to-[var(--sky-blue)]/10 border-4 border-[var(--outline-black)] rounded-2xl shadow-[8px_8px_0_var(--outline-black)] overflow-hidden flex-1 flex flex-col">
          <div className="bg-gradient-to-r from-[var(--luigi-green)] via-emerald-500 to-[var(--pipe-green)] p-5 border-b-4 border-[var(--outline-black)] flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-white border-4 border-[var(--outline-black)] flex items-center justify-center shadow-[4px_4px_0_var(--outline-black)] text-2xl">
                💬
              </div>
              <div>
                <h2 className="font-mario font-bold text-2xl text-white drop-shadow-[2px_2px_0_rgba(0,0,0,0.3)]">COMMUNITY CHAT</h2>
                <p className="text-white/90 text-sm font-bold">Connect with traders & get help</p>
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
