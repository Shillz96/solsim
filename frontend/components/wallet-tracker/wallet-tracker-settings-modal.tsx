"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Settings, Loader2 } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn, marioStyles } from "@/lib/utils"

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onSettingsSaved?: () => void
}

interface WalletTrackerSettings {
  id: string
  userId: string
  showBuys: boolean
  showSells: boolean
  showFirstBuyOnly: boolean
  minMarketCap: number | null
  maxMarketCap: number | null
  minTransactionUsd: number | null
  maxTransactionUsd: number | null
  requireImages: boolean
  createdAt: string
  updatedAt: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export function WalletTrackerSettingsModal({ isOpen, onClose, onSettingsSaved }: SettingsModalProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Local state for form inputs
  const [showBuys, setShowBuys] = useState(true)
  const [showSells, setShowSells] = useState(true)
  const [showFirstBuyOnly, setShowFirstBuyOnly] = useState(false)
  const [minMarketCap, setMinMarketCap] = useState<string>("")
  const [maxMarketCap, setMaxMarketCap] = useState<string>("")
  const [minTransactionUsd, setMinTransactionUsd] = useState<string>("")
  const [maxTransactionUsd, setMaxTransactionUsd] = useState<string>("")
  const [requireImages, setRequireImages] = useState(false)

  // Validation state
  const [marketCapError, setMarketCapError] = useState<string>("")
  const [transactionError, setTransactionError] = useState<string>("")

  // Fetch current settings
  const { data: settings, isLoading } = useQuery<WalletTrackerSettings>({
    queryKey: ['wallet-tracker-settings', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated')

      const response = await fetch(`${API_URL}/api/wallet-tracker/settings/${user.id}`)
      if (!response.ok) throw new Error('Failed to fetch settings')

      const data = await response.json()
      return data.data
    },
    enabled: !!user?.id && isOpen,
  })

  // Load settings into form when fetched
  useEffect(() => {
    if (settings) {
      setShowBuys(settings.showBuys)
      setShowSells(settings.showSells)
      setShowFirstBuyOnly(settings.showFirstBuyOnly)
      setMinMarketCap(settings.minMarketCap ? String(settings.minMarketCap) : "")
      setMaxMarketCap(settings.maxMarketCap ? String(settings.maxMarketCap) : "")
      setMinTransactionUsd(settings.minTransactionUsd ? String(settings.minTransactionUsd) : "")
      setMaxTransactionUsd(settings.maxTransactionUsd ? String(settings.maxTransactionUsd) : "")
      setRequireImages(settings.requireImages)
    }
  }, [settings])

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated')

      const body = {
        showBuys,
        showSells,
        showFirstBuyOnly,
        minMarketCap: minMarketCap ? parseFloat(minMarketCap) : null,
        maxMarketCap: maxMarketCap ? parseFloat(maxMarketCap) : null,
        minTransactionUsd: minTransactionUsd ? parseFloat(minTransactionUsd) : null,
        maxTransactionUsd: maxTransactionUsd ? parseFloat(maxTransactionUsd) : null,
        requireImages,
      }

      const response = await fetch(`${API_URL}/api/wallet-tracker/settings/${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) throw new Error('Failed to save settings')
      return response.json()
    },
    onSuccess: () => {
      toast({
        title: "Settings saved",
        description: "Your wallet tracker filters have been updated",
      })
      // Invalidate queries to refetch with new settings
      queryClient.invalidateQueries({ queryKey: ['wallet-activities'] })
      queryClient.invalidateQueries({ queryKey: ['wallet-tracker-settings'] })
      queryClient.invalidateQueries({ queryKey: ['activity-feed'] })
      // Call the callback to refresh activities
      if (onSettingsSaved) {
        onSettingsSaved()
      }
      onClose()
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save settings",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  // Format number input with commas
  const formatNumberInput = (value: string) => {
    const num = parseFloat(value.replace(/,/g, ''))
    if (isNaN(num)) return ''
    return num.toLocaleString('en-US')
  }

  // Handle number input change
  const handleNumberChange = (value: string, setter: (val: string) => void) => {
    // Strip commas and other non-numeric characters except decimal point
    const cleaned = value.replace(/[^0-9.]/g, '')
    if (cleaned === '' || !isNaN(parseFloat(cleaned))) {
      setter(cleaned)
    }
  }

  // Validation functions
  const validateMarketCap = (min: string, max: string) => {
    const minVal = min ? parseFloat(min) : 0
    const maxVal = max ? parseFloat(max) : Infinity
    if (minVal > 0 && maxVal < Infinity && minVal > maxVal) {
      setMarketCapError("Min market cap cannot be greater than max")
    } else {
      setMarketCapError("")
    }
  }

  const validateTransaction = (min: string, max: string) => {
    const minVal = min ? parseFloat(min) : 0
    const maxVal = max ? parseFloat(max) : Infinity
    if (minVal > 0 && maxVal < Infinity && minVal > maxVal) {
      setTransactionError("Min transaction cannot be greater than max")
    } else {
      setTransactionError("")
    }
  }

  // Handle market cap changes with validation
  const handleMinMarketCapChange = (value: string) => {
    handleNumberChange(value, setMinMarketCap)
    setTimeout(() => validateMarketCap(value, maxMarketCap), 0)
  }

  const handleMaxMarketCapChange = (value: string) => {
    handleNumberChange(value, setMaxMarketCap)
    setTimeout(() => validateMarketCap(minMarketCap, value), 0)
  }

  const handleMinTransactionChange = (value: string) => {
    handleNumberChange(value, setMinTransactionUsd)
    setTimeout(() => validateTransaction(value, maxTransactionUsd), 0)
  }

  const handleMaxTransactionChange = (value: string) => {
    handleNumberChange(value, setMaxTransactionUsd)
    setTimeout(() => validateTransaction(minTransactionUsd, value), 0)
  }

  // Reset to defaults
  const resetToDefaults = () => {
    setShowBuys(true)
    setShowSells(true)
    setShowFirstBuyOnly(false)
    setMinMarketCap("")
    setMaxMarketCap("")
    setMinTransactionUsd("")
    setMaxTransactionUsd("")
    setRequireImages(false)
    setMarketCapError("")
    setTransactionError("")
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md max-h-[90vh] overflow-y-auto"
          >
            <div className={cn(marioStyles.cardLg(false), 'bg-card p-6')}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className={cn(
                  marioStyles.iconContainer('sm', '[var(--mario-red)]'),
                  'bg-mario'
                )}>
                  <Settings className="h-4 w-4 text-white" />
                </div>
                <h2 className={cn(marioStyles.heading(2), 'text-2xl')}>Live Trades Filters</h2>
              </div>
              <button
                onClick={onClose}
                className={cn(
                  marioStyles.iconContainer('sm'),
                  'hover:bg-gray-50',
                  marioStyles.hoverLift('subtle')
                )}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-mario" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Transaction Types */}
                <div className="space-y-3">
                  <Label className="text-sm font-bold text-outline">Transaction Types</Label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="showBuys"
                        checked={showBuys}
                        onCheckedChange={(checked) => setShowBuys(checked as boolean)}
                        className="border-3 border-outline"
                      />
                      <label
                        htmlFor="showBuys"
                        className="text-sm font-bold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-outline"
                      >
                        Buy
                      </label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="showSells"
                        checked={showSells}
                        onCheckedChange={(checked) => setShowSells(checked as boolean)}
                        className="border-3 border-outline"
                      />
                      <label
                        htmlFor="showSells"
                        className="text-sm font-bold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-outline"
                      >
                        Sell
                      </label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="showFirstBuyOnly"
                        checked={showFirstBuyOnly}
                        onCheckedChange={(checked) => setShowFirstBuyOnly(checked as boolean)}
                        className="border-3 border-outline"
                      />
                      <label
                        htmlFor="showFirstBuyOnly"
                        className="text-sm font-bold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-outline"
                      >
                        First Buy Only
                      </label>
                    </div>
                  </div>
                </div>

                {/* Market Cap Filter */}
                <div className="space-y-3">
                  <Label className="text-sm font-bold text-outline">Market Cap (USD)</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="minMarketCap" className={cn(marioStyles.bodyText('bold'), 'text-xs')}>
                        Min
                      </Label>
                      <div className="relative">
                        <span className={cn(
                          marioStyles.bodyText('bold'),
                          'absolute left-3 top-1/2 -translate-y-1/2 text-sm'
                        )}>
                          $
                        </span>
                        <Input
                          id="minMarketCap"
                          type="text"
                          placeholder="e.g., 50000"
                          value={minMarketCap ? formatNumberInput(minMarketCap) : ''}
                          onChange={(e) => handleMinMarketCapChange(e.target.value)}
                          className={cn(marioStyles.input(), 'pl-8 bg-card', marioStyles.bodyText('bold'))}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="maxMarketCap" className={cn(marioStyles.bodyText('bold'), 'text-xs')}>
                        Max
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-outline">
                          $
                        </span>
                        <Input
                          id="maxMarketCap"
                          type="text"
                          placeholder="e.g., 1000000"
                          value={maxMarketCap ? formatNumberInput(maxMarketCap) : ''}
                          onChange={(e) => handleMaxMarketCapChange(e.target.value)}
                          className="pl-8 bg-card border-3 border-outline rounded-lg shadow-[2px_2px_0_var(--outline-black)] focus:shadow-[3px_3px_0_var(--outline-black)] font-bold"
                        />
                      </div>
                    </div>
                  </div>
                  {marketCapError && (
                    <p className="text-xs text-mario font-bold">{marketCapError}</p>
                  )}
                </div>

                {/* Transaction Amount Filter */}
                <div className="space-y-3">
                  <Label className="text-sm font-bold text-outline">Transaction Amount (USD)</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="minTransactionUsd" className="text-xs font-bold text-outline">
                        Min
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-outline">
                          $
                        </span>
                        <Input
                          id="minTransactionUsd"
                          type="text"
                          placeholder="e.g., 100"
                          value={minTransactionUsd ? formatNumberInput(minTransactionUsd) : ''}
                          onChange={(e) => handleMinTransactionChange(e.target.value)}
                          className="pl-8 bg-card border-3 border-outline rounded-lg shadow-[2px_2px_0_var(--outline-black)] focus:shadow-[3px_3px_0_var(--outline-black)] font-bold"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="maxTransactionUsd" className="text-xs font-bold text-outline">
                        Max
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-outline">
                          $
                        </span>
                        <Input
                          id="maxTransactionUsd"
                          type="text"
                          placeholder="e.g., 10000"
                          value={maxTransactionUsd ? formatNumberInput(maxTransactionUsd) : ''}
                          onChange={(e) => handleMaxTransactionChange(e.target.value)}
                          className="pl-8 bg-card border-3 border-outline rounded-lg shadow-[2px_2px_0_var(--outline-black)] focus:shadow-[3px_3px_0_var(--outline-black)] font-bold"
                        />
                      </div>
                    </div>
                  </div>
                  {transactionError && (
                    <p className="text-xs text-mario font-bold">{transactionError}</p>
                  )}
                </div>

                {/* Require Images */}
                <div className="space-y-3">
                  <Label className="text-sm font-bold text-outline">Display Options</Label>
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="requireImages"
                      checked={requireImages}
                      onCheckedChange={(checked) => setRequireImages(checked as boolean)}
                      className="border-3 border-outline"
                    />
                    <label
                      htmlFor="requireImages"
                      className="text-sm font-bold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-outline"
                    >
                      Only show tokens with images
                    </label>
                  </div>
                </div>

                {/* Active Filters Summary */}
                <div className="space-y-3">
                  <Label className="text-sm font-bold text-outline">Active Filters</Label>
                  <div className="p-3 bg-[var(--sky-50)] border-3 border-outline rounded-lg">
                    <div className="flex flex-wrap gap-2">
                      {showBuys && (
                        <Badge variant="secondary" className="bg-luigi text-white">
                          Show Buys
                        </Badge>
                      )}
                      {showSells && (
                        <Badge variant="secondary" className="bg-mario text-white">
                          Show Sells
                        </Badge>
                      )}
                      {showFirstBuyOnly && (
                        <Badge variant="secondary" className="bg-star text-outline">
                          First Buy Only
                        </Badge>
                      )}
                      {minMarketCap && (
                        <Badge variant="secondary">
                          Min Market Cap: ${formatNumberInput(minMarketCap)}M
                        </Badge>
                      )}
                      {maxMarketCap && (
                        <Badge variant="secondary">
                          Max Market Cap: ${formatNumberInput(maxMarketCap)}M
                        </Badge>
                      )}
                      {minTransactionUsd && (
                        <Badge variant="secondary">
                          Min Tx: ${formatNumberInput(minTransactionUsd)}
                        </Badge>
                      )}
                      {maxTransactionUsd && (
                        <Badge variant="secondary">
                          Max Tx: ${formatNumberInput(maxTransactionUsd)}
                        </Badge>
                      )}
                      {requireImages && (
                        <Badge variant="secondary" className="bg-coin text-outline">
                          Images Required
                        </Badge>
                      )}
                      {(!showBuys && !showSells && !showFirstBuyOnly && !minMarketCap && !maxMarketCap && !minTransactionUsd && !maxTransactionUsd && !requireImages) && (
                        <span className="text-sm text-muted-foreground">No filters active</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4">
                  <button
                    onClick={onClose}
                    className={cn(
                      marioStyles.button('outline'),
                      'flex-1 h-10 px-4'
                    )}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={resetToDefaults}
                    className={cn(
                      marioStyles.button('danger'),
                      'flex-1 h-10 px-4'
                    )}
                  >
                    Reset
                  </button>
                  <button
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending || !!marketCapError || !!transactionError}
                    className={cn(
                      marioStyles.button('success'),
                      'flex-1 h-10 px-4 disabled:opacity-50'
                    )}
                  >
                    {saveMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Apply Filters'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  )
}
