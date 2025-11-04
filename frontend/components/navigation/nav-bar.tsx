"use client"

import Link from "next/link"
import Image from "next/image"
import dynamic from "next/dynamic"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useState, useCallback, useEffect } from "react"

// Dynamic imports for modals to reduce initial bundle size
const AuthModal = dynamic(() => import("@/components/modals/auth-modal").then(mod => ({ default: mod.AuthModal })), {
  ssr: false
})
const LevelProgressModal = dynamic(() => import("@/components/level/level-progress-modal").then(mod => ({ default: mod.LevelProgressModal })), {
  ssr: false
})

import { cn, marioStyles } from "@/lib/utils"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useQuery } from "@tanstack/react-query"
import * as api from "@/lib/api"
import { useNotifications } from "@/hooks/use-notifications"
import { useOnboardingContext } from "@/lib/onboarding-provider"
import { CombinedProfileBalance } from "@/components/navigation/combined-profile-balance"
import { useBalance } from "@/hooks/use-react-query-hooks"
import { HourlyRewardTimer } from "@/components/navbar/HourlyRewardTimer"

// Import extracted components
import { SearchBar } from "./search-bar"
import { DesktopNavigation } from "./desktop-navigation"
import { MobileMenu } from "./mobile-menu"

export function NavBar() {
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [levelModalOpen, setLevelModalOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  // Auth and balance data
  const { user, isAuthenticated, logout } = useAuth()
  const { startOnboarding } = useOnboardingContext()

  // Notifications data
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
  } = useNotifications()

  const { data: balanceData } = useBalance(user?.id)

  // Fetch user profile for avatar and handle
  const { data: userProfile } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: () => user?.id ? api.getUserProfile(user.id) : null,
    enabled: !!user?.id,
    staleTime: 1 * 60 * 1000
  })

  const balanceNumber = balanceData ? parseFloat(balanceData.balance) : 0
  const profile = userProfile as any
  const displayName = profile?.displayName || profile?.handle || user?.email?.split('@')[0] || 'User'
  const avatarUrl = profile?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}&backgroundColor=ef4444&backgroundType=solid&fontFamily=Arial&fontSize=40`

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleLogout = useCallback(() => {
    logout()
  }, [logout])

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 z-header w-full border-b border-[var(--color-border)] bg-background"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      <div className="w-full px-4 md:px-6">
        <div className="flex items-center justify-between gap-4 h-[var(--navbar-height)]">
          {/* Logo and Brand */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center flex-shrink-0">
              <Image
                src="/navbarlogo.svg"
                alt="1UP SOL"
                width={180}
                height={54}
                priority
                className="h-8 md:h-10 w-auto hover:scale-105 transition-transform duration-200"
              />
            </Link>
          </div>

          {/* Desktop Navigation - Centered */}
          <DesktopNavigation />

          {/* Enhanced Search Bar - Narrower */}
          <SearchBar />

          {/* Right Side Actions */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Hourly Rewards Timer - Always visible */}
            <HourlyRewardTimer />

            {isAuthenticated ? (
              <>
                {/* Combined Profile + Balance Card */}
                {user && (
                  <div className="hidden md:block">
                    <CombinedProfileBalance
                      displayName={displayName}
                      avatarUrl={avatarUrl}
                      xp={parseFloat(user.rewardPoints?.toString() || '0')}
                      userId={user.id}
                      onLogout={handleLogout}
                      onOpenLevelModal={() => setLevelModalOpen(true)}
                      onStartOnboarding={startOnboarding}
                      unreadNotificationCount={unreadCount}
                      notifications={notifications}
                      onMarkAsRead={markAsRead}
                      onMarkAllAsRead={markAllAsRead}
                      onRemoveNotification={removeNotification}
                    />
                  </div>
                )}
              </>
            ) : (
              <Button onClick={() => setAuthModalOpen(true)} className="font-semibold h-8 sm:h-9 px-3 sm:px-4 text-sm sm:text-base">
                Sign In
              </Button>
            )}

            {/* Mobile Menu */}
            <MobileMenu
              isAuthenticated={isAuthenticated}
              user={user}
              displayName={displayName}
              avatarUrl={avatarUrl}
              unreadCount={unreadCount}
              notifications={notifications}
              markAsRead={markAsRead}
              markAllAsRead={markAllAsRead}
              onLogout={handleLogout}
              onStartOnboarding={startOnboarding}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
      {isAuthenticated && user && (
        <>
          <LevelProgressModal
            open={levelModalOpen}
            onOpenChange={setLevelModalOpen}
            currentXP={parseFloat(user.rewardPoints?.toString() || '0')}
          />
        </>
      )}
    </motion.header>
  )
}
