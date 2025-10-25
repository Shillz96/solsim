/**
 * Chat WebSocket Hook
 *
 * Manages WebSocket connection for real-time chat with:
 * - Auto-reconnection with exponential backoff
 * - Message queue for offline messages
 * - Room subscription management
 * - Error handling and connection status
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';

/**
 * Chat message structure
 */
export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    handle: string;
    displayName: string | null;
    avatarUrl: string | null;
    userTier: string;
    userBadges?: Array<{
      id: string;
      badge: {
        id: string;
        name: string;
        displayName: string;
        description: string;
        iconUrl: string | null;
        category: string;
      };
    }>;
  };
}

/**
 * WebSocket message types
 */
type WSMessage =
  | { type: 'connected'; userId: string; handle: string; timestamp: number }
  | { type: 'message'; roomId: string; message: ChatMessage; timestamp: number }
  | { type: 'message_history'; roomId: string; messages: ChatMessage[]; timestamp: number }
  | { type: 'user_joined'; roomId: string; userId: string; handle: string; participantCount: number }
  | { type: 'user_left'; roomId: string; userId: string; handle: string; participantCount: number }
  | { type: 'error'; error: string; timestamp: number }
  | { type: 'rate_limited'; error: string; timestamp: number }
  | { type: 'banned'; error: string }
  | { type: 'pong'; timestamp: number };

/**
 * Connection status
 */
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

/**
 * Hook options
 */
interface UseChatWebSocketOptions {
  onMessage?: (message: ChatMessage) => void;
  onHistory?: (messages: ChatMessage[]) => void;
  onError?: (error: string) => void;
  onStatusChange?: (status: ConnectionStatus) => void;
  onParticipantCountChange?: (count: number) => void;
}

/**
 * Chat WebSocket hook
 */
export function useChatWebSocket(options: UseChatWebSocketOptions = {}) {
  const { user } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [participantCount, setParticipantCount] = useState(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10; // Maximum reconnection attempts
  const isManuallyDisconnectedRef = useRef(false);
  const currentRoomRef = useRef<string | null>(null);
  const messageQueueRef = useRef<Array<any>>([]);

  // Get WebSocket URL from environment
  const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000';

  /**
   * Update status and notify
   */
  const updateStatus = useCallback(
    (newStatus: ConnectionStatus) => {
      setStatus(newStatus);
      options.onStatusChange?.(newStatus);
    },
    [options]
  );

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    
    if (!token) {
      console.warn('No access token available for chat WebSocket');
      return;
    }

    // Don't reconnect if already connected or connecting
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    updateStatus('connecting');
    console.log('💬 Connecting to chat WebSocket...');

    try {
      // Strip any existing paths from WS_URL to get base URL
      const baseUrl = WS_URL.replace(/\/(ws\/)?prices?\/?$/, '');
      const ws = new WebSocket(`${baseUrl}/ws/chat?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ Chat WebSocket connected');
        updateStatus('connected');
        reconnectAttemptsRef.current = 0;
        setError(null);

        // Rejoin room if we were in one
        if (currentRoomRef.current) {
          const roomId = currentRoomRef.current;
          ws.send(JSON.stringify({ type: 'join_room', roomId }));
        }

        // Send queued messages
        while (messageQueueRef.current.length > 0) {
          const queued = messageQueueRef.current.shift();
          if (queued) {
            ws.send(JSON.stringify(queued));
          }
        }
      };

      ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);

          switch (message.type) {
            case 'connected':
              console.log(`💬 Chat connected as ${message.handle}`);
              break;

            case 'message':
              options.onMessage?.(message.message);
              break;

            case 'message_history':
              options.onHistory?.(message.messages);
              break;

            case 'user_joined':
            case 'user_left':
              setParticipantCount(message.participantCount);
              options.onParticipantCountChange?.(message.participantCount);
              break;

            case 'error':
              console.error('Chat error:', message.error);
              setError(message.error);
              options.onError?.(message.error);
              break;

            case 'rate_limited':
              console.warn('Rate limited:', message.error);
              setError(message.error);
              options.onError?.(message.error);
              break;

            case 'banned':
              console.error('Banned from chat:', message.error);
              setError(message.error);
              options.onError?.(message.error);
              updateStatus('error');
              ws.close();
              break;

            case 'pong':
              // Heartbeat response
              break;

            default:
              console.log('Unknown message type:', message);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (event) => {
        console.error('💬 Chat WebSocket error:', event);
        updateStatus('error');
        setError('Connection error');
      };

      ws.onclose = () => {
        console.log('💬 Chat WebSocket closed');
        updateStatus('disconnected');

        // Only reconnect if not manually disconnected and under max attempts
        if (!isManuallyDisconnectedRef.current && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setError('Failed to connect after multiple attempts');
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      updateStatus('error');
      setError('Failed to connect to chat server');
    }
  }, [user, WS_URL, options, updateStatus]);

  /**
   * Disconnect from WebSocket
   */
  const disconnect = useCallback(() => {
    isManuallyDisconnectedRef.current = true;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    updateStatus('disconnected');
  }, [updateStatus]);

  /**
   * Join a chat room
   */
  const joinRoom = useCallback((roomId: string) => {
    currentRoomRef.current = roomId;

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log(`💬 Sending join_room for: ${roomId}`);
      wsRef.current.send(JSON.stringify({ type: 'join_room', roomId }));
    } else {
      // Queue message if not connected (use same format as direct send)
      console.log(`💬 Queueing join_room for: ${roomId}`);
      messageQueueRef.current.push({ type: 'join_room', roomId });
    }
  }, []);

  /**
   * Leave a chat room
   */
  const leaveRoom = useCallback((roomId: string) => {
    if (currentRoomRef.current === roomId) {
      currentRoomRef.current = null;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'leave_room', roomId }));
    }
  }, []);

  /**
   * Send a message
   */
  const sendMessage = useCallback((roomId: string, content: string) => {
    if (!content.trim()) {
      return;
    }

    const message = { type: 'send_message', roomId, content };

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      // Queue message if not connected (use same format as direct send)
      messageQueueRef.current.push(message);
      setError('Not connected. Message will be sent when connection is restored.');
    }
  }, []);

  /**
   * Auto-connect when user logs in
   * Only re-run when user object changes, not when connect/disconnect functions change
   */
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (user && token) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
    // Only depend on user, not the callback functions to prevent reconnection loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  /**
   * Heartbeat ping every 20 seconds
   */
  useEffect(() => {
    if (status !== 'connected') return;

    const interval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 20000);

    return () => clearInterval(interval);
  }, [status]);

  // Manual reconnect function
  const manualReconnect = useCallback(() => {
    console.log('💬 Manual reconnect requested');
    disconnect(); // Clean up existing connection
    reconnectAttemptsRef.current = 0; // Reset attempts
    isManuallyDisconnectedRef.current = false;
    setTimeout(() => connect(), 100); // Small delay to ensure cleanup
  }, [connect, disconnect]);

  return {
    status,
    error,
    participantCount,
    joinRoom,
    leaveRoom,
    sendMessage,
    reconnect: manualReconnect,
    disconnect,
    reconnectAttempts: reconnectAttemptsRef.current,
    maxReconnectAttempts,
  };
}
