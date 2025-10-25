'use client'

/**
 * Pipe Network Page - Community Chat Hub
 *
 * Features:
 * - Large centered community chat (main focus)
 * - Clean, focused design
 * - Mario-themed styling
 * - Fixed height layout (no scrolling)
 */

import { ChatRoom } from '@/components/chat/chat-room'

export default function PipeNetworkPage() {
  return (
    <div 
      className="w-full flex flex-col bg-[var(--background)]" 
      style={{ 
        height: 'calc(100dvh - var(--navbar-height, 56px) - var(--bottom-nav-height, 64px))',
        maxHeight: 'calc(100dvh - var(--navbar-height, 56px) - var(--bottom-nav-height, 64px))',
        overflow: 'hidden'
      }}
    >
      {/* Main Chat Area - Full Height */}
      <div className="flex-1 flex flex-col px-4 py-4 min-h-0">
        <div className="bg-gradient-to-br from-[var(--luigi-green)]/10 via-white to-[var(--sky-blue)]/10 border-4 border-[var(--outline-black)] rounded-2xl shadow-[8px_8px_0_var(--outline-black)] overflow-hidden flex-1 flex flex-col">
          <div className="flex-1 min-h-0">
            <ChatRoom 
              tokenMint="community" 
              className="h-full"
              headerImage="https://oneupsol.fun/_next/image?url=%2FPipe-Network-10-24-2025.png&w=640&q=75"
              headerImageAlt="Pipe Network"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
