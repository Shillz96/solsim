"use client"

import { useState, useEffect, useCallback, useRef, useId } from "react"
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
  Loader2,
  UserPlus,
  Activity,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { useMutation, useQuery } from "@tanstack/react-query"
import { cn } from "@/lib/utils"
import * as api from "@/lib/wallet-tracker-api"
import type * as Backend from "@/lib/types/backend"

interface WalletTrackerPopupProps {
  isOpen: boolean
  onClose: () => void
}

export function WalletTrackerPopup({ isOpen, onClose }: WalletTrackerPopupProps) {
  const { user, getUserId } = useAuth()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<"tracked" | "add">("tracked")

  // Swipe to close
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const minSwipeDistance = 50

  // Focus management
  const popupRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  // Form state
  const addressId = useId()
  const labelId = useId()
  const [newWalletAddress, setNewWalletAddress] = useState("")
  const [newWalletLabel, setNewWalletLabel] = useState("")

  // UI state
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null)

  // Copy-trade state (persist)
  const [copyTradePercentage, setCopyTradePercentage] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("wallet-tracker-copy-percentage")
      return saved ? parseInt(saved, 10) : 100
    }
    return 100
  })

  useEffect(() => {
    localStorage.setItem("wallet-tracker-copy-percentage", copyTradePercentage.toString())
  }, [copyTradePercentage])

  // Debounce slider changes for smoother UI
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const debouncedSetCopyTradePercentage = useCallback((value: number) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setCopyTradePercentage(value), 100)
  }, [])

  // Data: tracked wallets
  const {
    data: trackedWallets = [],
    isLoading: loadingWallets,
    refetch: refetchTrackedWallets,
  } = useQuery({
    queryKey: ["tracked-wallets", user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      const userId = getUserId()
      if (!userId) return []
      const response = await api.getTrackedWallets(userId)
      return response.trackedWallets
    },
    enabled: !!user?.id && isOpen,
    staleTime: 30_000,
  })

  // Data: wallet activity
  const {
    data: walletActivity = [],
    isLoading: loadingActivity,
    refetch: refetchWalletActivity,
  } = useQuery({
    queryKey: ["wallet-activity", selectedWallet],
    queryFn: async () => {
      if (!selectedWallet) return []
      const response = await api.getWalletActivity(selectedWallet, 20)
      return response.activity
    },
    enabled: !!selectedWallet,
    staleTime: 15_000,
  })

  // Mutations
  const addWalletMutation = useMutation({
    mutationFn: async ({ walletAddress, label }: { walletAddress: string; label?: string }) => {
      const userId = getUserId()
      if (!userId) throw new Error("User not authenticated")
      return await api.trackWallet(userId, walletAddress, label)
    },
    onSuccess: () => {
      refetchTrackedWallets()
      toast({
        title: "Success",
        description: `Wallet ${newWalletLabel || newWalletAddress.slice(0, 8)} added to tracking`,
      })
      setNewWalletAddress("")
      setNewWalletLabel("")
      setActiveTab("tracked")
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add wallet",
        variant: "destructive",
      })
    },
  })

  const removeWalletMutation = useMutation({
    mutationFn: async (trackingId: string) => {
      return await api.untrackWallet(trackingId)
    },
    onSuccess: () => {
      refetchTrackedWallets()
      toast({ title: "Removed", description: "Wallet removed from tracking" })
      if (selectedWallet) setSelectedWallet(null)
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove wallet",
        variant: "destructive",
      })
    },
  })

  const copyTradeMutation = useMutation({
    mutationFn: async ({
      walletAddress,
      signature,
      percentage,
    }: {
      walletAddress: string
      signature: string
      percentage: number
    }) => {
      const userId = getUserId()
      if (!userId) throw new Error("User not authenticated")
      return await api.copyTrade(userId, walletAddress, signature, percentage)
    },
    onSuccess: (_, { percentage }) => {
      toast({
        title: "Trade copied",
        description: `Executed at ${percentage}% size`,
      })
    },
    onError: (error: any) => {
      toast({
        title: "Copy failed",
        description: error.message || "Unable to copy this trade",
        variant: "destructive",
      })
    },
  })

  // Handlers
  const handleAddWallet = () => {
    if (!user || !newWalletAddress.trim()) {
      toast({
        title: "Missing address",
        description: "Please enter a wallet address",
        variant: "destructive",
      })
      return
    }
    addWalletMutation.mutate({
      walletAddress: newWalletAddress.trim(),
      label: newWalletLabel.trim() || undefined,
    })
  }

  const handleRemoveWallet = (trackingId: string) => {
    removeWalletMutation.mutate(trackingId)
  }

  const handleCopyTrade = (walletAddress: string, signature: string) => {
    if (!user) {
      toast({
        title: "Please log in",
        description: "You must be logged in to copy trades",
        variant: "destructive",
      })
      return
    }
    copyTradeMutation.mutate({
      walletAddress,
      signature,
      percentage: copyTradePercentage,
    })
  }

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientY)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientY)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const isDownSwipe = distance < -minSwipeDistance
    if (isDownSwipe) onClose()
  }

  // Popup lifecycle: scroll lock + focus restore
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
      previousFocusRef.current = document.activeElement as HTMLElement

      // Focus the first focusable element for accessibility
      setTimeout(() => {
        if (!popupRef.current) return
        const focusable = popupRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        ;(focusable[0] ?? popupRef.current).focus()
      }, 50)

      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose()
      }
      document.addEventListener("keydown", onKey)
      return () => document.removeEventListener("keydown", onKey)
    } else {
      document.body.style.overflow = ""
      if (previousFocusRef.current) previousFocusRef.current.focus()
    }

    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen, onClose])

  const handleBackdropClick = () => {
    if (copyTradeMutation.isPending) {
      const confirmed = window.confirm(
        "A trade copy is in progress. Close the wallet tracker anyway?"
      )
      if (!confirmed) return
    }
    onClose()
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: "Copied", description: "Address copied to clipboard" })
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
            className="fixed inset-0 z-[var(--z-modal-backdrop,60)] bg-black/60 backdrop-blur-sm"
            onClick={handleBackdropClick}
          />

          {/* Bottom Sheet */}
          <motion.div
            ref={popupRef}
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            className={cn(
              "fixed left-1/2 bottom-0 z-[var(--z-modal,70)] w-full max-w-3xl -translate-x-1/2",
              "rounded-t-2xl border-t-4 border-[var(--outline-black)]",
              "bg-[var(--panel-bg,theme(colors.background))] shadow-[0_-10px_0_var(--outline-black)]",
              "ring-1 ring-black/5"
            )}
            role="dialog"
            aria-modal="true"
            aria-label="Wallet tracker"
            tabIndex={-1}
          >
            {/* Grab handle / swipe area */}
            <div
              className="relative w-full touch-none"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-foreground/20" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4 border-b-4 border-outline bg-sky/20 backdrop-blur-sm">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-xl border-3 border-outline bg-mario-yellow shadow-[3px_3px_0_var(--outline-black)]">
                  <Eye className="h-5 w-5 text-outline" />
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-base font-mario font-bold tracking-tight text-outline sm:text-lg">
                    Wallet Tracker
                  </h2>
                  <p className="text-xs text-muted-foreground font-bold">
                    Follow KOL wallets & copy trades
                  </p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-xl border-3 border-transparent hover:border-outline hover:bg-destructive/10 hover:text-destructive"
                aria-label="Close wallet tracker"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Tabs */}
            <div className="px-4 pb-3 pt-2 sm:px-5 bg-sky/20">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                <TabsList
                  className={cn(
                    "grid w-full grid-cols-2 rounded-2xl border-3 border-outline bg-white/80 backdrop-blur",
                    "shadow-[4px_4px_0_var(--outline-black)]"
                  )}
                >
                  <TabsTrigger
                    value="tracked"
                    className={cn(
                      "gap-2 rounded-xl font-mario font-bold data-[state=active]:bg-mario-red data-[state=active]:text-white",
                      "data-[state=active]:shadow-[inset_0_-3px_0_rgba(0,0,0,0.25)]"
                    )}
                  >
                    <Activity className="h-4 w-4" />
                    Tracked ({trackedWallets.length})
                  </TabsTrigger>
                  <TabsTrigger
                    value="add"
                    className={cn(
                      "gap-2 rounded-xl font-mario font-bold data-[state=active]:bg-mario-blue data-[state=active]:text-white",
                      "data-[state=active]:shadow-[inset_0_-3px_0_rgba(0,0,0,0.25)]"
                    )}
                  >
                    <UserPlus className="h-4 w-4" />
                    Add Wallet
                  </TabsTrigger>
                </TabsList>

                {/* Content scroll area */}
                <div className="max-h-[min(70vh,680px)] overflow-y-auto overscroll-contain py-3">
                  {/* TRACKED */}
                  <TabsContent value="tracked" className="space-y-4">
                    {loadingWallets ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : trackedWallets.length === 0 ? (
                      <EmptyState onPrimary={() => setActiveTab("add")} />
                    ) : (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {trackedWallets.map((wallet: Backend.TrackedWallet) => (
                          <button
                            key={wallet.id}
                            type="button"
                            className={cn(
                              "group text-left rounded-2xl border-3 border-outline bg-white/90 backdrop-blur-sm p-4 transition-all",
                              "shadow-[4px_4px_0_var(--outline-black)] hover:-translate-y-0.5 hover:shadow-[6px_6px_0_var(--outline-black)]",
                              selectedWallet === wallet.walletAddress &&
                                "bg-mario-yellow/20"
                            )}
                            onClick={() => setSelectedWallet(wallet.walletAddress)}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                  {wallet.label && (
                                    <Badge
                                      variant="secondary"
                                      className="rounded-lg border-2 border-outline bg-white font-bold text-xs shadow-[2px_2px_0_var(--outline-black)]"
                                    >
                                      {wallet.label}
                                    </Badge>
                                  )}
                                  <Badge
                                    variant={wallet.isActive ? "default" : "outline"}
                                    className={cn(
                                      "rounded-lg border-2 border-outline font-bold text-xs",
                                      wallet.isActive
                                        ? "bg-mario-green text-white"
                                        : "bg-white"
                                    )}
                                  >
                                    {wallet.isActive ? "Active" : "Inactive"}
                                  </Badge>
                                </div>

                                <div className="flex items-center gap-2">
                                  <code className="truncate font-mono text-sm text-muted-foreground font-bold">
                                    {wallet.walletAddress}
                                  </code>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-lg border-2 border-transparent hover:border-outline"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      copyToClipboard(wallet.walletAddress)
                                    }}
                                    aria-label="Copy address"
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-lg border-2 border-transparent hover:border-outline"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      window.open(
                                        `https://solscan.io/account/${wallet.walletAddress}`,
                                        "_blank"
                                      )
                                    }}
                                    aria-label="Open on Solscan"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg border-2 border-transparent text-destructive hover:border-outline hover:bg-destructive/10"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleRemoveWallet(wallet.id)
                                }}
                                aria-label="Remove wallet"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Activity */}
                    {selectedWallet && (
                      <section className="mt-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-mario font-bold tracking-tight text-outline">Recent Activity</h3>
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl border-3 border-outline bg-white shadow-[2px_2px_0_var(--outline-black)]"
                            onClick={() => refetchWalletActivity()}
                            disabled={loadingActivity}
                            aria-label="Refresh activity"
                          >
                            {loadingActivity ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Activity className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>

                        {/* Copy-trade control */}
                        <div className="rounded-2xl border-3 border-outline bg-mario-blue/10 backdrop-blur-sm p-4 shadow-[4px_4px_0_var(--outline-black)]">
                          <div className="space-y-3">
                            <Label
                              htmlFor="copy-trade-slider"
                              className="text-xs font-bold text-foreground/90"
                            >
                              Copy trade size
                            </Label>
                            <div className="flex items-center gap-4">
                              <Slider
                                id="copy-trade-slider"
                                value={[copyTradePercentage]}
                                onValueChange={(v) => debouncedSetCopyTradePercentage(v[0])}
                                onValueCommit={(v) => setCopyTradePercentage(v[0])}
                                min={1}
                                max={100}
                                step={1}
                                className="flex-1"
                                aria-label="Copy trade percentage"
                              />
                              <Badge
                                variant="outline"
                                className="min-w-[60px] justify-center rounded-xl border-2 border-outline bg-white font-bold shadow-[2px_2px_0_var(--outline-black)]"
                              >
                                {copyTradePercentage}%
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground font-bold">
                              Executes at {copyTradePercentage}% of the original size.
                            </p>
                          </div>
                        </div>

                        {/* Activity list */}
                        {loadingActivity ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          </div>
                        ) : walletActivity.length === 0 ? (
                          <div className="grid place-items-center rounded-2xl border-3 border-outline bg-white/90 backdrop-blur-sm p-6 text-center shadow-[4px_4px_0_var(--outline-black)]">
                            <div>
                              <AlertCircle className="mx-auto mb-2 h-6 w-6 text-foreground/70" />
                              <p className="text-sm font-bold">No recent activity</p>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {walletActivity.map((activity: Backend.WalletActivity) => (
                              <div
                                key={activity.signature}
                                className="rounded-2xl border-3 border-outline bg-white/90 backdrop-blur-sm p-4 shadow-[4px_4px_0_var(--outline-black)] sm:p-5"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                                      <Badge
                                        variant="outline"
                                        className="rounded-lg border-2 border-outline bg-white font-bold text-xs"
                                      >
                                        {activity.type}
                                      </Badge>
                                      <span className="text-xs text-muted-foreground font-bold">
                                        {new Date(activity.timestamp).toLocaleTimeString()}
                                      </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:gap-x-8">
                                      <div className="flex items-center gap-2">
                                        <TrendingDown className="h-3.5 w-3.5 text-mario" />
                                        <span className="text-muted-foreground font-bold">In:</span>
                                        <code className="truncate font-mono font-bold">
                                          {activity.tokenIn?.slice(0, 8) || "N/A"}
                                        </code>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <TrendingUp className="h-3.5 w-3.5 text-luigi" />
                                        <span className="text-muted-foreground font-bold">Out:</span>
                                        <code className="truncate font-mono font-bold">
                                          {activity.tokenOut?.slice(0, 8) || "N/A"}
                                        </code>
                                      </div>
                                    </div>
                                  </div>

                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      selectedWallet &&
                                      handleCopyTrade(selectedWallet, activity.signature)
                                    }
                                    disabled={copyTradeMutation.isPending}
                                    className={cn(
                                      "gap-2 rounded-xl border-3 border-outline font-mario font-bold",
                                      "bg-mario-green text-white shadow-[3px_3px_0_var(--outline-black)]",
                                      "hover:translate-y-[-1px] hover:shadow-[4px_4px_0_var(--outline-black)]"
                                    )}
                                  >
                                    {copyTradeMutation.isPending ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Copy className="h-3.5 w-3.5" />
                                    )}
                                    Copy
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </section>
                    )}
                  </TabsContent>

                  {/* ADD */}
                  <TabsContent value="add">
                    <div className="rounded-2xl border-3 border-outline bg-white/90 backdrop-blur-sm p-5 shadow-[4px_4px_0_var(--outline-black)] sm:p-6">
                      <div className="space-y-5">
                        <div className="space-y-2">
                          <Label htmlFor={addressId} className="font-bold">Wallet Address *</Label>
                          <Input
                            id={addressId}
                            placeholder="Enter Solana wallet address…"
                            value={newWalletAddress}
                            onChange={(e) => setNewWalletAddress(e.target.value)}
                            className="rounded-xl border-3 border-outline font-mono"
                            autoComplete="off"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={labelId} className="font-bold">Label (optional)</Label>
                          <Input
                            id={labelId}
                            placeholder="e.g., “Ansem”, “Top Trader”…"
                            value={newWalletLabel}
                            onChange={(e) => setNewWalletLabel(e.target.value)}
                            className="rounded-xl border-3 border-outline"
                            autoComplete="off"
                          />
                        </div>

                        <Button
                          onClick={handleAddWallet}
                          disabled={addWalletMutation.isPending || !newWalletAddress.trim()}
                          className={cn(
                            "w-full gap-2 rounded-2xl border-3 border-outline font-mario font-bold",
                            "bg-mario-blue text-white shadow-[4px_4px_0_var(--outline-black)]",
                            "hover:translate-y-[-1px] hover:shadow-[6px_6px_0_var(--outline-black)]"
                          )}
                        >
                          {addWalletMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Adding…
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
                </div>
              </Tabs>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/* ---------- Subcomponents ---------- */

function EmptyState({ onPrimary }: { onPrimary: () => void }) {
  return (
    <div className="grid place-items-center rounded-2xl border-3 border-outline bg-white/90 backdrop-blur-sm p-10 text-center shadow-[6px_6px_0_var(--outline-black)]">
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl border-3 border-outline bg-mario-red text-white shadow-[3px_3px_0_var(--outline-black)]">
        <Eye className="h-6 w-6" />
      </div>
      <p className="mb-4 font-mario font-bold text-outline">No wallets tracked yet</p>
      <Button
        onClick={onPrimary}
        size="sm"
        className={cn(
          "gap-2 rounded-xl border-3 border-outline font-mario font-bold",
          "bg-mario-yellow shadow-[3px_3px_0_var(--outline-black)]",
          "hover:translate-y-[-1px] hover:shadow-[4px_4px_0_var(--outline-black)]"
        )}
      >
        <Plus className="h-4 w-4" />
        Track your first wallet
      </Button>
    </div>
  )
}
