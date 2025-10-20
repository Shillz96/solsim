"use client"

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react'
import { env } from './env'

export enum ConnectionState {
  Disconnected = 'DISCONNECTED',
  Connecting = 'CONNECTING', 
  Connected = 'CONNECTED',
  Reconnecting = 'RECONNECTING',
  Failed = 'FAILED'
}

interface PriceStreamContextType {
  connected: boolean
  connecting: boolean
  connectionState: ConnectionState
  error: string | null
  subscribe: (tokenAddress: string) => void
  unsubscribe: (tokenAddress: string) => void
  subscribeMany: (tokenAddresses: string[]) => void
  unsubscribeMany: (tokenAddresses: string[]) => void
  prices: Map<string, { price: number; change24h: number; timestamp: number }>
  reconnect: () => void
  disconnect: () => void
}

const PriceStreamContext = createContext<PriceStreamContextType | undefined>(undefined)

interface PriceStreamProviderProps {
  children: React.ReactNode
}

// WebSocket close code descriptions for better debugging
const getCloseCodeDescription = (code: number): string => {
  const codes: Record<number, string> = {
    1000: 'Normal Closure',
    1001: 'Going Away',
    1002: 'Protocol Error',
    1003: 'Unsupported Data',
    1005: 'No Status Received',
    1006: 'Abnormal Closure',
    1007: 'Invalid Frame Payload Data',
    1008: 'Policy Violation',
    1009: 'Message Too Big',
    1010: 'Mandatory Extension',
    1011: 'Internal Server Error',
    1012: 'Service Restart',
    1013: 'Try Again Later',
    1014: 'Bad Gateway',
    1015: 'TLS Handshake'
  }
  return codes[code] || `Unknown Code (${code})`
}

// Hook for managing WebSocket price stream with enhanced connection reliability
function usePriceStream(options: {
  enabled: boolean
  autoReconnect: boolean
  maxReconnectAttempts: number
}): PriceStreamContextType {
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.Disconnected)
  const [error, setError] = useState<string | null>(null)
  const [prices, setPrices] = useState(new Map<string, { price: number; change24h: number; timestamp: number }>())
  
  const wsRef = useRef<WebSocket | null>(null)
  const subscriptionsRef = useRef<Set<string>>(new Set())
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isManuallyClosedRef = useRef(false)
  const lastConnectAttemptRef = useRef<number>(0)
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const consecutiveFailuresRef = useRef(0)
  const connectionStartTimeRef = useRef<number>(0)
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Enhanced connection settings
  const MIN_RECONNECT_DELAY = 2000 // 2 seconds
  const MAX_RECONNECT_DELAY = 30000 // 30 seconds
  const CONNECTION_TIMEOUT = 15000 // 15 seconds for better Railway compatibility
  const RATE_LIMIT_DELAY = 3000 // 3 seconds between attempts
  const MAX_CONSECUTIVE_FAILURES = 5 // Allow more attempts before giving up
  const IMMEDIATE_FAILURE_THRESHOLD = 3000 // Connection lasting less than 3s is immediate failure
  const HEARTBEAT_INTERVAL = 25000 // 25 seconds heartbeat
  
  const cleanup = useCallback(() => {
    console.log('🧹 Cleaning up WebSocket connection')
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current)
      connectionTimeoutRef.current = null
    }
    
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
      heartbeatIntervalRef.current = null
    }
    
    if (wsRef.current) {
      isManuallyClosedRef.current = true
      
      // Remove event listeners to prevent callbacks during cleanup
      wsRef.current.onopen = null
      wsRef.current.onclose = null
      wsRef.current.onerror = null
      wsRef.current.onmessage = null
      
      if (wsRef.current.readyState === WebSocket.OPEN || 
          wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.close(1000, 'Client cleanup')
      }
      wsRef.current = null
    }
  }, [])
  
  const updateConnectionState = useCallback((state: ConnectionState) => {
    console.log(`🔄 Connection state: ${connectionState} → ${state}`)
    setConnectionState(state)
    setConnected(state === ConnectionState.Connected)
    setConnecting(state === ConnectionState.Connecting || state === ConnectionState.Reconnecting)
  }, [connectionState])
  
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
    }
    
    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        try {
          // Send ping message to keep connection alive
          wsRef.current.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }))
          console.log('💓 Heartbeat sent')
        } catch (err) {
          console.error('❌ Failed to send heartbeat:', err)
        }
      }
    }, HEARTBEAT_INTERVAL)
  }, [])
  
  const connect = useCallback(async () => {
    // DEBUG: Connection attempt logging
    console.log('🔍 [DEBUG] Connect function called:', {
      enabled: options.enabled,
      connectionState,
      isManuallyClosedRef: isManuallyClosedRef.current,
      wsRef: wsRef.current?.readyState,
      timeNow: Date.now(),
      NEXT_PUBLIC_WS_URL: env.NEXT_PUBLIC_WS_URL
    })
    
    // Rate limiting - prevent rapid connection attempts
    const now = Date.now()
    if (now - lastConnectAttemptRef.current < RATE_LIMIT_DELAY) {
      console.log('🚫 Connection attempt rate limited')
      return
    }
    lastConnectAttemptRef.current = now
    
    // Prevent concurrent connections or if manually disabled
    if (!options.enabled || 
        connectionState === ConnectionState.Connecting || 
        connectionState === ConnectionState.Connected || 
        isManuallyClosedRef.current) {
      return
    }
    
    // Check if we've exceeded reconnection attempts
    if (reconnectAttemptsRef.current >= options.maxReconnectAttempts) {
      setError(`Max reconnection attempts (${options.maxReconnectAttempts}) exceeded`)
      updateConnectionState(ConnectionState.Failed)
      return
    }
    
    // Check for too many consecutive immediate failures
    if (consecutiveFailuresRef.current >= MAX_CONSECUTIVE_FAILURES) {
      setError(`WebSocket server appears to be rejecting connections (${MAX_CONSECUTIVE_FAILURES} consecutive immediate failures)`)
      updateConnectionState(ConnectionState.Failed)
      console.error('🛑 Stopping reconnection attempts due to consecutive immediate failures')
      return
    }
    
    try {
      updateConnectionState(reconnectAttemptsRef.current > 0 ? ConnectionState.Reconnecting : ConnectionState.Connecting)
      setError(null)
      
      const attemptNum = reconnectAttemptsRef.current + 1
      console.log(`🔌 ${attemptNum > 1 ? 'Reconnecting' : 'Connecting'} to WebSocket (attempt ${attemptNum}/${options.maxReconnectAttempts})`)
      // URL logging disabled in production for security
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔗 Target URL: ${env.NEXT_PUBLIC_WS_URL}`)
      }
      
      connectionStartTimeRef.current = Date.now()
      
      // Create WebSocket with better error handling and browser compatibility
      let ws: WebSocket
      
      try {
        // Add small delay for Chrome compatibility
        if (typeof window !== 'undefined' && window.navigator?.userAgent?.includes('Chrome')) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
        
        // Create WebSocket with explicit protocols for better proxy/CDN compatibility
        ws = new WebSocket(env.NEXT_PUBLIC_WS_URL, ['websocket'])
        wsRef.current = ws
        
        console.log(`🔍 WebSocket created, readyState: ${ws.readyState} (CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3)`)
        
        // Small delay before setting up event listeners
        await new Promise(resolve => setTimeout(resolve, 50))
      } catch (createError) {
        console.error('❌ Failed to create WebSocket:', createError)
        throw createError
      }
      
      // Set connection timeout with generous time for Railway
      connectionTimeoutRef.current = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          console.error('⏰ WebSocket connection timeout after 15 seconds')
          ws.close()
          setError('Connection timeout - server may be unreachable')
          updateConnectionState(ConnectionState.Disconnected)
          consecutiveFailuresRef.current++
          
          if (options.autoReconnect && !isManuallyClosedRef.current) {
            scheduleReconnect()
          }
        }
      }, CONNECTION_TIMEOUT)
      
      ws.onopen = () => {
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current)
          connectionTimeoutRef.current = null
        }

        updateConnectionState(ConnectionState.Connected)
        setError(null)
        reconnectAttemptsRef.current = 0
        consecutiveFailuresRef.current = 0
        isManuallyClosedRef.current = false

        // Start heartbeat to maintain connection
        startHeartbeat()

        // Subscribe to SOL first for base price calculations
        const SOL_MINT = 'So11111111111111111111111111111111111111112'
        try {
          ws.send(JSON.stringify({ type: 'subscribe', mint: SOL_MINT }))
        } catch (err) {
          console.error('Failed to subscribe to SOL:', err)
        }

        // Resubscribe to all tokens with delay to avoid overwhelming the server
        setTimeout(() => {
          const subscriptions = Array.from(subscriptionsRef.current)
          subscriptions.forEach((address, index) => {
            setTimeout(() => {
              try {
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({ type: 'subscribe', mint: address }))
                }
              } catch (err) {
                console.error('Failed to resubscribe:', err)
              }
            }, index * 100) // Stagger subscriptions by 100ms each
          })
        }, 200)
      }
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          if (data.type === 'price' && data.mint) {
            setPrices(prev => {
              const next = new Map(prev)
              next.set(data.mint, {
                price: data.price || 0,
                change24h: data.change24h || 0,
                timestamp: Date.now()
              })
              return next
            })
          }
          // Silently handle pong and hello messages
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err)
        }
      }
      
      ws.onerror = (event) => {
        console.error('❌ WebSocket error:', event)
        
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current)
          connectionTimeoutRef.current = null
        }
        
        setError('WebSocket connection error - check network connectivity')
        updateConnectionState(ConnectionState.Disconnected)
      }
      
      ws.onclose = (event) => {
        console.log(`❌ WebSocket closed: ${event.wasClean ? 'clean' : 'unclean'} (${event.code}) - ${event.reason || 'No reason provided'}`)
        console.log(`🔍 Close code description: ${getCloseCodeDescription(event.code)}`)
        
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current)
          connectionTimeoutRef.current = null
        }
        
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current)
          heartbeatIntervalRef.current = null
        }
        
        const connectionDuration = Date.now() - connectionStartTimeRef.current
        console.log(`⏱️ Connection duration: ${connectionDuration}ms`)
        
        // Enhanced logging for immediate failures
        if (connectionDuration < IMMEDIATE_FAILURE_THRESHOLD) {
          console.error(`🚨 Immediate failure detected (${connectionDuration}ms < ${IMMEDIATE_FAILURE_THRESHOLD}ms)`)
          console.error(`🔍 This suggests server rejection or proxy/CDN issues`)
          consecutiveFailuresRef.current++
        } else {
          consecutiveFailuresRef.current = 0
        }
        
        updateConnectionState(ConnectionState.Disconnected)
        wsRef.current = null
        
        // Handle reconnection based on close reason
        if (!isManuallyClosedRef.current && options.autoReconnect) {
          // Normal closures - don't reconnect
          if (event.code === 1000 || event.code === 1001) {
            console.log('🚫 Not reconnecting due to normal closure')
            return
          }
          
          // Server errors that might be temporary
          if (event.code === 1011 || event.code === 1012 || event.code === 1013) {
            console.log('� Server error - will attempt reconnection')
          }
          
          // Stop reconnecting if too many consecutive immediate failures
          if (consecutiveFailuresRef.current >= MAX_CONSECUTIVE_FAILURES) {
            setError(`Server appears to be rejecting connections (${MAX_CONSECUTIVE_FAILURES} consecutive immediate failures). Please check your network or try again later.`)
            updateConnectionState(ConnectionState.Failed)
            console.error('🛑 Stopping reconnection attempts - server rejection pattern detected')
            return
          }
          
          if (reconnectAttemptsRef.current < options.maxReconnectAttempts) {
            scheduleReconnect()
          } else {
            setError(`Connection failed after ${options.maxReconnectAttempts} attempts`)
            updateConnectionState(ConnectionState.Failed)
          }
        }
      }
    } catch (err) {
      console.error('❌ Failed to create WebSocket:', err)
      setError(err instanceof Error ? err.message : 'Failed to create WebSocket connection')
      updateConnectionState(ConnectionState.Disconnected)
      consecutiveFailuresRef.current++
      
      if (options.autoReconnect && !isManuallyClosedRef.current) {
        scheduleReconnect()
      }
    }
  }, [options.enabled, options.autoReconnect, options.maxReconnectAttempts, connectionState, updateConnectionState, startHeartbeat])
  
  const scheduleReconnect = useCallback(() => {
    reconnectAttemptsRef.current++
    
    // Enhanced exponential backoff with jitter
    const baseDelay = Math.min(MIN_RECONNECT_DELAY * Math.pow(1.5, reconnectAttemptsRef.current - 1), MAX_RECONNECT_DELAY)
    const jitter = Math.random() * 0.5 * baseDelay // Add up to 50% jitter
    const delay = Math.floor(baseDelay + jitter)
    
    console.log(`🔄 Scheduling reconnect in ${(delay / 1000).toFixed(1)}s (attempt ${reconnectAttemptsRef.current}/${options.maxReconnectAttempts})`)
    
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectTimeoutRef.current = null
      if (!isManuallyClosedRef.current) {
        connect()
      }
    }, delay)
  }, [connect, options.maxReconnectAttempts])
  
  const subscribe = useCallback((tokenAddress: string) => {
    if (!tokenAddress) return

    subscriptionsRef.current.add(tokenAddress)

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ type: 'subscribe', mint: tokenAddress }))
      } catch (err) {
        console.error('Failed to send subscription:', err)
      }
    }
  }, [])
  
  const unsubscribe = useCallback((tokenAddress: string) => {
    if (!tokenAddress) return

    subscriptionsRef.current.delete(tokenAddress)

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ type: 'unsubscribe', mint: tokenAddress }))
      } catch (err) {
        console.error('Failed to send unsubscription:', err)
      }
    }
  }, [])
  
  const subscribeMany = useCallback((tokenAddresses: string[]) => {
    tokenAddresses.filter(Boolean).forEach(subscribe)
  }, [subscribe])
  
  const unsubscribeMany = useCallback((tokenAddresses: string[]) => {
    tokenAddresses.filter(Boolean).forEach(unsubscribe)
  }, [unsubscribe])
  
  const reconnect = useCallback(() => {
    console.log('🔄 Manual reconnect requested')
    cleanup()
    reconnectAttemptsRef.current = 0
    consecutiveFailuresRef.current = 0
    isManuallyClosedRef.current = false
    setError(null)
    updateConnectionState(ConnectionState.Disconnected)
    
    // Delay to ensure cleanup is complete
    setTimeout(() => {
      if (!isManuallyClosedRef.current) {
        connect()
      }
    }, 200)
  }, [connect, cleanup, updateConnectionState])
  
  const disconnect = useCallback(() => {
    console.log('🚫 Manual disconnect requested')
    isManuallyClosedRef.current = true
    cleanup()
    updateConnectionState(ConnectionState.Disconnected)
    setError(null)
  }, [cleanup, updateConnectionState])
  
  // Enhanced effect with better mounting/unmounting handling
  useEffect(() => {
    if (options.enabled && !isManuallyClosedRef.current) {
      console.log('🚀 Price stream enabled, initiating connection')
      
      // Delay to prevent rapid mounting/unmounting in React Strict Mode
      const timer = setTimeout(() => {
        if (!isManuallyClosedRef.current && options.enabled) {
          connect()
        }
      }, 200)
      
      return () => {
        clearTimeout(timer)
        cleanup()
      }
    } else {
      console.log('⏹️ Price stream disabled or manually closed')
    }
    
    return () => {
      cleanup()
    }
  }, [options.enabled, connect, cleanup])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('🧹 Price stream provider unmounting')
      cleanup()
    }
  }, [cleanup])
  
  return {
    connected,
    connecting,
    connectionState,
    error,
    subscribe,
    unsubscribe,
    subscribeMany,
    unsubscribeMany,
    prices,
    reconnect,
    disconnect
  }
}

export function PriceStreamProvider({ children }: PriceStreamProviderProps) {
  // DEBUG: Log provider initialization
  console.log('🔍 [DEBUG] PriceStreamProvider initializing...')
  console.log('🔍 [DEBUG] Environment check:', {
    NEXT_PUBLIC_WS_URL: typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_WS_URL : 'server-side',
    NODE_ENV: process.env.NODE_ENV,
    isBrowser: typeof window !== 'undefined'
  })
  
  // Enhanced WebSocket connection with comprehensive error handling and reconnection logic
  const priceStream = usePriceStream({
    enabled: true,
    autoReconnect: true,
    maxReconnectAttempts: 10 // Increased attempts with better backoff strategy
  })

  // DEBUG: Log price stream state
  console.log('🔍 [DEBUG] PriceStream state:', {
    connected: priceStream.connected,
    connecting: priceStream.connecting,
    connectionState: priceStream.connectionState,
    error: priceStream.error,
    pricesCount: priceStream.prices.size
  })

  return (
    <PriceStreamContext.Provider value={priceStream}>
      {children}
    </PriceStreamContext.Provider>
  )
}

export function usePriceStreamContext(): PriceStreamContextType {
  const context = useContext(PriceStreamContext)
  if (context === undefined) {
    throw new Error('usePriceStreamContext must be used within a PriceStreamProvider')
  }
  return context
}