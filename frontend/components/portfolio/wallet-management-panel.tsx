"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import { Wallet2, Plus, ExternalLink, Loader2, Star, Check, AlertTriangle } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { formatNumber } from "@/lib/format"
import api from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useQueryClient } from "@tanstack/react-query"

interface Wallet {
  id: string
  name: string
  walletType: 'PLATFORM_GENERATED' | 'IMPORTED'
  address: string
  balance: string
  isActive: boolean
  createdAt: string
  hasEncryptedKey?: boolean
}

export function WalletManagementPanel() {
  const { user, isAuthenticated } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch wallets
  const { data: wallets = [], isLoading, error } = useQuery<Wallet[]>({
    queryKey: ['wallets', user?.id],
    queryFn: () => (user?.id ? api.getUserWallets(user.id) : Promise.resolve([])),
    enabled: !!user?.id && isAuthenticated,
    staleTime: 30000,
  })

  const handleSetActive = async (walletId: string) => {
    if (!user?.id) return

    try {
      await api.setActiveWallet(user.id, walletId)
      await queryClient.invalidateQueries({ queryKey: ['wallets', user.id] })
      await queryClient.invalidateQueries({ queryKey: ['portfolio', user.id] })

      toast({
        title: '✅ Wallet Activated!',
        description: 'Active wallet has been updated',
      })
    } catch (error: any) {
      console.error('Failed to set active wallet:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to set active wallet',
        variant: 'destructive',
      })
    }
  }

  const handleCreateWallet = async () => {
    if (!user?.id) return

    const walletName = prompt('Enter wallet name:', `Wallet ${wallets.length + 1}`)
    if (!walletName) return

    try {
      await api.createWallet(user.id, walletName)
      await queryClient.invalidateQueries({ queryKey: ['wallets', user.id] })

      toast({
        title: '🎉 Wallet Created!',
        description: `${walletName} has been created`,
      })
    } catch (error: any) {
      console.error('Failed to create wallet:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to create wallet',
        variant: 'destructive',
      })
    }
  }

  // Show nothing if not authenticated
  if (!isAuthenticated) return null

  // Calculate total balance
  const totalBalance = wallets.reduce((sum, wallet) => {
    return sum + parseFloat(wallet.balance || '0')
  }, 0)

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.25 }}
    >
      <div className="bg-[var(--sky-blue)]/20 border-4 border-[var(--outline-black)] rounded-xl shadow-[6px_6px_0_var(--outline-black)] p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Image src="/icons/mario/user.png" alt="Wallet" width={24} height={24} />
            <h3 className="text-lg font-mario font-bold text-[var(--outline-black)]">WALLET MANAGEMENT</h3>
          </div>
          
          {/* Total Balance Badge */}
          <Badge className="bg-coin-yellow-500 text-pipe-900 border-2 border-pipe-700 font-bold text-xs">
            <Star className="h-3 w-3 mr-1" />
            {formatNumber(totalBalance)} SOL
          </Badge>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-mario-red" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-6">
            <div className="bg-mario-red-50 border-3 border-mario-red-500 rounded-lg p-4 mb-4">
              <AlertTriangle className="h-8 w-8 text-mario-red-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-mario-red-800 mb-1">Error Loading Wallets</p>
              <p className="text-xs text-mario-red-600">Please try refreshing the page</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && wallets.length === 0 && (
          <div className="text-center py-6">
            <div className="bg-[var(--star-yellow)]/20 border-3 border-[var(--star-yellow)] rounded-lg p-4 mb-4">
              <Wallet2 className="h-8 w-8 text-mario-red mx-auto mb-2" />
              <p className="text-sm font-bold text-[var(--outline-black)] mb-1">No Wallets Found</p>
              <p className="text-xs text-muted-foreground font-semibold">Create your first wallet to get started!</p>
            </div>
            <Button
              onClick={handleCreateWallet}
              className="w-full mario-btn mario-btn-red font-bold text-white gap-2"
              size="sm"
            >
              <Plus className="h-4 w-4" />
              Create First Wallet
            </Button>
          </div>
        )}

        {/* Wallets List */}
        {!isLoading && !error && wallets.length > 0 && (
          <div className="space-y-3">
            {/* Show max 3 wallets */}
            {wallets.slice(0, 3).map((wallet) => (
              <div
                key={wallet.id}
                className="bg-[var(--card)]/80 border-3 border-[var(--outline-black)] shadow-[3px_3px_0_var(--outline-black)] rounded-lg p-3 hover:bg-[var(--card)] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="text-sm font-mario font-bold text-[var(--outline-black)] truncate">
                        {wallet.name}
                      </div>
                      {wallet.isActive && (
                        <Badge className="bg-luigi-green-500 text-white text-xs font-bold px-2 py-0.5">
                          <Check className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs font-mono text-[var(--pipe-700)] truncate mb-1">
                      {wallet.address.slice(0, 4)}...{wallet.address.slice(-4)}
                    </div>
                    <div className="text-xs font-bold text-[var(--outline-black)]">
                      {formatNumber(parseFloat(wallet.balance || '0'))} SOL
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    {!wallet.isActive && (
                      <Button
                        onClick={() => handleSetActive(wallet.id)}
                        size="sm"
                        className="text-xs h-6 px-2 mario-btn bg-star-yellow-500 text-pipe-900 hover:bg-star-yellow-400 shadow-mario font-bold border-2 border-pipe-700"
                      >
                        Activate
                      </Button>
                    )}
                    <Badge
                      variant={wallet.walletType === 'IMPORTED' ? "default" : "secondary"}
                      className={cn(
                        "text-xs font-bold",
                        wallet.walletType === 'IMPORTED' 
                          ? "bg-mario-red-500 text-white" 
                          : "bg-pipe-200 text-pipe-900"
                      )}
                    >
                      {wallet.walletType === 'IMPORTED' ? 'Imported' : 'Generated'}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}

            {/* Show more indicator */}
            {wallets.length > 3 && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground font-bold">
                  +{wallets.length - 3} more wallet{wallets.length - 3 !== 1 ? 's' : ''}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleCreateWallet}
                variant="outline"
                className="flex-1 border-3 border-[var(--outline-black)] font-bold text-xs h-9"
                size="sm"
              >
                <Plus className="h-3 w-3 mr-1" />
                Create
              </Button>
              <Button
                onClick={() => window.location.href = '/wallet-management'}
                className="flex-1 mario-btn bg-sky-blue font-bold text-pipe-900 border-2 border-black text-xs h-9"
                size="sm"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Manage All
              </Button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
