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
    const cleaned = value.replace(/,/g, '')
    if (cleaned === '' || !isNaN(parseFloat(cleaned))) {
      setter(cleaned)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md max-h-[90vh] overflow-y-auto"
          >
            <Card className="p-6 bg-gray-800 dark:bg-gray-800 text-white border-2 border-gray-600">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold">Live Trades Filters</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Transaction Types */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Transaction Types</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="showBuys"
                        checked={showBuys}
                        onCheckedChange={(checked) => setShowBuys(checked as boolean)}
                      />
                      <label
                        htmlFor="showBuys"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Buy
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="showSells"
                        checked={showSells}
                        onCheckedChange={(checked) => setShowSells(checked as boolean)}
                      />
                      <label
                        htmlFor="showSells"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Sell
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="showFirstBuyOnly"
                        checked={showFirstBuyOnly}
                        onCheckedChange={(checked) => setShowFirstBuyOnly(checked as boolean)}
                      />
                      <label
                        htmlFor="showFirstBuyOnly"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        First Buy Only
                      </label>
                    </div>
                  </div>
                </div>

                {/* Market Cap Filter */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Market Cap (USD)</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="minMarketCap" className="text-xs text-muted-foreground">
                        Min
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          $
                        </span>
                        <Input
                          id="minMarketCap"
                          type="text"
                          placeholder="0"
                          value={minMarketCap ? formatNumberInput(minMarketCap) : ''}
                          onChange={(e) => handleNumberChange(e.target.value, setMinMarketCap)}
                          className="pl-7"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="maxMarketCap" className="text-xs text-muted-foreground">
                        Max
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          $
                        </span>
                        <Input
                          id="maxMarketCap"
                          type="text"
                          placeholder="No limit"
                          value={maxMarketCap ? formatNumberInput(maxMarketCap) : ''}
                          onChange={(e) => handleNumberChange(e.target.value, setMaxMarketCap)}
                          className="pl-7"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Transaction Amount Filter */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Transaction Amount (USD)</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="minTransactionUsd" className="text-xs text-muted-foreground">
                        Min
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          $
                        </span>
                        <Input
                          id="minTransactionUsd"
                          type="text"
                          placeholder="0"
                          value={minTransactionUsd ? formatNumberInput(minTransactionUsd) : ''}
                          onChange={(e) => handleNumberChange(e.target.value, setMinTransactionUsd)}
                          className="pl-7"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="maxTransactionUsd" className="text-xs text-muted-foreground">
                        Max
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          $
                        </span>
                        <Input
                          id="maxTransactionUsd"
                          type="text"
                          placeholder="No limit"
                          value={maxTransactionUsd ? formatNumberInput(maxTransactionUsd) : ''}
                          onChange={(e) => handleNumberChange(e.target.value, setMaxTransactionUsd)}
                          className="pl-7"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Require Images */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Display Options</Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="requireImages"
                      checked={requireImages}
                      onCheckedChange={(checked) => setRequireImages(checked as boolean)}
                    />
                    <label
                      htmlFor="requireImages"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Only show tokens with images
                    </label>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending}
                    className="flex-1"
                  >
                    {saveMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Apply Filters'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  )
}
