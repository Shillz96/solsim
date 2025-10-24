import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

/**
 * Create token via PumpPortal API
 * 
 * This endpoint receives token creation parameters and calls PumpPortal API
 * to create a new token on the Pump.fun bonding curve.
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
    
    // Get PumpPortal API key from environment
    const apiKey = process.env.PUMPPORTAL_API_KEY
    if (!apiKey) {
      console.error('PUMPPORTAL_API_KEY not found in environment variables')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }
    
    // Prepare request body for PumpPortal API
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
    
    // Call PumpPortal API
    const response = await fetch(`https://pumpportal.fun/api/trade?api-key=${apiKey}`, {
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
          error: 'Failed to create token',
          details: `PumpPortal API returned ${response.status}: ${errorText}`
        },
        { status: 500 }
      )
    }
    
    const result = await response.json()
    
    if (!result.signature) {
      return NextResponse.json(
        { error: 'No transaction signature returned from PumpPortal' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      signature: result.signature,
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
