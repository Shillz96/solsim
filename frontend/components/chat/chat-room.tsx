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
      <div className="flex items-center justify-between mb-3 pb-3 border-b-3 border-[var(--outline-black)]">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-[var(--color-luigi)] border-3 border-[var(--outline-black)] flex items-center justify-center shadow-[2px_2px_0_var(--outline-black)]">
            <Users className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold uppercase">Chat</span>
        </div>
        <div className="flex items-center gap-2">
          {canModerate && (
            <span className="mario-badge bg-[var(--color-star)] text-[var(--outline-black)] text-xs">MOD</span>
          )}
          <span className={cn(
            "mario-badge text-white text-xs",
            status === 'connected' ? "bg-[var(--color-luigi)]" : "bg-[var(--outline-black)]/50"
          )}>
            {status === 'connected' ? 'Connected' : 'Connecting...'}
          </span>
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
        className="flex-1 flex flex-col items-center justify-center chat-scrollbar overflow-y-auto mb-3 px-2 py-6"
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
      <div className="flex gap-2 mt-auto">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={user ? 'Type a message...' : 'Sign in to chat'}
          disabled={!user || status !== 'connected'}
          className="flex-1 px-3 py-2.5 text-sm rounded-lg border-3 border-[var(--outline-black)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-star)] shadow-[2px_2px_0_var(--outline-black)]"
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
