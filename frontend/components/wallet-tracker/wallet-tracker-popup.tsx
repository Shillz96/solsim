"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  X, 
  Eye, 
  Trash2, 
  Copy, 
  ExternalLink, 
  TrendingUp, 
  TrendingDown,
  Plus,
  Search,
  Loader2,
  UserPlus,
  Activity,
  AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { cn } from "@/lib/utils"
import { formatUSD, formatNumber } from "@/lib/format"
import * as api from "@/lib/wallet-tracker-api"
import type * as Backend from "@/lib/types/backend"

interface WalletTrackerPopupProps {
  isOpen: boolean
  onClose: () => void
}

export function WalletTrackerPopup({ isOpen, onClose }: WalletTrackerPopupProps) {
  const { user, getUserId } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<"tracked" | "add">("tracked")

  // Add wallet state
  const [newWalletAddress, setNewWalletAddress] = useState("")
  const [newWalletLabel, setNewWalletLabel] = useState("")
  const [isAddingWallet, setIsAddingWallet] = useState(false)

  // Activity state
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null)

  // Copy trade state - persist in localStorage
  const [copyTradePercentage, setCopyTradePercentage] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('wallet-tracker-copy-percentage')
      return saved ? parseInt(saved, 10) : 100
    }
    return 100
  })
  const [copyingTrade, setCopyingTrade] = useState<string | null>(null)

  // Persist copy trade percentage to localStorage
  useEffect(() => {
    localStorage.setItem('wallet-tracker-copy-percentage', copyTradePercentage.toString())
  }, [copyTradePercentage])

  // Query for tracked wallets
  const {
    data: trackedWallets = [],
    isLoading: loadingWallets,
    refetch: refetchTrackedWallets
  } = useQuery({
    queryKey: ['tracked-wallets', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      const userId = getUserId()
      if (!userId) return []
      const response = await api.getTrackedWallets(userId)
      return response.trackedWallets
    },
    enabled: !!user?.id && isOpen,
    staleTime: 30000, // 30 seconds
  })

  // Query for wallet activity
  const {
    data: walletActivity = [],
    isLoading: loadingActivity,
    refetch: refetchWalletActivity
  } = useQuery({
    queryKey: ['wallet-activity', selectedWallet],
    queryFn: async () => {
      if (!selectedWallet) return []
      const response = await api.getWalletActivity(selectedWallet, 20)
      return response.activity
    },
    enabled: !!selectedWallet,
    staleTime: 15000, // 15 seconds for activity
  })

  // Load tracked wallets
  const loadTrackedWallets = useCallback(async () => {
    if (!user) {
      setLoadingWallets(false)
      return
    }
    
    setLoadingWallets(true)
    try {
      const userId = getUserId()
      if (!userId) {
        setLoadingWallets(false)
        return
      }
      
      const response = await api.getTrackedWallets(userId)
      setTrackedWallets(response.trackedWallets)
    } catch (error) {
      console.error("Failed to load tracked wallets:", error)
      // Show error but don't crash
      setTrackedWallets([])
    } finally {
      setLoadingWallets(false)
    }
  }, [user, getUserId])

  // Load wallet activity
  const loadWalletActivity = useCallback(async (walletAddress: string) => {
    setLoadingActivity(true)
    try {
      const response = await api.getWalletActivity(walletAddress, 20)
      setWalletActivity(response.activity)
    } catch (error) {
      console.error("Failed to load wallet activity:", error)
      setWalletActivity([])
    } finally {
      setLoadingActivity(false)
    }
  }, [])

  // Add wallet to tracking
  const handleAddWallet = async () => {
    if (!user || !newWalletAddress.trim()) {
      toast({
        title: "Error",
        description: "Please enter a wallet address",
        variant: "destructive"
      })
      return
    }

    setIsAddingWallet(true)
    try {
      const userId = getUserId()
      if (!userId) return

      await api.trackWallet(userId, newWalletAddress.trim(), newWalletLabel.trim() || undefined)
      
      toast({
        title: "Success",
        description: `Wallet ${newWalletLabel || newWalletAddress.slice(0, 8)} added to tracking`,
      })
      
      setNewWalletAddress("")
      setNewWalletLabel("")
      await loadTrackedWallets()
      setActiveTab("tracked")
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add wallet",
        variant: "destructive"
      })
    } finally {
      setIsAddingWallet(false)
    }
  }

  // Remove wallet from tracking
  const handleRemoveWallet = async (trackingId: string) => {
    try {
      await api.untrackWallet(trackingId)
      toast({
        title: "Success",
        description: "Wallet removed from tracking"
      })
      await loadTrackedWallets()
      if (selectedWallet) {
        setSelectedWallet(null)
        setWalletActivity([])
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove wallet",
        variant: "destructive"
      })
    }
  }

  // Copy trade
  const handleCopyTrade = async (walletAddress: string, signature: string) => {
    if (!user) {
      toast({
        title: "Error",
        description: "Please log in to copy trades",
        variant: "destructive"
      })
      return
    }

    setCopyingTrade(signature)
    try {
      const userId = getUserId()
      if (!userId) return

      const response = await api.copyTrade(userId, walletAddress, signature, copyTradePercentage)
      
      toast({
        title: "Trade Copied!",
        description: `Successfully copied trade at ${copyTradePercentage}% size`,
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to copy trade",
        variant: "destructive"
      })
    } finally {
      setCopyingTrade(null)
    }
  }

  // Prevent body scroll and load data when popup is opened
  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll
      document.body.style.overflow = 'hidden'

      // Load data if user is available
      if (user) {
        loadTrackedWallets()
      }
    } else {
      // Restore body scroll when closed
      document.body.style.overflow = ''
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen, user])  // Removed loadTrackedWallets from dependencies

  // Load activity when wallet selected
  useEffect(() => {
    if (selectedWallet) {
      loadWalletActivity(selectedWallet)
    }
  }, [selectedWallet])  // Removed loadWalletActivity from dependencies

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied!",
      description: "Address copied to clipboard"
    })
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />

          {/* Popup */}
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[101] max-h-[85vh] bg-background border-t-2 border-border rounded-t-2xl shadow-2xl overflow-hidden"
          >
            <div className="flex flex-col h-full max-h-[85vh]">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Eye className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Wallet Tracker</h2>
                    <p className="text-xs text-muted-foreground">Follow KOL wallets & copy trades</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="tracked" className="gap-2">
                      <Activity className="h-4 w-4" />
                      Tracked ({trackedWallets.length})
                    </TabsTrigger>
                    <TabsTrigger value="add" className="gap-2">
                      <UserPlus className="h-4 w-4" />
                      Add Wallet
                    </TabsTrigger>
                  </TabsList>

                  {/* Tracked Wallets Tab */}
                  <TabsContent value="tracked" className="space-y-4">
                    {loadingWallets ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : trackedWallets.length === 0 ? (
                      <Card className="p-8 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="p-4 bg-muted rounded-full">
                            <Eye className="h-8 w-8 text-muted-foreground" />
                          </div>
                          <p className="text-muted-foreground">No wallets tracked yet</p>
                          <Button onClick={() => setActiveTab("add")} size="sm" className="gap-2">
                            <Plus className="h-4 w-4" />
                            Track Your First Wallet
                          </Button>
                        </div>
                      </Card>
                    ) : (
                      <div className="space-y-3">
                        {trackedWallets.map((wallet) => (
                          <Card
                            key={wallet.id}
                            className={cn(
                              "p-4 hover:border-primary/50 transition-all cursor-pointer",
                              selectedWallet === wallet.walletAddress && "border-primary bg-primary/5"
                            )}
                            onClick={() => setSelectedWallet(wallet.walletAddress)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  {wallet.label && (
                                    <Badge variant="secondary" className="text-xs">
                                      {wallet.label}
                                    </Badge>
                                  )}
                                  <Badge 
                                    variant={wallet.isActive ? "default" : "outline"} 
                                    className="text-xs"
                                  >
                                    {wallet.isActive ? "Active" : "Inactive"}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                  <code className="text-sm font-mono text-muted-foreground truncate">
                                    {wallet.walletAddress}
                                  </code>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      copyToClipboard(wallet.walletAddress)
                                    }}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      window.open(`https://solscan.io/account/${wallet.walletAddress}`, '_blank')
                                    }}
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleRemoveWallet(wallet.id)
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}

                    {/* Wallet Activity */}
                    {selectedWallet && (
                      <div className="mt-6 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-bold">Recent Activity</h3>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => loadWalletActivity(selectedWallet)}
                            disabled={loadingActivity}
                          >
                            {loadingActivity ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Activity className="h-3 w-3" />
                            )}
                          </Button>
                        </div>

                        {/* Copy Trade Settings */}
                        <Card className="p-4 bg-muted/30">
                          <div className="space-y-3">
                            <Label className="text-xs font-semibold">Copy Trade Size</Label>
                            <div className="flex items-center gap-4">
                              <Slider
                                value={[copyTradePercentage]}
                                onValueChange={(v) => setCopyTradePercentage(v[0])}
                                min={1}
                                max={100}
                                step={1}
                                className="flex-1"
                              />
                              <Badge variant="outline" className="min-w-[60px] justify-center">
                                {copyTradePercentage}%
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Copy trades at {copyTradePercentage}% of original size
                            </p>
                          </div>
                        </Card>

                        {loadingActivity ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          </div>
                        ) : walletActivity.length === 0 ? (
                          <Card className="p-6 text-center">
                            <AlertCircle className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">No recent activity</p>
                          </Card>
                        ) : (
                          <div className="space-y-2">
                            {walletActivity.map((activity) => (
                              <Card key={activity.signature} className="p-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Badge variant="outline" className="text-xs">
                                        {activity.type}
                                      </Badge>
                                      <span className="text-xs text-muted-foreground">
                                        {new Date(activity.timestamp).toLocaleTimeString()}
                                      </span>
                                    </div>
                                    <div className="text-xs space-y-1">
                                      <div className="flex items-center gap-2">
                                        <TrendingDown className="h-3 w-3 text-red-500" />
                                        <span className="text-muted-foreground">In:</span>
                                        <code className="font-mono truncate">{activity.tokenIn?.slice(0, 8) || 'N/A'}</code>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <TrendingUp className="h-3 w-3 text-green-500" />
                                        <span className="text-muted-foreground">Out:</span>
                                        <code className="font-mono truncate">{activity.tokenOut?.slice(0, 8) || 'N/A'}</code>
                                      </div>
                                    </div>
                                  </div>
                                  <Button
                                    size="sm"
                                    onClick={() => handleCopyTrade(selectedWallet, activity.signature)}
                                    disabled={copyingTrade === activity.signature}
                                    className="gap-2"
                                  >
                                    {copyingTrade === activity.signature ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Copy className="h-3 w-3" />
                                    )}
                                    Copy
                                  </Button>
                                </div>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </TabsContent>

                  {/* Add Wallet Tab */}
                  <TabsContent value="add">
                    <Card className="p-6">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="wallet-address">Wallet Address *</Label>
                          <Input
                            id="wallet-address"
                            placeholder="Enter Solana wallet address..."
                            value={newWalletAddress}
                            onChange={(e) => setNewWalletAddress(e.target.value)}
                            className="font-mono"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="wallet-label">Label (Optional)</Label>
                          <Input
                            id="wallet-label"
                            placeholder="e.g., 'Ansem', 'Top Trader'..."
                            value={newWalletLabel}
                            onChange={(e) => setNewWalletLabel(e.target.value)}
                          />
                        </div>
                        <Button
                          onClick={handleAddWallet}
                          disabled={isAddingWallet || !newWalletAddress.trim()}
                          className="w-full gap-2"
                        >
                          {isAddingWallet ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Adding...
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4" />
                              Track Wallet
                            </>
                          )}
                        </Button>
                      </div>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
