# WebSocket Reconnection Loop - Complete Diagnosis & Fixes

## Problem
WebSocket connections establishing and immediately disconnecting in a rapid loop.

## Root Causes Identified

### 1. ✅ FIXED: React useEffect Dependency Loop
**Issue:** Multiple useEffect hooks with function dependencies causing constant re-renders

**Fix Applied:**
```tsx
// Before (WRONG):
useEffect(() => {
  // ... connection logic
}, [options.enabled, connect, cleanup]) // ❌ Re-runs when functions change

useEffect(() => {
  return () => cleanup()  // ❌ Duplicate cleanup
}, [cleanup])

// After (CORRECT):
useEffect(() => {
  // ... connection logic
}, [options.enabled]) // ✅ Only re-runs when enabled changes
// Removed duplicate cleanup effect
```

### 2. ⚠️ NEEDS VERIFICATION: Environment Variable Path
**Current Configuration:**
```bash
NEXT_PUBLIC_WS_URL=wss://solsim-production.up.railway.app
```

**Issue:** Missing `/ws/prices` path (backend WebSocket endpoint)

**Temporary Fix:** Code now intelligently appends path if missing
**Permanent Fix:** Update `.env.local`:
```bash
NEXT_PUBLIC_WS_URL=wss://solsim-production.up.railway.app/ws/prices
```

### 3. ⚠️ NEEDS INVESTIGATION: CORS/Origin Blocking
**Backend CORS Config:**
```typescript
// Allowed origins
- http://localhost:3000
- https://oneupsol.fun
- https://www.oneupsol.fun  
- https://virtualsol.fun
- https://www.virtualsol.fun
- https://virtualsol-production.vercel.app
- *.vercel.app domains
```

**Action Required:** 
1. Check your actual frontend deployment URL
2. Verify it's in the allowedOrigins list or matches a pattern
3. Check Railway logs for CORS rejection messages: `🚫 CORS rejected origin:`

### 4. ⚠️ NEEDS INVESTIGATION: Backend Health/Restart Cycles
**Potential Issues:**
- Railway restarting backend due to health check failures
- Prisma connection pool exhaustion
- Memory leaks causing crashes
- WebSocket connections not being cleaned up

**Action Required:**
1. Check Railway logs for backend restart patterns:
   ```
   🛑 Received SIGTERM
   🚀 VirtualSol API running on :4000
   ```
2. Monitor Prisma connection count
3. Check memory usage trends

### 5. ⚠️ CONNECTION GUARD: Added Extra Protection
**Fix Applied:**
```typescript
// Added check for existing WebSocket before creating new one
if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
  console.log('🚫 Connection prevented: WebSocket already exists')
  return
}
```

## Debugging Checklist

### Frontend Logs to Monitor:
```
✅ Good patterns:
- 🔌 Connecting to WebSocket (attempt 1)
- ✅ WebSocket connected
- 💓 Heartbeat sent
- [Stays connected]

❌ Bad patterns:
- 🔌 Connecting → ❌ WebSocket closed → 🔌 Connecting [rapid loop]
- 🚫 Connection attempt rate limited [repeated]
- ⏰ WebSocket connection timeout
- 🚨 Immediate failure detected
```

### Backend Logs to Monitor:
```bash
# SSH into Railway backend
railway ssh

# Monitor WebSocket connections
tail -f /path/to/logs | grep "WebSocket"

# Look for:
- 🔌 Client connected to price WebSocket
- 🔌 Client disconnected [with duration]
- ❌ WebSocket error
- 🚫 CORS rejected origin
```

### Browser DevTools Checks:
1. **Network Tab** → Filter WS
   - Check WebSocket connection status
   - Look at close codes (1000, 1006, etc.)
   - Check headers (Origin, Sec-WebSocket-*)

2. **Console** 
   - Look for CORS errors
   - Check WebSocket connection logs
   - Monitor for memory leaks

## Quick Fixes to Try

### 1. Update Environment Variable (Recommended)
```bash
# In frontend/.env.local
NEXT_PUBLIC_WS_URL=wss://solsim-production.up.railway.app/ws/prices
```

### 2. Add Frontend URL to Backend CORS
```typescript
// In backend/src/index.ts
const allowedOrigins = [
  // ... existing origins
  "https://your-frontend-domain.com", // Add your actual frontend URL
];
```

### 3. Increase Connection Timeout (If needed)
```typescript
// In frontend/lib/price-stream-provider.tsx
const CONNECTION_TIMEOUT = 30000 // Increase from 15s to 30s
```

### 4. Disable React Strict Mode (For testing only)
```javascript
// In frontend/next.config.mjs
reactStrictMode: false, // Already disabled
```

## Expected Behavior After Fixes

### Successful Connection Flow:
```
1. 🚀 Price stream enabled, initiating connection
2. 🔌 Connecting to WebSocket (attempt 1)
3. 🔍 WebSocket created, readyState: 0 (CONNECTING)
4. ✅ WebSocket connected
5. 💓 Heartbeat sent (every 25s)
6. [Connection stays stable]
```

### Healthy Connection Metrics:
- **Connection duration:** Minutes to hours (not seconds)
- **Reconnection attempts:** 0 after initial connection
- **Close codes:** Only 1000 (normal) or 1001 (going away) on intentional disconnect
- **Heartbeats:** Regular 25s intervals without interruption

## Advanced Debugging

### Enable Verbose WebSocket Logging:
```typescript
// Temporarily add to frontend/lib/price-stream-provider.tsx
ws.addEventListener('open', () => console.log('WS OPEN EVENT'))
ws.addEventListener('close', (e) => console.log('WS CLOSE EVENT:', e.code, e.reason, e.wasClean))
ws.addEventListener('error', (e) => console.log('WS ERROR EVENT:', e))
ws.addEventListener('message', (e) => console.log('WS MESSAGE:', e.data))
```

### Test WebSocket Connection Directly:
```javascript
// In browser console
const ws = new WebSocket('wss://solsim-production.up.railway.app/ws/prices');
ws.onopen = () => console.log('DIRECT CONNECTION SUCCESS');
ws.onclose = (e) => console.log('CLOSE:', e.code, e.reason);
ws.onerror = (e) => console.log('ERROR:', e);
```

## Files Modified

1. `frontend/lib/price-stream-provider.tsx` - Fixed useEffect loop, added connection guards
2. `frontend/lib/env.ts` - Updated documentation for WebSocket URL format

## Next Steps

1. **Deploy changes** to frontend
2. **Monitor logs** for 5-10 minutes to verify stable connections
3. **If still looping:**
   - Check Railway backend logs for crashes/restarts
   - Verify CORS configuration matches frontend URL
   - Check for Prisma connection issues
   - Monitor backend resource usage (CPU/Memory)

## Contact

If reconnection loop persists after these fixes:
1. Share Railway backend logs (last 100 lines)
2. Share browser console logs (WebSocket messages)
3. Share Network tab WebSocket headers
4. Confirm frontend deployment URL
