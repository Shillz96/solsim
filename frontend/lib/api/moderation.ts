/**
 * Moderation API Client
 * 
 * Frontend API wrapper for moderation operations:
 * - Mute/unmute users
 * - Ban/unban users
 * - Add/clear strikes
 * - Delete messages
 * - Upgrade user tiers
 * - Get moderation stats and history
 */

import { api as apiClient } from '../api'

export interface ModerationStatus {
  canChat: boolean
  isMuted: boolean
  isBanned: boolean
  strikes: number
  mutedUntil: Date | null
  reason?: string
}

export interface ModerationStats {
  activeMutes: number
  activeBans: number
  usersWithStrikes: number
  recentActions24h: number
  flaggedUsers: Array<{
    id: string
    handle: string
    displayName?: string
    avatarUrl?: string
    userTier: string
    chatStrikes: number
    chatMutedUntil?: Date
    bannedFromChat: boolean
  }>
}

export interface ModerationAction {
  id: string
  userId: string
  moderatorId?: string
  action: string
  reason?: string
  duration?: number
  expiresAt?: Date
  createdAt: Date
}

/**
 * Get moderation status for a user
 */
export async function getUserModerationStatus(userId: string): Promise<ModerationStatus> {
  const response = await apiClient.get<{ status: ModerationStatus }>(`/chat/moderation/status/${userId}`)
  return response.data.status
}

/**
 * Mute a user for specified duration
 */
export async function muteUser(
  userId: string,
  durationMinutes: number,
  reason?: string
): Promise<ModerationStatus> {
  const response = await apiClient.post<{ status: ModerationStatus }>('/chat/moderation/mute', {
    userId,
    durationMinutes,
    reason
  })
  return response.data.status
}

/**
 * Unmute a user (remove mute early)
 */
export async function unmuteUser(userId: string): Promise<ModerationStatus> {
  const response = await apiClient.post<{ status: ModerationStatus }>('/chat/moderation/unmute', {
    userId
  })
  return response.data.status
}

/**
 * Ban a user from chat permanently
 */
export async function banUser(userId: string, reason?: string): Promise<ModerationStatus> {
  const response = await apiClient.post<{ status: ModerationStatus }>('/chat/moderation/ban', {
    userId,
    reason
  })
  return response.data.status
}

/**
 * Unban a user from chat
 */
export async function unbanUser(userId: string): Promise<ModerationStatus> {
  const response = await apiClient.post<{ status: ModerationStatus }>('/chat/moderation/unban', {
    userId
  })
  return response.data.status
}

/**
 * Add a strike to a user (triggers auto-escalation)
 */
export async function addStrike(userId: string, reason?: string): Promise<ModerationStatus> {
  const response = await apiClient.post<{ status: ModerationStatus }>('/chat/moderation/strike', {
    userId,
    reason
  })
  return response.data.status
}

/**
 * Clear all strikes for a user
 */
export async function clearStrikes(userId: string): Promise<ModerationStatus> {
  const response = await apiClient.delete<{ status: ModerationStatus }>(`/chat/moderation/clear-strikes/${userId}`)
  return response.data.status
}

/**
 * Delete a chat message
 */
export async function deleteMessage(messageId: string): Promise<boolean> {
  const response = await apiClient.delete<{ success: boolean }>(`/chat/messages/${messageId}`)
  return response.data.success
}

/**
 * Get moderation history for a user
 */
export async function getModerationHistory(
  userId: string,
  limit: number = 20
): Promise<ModerationAction[]> {
  const response = await apiClient.get<{ history: ModerationAction[] }>(`/chat/moderation/history/${userId}`, {
    params: { limit }
  })
  return response.data.history
}

/**
 * Upgrade a user's tier (ADMINISTRATOR only)
 */
export async function upgradeUserTier(
  userId: string,
  newTier: 'EMAIL_USER' | 'WALLET_USER' | 'VSOL_HOLDER' | 'MODERATOR' | 'ADMINISTRATOR'
): Promise<{ id: string; handle: string; userTier: string }> {
  const response = await apiClient.post<{ user: { id: string; handle: string; userTier: string } }>(`/admin/users/${userId}/upgrade-tier`, {
    newTier
  })
  return response.data.user
}

/**
 * Get moderation statistics dashboard data
 */
export async function getModerationStats(): Promise<ModerationStats> {
  const response = await apiClient.get<{ stats: ModerationStats }>('/admin/moderation/stats')
  return response.data.stats
}

/**
 * Quick mute presets
 */
export const MUTE_DURATIONS = {
  '10min': 10,
  '1hour': 60,
  '24hours': 24 * 60,
  '7days': 7 * 24 * 60,
  '30days': 30 * 24 * 60,
} as const

export type MuteDuration = keyof typeof MUTE_DURATIONS
