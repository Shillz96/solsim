# Environment Setup Guide

This guide explains how to properly set up environment variables for local development and production deployments.

## Overview

Environment variables are used to configure the application without hardcoding sensitive values. Different environments (local, staging, production) use different values.

## File Structure

```
backend/
├── .env                 # Local development (not committed)
├── .env.example        # Template (committed to git)
└── .env.temp           # Temporary backup (delete if exists)

frontend/
├── .env.local          # Local development (not committed)
├── .env.example        # Template (committed to git)
└── .env.local.example  # Alternative template (can be deleted)
```

**Important:** Only `.env.example` files should be committed to git. Actual `.env` files contain secrets and MUST NOT be committed.

---

## Backend Environment Variables

### Local Development Setup

1. Copy the example file:
   ```bash
   cd backend
   cp .env.example .env
   ```

2. Edit `.env` with your local values:

```env
# Database Configuration
# For local development, use your local PostgreSQL
DATABASE_URL=postgresql://username:password@localhost:5432/virtualsol_dev

# Redis Configuration
# For local development, use local Redis
REDIS_URL=redis://localhost:6379

# Solana Configuration
# Get your Helius API key from helius.dev
SOLANA_RPC=https://mainnet.helius-rpc.com/?api-key=YOUR_HELIUS_API_KEY
HELIUS_WS=wss://mainnet.helius-rpc.com/?api-key=YOUR_HELIUS_API_KEY
HELIUS_API=YOUR_HELIUS_API_KEY

# External APIs
DEXSCREENER_BASE=https://api.dexscreener.com
JUPITER_BASE=https://lite-api.jup.ag
BIRDEYE_API_KEY=your-birdeye-api-key-if-you-have-one

# Token Configuration
# Your VSOL token mint address
VSOL_TOKEN_MINT=YourVsolMintAddress

# Security
# Generate a secure random string for JWT_SECRET
JWT_SECRET=your-super-secure-jwt-secret-min-32-chars
JWT_EXPIRY=24h
REFRESH_TOKEN_EXPIRY=7d

# Rewards System
# Base58 encoded secret key for rewards wallet
REWARDS_WALLET_SECRET=base58-encoded-secret-key

# Development Environment
NODE_ENV=development
PORT=4000

# Sentry (optional for local dev)
# SENTRY_DSN=your_sentry_dsn_here
# ENABLE_SENTRY_TEST=false
```

### Railway Production Setup

**Don't use `railway up` with secrets in .env file!**

Instead, set environment variables via Railway dashboard or CLI:

```bash
# Using Railway CLI
railway variables set DATABASE_URL="postgresql://..."
railway variables set REDIS_URL="redis://..."
railway variables set JWT_SECRET="your-production-secret"
# ... etc for all variables

# Or use Railway dashboard:
# https://railway.app > Your Project > Variables
```

**Required Railway Variables:**
- `DATABASE_URL` - Railway PostgreSQL connection string
- `REDIS_URL` - Railway Redis connection string
- `SOLANA_RPC` - Helius RPC URL
- `HELIUS_WS` - Helius WebSocket URL
- `HELIUS_API` - Helius API key
- `VSOL_TOKEN_MINT` - VSOL token address
- `JWT_SECRET` - Secure random string (32+ chars)
- `REWARDS_WALLET_SECRET` - Rewards wallet private key
- `NODE_ENV` - Set to `production`
- `PORT` - Railway sets this automatically

---

## Frontend Environment Variables

### Local Development Setup

1. Copy the example file:
   ```bash
   cd frontend
   cp .env.example .env.local
   ```

2. Edit `.env.local` with your local values:

```env
# Backend API URL (must match backend port)
NEXT_PUBLIC_API_URL=http://localhost:4000

# WebSocket URL (must match backend port)
NEXT_PUBLIC_WS_URL=ws://localhost:4000

# Environment
NEXT_PUBLIC_ENV=development

# Enable debug logging in browser console
NEXT_PUBLIC_DEBUG=true

# Refresh intervals (in milliseconds)
NEXT_PUBLIC_PORTFOLIO_REFRESH_INTERVAL=30000
NEXT_PUBLIC_LEADERBOARD_REFRESH_INTERVAL=60000
NEXT_PUBLIC_MARKET_REFRESH_INTERVAL=15000
```

### Vercel Production Setup

**Set via Vercel dashboard:**

1. Go to Vercel Dashboard > Your Project > Settings > Environment Variables
2. Add the following variables:

**Production Variables:**
```
NEXT_PUBLIC_API_URL=https://your-railway-backend.railway.app
NEXT_PUBLIC_WS_URL=wss://your-railway-backend.railway.app
NEXT_PUBLIC_ENV=production
NEXT_PUBLIC_DEBUG=false
NEXT_PUBLIC_PORTFOLIO_REFRESH_INTERVAL=30000
NEXT_PUBLIC_LEADERBOARD_REFRESH_INTERVAL=60000
NEXT_PUBLIC_MARKET_REFRESH_INTERVAL=15000
```

**Preview Variables** (optional, for staging):
```
NEXT_PUBLIC_API_URL=https://your-staging-backend.railway.app
NEXT_PUBLIC_WS_URL=wss://your-staging-backend.railway.app
NEXT_PUBLIC_ENV=staging
NEXT_PUBLIC_DEBUG=true
# ... same intervals
```

---

## Environment Variable Naming

### Backend
- Regular variables (server-side only): `VARIABLE_NAME`
- Example: `DATABASE_URL`, `JWT_SECRET`

### Frontend (Next.js)
- Public variables (exposed to browser): `NEXT_PUBLIC_*`
- Server-only variables: regular naming
- **Important:** Only `NEXT_PUBLIC_*` variables are available in browser

---

## Security Best Practices

### DO:
- ✅ Keep actual `.env` files out of git (they're in `.gitignore`)
- ✅ Use `.env.example` as templates
- ✅ Use strong, random secrets (32+ characters)
- ✅ Use different secrets for development and production
- ✅ Set production secrets via platform dashboards (Railway, Vercel)
- ✅ Rotate secrets periodically
- ✅ Use environment-specific values

### DON'T:
- ❌ Commit `.env` files to git
- ❌ Share secrets in chat, email, or docs
- ❌ Use weak or predictable secrets
- ❌ Use same secrets for dev and production
- ❌ Hardcode secrets in source code
- ❌ Log secrets to console or files

---

## Generating Secure Secrets

### JWT Secret (32+ characters)
```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using OpenSSL
openssl rand -hex 32
```

### Solana Wallet Secret
```bash
# Generate using Solana CLI
solana-keygen new --outfile rewards-wallet.json

# Get base58 encoded secret
# Use a tool or script to convert the JSON array to base58
```

---

## Verifying Configuration

### Backend
```bash
cd backend

# Check if all required variables are set
npm run dev

# You should see:
# "✓ Environment variables loaded"
# "✓ Database connected"
# "✓ Redis connected"
# "Server listening on http://localhost:4000"
```

### Frontend
```bash
cd frontend

# Check if all required variables are set
npm run dev

# You should see:
# "ready - started server on 0.0.0.0:3000"
# No errors about missing environment variables
```

---

## Troubleshooting

### "Environment variable not found"

**Backend:**
- Check that `.env` exists in `backend/`
- Check that variable is defined in `.env`
- Restart dev server after changing `.env`

**Frontend:**
- Check that `.env.local` exists in `frontend/`
- Check that variable starts with `NEXT_PUBLIC_` for client-side use
- Restart dev server after changing `.env.local`
- Clear `.next` cache: `rm -rf .next`

### "Cannot connect to database"
- Check `DATABASE_URL` format
- Verify PostgreSQL is running
- Check username/password/host/port/database name

### "Cannot connect to Redis"
- Check `REDIS_URL` format
- Verify Redis is running: `redis-cli ping` should return `PONG`
- Start Redis: `docker run -d -p 6379:6379 redis:alpine`

### "API requests failing" (Frontend)
- Check `NEXT_PUBLIC_API_URL` matches backend URL
- Verify backend is running
- Check browser console for CORS errors
- Verify backend CORS settings allow frontend origin

---

## Environment Files Checklist

Before committing:
- [ ] `.env` is NOT committed (only `.env.example`)
- [ ] `.env.local` is NOT committed (only `.env.example`)
- [ ] All secrets removed from committed files
- [ ] `.env.example` files are up to date
- [ ] `.gitignore` includes all `.env*` except `.env.example`

Before deploying:
- [ ] Railway variables are set correctly
- [ ] Vercel variables are set correctly
- [ ] Production secrets are different from dev
- [ ] `NEXT_PUBLIC_API_URL` points to Railway backend
- [ ] Backend `NODE_ENV=production`
- [ ] No debug logs in production

---

## Quick Reference

### Local Development URLs
```
Frontend:  http://localhost:3000
Backend:   http://localhost:4000
Backend WS: ws://localhost:4000
```

### Production URLs (update with your actual URLs)
```
Frontend:  https://oneupsol.fun
Backend:   https://virtualsol-production.up.railway.app
Backend WS: wss://virtualsol-production.up.railway.app
```

### Required Services
- PostgreSQL (database)
- Redis (caching and pub/sub)
- Helius API (Solana RPC and WebSocket)

---

Last Updated: October 2024
