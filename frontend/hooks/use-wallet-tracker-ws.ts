import { useState, useEffect, useCallback, useRef } from 'react'
import type { WalletActivity } from '@/components/wallet-tracker/types'

// Helper function for time ago
function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)

  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

// Helper function for token age (compact format like "2h", "8m", "1d")
function getTokenAge(createdAt: string | number | undefined): string | undefined {
  if (!createdAt) return undefined

  const created = typeof createdAt === 'number' ? new Date(createdAt) : new Date(createdAt)
  const seconds = Math.floor((Date.now() - created.getTime()) / 1000)

  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo`
  const years = Math.floor(months / 12)
  return `${years}y`
}

/**
 * WebSocket hook for real-time wallet tracking with PumpPortal
 * 
 * Features:
 * - Real-time trade notifications
 * - Auto-reconnection with exponential backoff
 * - Ping/pong keepalive
 * - Subscription management
 */
export function useWalletTrackerWebSocket(userId: string) {
  const [connected, setConnected] = useState(false)
  const [newActivities, setNewActivities] = useState<WalletActivity[]>([])
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const pingIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined)
  // RAF batching to prevent excessive re-renders
  const queueRef = useRef<WalletActivity[]>([])
  const rafRef = useRef<number | null>(null)

  // Flush queued activities on animation frame (max 60fps)
  const flush = useCallback(() => {
    const incoming = queueRef.current
    queueRef.current = []

    if (incoming.length > 0) {
      // Deduplicate by ID and set as new activities
      const uniqueActivities = incoming.filter((activity, index, self) =>
        index === self.findIndex(a => a.id === activity.id)
      )
      setNewActivities(uniqueActivities)
    }

    rafRef.current = null
  }, [])

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
          case 'walletTrade':
          case 'wallet:trade':
            // Real-time trade from PumpPortal - queue for RAF batching
            const trade = data.trade || data
            const activity: WalletActivity = {
              id: trade.signature || `${trade.wallet}-${trade.timestamp}`,
              walletAddress: trade.wallet,
              signature: trade.signature,
              type: trade.type,
              tokenIn: trade.type === 'BUY' ? {
                mint: 'So11111111111111111111111111111111111111112',
                symbol: 'SOL',
                amount: trade.solAmount?.toString(),
              } : {
                mint: trade.tokenMint,
                symbol: trade.tokenSymbol,
                amount: trade.tokenAmount,
                logoURI: trade.tokenLogoURI
              },
              tokenOut: trade.type === 'BUY' ? {
                mint: trade.tokenMint,
                symbol: trade.tokenSymbol,
                amount: trade.tokenAmount,
                logoURI: trade.tokenLogoURI
              } : {
                mint: 'So11111111111111111111111111111111111111112',
                symbol: 'SOL',
                amount: trade.solAmount?.toString(),
              },
              priceUsd: trade.priceUsd?.toString(),
              solAmount: trade.solAmount?.toString(),
              program: 'PumpPortal',
              marketCap: trade.marketCapUsd?.toString(),
              timestamp: new Date(trade.timestamp).toISOString(),
              timeAgo: getTimeAgo(new Date(trade.timestamp)),
              tokenCreatedAt: trade.tokenCreatedAt,
              tokenAge: getTokenAge(trade.tokenCreatedAt)
            }
            // Queue activity and schedule RAF flush
            queueRef.current.push(activity)
            if (!rafRef.current) {
              rafRef.current = requestAnimationFrame(flush)
            }
            break
          case 'new_activities':
            // Queue activities and schedule RAF flush
            if (data.activities && data.activities.length > 0) {
              queueRef.current.push(...data.activities)
              if (!rafRef.current) {
                rafRef.current = requestAnimationFrame(flush)
              }
            }
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

      // Clear intervals and RAF
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current)
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
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
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
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