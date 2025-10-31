"use client"

import Link from "next/link"
import Image from "next/image"
import { useState } from "react"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  Menu, Settings, LogOut, Bell, Gift, BookOpen, Map
} from "lucide-react"
import { cn, marioStyles } from "@/lib/utils"
import { XPBadge } from "@/components/level/xp-progress-bar"

// Navigation items configuration
const navigationItems = [
  {
    name: "Trade",
    href: "/warp-pipes",
    iconSrc: "/Trade-10-24-2025.png",
    description: "Buy and sell tokens"
  },
  {
    name: "Pipe Network",
    href: "/pipe-network",
    iconSrc: "/Pipe-Network-10-24-2025.png",
    description: "Community hub and learning center"
  },
  {
    name: "Portfolio",
    href: "/portfolio",
    iconSrc: "/Portfolio-10-24-2025.png",
    description: "Track your positions and P&L"
  },
  {
    name: "Trending",
    href: "/trending",
    iconSrc: "/Trending-10-24-2025.png",
    description: "Discover popular tokens"
  }
]

// Info dropdown items
const infoItems = [
  { href: "/rewards", icon: Gift, label: "Rewards", iconSrc: "/icons/mario/star.png" },
  { href: "/docs", icon: BookOpen, label: "Docs", iconSrc: "/icons/mario/game.png" },
  { href: "/roadmap", icon: Map, label: "Roadmap", iconSrc: "/icons/mario/checkered-flag.png" },
]

// Icon mapping utility
const getIconSrc = (itemName: string, iconSrc: string) => {
  const iconMap: Record<string, string> = {
    'Trade': '/icons/mario/trade.png',
    'Portfolio': '/icons/mario/wallet.png',
    'Trending': '/icons/mario/trending.png',
    'Dashboard': '/icons/mario/home.png',
    'Pipe Network': '/icons/mario/chat.png',
  }
  return iconMap[itemName] || iconSrc
}

const getTextImageSrc = (itemName: string, iconSrc: string) => {
  const textMap: Record<string, string> = {
    'Trade': '/Trade-10-24-2025.png',
    'Portfolio': '/Portfolio-10-24-2025.png',
    'Trending': '/Trending-10-24-2025.png',
    'Dashboard': '/Home-10-24-2025.png',
    'Pipe Network': '/Pipe-Network-10-24-2025.png',
  }
  return textMap[itemName] || iconSrc
}

interface MobileMenuProps {
  isAuthenticated: boolean
  user: any
  displayName: string
  avatarUrl: string
  unreadCount: number
  notifications: any[]
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  onLogout: () => void
  onStartOnboarding: () => void
}

export function MobileMenu({ 
  isAuthenticated, 
  user, 
  displayName, 
  avatarUrl, 
  unreadCount, 
  notifications, 
  markAsRead, 
  markAllAsRead, 
  onLogout, 
  onStartOnboarding 
}: MobileMenuProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  return (
    <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            marioStyles.card(true),
            'lg:hidden bg-card hover:bg-star/20 h-9 w-9 p-0'
          )}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80 overflow-y-auto">
        <div className="flex flex-col space-y-4 mt-4">
          {/* XP Display - Mobile */}
          {isAuthenticated && user && (
            <div className="px-3 py-2 bg-gradient-to-r from-[var(--star-yellow)]/20 to-[var(--coin-yellow)]/20 border-3 border-star shadow-[3px_3px_0_var(--outline-black)] rounded-lg">
              <XPBadge currentXP={parseFloat(user.rewardPoints?.toString() || '0')} />
            </div>
          )}

          {/* Notifications Section */}
          {isAuthenticated && (
            <div className="space-y-2 pb-4 border-b">
              <div className="flex items-center justify-between px-3">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  <span className="font-semibold text-sm">Notifications</span>
                  {unreadCount > 0 && (
                    <Badge className="h-5 px-1.5 text-xs">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Badge>
                  )}
                </div>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="h-7 text-xs px-2"
                  >
                    Mark all read
                  </Button>
                )}
              </div>

              {notifications.length === 0 ? (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  <Bell className="h-6 w-6 mx-auto mb-2 opacity-50" />
                  <p>No notifications</p>
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {notifications.slice(0, 3).map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => {
                        if (!notification.read) {
                          markAsRead(notification.id)
                        }
                      }}
                      className={cn(
                        "flex items-start gap-2 p-2 rounded-lg cursor-pointer hover:bg-muted",
                        !notification.read && "bg-primary/5"
                      )}
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
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Navigation Items */}
          <div className="space-y-2">
            {navigationItems
              .filter(item => item.href !== '/monitoring')
              .map((item) => {
                const isActive = pathname === item.href
                const iconSrc = getIconSrc(item.name, item.iconSrc)
                const textImageSrc = getTextImageSrc(item.name, item.iconSrc)

                return (
                  <Link 
                    key={item.href} 
                    href={item.href} 
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-lg transition-colors touch-target min-h-[44px]",
                      isActive ? "bg-primary/10 text-primary" : "hover:bg-muted"
                    )}
                  >
                    <Image 
                      src={iconSrc}
                      alt={item.name} 
                      width={20} 
                      height={20} 
                      className="object-contain" 
                    />
                    <Image 
                      src={textImageSrc}
                      alt={item.name} 
                      width={80} 
                      height={20} 
                      className="h-[20px] w-auto object-contain" 
                    />
                    <div>
                      <div className="text-xs text-muted-foreground">{item.description}</div>
                    </div>
                  </Link>
                )
              })}
            
            {/* Info Items Section */}
            <div className="pt-2 border-t">
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground">
                MORE INFO
              </div>
              {infoItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                    <div className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-lg transition-colors",
                      isActive ? "bg-primary/10 text-primary" : "hover:bg-muted"
                    )}>
                      <item.icon className="h-5 w-5" />
                      <div>
                        <div className="font-medium">{item.label}</div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Profile Section */}
          {isAuthenticated && (
            <div className="space-y-2 pt-4 border-t">
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground">
                ACCOUNT
              </div>
              <Link href="/profile/settings" onClick={() => setMobileMenuOpen(false)}>
                <div className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted transition-colors">
                  <Settings className="h-5 w-5" />
                  <div>
                    <div className="font-medium">Settings</div>
                    <div className="text-xs text-muted-foreground">Manage your account</div>
                  </div>
                </div>
              </Link>
              <button
                onClick={() => {
                  onLogout()
                  setMobileMenuOpen(false)
                }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted transition-colors text-mario"
              >
                <LogOut className="h-5 w-5" />
                <div>
                  <div className="font-medium">Logout</div>
                  <div className="text-xs text-muted-foreground">Sign out of your account</div>
                </div>
              </button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

