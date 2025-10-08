import { useState, useEffect, useRef, useCallback } from 'react'
import { PriceUpdateMessage } from './types/api-types'

interface UsePriceStreamOptions {
  enabled?: boolean
  autoReconnect?: boolean
  maxReconnectAttempts?: number
}

interface PriceStreamHook {
  connected: boolean
  connecting: boolean
  error: string | null
  subscribe: (tokenAddress: string) => void
  unsubscribe: (tokenAddress: string) => void
  subscribeMany: (tokenAddresses: string[]) => void
  unsubscribeMany: (tokenAddresses: string[]) => void
  prices: Map<string, { price: number; change24h: number; timestamp: number }>
  reconnect: () => void
}

// Construct WebSocket URL properly for all deployment environments
const getWebSocketURL = () => {
  // Use explicit WebSocket URL if provided (for production)
  if (process.env.NEXT_PUBLIC_WS_URL) {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL
    return wsUrl.endsWith('/price-stream') ? wsUrl : `${wsUrl}/price-stream`
  }
  
  // Fallback to constructing from API URL
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4002'
  
  // For local development, use dedicated WebSocket port
  if (baseUrl.includes('localhost')) {
    return 'ws://localhost:4001/price-stream'
  }
  
  // For production deployments (Railway, etc.), use same domain with WS protocol
  const wsBaseUrl = baseUrl.replace(/^https?:\/\//, (match) => 
    match === 'https://' ? 'wss://' : 'ws://'
  )
  
  return `${wsBaseUrl}/price-stream`
}

const WEBSOCKET_URL = getWebSocketURL()

export function usePriceStream(options: UsePriceStreamOptions = {}): PriceStreamHook {
  const {
    enabled = true,
    autoReconnect = true,
    maxReconnectAttempts = 3 // Reduced from 5 to 3
  } = options

  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [prices, setPrices] = useState<Map<string, { price: number; change24h: number; timestamp: number }>>(new Map())

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttempts = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const subscriptionsRef = useRef<Set<string>>(new Set())

  const connect = useCallback(() => {
    // Prevent multiple connection attempts
    if (!enabled || connecting || connected || wsRef.current) return

    setConnecting(true)
    setError(null)

    try {
      const ws = new WebSocket(WEBSOCKET_URL)
      wsRef.current = ws

      ws.onopen = () => {
        setConnected(true)
        setConnecting(false)
        setError(null)
        reconnectAttempts.current = 0

        // Resubscribe to previous subscriptions
        subscriptionsRef.current.forEach(tokenAddress => {
          ws.send(JSON.stringify({
            type: 'subscribe',
            tokenAddress
          }))
        })
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          
          if (message.type === 'price_update') {
            const { tokenAddress, price, change24h, timestamp } = message
            setPrices(prev => new Map(prev.set(tokenAddress, { price, change24h, timestamp })))
          }
          else if (message.type === 'price_batch') {
            const updates = message.updates
            setPrices(prev => {
              const newPrices = new Map(prev)
              updates.forEach((update: any) => {
                newPrices.set(update.tokenAddress, {
                  price: update.price,
                  change24h: update.change24h,
                  timestamp: update.timestamp
                })
              })
              return newPrices
            })
          }
          else if (message.type === 'welcome') {
            // Connection established successfully
          }
          else if (message.type === 'subscribed') {
            // Subscription confirmed for token
          }
          else if (message.type === 'subscription_confirmed') {
            // Already subscribed - this is fine (handles reconnection)
          }
          else if (message.type === 'error') {
            console.error('WebSocket server error:', message.message)
            setError(message.message)
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err)
        }
      }

      ws.onclose = (event) => {
        setConnected(false)
        setConnecting(false)
        wsRef.current = null

        // Auto-reconnect if enabled and not a clean close - with more conservative logic
        if (autoReconnect && event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(2000 * Math.pow(2, reconnectAttempts.current), 30000) // Slower exponential backoff, min 2s
          reconnectAttempts.current++
          
          reconnectTimeoutRef.current = setTimeout(() => {
            // Double-check we're still disconnected before reconnecting
            if (!wsRef.current && !connecting && enabled) {
              connect()
            }
          }, delay)
        }
      }

      ws.onerror = (error) => {
        console.error('Price stream error:', error)
        setError('WebSocket connection error')
        setConnecting(false)
      }

    } catch (err) {
      console.error('Failed to create WebSocket connection:', err)
      setError('Failed to connect to price stream')
      setConnecting(false)
    }
  }, [enabled]) // Remove problematic dependencies

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect')
      wsRef.current = null
    }

    setConnected(false)
    setConnecting(false)
  }, [])

  const subscribe = useCallback((tokenAddress: string) => {
    // Prevent duplicate subscriptions
    if (subscriptionsRef.current.has(tokenAddress)) {
      return
    }
    
    subscriptionsRef.current.add(tokenAddress)
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        tokenAddress
      }))
    }
  }, [])

  const unsubscribe = useCallback((tokenAddress: string) => {
    subscriptionsRef.current.delete(tokenAddress)
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribe',
        tokenAddress
      }))
    }

    // Remove price from local state
    setPrices(prev => {
      const newPrices = new Map(prev)
      newPrices.delete(tokenAddress)
      return newPrices
    })
  }, [])

  const subscribeMany = useCallback((tokenAddresses: string[]) => {
    if (!tokenAddresses || tokenAddresses.length === 0) return
    
    // Filter out tokens already subscribed
    const newTokens = tokenAddresses.filter(addr => !subscriptionsRef.current.has(addr))
    if (newTokens.length === 0) return
    
    // Add to subscription set
    newTokens.forEach(addr => subscriptionsRef.current.add(addr))
    
    // Send batch subscription if connected
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      newTokens.forEach(tokenAddress => {
        wsRef.current?.send(JSON.stringify({
          type: 'subscribe',
          tokenAddress
        }))
      })
    }
  }, [])

  const unsubscribeMany = useCallback((tokenAddresses: string[]) => {
    if (!tokenAddresses || tokenAddresses.length === 0) return
    
    // Remove from subscription set
    tokenAddresses.forEach(addr => subscriptionsRef.current.delete(addr))
    
    // Send batch unsubscribe if connected
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      tokenAddresses.forEach(tokenAddress => {
        wsRef.current?.send(JSON.stringify({
          type: 'unsubscribe',
          tokenAddress
        }))
      })
    }

    // Remove prices from local state
    setPrices(prev => {
      const newPrices = new Map(prev)
      tokenAddresses.forEach(addr => newPrices.delete(addr))
      return newPrices
    })
  }, [])

  const reconnect = useCallback(() => {
    disconnect()
    setTimeout(connect, 100)
  }, [disconnect, connect])

  // Auto-connect when enabled and cleanup on unmount
  useEffect(() => {
    if (enabled) {
      connect()
    } else {
      disconnect()
    }

    return () => {
      disconnect()
    }
  }, [enabled, connect, disconnect])

  return {
    connected,
    connecting,
    error,
    subscribe,
    unsubscribe,
    subscribeMany,
    unsubscribeMany,
    prices,
    reconnect
  }
}