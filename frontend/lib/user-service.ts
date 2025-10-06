// User Management API Service
// Handles user profiles, settings, and account management

import apiClient from './api-client'
import type { 
  User, 
  UserProfile, 
  UpdateProfileRequest, 
  UserSettings 
} from './types/api-types'

class UserService {
  // Get user profile (own or public)
  async getProfile(userId?: string): Promise<UserProfile> {
    const endpoint = userId 
      ? `/api/v1/user/profile/${userId}`
      : '/api/v1/user/profile'
    
    return apiClient.get<UserProfile>(endpoint)
  }

  // Update user profile
  async updateProfile(updates: UpdateProfileRequest): Promise<User> {
    return apiClient.put<User>('/api/v1/user/profile', updates)
  }

  // Get user balance
  async getBalance(): Promise<{ balance: string; currency: string; timestamp: number }> {
    return apiClient.get('/api/v1/user/balance')
  }

  // Get public user profile
  async getPublicProfile(userId: string): Promise<UserProfile> {
    return apiClient.get<UserProfile>(`/api/v1/user/public/${userId}`)
  }

  // Get user settings
  async getSettings(): Promise<UserSettings> {
    return apiClient.get<UserSettings>('/api/v1/user/settings')
  }

  // Update user settings
  async updateSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    return apiClient.put<UserSettings>('/api/v1/user/settings', settings)
  }

  // Upload user avatar
  async uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
    const formData = new FormData()
    formData.append('avatar', file)
    
    return apiClient.upload<{ avatarUrl: string }>('/api/v1/user/avatar', formData)
  }

  // Delete user avatar
  async deleteAvatar(): Promise<{ message: string }> {
    return apiClient.delete('/api/v1/user/avatar')
  }

  // Delete user account
  async deleteAccount(): Promise<{ message: string }> {
    return apiClient.delete('/api/v1/user/account')
  }

  // Search users (for mentions, etc.)
  async searchUsers(query: string, limit: number = 10): Promise<UserProfile[]> {
    return apiClient.get<UserProfile[]>(`/api/v1/user/search?q=${encodeURIComponent(query)}&limit=${limit}`)
  }

  // Get user's trading statistics
  async getUserStats(userId?: string): Promise<{
    totalTrades: number
    winRate: number
    totalPnL: number
    avgTradeSize: number
    rank: number
  }> {
    const endpoint = userId 
      ? `/api/v1/user/stats/${userId}`
      : '/api/v1/user/stats'
    
    return apiClient.get(endpoint)
  }
}

// Export singleton instance
const userService = new UserService()
export default userService