# Deployment Compatibility Guide

## ✅ Vercel + Railway Real-Time Integration

This guide ensures your real-time portfolio features work correctly across all deployment environments.

## 🚀 **Backend Deployment (Railway)**

### Configuration Changes Made

1. **WebSocket Server Integration**: WebSocket now runs on the same HTTP server as the main API (Railway requirement)
2. **Single Port Design**: No separate port 4001 - everything goes through Railway's main port
3. **CORS Support**: Already configured for Vercel domains and Railway

### Railway Environment Variables Required

```bash
# Core API
PORT=4002
NODE_ENV=production
DATABASE_URL=your_postgres_url
REDIS_URL=your_redis_url

# Frontend Integration  
FRONTEND_ORIGIN=https://your-frontend.vercel.app

# Authentication
JWT_SECRET=your_secure_jwt_secret

# External APIs (if used)
BIRDEYE_API_KEY=your_api_key
SOLANA_TRACKER_API_KEY=your_api_key
```

### Deployment Command
```bash
npm run build && npm start
```

## 🌐 **Frontend Deployment (Vercel)**

### Environment Variables Required

```bash
# Production API (Railway)
NEXT_PUBLIC_API_URL=https://your-backend.up.railway.app
NEXT_PUBLIC_WS_URL=wss://your-backend.up.railway.app/price-stream
NEXT_PUBLIC_ENV=production
NEXT_PUBLIC_DEBUG=false
```

### Build Configuration
- ✅ `vercel.json` is properly configured
- ✅ Next.js image domains include all token image sources
- ✅ Framework detection: Next.js
- ✅ Output directory: `.next`

## 🔌 **WebSocket Architecture**

### Development Environment
```
Frontend: localhost:3000
Backend API: localhost:4002  
WebSocket: localhost:4001/price-stream (separate port)
```

### Production Environment  
```
Frontend: https://your-app.vercel.app
Backend API: https://your-backend.up.railway.app
WebSocket: wss://your-backend.up.railway.app/price-stream (same server)
```

## 🛠 **Real-Time Features**

### Components with Live Data
- ✅ **P&L Card**: Real-time profit/loss calculations
- ✅ **Active Positions**: Live position values and changes
- ✅ **Portfolio Chart**: Real trade history from backend
- ✅ **Connection Status**: Visual indicators for WebSocket health

### WebSocket Client Features
- ✅ **Auto-reconnection**: Exponential backoff strategy
- ✅ **Environment Detection**: Automatically uses correct URLs
- ✅ **Error Handling**: Graceful degradation when offline
- ✅ **Subscription Management**: Only subscribes to user's tokens

## 🔧 **Troubleshooting**

### WebSocket Connection Issues

1. **Check Environment Variables**
   ```bash
   # Frontend should have:
   NEXT_PUBLIC_WS_URL=wss://your-backend.up.railway.app/price-stream
   ```

2. **Verify CORS Configuration**
   - Backend accepts your Vercel domain in `FRONTEND_ORIGIN`
   - Vercel URL matches pattern in cors.ts

3. **Railway WebSocket Support**
   - ✅ Railway supports WebSockets on same port as HTTP
   - ✅ No separate port needed in production
   - ✅ WSS (secure WebSocket) required for HTTPS sites

### Development vs Production

| Environment | API URL | WebSocket URL | Port Strategy |
|-------------|---------|---------------|---------------|
| Development | `http://localhost:4002` | `ws://localhost:4001/price-stream` | Separate ports |
| Production | `https://backend.railway.app` | `wss://backend.railway.app/price-stream` | Same server |

## 🎯 **Deployment Checklist**

### Railway Backend
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Redis service running
- [ ] WebSocket endpoint `/price-stream` accessible

### Vercel Frontend  
- [ ] `NEXT_PUBLIC_WS_URL` points to Railway WebSocket
- [ ] `NEXT_PUBLIC_API_URL` points to Railway API
- [ ] Build and deployment successful
- [ ] Real-time features working in browser

### Integration Test
- [ ] Portfolio shows live P&L updates
- [ ] WebSocket connection indicator shows "Connected"
- [ ] Price changes reflect in real-time
- [ ] No console errors related to WebSocket

## 📝 **Key Architectural Changes**

1. **Single Server Design**: WebSocket attached to main HTTP server for Railway compatibility
2. **Environment-Aware URLs**: Automatic detection of development vs production
3. **Robust Error Handling**: Connection failures don't crash the app
4. **Performance Optimized**: Only subscribes to user's actual token holdings

Your real-time portfolio system is now fully compatible with Vercel frontend and Railway backend deployments! 🚀