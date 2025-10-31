"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../lib/api';
import { useToast } from './use-toast';

/**
 * Hook for managing social sharing SOL rewards
 * Provides status, tracking, and claiming functionality
 */
export function useSolRewards() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch current reward status
  const { data: rewardStatus, isLoading, error } = useQuery({
    queryKey: ['solRewards'],
    queryFn: api.getSolRewardStatus,
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Refetch every minute
    retry: 1,
  });

  // Track a share event
  const trackShareMutation = useMutation({
    mutationFn: api.trackSolShare,
    onSuccess: (data) => {
      // Update cache immediately
      queryClient.setQueryData(['solRewards'], data);
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['solRewards'] });
      
      // Show success toast
      toast({
        title: "Share Tracked! 🎉",
        description: data.message,
        duration: 4000,
      });
    },
    onError: (error: Error) => {
      // Show error toast
      toast({
        title: "Failed to track share",
        description: error.message,
        variant: "destructive",
        duration: 5000,
      });
    },
  });

  // Claim reward
  const claimRewardMutation = useMutation({
    mutationFn: api.claimSolReward,
    onSuccess: (data) => {
      // Invalidate all reward and balance queries
      queryClient.invalidateQueries({ queryKey: ['solRewards'] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      
      // Show success toast with confetti
      toast({
        title: "Reward Claimed! 🎊",
        description: data.message,
        duration: 6000,
      });

      // Optional: Trigger confetti animation
      if (typeof window !== 'undefined' && (window as any).confetti) {
        (window as any).confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    },
    onError: (error: Error) => {
      // Show error toast
      toast({
        title: "Failed to claim reward",
        description: error.message,
        variant: "destructive",
        duration: 5000,
      });
    },
  });

  return {
    // Status data
    rewardStatus,
    isLoading,
    error,
    
    // Computed values for convenience
    shareCount: rewardStatus?.shareCount ?? 0,
    remainingShares: rewardStatus?.remainingShares ?? 3,
    canClaim: rewardStatus?.canClaim ?? false,
    totalRewarded: rewardStatus?.totalRewarded ?? 0,
    nextClaimAvailable: rewardStatus?.nextClaimAvailable,
    
    // Actions
    trackShare: trackShareMutation.mutate,
    claimReward: claimRewardMutation.mutate,
    
    // Loading states
    isTracking: trackShareMutation.isPending,
    isClaiming: claimRewardMutation.isPending,
    
    // Error states
    trackError: trackShareMutation.error,
    claimError: claimRewardMutation.error,
  };
}

/**
 * Hook for detecting low balance and triggering rewards modal
 * Returns whether user has low balance and should be prompted
 */
export function useLowBalanceDetection(threshold = 100) {
  const queryClient = useQueryClient();
  
  // Get balance from cache (assuming it's already being fetched elsewhere)
  const balanceData = queryClient.getQueryData(['balance']) as any;
  const currentBalance = balanceData ? parseFloat(balanceData.balance) : null;
  
  // Check if balance is low
  const isLowBalance = currentBalance !== null && currentBalance < threshold;
  
  // Check if we've already shown the alert today (localStorage)
  const hasShownToday = (() => {
    if (typeof window === 'undefined') return false;
    
    const lastShown = localStorage.getItem('lowBalanceAlertShown');
    if (!lastShown) return false;
    
    const lastShownDate = new Date(lastShown);
    const today = new Date();
    
    // Check if it was shown today
    return lastShownDate.toDateString() === today.toDateString();
  })();
  
  // Mark as shown for today
  const markAsShown = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('lowBalanceAlertShown', new Date().toISOString());
    }
  };
  
  return {
    isLowBalance,
    currentBalance: currentBalance ?? 0,
    threshold,
    shouldShowAlert: isLowBalance && !hasShownToday,
    markAsShown,
  };
}
