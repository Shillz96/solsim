/**
 * Trade Panel State Management Hook
 * Centralized state for all trade panel interactions
 */

import { useState, useCallback } from 'react'
import type { TradeState } from '../types'

const DEFAULT_BUY_PRESETS = [1, 5, 10, 20]
const DEFAULT_SELL_PRESETS = [25, 50, 75, 100]

export function useTradePanelState() {
  // Buy presets with localStorage persistence
  const [buyPresets, setBuyPresets] = useState<number[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('trade-panel-buy-presets')
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch (e) {
          console.warn('Failed to parse saved buy presets:', e)
        }
      }
    }
    return DEFAULT_BUY_PRESETS
  })

  // Sell presets (static for now)
  const sellPresets = DEFAULT_SELL_PRESETS

  // Trade state
  const [selectedSolAmount, setSelectedSolAmount] = useState<number | null>(null)
  const [customSolAmount, setCustomSolAmount] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [selectedPercentage, setSelectedPercentage] = useState<number | null>(null)
  const [customSellPercentage, setCustomSellPercentage] = useState('')
  const [isTrading, setIsTrading] = useState(false)
  const [tradeError, setTradeError] = useState<string | null>(null)
  const [lastTradeSuccess, setLastTradeSuccess] = useState(false)

  // Update buy preset with localStorage persistence
  const updateBuyPreset = useCallback((index: number, newValue: number) => {
    const newPresets = [...buyPresets]
    newPresets[index] = newValue
    setBuyPresets(newPresets)
    localStorage.setItem('trade-panel-buy-presets', JSON.stringify(newPresets))
  }, [buyPresets])

  // Select buy amount
  const selectBuyAmount = useCallback((amount: number) => {
    setSelectedSolAmount(amount)
    setCustomSolAmount('')
  }, [])

  // Set custom buy amount
  const setCustomBuyAmount = useCallback((amount: string) => {
    setCustomSolAmount(amount)
    setSelectedSolAmount(null)
  }, [])

  // Select sell percentage
  const selectSellPercentage = useCallback((percentage: number) => {
    setSelectedPercentage(percentage)
    setCustomSellPercentage('')
  }, [])

  // Reset selection after successful trade
  const resetBuySelection = useCallback(() => {
    setSelectedSolAmount(null)
    setCustomSolAmount('')
  }, [])

  const resetSellSelection = useCallback(() => {
    setSelectedPercentage(null)
    setCustomSellPercentage('')
  }, [])

  // Set trade status
  const setTradingState = useCallback((trading: boolean) => {
    setIsTrading(trading)
  }, [])

  const setTradeErrorState = useCallback((error: string | null) => {
    setTradeError(error)
  }, [])

  const setTradeSuccessState = useCallback((success: boolean) => {
    setLastTradeSuccess(success)
    if (success) {
      setTimeout(() => setLastTradeSuccess(false), 3000)
    }
  }, [])

  return {
    // Presets
    buyPresets,
    sellPresets,
    updateBuyPreset,
    
    // Buy state
    selectedSolAmount,
    customSolAmount,
    showCustomInput,
    selectBuyAmount,
    setCustomBuyAmount,
    setShowCustomInput,
    resetBuySelection,
    
    // Sell state
    selectedPercentage,
    customSellPercentage,
    selectSellPercentage,
    setCustomSellPercentage,
    resetSellSelection,
    
    // Trade execution state
    isTrading,
    tradeError,
    lastTradeSuccess,
    setTradingState,
    setTradeErrorState,
    setTradeSuccessState,
  }
}
