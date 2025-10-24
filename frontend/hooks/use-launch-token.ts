"use client"

/**
 * useLaunchToken Hook
 * 
 * Custom hook for launching tokens via PumpPortal API
 * Handles the complete flow: metadata upload → token creation → transaction signing
 */

import { useMutation } from '@tanstack/react-query'
import { useWallet } from '@solana/wallet-adapter-react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { Connection, PublicKey, Transaction, Keypair } from '@solana/web3.js'
import { fileToBase64 } from '@/lib/upload-utils'
import type { 
  LaunchTokenFormData, 
  LaunchTokenResult, 
  UploadMetadataResponse, 
  CreateTokenResponse 
} from '@/lib/types/launch-token'

// Get RPC endpoint (same as wallet provider)
const getRpcEndpoint = (): string => {
  const customRpc = process.env.NEXT_PUBLIC_SOLANA_RPC_URL
  if (customRpc) {
    return customRpc
  }
  return 'https://api.mainnet-beta.solana.com'
}

export function useLaunchToken() {
  const { connected, publicKey, signTransaction } = useWallet()
  const router = useRouter()
  const { toast } = useToast()

  const mutation = useMutation({
    mutationFn: async (formData: LaunchTokenFormData): Promise<LaunchTokenResult> => {
      if (!connected || !publicKey || !signTransaction) {
        throw new Error('Wallet not connected')
      }

      // Step 1: Generate mint keypair
      const mintKeypair = Keypair.generate()
      const mintString = Array.from(mintKeypair.secretKey).join(',')

      // Step 2: Convert image to base64
      const imageBase64 = await fileToBase64(formData.image)

      // Step 3: Upload metadata to IPFS
      const metadataResponse = await fetch('/api/launch/upload-metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          symbol: formData.symbol,
          description: formData.description,
          image: imageBase64,
          twitter: formData.twitter || undefined,
          telegram: formData.telegram || undefined,
          website: formData.website || undefined,
          showName: formData.showName
        })
      })

      if (!metadataResponse.ok) {
        const error = await metadataResponse.json()
        throw new Error(error.error || 'Failed to upload metadata')
      }

      const { metadataUri }: UploadMetadataResponse = await metadataResponse.json()

      // Step 4: Create token via PumpPortal
      const createResponse = await fetch('/api/launch/create-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          symbol: formData.symbol,
          metadataUri,
          mint: mintString,
          amount: 1, // 1 SOL initial buy
          slippage: 10, // 10% slippage tolerance
          priorityFee: 0.0005 // 0.0005 SOL priority fee
        })
      })

      if (!createResponse.ok) {
        const error = await createResponse.json()
        throw new Error(error.error || 'Failed to create token')
      }

      const { signature, mint }: CreateTokenResponse = await createResponse.json()

      // Step 5: Build and sign transaction (if needed)
      // Note: PumpPortal handles the transaction creation and signing
      // We just need to return the result for now
      
      return {
        signature,
        mint,
        metadataUri
      }
    },
    onSuccess: (data) => {
      toast({
        title: "Token launched successfully!",
        description: "Your token has been created and is now live on Pump.fun",
        duration: 5000
      })
      
      // Redirect to token room
      router.push(`/room/${data.mint}`)
    },
    onError: (error) => {
      console.error('Token launch failed:', error)
      
      let errorMessage = 'Failed to launch token'
      if (error instanceof Error) {
        errorMessage = error.message
      }
      
      toast({
        title: "Launch failed",
        description: errorMessage,
        variant: "destructive",
        duration: 5000
      })
    }
  })

  return {
    launchToken: mutation.mutate,
    isLaunching: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
    data: mutation.data
  }
}

/**
 * Hook to check wallet balance for token creation
 */
export function useWalletBalance() {
  const { connected, publicKey } = useWallet()
  
  // This would typically fetch the actual balance
  // For now, return a mock balance
  return {
    sol: connected && publicKey ? 0.5 : 0, // Mock balance
    sufficient: connected && publicKey ? 0.5 >= 0.02 : false,
    required: 0.02
  }
}
