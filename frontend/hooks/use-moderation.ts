'use client'

/**
 * useModeration Hook
 * 
 * Provides moderation permissions and utilities
 */

import { useAuth } from '@/hooks/use-auth'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import * as moderationApi from '@/lib/api/moderation'

export function useModeration() {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Check if user can moderate
  const canModerate = user?.userTier === 'ADMINISTRATOR' || user?.userTier === 'MODERATOR'
  const isAdmin = user?.userTier === 'ADMINISTRATOR'

  // Mute user mutation
  const muteMutation = useMutation({
    mutationFn: ({ userId, duration, reason }: { userId: string; duration: number; reason?: string }) =>
      moderationApi.muteUser(userId, duration, reason),
    onSuccess: () => {
      toast({ title: 'User muted', description: 'The user has been muted from chat' })
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] })
    },
    onError: (error: any) => {
      toast({ title: 'Failed to mute user', description: error.message, variant: 'destructive' })
    }
  })

  // Unmute user mutation
  const unmuteMutation = useMutation({
    mutationFn: (userId: string) => moderationApi.unmuteUser(userId),
    onSuccess: () => {
      toast({ title: 'User unmuted', description: 'The user can now chat again' })
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] })
    },
    onError: (error: any) => {
      toast({ title: 'Failed to unmute user', description: error.message, variant: 'destructive' })
    }
  })

  // Ban user mutation
  const banMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason?: string }) =>
      moderationApi.banUser(userId, reason),
    onSuccess: () => {
      toast({ title: 'User banned', description: 'The user has been banned from chat' })
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] })
    },
    onError: (error: any) => {
      toast({ title: 'Failed to ban user', description: error.message, variant: 'destructive' })
    }
  })

  // Unban user mutation
  const unbanMutation = useMutation({
    mutationFn: (userId: string) => moderationApi.unbanUser(userId),
    onSuccess: () => {
      toast({ title: 'User unbanned', description: 'The user can now chat again' })
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] })
    },
    onError: (error: any) => {
      toast({ title: 'Failed to unban user', description: error.message, variant: 'destructive' })
    }
  })

  // Delete message mutation
  const deleteMessageMutation = useMutation({
    mutationFn: (messageId: string) => moderationApi.deleteMessage(messageId),
    onSuccess: () => {
      toast({ title: 'Message deleted', description: 'The message has been removed' })
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] })
    },
    onError: (error: any) => {
      toast({ title: 'Failed to delete message', description: error.message, variant: 'destructive' })
    }
  })

  // Add strike mutation
  const addStrikeMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason?: string }) =>
      moderationApi.addStrike(userId, reason),
    onSuccess: () => {
      toast({ title: 'Strike added', description: 'User has received a strike' })
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] })
    },
    onError: (error: any) => {
      toast({ title: 'Failed to add strike', description: error.message, variant: 'destructive' })
    }
  })

  // Clear strikes mutation
  const clearStrikesMutation = useMutation({
    mutationFn: (userId: string) => moderationApi.clearStrikes(userId),
    onSuccess: () => {
      toast({ title: 'Strikes cleared', description: 'All strikes have been removed' })
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] })
    },
    onError: (error: any) => {
      toast({ title: 'Failed to clear strikes', description: error.message, variant: 'destructive' })
    }
  })

  // Upgrade tier mutation (admin only)
  const upgradeTierMutation = useMutation({
    mutationFn: ({ userId, newTier }: { userId: string; newTier: any }) =>
      moderationApi.upgradeUserTier(userId, newTier),
    onSuccess: () => {
      toast({ title: 'Tier upgraded', description: 'User tier has been updated' })
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] })
    },
    onError: (error: any) => {
      toast({ title: 'Failed to upgrade tier', description: error.message, variant: 'destructive' })
    }
  })

  return {
    canModerate,
    isAdmin,
    muteUser: muteMutation.mutate,
    unmuteUser: unmuteMutation.mutate,
    banUser: banMutation.mutate,
    unbanUser: unbanMutation.mutate,
    deleteMessage: deleteMessageMutation.mutate,
    addStrike: addStrikeMutation.mutate,
    clearStrikes: clearStrikesMutation.mutate,
    upgradeTier: upgradeTierMutation.mutate,
    isLoading:
      muteMutation.isPending ||
      unmuteMutation.isPending ||
      banMutation.isPending ||
      unbanMutation.isPending ||
      deleteMessageMutation.isPending ||
      addStrikeMutation.isPending ||
      clearStrikesMutation.isPending ||
      upgradeTierMutation.isPending
  }
}
