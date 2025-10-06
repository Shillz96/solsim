# 🚀 Quick Deployment Instructions

This guide will help you deploy SolSim in under 10 minutes!

## Prerequisites Checklist

- [x] Railway CLI installed globally
- [x] Vercel CLI installed globally
- [x] Git repository initialized
- [ ] Your API keys ready (check your existing .env files)

## Quick Start (Windows)

### Option 1: Automated Deployment Scripts (Recommended)

#### Deploy Backend to Railway
```powershell
.\deploy-backend.ps1
```

This script will:
- ✅ Login to Railway (if needed)
- ✅ Initialize Railway project
- ✅ Add PostgreSQL and Redis services
- ✅ Generate secure JWT secret
- ✅ Set environment variables
- ✅ Deploy backend
- ✅ Run database migrations

#### Deploy Frontend to Vercel
```powershell
.\deploy-frontend.ps1
```

This script will:
- ✅ Login to Vercel (if needed)
- ✅ Set environment variables
- ✅ Deploy to production
- ✅ Provide deployment URL

### Option 2: Manual Step-by-Step

Follow the detailed guide in `DEPLOYMENT_GUIDE.md`

## Quick Manual Deployment

If you prefer manual control:

### 1. Backend (5 minutes)

```bash
cd backend

# Login and initialize
railway login
railway init -n solsim-backend

# Add services
railway add --service postgres
railway add --service redis

# Generate JWT secret
railway variables set JWT_SECRET=$(openssl rand -base64 48)

# Set environment
railway variables set NODE_ENV=production
railway variables set PORT=4002
railway variables set FRONTEND_ORIGIN=https://solsim.vercel.app

# Add your API keys
railway variables set BIRDEYE_API_KEY=your-key
railway variables set HELIUS_API_KEY=your-key
railway variables set COINGECKO_API_KEY=your-key

# Deploy
railway up

# Get URL
railway domain

# Run migrations
railway run npm run db:migrate:prod
```

### 2. Frontend (3 minutes)

```bash
cd ../frontend

# Login
vercel login

# Set environment (use your Railway URL from above)
echo "YOUR_RAILWAY_URL" | vercel env add NEXT_PUBLIC_API_URL production
echo "production" | vercel env add NEXT_PUBLIC_ENV production

# Deploy
vercel --prod
```

### 3. Update CORS (1 minute)

```bash
cd ../backend

# Use your actual Vercel URL
railway variables set FRONTEND_ORIGIN=https://your-app.vercel.app
railway up
```

## Verify Deployment

### Test Backend
```bash
curl https://your-backend.up.railway.app/health
```

Expected: `{"status":"healthy",...}`

### Test Frontend
Open `https://your-app.vercel.app` in your browser

### Test Connection
In browser console:
```javascript
fetch('https://your-backend.up.railway.app/api/version')
  .then(r => r.json())
  .then(console.log)
```

## Environment Variables You Need

### Backend (Railway)
- `DATABASE_URL` - Auto-set by Railway PostgreSQL
- `REDIS_URL` - Auto-set by Railway Redis
- `JWT_SECRET` - Generated automatically
- `NODE_ENV=production`
- `PORT=4002`
- `FRONTEND_ORIGIN` - Your Vercel URL
- `BIRDEYE_API_KEY` - Your key
- `HELIUS_API_KEY` - Your key
- `COINGECKO_API_KEY` - Your key (optional)
- `TWITTER_CLIENT_ID` - Your ID (optional)
- `TWITTER_CLIENT_SECRET` - Your secret (optional)

### Frontend (Vercel)
- `NEXT_PUBLIC_API_URL` - Your Railway backend URL
- `NEXT_PUBLIC_ENV=production`
- `NEXT_PUBLIC_APP_URL` - Your Vercel URL (optional)

## Troubleshooting

### "Railway command not found"
```bash
npm install -g @railway/cli
```

### "Vercel command not found"
```bash
npm install -g vercel
```

### CORS Errors
Make sure `FRONTEND_ORIGIN` exactly matches your Vercel URL (no trailing slash):
```bash
railway variables set FRONTEND_ORIGIN=https://exact-vercel-url.vercel.app
```

### Build Failures
Check logs:
```bash
railway logs    # Backend
vercel logs     # Frontend
```

### Database Connection Issues
Verify DATABASE_URL is set:
```bash
railway variables | grep DATABASE_URL
```

## Post-Deployment

1. **Test Registration/Login** - Create a test account
2. **Test Trading** - Execute a test trade
3. **Monitor Logs** - Watch for errors
   ```bash
   railway logs --tail
   vercel logs production
   ```
4. **Set up Monitoring** - Check Railway and Vercel dashboards

## Continuous Deployment

### Enable Auto-Deploy from GitHub

#### Railway
1. Go to Railway dashboard
2. Project Settings → GitHub
3. Connect repository
4. Select branch (main)

#### Vercel
1. Go to Vercel dashboard
2. Project Settings → Git
3. Connect repository
4. Select branch (main)

Now every push to main will auto-deploy!

## Cost Estimate

### Railway (Backend + Database + Redis)
- **Development**: $5/month (Hobby plan) - 500 hours
- **Production**: ~$20-30/month depending on usage
- Includes: PostgreSQL, Redis, 1GB RAM, 1 vCPU

### Vercel (Frontend)
- **Free Tier**: Good for development and small projects
- **Pro**: $20/month (if you need more)
- Includes: Unlimited bandwidth, 100GB bandwidth on free

### Total Estimated Cost
- Development/Testing: **$5-10/month**
- Small Production: **$20-40/month**
- Scale as you grow!

## Need Help?

1. Check `DEPLOYMENT_GUIDE.md` for detailed instructions
2. Check logs: `railway logs` and `vercel logs`
3. Verify environment variables: `railway variables` and `vercel env ls`
4. Test health endpoints

## Security Notes

✅ **Secure by Default:**
- JWT secrets are randomly generated (64 characters)
- Database connections use SSL
- Frontend uses HTTPS
- API keys are in environment variables, not code
- CORS is restricted to your domain
- Rate limiting is enabled

## Ready to Deploy?

1. Run: `.\deploy-backend.ps1`
2. Wait for completion, save the URL
3. Run: `.\deploy-frontend.ps1`
4. Enter your backend URL when prompted
5. Done! 🎉

**Total Time: ~10 minutes**

---

For detailed instructions, see `DEPLOYMENT_GUIDE.md`

