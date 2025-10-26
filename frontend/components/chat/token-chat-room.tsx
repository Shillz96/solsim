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
import { Loader2, Send, Users, AlertCircle, Wifi, WifiOff, MessageSquare, Shield } from 'lucide-react'
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
    setInputValue(prev => prev + emoji)
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
      <div className={cn(
        marioStyles.headerGradient('var(--mario-red)', 'red-500')
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(marioStyles.iconContainer('md', 'white'), 'text-xl')}>
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <div className="h-6 flex items-center mb-1">
              <Image
                src="/chat-10-25-2025.png"
                alt="Chat Header"
                width={100}
                height={24}
                className="h-full w-auto object-contain"
                priority
              />
            </div>
            <div className={cn(marioStyles.bodyText('bold'), 'text-xs text-white/90 flex items-center gap-1.5')}>
              <Users className="h-3.5 w-3.5" />
              <span>{participantCount > 0 ? `${participantCount} online` : 'Loading...'}</span>
              <span className="text-white/70">•</span>
              <span className="text-white/70 text-[10px] font-mono">
                {tokenMint.slice(0, 4)}...{tokenMint.slice(-4)}
              </span>
            </div>
          </div>
        </div>

        {/* Connection Status */}
        <div className="flex items-center gap-2">
          {/* Moderator Badge */}
          {canModerate && (
            <div className={cn(
              marioStyles.badgeLg('admin'),
              'bg-[var(--luigi-green)] border-[var(--luigi-green)]'
            )}>
              <Shield className="h-3 w-3 mr-1" />
              MOD
            </div>
          )}
          
          <div
            className={marioStyles.statusBox(statusColor)}
            style={{ backgroundColor: statusColor }}
          >
            <StatusIcon className="h-3.5 w-3.5 text-white" />
            <span className="text-xs font-mario font-bold text-white capitalize">
              {status}
            </span>
          </div>
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
              'text-white hover:text-[var(--star-yellow)] transition-colors text-lg'
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
            <Loader2 className="h-10 w-10 animate-spin text-[var(--mario-red)] mb-4" />
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
      <div className="p-4 border-t-4 border-[var(--outline-black)] bg-gradient-to-r from-white to-[var(--mario-red)]/10 flex-shrink-0 shadow-[0_-4px_0_rgba(0,0,0,0.05)]">
        <div className="flex gap-2 items-end">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={user ? 'Discuss this token...' : 'Sign in to chat'}
            disabled={!user || status !== 'connected'}
            className={cn(marioStyles.input(), 'flex-1')}
            maxLength={280}
          />
          <EmojiPicker onEmojiSelect={handleEmojiSelect} />
          <Button
            onClick={handleSendMessage}
            disabled={!user || !inputValue.trim() || status !== 'connected'}
            className={marioStyles.button('primary')}
          >
            <Send className="h-4 w-4" />
          </Button>
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
