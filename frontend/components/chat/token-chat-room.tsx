'use client'

/**
 * Token Chat Room Component
 *
 * Token-specific chat that's independent from the pipe chat:
 * - Uses token mint as room ID
 * - Separate from main pipe chat system
 * - Real-time WebSocket messages
 * - Auto-scroll to latest
 * - Rate limiting UI
 * - Mario theme styling
 * - Moderation support
 */

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useTokenChat } from '@/lib/contexts/TokenChatContext'
import { useModeration } from '@/hooks/use-moderation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmojiPicker } from '@/components/ui/emoji-picker'
import { ChatMessage } from '@/components/chat/chat-message'
import { UserModerationSheet } from '@/components/moderation/user-moderation-sheet'
import { Loader2, Send, AlertCircle, Wifi, WifiOff } from 'lucide-react'
import { cn, marioStyles } from '@/lib/utils'
import Image from 'next/image'

interface TokenChatRoomProps {
  tokenMint: string
  className?: string
}

export function TokenChatRoom({ tokenMint, className }: TokenChatRoomProps) {
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
  } = useTokenChat()

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
      console.log(`💬 Token chat auto-joining room: ${tokenMint}`)
      joinRoom(tokenMint)
    }
  }, [user, status, tokenMint, currentRoom, joinRoom])

  // Auto-retry join if not in room when trying to send
  useEffect(() => {
    if (user && status === 'connected' && !currentRoom && tokenMint) {
      console.log(`💬 Token chat retry joining room: ${tokenMint}`)
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
      {/* Token Chat Header */}
      <div className="flex items-center justify-start mb-3 pb-3 border-b-3 border-outline">
        <div className="h-8 flex items-center">
          <Image
            src="/chat-10-25-2025.png"
            alt="Chat Header"
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
          'p-3 border-b-4 border-outline flex items-center gap-2 flex-shrink-0',
          'bg-mario shadow-[0_4px_0_rgba(0,0,0,0.2)]'
        )}>
          <AlertCircle className="h-4 w-4 text-white" />
          <span className={cn(marioStyles.bodyText('bold'), 'text-sm text-white flex-1')}>{error}</span>
          <button
            onClick={clearError}
            className={cn(
              marioStyles.bodyText('bold'),
              'text-white hover:text-star transition-colors text-lg'
            )}
          >
            ✕
          </button>
        </div>
      )}

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-br from-[var(--mario-red)]/5 via-[var(--background)] to-[var(--star-yellow)]/5 chat-scrollbar"
      >
        {!user ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className={cn(
              marioStyles.emptyStateIcon('var(--mario-red)', 'w-20 h-20'),
              'to-[var(--star-yellow)]'
            )}>
              🔒
            </div>
            <div className={marioStyles.heading(4)}>Sign In to Chat</div>
            <div className={cn(marioStyles.bodyText('medium'), 'text-sm opacity-70')}>
              Sign in to join the token discussion
            </div>
          </div>
        ) : status === 'connecting' ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <Loader2 className="h-10 w-10 animate-spin text-mario mb-4" />
            <div className={marioStyles.heading(4)}>Connecting to token chat...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className={cn(
              marioStyles.emptyStateIcon('var(--mario-red)', 'w-20 h-20'),
              'to-[var(--star-yellow)]'
            )}>
              💬
            </div>
            <div className={marioStyles.heading(4)}>No messages yet</div>
            <div className={cn(marioStyles.bodyText('medium'), 'text-sm opacity-70')}>
              Start the conversation about this token!
            </div>
          </div>
        ) : (
          <>
            {/* Message List */}
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} onUserClick={handleUserClick} />
            ))}
          </>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t-4 border-outline bg-gradient-to-r from-white to-[var(--mario-red)]/10 flex-shrink-0 shadow-[0_-4px_0_rgba(0,0,0,0.05)]">
        <div className="flex gap-2 items-end">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={user ? 'Discuss this token...' : 'Sign in to chat'}
            disabled={!user || status !== 'connected'}
            className={cn(marioStyles.input(), 'flex-1 h-10')}
            maxLength={280}
            autoComplete="off"
            data-form-type="other"
          />
          <EmojiPicker onEmojiSelect={handleEmojiSelect} />
          <button
            onClick={handleSendMessage}
            disabled={!user || !inputValue.trim() || status !== 'connected'}
            className="h-10 w-10 rounded-lg border-3 border-outline bg-luigi hover:bg-pipe text-white font-bold transition-all shadow-[3px_3px_0_var(--outline-black)] hover:shadow-[4px_4px_0_var(--outline-black)] hover:-translate-y-0.5 active:shadow-[2px_2px_0_var(--outline-black)] active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        {user && inputValue && (
          <div className={cn(marioStyles.bodyText('medium'), 'text-xs opacity-60 mt-2 text-right')}>
            {inputValue.length}/280
          </div>
        )}
      </div>

      <UserModerationSheet
        userId={selectedUserId}
        open={moderationSheetOpen}
        onOpenChange={setModerationSheetOpen}
      />
    </div>
  )
}
