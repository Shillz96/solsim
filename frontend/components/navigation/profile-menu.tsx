"use client"

import Link from "next/link"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Settings, LogOut, HelpCircle, Zap, Bell, CheckCheck, Trash2 } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import type { Notification } from "@/hooks/use-notifications"
import { calculateLevel } from "@/lib/utils/levelSystem"

type ProfileMenuProps = {
  displayName: string
  avatarUrl: string
  xp: number
  onLogout: () => void
  onOpenLevelModal: () => void
  onStartOnboarding: () => void
  unreadNotificationCount?: number
  notifications?: Notification[]
  onMarkAsRead?: (id: string) => void
  onMarkAllAsRead?: () => void
  onRemoveNotification?: (id: string) => void
}

export function ProfileMenu({
  displayName,
  avatarUrl,
  xp,
  onLogout,
  onOpenLevelModal,
  onStartOnboarding,
  unreadNotificationCount = 0,
  notifications = [],
  onMarkAsRead,
  onMarkAllAsRead,
  onRemoveNotification
}: ProfileMenuProps) {

  // Calculate level using centralized utility
  const levelInfo = calculateLevel(xp)
  const level = levelInfo.level

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <motion.button
          whileHover={{ y: -1 }}
          className={cn(
            "h-9 md:h-10 min-w-[140px] md:min-w-[160px]",
            "px-2.5 md:px-3 rounded-[10px] md:rounded-[12px]",
            "bg-[var(--star-yellow)]",
            "border-3 border-[var(--outline-black)]",
            "shadow-[3px_3px_0_var(--outline-black)] md:shadow-[4px_4px_0_var(--outline-black)]",
            "hover:shadow-[4px_4px_0_var(--outline-black)] md:hover:shadow-[5px_5px_0_var(--outline-black)]",
            "flex items-center justify-between gap-2 md:gap-2.5",
            "transition-all duration-200",
            "relative"
          )}
          aria-label="Account menu"
        >
          {/* Name + Level info - LEFT SIDE compact */}
          <div className="flex flex-col items-start justify-center leading-tight space-y-0 flex-1 min-w-0">
            <span className="font-extrabold text-[11px] md:text-[13px] tracking-tight text-[var(--outline-black)] truncate max-w-full">
              {displayName}
            </span>
            <div className="flex items-center gap-1 md:gap-1.5">
              <span className="text-[8px] md:text-[9px] font-black uppercase text-foreground/90 whitespace-nowrap">
                LVL {level}
              </span>
              <span className="text-[8px] md:text-[9px] font-black uppercase text-foreground/70 whitespace-nowrap hidden sm:inline">
                {xp.toLocaleString()} XP
              </span>
            </div>
          </div>

          {/* Compact profile picture */}
          <div className="relative flex-shrink-0">
            <div
              className={cn(
                "grid place-items-center flex-shrink-0",
                "h-7 w-7 md:h-8 md:w-8",
                "rounded-[8px] md:rounded-[10px]",
                "bg-[var(--mario-red)]",
                "border-4 border-[var(--outline-black)]",
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
          </div>
        </motion.button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 max-h-[60vh] overflow-y-auto bg-white border border-[var(--color-border)] shadow-[var(--shadow-dropdown)]">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>

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
                      // TODO: Navigate to notifications page or open modal
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
  )
}

