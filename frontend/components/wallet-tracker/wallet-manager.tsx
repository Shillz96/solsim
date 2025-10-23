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
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col bg-white border-4 border-[var(--outline-black)] shadow-[8px_8px_0_var(--outline-black)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-mario text-[var(--outline-black)]">
            <div className="h-8 w-8 rounded-lg bg-[var(--mario-red)] border-3 border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] flex items-center justify-center">
              <Eye className="h-4 w-4 text-white" />
            </div>
            Manage Tracked Wallets
          </DialogTitle>
          <DialogDescription className="font-bold text-muted-foreground">
            Add, remove, and manage the wallets you're tracking
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-2 bg-white border-3 border-[var(--outline-black)] p-1 gap-1">
            <TabsTrigger 
              value="tracked" 
              className="gap-2 font-mario data-[state=active]:bg-[var(--star-yellow)] data-[state=active]:text-[var(--outline-black)] data-[state=active]:border-2 data-[state=active]:border-[var(--outline-black)] data-[state=active]:shadow-[2px_2px_0_var(--outline-black)]"
            >
              <Eye className="h-4 w-4" />
              Tracked ({trackedWallets.length})
            </TabsTrigger>
            <TabsTrigger 
              value="add" 
              className="gap-2 font-mario data-[state=active]:bg-[var(--star-yellow)] data-[state=active]:text-[var(--outline-black)] data-[state=active]:border-2 data-[state=active]:border-[var(--outline-black)] data-[state=active]:shadow-[2px_2px_0_var(--outline-black)]"
            >
              <UserPlus className="h-4 w-4" />
              Add Wallet
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tracked" className="mt-4 overflow-y-auto max-h-[50vh]">
            {/* Search */}
            {trackedWallets.length > 0 && (
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search wallets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-white border-3 border-[var(--outline-black)] rounded-lg shadow-[2px_2px_0_var(--outline-black)] focus:shadow-[3px_3px_0_var(--outline-black)] font-bold"
                />
              </div>
            )}

            {/* Wallet List */}
            {filteredWallets.length === 0 ? (
              <div className="bg-[var(--sky-blue)]/20 rounded-xl border-3 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)] p-8 text-center">
                <div className="h-12 w-12 rounded-full bg-[var(--mario-red)] border-3 border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] flex items-center justify-center mx-auto mb-4">
                  <Eye className="h-6 w-6 text-white" />
                </div>
                <p className="text-sm font-bold text-[var(--outline-black)]">
                  {searchTerm ? "No wallets found" : "No wallets tracked yet"}
                </p>
                {!searchTerm && (
                  <button
                    onClick={() => setActiveTab("add")}
                    className="mt-4 gap-2 h-9 px-4 rounded-lg border-3 border-[var(--outline-black)] bg-[var(--mario-red)] text-white hover:bg-[var(--mario-red)]/90 shadow-[3px_3px_0_var(--outline-black)] hover:shadow-[4px_4px_0_var(--outline-black)] hover:-translate-y-0.5 transition-all flex items-center font-mario mx-auto"
                  >
                    <Plus className="h-4 w-4" />
                    Track Your First Wallet
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredWallets.map((wallet) => (
                  <div key={wallet.id} className="bg-white rounded-xl border-3 border-[var(--outline-black)] shadow-[3px_3px_0_var(--outline-black)] p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {wallet.label && (
                            <Badge variant="secondary" className="text-xs font-mario border-2 border-[var(--outline-black)] bg-[var(--star-yellow)] text-[var(--outline-black)]">
                              {wallet.label}
                            </Badge>
                          )}
                          <Badge
                            variant={wallet.isActive ? "default" : "outline"}
                            className={cn(
                              "text-xs font-mario border-2",
                              wallet.isActive ? "bg-[var(--luigi-green)] text-white border-[var(--outline-black)]" : "border-[var(--outline-black)] bg-gray-100 text-[var(--outline-black)]"
                            )}
                          >
                            {wallet.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono font-bold text-muted-foreground truncate">
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
                        <button
                          onClick={() => handleSyncWallet(wallet.walletAddress)}
                          disabled={syncingWallets.has(wallet.walletAddress)}
                          className="h-8 w-8 rounded-lg border-2 border-[var(--outline-black)] bg-white hover:bg-gray-50 shadow-[2px_2px_0_var(--outline-black)] hover:shadow-[3px_3px_0_var(--outline-black)] hover:-translate-y-0.5 transition-all flex items-center justify-center disabled:opacity-50"
                        >
                          <RefreshCw className={cn(
                            "h-4 w-4",
                            syncingWallets.has(wallet.walletAddress) && "animate-spin"
                          )} />
                        </button>
                        <button
                          onClick={() => handleRemoveWallet(wallet.id)}
                          disabled={removingWallets.has(wallet.id)}
                          className="h-8 w-8 rounded-lg border-2 border-[var(--mario-red)] bg-white hover:bg-[var(--mario-red)]/10 shadow-[2px_2px_0_var(--outline-black)] hover:shadow-[3px_3px_0_var(--outline-black)] hover:-translate-y-0.5 transition-all flex items-center justify-center disabled:opacity-50 text-[var(--mario-red)]"
                        >
                          {removingWallets.has(wallet.id) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="add" className="mt-4">
            <div className="bg-white rounded-xl border-4 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)] p-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="wallet-address" className="font-bold text-[var(--outline-black)]">Wallet Address *</Label>
                  <Input
                    id="wallet-address"
                    placeholder="Enter Solana wallet address..."
                    value={newWalletAddress}
                    onChange={(e) => setNewWalletAddress(e.target.value)}
                    className="font-mono bg-white border-3 border-[var(--outline-black)] rounded-lg shadow-[2px_2px_0_var(--outline-black)] focus:shadow-[3px_3px_0_var(--outline-black)]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wallet-label" className="font-bold text-[var(--outline-black)]">Label (Optional)</Label>
                  <Input
                    id="wallet-label"
                    placeholder="e.g., 'Ansem', 'Top Trader'..."
                    value={newWalletLabel}
                    onChange={(e) => setNewWalletLabel(e.target.value)}
                    className="bg-white border-3 border-[var(--outline-black)] rounded-lg shadow-[2px_2px_0_var(--outline-black)] focus:shadow-[3px_3px_0_var(--outline-black)]"
                  />
                </div>

                <div className="bg-[var(--sky-blue)]/20 rounded-lg border-3 border-[var(--outline-black)] p-4 text-sm">
                  <p className="font-mario mb-2 text-[var(--outline-black)]">Popular KOL Wallets:</p>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[var(--outline-black)]">Example Wallet 1</span>
                      <button
                        onClick={() => setNewWalletAddress("11111111111111111111111111111111")}
                        className="text-[var(--mario-red)] hover:underline text-xs font-mario"
                      >
                        Use
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[var(--outline-black)]">Example Wallet 2</span>
                      <button
                        onClick={() => setNewWalletAddress("22222222222222222222222222222222")}
                        className="text-[var(--mario-red)] hover:underline text-xs font-mario"
                      >
                        Use
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleAddWallet}
                  disabled={isAddingWallet || !newWalletAddress.trim()}
                  className="w-full gap-2 h-10 px-4 rounded-lg border-3 border-[var(--outline-black)] bg-[var(--luigi-green)] text-white hover:bg-[var(--luigi-green)]/90 shadow-[3px_3px_0_var(--outline-black)] hover:shadow-[4px_4px_0_var(--outline-black)] hover:-translate-y-0.5 transition-all flex items-center justify-center font-mario disabled:opacity-50"
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
                </button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}