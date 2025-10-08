// Enhanced Protected Route Wrapper with Token Refresh
// Ensures users are authenticated and handles token auto-refresh

"use client"

import { useEffect, useState, createContext, useContext } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/api-hooks'
import authService from '@/lib/auth-service'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { TrendingUp, AlertCircle } from 'lucide-react'
import type { User } from '@/lib/types/api-types'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  tokenRefreshError: string | null
  refreshToken: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthWrapperProps {
  children: React.ReactNode
  requireAuth?: boolean
  redirectTo?: string
}

export function AuthWrapper({ 
  children, 
  requireAuth = true, 
  redirectTo = '/' 
}: AuthWrapperProps) {
  const { user, loading, isAuthenticated } = useAuth()
  const router = useRouter()
  const [tokenRefreshError, setTokenRefreshError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Auto-refresh token before expiration (only in production with real auth)
  useEffect(() => {
    if (!isAuthenticated) return

    const refreshToken = async () => {
      try {
        setIsRefreshing(true)
        setTokenRefreshError(null)
        await authService.ensureValidToken()
      } catch (error) {
        import('@/lib/error-logger').then(({ errorLogger }) => {
          errorLogger.authError('Token refresh failed', error as Error, {
            action: 'token_refresh_failed',
            metadata: { component: 'AuthWrapper' }
          })
        })
        setTokenRefreshError('Session expired. Please sign in again.')
        // Auto-logout on refresh failure
        setTimeout(() => {
          authService.logoutLocal()
          router.push('/')
        }, 3000)
      } finally {
        setIsRefreshing(false)
      }
    }

    // Only do token refresh for production authentication
    // Skip for dev bypass or if no actual auth token exists
    const hasRealAuth = authService.isAuthenticated() && typeof window !== 'undefined' && localStorage.getItem('auth_token')
    
    if (!hasRealAuth) return

    // Initial token check
    refreshToken()

    // Set up interval to refresh token every 15 minutes (less aggressive)
    const tokenRefreshInterval = setInterval(refreshToken, 15 * 60 * 1000)

    return () => clearInterval(tokenRefreshInterval)
  }, [isAuthenticated, router])

  // Handle route protection
  useEffect(() => {
    if (!loading && requireAuth && !isAuthenticated && !tokenRefreshError) {
      // Don't redirect immediately, show auth modal instead
      // Could implement auth modal showing logic here if needed
    }
  }, [loading, isAuthenticated, requireAuth, tokenRefreshError])

  const authContextValue: AuthContextType = {
    user: user || null,
    isLoading: loading || isRefreshing,
    isAuthenticated: isAuthenticated && !tokenRefreshError,
    tokenRefreshError,
    refreshToken: async () => {
      try {
        setIsRefreshing(true)
        setTokenRefreshError(null)
        await authService.ensureValidToken()
      } catch (error) {
        setTokenRefreshError('Failed to refresh session')
        throw error
      } finally {
        setIsRefreshing(false)
      }
    }
  }

  // Show loading skeleton while checking authentication
  if (loading || isRefreshing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 w-full max-w-md bg-card border-border">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-secondary">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Sol Sim</h1>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            {isRefreshing && (
              <div className="text-sm text-muted-foreground text-center">
                Refreshing session...
              </div>
            )}
          </div>
        </Card>
      </div>
    )
  }

  // Show token refresh error
  if (tokenRefreshError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 w-full max-w-md bg-card border-border">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-secondary">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Sol Sim</h1>
          </div>
          <Alert className="mb-4 bg-destructive/10 border-destructive/50">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-foreground">{tokenRefreshError}</AlertDescription>
          </Alert>
          <Button 
            onClick={() => setTokenRefreshError(null)} 
            className="w-full"
          >
            Try Again
          </Button>
        </Card>
      </div>
    )
  }

  // If authentication is required but user is not authenticated, show auth modal
  if (requireAuth && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 md:p-12 w-full max-w-md text-center space-y-6 border-2 bg-card border-border">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-foreground">
              <TrendingUp className="h-6 w-6 text-background" />
            </div>
            <h1 className="text-3xl font-bold font-heading text-foreground">Sol Sim</h1>
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold font-heading">Authentication Required</h2>
            <p className="text-base text-muted-foreground">
              Please sign in to access your portfolio and trading features.
            </p>
          </div>

          {/* Instructions */}
          <div className="pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground/80">
              Click the <span className="font-semibold text-foreground">"Sign In"</span> button in the navigation bar to get started.
            </p>
          </div>

          {/* Optional: Add a visual arrow pointing up */}
          <div className="flex justify-center opacity-50">
            <svg className="h-8 w-8 text-muted-foreground animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </div>
        </Card>
      </div>
    )
  }

  // User is authenticated, provide context and render children
  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook to access auth context
export function useAuthContext() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthWrapper')
  }
  return context
}

// Higher-order component for easy usage
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: { requireAuth?: boolean; redirectTo?: string }
) {
  return function AuthenticatedComponent(props: P) {
    return (
      <AuthWrapper {...options}>
        <Component {...props} />
      </AuthWrapper>
    )
  }
}