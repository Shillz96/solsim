/**
 * TypeScript interfaces for token launch functionality
 */

export interface LaunchTokenFormData {
  name: string
  symbol: string
  description: string
  image: File
  twitter?: string
  telegram?: string
  website?: string
  showName: boolean
}

export interface UploadMetadataRequest {
  name: string
  symbol: string
  description: string
  image: string // base64 encoded
  twitter?: string
  telegram?: string
  website?: string
  showName: boolean
}

export interface UploadMetadataResponse {
  metadataUri: string
}

export interface CreateTokenRequest {
  name: string
  symbol: string
  metadataUri: string
  mint: string // keypair string
  amount: number
  slippage: number
  priorityFee: number
}

export interface CreateTokenResponse {
  transaction: string // base64 encoded transaction
  mint: string
}

export interface LaunchTokenResult {
  signature: string
  mint: string
  metadataUri: string
}

export interface ImageValidationResult {
  valid: boolean
  error?: string
}

export interface WalletBalance {
  sol: number
  sufficient: boolean
  required: number // ~0.02 SOL
}
