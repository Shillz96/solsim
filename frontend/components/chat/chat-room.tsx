'use client'

/**
 * Chat Room Component
 * 
 * Token-specific chat with:
 * - SIWS (Sign In With Solana) authentication
 * - Real-time WebSocket messages
 * - Auto-scroll to latest
 * - Emoji support
 * - Rate limiting UI
 * - Mario theme styling
 */

import { useState, useEffect, useRef } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Send, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatRoomProps {
  tokenMint: string
  className?: string
}

interface ChatMessage {
  id: string
  wallet: string
  content: string
  timestamp: Date
}

export function ChatRoom({ tokenMint, className }: ChatRoomProps) {
  const { connected, publicKey } = useWallet()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // TODO: Implement WebSocket connection
  // useEffect(() => {
  //   if (!connected || !publicKey) return
  //   
  //   // Connect to chat WebSocket
  //   const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}/chat?token=${tokenMint}`)
  //   
  //   ws.onmessage = (event) => {
  //     const message = JSON.parse(event.data)
  //     setMessages(prev => [...prev, message])
  //   }
  //   
  //   return () => ws.close()
  // }, [connected, publicKey, tokenMint])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isSending || !connected) return

    setIsSending(true)
    try {
      // TODO: Send message via WebSocket
      // await sendChatMessage(tokenMint, inputValue)
      setInputValue('')
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

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
              <span>Coming Soon</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-[var(--background)]">
        {!connected ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <div className="w-16 h-16 rounded-full bg-[var(--pipe-100)] border-3 border-[var(--outline-black)] flex items-center justify-center mb-3">
              🔒
            </div>
            <div className="font-bold text-sm mb-1">Connect Wallet to Chat</div>
            <div className="text-xs text-muted-foreground">
              Sign in with your Solana wallet to join the conversation
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <div className="w-16 h-16 rounded-full bg-[var(--star-yellow)] border-3 border-[var(--outline-black)] flex items-center justify-center mb-3 shadow-[3px_3px_0_var(--outline-black)]">
              🚧
            </div>
            <div className="font-bold text-sm mb-1">Chat Coming Soon</div>
            <div className="text-xs text-muted-foreground mb-3">
              Token-specific chat rooms with SIWS authentication
            </div>
            <div className="text-[10px] text-muted-foreground bg-muted p-2 rounded border-2 border-[var(--outline-black)]">
              <strong>Features:</strong> Real-time messages • Anti-spam protection • Emoji support • Moderation
            </div>
          </div>
        )}

        {/* Example messages (when implemented) */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className="p-2 bg-white rounded-lg border-2 border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)]"
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="text-xs font-bold font-mono text-[var(--luigi-green)]">
                {msg.wallet.slice(0, 4)}...{msg.wallet.slice(-4)}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
            </div>
            <div className="text-sm">{msg.content}</div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 border-t-3 border-[var(--outline-black)] bg-white flex-shrink-0">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={connected ? "Type a message..." : "Connect wallet to chat"}
            disabled={!connected || isSending}
            className="flex-1 border-2 border-[var(--outline-black)]"
            maxLength={280}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!connected || !inputValue.trim() || isSending}
            className="border-2 border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] hover:shadow-[3px_3px_0_var(--outline-black)] transition-all"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        {connected && inputValue && (
          <div className="text-[10px] text-muted-foreground mt-1 text-right">
            {inputValue.length}/280
          </div>
        )}
      </div>
    </div>
  )
}
