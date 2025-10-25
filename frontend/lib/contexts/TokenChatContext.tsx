'use client'

/**
 * Token Chat Context
 * 
 * Separate chat context for token-specific chats that are independent
 * from the main pipe chat system. Uses token mint as room ID.
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { useChatWebSocket } from '@/hooks/useChatWebSocket'

export interface ChatMessage {
  id: string
  roomId: string
  userId: string
  content: string
  createdAt: string
  user: {
    id: string
    handle: string
    displayName: string
    avatarUrl: string | null
    userTier: string
    userBadges: Array<{
      id: string
      badge: {
        id: string
        displayName: string
        iconUrl: string | null
      }
    }>
  }
}

interface TokenChatContextType {
  messages: ChatMessage[]
  currentRoom: string | null
  status: 'disconnected' | 'connecting' | 'connected' | 'error'
  error: string | null
  participantCount: number
  joinRoom: (roomId: string) => void
  leaveRoom: () => void
  sendMessage: (content: string) => void
  clearError: () => void
}

const TokenChatContext = createContext<TokenChatContextType | undefined>(undefined)

interface TokenChatProviderProps {
  children: ReactNode
  roomId?: string // Auto-join this room on mount
}

/**
 * Token chat provider component
 */
export function TokenChatProvider({ children, roomId }: TokenChatProviderProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [currentRoom, setCurrentRoom] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  /**
   * Handle new message
   */
  const handleMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => {
      // Prevent duplicates
      if (prev.some((m) => m.id === message.id)) {
        return prev
      }
      return [...prev, message]
    })
  }, [])

  /**
   * Handle message history
   */
  const handleHistory = useCallback((newMessages: ChatMessage[]) => {
    setMessages(newMessages)
  }, [])

  /**
   * Handle error
   */
  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage)

    // Auto-clear error after 5 seconds
    setTimeout(() => {
      setError(null)
    }, 5000)
  }, [])

  /**
   * WebSocket hook
   */
  const {
    status,
    participantCount,
    joinRoom: wsJoinRoom,
    leaveRoom: wsLeaveRoom,
    sendMessage: wsSendMessage,
  } = useChatWebSocket({
    onMessage: handleMessage,
    onHistory: handleHistory,
    onError: handleError,
  })

  /**
   * Join a room
   */
  const joinRoom = useCallback((roomId: string) => {
    // Leave current room first
    if (currentRoom && currentRoom !== roomId) {
      wsLeaveRoom(currentRoom)
    }

    // Clear messages when switching rooms
    setMessages([])
    setCurrentRoom(roomId)
    wsJoinRoom(roomId)
  }, [currentRoom, wsJoinRoom, wsLeaveRoom])

  /**
   * Leave current room
   */
  const leaveRoom = useCallback(() => {
    if (currentRoom) {
      wsLeaveRoom(currentRoom)
      setCurrentRoom(null)
      setMessages([])
    }
  }, [currentRoom, wsLeaveRoom])

  /**
   * Send message to current room
   */
  const sendMessage = useCallback((content: string) => {
    if (currentRoom) {
      wsSendMessage(currentRoom, content)
    }
  }, [currentRoom, wsSendMessage])

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const value: TokenChatContextType = {
    messages,
    currentRoom,
    status,
    error,
    participantCount,
    joinRoom,
    leaveRoom,
    sendMessage,
    clearError,
  }

  return (
    <TokenChatContext.Provider value={value}>
      {children}
    </TokenChatContext.Provider>
  )
}

/**
 * Hook to use token chat context
 */
export function useTokenChat() {
  const context = useContext(TokenChatContext)
  if (context === undefined) {
    throw new Error('useTokenChat must be used within a TokenChatProvider')
  }
  return context
}
