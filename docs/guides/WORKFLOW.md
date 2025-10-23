# VirtualSol Development Workflow

This document outlines the complete development workflow for the VirtualSol project, including local development, testing, and deployment procedures.

## Table of Contents

1. [Project Structure](#project-structure)
2. [Git Branching Strategy](#git-branching-strategy)
3. [Local Development Setup](#local-development-setup)
4. [Development Workflow](#development-workflow)
5. [Testing](#testing)
6. [Deployment](#deployment)
7. [Common Tasks](#common-tasks)
8. [Troubleshooting](#troubleshooting)

---

## Project Structure

```
SolSim/
├── backend/              # Fastify API server
│   ├── src/             # Source code
│   ├── prisma/          # Database schema and migrations
│   ├── .env.example     # Environment template
│   └── package.json
├── frontend/            # Next.js 15 application
│   ├── app/            # Next.js App Router
│   ├── components/     # React components
│   ├── lib/            # Utilities and API clients
│   ├── .env.example    # Environment template
│   └── package.json
├── packages/           # Shared packages (if any)
└── WORKFLOW.md        # This file
```

---

## Git Branching Strategy

We use a **three-branch strategy** to ensure safe development and deployment:

### Branch Overview

- **`main`** - Production branch (protected)
  - Always matches production deployments
  - Only merge from `staging` after thorough testing
  - Never commit directly to main

- **`staging`** - Pre-production testing branch
  - Used for final testing before production
  - Merge from `dev` when features are complete
  - Deploy to staging environments for testing

- **`dev`** - Active development branch
  - Primary branch for day-to-day development
  - All feature branches merge here first
  - Should always be in a working state

### Feature Branch Workflow

For new features or bug fixes:

```bash
# Create feature branch from dev
git checkout dev
git pull origin dev
git checkout -b feature/your-feature-name

# Make your changes and commit
git add .
git commit -m "feat: add your feature description"

# Push feature branch
git push origin feature/your-feature-name

# When ready, merge to dev
git checkout dev
git merge feature/your-feature-name
git push origin dev

# Delete feature branch (optional)
git branch -d feature/your-feature-name
git push origin --delete feature/your-feature-name
```

---

## Local Development Setup

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Shillz96/solsim.git
   cd SolSim
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies (workspaces)
   npm install

   # Install backend dependencies
   cd backend
   npm install
   cd ..

   # Install frontend dependencies
   cd frontend
   npm install
   cd ..
   ```

3. **Set up environment variables**

   **Backend** (`backend/.env`):
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your local configuration
   # See backend/.env.example for required variables
   ```

   **Frontend** (`frontend/.env.local`):
   ```bash
   cd frontend
   cp .env.example .env.local
   # Edit .env.local with your local configuration
   # At minimum, set:
   # NEXT_PUBLIC_API_URL=http://localhost:4000
   # NEXT_PUBLIC_WS_URL=ws://localhost:4000
   ```

4. **Set up the database**
   ```bash
   cd backend
   npm run prisma:generate    # Generate Prisma client
   npm run prisma:migrate     # Apply migrations
   npm run db:seed           # (Optional) Seed with test data
   ```

5. **Start Redis** (required for backend)
   ```bash
   # Using Docker:
   docker run -d -p 6379:6379 redis:alpine

   # Or install Redis locally
   ```

### Running Locally

**Option 1: Run both services separately (recommended)**

Terminal 1 (Backend):
```bash
cd backend
npm run dev
# Backend runs on http://localhost:4000
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
# Frontend runs on http://localhost:3000
```

**Option 2: Use root scripts**

Terminal 1:
```bash
npm run dev:backend
```

Terminal 2:
```bash
npm run dev:frontend
```

---

## Development Workflow

### Daily Development Flow

1. **Start your day**
   ```bash
   # Make sure you're on dev branch
   git checkout dev
   git pull origin dev

   # Start development servers (see above)
   ```

2. **Make changes**
   - Edit code in your IDE
   - Changes hot-reload automatically (frontend and backend)
   - Check browser console and terminal for errors

3. **Test your changes**
   ```bash
   # Backend tests
   cd backend
   npm test

   # Frontend tests
   cd frontend
   npm test

   # Type checking
   cd frontend
   npm run type-check
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "type: description"
   # Commit types: feat, fix, docs, style, refactor, test, chore
   ```

5. **Push to dev branch**
   ```bash
   git push origin dev
   ```

### When to Merge to Staging

Merge to `staging` when:
- A feature is complete and tested locally
- Multiple related changes are ready for production
- You want to test on staging environment before production

```bash
git checkout staging
git pull origin staging
git merge dev
git push origin staging

# Test on staging environment
# If issues found, fix on dev and re-merge
```

### When to Merge to Main (Production)

Merge to `main` only when:
- All testing on staging is complete
- No critical bugs exist
- You're ready to deploy to production

```bash
git checkout main
git pull origin main
git merge staging
git push origin main

# Deploy to production (see Deployment section)
```

---

## Testing

### Backend Testing

```bash
cd backend

# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- path/to/test.spec.ts
```

### Frontend Testing

```bash
cd frontend

# Run all tests
npm test

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage

# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix
```

### Manual Testing Checklist

Before deploying to production:

- [ ] Test user authentication (signup, login, logout)
- [ ] Test trading functionality (buy/sell)
- [ ] Test portfolio calculations (PnL accuracy)
- [ ] Test WebSocket price updates
- [ ] Test leaderboard updates
- [ ] Test rewards system
- [ ] Test on mobile viewport
- [ ] Check browser console for errors
- [ ] Check backend logs for errors

---

## Deployment

### Backend Deployment (Railway)

**Important:** Backend is deployed to Railway but NOT linked to GitHub.

#### Development/Staging Deployment

```bash
cd backend

# Make sure you're on the right branch
git checkout staging  # or dev

# Build and deploy
railway up

# Monitor logs
railway logs
```

#### Production Deployment

```bash
cd backend

# Make sure you're on main branch
git checkout main
git pull origin main

# Build and deploy
railway up

# Monitor logs
railway logs

# Check deployment status
railway status
```

**Railway Environment Variables:**
- Set via Railway dashboard or CLI
- Required variables listed in `backend/.env.example`
- Never commit secrets to git

### Frontend Deployment (Vercel)

**Important:** Frontend is deployed to Vercel but NOT linked to GitHub.

#### Development/Staging Deployment

```bash
cd frontend

# Make sure you're on the right branch
git checkout staging  # or dev

# Deploy to Vercel (preview)
npx vercel

# This creates a preview deployment
```

#### Production Deployment

```bash
cd frontend

# Make sure you're on main branch
git checkout main
git pull origin main

# Deploy to production
npx vercel --prod

# Follow prompts to confirm
```

**Vercel Environment Variables:**
- Set via Vercel dashboard
- Required variables listed in `frontend/.env.example`
- Different values for preview vs production
- Make sure `NEXT_PUBLIC_API_URL` points to Railway backend

### Deployment Checklist

Before deploying to production:

- [ ] All tests passing
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] No linting errors (`npm run lint`)
- [ ] Environment variables updated
- [ ] Database migrations applied (backend)
- [ ] Breaking changes documented
- [ ] Tested on staging environment
- [ ] Backend deployed before frontend (if API changes)

---

## Common Tasks

### Update Dependencies

```bash
# Backend
cd backend
npm update
npm audit fix

# Frontend
cd frontend
npm update
npm audit fix
```

### Database Operations

```bash
cd backend

# Create a new migration
npm run prisma:dev

# Apply migrations (production)
npm run prisma:migrate

# Reset database (WARNING: deletes all data)
npm run db:reset

# Seed database
npm run db:seed

# Open Prisma Studio (database GUI)
npx prisma studio
```

### Clean Build

```bash
# Backend
cd backend
rm -rf dist node_modules
npm install
npm run build

# Frontend
cd frontend
rm -rf .next node_modules
npm install
npm run build
```

### Check for Issues

```bash
# Backend
cd backend
npm test
npm run build

# Frontend
cd frontend
npm run type-check
npm run lint
npm test
npm run build
```

---

## Troubleshooting

### Backend Issues

**Port already in use:**
```bash
# Find process on port 4000
lsof -i :4000  # macOS/Linux
netstat -ano | findstr :4000  # Windows

# Kill the process or change PORT in .env
```

**Database connection errors:**
```bash
# Check DATABASE_URL in .env
# Verify PostgreSQL is running
# Run migrations: npm run prisma:migrate
```

**Redis connection errors:**
```bash
# Check REDIS_URL in .env
# Verify Redis is running
# Start Redis: docker run -p 6379:6379 redis:alpine
```

### Frontend Issues

**API connection errors:**
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Verify backend is running on specified port
- Check CORS settings in backend

**Build errors:**
```bash
# Clear cache and rebuild
rm -rf .next
npm run build
```

**Type errors:**
```bash
# Regenerate types from API
npm run type-check
```

### General Issues

**Git merge conflicts:**
```bash
# Abort merge
git merge --abort

# Or resolve conflicts manually and:
git add .
git commit -m "fix: resolve merge conflicts"
```

**Environment variable issues:**
- Always restart dev servers after changing .env files
- Check that all required variables are set
- Use `.env.example` as reference

---

## Quick Reference

### Git Commands
```bash
# Switch branches
git checkout dev
git checkout staging
git checkout main

# Pull latest changes
git pull origin <branch-name>

# Commit changes
git add .
git commit -m "type: message"

# Push changes
git push origin <branch-name>

# Create new branch
git checkout -b feature/name
```

### Development Commands
```bash
# Backend
npm run dev:backend      # Start backend dev server
npm run build:backend    # Build backend
npm test                 # Run backend tests (from backend/)

# Frontend
npm run dev:frontend     # Start frontend dev server
npm run build:frontend   # Build frontend
npm test                 # Run frontend tests (from frontend/)
```

### Deployment Commands
```bash
# Backend (Railway)
cd backend && railway up

# Frontend (Vercel)
cd frontend && npx vercel --prod
```

---

## Environment-Specific URLs

### Local Development
- Frontend: http://localhost:3000
- Backend: http://localhost:4000
- Backend WS: ws://localhost:4000

### Production
- Frontend: https://oneupsol.fun
- Backend: https://your-railway-url.railway.app
- Backend WS: wss://your-railway-url.railway.app

---

## Best Practices

1. **Always develop on `dev` branch**
2. **Test locally before pushing**
3. **Test on staging before production**
4. **Never commit secrets or .env files**
5. **Keep commits small and focused**
6. **Write descriptive commit messages**
7. **Run tests before deploying**
8. **Deploy backend before frontend if API changes**
9. **Monitor logs after deployment**
10. **Document breaking changes**

---

## Getting Help

- **Documentation:** See `ARCHITECTURE.md`, `CLAUDE.md`, `README.md`
- **Issues:** GitHub Issues (https://github.com/Shillz96/solsim/issues)
- **Backend Logs:** `railway logs` (from backend/)
- **Frontend Logs:** Vercel dashboard

---

Last Updated: October 2024
