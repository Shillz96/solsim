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
import { cn } from '@/lib/utils'

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
    'var(--pipe-300)'

  const StatusIcon = status === 'connected' || status === 'connecting' ? Wifi : WifiOff

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Chat Header */}
      <div className="p-4 border-b-4 border-[var(--outline-black)] bg-gradient-to-r from-[var(--luigi-green)] to-emerald-500 flex items-center justify-between flex-shrink-0 shadow-[0_4px_0_var(--outline-black)]">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-white border-3 border-[var(--outline-black)] flex items-center justify-center shadow-[3px_3px_0_var(--outline-black)] text-xl">
            💬
          </div>
          <div>
            <div className="font-mario font-bold text-base text-white">Chat Room</div>
            <div className="text-xs text-white/90 flex items-center gap-1.5 font-bold">
              <Users className="h-3.5 w-3.5" />
              <span>{participantCount > 0 ? `${participantCount} online` : 'Loading...'}</span>
            </div>
          </div>
        </div>

        {/* Connection Status */}
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-3 border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)]"
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
        <div className="p-3 bg-[var(--mario-red)] border-b-4 border-[var(--outline-black)] flex items-center gap-2 flex-shrink-0 shadow-[0_4px_0_rgba(0,0,0,0.2)]">
          <AlertCircle className="h-4 w-4 text-white" />
          <span className="text-sm text-white font-bold flex-1">{error}</span>
          <button
            onClick={clearError}
            className="text-white hover:text-[var(--star-yellow)] transition-colors text-lg font-bold"
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
            <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-[var(--pipe-green)] to-[var(--luigi-green)] border-4 border-[var(--outline-black)] flex items-center justify-center mb-4 shadow-[4px_4px_0_var(--outline-black)] text-3xl">
              🔒
            </div>
            <div className="font-mario font-bold text-base mb-2">Sign In to Chat</div>
            <div className="text-sm text-[var(--outline-black)] opacity-70 font-medium">
              Sign in to join the conversation
            </div>
          </div>
        ) : status === 'connecting' ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <Loader2 className="h-10 w-10 animate-spin text-[var(--luigi-green)] mb-4" />
            <div className="font-mario font-bold text-base">Connecting to chat...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-[var(--sky-blue)] to-[var(--super-blue)] border-4 border-[var(--outline-black)] flex items-center justify-center mb-4 shadow-[4px_4px_0_var(--outline-black)] text-3xl">
              💬
            </div>
            <div className="font-mario font-bold text-base mb-2">No messages yet</div>
            <div className="text-sm text-[var(--outline-black)] opacity-70 font-medium">
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
                    'p-3 bg-white rounded-xl border-3 border-[var(--outline-black)] shadow-[3px_3px_0_var(--outline-black)] transition-all hover:shadow-[4px_4px_0_var(--outline-black)] hover:-translate-y-0.5',
                    isOwnMessage && 'bg-gradient-to-br from-[var(--sky-blue)]/30 to-[var(--sky-blue)]/10 border-[var(--sky-blue)]'
                  )}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    {/* Avatar */}
                    <div className="h-6 w-6 rounded-full border-3 border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] overflow-hidden">
                      <img
                        src={isOwnMessage ? "/icons/mario/money-bag.png" : "/icons/mario/user.png"}
                        alt={isOwnMessage ? "Money Bag" : "User"}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    {/* Username */}
                    <div className="text-sm font-bold text-[var(--outline-black)]">
                      {msg.user.displayName || `@${msg.user.handle}`}
                    </div>

                    {/* User Badges */}
                    {msg.user.userBadges && msg.user.userBadges.length > 0 && (
                      <div className="flex items-center gap-1">
                        {msg.user.userBadges.slice(0, 2).map((userBadge) => (
                          <div
                            key={userBadge.id}
                            title={userBadge.badge.displayName}
                            className="h-4 w-4 rounded-full border-2 border-[var(--outline-black)] bg-white flex items-center justify-center overflow-hidden shadow-[1px_1px_0_var(--outline-black)]"
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
                      <div className="px-2 py-0.5 rounded-md bg-[var(--mario-red)] border-2 border-[var(--outline-black)] text-[10px] font-mario font-bold text-white shadow-[2px_2px_0_var(--outline-black)]">
                        ADMIN
                      </div>
                    )}

                    {/* Timestamp */}
                    <div className="text-[11px] text-[var(--outline-black)] opacity-60 ml-auto font-medium">
                      {timestamp}
                    </div>
                  </div>

                  {/* Message Content */}
                  <div className="text-sm whitespace-pre-wrap break-words font-medium text-[var(--outline-black)] leading-relaxed">
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
            className="flex-1 border-3 border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] focus:shadow-[3px_3px_0_var(--outline-black)] transition-all rounded-lg font-medium"
            maxLength={280}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!user || !inputValue.trim() || status !== 'connected'}
            className="bg-[var(--luigi-green)] hover:bg-[var(--pipe-green)] border-3 border-[var(--outline-black)] shadow-[3px_3px_0_var(--outline-black)] hover:shadow-[4px_4px_0_var(--outline-black)] hover:-translate-y-0.5 transition-all text-white font-bold px-4"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        {user && inputValue && (
          <div className="text-xs text-[var(--outline-black)] opacity-60 mt-2 text-right font-medium">
            {inputValue.length}/280
          </div>
        )}
      </div>
    </div>
  )
}
