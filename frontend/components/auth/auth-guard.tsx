"use client"

import dynamic from "next/dynamic"
import { useAuth } from "@/hooks/use-auth"
import { useState, useEffect } from "react"

// Dynamic import for AuthModal to reduce initial bundle size
const AuthModal = dynamic(() => import("@/components/modals/auth-modal").then(mod => ({ default: mod.AuthModal })), {
  ssr: false
})
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Lock, TrendingUp } from "lucide-react"

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  fallback?: React.ReactNode
}

export function AuthGuard({ children, requireAuth = true, fallback }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)

  useEffect(() => {
    if (!isLoading && requireAuth && !isAuthenticated) {
      setShowAuthModal(true)
    }
  }, [isLoading, requireAuth, isAuthenticated])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (requireAuth && !isAuthenticated) {
    return (
      <>
        {fallback || (
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="mario-card-standard max-w-md w-full">
              <div className="mario-header-card text-center mb-6">
                <div className="mario-icon-container mx-auto mb-4 w-fit">
                  <Lock className="h-8 w-8 text-white" />
                </div>
                <h2 className="mario-title-standard">Authentication Required</h2>
                <p className="mario-subtitle-standard">
                  Please sign in to access this page and start trading.
                </p>
              </div>
              <div className="p-6 space-y-4">
                <Button 
                  onClick={() => setShowAuthModal(true)} 
                  className="mario-btn-standard w-full flex items-center gap-2"
                >
                  <TrendingUp className="h-4 w-4" />
                  Sign In to Trade
                </Button>
              </div>
            </div>
          </div>
        )}
        <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />
      </>
    )
  }

  return <>{children}</>
}