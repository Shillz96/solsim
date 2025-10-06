# Railway CLI v4+ Deployment Guide

## Important: CLI Command Changes

Railway CLI v4+ has changed how environment variables are managed. The old `railway variables set` command no longer exists.

## New Workflow

### 1. Initialize Project

```powershell
cd backend
railway login
railway init
```

This will:
- Create a new Railway project
- Link your local directory to Railway

### 2. Add Database Services

You have two options:

#### Option A: Using Dashboard (Recommended)
1. Go to https://railway.app/dashboard
2. Select your project
3. Click "New Service"
4. Select "Database" → "PostgreSQL"
5. Click "New Service" again
6. Select "Database" → "Redis"

#### Option B: Using CLI (if available)
```powershell
railway add
# Select PostgreSQL
railway add
# Select Redis
```

### 3. Set Environment Variables

**All variables must be set through the Railway Dashboard:**

1. Go to https://railway.app/dashboard
2. Select your project
3. Click on your backend service
4. Go to "Variables" tab
5. Click "New Variable" for each:

```
JWT_SECRET=[generate with: openssl rand -base64 48]
NODE_ENV=production
PORT=4002
FRONTEND_ORIGIN=https://your-frontend.vercel.app
DEV_AUTH_BYPASS=false
DEXSCREENER_BASE_URL=https://api.dexscreener.com/latest
BIRDEYE_API_KEY=your-key
HELIUS_API_KEY=your-key
COINGECKO_API_KEY=your-key
```

**Note:** `DATABASE_URL` and `REDIS_URL` are automatically set when you add those services.

### 4. Generate JWT Secret

```powershell
# PowerShell
$bytes = New-Object byte[] 48
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes)

# Or use OpenSSL (Git Bash/Linux)
openssl rand -base64 48
```

Copy the output and paste it as `JWT_SECRET` in Railway dashboard.

### 5. Deploy

```powershell
railway up
```

This will:
- Build your application
- Deploy to Railway
- Assign a domain

### 6. Get Your Backend URL

```powershell
railway domain
```

Or check in the Railway dashboard under "Settings" → "Domains"

### 7. Run Database Migrations

```powershell
railway run npm run db:migrate:prod
```

### 8. (Optional) Seed Database

```powershell
railway run npm run db:seed
```

## Useful Railway v4 Commands

```powershell
# View environment variables
railway variables

# View logs (follow mode)
railway logs

# Open project in browser
railway open

# Check project status
railway status

# Run a command in Railway environment
railway run <command>

# Link existing project
railway link

# Get help
railway --help
```

## Quick Deployment Script

Use the simplified deployment script:

```powershell
.\deploy-backend-simple.ps1
```

This script:
- ✅ Handles Railway v4 CLI
- ✅ Generates JWT secret for you
- ✅ Opens dashboard for easy variable setup
- ✅ Guides you through each step
- ✅ Saves URLs for reference

## Troubleshooting

### "railway variables set" not found
✅ This is expected in v4. Use the dashboard to set variables.

### Cannot add PostgreSQL/Redis via CLI
✅ Use the dashboard: Project → New Service → Database → PostgreSQL/Redis

### Variables not showing up
- Wait a few seconds after adding in dashboard
- Check you're in the correct service (not the database service)
- Verify with: `railway variables`

### Deployment failing
```powershell
# Check logs
railway logs

# Check variables are set
railway variables

# Verify DATABASE_URL is set (should be automatic)
railway variables | grep DATABASE_URL
```

## Environment Variable Checklist

After adding all variables in the dashboard, verify:

```powershell
railway variables
```

You should see:
- [x] JWT_SECRET (should be 64+ characters)
- [x] NODE_ENV=production
- [x] PORT=4002
- [x] FRONTEND_ORIGIN (your Vercel URL)
- [x] DATABASE_URL (set automatically by PostgreSQL service)
- [x] REDIS_URL (set automatically by Redis service)
- [x] BIRDEYE_API_KEY (your key)
- [x] HELIUS_API_KEY (your key)
- [x] DEXSCREENER_BASE_URL=https://api.dexscreener.com/latest
- [x] DEV_AUTH_BYPASS=false

## Next Steps

After backend is deployed:

1. Save your backend URL
2. Deploy frontend with that URL
3. Update `FRONTEND_ORIGIN` in Railway dashboard with your Vercel URL
4. Test the connection

---

**Note:** Railway CLI v4 is designed to use the web dashboard for most configuration tasks, making it easier and more visual to manage your deployments.

