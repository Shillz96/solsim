import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { usePriceStreamContext } from './price-stream-provider'

interface UsePriceOptions {
  /** Threshold for price change to trigger re-render (default: 0.01%) */
  changeThreshold?: number
  /** Debounce delay in ms (default: 100ms) */
  debounceMs?: number
  /** Whether to subscribe to price updates (default: true) */
  enabled?: boolean
}

/**
 * Optimized hook for consuming price data with built-in memoization
 * Prevents unnecessary re-renders by only updating when price changes significantly
 */
export function usePriceOptimized(
  tokenAddress: string,
  options: UsePriceOptions = {}
): { price: number; change24h: number; isLoading: boolean } {
  const {
    changeThreshold = 0.0001, // 0.01% change threshold
    debounceMs = 100,
    enabled = true
  } = options

  const { prices, subscribe, unsubscribe, connected } = usePriceStreamContext()
  const [localPrice, setLocalPrice] = useState<{ price: number; change24h: number }>({
    price: 0,
    change24h: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  
  const lastPriceRef = useRef(0)
  const debounceTimerRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Subscribe to price updates - avoid dependency on connected state
  useEffect(() => {
    if (!enabled || !tokenAddress) return

    // Always try to subscribe - the provider will handle connection state internally
    subscribe(tokenAddress)

    return () => {
      unsubscribe(tokenAddress)
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [tokenAddress, enabled, subscribe, unsubscribe]) // Use stable refs

  // Handle price updates with threshold and debounce
  useEffect(() => {
    const priceData = prices.get(tokenAddress)
    
    if (!priceData) {
      return
    }

    setIsLoading(false)
    
    const newPrice = priceData.price
    const priceDiff = Math.abs(newPrice - lastPriceRef.current)
    const percentChange = lastPriceRef.current > 0 
      ? priceDiff / lastPriceRef.current 
      : 1

    // Only update if change exceeds threshold
    if (percentChange >= changeThreshold) {
      // Clear existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      // Debounce the update
      debounceTimerRef.current = setTimeout(() => {
        setLocalPrice({
          price: newPrice,
          change24h: priceData.change24h
        })
        lastPriceRef.current = newPrice
      }, debounceMs)
    }
  }, [prices, tokenAddress, changeThreshold, debounceMs])

  return useMemo(() => ({
    price: localPrice.price,
    change24h: localPrice.change24h,
    isLoading
  }), [localPrice.price, localPrice.change24h, isLoading])
}

/**
 * Batch price hook for multiple tokens with optimized updates
 */
export function usePricesOptimized(
  tokenAddresses: string[],
  options: UsePriceOptions = {}
): Map<string, { price: number; change24h: number }> {
  const { prices, subscribeMany, unsubscribeMany, connected } = usePriceStreamContext()
  const [localPrices, setLocalPrices] = useState<Map<string, { price: number; change24h: number }>>(
    new Map()
  )
  
  const { changeThreshold = 0.0001, enabled = true } = options
  const lastPricesRef = useRef<Map<string, number>>(new Map())

  // Subscribe to all tokens - avoid dependency on connected state
  useEffect(() => {
    if (!enabled || tokenAddresses.length === 0) return

    // Always try to subscribe - provider handles connection state
    subscribeMany(tokenAddresses)

    return () => {
      unsubscribeMany(tokenAddresses)
    }
  }, [tokenAddresses.join(','), enabled, subscribeMany, unsubscribeMany]) // Use stable refs

  // Handle batch price updates with threshold
  useEffect(() => {
    const updates = new Map<string, { price: number; change24h: number }>()
    let hasChanges = false

    tokenAddresses.forEach(address => {
      const priceData = prices.get(address)
      if (!priceData) return

      const lastPrice = lastPricesRef.current.get(address) || 0
      const priceDiff = Math.abs(priceData.price - lastPrice)
      const percentChange = lastPrice > 0 ? priceDiff / lastPrice : 1

      if (percentChange >= changeThreshold) {
        updates.set(address, {
          price: priceData.price,
          change24h: priceData.change24h
        })
        lastPricesRef.current.set(address, priceData.price)
        hasChanges = true
      }
    })

    if (hasChanges) {
      setLocalPrices(prev => {
        const newMap = new Map(prev)
        updates.forEach((value, key) => {
          newMap.set(key, value)
        })
        return newMap
      })
    }
  }, [prices, tokenAddresses.join(','), changeThreshold])

  return localPrices
}
