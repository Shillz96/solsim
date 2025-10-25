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
import { Loader2, Send, Users, AlertCircle, Wifi, WifiOff, Shield } from 'lucide-react'
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
      {/* Chat Header */}
      <div className={cn(
        marioStyles.headerGradient('var(--luigi-green)')
      )}>
        <div className="flex items-center gap-3 flex-1">
          {headerImage ? (
            <div className="relative h-12 w-auto flex-1">
              <Image
                src={headerImage}
                alt={headerImageAlt}
                width={200}
                height={48}
                className="object-contain h-12 w-auto"
                priority
              />
            </div>
          ) : (
            <div className="relative h-12 w-auto flex-1">
              <Image
                src="/chat-10-25-2025.png"
                alt="Chat"
                width={200}
                height={48}
                className="object-contain h-12 w-auto"
                priority
              />
            </div>
          )}
        </div>

        {/* Connection Status */}
        <div className="flex items-center gap-2 flex-shrink-0">
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
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-br from-[var(--sky-blue)]/10 via-[var(--card)] to-[var(--luigi-green)]/5 chat-scrollbar"
      >
        {!user ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className={cn(
              marioStyles.emptyStateIcon('var(--pipe-green)', 'w-20 h-20'),
              'to-[var(--luigi-green)]'
            )}>
              🔒
            </div>
            <div className={marioStyles.heading(4)}>Sign In to Chat</div>
            <div className={cn(marioStyles.bodyText('medium'), 'text-sm opacity-70')}>
              Sign in to join the conversation
            </div>
          </div>
        ) : status === 'connecting' ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <Loader2 className="h-10 w-10 animate-spin text-[var(--luigi-green)] mb-4" />
            <div className={marioStyles.heading(4)}>Connecting to chat...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className={cn(
              marioStyles.emptyStateIcon('var(--sky-blue)', 'w-20 h-20'),
              'to-[var(--super-blue)]'
            )}>
              💬
            </div>
            <div className={marioStyles.heading(4)}>No messages yet</div>
            <div className={cn(marioStyles.bodyText('medium'), 'text-sm opacity-70')}>
              Be the first to say something!
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
      <div className="p-4 border-t-4 border-[var(--outline-black)] bg-gradient-to-r from-white to-[var(--sky-blue)]/10 flex-shrink-0 shadow-[0_-4px_0_rgba(0,0,0,0.05)]">
        <div className="flex gap-2 items-end">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={user ? 'Type a message...' : 'Sign in to chat'}
            disabled={!user || status !== 'connected'}
            className={cn(marioStyles.input(), 'flex-1 min-w-0')}
            maxLength={280}
          />
          <EmojiPicker onEmojiSelect={handleEmojiSelect} />
          <Button
            onClick={handleSendMessage}
            disabled={!user || !inputValue.trim() || status !== 'connected'}
            className={cn(marioStyles.button('success'), 'flex-shrink-0')}
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

      {/* User Moderation Sheet */}
      <UserModerationSheet
        userId={selectedUserId}
        open={moderationSheetOpen}
        onOpenChange={setModerationSheetOpen}
      />
    </div>
  )
}
