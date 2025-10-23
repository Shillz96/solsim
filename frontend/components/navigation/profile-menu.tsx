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
            "h-9 px-2.5 rounded-md border border-[var(--color-border)] bg-white",
            "flex items-center gap-2 shadow-none transition-colors",
            "hover:bg-[color-mix(in_oklab,white,black_3%)]"
          )}
          aria-label="Account menu"
        >
          <Avatar className="h-7 w-7 rounded-md border border-[var(--color-border)]">
            <AvatarImage src={avatarUrl} alt={displayName} className="rounded-md object-cover" />
            <AvatarFallback className="rounded-md font-bold bg-[var(--mario-red)] text-white">
              {displayName?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>

          <div className="leading-tight min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm font-semibold truncate max-w-[140px]">{displayName}</span>
              <span className="text-[10px] px-1 py-[2px] rounded border bg-[color-mix(in_oklab,white,var(--color-star)_12%)] uppercase tracking-wide">
                LVL {level}
              </span>
            </div>
            <span className="text-[11px] font-medium text-foreground/70 tabular-nums">{xp.toLocaleString()} XP</span>
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

