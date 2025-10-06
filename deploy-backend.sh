#!/bin/bash

# SolSim Backend Deployment Script for Railway
# This script automates the Railway backend deployment process

set -e  # Exit on error

echo "🚀 SolSim Backend Deployment to Railway"
echo "========================================"
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI is not installed."
    echo "📦 Install it with: npm install -g @railway/cli"
    exit 1
fi

echo "✅ Railway CLI found"
echo ""

# Navigate to backend directory
cd "$(dirname "$0")/backend"

echo "📂 Current directory: $(pwd)"
echo ""

# Check if logged in to Railway
echo "🔐 Checking Railway authentication..."
if ! railway whoami &> /dev/null; then
    echo "❌ Not logged in to Railway"
    echo "🔑 Running: railway login"
    railway login
else
    echo "✅ Already logged in to Railway"
fi
echo ""

# Initialize Railway project if not already done
if [ ! -f ".railway" ]; then
    echo "🆕 Initializing Railway project..."
    railway init -n solsim-backend
else
    echo "✅ Railway project already initialized"
fi
echo ""

# Add PostgreSQL if not already added
echo "🐘 Setting up PostgreSQL..."
railway add --service postgres || echo "PostgreSQL may already be added"
echo ""

# Add Redis if not already added
echo "🔴 Setting up Redis..."
railway add --service redis || echo "Redis may already be added"
echo ""

# Generate and set JWT_SECRET if not exists
echo "🔐 Generating JWT Secret..."
JWT_SECRET=$(openssl rand -base64 48)
railway variables set JWT_SECRET="$JWT_SECRET"
echo "✅ JWT Secret generated and set"
echo ""

# Set environment variables
echo "⚙️  Setting environment variables..."
railway variables set NODE_ENV=production
railway variables set PORT=4002
railway variables set DEV_AUTH_BYPASS=false
railway variables set DEXSCREENER_BASE_URL=https://api.dexscreener.com/latest

# Prompt for API keys if needed
echo ""
echo "📝 Please set your API keys manually if not already set:"
echo "   railway variables set BIRDEYE_API_KEY=your-key"
echo "   railway variables set HELIUS_API_KEY=your-key"
echo "   railway variables set COINGECKO_API_KEY=your-key"
echo ""
echo "⏸️  Press Enter to continue with deployment, or Ctrl+C to exit and set keys first..."
read -r

# Deploy to Railway
echo "🚀 Deploying to Railway..."
railway up
echo ""

# Get the domain
echo "🌐 Getting deployment URL..."
BACKEND_URL=$(railway domain 2>&1 | tail -n 1)
echo "✅ Backend deployed at: $BACKEND_URL"
echo ""

# Run database migrations
echo "🗄️  Running database migrations..."
railway run npm run db:migrate:prod
echo "✅ Migrations complete"
echo ""

# Optional: Seed database
echo "🌱 Do you want to seed the database? (y/N)"
read -r -n 1 SEED_RESPONSE
echo ""
if [[ $SEED_RESPONSE =~ ^[Yy]$ ]]; then
    echo "🌱 Seeding database..."
    railway run npm run db:seed
    echo "✅ Database seeded"
fi
echo ""

# Show logs
echo "📋 Recent logs:"
railway logs --limit 20
echo ""

# Final instructions
echo "✅ Backend Deployment Complete!"
echo "================================"
echo ""
echo "🌐 Backend URL: $BACKEND_URL"
echo ""
echo "📝 Next steps:"
echo "   1. Save your backend URL: $BACKEND_URL"
echo "   2. Test health endpoint: curl $BACKEND_URL/health"
echo "   3. Set FRONTEND_ORIGIN after Vercel deployment:"
echo "      railway variables set FRONTEND_ORIGIN=https://your-vercel-url.vercel.app"
echo "   4. Deploy frontend with: cd ../frontend && vercel --prod"
echo ""
echo "📊 Monitor your deployment:"
echo "   - View logs: railway logs --tail"
echo "   - Check variables: railway variables"
echo "   - Dashboard: https://railway.app/project"
echo ""

