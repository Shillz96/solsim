# Environment Variables for Launch Token Feature

## Required Environment Variables

### Frontend (.env.local)

```bash
# Solana RPC URL (for wallet balance checks)
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# WebSocket URL (for real-time price updates)
NEXT_PUBLIC_WS_URL=wss://your-backend-domain.com/prices

# API URL (for backend communication)
NEXT_PUBLIC_API_URL=https://your-backend-domain.com
```

### Backend (.env)

```bash
# PumpPortal API Key (required for token creation)
PUMPPORTAL_API_KEY=your-pumpportal-api-key-here
```

## Getting PumpPortal API Key

1. Visit [PumpPortal.fun](https://pumpportal.fun/)
2. Sign up for an account
3. Navigate to the API section
4. Generate an API key
5. Add the key to your backend environment variables

## Security Notes

- **Never expose PUMPPORTAL_API_KEY in frontend code**
- The API key is only used in Next.js API routes (server-side)
- All PumpPortal API calls are proxied through our backend to keep the key secure
- Frontend makes calls to `/api/launch/*` endpoints which then call PumpPortal

## Testing

For testing purposes, you can use PumpPortal's test environment if available, or use a small amount of SOL on mainnet for testing token creation.

## Deployment

When deploying to Vercel:

1. Add `PUMPPORTAL_API_KEY` to your Vercel environment variables
2. Ensure all frontend environment variables are prefixed with `NEXT_PUBLIC_`
3. The API routes will automatically have access to the backend environment variables
