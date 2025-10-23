"use client"

import Link from "next/link"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Settings, LogOut, HelpCircle, Zap } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { XPBadge } from "@/components/level/xp-progress-bar"

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

  // Level calc mirrors your current logic, just tucked away
  const level = (() => {
    if (xp >= 150000) return 25
    if (xp >= 100000) return 20
    if (xp >= 75000)  return 18
    if (xp >= 50000)  return 15
    if (xp >= 25000)  return 12
    if (xp >= 10000)  return 10
    if (xp >= 5000)   return 8
    if (xp >= 2500)   return 6
    if (xp >= 1000)   return 5
    if (xp >= 500)    return 3
    if (xp >= 100)    return 2
    return 1
  })()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <motion.button
          whileHover={{ y: -1 }}
          className={cn(
            "h-10 px-2 pr-3 rounded-lg border-3 border-[var(--outline-black)]",
            "bg-white shadow-[3px_3px_0_var(--outline-black)] hover:shadow-[4px_4px_0_var(--outline-black)]",
            "flex items-center gap-2 cursor-pointer transition-all"
          )}
          aria-label="Account menu"
        >
          <Avatar className="h-8 w-8 rounded-lg border-2 border-[var(--outline-black)]">
            <AvatarImage src={avatarUrl} alt={displayName} className="rounded-lg object-cover" />
            <AvatarFallback className="rounded-lg font-bold bg-[var(--mario-red)] text-white">
              {displayName?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 leading-tight">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold truncate max-w-[140px]">{displayName}</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md border-2 border-[var(--outline-black)] bg-[var(--star-yellow)] text-[var(--mario-red)]">
                LVL {level}
              </span>
            </div>
            <span className="text-[10px] font-semibold text-foreground/60">{xp.toLocaleString()} XP</span>
          </div>
        </motion.button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60 bg-white border-3 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)]">
        <DropdownMenuLabel className="font-mario">My Account</DropdownMenuLabel>

        {/* Visual XP strip – compact and on brand */}
        <div className="px-2 py-2">
          <XPBadge currentXP={xp} />
        </div>

        <DropdownMenuItem onClick={onOpenLevelModal} className="flex items-center gap-2 font-bold cursor-pointer">
          <Zap className="h-4 w-4 text-[var(--star-yellow)]" />
          View Level Progress
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-[var(--outline-black)]" />

        <DropdownMenuItem asChild>
          <Link href="/profile/settings" className="flex items-center gap-2 font-bold">
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={onStartOnboarding} className="flex items-center gap-2 font-bold text-[var(--luigi-green)]">
          <HelpCircle className="h-4 w-4" />
          Take Tour
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-[var(--outline-black)]" />

        <DropdownMenuItem onClick={onLogout} className="text-[var(--mario-red)] font-bold">
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

