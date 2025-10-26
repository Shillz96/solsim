'use client'

/**
 * Chat Room Component
 *
 * Token-specific chat with:
 * - Email/password authentication via JWT (no wallet required)
 * - Real-time WebSocket messages
 * - Auto-scroll to latest
 * - Rate limiting UI
 * - Mario theme styling
 * - Moderation support
 */

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useChat } from '@/lib/contexts/ChatContext'
import { useModeration } from '@/hooks/use-moderation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmojiPicker } from '@/components/ui/emoji-picker'
import { ChatMessage } from '@/components/chat/chat-message'
import { UserModerationSheet } from '@/components/moderation/user-moderation-sheet'
import { Loader2, Send, AlertCircle, Wifi, WifiOff, Users } from 'lucide-react'
import { cn, marioStyles } from '@/lib/utils'
import Image from 'next/image'

interface ChatRoomProps {
  tokenMint: string
  className?: string
  headerImage?: string
  headerImageAlt?: string
}

export function ChatRoom({ tokenMint, className, headerImage, headerImageAlt = 'Chat Header' }: ChatRoomProps) {
  const { user } = useAuth()
  const { canModerate } = useModeration()
  const {
    messages,
    status,
    error,
    participantCount,
    currentRoom,
    joinRoom,
    sendMessage,
    clearError,
  } = useChat()

  const [inputValue, setInputValue] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [moderationSheetOpen, setModerationSheetOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Join room when component mounts or status changes
  useEffect(() => {
    if (user && status === 'connected' && currentRoom !== tokenMint) {
      console.log(`💬 Auto-joining room: ${tokenMint}`)
      joinRoom(tokenMint)
    }
  }, [user, status, tokenMint, currentRoom, joinRoom])

  // Auto-retry join if not in room when trying to send
  useEffect(() => {
    if (user && status === 'connected' && !currentRoom && tokenMint) {
      console.log(`💬 Retry joining room: ${tokenMint}`)
      joinRoom(tokenMint)
    }
  }, [user, status, currentRoom, tokenMint, joinRoom])

  const handleSendMessage = () => {
    if (!inputValue.trim() || !user) return

    sendMessage(inputValue)
    setInputValue('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleEmojiSelect = (emoji: string) => {
    setInputValue(prev => {
      // Add a space before emoji if there's already content
      const needsSpace = prev.length > 0 && !prev.endsWith(' ')
      return prev + (needsSpace ? ' ' : '') + emoji
    })
    // Focus input after emoji selection
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  // Extract emoji paths from input for preview
  const selectedEmojis = inputValue.match(/\/emojis\/[a-zA-Z0-9_-]+\.(png|gif)/g) || []

  const handleUserClick = (userId: string) => {
    if (canModerate && userId !== user?.id) {
      setSelectedUserId(userId)
      setModerationSheetOpen(true)
    }
  }

  // Connection status indicator
  const statusColor =
    status === 'connected' ? 'var(--luigi-green)' :
    status === 'connecting' ? 'var(--star-yellow)' :
    status === 'error' ? 'var(--mario-red)' :
    'var(--pipe-green)'

  const StatusIcon = status === 'connected' || status === 'connecting' ? Wifi : WifiOff

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Chat Header */}
      <div className="flex items-center justify-start mb-3 pb-3 border-b-3 border-[var(--outline-black)]">
        <div className="h-8 flex items-center">
          <Image
            src={headerImage || "/chat-10-25-2025.png"}
            alt={headerImageAlt}
            width={120}
            height={32}
            className="h-full w-auto object-contain"
            priority
          />
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className={cn(
          'p-3 border-b-4 border-[var(--outline-black)] flex items-center gap-2 flex-shrink-0',
          'bg-[var(--mario-red)] shadow-[0_4px_0_rgba(0,0,0,0.2)]'
        )}>
          <AlertCircle className="h-4 w-4 text-white" />
          <span className={cn(marioStyles.bodyText('bold'), 'text-sm text-white flex-1')}>{error}</span>
          <button
            onClick={clearError}
            className={cn(
              marioStyles.bodyText('bold'),
              'text-white text-lg'
            )}
          >
            ✕
          </button>
        </div>
      )}

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        className={cn(
          "flex-1 flex flex-col chat-scrollbar overflow-y-auto mb-3 px-2 py-6",
          // Center empty states, but align messages to top
          messages.length === 0 ? "items-center justify-center" : "items-start justify-start"
        )}
      >
        {!user ? (
          <>
            <div className="w-16 h-16 rounded-2xl bg-[var(--color-sky)] border-3 border-[var(--outline-black)] flex items-center justify-center mb-3 shadow-[3px_3px_0_var(--outline-black)]">
              🔒
            </div>
            <h3 className="text-base font-bold mb-1">Sign In to Chat</h3>
            <p className="text-sm text-[var(--foreground)] opacity-70">Sign in to join the conversation</p>
          </>
        ) : status === 'connecting' ? (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-[var(--color-luigi)] mb-4" />
            <h3 className="text-base font-bold">Connecting to chat...</h3>
          </>
        ) : messages.length === 0 ? (
          <>
            <div className="w-16 h-16 rounded-2xl bg-[var(--color-sky)] border-3 border-[var(--outline-black)] flex items-center justify-center mb-3 shadow-[3px_3px_0_var(--outline-black)]">
              <Users className="w-8 h-8 text-[var(--outline-black)]" />
            </div>
            <h3 className="text-base font-bold mb-1">No messages yet</h3>
            <p className="text-sm text-[var(--foreground)] opacity-70">Be the first to say something!</p>
          </>
        ) : (
          <div className="w-full space-y-3">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} onUserClick={handleUserClick} />
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t-4 border-[var(--outline-black)] bg-gradient-to-r from-white to-[var(--mario-red)]/10 flex-shrink-0 shadow-[0_-4px_0_rgba(0,0,0,0.05)] relative">
        <div className="flex gap-2 items-end">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={user ? 'Type a message...' : 'Sign in to chat'}
            disabled={!user || status !== 'connected'}
            className="flex-1 h-10 px-3 text-sm rounded-lg border-3 border-[var(--outline-black)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-star)] shadow-[2px_2px_0_var(--outline-black)]"
            maxLength={280}
            autoComplete="off"
            data-form-type="other"
            data-1p-ignore
            data-lpignore="true"
          />
          <EmojiPicker 
            onEmojiSelect={handleEmojiSelect}
            position="top"
          />
          <button 
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || !user || status !== 'connected'}
            className="h-10 w-10 rounded-lg border-3 border-[var(--outline-black)] bg-[var(--luigi-green)] hover:bg-[var(--pipe-green)] text-white font-bold transition-all shadow-[3px_3px_0_var(--outline-black)] hover:shadow-[4px_4px_0_var(--outline-black)] hover:-translate-y-0.5 active:shadow-[2px_2px_0_var(--outline-black)] active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        {user && inputValue && (
          <div className={cn(marioStyles.bodyText('medium'), 'text-xs opacity-60 mt-2 text-right absolute bottom-1 right-4')}>
            {inputValue.length}/280
          </div>
        )}
      </div>

      {/* User Moderation Sheet */}
      <UserModerationSheet
        userId={selectedUserId}
        open={moderationSheetOpen}
        onOpenChange={setModerationSheetOpen}
      />
    </div>
  )
}
