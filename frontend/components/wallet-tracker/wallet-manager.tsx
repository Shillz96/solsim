"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X,
  Plus,
  Trash2,
  Copy,
  ExternalLink,
  RefreshCw,
  Loader2,
  Eye,
  EyeOff,
  UserPlus,
  Search
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

interface TrackedWallet {
  id: string
  userId: string
  walletAddress: string
  label?: string
  isActive: boolean
  createdAt: string
}

interface WalletManagerProps {
  isOpen: boolean
  onClose: () => void
  onWalletsUpdated: () => void
  trackedWallets: TrackedWallet[]
  onSyncWallet: (address: string) => Promise<void>
}

export function WalletManager({
  isOpen,
  onClose,
  onWalletsUpdated,
  trackedWallets,
  onSyncWallet
}: WalletManagerProps) {
  const { user } = useAuth()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState<"tracked" | "add">("tracked")
  const [newWalletAddress, setNewWalletAddress] = useState("")
  const [newWalletLabel, setNewWalletLabel] = useState("")
  const [isAddingWallet, setIsAddingWallet] = useState(false)
  const [syncingWallets, setSyncingWallets] = useState<Set<string>>(new Set())
  const [removingWallets, setRemovingWallets] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState("")

  // Filter tracked wallets
  const filteredWallets = trackedWallets.filter(wallet => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      wallet.walletAddress.toLowerCase().includes(search) ||
      wallet.label?.toLowerCase().includes(search)
    )
  })

  // Add wallet
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
      const response = await fetch(`${API_URL}/api/wallet-tracker/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          walletAddress: newWalletAddress.trim(),
          label: newWalletLabel.trim() || undefined
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add wallet')
      }

      toast({
        title: "Success",
        description: `Wallet ${newWalletLabel || newWalletAddress.slice(0, 8)} added to tracking`,
      })

      setNewWalletAddress("")
      setNewWalletLabel("")
      onWalletsUpdated()
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

  // Remove wallet
  const handleRemoveWallet = async (trackingId: string) => {
    setRemovingWallets(prev => new Set(prev).add(trackingId))

    try {
      const response = await fetch(`${API_URL}/api/wallet-tracker/${trackingId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        throw new Error('Failed to remove wallet')
      }

      toast({
        title: "Success",
        description: "Wallet removed from tracking"
      })

      onWalletsUpdated()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove wallet",
        variant: "destructive"
      })
    } finally {
      setRemovingWallets(prev => {
        const next = new Set(prev)
        next.delete(trackingId)
        return next
      })
    }
  }

  // Sync wallet
  const handleSyncWallet = async (address: string) => {
    setSyncingWallets(prev => new Set(prev).add(address))

    try {
      await onSyncWallet(address)
    } finally {
      setSyncingWallets(prev => {
        const next = new Set(prev)
        next.delete(address)
        return next
      })
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied!",
      description: "Address copied to clipboard"
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col border-4 border-pipe-700 shadow-mario">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-bold text-pipe-900">
            <Eye className="h-6 w-6 text-mario-red" />
            Manage Tracked Wallets
          </DialogTitle>
          <DialogDescription className="font-semibold text-pipe-700">
            Add, remove, and manage the wallets you're tracking
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-2 border-3 border-pipe-700 bg-sky-100">
            <TabsTrigger value="tracked" className="gap-2 font-bold data-[state=active]:bg-mario-red data-[state=active]:text-white">
              <Eye className="h-4 w-4" />
              Tracked ({trackedWallets.length})
            </TabsTrigger>
            <TabsTrigger value="add" className="gap-2 font-bold data-[state=active]:bg-mario-red data-[state=active]:text-white">
              <UserPlus className="h-4 w-4" />
              Add Wallet
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tracked" className="mt-4 overflow-y-auto max-h-[50vh]">
            {/* Search */}
            {trackedWallets.length > 0 && (
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-pipe-700" />
                <Input
                  placeholder="Search wallets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 border-3 border-pipe-500 focus:border-mario-red font-semibold"
                />
              </div>
            )}

            {/* Wallet List */}
            {filteredWallets.length === 0 ? (
              <div className="mario-card bg-sky-50 border-4 border-pipe-700 shadow-mario p-8 text-center">
                <Eye className="h-12 w-12 text-mario-red mx-auto mb-4" />
                <p className="text-sm font-bold text-pipe-900">
                  {searchTerm ? "No wallets found" : "No wallets tracked yet"}
                </p>
                {!searchTerm && (
                  <Button
                    onClick={() => setActiveTab("add")}
                    size="sm"
                    className="mt-4 gap-2 mario-btn mario-btn-red text-white font-bold"
                  >
                    <Plus className="h-4 w-4" />
                    Track Your First Wallet
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredWallets.map((wallet) => (
                  <div key={wallet.id} className="mario-card bg-white border-3 border-pipe-700 shadow-md p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {wallet.label && (
                            <Badge variant="secondary" className="text-xs font-bold border-2 border-pipe-700 bg-star-yellow-400 text-black">
                              {wallet.label}
                            </Badge>
                          )}
                          <Badge
                            variant={wallet.isActive ? "default" : "outline"}
                            className={cn(
                              "text-xs font-bold border-2",
                              wallet.isActive ? "bg-luigi-green-500 text-white border-black" : "border-pipe-700 bg-pipe-200 text-pipe-900"
                            )}
                          >
                            {wallet.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono font-bold text-pipe-700 truncate">
                            {wallet.walletAddress}
                          </code>
                          <button
                            onClick={() => copyToClipboard(wallet.walletAddress)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                          <a
                            href={`https://solscan.io/account/${wallet.walletAddress}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSyncWallet(wallet.walletAddress)}
                          disabled={syncingWallets.has(wallet.walletAddress)}
                          className="border-2 border-pipe-500 hover:bg-sky-100"
                        >
                          <RefreshCw className={cn(
                            "h-4 w-4",
                            syncingWallets.has(wallet.walletAddress) && "animate-spin"
                          )} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveWallet(wallet.id)}
                          disabled={removingWallets.has(wallet.id)}
                          className="text-mario-red hover:bg-mario-red/10 border-2 border-mario-red"
                        >
                          {removingWallets.has(wallet.id) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="add" className="mt-4">
            <div className="mario-card bg-white border-4 border-pipe-700 shadow-mario p-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="wallet-address" className="font-bold text-pipe-900">Wallet Address *</Label>
                  <Input
                    id="wallet-address"
                    placeholder="Enter Solana wallet address..."
                    value={newWalletAddress}
                    onChange={(e) => setNewWalletAddress(e.target.value)}
                    className="font-mono border-3 border-pipe-500 focus:border-mario-red"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wallet-label" className="font-bold text-pipe-900">Label (Optional)</Label>
                  <Input
                    id="wallet-label"
                    placeholder="e.g., 'Ansem', 'Top Trader'..."
                    value={newWalletLabel}
                    onChange={(e) => setNewWalletLabel(e.target.value)}
                    className="border-3 border-pipe-500 focus:border-mario-red"
                  />
                </div>

                <div className="bg-sky-100 rounded-lg border-3 border-pipe-500 p-4 text-sm">
                  <p className="font-bold mb-2 text-pipe-900">Popular KOL Wallets:</p>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-pipe-700">Example Wallet 1</span>
                      <button
                        onClick={() => setNewWalletAddress("11111111111111111111111111111111")}
                        className="text-mario-red hover:underline text-xs font-bold"
                      >
                        Use
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-pipe-700">Example Wallet 2</span>
                      <button
                        onClick={() => setNewWalletAddress("22222222222222222222222222222222")}
                        className="text-mario-red hover:underline text-xs font-bold"
                      >
                        Use
                      </button>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleAddWallet}
                  disabled={isAddingWallet || !newWalletAddress.trim()}
                  className="w-full gap-2 mario-btn mario-btn-green text-white font-bold"
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
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}