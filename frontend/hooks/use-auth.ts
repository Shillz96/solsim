"use client"

import { useState, useEffect, useCallback } from 'react'
import * as api from '@/lib/api'

interface User {
  id: string
  email?: string
  handle?: string
  profileImage?: string
}

interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
}

export function useAuth() {
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
    const user = { id: response.userId, email }
    
    localStorage.setItem('userId', response.userId)
    localStorage.setItem('user', JSON.stringify({ email }))
    
    setAuthState({
      user,
      isLoading: false,
      isAuthenticated: true
    })
    
    return response
  }, [])

  const signup = useCallback(async (email: string, password: string, handle?: string) => {
    const response = await api.signupEmail({ email, password, handle })
    const user = { id: response.userId, email, handle }
    
    localStorage.setItem('userId', response.userId)
    localStorage.setItem('user', JSON.stringify({ email, handle }))
    
    setAuthState({
      user,
      isLoading: false,
      isAuthenticated: true
    })
    
    return response
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('userId')
    localStorage.removeItem('user')
    
    setAuthState({
      user: null,
      isLoading: false,
      isAuthenticated: false
    })
  }, [])

  const updateProfile = useCallback(async (updates: { handle?: string; profileImage?: string; bio?: string }) => {
    if (!authState.user) throw new Error('Not authenticated')
    
    await api.updateProfile({
      userId: authState.user.id,
      ...updates
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