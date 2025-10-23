"use client"

import Link from "next/link"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Settings, LogOut, HelpCircle, Zap } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

type ProfileMenuProps = {
  displayName: string
  avatarUrl: string
  xp: number
  onLogout: () => void
  onOpenLevelModal: () => void
  onStartOnboarding: () => void
}

export function ProfileMenu({
  displayName,
  avatarUrl,
  xp,
  onLogout,
  onOpenLevelModal,
  onStartOnboarding
}: ProfileMenuProps) {

  // Level calc - simplified inline
  const level = xp >= 150000 ? 25 : xp >= 100000 ? 20 : xp >= 75000 ? 18 : xp >= 50000 ? 15 : xp >= 25000 ? 12 : xp >= 10000 ? 10 : xp >= 5000 ? 8 : xp >= 2500 ? 6 : xp >= 1000 ? 5 : xp >= 500 ? 3 : xp >= 100 ? 2 : 1

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <motion.button
          whileHover={{ y: -1 }}
          className={cn(
            "h-10 md:h-11 min-w-[200px]",
            "px-3 md:px-3.5 rounded-[12px] md:rounded-[14px]",
            "bg-[var(--star-yellow)]",
            "border-4 border-[var(--outline-black)]",
            "shadow-[4px_4px_0_var(--outline-black)]",
            "flex items-center gap-3 md:gap-4",
            "transition-transform"
          )}
          aria-label="Account menu"
        >
          {/* Red square badge on the left with avatar */}
          <div
            className={cn(
              "grid place-items-center",
              "h-7 w-7 md:h-8 md:w-8",
              "rounded-[10px] md:rounded-[12px]",
              "bg-[var(--mario-red)]",
              "border-4 border-[var(--outline-black)]",
              "overflow-hidden"
            )}
          >
            <Avatar className="h-full w-full rounded-none border-0">
              <AvatarImage src={avatarUrl} alt={displayName} className="rounded-none object-cover" />
              <AvatarFallback className="rounded-none font-bold bg-[var(--mario-red)] text-white text-[11px] md:text-[12px]">
                {displayName?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Name + Level info */}
          <div className="flex flex-col leading-none -space-y-[1px] md:-space-y-[2px]">
            <span className="font-extrabold text-[15px] md:text-[17px] tracking-tight text-[var(--outline-black)] truncate max-w-[140px]">
              {displayName}
            </span>
            <span className="text-[10px] md:text-[11px] font-black uppercase text-foreground/80">
              LVL {level} • {xp.toLocaleString()} XP
            </span>
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

