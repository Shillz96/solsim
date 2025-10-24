import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

/**
 * Upload metadata to Pump.fun IPFS endpoint
 * 
 * This endpoint receives token metadata and image, then uploads it to Pump.fun's IPFS
 * service to get a metadata URI for token creation.
 */

const UploadMetadataSchema = z.object({
  name: z.string().min(1).max(32),
  symbol: z.string().min(1).max(10).regex(/^[A-Z0-9]+$/, 'Symbol must contain only uppercase letters and numbers'),
  description: z.string().min(1).max(500),
  image: z.string(), // base64 encoded image
  twitter: z.string().url().optional().or(z.literal('')),
  telegram: z.string().url().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  showName: z.boolean()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request body
    const validation = UploadMetadataSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validation.error.errors 
        },
        { status: 400 }
      )
    }
    
    const { name, symbol, description, image, twitter, telegram, website, showName } = validation.data
    
    // Convert base64 image to buffer
    let imageBuffer: Buffer
    try {
      imageBuffer = Buffer.from(image, 'base64')
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid image data' },
        { status: 400 }
      )
    }
    
    // Create FormData for Pump.fun API
    const formData = new FormData()
    formData.append('name', name)
    formData.append('symbol', symbol)
    formData.append('description', description)
    formData.append('file', new Blob([imageBuffer.buffer]), 'token-image.png')
    
    // Add optional social links (only if provided and not empty)
    if (twitter) formData.append('twitter', twitter)
    if (telegram) formData.append('telegram', telegram)
    if (website) formData.append('website', website)
    formData.append('showName', showName.toString())
    
    // Upload to Pump.fun IPFS endpoint
    const response = await fetch('https://pump.fun/api/ipfs', {
      method: 'POST',
      body: formData
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Pump.fun IPFS upload failed:', response.status, errorText)
      
      return NextResponse.json(
        { 
          error: 'Failed to upload metadata to IPFS',
          details: `Pump.fun API returned ${response.status}: ${errorText}`
        },
        { status: 500 }
      )
    }
    
    const result = await response.json()
    
    if (!result.metadataUri) {
      return NextResponse.json(
        { error: 'No metadata URI returned from Pump.fun' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      metadataUri: result.metadataUri
    })
    
  } catch (error) {
    console.error('Metadata upload error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
