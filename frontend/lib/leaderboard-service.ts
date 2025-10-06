// Leaderboard API Service
// Handles leaderboard data and rankings

import apiClient from './api-client'

export interface LeaderboardEntry {
  id: string
  username: string
  email: string
  balance: number
  totalPnL: number
  totalTrades: number
  winRate: number
  lastTradeDate: number | null
  rank?: number  // Will be calculated on frontend
  previousRank?: number  // For rank change indicators
}

export interface LeaderboardData {
  data: LeaderboardEntry[]
  count: number
  timestamp?: number
}

class LeaderboardService {
  // Get leaderboard data
  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    const response = await apiClient.get<LeaderboardEntry[]>('/api/v1/leaderboard')
    
    // Add rank to each entry (backend returns sorted by totalPnL)
    return response.map((entry, index) => ({
      ...entry,
      rank: index + 1,
      // Mock previous rank for animation (could be stored in localStorage)
      previousRank: index + 1 + Math.floor(Math.random() * 5) - 2
    }))
  }

  // Get user's position in leaderboard
  async getUserRank(userId: string): Promise<{ rank: number; totalUsers: number }> {
    const leaderboard = await this.getLeaderboard()
    const userIndex = leaderboard.findIndex(entry => entry.id === userId)
    
    return {
      rank: userIndex + 1,
      totalUsers: leaderboard.length
    }
  }

  // Get top performers for specific time periods
  async getTopPerformers(limit: number = 5): Promise<LeaderboardEntry[]> {
    const leaderboard = await this.getLeaderboard()
    return leaderboard.slice(0, limit)
  }
}

// Export singleton instance
const leaderboardService = new LeaderboardService()
export default leaderboardService