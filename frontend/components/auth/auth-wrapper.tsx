// Enhanced Protected Route Wrapper with Token Refresh
// Ensures users are authenticated and handles token auto-refresh

"use client"

import { useEffect, useState, createContext, useContext } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/api-hooks'
import authService from '@/lib/auth-service'
import { AuthModal } from '@/components/modals/auth-modal'
import { Card } from '@/components/ui/card'
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

  // Auto-refresh token before expiration
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

    // Initial token check
    refreshToken()

    // Set up interval to refresh token every 10 minutes
    const tokenRefreshInterval = setInterval(refreshToken, 10 * 60 * 1000)

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
        <Card className="p-8 w-full max-w-md">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-secondary">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold">Sol Sim</h1>
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
        <Card className="p-8 w-full max-w-md">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-secondary">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold">Sol Sim</h1>
          </div>
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{tokenRefreshError}</AlertDescription>
          </Alert>
          <AuthModal open={true} onOpenChange={() => setTokenRefreshError(null)} />
        </Card>
      </div>
    )
  }

  // If authentication is required but user is not authenticated, show auth modal
  if (requireAuth && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 w-full max-w-md text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-secondary">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold">Sol Sim</h1>
          </div>
          <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
          <p className="text-muted-foreground mb-6">
            Please sign in to access your portfolio and trading features.
          </p>
          <AuthModal open={true} onOpenChange={() => {}} />
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