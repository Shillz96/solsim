import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

// Image metadata - Twitter recommends 1200x630 for summary_large_image
export const alt = '1UP SOL - Mario-themed Solana Paper Trading Game. 1UP your Solana trading + earn rewards!'
export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

// Image generation - use the same banner as OG image
export default async function Image() {
  try {
    // Read the banner image from public folder
    const imageData = await readFile(
      join(process.cwd(), 'public', '1up Site banner preview.png')
    )
    
    // Convert to base64 data URL
    const base64Image = imageData.toString('base64')
    const imageSrc = `data:image/png;base64,${base64Image}`

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#FFFAE9',
          }}
        >
          <img
            src={imageSrc}
            alt="1UP SOL Banner"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </div>
      ),
      {
        ...size,
      }
    )
  } catch (error) {
    console.error('Error generating Twitter image:', error)
    
    // Fallback: render a simple text-based image
    return new ImageResponse(
      (
        <div
          style={{
            fontSize: 128,
            background: '#FFFAE9',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'system-ui',
            fontWeight: 'bold',
          }}
        >
          <div style={{ color: '#E52521' }}>1UP SOL</div>
          <div style={{ fontSize: 48, color: '#8B4513', marginTop: 20 }}>
            Mario-themed Solana Trading
          </div>
        </div>
      ),
      {
        ...size,
      }
    )
  }
}
