# GitHub Auto-Deployment Setup Guide

This guide shows you how to link your GitHub repository to Railway (backend) and Vercel (frontend) for automatic deployments.

## Why Link GitHub?

Once set up, deployments become automatic:
- Push to `main` → Auto-deploys to production
- Push to `staging` → Auto-deploys to staging (preview)
- No manual `railway up` or `vercel --prod` commands needed

---

## Important: Monorepo Directory Configuration

**Your project is a monorepo** with separate `backend/` and `frontend/` directories. You MUST configure the root directory for each service:

```
SolSim/
├── backend/      ← Railway needs to build from HERE
├── frontend/     ← Vercel needs to build from HERE
└── package.json  ← Root (workspace management only)
```

If you don't set the directory, they'll try to build from the root and fail.

---

## Part 1: Railway (Backend) Setup

### Step 1: Link GitHub Repository

1. Go to [Railway Dashboard](https://railway.app)
2. Select your backend project
3. Click **Settings** → **Service Settings**
4. Under **Source**, click **Connect to GitHub**
5. Select your repository: `Shillz96/solsim`
6. **IMPORTANT:** Configure these settings:

### Step 2: Configure Root Directory

In Railway Settings → **Service**:

```
Root Directory: backend
```

This tells Railway to run builds from the `backend/` folder.

### Step 3: Configure Build Settings

Railway should auto-detect these, but verify:

```
Build Command: npx prisma generate && npm run build
Start Command: npx prisma migrate deploy && npm start
```

These match what's in `backend/package.json`.

### Step 4: Branch Configuration

In Railway Settings → **Service** → **Deploy Triggers**:

**Option A: Production Only (Simpler)**
```
Branch: main
Auto-deploy: ✅ Enabled
```

**Option B: Production + Staging (Recommended)**
```
Create 2 Railway services from same repo:

Service 1 (Production):
- Branch: main
- Environment: production
- Auto-deploy: ✅ Enabled

Service 2 (Staging):
- Branch: staging
- Environment: staging
- Auto-deploy: ✅ Enabled
```

### Step 5: Environment Variables

Make sure all your environment variables are set in Railway:

**Settings → Variables**
- `DATABASE_URL` (Railway PostgreSQL)
- `REDIS_URL` (Railway Redis)
- `SOLANA_RPC`
- `HELIUS_WS`
- `HELIUS_API`
- `VSOL_TOKEN_MINT`
- `JWT_SECRET`
- `REWARDS_WALLET_SECRET`
- `NODE_ENV=production`
- `FRONTEND_URL` (your Vercel URL)

**Pro Tip:** Use Railway's "Shared Variables" for values that are the same across environments.

### Step 6: Test Deployment

```bash
# Push to trigger auto-deployment
git checkout main
git push origin main

# Watch logs in Railway dashboard
# Or via CLI:
railway logs
```

---

## Part 2: Vercel (Frontend) Setup

### Step 1: Link GitHub Repository

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New** → **Project**
3. Import from GitHub: `Shillz96/solsim`
4. **IMPORTANT:** Configure these settings:

### Step 2: Configure Root Directory

In the import screen:

```
Framework Preset: Next.js
Root Directory: frontend
```

Click the **Edit** button next to "Root Directory" and select `frontend`.

### Step 3: Build Settings

Vercel should auto-detect, but verify:

```
Build Command: npm run build
Output Directory: .next
Install Command: npm install
Development Command: npm run dev
```

### Step 4: Branch Configuration

In Vercel Project Settings → **Git**:

**Production Branch:**
```
Production Branch: main
```

**Preview Branches:**
```
☑ Enable for all branches (including dev, staging)
OR
☑ Enable for: staging
```

This creates preview deployments for testing before production.

### Step 5: Environment Variables

**Settings → Environment Variables**

Add variables for each environment:

**Production (main branch):**
```
NEXT_PUBLIC_API_URL=https://virtualsol-production.up.railway.app
NEXT_PUBLIC_WS_URL=wss://virtualsol-production.up.railway.app
NEXT_PUBLIC_ENV=production
NEXT_PUBLIC_DEBUG=false
NEXT_PUBLIC_PORTFOLIO_REFRESH_INTERVAL=30000
NEXT_PUBLIC_LEADERBOARD_REFRESH_INTERVAL=60000
NEXT_PUBLIC_MARKET_REFRESH_INTERVAL=15000
```

**Preview (staging branch) - Optional:**
```
NEXT_PUBLIC_API_URL=https://virtualsol-staging.up.railway.app
NEXT_PUBLIC_WS_URL=wss://virtualsol-staging.up.railway.app
NEXT_PUBLIC_ENV=staging
NEXT_PUBLIC_DEBUG=true
NEXT_PUBLIC_PORTFOLIO_REFRESH_INTERVAL=30000
NEXT_PUBLIC_LEADERBOARD_REFRESH_INTERVAL=60000
NEXT_PUBLIC_MARKET_REFRESH_INTERVAL=15000
```

**Important:** Click the environment selector (Production/Preview/Development) to set different values per environment.

### Step 6: Test Deployment

```bash
# Push to trigger auto-deployment
git checkout main
git push origin main

# Vercel will:
# 1. Build frontend from frontend/ directory
# 2. Deploy to production
# 3. Comment on commit with deployment URL
```

---

## Part 3: Deployment Workflow

Once linked, your workflow becomes:

### Daily Development (No Deployment)

```bash
# Work on dev branch
git checkout dev

# Make changes
# ...

# Commit and push
git add .
git commit -m "feat: your feature"
git push origin dev

# ✅ No deployment happens (dev branch not configured)
```

### Deploy to Staging (Test First)

```bash
# Merge dev to staging
git checkout staging
git merge dev
git push origin staging

# ✅ Auto-deploys to staging environments
# Railway: staging service
# Vercel: preview deployment

# Test on staging URLs, verify everything works
```

### Deploy to Production

```bash
# Merge staging to main
git checkout main
git merge staging
git push origin main

# ✅ Auto-deploys to production
# Railway: production service
# Vercel: production deployment (oneupsol.fun)

# Monitor deployment in dashboards
```

---

## Verification Checklist

After setup, verify:

### Railway
- [ ] GitHub repository connected
- [ ] Root directory set to `backend`
- [ ] Build and start commands correct
- [ ] Branch triggers configured (main or main + staging)
- [ ] All environment variables set
- [ ] Health checks passing (`/health` endpoint)

### Vercel
- [ ] GitHub repository connected
- [ ] Root directory set to `frontend`
- [ ] Framework preset is Next.js
- [ ] Production branch is `main`
- [ ] Preview branches enabled (staging, dev)
- [ ] Environment variables set for production and preview
- [ ] Domain connected (oneupsol.fun)

---

## Common Issues & Solutions

### Railway: "No package.json found"

**Problem:** Railway is trying to build from root instead of `backend/`

**Solution:**
- Settings → Service → Root Directory → Set to `backend`

### Vercel: "Cannot find module 'next'"

**Problem:** Vercel is trying to build from root instead of `frontend/`

**Solution:**
- Settings → General → Root Directory → Set to `frontend`
- Redeploy

### Railway: Database Migration Fails

**Problem:** Migrations running in wrong order

**Solution:**
- Check start command includes: `npx prisma migrate deploy`
- Verify DATABASE_URL is set
- Check Railway logs for specific error

### Vercel: Environment Variables Not Working

**Problem:** Variables not set for the right environment

**Solution:**
- Settings → Environment Variables
- Select correct environment: Production, Preview, or Development
- Make sure to redeploy after adding variables

### Build Succeeds but Runtime Errors

**Backend:**
- Check Railway logs: `railway logs`
- Verify all env vars are set
- Check database connection

**Frontend:**
- Check Vercel function logs
- Verify `NEXT_PUBLIC_API_URL` is correct
- Check browser console for errors

---

## Disabling Auto-Deploy (If Needed)

If you want to go back to manual deployments:

**Railway:**
- Settings → Service → Deploy Triggers → Toggle off

**Vercel:**
- Settings → Git → Ignored Build Step → Add custom condition

---

## Rolling Back Deployments

### Railway
```bash
# Via dashboard: Deployments → Click previous deployment → "Redeploy"

# Or via CLI:
railway rollback
```

### Vercel
```bash
# Via dashboard: Deployments → Click previous deployment → "Promote to Production"

# Or redeploy specific commit:
git revert HEAD
git push origin main  # Triggers new deployment
```

---

## Cost Considerations

**Railway:**
- Free tier: 500 hours/month
- With 2 services (prod + staging): ~$5-10/month
- Monitor usage in dashboard

**Vercel:**
- Hobby: Free (1 team member, unlimited projects)
- Pro: $20/month (if you need multiple team members)
- Preview deployments count toward build minute limits

**Recommendation:** Start with production-only auto-deploy, add staging later if needed.

---

## Monitoring Deployments

### Get Notified on Deployment

**Railway:**
- Integrations → Discord/Slack (optional)
- Email notifications (default)

**Vercel:**
- GitHub bot comments on commits
- Email notifications
- Vercel app notifications

### Check Deployment Status

**Railway:**
```bash
railway status
railway logs --tail
```

**Vercel:**
```bash
npx vercel --prod  # Still works for manual deploys
# Or check dashboard
```

---

## Migration from Manual to Auto-Deploy

You're currently deploying manually. Here's how to transition:

### Test First (Recommended)

1. Set up Railway/Vercel GitHub linking
2. Configure for `staging` branch only
3. Test auto-deployment to staging
4. Verify everything works
5. Then enable for `main` branch

### One-Time Setup

1. Stop doing `railway up` and `vercel --prod` manually
2. Let GitHub trigger deployments
3. Monitor first few deployments closely
4. Adjust as needed

---

## Quick Reference

### Railway Configuration
```
Root Directory: backend
Build Command: npx prisma generate && npm run build
Start Command: npx prisma migrate deploy && npm start
Branch: main (and optionally staging)
```

### Vercel Configuration
```
Framework: Next.js
Root Directory: frontend
Build Command: npm run build
Production Branch: main
Preview Branches: staging, dev
```

### New Workflow
```bash
# Dev (no deploy)
git push origin dev

# Staging (preview deploy)
git push origin staging

# Production (auto deploy)
git push origin main
```

---

## Next Steps

1. **Link Railway:** Follow Part 1 above
2. **Link Vercel:** Follow Part 2 above
3. **Test with staging:** Push to `staging` branch first
4. **Update WORKFLOW.md:** Remove manual deployment instructions (optional)
5. **Enjoy automatic deployments!**

---

## Getting Help

- **Railway Docs:** https://docs.railway.app
- **Vercel Docs:** https://vercel.com/docs
- **Your Workflow Docs:** See `WORKFLOW.md` for Git workflow

---

Last Updated: October 2024
