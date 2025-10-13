# WebSocket URL Configuration Guide

## 🎯 Single Source of Truth

All WebSocket connections MUST use `env.NEXT_PUBLIC_WS_URL` - no hardcoded URLs or fallbacks.

## ✅ Correct Configuration

### Vercel Environment Variables
```bash
NEXT_PUBLIC_WS_URL=wss://ws.solsim.fun/prices
NEXT_PUBLIC_API_URL=https://api.solsim.fun
NEXT_PUBLIC_CHAIN=mainnet
```

### Local Development (.env.local)
```bash
NEXT_PUBLIC_WS_URL=ws://localhost:3001/prices
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_CHAIN=devnet
```

## ❌ Avoid These Patterns

### Don't Route Through Vercel Edge
```bash
# BAD - goes through Vercel proxy, causes timeouts
NEXT_PUBLIC_WS_URL=wss://solsim.vercel.app/api/ws

# GOOD - direct connection to your WebSocket server
NEXT_PUBLIC_WS_URL=wss://ws.solsim.fun/prices
```

### Don't Use Insecure Connections in Production
```bash
# BAD - insecure in production
NEXT_PUBLIC_WS_URL=ws://ws.solsim.fun/prices

# GOOD - always use wss:// in production
NEXT_PUBLIC_WS_URL=wss://ws.solsim.fun/prices
```

### Don't Hardcode URLs in Components
```typescript
// BAD - hardcoded URL
const ws = new WebSocket("wss://solsim-production.up.railway.app/ws/prices");

// GOOD - use environment validation
import { env } from "@/lib/env";
const ws = new WebSocket(env.NEXT_PUBLIC_WS_URL);
```

## 🔧 Implementation

### Use in Components
```typescript
import { env } from "@/lib/env";
import { connectPrices } from "@/lib/ws";

// Environment is validated at startup
const cleanup = connectPrices(onPriceTick, env.NEXT_PUBLIC_WS_URL);
```

### Use in Services
```typescript
import { env } from "@/lib/env";

export function createWebSocketConnection() {
  // URL is guaranteed to be validated
  return new WebSocket(env.NEXT_PUBLIC_WS_URL);
}
```

## 🚨 Error Handling

If environment validation fails, the app will crash at startup with a clear error:

```
❌ Environment validation failed - wrong URLs/keys will fail fast:
  - NEXT_PUBLIC_WS_URL: WebSocket URL must use wss:// for security
  - NEXT_PUBLIC_WS_URL: Avoid routing WebSocket through Vercel edge proxy
```

## 🌐 Deployment Checklist

1. **Set environment variables in Vercel dashboard**
2. **Use direct WebSocket domain** (e.g., `ws.solsim.fun`)
3. **Always use `wss://` in production**
4. **Test connection before deploying**
5. **Monitor WebSocket health in production**

## 🔍 Debugging

### Check Environment Loading
```typescript
console.log('WebSocket URL:', env.NEXT_PUBLIC_WS_URL);
console.log('Chain:', env.NEXT_PUBLIC_CHAIN);
```

### Verify Connection
```typescript
import { connectPrices } from "@/lib/ws";

const cleanup = connectPrices((tick) => {
  console.log('✅ Price tick received:', tick);
}, env.NEXT_PUBLIC_WS_URL);
```

### Monitor Network Tab
- Look for WebSocket connection in browser dev tools
- Verify URL matches your environment variable
- Check for proper ping/pong heartbeat frames

## 📊 Performance Benefits

- **No proxy overhead** - direct connection to WebSocket server
- **Better Railway compatibility** - proper heartbeat prevents timeouts
- **Consistent URLs** - single source of truth prevents mismatches
- **Fast failure** - wrong configuration fails immediately at startup