"use client"

// ✨ ENHANCED WITH PUMPPORTAL REAL-TIME TRACKING ✨
// This component now uses PumpPortal WebSocket for instant trade notifications
// - Real-time updates as trades happen
// - 90% simpler backend logic
// - Pre-parsed trade data
// - Scales to unlimited wallets on one connection

import { useState, useEffect, useMemo, useCallback, useDeferredValue } from "react"
import { motion, AnimatePresence } from "framer-motion"
import dynamic from "next/dynamic"
import {
  Eye,
  Plus,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  Copy,
  ExternalLink,
  CheckCircle,
  XCircle,
  Activity,
  Wallet,
  RefreshCw,
  Settings,
  ChevronDown,
  Loader2,
  Sparkles,
  Zap
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { formatUSD, formatNumber } from "@/lib/format"
import { useWalletTrackerWebSocket } from "@/hooks/use-wallet-tracker-ws"
import { WalletActivityList } from "./wallet-activity-list"
import { WalletStats } from "./wallet-stats"
import type { WalletActivity } from "./types"

// Lazy load heavy modals for better performance
const WalletManager = dynamic(
  () => import('./wallet-manager').then(m => ({ default: m.WalletManager })),
  { ssr: false }
)
const WalletTrackerSettingsModal = dynamic(
  () => import('./wallet-tracker-settings-modal').then(m => ({ default: m.WalletTrackerSettingsModal })),
  { ssr: false }
)

interface TrackedWallet {
  id: string
  userId: string
  walletAddress: string
  label?: string
  isActive: boolean
  createdAt: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

interface WalletTrackerContentProps {
  compact?: boolean // Compact mode for floating window (no stats, minimal controls)
}

export function WalletTrackerContent({ compact = false }: WalletTrackerContentProps = {}) {
  const { user, isAuthenticated } = useAuth()
  const { toast } = useToast()

  const [searchTerm, setSearchTerm] = useState("")
  const deferredSearchTerm = useDeferredValue(searchTerm)
  const [filterType, setFilterType] = useState<'all' | 'buy' | 'sell' | 'swap'>('all')
  const [selectedWallets, setSelectedWallets] = useState<string[]>([])
  const [showWalletManager, setShowWalletManager] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [activities, setActivities] = useState<WalletActivity[]>([])
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const [density, setDensity] = useState<'comfortable' | 'compact'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('wallet-tracker-density') as 'comfortable' | 'compact') || 'comfortable'
    }
    return 'comfortable'
  })

  // Save density preference to localStorage
  useEffect(() => {
    localStorage.setItem('wallet-tracker-density', density)
  }, [density])

  // Fetch tracked wallets
  const { data: trackedWallets, isLoading: loadingWallets, refetch: refetchWallets } = useQuery<TrackedWallet[]>({
    queryKey: ['tracked-wallets', user?.id],
    queryFn: async () => {
      if (!user?.id) return []

      const response = await fetch(`${API_URL}/api/wallet-tracker/user/${user.id}`)
      if (!response.ok) throw new Error('Failed to fetch tracked wallets')

      const data = await response.json()
      return data.trackedWallets || []
    },
    enabled: !!user?.id,
    refetchInterval: 30000 // Refetch every 30 seconds
  })

  // Connect to WebSocket for real-time updates
  const {
    connected,
    newActivities,
    subscribe,
    unsubscribe
  } = useWalletTrackerWebSocket(user?.id || '')

  // Fetch initial activities
  const fetchActivities = useCallback(async (reset: boolean = false) => {
    if (!user?.id || isLoadingMore) return

    setIsLoadingMore(true)
    try {
      const currentOffset = reset ? 0 : offset
      const typeParam = filterType !== 'all' ? `&type=${filterType.toUpperCase()}` : ''
      const response = await fetch(
        `${API_URL}/api/wallet-tracker/v2/feed/${user.id}?limit=50&offset=${currentOffset}${typeParam}`
      )

      if (!response.ok) throw new Error('Failed to fetch activities')

      const data = await response.json()

      if (reset) {
        setActivities(data.activities || [])
        setOffset(data.activities?.length || 0)
      } else {
        setActivities(prev => [...prev, ...(data.activities || [])])
        setOffset(prev => prev + (data.activities?.length || 0))
      }

      setHasMore(data.hasMore || false)
    } catch (error) {
      console.error('Failed to fetch activities:', error)
      toast({
        title: "Error",
        description: "Failed to load activities",
        variant: "destructive"
      })
    } finally {
      setIsLoadingMore(false)
    }
  }, [user?.id, offset, filterType, isLoadingMore, toast])

  // Initial load
  useEffect(() => {
    if (user?.id) {
      fetchActivities(true)
    }
  }, [user?.id, filterType])

  // Handle new activities from WebSocket
  useEffect(() => {
    if (newActivities.length > 0) {
      setActivities(prev => {
        // Add new activities at the top, remove duplicates
        const activityIds = new Set(prev.map(a => a.id))
        const uniqueNew = newActivities.filter(a => !activityIds.has(a.id))
        return [...uniqueNew, ...prev]
      })
    }
  }, [newActivities])

  // Subscribe to tracked wallets
  useEffect(() => {
    if (connected && trackedWallets && trackedWallets.length > 0) {
      const addresses = trackedWallets.map((w: any) => w.walletAddress)
      subscribe(addresses)
    }
  }, [connected, trackedWallets, subscribe])

  // Sync wallet activities
  const syncWallet = async (walletAddress: string) => {
    try {
      const response = await fetch(`${API_URL}/api/wallet-tracker/v2/sync/${walletAddress}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: "100" })
      })

      if (!response.ok) throw new Error('Failed to sync wallet')

      const data = await response.json()

      toast({
        title: "Wallet Synced",
        description: `Synced ${data.activitiesCount} new activities`,
      })

      // Refresh activities
      fetchActivities(true)
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: "Failed to sync wallet activities",
        variant: "destructive"
      })
    }
  }

  // Filter activities - using deferred search to prevent stuttering while typing
  const filteredActivities = useMemo(() => {
    return activities.filter(activity => {
      if (deferredSearchTerm) {
        const search = deferredSearchTerm.toLowerCase()
        return (
          activity.tokenIn.symbol?.toLowerCase().includes(search) ||
          activity.tokenOut.symbol?.toLowerCase().includes(search) ||
          activity.walletAddress.toLowerCase().includes(search)
        )
      }
      return true
    })
  }, [activities, deferredSearchTerm])

  // Get wallet label
  const getWalletLabel = (address: string) => {
    const wallet = trackedWallets?.find((w: any) => w.walletAddress === address)
    return wallet?.label || `${address.slice(0, 4)}...${address.slice(-4)}`
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
        <div className="mario-card bg-white border-4 border-pipe-700 shadow-mario p-8 text-center max-w-md">
          <Wallet className="h-16 w-16 text-mario-red mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-3 text-pipe-900">Sign In Required</h2>
          <p className="text-pipe-700 font-semibold mb-6">
            Please sign in to track wallet activities
          </p>
          <Button
            onClick={() => window.location.href = '/auth/signin'}
            className="mario-btn mario-btn-red text-white font-bold"
          >
            Sign In
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      compact ? "h-full" : "min-h-screen bg-gradient-to-br from-background via-background to-muted/20"
    )}>
      <main id="wallet-tracker" className={cn(
        "w-full",
        compact ? "h-full flex flex-col" : "px-4 sm:px-6 lg:px-8 py-2 sm:py-4 max-w-page-xl mx-auto"
      )}>
        <div className={cn("space-y-3", compact && "h-full flex flex-col")}>
        {/* Compact Header - Simple and minimal */}
        {compact ? (
          <div className="flex items-center justify-between px-4 py-2 border-b-2 border-pipe-300 flex-shrink-0">
            <Badge
              variant={connected ? "default" : "secondary"}
              className={cn(
                "gap-1 border-2 font-bold text-xs",
                connected ? "bg-luigi-green text-white border-black" : "bg-pipe-200 text-pipe-900 border-pipe-700"
              )}
            >
              <div className={cn(
                "h-1.5 w-1.5 rounded-full",
                connected ? "bg-white animate-pulse" : "bg-pipe-700"
              )} />
              {connected ? "Live" : "Offline"}
            </Badge>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(true)}
                className="gap-1.5 border-2 border-pipe-500 hover:bg-sky-100 font-bold h-8 text-xs"
              >
                <Settings className="h-3.5 w-3.5" />
                Filters
              </Button>

              <Button
                size="sm"
                onClick={() => setShowWalletManager(true)}
                className="gap-1.5 mario-btn mario-btn-red font-bold text-white h-8 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                Manage Wallets
              </Button>

              <Button
                size="sm"
                onClick={() => window.location.href = '/wallet-tracker'}
                className="gap-1.5 mario-btn bg-sky-blue font-bold text-pipe-900 h-8 text-xs border-2 border-black"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                More
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Full Header - Mario themed */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center justify-between"
            >
              <div className="space-y-2">
                <h1 className="text-3xl font-bold flex items-center gap-3 text-pipe-900">
                  <Eye className="h-8 w-8 text-mario-red" />
                  Wallet Tracker
                </h1>
                <p className="text-base font-semibold text-pipe-700">
                  Track and copy trades from top Solana wallets in real-time
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Badge
                  variant={connected ? "default" : "secondary"}
                  className={cn(
                    "gap-1 border-2 font-bold",
                    connected ? "bg-luigi-green-500 text-white border-black" : "bg-pipe-200 text-pipe-900 border-pipe-700"
                  )}
                >
                  <div className={cn(
                    "h-2 w-2 rounded-full",
                    connected ? "bg-white animate-pulse" : "bg-pipe-700"
                  )} />
                  {connected ? "Live" : "Offline"}
                </Badge>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchActivities(true)}
                  disabled={isLoadingMore}
                  className="border-3 border-pipe-700 hover:bg-sky-100"
                >
                  <RefreshCw className={cn("h-4 w-4", isLoadingMore && "animate-spin")} />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSettings(true)}
                  className="gap-2 border-3 border-pipe-700 hover:bg-sky-100 font-bold"
                >
                  <Settings className="h-4 w-4" />
                  Filters
                </Button>

                <Button
                  size="sm"
                  onClick={() => setShowWalletManager(true)}
                  className="gap-2 mario-btn mario-btn-red font-bold text-white"
                >
                  <Plus className="h-4 w-4" />
                  Manage Wallets
                </Button>
              </div>
            </motion.div>

            {/* Stats Overview - Full mode only */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <WalletStats
                trackedWallets={trackedWallets || []}
                activities={activities}
              />
            </motion.div>

            {/* Filters - Sticky bar - Full mode only */}
            <div className="sticky top-0 z-10 mario-card bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/95 border-4 border-pipe-700 shadow-mario p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-pipe-700" />
                  <Input
                    placeholder="Search token symbol or wallet..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 border-3 border-pipe-500 focus:border-mario-red font-semibold"
                  />
                </div>

                <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
                  <SelectTrigger className="w-[140px] border-3 border-pipe-500 font-bold">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent className="border-3 border-pipe-700">
                    <SelectItem value="all">All Trades</SelectItem>
                    <SelectItem value="buy">Buys Only</SelectItem>
                    <SelectItem value="sell">Sells Only</SelectItem>
                    <SelectItem value="swap">Swaps Only</SelectItem>
                  </SelectContent>
                </Select>

                {/* Density Toggle */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDensity(prev => prev === 'comfortable' ? 'compact' : 'comfortable')}
                  className="border-3 border-pipe-500 font-bold whitespace-nowrap"
                >
                  {density === 'comfortable' ? 'Comfortable' : 'Compact'}
                </Button>

                {trackedWallets && trackedWallets.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="border-3 border-pipe-500 font-bold">
                        <Wallet className="h-4 w-4 mr-2" />
                        {selectedWallets.length === 0
                          ? "All Wallets"
                          : `${selectedWallets.length} Selected`}
                        <ChevronDown className="h-4 w-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64 border-3 border-pipe-700">
                      <DropdownMenuItem onClick={() => setSelectedWallets([])}>
                        All Wallets
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {trackedWallets.map((wallet) => (
                        <DropdownMenuItem
                          key={wallet.id}
                          onClick={() => {
                            setSelectedWallets(prev =>
                              prev.includes(wallet.walletAddress)
                                ? prev.filter(w => w !== wallet.walletAddress)
                                : [...prev, wallet.walletAddress]
                            )
                          }}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="truncate">
                              {wallet.label || wallet.walletAddress.slice(0, 8)}
                            </span>
                            {selectedWallets.includes(wallet.walletAddress) && (
                              <CheckCircle className="h-4 w-4 text-primary" />
                            )}
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </>
        )}

        {/* Activity List - Full height in compact mode */}
        <div className={cn(compact && "flex-1 min-h-0")}>
          <WalletActivityList
            activities={filteredActivities}
            isLoading={loadingWallets || (activities.length === 0 && isLoadingMore)}
            hasMore={hasMore}
            onLoadMore={() => fetchActivities(false)}
            onCopyTrade={(activity) => {
              // Handle copy trade
              toast({
                title: "Copy Trade",
                description: "Trade copying functionality coming soon",
              })
            }}
            getWalletLabel={getWalletLabel}
            density={density}
          />
        </div>

        {/* Wallet Manager Modal */}
        <AnimatePresence>
          {showWalletManager && (
            <WalletManager
              isOpen={showWalletManager}
              onClose={() => setShowWalletManager(false)}
              onWalletsUpdated={() => {
                refetchWallets()
                fetchActivities(true)
              }}
              trackedWallets={trackedWallets || []}
              onSyncWallet={syncWallet}
            />
          )}
        </AnimatePresence>

        {/* Settings Modal */}
        <WalletTrackerSettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          onSettingsSaved={() => fetchActivities(true)}
        />

        </div>
      </main>
    </div>
  )
}