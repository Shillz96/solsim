import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

/**
 * Create token via PumpPortal Local Transaction API
 * 
 * This endpoint receives token creation parameters and calls PumpPortal's
 * Local Transaction API to build a transaction for token creation.
 * No API key required - user signs with their own wallet.
 */

const CreateTokenSchema = z.object({
  name: z.string().min(1).max(32),
  symbol: z.string().min(1).max(10),
  metadataUri: z.string().url(),
  mint: z.string(), // keypair string
  amount: z.number().positive(),
  slippage: z.number().min(0).max(100),
  priorityFee: z.number().min(0)
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request body
    const validation = CreateTokenSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validation.error.errors 
        },
        { status: 400 }
      )
    }
    
    const { name, symbol, metadataUri, mint, amount, slippage, priorityFee } = validation.data
    
    // Prepare request body for PumpPortal Local Transaction API
    const pumpPortalBody = {
      action: 'create',
      tokenMetadata: {
        name,
        symbol,
        uri: metadataUri
      },
      mint,
      denominatedInSol: 'true',
      amount,
      slippage,
      priorityFee,
      pool: 'pump'
    }
    
    // Call PumpPortal Local Transaction API (no API key needed)
    const response = await fetch('https://pumpportal.fun/api/trade', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(pumpPortalBody)
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('PumpPortal API call failed:', response.status, errorText)
      
      return NextResponse.json(
        { 
          error: 'Failed to create token transaction',
          details: `PumpPortal API returned ${response.status}: ${errorText}`
        },
        { status: 500 }
      )
    }
    
    const result = await response.json()
    
    // Local Transaction API returns the transaction to be signed
    // The user will sign it with their wallet
    if (!result.transaction) {
      return NextResponse.json(
        { error: 'No transaction returned from PumpPortal' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      transaction: result.transaction,
      mint: mint // Return the mint address that was used
    })
    
  } catch (error) {
    console.error('Token creation error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
