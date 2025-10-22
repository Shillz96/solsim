# Quick Start Guide - VirtualSol

This is a quick reference guide for common development tasks. For detailed information, see [WORKFLOW.md](./WORKFLOW.md).

## First Time Setup

```bash
# 1. Clone and install
git clone https://github.com/Shillz96/solsim.git
cd SolSim
npm install

# 2. Install backend dependencies
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration (see ENVIRONMENT_SETUP.md)

# 3. Install frontend dependencies
cd ../frontend
npm install
cp .env.example .env.local
# Edit .env.local with your configuration

# 4. Set up database (from backend directory)
cd ../backend
npm run prisma:generate
npm run prisma:migrate
npm run db:seed  # Optional: add test data

# 5. Start Redis
docker run -d -p 6379:6379 redis:alpine
```

## Daily Development

### Start Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# Runs on http://localhost:4000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# Runs on http://localhost:3000
```

Or from root:
```bash
# Terminal 1
npm run dev:backend

# Terminal 2
npm run dev:frontend
```

## Git Workflow

### Working on Features

```bash
# Always work on dev branch
git checkout dev
git pull origin dev

# Make changes and commit
git add .
git commit -m "feat: your feature description"
git push origin dev
```

### Testing Before Production

```bash
# Merge dev to staging for testing
git checkout staging
git merge dev
git push origin staging

# Test your changes
# If issues found, fix on dev and re-merge
```

### Deploying to Production

```bash
# 1. Merge staging to main
git checkout main
git merge staging
git push origin main

# 2. Deploy backend
cd backend
railway up
railway logs  # Monitor deployment

# 3. Deploy frontend
cd frontend
npx vercel --prod
```

## Common Commands

### From Root Directory

```bash
# Development
npm run dev:backend        # Start backend dev server
npm run dev:frontend       # Start frontend dev server

# Testing
npm run test:backend       # Run backend tests
npm run test:frontend      # Run frontend tests
npm run test              # Run all tests

# Building
npm run build:backend      # Build backend
npm run build:frontend     # Build frontend
npm run build             # Build both

# Database
npm run db:migrate         # Run database migrations
npm run db:generate        # Generate Prisma client
npm run db:studio         # Open Prisma Studio

# Deployment
npm run deploy:backend     # Deploy to Railway
npm run deploy:frontend    # Deploy to Vercel (production)

# Cleaning
npm run clean             # Remove all node_modules and build files
npm run clean:backend     # Clean backend only
npm run clean:frontend    # Clean frontend only
```

### Backend Commands (from backend/)

```bash
npm run dev               # Start dev server
npm run build            # Build for production
npm run start            # Run production build
npm test                 # Run tests
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Apply migrations
npm run db:seed         # Seed database
```

### Frontend Commands (from frontend/)

```bash
npm run dev              # Start dev server
npm run build           # Build for production
npm run start           # Run production build
npm test                # Run tests
npm run lint            # Run linter
npm run lint:fix        # Fix linting issues
npm run type-check      # Check TypeScript types
```

## Git Branch Strategy

- **`main`** - Production (protected, only merge from staging)
- **`staging`** - Pre-production testing (merge from dev)
- **`dev`** - Active development (your daily work)

```bash
# Switch branches
git checkout dev          # Development
git checkout staging      # Staging/testing
git checkout main         # Production
```

## Deployment Quick Reference

### Backend to Railway

```bash
cd backend
git checkout main        # or staging
railway up
railway logs            # Monitor
```

### Frontend to Vercel

```bash
cd frontend
git checkout main        # Production
npx vercel --prod

# Or preview (staging)
git checkout staging
npx vercel
```

## Troubleshooting

### Backend won't start
```bash
# Check environment variables
cat backend/.env

# Check services
docker ps  # Redis should be running
psql -U postgres -l  # PostgreSQL should be running

# Regenerate Prisma client
cd backend
npm run prisma:generate
```

### Frontend won't start
```bash
# Check environment variables
cat frontend/.env.local

# Should have:
# NEXT_PUBLIC_API_URL=http://localhost:4000
# NEXT_PUBLIC_WS_URL=ws://localhost:4000

# Clear cache
cd frontend
rm -rf .next
npm run dev
```

### Database issues
```bash
cd backend

# Check connection
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Reset (WARNING: deletes data)
npm run db:reset
```

### Port already in use
```bash
# Windows
netstat -ano | findstr :4000
netstat -ano | findstr :3000

# Mac/Linux
lsof -i :4000
lsof -i :3000

# Kill process or change PORT in .env
```

## Environment Files

### Backend (.env)
```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379
SOLANA_RPC=https://...
JWT_SECRET=your-secret-here
PORT=4000
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000
NEXT_PUBLIC_ENV=development
```

See [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md) for complete details.

## Project URLs

### Local
- Frontend: http://localhost:3000
- Backend: http://localhost:4000
- Prisma Studio: http://localhost:5555 (when running)

### Production
- Frontend: https://oneupsol.fun
- Backend: Your Railway URL
- GitHub: https://github.com/Shillz96/solsim

## Important Files

- `WORKFLOW.md` - Complete development workflow
- `ENVIRONMENT_SETUP.md` - Environment variable configuration
- `ARCHITECTURE.md` - System architecture details
- `CLAUDE.md` - Project guidance for Claude Code
- `README.md` - Project overview

## Getting Help

1. Check documentation in this directory
2. Check backend logs: `cd backend && railway logs`
3. Check frontend logs in Vercel dashboard
4. Create issue: https://github.com/Shillz96/solsim/issues

---

**Remember:** Always develop on `dev` branch, test on `staging`, and only merge to `main` when ready for production!
