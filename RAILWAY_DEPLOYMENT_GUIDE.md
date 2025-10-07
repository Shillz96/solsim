# SolSim Railway Deployment Guide

## 🚀 Production Setup - Railway + Vercel

This document provides the complete, tested process for deploying SolSim to production.

### **Architecture Overview**
- **Backend**: Railway (Node.js + Express + PostgreSQL + Redis)
- **Frontend**: Vercel (Next.js)
- **Database**: Railway PostgreSQL Plugin
- **Cache**: Railway Redis Plugin
- **Real-time**: WebSocket on same HTTP server (Railway compatible)

---

## **Backend Deployment (Railway)**

### **1. Initial Railway Setup**

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Clone and setup project
git clone https://github.com/Shillz96/solsim.git
cd solsim/backend

# Link to Railway project
railway link [project-id]
```

### **2. Add Required Services**

In Railway Dashboard:
1. **Create PostgreSQL Database**:
   - Go to project dashboard
   - Click "New Service" → "Database" → "Add PostgreSQL"
   - Note the service name (e.g., `Postgres-Ultk`)

2. **Create Redis Cache**:
   - Click "New Service" → "Database" → "Add Redis"
   - Automatically provides `REDIS_URL`

### **3. Environment Variables Setup**

**Required Production Variables** (set in Railway dashboard):

```bash
# Core Configuration
NODE_ENV=production
PORT=4002
PRICE_STREAM_PORT=4001

# Database (automatically set by PostgreSQL plugin)
DATABASE_URL=${{Postgres-Ultk.DATABASE_URL}}

# Cache (automatically set by Redis plugin)  
REDIS_URL=${{Redis.REDIS_URL}}

# Security - CRITICAL: Use secure values
JWT_SECRET=your-production-jwt-secret-min-32-characters-secure
JWT_EXPIRES_IN=24h

# Frontend Origin (update with your domain)
FRONTEND_ORIGIN=https://solsim.fun,https://*.vercel.app,https://solsim.vercel.app

# Authentication
DEV_AUTH_BYPASS=false

# API Keys
BIRDEYE_API_KEY=673c073ddd2d4da19ee1748e24796e20
COINGECKO_API_KEY=CG-9Y1EpBG7HSPUtR7tGPMyP7cq
HELIUS_API_KEY=8dc08491-9c29-440a-8616-bd3143a2af87
SOLANA_TRACKER_API_KEY=2eb1ecf9-5430-4a4c-b7cc-297e5f52427f

# Solana Configuration
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=8dc08491-9c29-440a-8616-bd3143a2af87
DEXSCREENER_BASE_URL=https://api.dexscreener.com/latest

# Optional Features
ENABLE_WEBSOCKET_LOGGING=true
```

### **4. Database Migration & Seeding**

After services are connected:

```bash
# Deploy database schema
railway run npx prisma migrate deploy

# Seed with sample data
railway run npx prisma db seed
```

### **5. Deploy Backend**

```bash
# Deploy to Railway
railway up
```

**Expected Success Output**:
```
✅ JWT_SECRET configured correctly for production
🚀 SolSim Backend Server Started
Environment: production
REST API: http://localhost:4002
Database connection successful (66ms)
```

---

## **Frontend Deployment (Vercel)**

### **1. Vercel Setup**

```bash
cd ../frontend

# Install Vercel CLI
npm install -g vercel

# Deploy to Vercel
vercel

# Set production domain
vercel --prod
```

### **2. Frontend Environment Variables**

Set in Vercel dashboard:

```bash
# Backend API (update with your Railway domain)
NEXT_PUBLIC_API_URL=https://lovely-nature-production.up.railway.app

# WebSocket URL (same as API URL)
NEXT_PUBLIC_WS_URL=https://lovely-nature-production.up.railway.app

# Optional
NEXT_PUBLIC_ENVIRONMENT=production
```

---

## **Critical Railway Configuration Files**

### **railway.toml** (Project Root)
```toml
[build]
builder = "NIXPACKS"
buildCommand = "cd backend && npm install && npm run build"

[deploy]
startCommand = "cd backend && npm run start:prod"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10

[[deploy.healthcheck]]
path = "/health"
port = 4002
```

### **nixpacks.toml** (Backend Directory)
```toml
[phases.install]
cmds = ["npm ci"]

[phases.build]
cmds = ["npm run build"]

[start]
cmd = "npm run start:prod"
```

---

## **Database Connection Troubleshooting**

### **Common Issues & Solutions**

**1. "Can't reach database server" Error**
```bash
# Solution: Check DATABASE_URL is correctly set
railway variables

# If DATABASE_URL is wrong, update it:
railway variables --set "DATABASE_URL=${{Postgres-Ultk.DATABASE_URL}}"
```

**2. Database Service Crashed**
```bash
# Check service status in Railway dashboard
# Restart PostgreSQL service if needed
# Or create new PostgreSQL service:
# Dashboard → New Service → Database → PostgreSQL
```

**3. Migrations Not Applied**
```bash
# Run migrations separately (Railway best practice)
railway run npx prisma migrate deploy
```

**4. Environment Variable Template Errors**
- Use exact service names in templates: `${{Postgres-Ultk.DATABASE_URL}}`
- Don't use quotes around template variables in Railway dashboard
- Service names are case-sensitive

### **Working Database URL Format**
```
postgresql://postgres:password@caboose.proxy.rlwy.net:port/railway
```

---

## **Deployment Checklist**

### **Backend (Railway)**
- [ ] PostgreSQL service created and running
- [ ] Redis service created and running  
- [ ] All environment variables set correctly
- [ ] DATABASE_URL points to PostgreSQL service
- [ ] REDIS_URL points to Redis service
- [ ] JWT_SECRET is secure (32+ characters)
- [ ] Migrations deployed successfully
- [ ] Database seeded with sample data
- [ ] Health check endpoint responds: `/health`

### **Frontend (Vercel)**
- [ ] NEXT_PUBLIC_API_URL points to Railway backend
- [ ] NEXT_PUBLIC_WS_URL points to Railway backend
- [ ] Build completes without errors
- [ ] Frontend can connect to backend API

### **Integration Testing**
- [ ] Frontend can fetch trending tokens
- [ ] WebSocket connection works for real-time prices
- [ ] User authentication functions
- [ ] Trading simulation works
- [ ] Portfolio updates in real-time

---

## **Monitoring & Maintenance**

### **Health Checks**
- Backend Health: `https://your-backend.up.railway.app/health`
- API Version: `https://your-backend.up.railway.app/api/version`
- Frontend: `https://your-frontend.vercel.app`

### **Database Monitoring**
```bash
# Check connection pool stats
railway run node -e "
  const { getConnectionPoolStats } = require('./dist/lib/prisma.js');
  getConnectionPoolStats().then(stats => console.log(JSON.stringify(stats, null, 2)));
"
```

### **Log Monitoring**
```bash
# Railway backend logs
railway logs

# Vercel frontend logs
vercel logs
```

---

## **Backup & Recovery**

### **Database Backup**
```bash
# Export database
railway run pg_dump $DATABASE_URL > backup.sql

# Restore database
railway run psql $DATABASE_URL < backup.sql
```

### **Environment Variables Backup**
```bash
# Export current variables
railway variables --json > env-backup.json
```

---

## **Support & Resources**

- **Railway Docs**: https://docs.railway.app
- **Vercel Docs**: https://vercel.com/docs
- **SolSim GitHub**: https://github.com/Shillz96/solsim
- **Issue Reporting**: Create GitHub issue with logs

---

**Last Updated**: October 7, 2025
**Status**: ✅ Tested and Working
**Environment**: Railway PostgreSQL + Vercel Next.js