import { useState, useEffect, useCallback, useRef } from 'react'
import type { WalletActivity } from '@/components/wallet-tracker/types'

export function useWalletTrackerWebSocket(userId: string) {
  const [connected, setConnected] = useState(false)
  const [newActivities, setNewActivities] = useState<WalletActivity[]>([])
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const pingIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined)

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    // Get base WS URL and remove any existing path segments
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000'
    const baseUrl = wsUrl.replace(/\/(ws\/)?prices?\/?$/, '')
    const ws = new WebSocket(`${baseUrl}/ws/wallet-tracker`)

    ws.onopen = () => {
      console.log('Wallet tracker WebSocket connected')
      setConnected(true)

      // Authenticate
      if (userId) {
        ws.send(JSON.stringify({
          type: 'auth',
          userId
        }))
      }

      // Start ping interval
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }))
        }
      }, 30000)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        switch (data.type) {
          case 'new_activities':
            setNewActivities(data.activities)
            break
          case 'initial_activities':
            // Initial activities are handled differently
            break
          case 'authenticated':
            console.log('Authenticated with wallet tracker')
            break
          case 'pong':
            // Pong received
            break
          default:
            console.log('Unknown message type:', data.type)
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    ws.onclose = () => {
      console.log('WebSocket disconnected')
      setConnected(false)
      wsRef.current = null

      // Clear intervals
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current)
      }

      // Reconnect after 5 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('Attempting to reconnect...')
        connect()
      }, 5000)
    }

    wsRef.current = ws
  }, [userId])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setConnected(false)
  }, [])

  const subscribe = useCallback((wallets: string[]) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        wallets
      }))
    }
  }, [])

  const unsubscribe = useCallback((wallets: string[]) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribe',
        wallets
      }))
    }
  }, [])

  useEffect(() => {
    if (userId) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [userId])

  return {
    connected,
    newActivities,
    subscribe,
    unsubscribe,
    reconnect: connect
  }
}