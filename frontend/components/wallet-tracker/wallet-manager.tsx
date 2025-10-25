"use client"

import { useState, useDeferredValue, useMemo, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
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
  Search,
  Edit2,
  Check,
  XCircle,
  Sparkles
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn, marioStyles } from "@/lib/utils"
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

// Mario-themed wallet icons from public folder
const MARIO_ICONS = [
  { id: 'star', path: '/icons/mario/star.png', name: 'Star' },
  { id: 'mushroom', path: '/icons/mario/mushroom.png', name: 'Mushroom' },
  { id: 'fire', path: '/icons/mario/fire.png', name: 'Fire' },
  { id: 'lightning', path: '/icons/mario/lightning.png', name: 'Lightning' },
  { id: 'trophy', path: '/icons/mario/trophy.png', name: 'Trophy' },
  { id: '1st', path: '/icons/mario/1st.png', name: '1st Place' },
  { id: '2nd', path: '/icons/mario/2nd-place.png', name: '2nd Place' },
  { id: '3rd', path: '/icons/mario/3rd.png', name: '3rd Place' },
  { id: 'coin', path: '/icons/mario/money-bag.png', name: 'Coin' },
  { id: 'controller', path: '/icons/mario/controller.png', name: 'Controller' },
  { id: 'flag', path: '/icons/mario/checkered-flag.png', name: 'Flag' },
  { id: 'eyes', path: '/icons/mario/eyes.png', name: 'Eyes' },
] as const;

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

  const [activeTab, setActiveTab] = useState<"tracked" | "add" | "import">("tracked")

  // Preserve tab state in localStorage
  useEffect(() => {
    const savedTab = localStorage.getItem('wallet-manager-active-tab') as "tracked" | "add" | "import"
    if (savedTab && ['tracked', 'add', 'import'].includes(savedTab)) {
      setActiveTab(savedTab)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('wallet-manager-active-tab', activeTab)
  }, [activeTab])
  const [newWalletAddress, setNewWalletAddress] = useState("")
  const [newWalletLabel, setNewWalletLabel] = useState("")
  const [newWalletIcon, setNewWalletIcon] = useState("")
  const [showNewWalletIconPicker, setShowNewWalletIconPicker] = useState(false)
  const [isAddingWallet, setIsAddingWallet] = useState(false)

  // Validation state
  const [addressValidation, setAddressValidation] = useState<{
    isValid: boolean | null
    message: string
  }>({ isValid: null, message: "" })

  // Address validation
  useEffect(() => {
    if (!newWalletAddress.trim()) {
      setAddressValidation({ isValid: null, message: "" })
      return
    }

    const address = newWalletAddress.trim()
    const isValidLength = address.length >= 32 && address.length <= 44
    const isValidChars = /^[A-Za-z0-9]+$/.test(address)

    if (!isValidLength) {
      setAddressValidation({
        isValid: false,
        message: "Address must be 32-44 characters long"
      })
    } else if (!isValidChars) {
      setAddressValidation({
        isValid: false,
        message: "Address can only contain letters and numbers"
      })
    } else {
      setAddressValidation({
        isValid: true,
        message: "Valid Solana address"
      })
    }
  }, [newWalletAddress])
  const [syncingWallets, setSyncingWallets] = useState<Set<string>>(new Set())
  const [removingWallets, setRemovingWallets] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState("")
  const deferredSearchTerm = useDeferredValue(searchTerm)

  // Edit mode state
  const [editingWallet, setEditingWallet] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState("")
  const [editIcon, setEditIcon] = useState("")
  const [showIconPicker, setShowIconPicker] = useState(false)
  const [updatingWallet, setUpdatingWallet] = useState(false)

  // Bulk import state
  const [bulkWalletText, setBulkWalletText] = useState("")
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState<{
    current: number
    total: number
    currentAddress: string
  } | null>(null)
  const [importResults, setImportResults] = useState<{
    success: number
    failed: number
    skipped: number
    errors: string[]
  } | null>(null)

  // Filter tracked wallets with debounced search
  const filteredWallets = useMemo(() => {
    if (!deferredSearchTerm) return trackedWallets
    const search = deferredSearchTerm.toLowerCase()
    return trackedWallets.filter(wallet =>
      wallet.walletAddress.toLowerCase().includes(search) ||
      wallet.label?.toLowerCase().includes(search)
    )
  }, [trackedWallets, deferredSearchTerm])

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
      const fullLabel = newWalletIcon
        ? `[${newWalletIcon}]${newWalletLabel.trim()}`
        : newWalletLabel.trim()

      const response = await fetch(`${API_URL}/api/wallet-tracker/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          walletAddress: newWalletAddress.trim(),
          label: fullLabel || undefined
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add wallet')
      }

      toast({
        title: "Success",
        description: `Wallet ${fullLabel || newWalletAddress.slice(0, 8)} added to tracking`,
      })

      setNewWalletAddress("")
      setNewWalletLabel("")
      setNewWalletIcon("")
      setShowNewWalletIconPicker(false)
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

  // Start editing wallet
  const handleStartEdit = (wallet: TrackedWallet) => {
    setEditingWallet(wallet.id)
    // Parse icon ID and label from current label (format: "[iconId]label" or just "label")
    const currentLabel = wallet.label || ""
    const iconMatch = currentLabel.match(/^\[([^\]]+)\]/)
    if (iconMatch) {
      setEditIcon(iconMatch[1])
      setEditLabel(currentLabel.slice(iconMatch[0].length).trim())
    } else {
      setEditIcon("")
      setEditLabel(currentLabel)
    }
  }

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingWallet(null)
    setEditLabel("")
    setEditIcon("")
    setShowIconPicker(false)
  }

  // Update wallet label
  const handleUpdateLabel = async (trackingId: string) => {
    setUpdatingWallet(true)
    try {
      const newLabel = editIcon ? `[${editIcon}]${editLabel.trim()}` : editLabel.trim()

      const response = await fetch(`${API_URL}/api/wallet-tracker/${trackingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newLabel })
      })

      if (!response.ok) {
        throw new Error('Failed to update wallet label')
      }

      toast({
        title: "Success",
        description: "Wallet label updated"
      })

      onWalletsUpdated()
      handleCancelEdit()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update wallet label",
        variant: "destructive"
      })
    } finally {
      setUpdatingWallet(false)
    }
  }

  // Bulk import wallets
  const handleBulkImport = async () => {
    if (!user || !bulkWalletText.trim()) {
      toast({
        title: "Error",
        description: "Please enter wallet addresses",
        variant: "destructive"
      })
      return
    }

    setIsImporting(true)
    setImportResults(null)
    setImportProgress(null)

    try {
      // Parse wallet addresses from text (supports newline, comma, space separation)
      const addresses = bulkWalletText
        .split(/[\n,\s]+/)
        .map(addr => addr.trim())
        .filter(addr => addr.length > 0)

      if (addresses.length === 0) {
        throw new Error("No valid wallet addresses found")
      }

      setImportProgress({ current: 0, total: addresses.length, currentAddress: "" })

      let success = 0
      let failed = 0
      let skipped = 0
      const errors: string[] = []

      // Import each wallet
      for (let i = 0; i < addresses.length; i++) {
        const address = addresses[i]
        setImportProgress({
          current: i + 1,
          total: addresses.length,
          currentAddress: address.slice(0, 12) + "..."
        })
        try {
          // Validate Solana address (basic check: 32-44 characters)
          if (address.length < 32 || address.length > 44) {
            errors.push(`Invalid address format: ${address.slice(0, 12)}...`)
            failed++
            continue
          }

          // Check if already tracking
          const existing = trackedWallets.find(w => w.walletAddress === address)
          if (existing) {
            skipped++
            continue
          }

          // Add wallet
          const response = await fetch(`${API_URL}/api/wallet-tracker/track`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
              walletAddress: address
            })
          })

          if (!response.ok) {
            const error = await response.json()
            errors.push(`${address.slice(0, 12)}...: ${error.error || 'Failed'}`)
            failed++
          } else {
            success++
          }
        } catch (error: any) {
          errors.push(`${address.slice(0, 12)}...: ${error.message}`)
          failed++
        }
      }

      setImportResults({ success, failed, skipped, errors })
      setImportProgress(null)

      if (success > 0) {
        toast({
          title: "Import Complete",
          description: `Successfully imported ${success} wallet${success > 1 ? 's' : ''}`
        })
        onWalletsUpdated()
        setBulkWalletText("")
      }

      if (failed > 0 || skipped > 0) {
        toast({
          title: "Import Issues",
          description: `${failed} failed, ${skipped} already tracked`,
          variant: "destructive"
        })
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to import wallets",
        variant: "destructive"
      })
      setImportProgress(null)
    } finally {
      setIsImporting(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied!",
      description: "Address copied to clipboard"
    })
  }

  // Get icon by ID
  const getIconById = (iconId: string) => {
    return MARIO_ICONS.find(icon => icon.id === iconId)
  }

  // Parse wallet label to extract icon and text
  const parseLabel = (label: string) => {
    const iconMatch = label.match(/^\[([^\]]+)\]/)
    if (iconMatch) {
      return {
        iconId: iconMatch[1],
        text: label.slice(iconMatch[0].length).trim()
      }
    }
    return { iconId: null, text: label }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        marioStyles.cardLg(false),
        'w-[95vw] max-w-2xl max-h-[85vh] sm:max-h-[80vh] overflow-hidden flex flex-col bg-white p-4 sm:p-6'
      )}>
        <DialogHeader>
          <DialogTitle className={cn('flex items-center gap-2 text-2xl', marioStyles.heading(2))}>
            <div className={cn(
              marioStyles.iconContainer('sm', '[var(--mario-red)]'),
              'bg-[var(--mario-red)]'
            )}>
              <Eye className="h-4 w-4 text-white" />
            </div>
            Manage Tracked Wallets
          </DialogTitle>
          <DialogDescription className="font-bold text-muted-foreground">
            Add, remove, and manage the wallets you're tracking
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3 bg-white border-3 border-[var(--outline-black)] p-1 gap-1 sm:gap-2 flex-shrink-0 h-auto">
            <TabsTrigger
              value="tracked"
              className="flex items-center justify-center gap-1 font-mario text-[10px] sm:text-[11px] py-1.5 sm:py-2 px-1 sm:px-2 whitespace-nowrap data-[state=active]:bg-[var(--star-yellow)] data-[state=active]:text-[var(--outline-black)] data-[state=active]:border-2 data-[state=active]:border-[var(--outline-black)] data-[state=active]:shadow-[2px_2px_0_var(--outline-black)] rounded-md"
            >
              <Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
              <span className="hidden sm:inline">Tracked ({trackedWallets.length})</span>
              <span className="sm:hidden">{trackedWallets.length}</span>
            </TabsTrigger>
            <TabsTrigger
              value="add"
              className="flex items-center justify-center gap-1 font-mario text-[10px] sm:text-[11px] py-1.5 sm:py-2 px-1 sm:px-2 whitespace-nowrap data-[state=active]:bg-[var(--star-yellow)] data-[state=active]:text-[var(--outline-black)] data-[state=active]:border-2 data-[state=active]:border-[var(--outline-black)] data-[state=active]:shadow-[2px_2px_0_var(--outline-black)] rounded-md"
            >
              <UserPlus className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
              <span className="hidden sm:inline">Add One</span>
              <span className="sm:hidden">+</span>
            </TabsTrigger>
            <TabsTrigger
              value="import"
              className="flex items-center justify-center gap-1 font-mario text-[10px] sm:text-[11px] py-1.5 sm:py-2 px-1 sm:px-2 whitespace-nowrap data-[state=active]:bg-[var(--star-yellow)] data-[state=active]:text-[var(--outline-black)] data-[state=active]:border-2 data-[state=active]:border-[var(--outline-black)] data-[state=active]:shadow-[2px_2px_0_var(--outline-black)] rounded-md"
            >
              <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
              <span className="hidden sm:inline">Import</span>
              <span className="sm:hidden">📥</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tracked" className="mt-4 overflow-y-auto flex-1 min-h-0">
            {/* Search */}
            {trackedWallets.length > 0 && (
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--outline-black)]" />
                <Input
                  placeholder="Search wallets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={cn(
                    marioStyles.input(),
                    'pl-9 bg-white',
                    marioStyles.bodyText('bold')
                  )}
                />
              </div>
            )}

            {/* Wallet List */}
            {filteredWallets.length === 0 ? (
              <div className={cn(
                marioStyles.card(),
                'bg-[var(--sky-blue)]/20 p-8 text-center'
              )}>
                <div className={cn(
                  marioStyles.iconContainer('lg', '[var(--mario-red)]'),
                  'bg-[var(--mario-red)] mx-auto mb-4'
                )}>
                  <Eye className="h-6 w-6 text-white" />
                </div>
                <p className={cn(marioStyles.bodyText('bold'), 'text-sm')}>
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
                {filteredWallets.map((wallet) => {
                  const isEditing = editingWallet === wallet.id

                  return (
                    <div key={wallet.id} className="bg-white rounded-xl border-3 border-[var(--outline-black)] shadow-[3px_3px_0_var(--outline-black)] p-3">
                      {isEditing ? (
                        // Edit Mode
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            {/* Icon Picker Button */}
                            <div className="relative">
                              <button
                                onClick={() => setShowIconPicker(!showIconPicker)}
                                className="h-10 w-10 rounded-lg border-3 border-[var(--outline-black)] bg-[var(--star-yellow)] hover:bg-[var(--star-yellow)]/80 shadow-[2px_2px_0_var(--outline-black)] flex items-center justify-center transition-all p-1.5"
                              >
                                {editIcon && getIconById(editIcon) ? (
                                  <Image
                                    src={getIconById(editIcon)!.path}
                                    alt={getIconById(editIcon)!.name}
                                    width={24}
                                    height={24}
                                    sizes="24px"
                                    className="object-contain"
                                  />
                                ) : (
                                  <Plus className="h-5 w-5" />
                                )}
                              </button>

                              {/* Icon Picker Dropdown */}
                              {showIconPicker && (
                                <div className="absolute top-12 left-0 z-[60] bg-white rounded-lg border-3 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)] p-2 grid grid-cols-4 gap-1.5 min-w-[180px]">
                                  {MARIO_ICONS.map((icon, index) => (
                                    <button
                                      key={icon.id}
                                      tabIndex={0}
                                      onClick={() => {
                                        setEditIcon(icon.id)
                                        setShowIconPicker(false)
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                          e.preventDefault()
                                          setEditIcon(icon.id)
                                          setShowIconPicker(false)
                                        } else if (e.key === 'Escape') {
                                          setShowIconPicker(false)
                                        }
                                      }}
                                      className={cn(
                                        "h-10 w-10 rounded border-2 flex items-center justify-center hover:bg-gray-100 focus:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[var(--mario-red)] transition-colors p-1.5",
                                        editIcon === icon.id ? "border-[var(--mario-red)] bg-[var(--mario-red)]/10" : "border-gray-300"
                                      )}
                                      title={icon.name}
                                      aria-label={`Select ${icon.name} icon`}
                                    >
                                      <Image
                                        src={icon.path}
                                        alt={icon.name}
                                        width={24}
                                        height={24}
                                        sizes="24px"
                                        className="object-contain"
                                      />
                                    </button>
                                  ))}
                                  {editIcon && (
                                    <button
                                      tabIndex={0}
                                      onClick={() => {
                                        setEditIcon("")
                                        setShowIconPicker(false)
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                          e.preventDefault()
                                          setEditIcon("")
                                          setShowIconPicker(false)
                                        } else if (e.key === 'Escape') {
                                          setShowIconPicker(false)
                                        }
                                      }}
                                      className="h-12 rounded-lg border-2 border-[var(--mario-red)] bg-[var(--mario-red)] text-white hover:bg-[var(--mario-red)]/90 focus:bg-[var(--mario-red)]/90 focus:outline-none focus:ring-2 focus:ring-[var(--mario-red)] flex items-center justify-center text-xs font-mario col-span-4 px-2 py-1"
                                      aria-label="Remove selected icon"
                                    >
                                      Remove Icon
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Label Input */}
                            <Input
                              value={editLabel}
                              onChange={(e) => setEditLabel(e.target.value)}
                              placeholder="Enter wallet label..."
                              className="flex-1 bg-white border-3 border-[var(--outline-black)] rounded-lg shadow-[2px_2px_0_var(--outline-black)]"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleUpdateLabel(wallet.id)
                                } else if (e.key === 'Escape') {
                                  handleCancelEdit()
                                }
                              }}
                            />
                          </div>

                          <div className="flex items-center gap-2 justify-end">
                            <button
                              onClick={handleCancelEdit}
                              disabled={updatingWallet}
                              className="h-8 px-3 rounded-lg border-2 border-[var(--outline-black)] bg-white hover:bg-gray-50 shadow-[2px_2px_0_var(--outline-black)] hover:shadow-[3px_3px_0_var(--outline-black)] hover:-translate-y-0.5 transition-all flex items-center gap-1 font-mario text-xs disabled:opacity-50"
                            >
                              <XCircle className="h-3 w-3" />
                              Cancel
                            </button>
                            <button
                              onClick={() => handleUpdateLabel(wallet.id)}
                              disabled={updatingWallet}
                              className="h-8 px-3 rounded-lg border-2 border-[var(--outline-black)] bg-[var(--luigi-green)] text-white hover:bg-[var(--luigi-green)]/90 shadow-[2px_2px_0_var(--outline-black)] hover:shadow-[3px_3px_0_var(--outline-black)] hover:-translate-y-0.5 transition-all flex items-center gap-1 font-mario text-xs disabled:opacity-50"
                            >
                              {updatingWallet ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Check className="h-3 w-3" />
                              )}
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        // View Mode
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              {wallet.label && (() => {
                                const { iconId, text } = parseLabel(wallet.label)
                                const icon = iconId ? getIconById(iconId) : null
                                return (
                                  <Badge variant="secondary" className="flex items-center gap-1.5 text-xs font-mario border-2 border-[var(--outline-black)] bg-[var(--star-yellow)] text-[var(--outline-black)]">
                                    {icon && (
                                      <Image
                                        src={icon.path}
                                        alt={icon.name}
                                        width={14}
                                        height={14}
                                        className="object-contain"
                                      />
                                    )}
                                    <span>{text || wallet.label}</span>
                                  </Badge>
                                )
                              })()}
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
                                className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                              <a
                                href={`https://solscan.io/account/${wallet.walletAddress}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => handleStartEdit(wallet)}
                              className="h-8 w-8 rounded-lg border-2 border-[var(--outline-black)] bg-white hover:bg-gray-50 shadow-[2px_2px_0_var(--outline-black)] hover:shadow-[3px_3px_0_var(--outline-black)] hover:-translate-y-0.5 transition-all flex items-center justify-center"
                              title="Edit label"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleSyncWallet(wallet.walletAddress)}
                              disabled={syncingWallets.has(wallet.walletAddress)}
                              className="h-8 w-8 rounded-lg border-2 border-[var(--outline-black)] bg-white hover:bg-gray-50 shadow-[2px_2px_0_var(--outline-black)] hover:shadow-[3px_3px_0_var(--outline-black)] hover:-translate-y-0.5 transition-all flex items-center justify-center disabled:opacity-50"
                              title="Sync wallet"
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
                              title="Delete wallet"
                            >
                              {removingWallets.has(wallet.id) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
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
                    className={cn(
                      "font-mono bg-white border-3 rounded-lg shadow-[2px_2px_0_var(--outline-black)] focus:shadow-[3px_3px_0_var(--outline-black)]",
                      addressValidation.isValid === true ? "border-[var(--luigi-green)]" :
                      addressValidation.isValid === false ? "border-[var(--mario-red)]" :
                      "border-[var(--outline-black)]"
                    )}
                  />
                  {addressValidation.message && (
                    <p className={cn(
                      "text-xs font-semibold",
                      addressValidation.isValid === true ? "text-[var(--luigi-green)]" :
                      addressValidation.isValid === false ? "text-[var(--mario-red)]" :
                      "text-[var(--pipe-600)]"
                    )}>
                      {addressValidation.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wallet-label" className="font-bold text-[var(--outline-black)]">Label (Optional)</Label>
                  <div className="flex items-center gap-2">
                    {/* Icon Picker Button */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowNewWalletIconPicker(!showNewWalletIconPicker)}
                        className="h-10 w-10 rounded-lg border-3 border-[var(--outline-black)] bg-[var(--star-yellow)] hover:bg-[var(--star-yellow)]/80 shadow-[2px_2px_0_var(--outline-black)] flex items-center justify-center transition-all flex-shrink-0 p-1.5"
                      >
                        {newWalletIcon && getIconById(newWalletIcon) ? (
                          <Image
                            src={getIconById(newWalletIcon)!.path}
                            alt={getIconById(newWalletIcon)!.name}
                            width={24}
                            height={24}
                            className="object-contain"
                          />
                        ) : (
                          <Plus className="h-5 w-5" />
                        )}
                      </button>

                      {/* Icon Picker Dropdown */}
                      {showNewWalletIconPicker && (
                        <div className="absolute top-12 left-0 z-[60] bg-white rounded-lg border-3 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)] p-2 grid grid-cols-4 gap-1.5 min-w-[180px]">
                          {MARIO_ICONS.map((icon) => (
                            <button
                              key={icon.id}
                              type="button"
                              tabIndex={0}
                              onClick={() => {
                                setNewWalletIcon(icon.id)
                                setShowNewWalletIconPicker(false)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  setNewWalletIcon(icon.id)
                                  setShowNewWalletIconPicker(false)
                                } else if (e.key === 'Escape') {
                                  setShowNewWalletIconPicker(false)
                                }
                              }}
                              className={cn(
                                "h-10 w-10 rounded border-2 flex items-center justify-center hover:bg-gray-100 focus:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[var(--mario-red)] transition-colors p-1.5",
                                newWalletIcon === icon.id ? "border-[var(--mario-red)] bg-[var(--mario-red)]/10" : "border-gray-300"
                              )}
                              title={icon.name}
                              aria-label={`Select ${icon.name} icon`}
                            >
                              <Image
                                src={icon.path}
                                alt={icon.name}
                                width={24}
                                height={24}
                                className="object-contain"
                              />
                            </button>
                          ))}
                          {newWalletIcon && (
                            <button
                              type="button"
                              tabIndex={0}
                              onClick={() => {
                                setNewWalletIcon("")
                                setShowNewWalletIconPicker(false)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  setNewWalletIcon("")
                                  setShowNewWalletIconPicker(false)
                                } else if (e.key === 'Escape') {
                                  setShowNewWalletIconPicker(false)
                                }
                              }}
                              className="h-12 rounded-lg border-2 border-[var(--mario-red)] bg-[var(--mario-red)] text-white hover:bg-[var(--mario-red)]/90 focus:bg-[var(--mario-red)]/90 focus:outline-none focus:ring-2 focus:ring-[var(--mario-red)] flex items-center justify-center text-xs font-mario col-span-4 px-2 py-1"
                              aria-label="Remove selected icon"
                            >
                              Remove Icon
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Label Input */}
                    <Input
                      id="wallet-label"
                      placeholder="e.g., 'Ansem', 'Top Trader'..."
                      value={newWalletLabel}
                      onChange={(e) => setNewWalletLabel(e.target.value)}
                      className="flex-1 bg-white border-3 border-[var(--outline-black)] rounded-lg shadow-[2px_2px_0_var(--outline-black)] focus:shadow-[3px_3px_0_var(--outline-black)]"
                    />
                  </div>
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

          <TabsContent value="import" className="mt-4 overflow-y-auto flex-1 min-h-0">
            <div className="bg-white rounded-xl border-4 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)] p-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bulk-wallets" className="font-bold text-[var(--outline-black)]">Wallet Addresses</Label>
                  <textarea
                    id="bulk-wallets"
                    value={bulkWalletText}
                    onChange={(e) => setBulkWalletText(e.target.value)}
                    placeholder="Paste wallet addresses here (one per line, or comma/space separated)&#10;&#10;Example:&#10;GJQzW...abc123&#10;9HzJP...xyz789&#10;ABcdE...efg456"
                    rows={6}
                    className="w-full px-3 py-2 bg-white border-3 border-[var(--outline-black)] rounded-lg shadow-[2px_2px_0_var(--outline-black)] focus:shadow-[3px_3px_0_var(--outline-black)] font-mono text-sm resize-none focus:outline-none focus:ring-0"
                  />
                  <p className="text-xs text-[var(--pipe-600)] font-semibold">
                    Supports newline, comma, or space separated addresses
                  </p>
                </div>

                {/* Progress Indicator */}
                {importProgress && (
                  <div className="bg-[var(--star-yellow)]/20 rounded-lg border-3 border-[var(--outline-black)] p-3 text-center">
                    <div className="text-sm font-mario text-[var(--outline-black)] mb-2">
                      Importing {importProgress.current} of {importProgress.total}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 border-2 border-[var(--outline-black)]">
                      <div
                        className="bg-[var(--luigi-green)] h-full rounded-full transition-all duration-300"
                        style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                      />
                    </div>
                    <div className="text-xs text-[var(--pipe-600)] font-mono mt-1 truncate">
                      {importProgress.currentAddress}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleBulkImport}
                  disabled={isImporting || !bulkWalletText.trim()}
                  className="w-full gap-2 h-10 px-4 rounded-lg border-3 border-[var(--outline-black)] bg-[var(--luigi-green)] text-white hover:bg-[var(--luigi-green)]/90 shadow-[3px_3px_0_var(--outline-black)] hover:shadow-[4px_4px_0_var(--outline-black)] hover:-translate-y-0.5 transition-all flex items-center justify-center font-mario disabled:opacity-50"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Import Wallets
                    </>
                  )}
                </button>

                {/* Import Results */}
                {importResults && (
                  <div className="bg-[var(--sky-blue)]/20 rounded-lg border-3 border-[var(--outline-black)] p-4 text-sm space-y-2">
                    <p className="font-mario text-[var(--outline-black)]">Import Results:</p>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[var(--luigi-green)]">✓ Successfully imported:</span>
                        <span className="font-bold text-[var(--luigi-green)]">{importResults.success}</span>
                      </div>
                      {importResults.skipped > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[var(--star-yellow)]">⚠ Already tracked:</span>
                          <span className="font-bold text-[var(--star-yellow)]">{importResults.skipped}</span>
                        </div>
                      )}
                      {importResults.failed > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[var(--mario-red)]">✗ Failed:</span>
                          <span className="font-bold text-[var(--mario-red)]">{importResults.failed}</span>
                        </div>
                      )}
                    </div>

                    {importResults.errors.length > 0 && (
                      <div className="mt-2 pt-2 border-t-2 border-[var(--outline-black)]/20">
                        <p className="font-mario text-xs text-[var(--outline-black)] mb-1">Errors:</p>
                        <div className="max-h-[100px] overflow-y-auto space-y-1">
                          {importResults.errors.map((error, i) => (
                            <p key={i} className="text-xs text-[var(--mario-red)] font-mono">{error}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}