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
            "h-12 md:h-14 min-w-[240px] md:min-w-[280px]",
            "px-4 md:px-5 rounded-[14px] md:rounded-[16px]",
            "bg-[var(--star-yellow)]",
            "border-4 border-[var(--outline-black)]",
            "shadow-[6px_6px_0_var(--outline-black)]",
            "hover:shadow-[7px_7px_0_var(--outline-black)]",
            "flex items-center justify-between gap-4 md:gap-5",
            "transition-all duration-200"
          )}
          aria-label="Account menu"
        >
          {/* Name + Level info - LEFT SIDE with more space */}
          <div className="flex flex-col items-start justify-center leading-tight space-y-0.5 md:space-y-1 flex-1 min-w-0">
            <span className="font-extrabold text-[16px] md:text-[18px] tracking-tight text-[var(--outline-black)] truncate max-w-full">
              {displayName}
            </span>
            <div className="flex items-center gap-2 md:gap-3">
              <span className="text-[11px] md:text-[12px] font-black uppercase text-foreground/90 whitespace-nowrap">
                LVL {level}
              </span>
              <span className="text-[11px] md:text-[12px] font-black uppercase text-foreground/70 whitespace-nowrap">
                {xp.toLocaleString()} XP
              </span>
            </div>
          </div>

          {/* Larger profile picture on the RIGHT */}
          <div
            className={cn(
              "grid place-items-center flex-shrink-0",
              "h-10 w-10 md:h-12 md:w-12",
              "rounded-[12px] md:rounded-[14px]",
              "bg-[var(--mario-red)]",
              "border-4 border-[var(--outline-black)]",
              "overflow-hidden"
            )}
          >
            <Avatar className="h-full w-full rounded-none border-0">
              <AvatarImage src={avatarUrl} alt={displayName} className="rounded-none object-cover" />
              <AvatarFallback className="rounded-none font-bold bg-[var(--mario-red)] text-white text-[14px] md:text-[16px]">
                {displayName?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
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

