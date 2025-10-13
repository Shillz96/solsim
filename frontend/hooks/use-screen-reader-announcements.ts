'use client'

import { useState, useCallback } from 'react'

/**
 * Hook for managing screen reader announcements
 * Provides accessible notifications for real-time updates and user actions
 */
export function useScreenReaderAnnouncements() {
  const [announcement, setAnnouncement] = useState<string>('')
  const [urgentAnnouncement, setUrgentAnnouncement] = useState<string>('')

  // Announce non-urgent information (aria-live="polite")
  const announcePolite = useCallback((message: string) => {
    setAnnouncement(message)
    // Clear after a delay to prevent accumulation
    setTimeout(() => setAnnouncement(''), 100)
  }, [])

  // Announce urgent information (aria-live="assertive")
  const announceUrgent = useCallback((message: string) => {
    setUrgentAnnouncement(message)
    // Clear after a delay to prevent accumulation
    setTimeout(() => setUrgentAnnouncement(''), 100)
  }, [])

  // Announce price changes with context
  const announcePriceChange = useCallback((
    tokenSymbol: string,
    newPrice: number,
    change: number,
    changePercent: number
  ) => {
    const direction = change >= 0 ? 'increased' : 'decreased'
    const message = `${tokenSymbol} price ${direction} to $${newPrice.toFixed(8)}, ${Math.abs(changePercent).toFixed(2)}% ${direction}`
    announcePolite(message)
  }, [announcePolite])

  // Announce trade completion
  const announceTradeComplete = useCallback((
    action: 'buy' | 'sell',
    tokenSymbol: string,
    amount: number,
    totalCost: number
  ) => {
    const message = `Trade completed: ${action === 'buy' ? 'Bought' : 'Sold'} ${amount.toFixed(4)} ${tokenSymbol} for ${totalCost.toFixed(4)} SOL`
    announceUrgent(message)
  }, [announceUrgent])

  // Announce trade error
  const announceTradeError = useCallback((error: string) => {
    announceUrgent(`Trade failed: ${error}`)
  }, [announceUrgent])

  // Announce balance update
  const announceBalanceUpdate = useCallback((newBalance: number) => {
    announcePolite(`Balance updated: ${newBalance.toFixed(2)} SOL`)
  }, [announcePolite])

  return {
    announcement,
    urgentAnnouncement,
    announcePolite,
    announceUrgent,
    announcePriceChange,
    announceTradeComplete,
    announceTradeError,
    announceBalanceUpdate,
  }
}