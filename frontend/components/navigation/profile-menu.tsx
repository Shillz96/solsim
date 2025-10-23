"use client"

import Link from "next/link"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Settings, LogOut, HelpCircle, Zap, Bell } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

type ProfileMenuProps = {
  displayName: string
  avatarUrl: string
  xp: number
  onLogout: () => void
  onOpenLevelModal: () => void
  onStartOnboarding: () => void
  unreadNotificationCount?: number
}

export function ProfileMenu({
  displayName,
  avatarUrl,
  xp,
  onLogout,
  onOpenLevelModal,
  onStartOnboarding,
  unreadNotificationCount = 0
}: ProfileMenuProps) {

  // Level calc - simplified inline
  const level = xp >= 150000 ? 25 : xp >= 100000 ? 20 : xp >= 75000 ? 18 : xp >= 50000 ? 15 : xp >= 25000 ? 12 : xp >= 10000 ? 10 : xp >= 5000 ? 8 : xp >= 2500 ? 6 : xp >= 1000 ? 5 : xp >= 500 ? 3 : xp >= 100 ? 2 : 1

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <motion.button
          whileHover={{ y: -1 }}
          className={cn(
            "h-10 min-w-[160px]",
            "px-3 rounded-[12px]",
            "bg-[var(--star-yellow)]",
            "border-3 border-[var(--outline-black)]",
            "shadow-[4px_4px_0_var(--outline-black)]",
            "hover:shadow-[5px_5px_0_var(--outline-black)]",
            "flex items-center justify-between gap-2.5",
            "transition-all duration-200",
            "relative"
          )}
          aria-label="Account menu"
        >
          {/* Name + Level info - LEFT SIDE compact */}
          <div className="flex flex-col items-start justify-center leading-tight space-y-0 flex-1 min-w-0">
            <span className="font-extrabold text-[13px] tracking-tight text-[var(--outline-black)] truncate max-w-full">
              {displayName}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-black uppercase text-foreground/90 whitespace-nowrap">
                LVL {level}
              </span>
              <span className="text-[9px] font-black uppercase text-foreground/70 whitespace-nowrap">
                {xp.toLocaleString()} XP
              </span>
            </div>
          </div>

          {/* Profile picture + notification bell */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Notification bell with badge */}
            <div className="relative">
              <img src="/icons/mario/bell.png" alt="Notifications" className="h-4 w-4" />
              {unreadNotificationCount > 0 && (
                <Badge className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 flex items-center justify-center p-0 text-[8px] bg-mario-red-500 border border-white font-bold rounded-full">
                  {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                </Badge>
              )}
            </div>

            {/* Compact profile picture */}
            <div
              className={cn(
                "grid place-items-center flex-shrink-0",
                "h-8 w-8",
                "rounded-[10px]",
                "bg-[var(--mario-red)]",
                "border-3 border-[var(--outline-black)]",
                "overflow-hidden"
              )}
            >
              <Avatar className="h-full w-full rounded-none border-0">
                <AvatarImage src={avatarUrl} alt={displayName} className="rounded-none object-cover" />
                <AvatarFallback className="rounded-none font-bold bg-[var(--mario-red)] text-white text-[12px]">
                  {displayName?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </motion.button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60 bg-white border border-[var(--color-border)] shadow-[var(--shadow-dropdown)]">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>

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

