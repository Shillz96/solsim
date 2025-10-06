// Authentication API Service
// Handles login, registration, and token management

import apiClient, { ApiError } from './api-client'
import { InputSanitizer } from './security-utils'
import type { 
  LoginRequest, 
  RegisterRequest, 
  AuthResponse, 
  User, 
  ChangePasswordRequest,
  ForgotPasswordRequest
} from './types/api-types'

class AuthService {
  // Check if user is authenticated (in dev mode, always return true)
  isAuthenticated(): boolean {
    const isDevelopment = process.env.NEXT_PUBLIC_ENV === 'development'
    if (isDevelopment) {
      return true // Always authenticated in development mode
    }
    
    // In production, check for actual token
    return !!apiClient['authToken'] || typeof window !== 'undefined' && !!localStorage.getItem('auth_token')
  }

  // Get development user info
  getDevUser(): User {
    return {
      id: 'dev-user-1',
      email: 'dev-user-1@dev.local',
      username: 'dev_user',
      virtualSolBalance: '100.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }

  // Login user
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    // Validate email format
    if (!InputSanitizer.validateEmail(credentials.email)) {
      throw new Error('Invalid email format')
    }

    const response = await apiClient.post<AuthResponse>('/api/v1/auth/login', credentials)
    
    // Store auth token
    apiClient.setAuthToken(response.token)
    
    return response
  }

  // Register new user
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    // Validate inputs
    if (!InputSanitizer.validateEmail(userData.email)) {
      throw new Error('Invalid email format')
    }

    if (userData.username && !InputSanitizer.validateUsername(userData.username)) {
      throw new Error('Username must be 3-20 characters and contain only letters, numbers, underscore, or dash')
    }

    const response = await apiClient.post<AuthResponse>('/api/v1/auth/register', userData)
    
    // Store auth token
    apiClient.setAuthToken(response.token)
    
    return response
  }

  // Verify token and get current user
  async verifyToken(): Promise<{ user: User; valid: boolean }> {
    const isDevelopment = process.env.NEXT_PUBLIC_ENV === 'development'
    if (isDevelopment) {
      // In development mode, return mock user data
      return {
        user: this.getDevUser(),
        valid: true
      }
    }
    
    return apiClient.get('/api/v1/auth/verify')
  }

  // Refresh authentication token
  async refreshToken(): Promise<{ token: string }> {
    const response = await apiClient.post<{ token: string }>('/api/v1/auth/refresh')
    
    // Update stored token
    apiClient.setAuthToken(response.token)
    
    return response
  }

  // Change password
  async changePassword(passwords: ChangePasswordRequest): Promise<{ token: string }> {
    const response = await apiClient.post<{ token: string }>('/api/v1/auth/change-password', passwords)
    
    // Update token after password change
    apiClient.setAuthToken(response.token)
    
    return response
  }

  // Request password reset
  async forgotPassword(request: ForgotPasswordRequest): Promise<{ message: string }> {
    return apiClient.post('/api/v1/auth/forgot-password', request)
  }

  // Logout user (server-side)
  async logout(): Promise<void> {
    try {
      await apiClient.post('/api/v1/auth/logout')
    } catch (error) {
      // Continue with logout even if server call fails
      console.warn('Server logout failed:', error)
    } finally {
      apiClient.clearAuth()
    }
  }

  // Get current user profile
  async getProfile(): Promise<User> {
    const isDevelopment = process.env.NEXT_PUBLIC_ENV === 'development'
    if (isDevelopment) {
      // In development mode, return mock user data
      return this.getDevUser()
    }
    
    return apiClient.get<User>('/api/v1/user/profile')
  }

  // Update user profile
  async updateProfile(updates: Partial<User>): Promise<User> {
    return apiClient.put<User>('/api/v1/user/profile', updates)
  }

  // Client-side logout only
  logoutLocal() {
    apiClient.clearAuth()
  }

  // Get stored token
  getToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('auth_token')
  }

  // Auto-refresh token before expiry
  async ensureValidToken(): Promise<string | null> {
    if (!this.isAuthenticated()) return null

    try {
      // Try to verify current token
      await this.verifyToken()
      return this.getToken()
    } catch (error) {
      // If verification fails, try to refresh
      try {
        const { token } = await this.refreshToken()
        return token
      } catch (refreshError) {
        // If refresh also fails, logout
        this.logoutLocal()
        return null
      }
    }
  }
}

// Export singleton instance
const authService = new AuthService()
export default authService