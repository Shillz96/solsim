"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
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
  Loader2
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
import { WalletManager } from "./wallet-manager"
import { WalletStats } from "./wallet-stats"
import type { WalletActivity } from "./types"

interface TrackedWallet {
  id: string
  userId: string
  walletAddress: string
  label?: string
  isActive: boolean
  createdAt: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export function WalletTrackerContent() {
  const { user, isAuthenticated } = useAuth()
  const { toast } = useToast()

  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<'all' | 'buy' | 'sell' | 'swap'>('all')
  const [selectedWallets, setSelectedWallets] = useState<string[]>([])
  const [showWalletManager, setShowWalletManager] = useState(false)
  const [activities, setActivities] = useState<WalletActivity[]>([])
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)

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

  // Filter activities
  const filteredActivities = useMemo(() => {
    return activities.filter(activity => {
      if (searchTerm) {
        const search = searchTerm.toLowerCase()
        return (
          activity.tokenIn.symbol?.toLowerCase().includes(search) ||
          activity.tokenOut.symbol?.toLowerCase().includes(search) ||
          activity.walletAddress.toLowerCase().includes(search)
        )
      }
      return true
    })
  }, [activities, searchTerm])

  // Get wallet label
  const getWalletLabel = (address: string) => {
    const wallet = trackedWallets?.find((w: any) => w.walletAddress === address)
    return wallet?.label || `${address.slice(0, 4)}...${address.slice(-4)}`
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Sign In Required</h2>
          <p className="text-muted-foreground mb-4">
            Please sign in to track wallet activities
          </p>
          <Button onClick={() => window.location.href = '/auth/signin'}>
            Sign In
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <main className="w-full px-4 sm:px-6 lg:px-8 py-2 sm:py-4 max-w-page-xl mx-auto">
        <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between"
        >
          <div className="space-y-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Eye className="h-6 w-6 text-primary" />
              Wallet Tracker
            </h1>
            <p className="text-sm text-muted-foreground">
              Track and copy trades from top Solana wallets in real-time
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={connected ? "default" : "secondary"} className="gap-1">
              <div className={cn(
                "h-2 w-2 rounded-full",
                connected ? "bg-green-500 animate-pulse" : "bg-gray-500"
              )} />
              {connected ? "Live" : "Offline"}
            </Badge>

            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchActivities(true)}
              disabled={isLoadingMore}
            >
              <RefreshCw className={cn("h-4 w-4", isLoadingMore && "animate-spin")} />
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={() => setShowWalletManager(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Manage Wallets
            </Button>
          </div>
        </motion.div>

        {/* Stats Overview */}
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

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search token symbol or wallet..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Trades</SelectItem>
                <SelectItem value="buy">Buys Only</SelectItem>
                <SelectItem value="sell">Sells Only</SelectItem>
                <SelectItem value="swap">Swaps Only</SelectItem>
              </SelectContent>
            </Select>

            {trackedWallets && trackedWallets.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Wallet className="h-4 w-4 mr-2" />
                    {selectedWallets.length === 0
                      ? "All Wallets"
                      : `${selectedWallets.length} Selected`}
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
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
        </Card>

        {/* Activity List */}
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
        />

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

        {/* Decorative Elements */}
        <div className="fixed inset-0 pointer-events-none -z-20 overflow-hidden">
          <div className="absolute top-1/3 left-1/5 w-96 h-96 bg-primary/3 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/3 right-1/5 w-96 h-96 bg-green-500/3 rounded-full blur-3xl"></div>
          <div className="absolute top-2/3 left-2/3 w-64 h-64 bg-blue-500/3 rounded-full blur-2xl"></div>
        </div>
        </div>
      </main>
    </div>
  )
}