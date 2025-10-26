"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import { Eye, Plus, ExternalLink, TrendingUp, Loader2, Wallet, AlertCircle } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useWalletTrackerWebSocket } from "@/hooks/use-wallet-tracker-ws"
import dynamic from "next/dynamic"

// Lazy load the wallet manager modal
const WalletManager = dynamic(
  () => import('@/components/wallet-tracker/wallet-manager').then(m => ({ default: m.WalletManager })),
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

export function WalletTrackerPanel() {
  const { user, isAuthenticated } = useAuth()
  const [showWalletManager, setShowWalletManager] = useState(false)

  // Fetch tracked wallets
  const { data: trackedWallets, isLoading, refetch: refetchWallets } = useQuery<TrackedWallet[]>({
    queryKey: ['tracked-wallets', user?.id],
    queryFn: async () => {
      if (!user?.id) return []

      const response = await fetch(`${API_URL}/api/wallet-tracker/user/${user.id}`)
      if (!response.ok) throw new Error('Failed to fetch tracked wallets')

      const data = await response.json()
      return data.trackedWallets || []
    },
    enabled: !!user?.id && isAuthenticated,
    refetchInterval: 30000 // Refetch every 30 seconds
  })

  // Connect to WebSocket for real-time status
  const { connected } = useWalletTrackerWebSocket(user?.id || '')

  // Show nothing if not authenticated
  if (!isAuthenticated) return null

  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.25 }}
      >
        <div className="bg-sky/20 border-4 border-outline rounded-xl shadow-[6px_6px_0_var(--outline-black)] p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Image src="/icons/mario/user.png" alt="Wallet" width={24} height={24} />
              <h3 className="text-lg font-mario font-bold text-outline">WALLET TRACKER</h3>
            </div>
            
            {/* Live Status Badge */}
            <Badge
              variant={connected ? "default" : "secondary"}
              className={cn(
                "gap-1 border-2 font-bold text-xs",
                connected ? "bg-luigi-green text-white border-black" : "bg-pipe-200 text-pipe-900 border-pipe-700"
              )}
            >
              <div className={cn(
                "h-1.5 w-1.5 rounded-full",
                connected ? "bg-card animate-pulse" : "bg-pipe-700"
              )} />
              {connected ? "Live" : "Offline"}
            </Badge>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-mario-red" />
            </div>
          )}

          {/* Empty State */}
          {!isLoading && (!trackedWallets || trackedWallets.length === 0) && (
            <div className="text-center py-6">
              <div className="bg-star/20 border-3 border-star rounded-lg p-4 mb-4">
                <Eye className="h-8 w-8 text-mario-red mx-auto mb-2" />
                <p className="text-sm font-bold text-outline mb-1">No Wallets Tracked</p>
                <p className="text-xs text-muted-foreground font-semibold">Start tracking KOL wallets to copy their trades!</p>
              </div>
              <Button
                onClick={() => setShowWalletManager(true)}
                className="w-full mario-btn mario-btn-red font-bold text-white gap-2"
                size="sm"
              >
                <Plus className="h-4 w-4" />
                Track Your First Wallet
              </Button>
            </div>
          )}

          {/* Wallets List */}
          {!isLoading && trackedWallets && trackedWallets.length > 0 && (
            <div className="space-y-3">
              {/* Show max 3 wallets */}
              {trackedWallets.slice(0, 3).map((wallet) => (
                <div
                  key={wallet.id}
                  className="bg-card/80 border-3 border-outline shadow-[3px_3px_0_var(--outline-black)] rounded-lg p-3 hover:bg-card transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      {wallet.label && (
                        <div className="text-sm font-mario font-bold text-outline truncate mb-1">
                          {wallet.label}
                        </div>
                      )}
                      <div className="text-xs font-mono text-[var(--pipe-700)] truncate">
                        {wallet.walletAddress.slice(0, 4)}...{wallet.walletAddress.slice(-4)}
                      </div>
                    </div>
                    <Badge
                      variant={wallet.isActive ? "default" : "secondary"}
                      className={cn(
                        "text-xs font-bold ml-2",
                        wallet.isActive ? "bg-luigi-green text-white" : "bg-gray-300 text-gray-600"
                      )}
                    >
                      {wallet.isActive ? "Active" : "Paused"}
                    </Badge>
                  </div>
                </div>
              ))}

              {/* Show more indicator */}
              {trackedWallets.length > 3 && (
                <div className="text-center">
                  <p className="text-xs text-muted-foreground font-bold">
                    +{trackedWallets.length - 3} more wallet{trackedWallets.length - 3 !== 1 ? 's' : ''}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => setShowWalletManager(true)}
                  variant="outline"
                  className="flex-1 border-3 border-outline font-bold text-xs h-9"
                  size="sm"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Manage
                </Button>
                <Button
                  onClick={() => window.location.href = '/wallet-tracker'}
                  className="flex-1 mario-btn bg-sky-blue font-bold text-pipe-900 border-2 border-black text-xs h-9"
                  size="sm"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View All
                </Button>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Wallet Manager Modal */}
      {showWalletManager && (
        <WalletManager
          isOpen={showWalletManager}
          onClose={() => setShowWalletManager(false)}
          onWalletsUpdated={() => {
            refetchWallets()
          }}
          trackedWallets={trackedWallets || []}
          onSyncWallet={async () => {}} // No sync needed in this simple view
        />
      )}
    </>
  )
}
