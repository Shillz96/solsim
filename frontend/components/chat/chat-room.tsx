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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Send, Users, AlertCircle, Wifi, WifiOff } from 'lucide-react'
import { cn, marioStyles } from '@/lib/utils'

interface ChatRoomProps {
  tokenMint: string
  className?: string
}

export function ChatRoom({ tokenMint, className }: ChatRoomProps) {
  const { user } = useAuth()
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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

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
        marioStyles.headerGradient('var(--luigi-green)', 'emerald-500')
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(marioStyles.iconContainer('md', 'white'), 'text-xl')}>
            💬
          </div>
          <div>
            <div className={marioStyles.heading(4)}>Chat Room</div>
            <div className={cn(marioStyles.bodyText('bold'), 'text-xs text-white/90 flex items-center gap-1.5')}>
              <Users className="h-3.5 w-3.5" />
              <span>{participantCount > 0 ? `${participantCount} online` : 'Loading...'}</span>
            </div>
          </div>
        </div>

        {/* Connection Status */}
        <div className="flex items-center gap-2">
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
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-br from-[var(--sky-blue)]/10 via-[var(--background)] to-[var(--luigi-green)]/5 chat-scrollbar"
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
            {messages.map((msg) => {
              const isOwnMessage = msg.userId === user?.id
              const timestamp = new Date(msg.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })

              return (
                <div
                  key={msg.id}
                  className={cn(
                    marioStyles.card(true),
                    isOwnMessage && 'bg-gradient-to-br from-[var(--sky-blue)]/30 to-[var(--sky-blue)]/10 border-[var(--sky-blue)]'
                  )}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    {/* Avatar */}
                    <div className={marioStyles.avatar('sm')}>
                      <img
                        src={isOwnMessage ? "/icons/mario/money-bag.png" : "/icons/mario/user.png"}
                        alt={isOwnMessage ? "Money Bag" : "User"}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    {/* Username */}
                    <div className={cn(marioStyles.bodyText('bold'), 'text-sm')}>
                      {msg.user.displayName || `@${msg.user.handle}`}
                    </div>

                    {/* User Badges */}
                    {msg.user.userBadges && msg.user.userBadges.length > 0 && (
                      <div className="flex items-center gap-1">
                        {msg.user.userBadges.slice(0, 2).map((userBadge) => (
                          <div
                            key={userBadge.id}
                            title={userBadge.badge.displayName}
                            className={marioStyles.badge}
                          >
                            {userBadge.badge.iconUrl ? (
                              <img
                                src={userBadge.badge.iconUrl}
                                alt={userBadge.badge.displayName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-[8px]">🏆</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Tier Badge */}
                    {msg.user.userTier === 'ADMINISTRATOR' && (
                      <div className={marioStyles.badgeLg('admin')}>
                        ADMIN
                      </div>
                    )}

                    {/* Timestamp */}
                    <div className={cn(marioStyles.bodyText('medium'), 'text-[11px] opacity-60 ml-auto')}>
                      {timestamp}
                    </div>
                  </div>

                  {/* Message Content */}
                  <div className={cn(marioStyles.bodyText('medium'), 'text-sm whitespace-pre-wrap break-words leading-relaxed')}>
                    {msg.content}
                  </div>
                </div>
              )
            })}
          </>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t-4 border-[var(--outline-black)] bg-gradient-to-r from-white to-[var(--sky-blue)]/10 flex-shrink-0 shadow-[0_-4px_0_rgba(0,0,0,0.05)]">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={user ? 'Type a message...' : 'Sign in to chat'}
            disabled={!user || status !== 'connected'}
            className={cn(marioStyles.input(), 'flex-1')}
            maxLength={280}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!user || !inputValue.trim() || status !== 'connected'}
            className={marioStyles.button('success')}
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
    </div>
  )
}
