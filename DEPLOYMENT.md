# VirtualSol Production Deployment Guide

## 🚀 Deployment Overview

VirtualSol can be deployed using Railway, Docker, or any cloud provider that supports Node.js applications. This guide covers production deployment with a focus on Railway.

## 📋 Pre-Deployment Checklist

### Required Environment Variables

**CRITICAL - Must be set before deployment:**

```bash
# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@host:port/database

# Redis Cache
REDIS_URL=redis://user:password@host:port

# Security (MUST be unique and secure!)
JWT_SECRET=<minimum-64-character-random-string>
JWT_EXPIRY=24h
REFRESH_TOKEN_EXPIRY=7d

# Solana RPC (at least one required)
HELIUS_API=<your-helius-api-key>
HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=<key>
HELIUS_WS=wss://mainnet.helius-rpc.com/?api-key=<key>

# External APIs (optional but recommended)
DEXSCREENER_BASE=https://api.dexscreener.com
JUPITER_BASE=https://quote-api.jup.ag
BIRDEYE_API_KEY=<your-birdeye-key>

# SIM Token Configuration
SIM_TOKEN_MINT=<your-sim-token-mint-address>
REWARDS_WALLET_SECRET=<base58-encoded-secret-key>

# Frontend URL (for CORS)
FRONTEND_URL=https://virtualsol.fun

# Environment
NODE_ENV=production
PORT=4000
LOG_LEVEL=info

# Monitoring (optional but highly recommended)
SENTRY_DSN=<your-sentry-dsn>
```

### Generate Secure Secrets

```bash
# Generate JWT_SECRET (Linux/Mac)
openssl rand -base64 64

# Generate JWT_SECRET (Node.js)
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"

# Generate REWARDS_WALLET_SECRET (if needed)
# Use Solana CLI or web wallet to generate a new keypair
```

## 🚂 Railway Deployment

### Initial Setup

1. **Create Railway Project**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli

   # Login to Railway
   railway login

   # Create new project
   railway init
   ```

2. **Add Services**
   - PostgreSQL: Add from Railway template
   - Redis: Add from Railway template
   - Backend: Deploy from GitHub repo
   - Frontend: Deploy as separate service (recommended)

3. **Configure Environment Variables**

   In Railway Dashboard:
   - Go to your service → Variables
   - Add all required environment variables
   - Use Railway's reference variables for DATABASE_URL and REDIS_URL

4. **Configure Build & Start Commands**

   **Backend Service (deploy from /backend directory):**
   ```json
   {
     "build": "npx prisma generate && npm run build",
     "start": "npx prisma migrate deploy && npm start",
     "healthcheckPath": "/health",
     "healthcheckTimeout": 10
   }
   ```

   **Frontend Service (deploy from /frontend directory):**
   ```json
   {
     "build": "npm ci && npm run build",
     "start": "npm start",
     "port": 3000
   }
   ```

### Railway-Specific Configuration

1. **railway.json** (optional, for advanced configuration):
   ```json
   {
     "$schema": "https://railway.app/railway.schema.json",
     "build": {
       "builder": "NIXPACKS",
       "buildCommand": "npm run build",
       "watchPatterns": [
         "backend/**",
         "frontend/**"
       ]
     },
     "deploy": {
       "startCommand": "npm start",
       "healthcheckPath": "/health",
       "healthcheckTimeout": 10,
       "restartPolicyType": "ON_FAILURE",
       "restartPolicyMaxRetries": 3
     }
   }
   ```

2. **Nixpacks Configuration** (nixpacks.toml):
   ```toml
   # Deploy backend directory directly
   [phases.install]
   cmds = ["npm install"]

   [phases.build]
   cmds = ["npm run build"]

   [start]
   cmd = "npm start"
   ```

   **Note:** When deploying to Railway, set the **Root Directory** to `/backend` in your service settings. This tells Railway to deploy from the backend folder directly.

### WebSocket Configuration for Railway

Railway requires specific WebSocket configuration:

1. **Ensure WebSocket routes are registered BEFORE rate limiting**
2. **Use proper CORS headers for WebSocket upgrade**
3. **Disable perMessageDeflate for compatibility**

These are already configured in the codebase.

### Database Migrations

Railway runs migrations automatically with:
```bash
npx prisma migrate deploy
```

For manual migrations:
```bash
railway run npx prisma migrate deploy
```

### Monitoring & Logs

```bash
# View logs
railway logs

# View specific service logs
railway logs --service=backend

# Follow logs in real-time
railway logs -f

# Check deployment status
railway status
```

## 🐳 Docker Deployment

### Build and Run

```bash
# Build the image
docker build -t virtualsol:latest .

# Run with environment file
docker run -d \
  --name virtualsol \
  --env-file .env.production \
  -p 3000:3000 \
  -p 4000:4000 \
  virtualsol:latest

# Or use docker-compose
docker-compose up -d
```

### Docker Compose Production

```yaml
version: '3.8'

services:
  app:
    image: virtualsol:latest
    restart: unless-stopped
    env_file: .env.production
    ports:
      - "3000:3000"
      - "4000:4000"
    depends_on:
      - postgres
      - redis
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## 🔍 Health Monitoring

### Available Health Endpoints

- `/health` - Basic health check
- `/health/live` - Kubernetes liveness probe
- `/health/ready` - Kubernetes readiness probe
- `/health/detailed` - Comprehensive health with metrics

### Monitoring Setup

1. **Configure uptime monitoring** (e.g., UptimeRobot, Pingdom):
   - Monitor: `https://api.virtualsol.fun/health`
   - Expected response: 200 OK
   - Check interval: 5 minutes

2. **Set up alerts for**:
   - Response time > 2 seconds
   - Error rate > 1%
   - Memory usage > 80%
   - Database connection failures

## 🔒 Security Checklist

- [ ] JWT_SECRET is unique and at least 64 characters
- [ ] All secrets are stored in environment variables
- [ ] HTTPS is enforced (Railway provides this)
- [ ] CORS is configured for your domain only
- [ ] Rate limiting is enabled
- [ ] Database uses SSL connections
- [ ] Redis requires authentication in production
- [ ] Helmet security headers are configured
- [ ] SQL injection protection via Prisma
- [ ] Input validation with Zod schemas

## 📊 Performance Optimization

### Caching Strategy

1. **Redis Caching Layers**:
   - Price data: 60-second TTL
   - User sessions: 7-day TTL
   - Leaderboard: 5-minute TTL
   - Portfolio calculations: 30-second TTL

2. **Database Optimization**:
   - Indexes are created automatically via Prisma
   - Connection pooling is configured
   - Query optimization for FIFO calculations

### Scaling Considerations

1. **Horizontal Scaling**:
   - Backend can run multiple instances
   - Use Redis for session sharing
   - WebSocket connections need sticky sessions

2. **Vertical Scaling**:
   - Minimum: 1GB RAM, 1 vCPU
   - Recommended: 2GB RAM, 2 vCPU
   - Production: 4GB RAM, 2 vCPU

## 🚨 Troubleshooting

### Common Railway Issues

1. **Build Failures**:
   ```bash
   # Clear cache and rebuild
   railway up --detach
   ```

2. **Database Connection Issues**:
   - Check DATABASE_URL format
   - Ensure SSL is enabled: `?sslmode=require`
   - Verify connection pooling settings

3. **WebSocket Connection Failures**:
   - Ensure WebSocket routes are registered first
   - Check CORS configuration
   - Verify Railway's WebSocket support is enabled

4. **Memory Issues**:
   - Increase dyno size in Railway
   - Check for memory leaks with `/health/detailed`
   - Enable swap if available

### Debug Commands

```bash
# SSH into Railway container
railway shell

# Check environment variables
railway variables

# Run database migrations manually
railway run npx prisma migrate deploy

# Reset database (CAUTION!)
railway run npx prisma migrate reset
```

## 📈 Monitoring Dashboard

### Recommended Setup

1. **Application Monitoring**: Sentry or Rollbar
2. **Infrastructure Monitoring**: Railway Metrics
3. **Uptime Monitoring**: UptimeRobot
4. **Log Aggregation**: Railway Logs or LogTail
5. **Performance Monitoring**: New Relic or DataDog

### Key Metrics to Track

- Request latency (p50, p95, p99)
- Error rate
- WebSocket connection count
- Database query performance
- Redis hit rate
- Memory usage
- CPU utilization

## 🔄 Continuous Deployment

### GitHub Actions for Railway

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Railway

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install Railway
        run: npm i -g @railway/cli

      - name: Deploy to Railway
        run: railway up
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

## 📝 Post-Deployment Checklist

- [ ] Verify all health endpoints return 200
- [ ] Test WebSocket connections
- [ ] Verify database migrations completed
- [ ] Check Redis connectivity
- [ ] Test authentication flow
- [ ] Verify price service is receiving updates
- [ ] Check CORS for your domain
- [ ] Test rate limiting
- [ ] Monitor error rates for first hour
- [ ] Set up backup strategy

## 🆘 Emergency Procedures

### Rollback

```bash
# Railway rollback to previous deployment
railway rollback

# Or redeploy specific commit
railway up --commit=<commit-hash>
```

### Emergency Shutdown

```bash
# Stop service immediately
railway down

# Scale to zero
railway scale --replicas=0
```

### Database Backup

```bash
# Create backup
railway run pg_dump $DATABASE_URL > backup.sql

# Restore backup
railway run psql $DATABASE_URL < backup.sql
```

## 📞 Support

- Railway Support: https://railway.app/help
- Railway Status: https://status.railway.app
- VirtualSol Issues: https://github.com/yourusername/virtualsol/issues

---

Remember to always test deployments in a staging environment first!