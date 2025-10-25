"use client"

import { useState, useMemo } from 'react';
import Link from "next/link"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Settings, LogOut, HelpCircle, Zap, Bell, CheckCheck, Trash2, Wallet, Sparkles, ArrowDownToLine, ArrowUpFromLine, ExternalLink, KeyRound, Power } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import type { Notification } from "@/hooks/use-notifications"
import { calculateLevel } from "@/lib/utils/levelSystem"
import { useTradingMode } from '@/lib/trading-mode-context';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { DepositModal } from '@/components/modals/deposit-modal';
import { WithdrawModal } from '@/components/modals/withdraw-modal';
import { ExportPrivateKeyModal } from '@/components/modals/export-private-key-modal';
import { formatNumber } from '@/lib/utils';

type CombinedProfileBalanceProps = {
  displayName: string
  avatarUrl: string
  xp: number
  userId?: string
  onLogout: () => void
  onOpenLevelModal: () => void
  onStartOnboarding: () => void
  unreadNotificationCount?: number
  notifications?: Notification[]
  onMarkAsRead?: (id: string) => void
  onMarkAllAsRead?: () => void
  onRemoveNotification?: (id: string) => void
}

export function CombinedProfileBalance({
  displayName,
  avatarUrl,
  xp,
  userId,
  onLogout,
  onOpenLevelModal,
  onStartOnboarding,
  unreadNotificationCount = 0,
  notifications = [],
  onMarkAsRead,
  onMarkAllAsRead,
  onRemoveNotification
}: CombinedProfileBalanceProps) {

  const {
    tradeMode,
    fundingSource,
    virtualSolBalance,
    realSolBalance,
    walletSolBalance,
    activeBalance,
  } = useTradingMode();

  const { publicKey, disconnect } = useWallet();
  const router = useRouter();
  const [activeModal, setActiveModal] = useState<'deposit' | 'withdraw' | 'export' | null>(null);

  // Calculate level using centralized utility
  const levelInfo = calculateLevel(xp)
  const level = levelInfo.level

  const isPaperMode = tradeMode === 'PAPER';
  const isDepositedFunding = fundingSource === 'DEPOSITED';
  const isWalletConnected = !!publicKey;
  
  // Format wallet address
  const walletAddress = useMemo(() => publicKey
    ? `${publicKey.toBase58().slice(0, 6)}...${publicKey.toBase58().slice(-4)}`
    : null, [publicKey]);
  
  // Determine balance badge
  const balanceBadge = useMemo(() => {
    if (isPaperMode) return 'P';
    if (isDepositedFunding) return 'L';
    return 'W';
  }, [isPaperMode, isDepositedFunding]);

  const balanceLabel = useMemo(() => {
    if (isPaperMode) return 'Virtual';
    if (isDepositedFunding) return 'Deposited';
    return 'Wallet';
  }, [isPaperMode, isDepositedFunding]);

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <motion.button
            whileHover={{ y: -1 }}
            className={cn(
              "h-9 md:h-10 min-w-[200px] md:min-w-[240px]",
              "px-2.5 md:px-3 rounded-[10px] md:rounded-[12px]",
              "bg-[var(--star-yellow)]",
              "border-3 border-[var(--outline-black)]",
              "shadow-[3px_3px_0_var(--outline-black)] md:shadow-[4px_4px_0_var(--outline-black)]",
              "hover:shadow-[4px_4px_0_var(--outline-black)] md:hover:shadow-[5px_5px_0_var(--outline-black)]",
              "flex items-center justify-between gap-2",
              "transition-all duration-200",
              "relative"
            )}
            aria-label="Account and balance menu"
          >
            {/* LEFT: Profile info */}
            <div className="flex items-center gap-2">
              {/* Avatar */}
              <div
                className={cn(
                  "grid place-items-center flex-shrink-0",
                  "h-7 w-7 md:h-8 md:w-8",
                  "rounded-[8px] md:rounded-[10px]",
                  "bg-[var(--mario-red)]",
                  "border-3 border-[var(--outline-black)]",
                  "overflow-hidden"
                )}
              >
                <Avatar className="h-full w-full rounded-none border-0">
                  <AvatarImage src={avatarUrl} alt={displayName} className="rounded-none object-cover" />
                  <AvatarFallback className="rounded-none font-bold bg-[var(--mario-red)] text-white text-[10px] md:text-[12px]">
                    {displayName?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Name + Level */}
              <div className="flex flex-col items-start justify-center leading-tight space-y-0 min-w-0">
                <span className="font-extrabold text-[11px] md:text-[12px] tracking-tight text-[var(--outline-black)] truncate max-w-[80px] md:max-w-[100px]">
                  {displayName}
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-[8px] md:text-[9px] font-black uppercase text-foreground/90 whitespace-nowrap">
                    LVL {level}
                  </span>
                </div>
              </div>
            </div>

            {/* CENTER: Balance */}
            <div className="flex flex-col items-end leading-none space-y-0">
              <span className="tabular-nums font-extrabold text-[12px] md:text-[14px] tracking-tight text-[var(--outline-black)]">
                {Number(activeBalance ?? 0).toFixed(2)}
              </span>
              <span className="text-[8px] md:text-[9px] font-black uppercase text-foreground/70 whitespace-nowrap">
                {balanceLabel} SOL
              </span>
            </div>

            {/* RIGHT: Badge indicator */}
            <div
              className={cn(
                "grid place-items-center flex-shrink-0",
                "h-6 w-6 md:h-7 md:w-7",
                "rounded-[6px] md:rounded-[8px]",
                "bg-[var(--mario-red)] text-white",
                "border-3 border-[var(--outline-black)]"
              )}
            >
              <span className="font-extrabold text-[9px] md:text-[10px] leading-none">
                {balanceBadge}
              </span>
            </div>

            {/* Notification badge */}
            {unreadNotificationCount > 0 && (
              <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-[var(--mario-red)] border-2 border-[var(--outline-black)] flex items-center justify-center">
                <span className="text-[9px] font-black text-white">
                  {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                </span>
              </div>
            )}
          </motion.button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-80 max-h-[60vh] overflow-y-auto bg-[var(--card)] border border-[var(--color-border)] shadow-[var(--shadow-dropdown)]">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>

          {/* Account Balance Overview */}
          <div className="px-2 py-2 space-y-2">
            <div className="text-xs font-semibold text-muted-foreground mb-2">Account Balance</div>
            
            {/* Virtual balance */}
            <div className={cn(
              "flex items-center justify-between p-2 rounded border",
              virtualSolBalance > 0 ? "bg-luigi-green-50 border-luigi-green-200" : "bg-pipe-50 border-pipe-200"
            )}>
              <div className="flex items-center gap-2">
                <Sparkles className={cn("w-4 h-4", virtualSolBalance > 0 ? "text-luigi-green-600" : "text-pipe-500")} />
                <span className="text-pipe-700 text-sm">Virtual (Paper)</span>
              </div>
              <span className="font-mono font-semibold text-sm text-luigi-green-700">
                {formatNumber(virtualSolBalance, 2)} SOL
              </span>
            </div>

            {/* Deposited balance */}
            <div className={cn(
              "flex items-center justify-between p-2 rounded border",
              realSolBalance > 0 ? "bg-star-yellow-50 border-star-yellow-200" : "bg-pipe-50 border-pipe-200"
            )}>
              <div className="flex items-center gap-2">
                <Wallet className={cn("w-4 h-4", realSolBalance > 0 ? "text-star-yellow-700" : "text-pipe-500")} />
                <span className="text-pipe-700 text-sm">Deposited (Live)</span>
              </div>
              <span className={cn(
                "font-mono font-semibold text-sm",
                realSolBalance > 0 ? "text-star-yellow-800" : "text-pipe-600"
              )}>
                {formatNumber(realSolBalance, 2)} SOL
              </span>
            </div>

            {/* Wallet balance (if connected) */}
            {isWalletConnected && (
              <div className="flex items-center justify-between p-2 bg-coin-yellow-50 rounded border border-coin-yellow-200">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-coin-yellow-700" />
                  <span className="text-pipe-700 text-[10px]">
                    {walletAddress}
                  </span>
                </div>
                <span className="font-mono font-semibold text-sm text-coin-yellow-800">
                  {formatNumber(walletSolBalance || 0, 2)} SOL
                </span>
              </div>
            )}
          </div>

          <DropdownMenuSeparator />

          {/* Wallet Management Section */}
          <div className="px-2 py-2">
            <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-2">
              <Settings className="h-3 w-3" />
              Wallet Management
            </div>
            
            {/* Quick actions */}
            {!isPaperMode && (
              <div className="space-y-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveModal('deposit');
                  }}
                  className="w-full justify-start h-8 text-xs"
                >
                  <ArrowDownToLine className="mr-2 h-3 w-3 text-luigi-green-600" />
                  Deposit SOL
                </Button>

                {realSolBalance > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setActiveModal('withdraw');
                    }}
                    className="w-full justify-start h-8 text-xs"
                  >
                    <ArrowUpFromLine className="mr-2 h-3 w-3 text-mario-red-600" />
                    Withdraw SOL
                  </Button>
                )}

                {realSolBalance > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setActiveModal('export');
                    }}
                    className="w-full justify-start h-8 text-xs"
                  >
                    <KeyRound className="mr-2 h-3 w-3 text-pipe-600" />
                    Export Private Key
                  </Button>
                )}
              </div>
            )}

            {/* Wallet connection actions */}
            <div className="mt-2 space-y-1">
              {isWalletConnected ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const address = publicKey?.toBase58();
                      if (address) {
                        window.open(`https://solscan.io/account/${address}`, '_blank');
                      }
                    }}
                    className="w-full justify-start h-8 text-xs"
                  >
                    <ExternalLink className="mr-2 h-3 w-3" />
                    View on Solscan
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      disconnect();
                    }}
                    className="w-full justify-start h-8 text-xs text-mario-red-600"
                  >
                    <Power className="mr-2 h-3 w-3" />
                    Disconnect Wallet
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    router.push('/wallet-management');
                  }}
                  className="w-full justify-start h-8 text-xs"
                >
                  <Wallet className="mr-2 h-3 w-3 text-luigi-green-600" />
                  Connect Wallet
                </Button>
              )}
            </div>

            {/* Current mode indicator */}
            <div className="mt-3 px-2 py-1.5 bg-muted rounded text-[10px] text-pipe-500">
              <div className="flex items-center justify-between">
                <span>Active Mode:</span>
                <span className={cn(
                  "font-bold",
                  isPaperMode ? "text-luigi-green-600" : "text-mario-red-600"
                )}>
                  {isPaperMode ? 'PAPER' : 'LIVE'} • {formatNumber(activeBalance ?? 0, 2)} SOL
                </span>
              </div>
            </div>
          </div>

          {/* Notifications Section */}
          {notifications.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <div className="px-2 py-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    <span className="text-sm font-semibold">Notifications</span>
                    {unreadNotificationCount > 0 && (
                      <Badge className="h-5 px-1.5 text-xs bg-mario-red-500">
                        {unreadNotificationCount}
                      </Badge>
                    )}
                  </div>
                  {unreadNotificationCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        onMarkAllAsRead?.()
                      }}
                      className="h-6 text-xs px-2"
                    >
                      <CheckCheck className="h-3 w-3 mr-1" />
                      Mark all read
                    </Button>
                  )}
                </div>

                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {notifications.slice(0, 5).map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "flex items-start gap-2 p-2 rounded-lg cursor-pointer hover:bg-muted",
                        !notification.read && "bg-primary/5"
                      )}
                      onClick={() => {
                        if (!notification.read) {
                          onMarkAsRead?.(notification.id)
                        }
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-xs font-medium truncate",
                          !notification.read && "font-semibold"
                        )}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {notification.message}
                        </p>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                        </span>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          onRemoveNotification?.(notification.id)
                        }}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        title="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {notifications.length > 5 && (
                  <div className="pt-2 border-t border-border">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs text-muted-foreground hover:text-foreground h-7"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        console.log('View all notifications clicked')
                      }}
                    >
                      View all {notifications.length} notifications
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={onOpenLevelModal} className="font-semibold cursor-pointer">
            <Zap className="h-4 w-4 mr-2" />
            View Level Progress
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem asChild>
            <Link href="/profile/settings" className="font-semibold">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={onStartOnboarding} className="font-semibold">
            <HelpCircle className="h-4 w-4 mr-2" />
            Take Tour
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={onLogout} className="text-mario-red-600 font-semibold">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modals */}
      <DepositModal
        open={activeModal === 'deposit'}
        onOpenChange={(open) => setActiveModal(open ? 'deposit' : null)}
      />
      <WithdrawModal
        open={activeModal === 'withdraw'}
        onOpenChange={(open) => setActiveModal(open ? 'withdraw' : null)}
      />
      {userId && (
        <ExportPrivateKeyModal
          open={activeModal === 'export'}
          onOpenChange={(open) => setActiveModal(open ? 'export' : null)}
          userId={userId}
        />
      )}
    </>
  )
}
