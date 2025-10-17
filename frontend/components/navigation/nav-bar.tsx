"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import {
  Menu, User, Settings, LogOut, Bell, Search, Loader2,
  TrendingUp, Wallet, Target, BarChart3, Home, Zap,
  ChevronDown, Command, Gift, Building2
} from "lucide-react"
import { useState, useCallback, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { AuthModal } from "@/components/modals/auth-modal"
import { PurchaseModal } from "@/components/modals/purchase-modal"
import { NotificationDropdown } from "@/components/notifications/notification-dropdown"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { useDebounce } from "@/hooks/use-debounce"
import { useAuth } from "@/hooks/use-auth"
import { useQuery } from "@tanstack/react-query"
import * as api from "@/lib/api"
import type { TokenSearchResult } from "@/lib/types/backend"
import { formatUSD } from "@/lib/format"
import { usePriceStreamContext } from "@/lib/price-stream-provider"
import { formatSolEquivalent } from "@/lib/sol-equivalent-utils"
import { useNotifications } from "@/hooks/use-notifications"
import { formatDistanceToNow } from "date-fns"

// Enhanced navigation items with better organization
const navigationItems = [
  {
    name: "Dashboard",
    href: "/",
    icon: Home,
    description: "Overview of your trading activity"
  },
  {
    name: "Trade",
    href: "/trade",
    icon: TrendingUp,
    description: "Buy and sell tokens"
  },
  // {
  //   name: "Stocks",
  //   href: "/stocks",
  //   icon: Building2,
  //   description: "Trade tokenized stocks"
  // },
  {
    name: "Portfolio",
    href: "/portfolio",
    icon: Wallet,
    description: "Track your positions and P&L"
  },
  {
    name: "Perps",
    href: "/perps",
    icon: Zap,
    description: "Leverage trading with perpetual futures"
  },
  {
    name: "Trending",
    href: "/trending",
    icon: TrendingUp,
    description: "Discover popular tokens"
  },
  {
    name: "Rewards",
    href: "/rewards",
    icon: Gift,
    description: "Earn points and claim rewards"
  },
  {
    name: "Monitoring",
    href: "/monitoring",
    icon: BarChart3,
    description: "System status and metrics"
  }
]

export function NavBar() {
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  
  // Search functionality state
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<TokenSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const debouncedQuery = useDebounce(searchQuery, 300)
  const [mounted, setMounted] = useState(false)
  
  // Auth and balance data
  const { user, isAuthenticated, logout } = useAuth()
  const { prices: livePrices } = usePriceStreamContext()
  const solPrice = livePrices.get('So11111111111111111111111111111111111111112')?.price || 0

  // Notifications data
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
  } = useNotifications()

  const { data: balanceData } = useQuery({
    queryKey: ['user-balance', user?.id],
    queryFn: () => api.getWalletBalance(user!.id),
    enabled: !!user,
    staleTime: 30000,
  })

  // Fetch user profile for avatar and username
  const { data: userProfile } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: () => user?.id ? api.getUserProfile(user.id) : null,
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000
  })

  const balanceNumber = balanceData ? parseFloat(balanceData.balance) : 0
  const profile = userProfile as any
  const displayName = profile?.displayName || profile?.username || user?.email?.split('@')[0] || 'User'
  const avatarUrl = profile?.avatarUrl || profile?.profileImage || profile?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}&backgroundColor=4f46e5`

  // Enhanced search functionality
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()
    setIsSearching(true)
    
    try {
      const results = await api.searchTokens(query.trim(), 8)
      
      if (!abortControllerRef.current.signal.aborted) {
        setSearchResults(results)
        setShowResults(true)
      }
    } catch (error) {
      if (!abortControllerRef.current.signal.aborted) {
        console.error('Search failed:', error)
        setSearchResults([])
        setShowResults(false)
      }
    } finally {
      if (!abortControllerRef.current.signal.aborted) {
        setIsSearching(false)
      }
    }
  }, [])

  useEffect(() => {
    performSearch(debouncedQuery)
  }, [debouncedQuery, performSearch])

  useEffect(() => {
    setMounted(true)
  }, [])

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }

    if (showResults) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showResults])

  const handleTokenSelect = useCallback((token: TokenSearchResult) => {
    router.push(`/trade?token=${token.mint}&symbol=${token.symbol}&name=${encodeURIComponent(token.name)}`)
    setSearchQuery('')
    setShowResults(false)
    setMobileMenuOpen(false)
  }, [router])

  const handleLogout = useCallback(() => {
    logout()
    setMobileMenuOpen(false)
  }, [logout])

  return (
    <motion.header 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80"
    >
      <div className="w-full px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and Brand */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center">
              <span className="font-bold text-xl">
                <span className="hidden sm:inline">Virtual<span className="text-primary">Sol</span></span>
                <span className="sm:hidden text-primary">vSOL</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {navigationItems.slice(0, 6).map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      size="sm"
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 transition-all duration-200",
                        isActive && "bg-primary/10 text-primary font-semibold"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="hidden lg:inline">{item.name}</span>
                    </Button>
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Enhanced Search Bar - Hidden on mobile, visible on md+ */}
          <div className="hidden md:flex flex-1 max-w-sm mx-4 relative" ref={searchRef}>
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tokens..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 w-full border border-border hover:border-foreground/20 focus:border-foreground transition-colors"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>

            {/* Enhanced Search Results - Rendered in Portal */}
            {mounted && showResults && searchResults.length > 0 && searchRef.current && createPortal(
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                style={{
                  position: 'fixed',
                  top: searchRef.current.getBoundingClientRect().bottom + 8,
                  left: searchRef.current.getBoundingClientRect().left,
                  width: searchRef.current.getBoundingClientRect().width,
                  backgroundColor: 'hsl(var(--card))',
                }}
                className="border border-border rounded-[0.25rem] shadow-lg z-[100] max-h-80 overflow-y-auto"
              >
                  <div className="p-2">
                    <div className="text-xs text-muted-foreground px-2 py-2 font-semibold border-b border-border mb-1 uppercase tracking-wide">
                      Search Results
                    </div>
                    {searchResults.map((token) => (
                      <button
                        key={token.mint}
                        onClick={() => handleTokenSelect(token)}
                        className="w-full text-left px-3 py-2.5 rounded-sm hover:bg-muted transition-colors duration-150 focus:bg-muted focus:outline-none"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {token.logoURI && (
                              <img
                                src={token.logoURI}
                                alt={token.symbol}
                                className="w-7 h-7 rounded-sm flex-shrink-0"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none'
                                }}
                              />
                            )}
                            <div className="min-w-0">
                              <div className="font-semibold text-sm text-foreground">{token.symbol}</div>
                              <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {token.name}
                              </div>
                            </div>
                          </div>
                          {token.price && (
                            <div className="text-right flex-shrink-0 ml-2">
                              <div className="text-sm font-medium text-foreground tabular-nums">
                                ${parseFloat(token.price.toString()).toFixed(6)}
                              </div>
                              {solPrice > 0 && (
                                <div className="text-xs text-muted-foreground tabular-nums">
                                  {formatSolEquivalent(parseFloat(token.price.toString()), solPrice)}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>,
              document.body
            )}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                {/* Balance Display - Clickable */}
                <button
                  onClick={() => setPurchaseModalOpen(true)}
                  className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors cursor-pointer group"
                  aria-label="Purchase simulated SOL"
                >
                  <Wallet className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                  <div className="text-sm">
                    <div className="font-semibold text-foreground">
                      {balanceData ? `${parseFloat(balanceData.balance).toFixed(2)} SOL` : 'Loading...'}
                    </div>
                    {solPrice > 0 && balanceData && (
                      <div className="hidden sm:block text-xs text-foreground/60">
                        {formatUSD(parseFloat(balanceData.balance) * solPrice)}
                      </div>
                    )}
                  </div>
                </button>

                {/* Notifications - Hidden on mobile */}
                <div className="hidden md:block">
                  <NotificationDropdown />
                </div>

                {/* User Menu - Hidden on mobile */}
                <div className="hidden md:block">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="flex items-center gap-2 px-3">
                        <Avatar className="h-6 w-6 rounded-md border border-border">
                          <AvatarImage src={avatarUrl} alt={displayName} className="rounded-md" />
                          <AvatarFallback className="bg-primary/10 text-xs rounded-md">
                            {displayName?.[0]?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="hidden sm:inline font-medium">
                          {displayName}
                        </span>
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>My Account</DropdownMenuLabel>
                      <DropdownMenuItem asChild>
                        <Link href="/profile/settings" className="flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          Settings
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </>
            ) : (
              <Button onClick={() => setAuthModalOpen(true)} className="font-semibold">
                Sign In
              </Button>
            )}

            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="md:hidden border-2 border-border bg-background hover:bg-muted"
                  aria-label="Open navigation menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 overflow-y-auto">
                <div className="flex flex-col space-y-4 mt-4">
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

                  {/* Navigation Items - Exclude Monitoring */}
                  <div className="space-y-2">
                    {navigationItems
                      .filter(item => item.href !== '/monitoring')
                      .map((item) => {
                        const Icon = item.icon
                        const isActive = pathname === item.href

                        return (
                          <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                            <div className={cn(
                              "flex items-center gap-3 px-3 py-3 rounded-lg transition-colors",
                              isActive ? "bg-primary/10 text-primary" : "hover:bg-muted"
                            )}>
                              <Icon className="h-5 w-5" />
                              <div>
                                <div className="font-medium">{item.name}</div>
                                <div className="text-xs text-muted-foreground">{item.description}</div>
                              </div>
                            </div>
                          </Link>
                        )
                      })}
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
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted transition-colors text-red-600"
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
          </div>
        </div>
      </div>

      {/* Modals */}
      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
      {isAuthenticated && user && (
        <PurchaseModal 
          open={purchaseModalOpen} 
          onOpenChange={setPurchaseModalOpen}
          userId={user.id}
        />
      )}
    </motion.header>
  )
}