# 🚀 START HERE - Deploy SolSim

## ✅ Everything is Ready!

All configuration files have been created and your project is ready for deployment.

## 🎯 Deploy in 3 Steps (10 minutes)

### Step 1: Deploy Backend to Railway (5-7 min)

Open PowerShell in this directory and run:

```powershell
.\deploy-backend.ps1
```

**What it does:**
- Logs you into Railway
- Creates PostgreSQL database
- Creates Redis cache
- Generates secure JWT secret
- Deploys backend API
- Runs database migrations

**You'll get:** Backend URL (save this!)

Example: `https://solsim-backend.up.railway.app`

---

### Step 2: Deploy Frontend to Vercel (3-5 min)

After backend is deployed, run:

```powershell
.\deploy-frontend.ps1
```

**When prompted for backend URL**, enter the URL from Step 1.

**What it does:**
- Logs you into Vercel
- Sets environment variables
- Deploys frontend
- Provides deployment URL

**You'll get:** Frontend URL

Example: `https://solsim.vercel.app`

---

### Step 3: Update CORS (1 min)

Connect frontend and backend:

```powershell
cd backend
railway variables set FRONTEND_ORIGIN=https://your-actual-vercel-url.vercel.app
railway up
cd ..
```

Replace `your-actual-vercel-url.vercel.app` with your real Vercel URL from Step 2.

---

## 🎉 Done! Test Your App

1. **Test Backend**:
   ```powershell
   curl https://your-backend.up.railway.app/health
   ```
   Should return: `{"status":"healthy",...}`

2. **Test Frontend**:
   Open your Vercel URL in a browser

3. **Test Full App**:
   - Register a new account
   - Search for a token
   - Execute a test trade
   - Check leaderboard

---

## 📝 Before You Start

Make sure you have:

- ✅ Railway account (sign up at https://railway.app)
- ✅ Vercel account (sign up at https://vercel.com)
- ✅ Your API keys ready:
  - `BIRDEYE_API_KEY` (required)
  - `HELIUS_API_KEY` (required)
  - `COINGECKO_API_KEY` (optional)
  - `TWITTER_CLIENT_ID/SECRET` (optional)

The deployment scripts will prompt you for these.

---

## 💰 Costs

- **Railway**: $5/month (Hobby) - Includes PostgreSQL + Redis + Backend
- **Vercel**: Free tier available (good for testing)
- **Total**: $5-25/month depending on usage

---

## 🆘 Need Help?

### Detailed Guides
- `DEPLOY_README.md` - Quick deployment guide
- `DEPLOYMENT_GUIDE.md` - Comprehensive guide with troubleshooting
- `DEPLOYMENT_STATUS.md` - What's been configured

### Common Issues

**Scripts not running?**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**CLI tools not found?**
```powershell
npm install -g @railway/cli vercel
```

**CORS errors?**
Make sure FRONTEND_ORIGIN matches your Vercel URL exactly (no trailing slash)

---

## 🚀 Ready? Start Now!

```powershell
.\deploy-backend.ps1
```

Then follow the prompts. The script will guide you through everything.

**Estimated time: 10 minutes total**

Good luck! 🎉

