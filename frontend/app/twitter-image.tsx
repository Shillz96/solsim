import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = '1UP SOL - Mario-themed Solana Paper Trading Game'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#FFFAE9',
          backgroundImage: 'radial-gradient(circle at 25% 25%, #FFE135 0%, transparent 50%), radial-gradient(circle at 75% 75%, #FF6B35 0%, transparent 50%)',
          position: 'relative',
        }}
      >
        {/* Mario Question Block */}
        <div
          style={{
            position: 'absolute',
            top: '30px',
            left: '50px',
            width: '80px',
            height: '80px',
            backgroundColor: '#FFA500',
            border: '4px solid #8B4513',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '60px',
          }}
        >
          ?
        </div>

        {/* Main Logo Text */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
          }}
        >
          <div
            style={{
              fontSize: '120px',
              fontWeight: 'bold',
              color: '#FF6B35',
              textShadow: '4px 4px 0px #000, -4px -4px 0px #000, 4px -4px 0px #000, -4px 4px 0px #000',
              letterSpacing: '8px',
            }}
          >
            1UP SOL
          </div>
          
          <div
            style={{
              fontSize: '48px',
              fontWeight: 'bold',
              color: '#8B4513',
              textAlign: 'center',
              maxWidth: '800px',
            }}
          >
            🏆 EARN REWARDS! 🏆
          </div>
          
          <div
            style={{
              fontSize: '32px',
              color: '#2D5016',
              textAlign: 'center',
              maxWidth: '900px',
              lineHeight: 1.3,
            }}
          >
            Mario-themed Solana paper trading • Real-time prices • Practice trading without risk!
          </div>
        </div>

        {/* Mario Coin */}
        <div
          style={{
            position: 'absolute',
            bottom: '30px',
            right: '50px',
            width: '100px',
            height: '100px',
            backgroundColor: '#FFD700',
            borderRadius: '50%',
            border: '6px solid #FFA500',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '50px',
            fontWeight: 'bold',
            color: '#8B4513',
          }}
        >
          $
        </div>

        {/* Twitter-specific branding */}
        <div
          style={{
            position: 'absolute',
            bottom: '30px',
            left: '50px',
            fontSize: '24px',
            color: '#8B4513',
            fontWeight: 'bold',
          }}
        >
          oneupsol.fun
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}