'use client'

/**
 * Chat Room Component
 *
 * Token-specific chat with:
 * - SIWS (Sign In With Solana) authentication via JWT
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

  // Join room when component mounts
  useEffect(() => {
    if (user && status === 'connected' && currentRoom !== tokenMint) {
      joinRoom(tokenMint)
    }
  }, [user, status, tokenMint, currentRoom, joinRoom])

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
      <div className="p-3 border-b-3 border-[var(--outline-black)] bg-white flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-[var(--luigi-green)] border-2 border-[var(--outline-black)] flex items-center justify-center">
            💬
          </div>
          <div>
            <div className="font-bold text-sm">Chat Room</div>
            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>{participantCount > 0 ? `${participantCount} online` : 'Loading...'}</span>
            </div>
          </div>
        </div>

        {/* Connection Status */}
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1 px-2 py-1 rounded border-2 border-[var(--outline-black)]"
            style={{ backgroundColor: statusColor }}
          >
            <StatusIcon className="h-3 w-3 text-white" />
            <span className="text-[10px] font-bold text-white capitalize">
              {status}
            </span>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-2 bg-[var(--mario-red)] border-b-3 border-[var(--outline-black)] flex items-center gap-2 flex-shrink-0">
          <AlertCircle className="h-4 w-4 text-white" />
          <span className="text-xs text-white font-bold flex-1">{error}</span>
          <button
            onClick={clearError}
            className="text-white hover:text-[var(--star-yellow)] transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-3 space-y-2 bg-[var(--background)]"
      >
        {!user ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <div className="w-16 h-16 rounded-full bg-[var(--pipe-100)] border-3 border-[var(--outline-black)] flex items-center justify-center mb-3">
              🔒
            </div>
            <div className="font-bold text-sm mb-1">Sign In to Chat</div>
            <div className="text-xs text-muted-foreground">
              Sign in to join the conversation
            </div>
          </div>
        ) : status === 'connecting' ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--luigi-green)] mb-3" />
            <div className="font-bold text-sm">Connecting to chat...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <div className="w-16 h-16 rounded-full bg-[var(--sky-blue)] border-3 border-[var(--outline-black)] flex items-center justify-center mb-3">
              💬
            </div>
            <div className="font-bold text-sm mb-1">No messages yet</div>
            <div className="text-xs text-muted-foreground">
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
                    'p-2 bg-white rounded-lg border-2 border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)]',
                    isOwnMessage && 'bg-[var(--sky-blue)] bg-opacity-20'
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {/* Avatar */}
                    {msg.user.avatarUrl ? (
                      <img
                        src={msg.user.avatarUrl}
                        alt={msg.user.handle}
                        className="h-5 w-5 rounded-full border-2 border-[var(--outline-black)]"
                      />
                    ) : (
                      <div className="h-5 w-5 rounded-full bg-[var(--luigi-green)] border-2 border-[var(--outline-black)] flex items-center justify-center text-[10px]">
                        {msg.user.handle[0].toUpperCase()}
                      </div>
                    )}

                    {/* Username */}
                    <div className="text-xs font-bold text-[var(--outline-black)]">
                      {msg.user.displayName || `@${msg.user.handle}`}
                    </div>

                    {/* Tier Badge */}
                    {msg.user.userTier === 'ADMINISTRATOR' && (
                      <div className="px-1 py-0.5 rounded bg-[var(--mario-red)] border border-[var(--outline-black)] text-[10px] font-bold text-white">
                        ADMIN
                      </div>
                    )}

                    {/* Timestamp */}
                    <div className="text-[10px] text-muted-foreground ml-auto">
                      {timestamp}
                    </div>
                  </div>

                  {/* Message Content */}
                  <div className="text-sm whitespace-pre-wrap break-words">
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
      <div className="p-3 border-t-3 border-[var(--outline-black)] bg-white flex-shrink-0">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={user ? 'Type a message...' : 'Sign in to chat'}
            disabled={!user || status !== 'connected'}
            className="flex-1 border-2 border-[var(--outline-black)]"
            maxLength={280}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!user || !inputValue.trim() || status !== 'connected'}
            className="border-2 border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] hover:shadow-[3px_3px_0_var(--outline-black)] transition-all"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        {user && inputValue && (
          <div className="text-[10px] text-muted-foreground mt-1 text-right">
            {inputValue.length}/280
          </div>
        )}
      </div>
    </div>
  )
}
