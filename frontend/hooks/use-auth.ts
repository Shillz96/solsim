"use client"

import { useState, useEffect, useCallback } from 'react'
import { flushSync } from 'react-dom'
import { useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api'
import type { User } from '@/lib/types/backend'

// Simplified user type for authentication context
interface AuthUser {
  id: string
  email: string
  handle?: string
  emailVerified?: boolean
  profileImage?: string
  avatarUrl?: string
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

  // Load user from localStorage on mount
  useEffect(() => {
    const savedUserId = localStorage.getItem('userId')
    const savedUser = localStorage.getItem('user')
    
    if (savedUserId && savedUser) {
      try {
        const user = JSON.parse(savedUser)
        setAuthState({
          user: { id: savedUserId, ...user },
          isLoading: false,
          isAuthenticated: true
        })
      } catch {
        // Clear invalid data
        localStorage.removeItem('userId')
        localStorage.removeItem('user')
        setAuthState(prev => ({ ...prev, isLoading: false }))
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
      emailVerified: response.user.emailVerified
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

  const signup = useCallback(async (email: string, password: string, username?: string) => {
    const response = await api.signupEmail({ email, password, username })
    const user: AuthUser = {
      id: response.userId,
      email,
      handle: username,
      emailVerified: response.user.emailVerified
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
    
    setAuthState({
      user: null,
      isLoading: false,
      isAuthenticated: false
    })
  }, [])

  const updateProfile = useCallback(async (updates: { 
    handle?: string; 
    profileImage?: string; 
    bio?: string;
    displayName?: string;
    avatar?: string;
    twitter?: string;
    discord?: string;
    telegram?: string;
    website?: string;
  }) => {
    if (!authState.user) throw new Error('Not authenticated')
    
    await api.updateProfile({
      userId: authState.user.id,
      handle: updates.handle,
      profileImage: updates.profileImage,
      bio: updates.bio,
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