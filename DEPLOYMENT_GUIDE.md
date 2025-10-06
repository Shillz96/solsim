# 🚀 SolSim Deployment Guide

Complete guide for deploying SolSim to Railway (backend) and Vercel (frontend).

## Prerequisites

- [x] Git repository initialized
- [ ] Railway CLI installed
- [ ] Vercel CLI installed
- [ ] Your API keys ready

## Step 1: Install CLI Tools

```bash
# Install Railway CLI
npm install -g @railway/cli

# Install Vercel CLI
npm install -g vercel

# Verify installations
railway --version
vercel --version
```

## Step 2: Setup Environment Variables

### Backend Environment Variables

Create `backend/.env` with your actual API keys:

```env
# Database (Railway will auto-inject DATABASE_URL)
DATABASE_URL="postgresql://postgres:password@localhost:5432/solsim"

# Redis (Railway will auto-inject REDIS_URL)
REDIS_URL="redis://localhost:6379"

# JWT Secret (will be generated via Railway CLI)
JWT_SECRET="temporary-secret-will-be-replaced"

# Server Configuration
PORT=4002
NODE_ENV=production

# Frontend URL (update after Vercel deployment)
FRONTEND_ORIGIN="https://solsim.vercel.app"

# Your API Keys - ADD YOUR ACTUAL KEYS HERE
BIRDEYE_API_KEY="your-actual-birdeye-key"
HELIUS_API_KEY="your-actual-helius-key"
COINGECKO_API_KEY="your-actual-coingecko-key"
TWITTER_CLIENT_ID="your-twitter-client-id"
TWITTER_CLIENT_SECRET="your-twitter-client-secret"

# Optional
DEV_AUTH_BYPASS="false"
```

### Frontend Environment Variables

The file `frontend/.env.production` is already created. You'll update the URLs after deployment.

## Step 3: Deploy Backend to Railway

### 3.1 Login to Railway

```bash
railway login
```

This will open a browser for authentication.

### 3.2 Initialize Railway Project

```bash
cd backend
railway init
```

When prompted:
- Project name: `solsim-backend`
- Select "Create new project"

### 3.3 Add PostgreSQL Database

```bash
railway add --service postgres
```

This creates a managed PostgreSQL database and automatically sets `DATABASE_URL`.

### 3.4 Add Redis Service

```bash
railway add --service redis
```

This creates a managed Redis instance and automatically sets `REDIS_URL`.

### 3.5 Generate and Set JWT Secret

```bash
# Generate a secure JWT secret (64 characters)
railway variables set JWT_SECRET=$(openssl rand -base64 48)
```

### 3.6 Set Environment Variables

```bash
# Production environment
railway variables set NODE_ENV=production
railway variables set PORT=4002

# Frontend URL (temporary - update after Vercel deployment)
railway variables set FRONTEND_ORIGIN=https://solsim.vercel.app

# Set your API keys (replace with actual values)
railway variables set BIRDEYE_API_KEY=your-actual-key
railway variables set HELIUS_API_KEY=your-actual-key
railway variables set COINGECKO_API_KEY=your-actual-key
railway variables set TWITTER_CLIENT_ID=your-twitter-id
railway variables set TWITTER_CLIENT_SECRET=your-twitter-secret
railway variables set DEXSCREENER_BASE_URL=https://api.dexscreener.com/latest
railway variables set DEV_AUTH_BYPASS=false
```

### 3.7 Deploy Backend

```bash
# Deploy to Railway
railway up

# Get your backend URL
railway domain
```

**IMPORTANT:** Save the backend URL (e.g., `https://solsim-backend.up.railway.app`)

### 3.8 Run Database Migrations

```bash
# Run migrations on Railway
railway run npm run db:migrate:prod

# (Optional) Seed initial data
railway run npm run db:seed
```

### 3.9 View Logs

```bash
railway logs
```

## Step 4: Deploy Frontend to Vercel

### 4.1 Login to Vercel

```bash
cd ../frontend
vercel login
```

### 4.2 Deploy to Vercel

```bash
# First deployment (will ask questions)
vercel

# When prompted:
# - Set up and deploy? Yes
# - Which scope? (select your account)
# - Link to existing project? No
# - Project name? solsim or your preferred name
# - Directory? ./ (press Enter)
# - Override settings? No
```

### 4.3 Add Environment Variables

```bash
# Add backend API URL (use your actual Railway URL)
vercel env add NEXT_PUBLIC_API_URL production
# When prompted, enter: https://solsim-backend.up.railway.app

vercel env add NEXT_PUBLIC_APP_URL production
# When prompted, enter: https://solsim.vercel.app (or your actual Vercel URL)

vercel env add NEXT_PUBLIC_ENV production
# When prompted, enter: production
```

### 4.4 Deploy to Production

```bash
vercel --prod
```

**IMPORTANT:** Save the frontend URL from the deployment output.

## Step 5: Update Backend CORS

Update the backend to allow requests from your actual Vercel URL:

```bash
cd ../backend
railway variables set FRONTEND_ORIGIN=https://your-actual-vercel-url.vercel.app

# Redeploy backend
railway up
```

## Step 6: Verify Deployment

### Check Backend Health

```bash
curl https://your-backend.up.railway.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "...",
  "uptime": 123.45,
  "environment": "production",
  "version": "1.0.0"
}
```

### Check Frontend

Open your Vercel URL in a browser:
```
https://your-app.vercel.app
```

### Test API Connection

In your browser console (on the frontend):
```javascript
fetch('https://your-backend.up.railway.app/api/version')
  .then(r => r.json())
  .then(console.log)
```

## Step 7: Configure Custom Domains (Optional)

### Railway Custom Domain

1. Go to Railway dashboard
2. Select your project
3. Go to Settings → Domains
4. Click "Add Domain"
5. Enter your custom domain
6. Update DNS records as instructed

### Vercel Custom Domain

1. Go to Vercel dashboard
2. Select your project
3. Go to Settings → Domains
4. Click "Add Domain"
5. Enter your custom domain
6. Update DNS records as instructed

## Continuous Deployment

Both platforms support automatic deployments:

### Railway
- Connect your GitHub repository in Railway dashboard
- Railway will auto-deploy on push to main branch

### Vercel
- Connect your GitHub repository in Vercel dashboard
- Vercel will auto-deploy on push to main branch

## Monitoring and Maintenance

### View Logs

```bash
# Railway backend logs
railway logs --tail

# Vercel frontend logs
vercel logs
```

### View Environment Variables

```bash
# Railway
railway variables

# Vercel
vercel env ls
```

### Update Environment Variables

```bash
# Railway
railway variables set KEY=value

# Vercel
vercel env add KEY production
```

### Database Backups

Railway provides automatic daily backups for PostgreSQL. For manual backup:

```bash
railway run pg_dump $DATABASE_URL > backup.sql
```

## Troubleshooting

### CORS Errors

Ensure `FRONTEND_ORIGIN` in Railway exactly matches your Vercel URL (no trailing slash).

```bash
railway variables set FRONTEND_ORIGIN=https://your-exact-vercel-url.vercel.app
railway up
```

### Database Connection Issues

Check if DATABASE_URL is set:

```bash
railway variables | grep DATABASE_URL
```

### Build Failures

Check logs for errors:

```bash
# Railway
railway logs

# Vercel
vercel logs production
```

### JWT Token Errors

Ensure JWT_SECRET is set and secure:

```bash
railway variables | grep JWT_SECRET
```

If not set, generate a new one:

```bash
railway variables set JWT_SECRET=$(openssl rand -base64 48)
```

## Security Checklist

- [x] JWT_SECRET is randomly generated (64+ characters)
- [x] All API keys are in environment variables, not code
- [x] CORS is restricted to production frontend domain
- [x] Database connection uses SSL (Railway default)
- [x] Frontend uses HTTPS (Vercel default)
- [x] Environment files (.env) are in .gitignore
- [x] Rate limiting is enabled on backend

## Quick Reference

### Railway Commands

```bash
railway login              # Login to Railway
railway init               # Initialize project
railway add                # Add service (postgres, redis)
railway up                 # Deploy
railway logs               # View logs
railway variables          # List environment variables
railway variables set      # Set environment variable
railway run <command>      # Run command on Railway
railway domain             # Get domain URL
```

### Vercel Commands

```bash
vercel login               # Login to Vercel
vercel                     # Deploy to preview
vercel --prod              # Deploy to production
vercel logs                # View logs
vercel env ls              # List environment variables
vercel env add             # Add environment variable
vercel domains             # Manage domains
```

## Support

If you encounter issues:

1. Check the logs: `railway logs` and `vercel logs`
2. Verify environment variables: `railway variables` and `vercel env ls`
3. Ensure database migrations ran: `railway run npx prisma migrate status`
4. Test health endpoint: `curl https://your-backend.up.railway.app/health`

## Next Steps

After successful deployment:

1. ✅ Test user registration and login
2. ✅ Test trading functionality
3. ✅ Verify real-time price updates
4. ✅ Check leaderboard updates
5. ✅ Monitor error logs
6. ✅ Set up custom domains (optional)
7. ✅ Configure backup schedule
8. ✅ Enable auto-deployment from GitHub

---

**Last Updated:** January 2025
**Status:** ✅ Ready for Deployment

