/**
 * Chat Context
 *
 * Provides global chat state management with:
 * - Message history
 * - Real-time updates
 * - Connection status
 * - Room management
 */

'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useChatWebSocket, ChatMessage, ConnectionStatus } from '@/hooks/useChatWebSocket';

/**
 * Chat context value
 */
interface ChatContextValue {
  messages: ChatMessage[];
  status: ConnectionStatus;
  error: string | null;
  participantCount: number;
  currentRoom: string | null;
  joinRoom: (roomId: string) => void;
  leaveRoom: () => void;
  sendMessage: (content: string) => void;
  clearError: () => void;
}

/**
 * Chat context
 */
const ChatContext = createContext<ChatContextValue | undefined>(undefined);

/**
 * Chat provider props
 */
interface ChatProviderProps {
  children: React.ReactNode;
  roomId?: string; // Auto-join this room on mount
}

/**
 * Chat provider component
 */
export function ChatProvider({ children, roomId }: ChatProviderProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle new message
   */
  const handleMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => {
      // Prevent duplicates
      if (prev.some((m) => m.id === message.id)) {
        return prev;
      }
      return [...prev, message];
    });
  }, []);

  /**
   * Handle message history
   */
  const handleHistory = useCallback((newMessages: ChatMessage[]) => {
    setMessages(newMessages);
  }, []);

  /**
   * Handle error
   */
  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);

    // Auto-clear error after 5 seconds
    setTimeout(() => {
      setError(null);
    }, 5000);
  }, []);

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
  });

  /**
   * Join a room
   */
  const joinRoom = useCallback((roomId: string) => {
    // Leave current room first
    if (currentRoom && currentRoom !== roomId) {
      wsLeaveRoom(currentRoom);
    }

    // Clear messages when switching rooms
    setMessages([]);
    setCurrentRoom(roomId);
    wsJoinRoom(roomId);
  }, [currentRoom, wsJoinRoom, wsLeaveRoom]);

  /**
   * Leave current room
   */
  const leaveRoom = useCallback(() => {
    if (currentRoom) {
      wsLeaveRoom(currentRoom);
      setCurrentRoom(null);
      setMessages([]);
    }
  }, [currentRoom, wsLeaveRoom]);

  /**
   * Send message to current room
   */
  const sendMessage = useCallback((content: string) => {
    if (!currentRoom) {
      console.error('No room joined');
      return;
    }
    wsSendMessage(currentRoom, content);
  }, [currentRoom, wsSendMessage]);

  /**
   * Clear error message
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Auto-join room if provided
   */
  useEffect(() => {
    if (roomId && status === 'connected' && currentRoom !== roomId) {
      joinRoom(roomId);
    }
  }, [roomId, status, currentRoom, joinRoom]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (currentRoom) {
        wsLeaveRoom(currentRoom);
      }
    };
  }, [currentRoom, wsLeaveRoom]);

  const value: ChatContextValue = {
    messages,
    status,
    error,
    participantCount,
    currentRoom,
    joinRoom,
    leaveRoom,
    sendMessage,
    clearError,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

/**
 * Use chat context hook
 */
export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
