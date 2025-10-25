"use client"

import { useState, useEffect, useCallback } from 'react'
import { flushSync } from 'react-dom'
import { useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api'
import type { User } from '@/lib/types/backend'
import { isTokenValid } from '@/lib/jwt-utils'

// Simplified user type for authentication context
interface AuthUser {
  id: string
  email: string
  handle?: string
  emailVerified?: boolean
  avatarUrl?: string
  rewardPoints?: string | number  // Can be string (Decimal) or number
  userTier?: string  // User role/tier (ADMINISTRATOR, etc)
}

interface AuthState {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
}

export function useAuth() {
  const queryClient = useQueryClient()
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false
  })

  // Load user from localStorage on mount with token validation
  useEffect(() => {
    // Only access localStorage on the client side
    if (typeof window === 'undefined') {
      setAuthState(prev => ({ ...prev, isLoading: false }))
      return
    }

    const savedUserId = localStorage.getItem('userId')
    const savedUser = localStorage.getItem('user')
    const accessToken = localStorage.getItem('accessToken')

    if (savedUserId && savedUser && accessToken) {
      try {
        // Validate token before setting auth state
        if (!isTokenValid(accessToken)) {
          console.log('[Auth] Token expired, clearing session')
          // Token expired - clear all auth data
          localStorage.removeItem('userId')
          localStorage.removeItem('user')
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          setAuthState({
            user: null,
            isLoading: false,
            isAuthenticated: false
          })
          return
        }

        // Token is valid - restore session
        const user = JSON.parse(savedUser)
        setAuthState({
          user: { id: savedUserId, ...user },
          isLoading: false,
          isAuthenticated: true
        })
      } catch (error) {
        console.error('[Auth] Error validating token:', error)
        // Clear invalid data
        localStorage.removeItem('userId')
        localStorage.removeItem('user')
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false
        })
      }
    } else {
      setAuthState(prev => ({ ...prev, isLoading: false }))
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.loginEmail({ email, password })
    const user: AuthUser = {
      id: response.userId,
      email,
      emailVerified: response.user.emailVerified,
      userTier: response.user.userTier
    }

    localStorage.setItem('userId', response.userId)
    localStorage.setItem('user', JSON.stringify(user))
    // Store access token for authenticated API calls
    if (response.accessToken) {
      localStorage.setItem('accessToken', response.accessToken)
    }

    // Force a synchronous state update to ensure UI re-renders immediately
    flushSync(() => {
      setAuthState({
        user,
        isLoading: false,
        isAuthenticated: true
      })
    })

    // Invalidate all user-specific queries after login
    queryClient.invalidateQueries({ queryKey: ['portfolio'] })
    queryClient.invalidateQueries({ queryKey: ['balance'] })
    queryClient.invalidateQueries({ queryKey: ['transactions'] })
    queryClient.invalidateQueries({ queryKey: ['notes'] })

    return response
  }, [queryClient])

  const signup = useCallback(async (email: string, password: string, handle?: string, rewardWalletAddress?: string) => {
    const response = await api.signupEmail({ email, password, handle, rewardWalletAddress })
    const user: AuthUser = {
      id: response.userId,
      email,
      handle: handle,
      emailVerified: response.user.emailVerified,
      userTier: response.user.userTier
    }

    localStorage.setItem('userId', response.userId)
    localStorage.setItem('user', JSON.stringify(user))
    // Store access token for authenticated API calls
    if (response.accessToken) {
      localStorage.setItem('accessToken', response.accessToken)
    }

    // Force a synchronous state update to ensure UI re-renders immediately
    flushSync(() => {
      setAuthState({
        user,
        isLoading: false,
        isAuthenticated: true
      })
    })

    // Invalidate all user-specific queries after signup
    queryClient.invalidateQueries({ queryKey: ['portfolio'] })
    queryClient.invalidateQueries({ queryKey: ['balance'] })
    queryClient.invalidateQueries({ queryKey: ['transactions'] })
    queryClient.invalidateQueries({ queryKey: ['notes'] })

    return response
  }, [queryClient])

  const logout = useCallback(() => {
    localStorage.removeItem('userId')
    localStorage.removeItem('user')
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')

    setAuthState({
      user: null,
      isLoading: false,
      isAuthenticated: false
    })
  }, [])

  const updateProfile = useCallback(async (updates: {
    handle?: string;
    avatarUrl?: string;
    bio?: string;
    displayName?: string;
    twitter?: string;
    discord?: string;
    telegram?: string;
    website?: string;
  }) => {
    if (!authState.user) throw new Error('Not authenticated')

    await api.updateProfile({
      userId: authState.user.id,
      handle: updates.handle,
      avatarUrl: updates.avatarUrl,
      bio: updates.bio,
      displayName: updates.displayName,
    })
    
    const updatedUser = { ...authState.user, ...updates }
    localStorage.setItem('user', JSON.stringify(updatedUser))
    
    setAuthState(prev => ({
      ...prev,
      user: updatedUser
    }))
  }, [authState.user])

  return {
    ...authState,
    login,
    signup,
    logout,
    updateProfile,
    getUserId: () => authState.user?.id || null
  }
}