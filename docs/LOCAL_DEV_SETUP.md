# 🛠️ Local Development Setup Guide

## Overview
This guide helps you run the 1UP SOL project locally without breaking production deployments. We'll use environment files to separate local and production configurations.

## Prerequisites
- **Node.js** >= 20.0.0
- **PostgreSQL** (local instance or cloud database)
- **Redis** (optional but recommended for caching)
- **Git** (for version control)

---

## 🚀 Quick Start (5 Steps)

### 1️⃣ Switch to Development Branch
```bash
# Switch to dev branch (already exists)
git checkout dev

# Or create a new feature branch
git checkout -b feature/your-feature-name
```

**⚠️ NEVER commit .env files to git!** They're already in `.gitignore`.

### 2️⃣ Install Dependencies
```bash
# Install all dependencies (monorepo + backend + frontend)
npm install
```

### 3️⃣ Set Up Backend Environment

Copy the backend environment template:
```bash
cd backend
cp .env.example .env.local
```

Edit `backend/.env.local` with your local settings:
```bash
# Local PostgreSQL database
DATABASE_URL=postgresql://postgres:password@localhost:5432/solsim_dev
DATABASE_URL_DIRECT=postgresql://postgres:password@localhost:5432/solsim_dev

# Local Redis (or use cloud Redis)
REDIS_URL=redis://localhost:6379

# Helius RPC (get free API key from https://helius.dev)
SOLANA_RPC=https://mainnet.helius-rpc.com/?api-key=YOUR_HELIUS_API_KEY
HELIUS_API=YOUR_HELIUS_API_KEY

# JWT Secret (generate random string)
JWT_SECRET=local-dev-jwt-secret-change-this-to-random-string

# Other APIs (optional for basic development)
PUMPPORTAL_API_KEY=your-key-here
BIRDEYE_API_KEY=your-key-here

# Node environment
NODE_ENV=development
PORT=8000
```

**Generate secure JWT secret:**
```bash
# PowerShell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4️⃣ Set Up Frontend Environment

Copy the frontend environment template:
```bash
cd ../frontend
cp .env.local.dev .env.local
```

The `.env.local.dev` file should contain:
```bash
# Point to your LOCAL backend
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000

# Solana RPC (can use public endpoint for development)
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

### 5️⃣ Set Up Database & Run

```bash
# Go back to root directory
cd ..

# Run database migrations (creates tables)
npm run db:migrate

# Start backend (in one terminal)
npm run dev:backend
# Backend runs at http://localhost:8000

# Start frontend (in another terminal - open new PowerShell)
npm run dev:frontend
# Frontend runs at http://localhost:3000
```

---

## 📁 File Structure

```
solsim/
├── backend/
│   ├── .env.example        # Template (committed to git)
│   ├── .env.local          # YOUR local config (NOT in git)
│   └── prisma/
│       └── schema.prisma   # Database schema
├── frontend/
│   ├── .env.local.dev      # Local development template
│   ├── .env.local.production  # Production frontend config
│   └── .env.local          # Active config (NOT in git)
└── package.json            # Root monorepo scripts
```

---

## 🔧 Common Development Commands

### Database Management
```bash
# Run migrations (creates/updates database tables)
npm run db:migrate

# Open Prisma Studio (visual database editor)
npm run db:studio

# Reset database (⚠️ deletes all data)
cd backend && npm run db:reset
```

### Running Services
```bash
# Backend only
npm run dev:backend

# Frontend only
npm run dev:frontend

# Backend worker (PumpPortal price streaming)
cd backend && npm run dev:worker

# Token discovery worker (trending tokens)
cd backend && npm run dev:discovery
```

### Code Quality
```bash
# Lint frontend code
npm run lint:frontend

# Fix linting issues
npm run lint:fix

# Type check frontend
npm run type-check:frontend
```

---

## 🌳 Git Workflow (Protecting Production)

### Development Workflow
```bash
# 1. Always work on dev or feature branches
git checkout dev
# or
git checkout -b feature/new-feature-name

# 2. Make your changes and test locally

# 3. Commit changes
git add .
git commit -m "feat: description of changes"

# 4. Push to dev branch
git push origin dev

# 5. Test on staging/dev deployment
# Let Railway/Vercel auto-deploy from dev branch

# 6. Once tested, merge to main via Pull Request
git checkout main
git merge dev
git push origin main
```

### Branch Protection Rules
- **main** = Production (Railway + Vercel auto-deploy)
- **dev** = Development/Staging
- **feature/** = Individual features

**⚠️ NEVER push directly to main without testing on dev first!**

---

## 🗄️ Database Options

### Option 1: Local PostgreSQL (Recommended for Development)
```bash
# Install PostgreSQL locally
# Windows: https://www.postgresql.org/download/windows/
# Mac: brew install postgresql

# Create local database
psql -U postgres
CREATE DATABASE solsim_dev;
\q

# Use in .env.local
DATABASE_URL=postgresql://postgres:password@localhost:5432/solsim_dev
```

### Option 2: Cloud PostgreSQL (Easier Setup)
- **Neon** (recommended): https://neon.tech (free tier)
- **Supabase**: https://supabase.com (free tier)
- **Railway**: https://railway.app (paid but easy)

Just copy the connection string to `DATABASE_URL` in `.env.local`

### Option 3: Share Development Database
Use a shared cloud database for the team:
```bash
DATABASE_URL=postgresql://user:pass@dev-database.railway.internal:5432/solsim_dev
```

---

## 🔴 Redis Setup (Optional but Recommended)

Redis is used for caching prices and reducing API calls.

### Local Redis
```bash
# Windows (using WSL or Docker)
docker run -d -p 6379:6379 redis:alpine

# Mac
brew install redis
brew services start redis

# Use in .env.local
REDIS_URL=redis://localhost:6379
```

### Cloud Redis (Easier)
- **Upstash**: https://upstash.com (free tier, serverless)
- **Redis Cloud**: https://redis.com (free tier)

---

## 🧪 Testing Your Setup

### 1. Check Backend Health
```bash
# Backend should be running on http://localhost:8000
curl http://localhost:8000/health
```

### 2. Check Frontend
```bash
# Open browser to http://localhost:3000
# You should see the Mario-themed UI
```

### 3. Test WebSocket Connection
```bash
# Open browser console on http://localhost:3000
# Check Network tab -> WS tab
# Should see WebSocket connection to ws://localhost:8000
```

---

## 🐛 Troubleshooting

### Backend Won't Start
```bash
# Check if port 8000 is in use
netstat -ano | findstr :8000

# Kill process using port 8000
# Find PID from above command, then:
taskkill /PID <PID> /F

# Check database connection
cd backend
npx prisma db pull
```

### Frontend Won't Connect to Backend
1. Verify `NEXT_PUBLIC_API_URL=http://localhost:8000` in `frontend/.env.local`
2. Check backend is running: `curl http://localhost:8000/health`
3. Clear Next.js cache: `cd frontend && rm -rf .next && npm run dev`

### Database Migration Errors
```bash
# Reset database (⚠️ deletes data)
cd backend
npm run db:reset

# Generate Prisma client
npm run prisma:generate

# Run migrations again
npm run db:migrate
```

### "Cannot find module" Errors
```bash
# Clean install all dependencies
npm run clean
npm install
cd backend && npm install
cd ../frontend && npm install
```

---

## 🚢 Deploying to Production

### When Ready to Deploy
```bash
# 1. Merge your changes to main
git checkout main
git merge dev
git push origin main

# 2. Railway auto-deploys backend from main
# 3. Vercel auto-deploys frontend from main
# 4. Monitor deployments on Railway/Vercel dashboards
```

### Environment Variables on Production
- **Railway** (backend): Set environment variables in Railway dashboard
- **Vercel** (frontend): Set environment variables in Vercel dashboard

**⚠️ Production uses different .env files than local!**

---

## 📚 Additional Resources

- [Backend README](./backend/readme.md)
- [Environment Variables Guide](./docs/ENVIRONMENT_VARIABLES.md)
- [Architecture Guide](./docs/ARCHITECTURE_COMPARISON.md)
- [Mario Theme Guide](./docs/MARIO_THEME_CONSISTENCY_GUIDE.md)

---

## 🆘 Getting Help

If you encounter issues:
1. Check this guide's Troubleshooting section
2. Review the [docs/](./docs) folder
3. Check Railway logs (backend): `railway logs`
4. Check Vercel logs (frontend): `vercel logs`

---

## ✅ Checklist

Before starting development:
- [ ] Node.js >= 20 installed
- [ ] PostgreSQL database ready (local or cloud)
- [ ] `backend/.env.local` configured
- [ ] `frontend/.env.local` configured
- [ ] Database migrations run (`npm run db:migrate`)
- [ ] Backend running on port 8000
- [ ] Frontend running on port 3000
- [ ] Working on `dev` or feature branch (NOT `main`)

Happy coding! 🎮✨
