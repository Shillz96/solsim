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

## ⚠️ Important Environment Variable Rules

### NEXT_PUBLIC_ Prefix
- **Client-side variables** MUST use `NEXT_PUBLIC_` prefix
- These are **embedded in the browser bundle** at build time
- Never put secrets in `NEXT_PUBLIC_` variables!

```bash
# ✅ Good - Server-only (never exposed to browser)
DATABASE_URL=postgresql://...
API_SECRET_KEY=sk_live_...

# ✅ Good - Client-accessible (safe for browser)
NEXT_PUBLIC_WS_URL=wss://your-backend.railway.app
NEXT_PUBLIC_API_URL=https://your-backend.com

# ❌ BAD - Secret in public variable!
NEXT_PUBLIC_API_SECRET=sk_live_... # DON'T DO THIS!
```

### Important Limitations

Next.js has specific rules about how environment variables work:

```javascript
// ❌ These DON'T work:
const varName = 'NEXT_PUBLIC_ANALYTICS_ID'
setupAnalyticsService(process.env[varName]) // Not inlined - dynamic lookup fails!

const env = process.env
setupAnalyticsService(env.NEXT_PUBLIC_ANALYTICS_ID) // Not inlined - indirect access fails!

const { NEXT_PUBLIC_API_URL } = process.env // Destructuring doesn't work!

// ✅ Only this works:
setupAnalyticsService(process.env.NEXT_PUBLIC_ANALYTICS_ID) // Direct access required!
```

**Why?** Next.js performs static analysis at build time to find and replace `process.env.VARIABLE_NAME` references. Dynamic access patterns prevent this optimization.

### Runtime vs Build-Time Variables

- Variables **without** `NEXT_PUBLIC_` are **only available server-side**
- `NEXT_PUBLIC_` variables are **baked into the client bundle** at build time
- For truly dynamic runtime values on server components, use the `connection()` API:

```typescript
import { connection } from 'next/server'

export default async function Component() {
  await connection() // Opts into dynamic rendering
  const runtimeValue = process.env.DYNAMIC_CONFIG
  // This is evaluated at runtime, not build time
}
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

## Troubleshooting WebSocket Connection

### "Immediate failure detected" Error

If you see this error in browser console:
🚨 Immediate failure detected (XXXms < 3000ms)

This means the WebSocket URL is incorrect or unreachable.

**Check:**
1. Verify `NEXT_PUBLIC_WS_URL` is set in Vercel environment variables
2. Verify the URL format is correct: `wss://your-backend.railway.app` (no path)
3. Verify the backend is actually running and accessible
4. Test the backend health: `https://your-backend.railway.app/api/health`

### WebSocket Connection Debugging

1. **Check Browser Console**
   - Look for WebSocket connection logs
   - Verify the exact URL being used
   - Check for CORS or security errors

2. **Network Tab Analysis**
   - Look for WebSocket upgrade request
   - Check response status (should be 101)
   - Verify headers are correct

3. **Environment Variable Verification**
   - Confirm `NEXT_PUBLIC_WS_URL` is set correctly
   - Check if build includes the latest env values
   - Trigger fresh deployment if env vars were recently updated

For detailed debugging steps, see `WEBSOCKET_DEBUG_GUIDE.md` in the project root.