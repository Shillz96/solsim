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
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            Manage Tracked Wallets
          </DialogTitle>
          <DialogDescription>
            Add, remove, and manage the wallets you're tracking
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tracked" className="gap-2">
              <Eye className="h-4 w-4" />
              Tracked ({trackedWallets.length})
            </TabsTrigger>
            <TabsTrigger value="add" className="gap-2">
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
                  className="pl-9"
                />
              </div>
            )}

            {/* Wallet List */}
            {filteredWallets.length === 0 ? (
              <Card className="p-8 text-center">
                <Eye className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  {searchTerm ? "No wallets found" : "No wallets tracked yet"}
                </p>
                {!searchTerm && (
                  <Button
                    onClick={() => setActiveTab("add")}
                    size="sm"
                    className="mt-4 gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Track Your First Wallet
                  </Button>
                )}
              </Card>
            ) : (
              <div className="space-y-2">
                {filteredWallets.map((wallet) => (
                  <Card key={wallet.id} className="p-3">
                    <div className="flex items-center justify-between">
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
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono text-muted-foreground truncate">
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
                          className="text-destructive hover:bg-destructive/10"
                        >
                          {removingWallets.has(wallet.id) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="add" className="mt-4">
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

                <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                  <p className="font-medium mb-2">Popular KOL Wallets:</p>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span>Example Wallet 1</span>
                      <button
                        onClick={() => setNewWalletAddress("11111111111111111111111111111111")}
                        className="text-primary hover:underline text-xs"
                      >
                        Use
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Example Wallet 2</span>
                      <button
                        onClick={() => setNewWalletAddress("22222222222222222222222222222222")}
                        className="text-primary hover:underline text-xs"
                      >
                        Use
                      </button>
                    </div>
                  </div>
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
      </DialogContent>
    </Dialog>
  )
}