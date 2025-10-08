"use client"

import { createContext, useContext, useCallback, useRef } from 'react'
import { usePriceStream } from './use-price-stream'

interface PriceStreamContextType {
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

const PriceStreamContext = createContext<PriceStreamContextType | undefined>(undefined)

interface PriceStreamProviderProps {
  children: React.ReactNode
}

export function PriceStreamProvider({ children }: PriceStreamProviderProps) {
  // Single WebSocket connection for the entire app
  const priceStream = usePriceStream({
    enabled: true,
    autoReconnect: true,
    maxReconnectAttempts: 3
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