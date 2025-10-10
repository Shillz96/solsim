import { useQuery } from '@tanstack/react-query'
import * as api from '@/lib/api'

/**
 * Hook to fetch token metadata by mint address
 * Uses React Query for caching and automatic refetching
 */
export function useTokenMetadata(mint: string | undefined, enabled: boolean = true) {
  return useQuery({
    queryKey: ['token-metadata', mint],
    queryFn: async () => {
      if (!mint) throw new Error('Mint address required')
      try {
        return await api.getTokenDetails(mint)
      } catch (error) {
        console.error(`Error fetching token metadata for ${mint}:`, error);
        throw error instanceof Error 
          ? error 
          : new Error(`Failed to load token details: ${String(error)}`);
      }
    },
    enabled: enabled && !!mint,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 1, // Only retry once on failure
  })
}

/**
 * Hook to fetch multiple token metadata at once
 * Useful for portfolio views with multiple positions
 */
export function useTokenMetadataBatch(mints: string[], enabled: boolean = true) {
  return useQuery({
    queryKey: ['token-metadata-batch', ...mints.sort()], // Sort for consistent caching
    queryFn: async () => {
      if (mints.length === 0) return []
      
      const results = await Promise.allSettled(
        mints.map(mint => api.getTokenDetails(mint))
      )
      
      return results.map((result, index) => ({
        mint: mints[index],
        data: result.status === 'fulfilled' ? result.value : null,
        error: result.status === 'rejected' ? result.reason : null,
      }))
    },
    enabled: enabled && mints.length > 0,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 1, // Only retry once on failure
  })
}

