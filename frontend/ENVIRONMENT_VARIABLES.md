# Environment Variables for Launch Token Feature

## Required Environment Variables

### Frontend (.env.local)

```bash
# Solana RPC URL (for wallet balance checks and transaction submission)
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# WebSocket URL (for real-time price updates)
NEXT_PUBLIC_WS_URL=wss://your-backend-domain.com/prices

# API URL (for backend communication)
NEXT_PUBLIC_API_URL=https://your-backend-domain.com
```

## No API Key Required! 🎉

The launch token feature uses **PumpPortal's Local Transaction API** which doesn't require an API key. Users sign transactions with their own Solana wallets, making it completely non-custodial.

## How It Works

1. **Metadata Upload**: Uses Pump.fun's public IPFS endpoint (no API key needed)
2. **Token Creation**: Uses PumpPortal's Local Transaction API (no API key needed)
3. **Transaction Signing**: User signs with their own wallet (Phantom, Solflare, etc.)
4. **Transaction Submission**: Sent directly to Solana network

## Security Benefits

- **No API keys required** - eliminates key management complexity
- **Non-custodial** - users maintain full control of their wallets
- **Direct integration** - no third-party API dependencies
- **User-controlled** - all transactions signed by user's wallet

## Testing

You can test the complete flow with:
- Any Solana wallet (Phantom, Solflare, etc.)
- Small amount of SOL for transaction fees (~0.02 SOL)
- Real mainnet testing (no test environment needed)

## Deployment

When deploying to Vercel:

1. Ensure all frontend environment variables are prefixed with `NEXT_PUBLIC_`
2. No backend environment variables needed for token creation
3. The API routes work without any additional configuration
