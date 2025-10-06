#!/bin/bash

# SolSim Frontend Deployment Script for Vercel
# This script automates the Vercel frontend deployment process

set -e  # Exit on error

echo "🚀 SolSim Frontend Deployment to Vercel"
echo "========================================"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI is not installed."
    echo "📦 Install it with: npm install -g vercel"
    exit 1
fi

echo "✅ Vercel CLI found"
echo ""

# Navigate to frontend directory
cd "$(dirname "$0")/frontend"

echo "📂 Current directory: $(pwd)"
echo ""

# Check if logged in to Vercel
echo "🔐 Checking Vercel authentication..."
if ! vercel whoami &> /dev/null; then
    echo "❌ Not logged in to Vercel"
    echo "🔑 Running: vercel login"
    vercel login
else
    echo "✅ Already logged in to Vercel"
fi
echo ""

# Prompt for backend URL
echo "🔗 Enter your Railway backend URL (e.g., https://solsim-backend.up.railway.app):"
read -r BACKEND_URL

if [ -z "$BACKEND_URL" ]; then
    echo "❌ Backend URL is required!"
    exit 1
fi
echo ""

# Set environment variables for production
echo "⚙️  Setting environment variables..."

# NEXT_PUBLIC_API_URL
vercel env add NEXT_PUBLIC_API_URL production <<EOF
$BACKEND_URL
EOF

# NEXT_PUBLIC_ENV
vercel env add NEXT_PUBLIC_ENV production <<EOF
production
EOF

echo "✅ Environment variables set"
echo ""

# Deploy to production
echo "🚀 Deploying to Vercel production..."
vercel --prod --yes
echo ""

# Get deployment URL
echo "🌐 Getting deployment URL..."
FRONTEND_URL=$(vercel ls --prod 2>&1 | grep -Eo 'https://[^ ]+' | head -1)

if [ -z "$FRONTEND_URL" ]; then
    echo "⚠️  Could not automatically detect URL. Please check Vercel dashboard."
    echo "📊 Dashboard: https://vercel.com/dashboard"
else
    echo "✅ Frontend deployed at: $FRONTEND_URL"
fi
echo ""

# Final instructions
echo "✅ Frontend Deployment Complete!"
echo "================================"
echo ""
echo "🌐 Frontend URL: $FRONTEND_URL"
echo "🔗 Backend URL: $BACKEND_URL"
echo ""
echo "📝 Next steps:"
echo "   1. Test your frontend: $FRONTEND_URL"
echo "   2. Update backend CORS settings:"
echo "      cd ../backend"
echo "      railway variables set FRONTEND_ORIGIN=$FRONTEND_URL"
echo "      railway up"
echo "   3. Test the full connection by logging in"
echo ""
echo "⚙️  If you need to update NEXT_PUBLIC_APP_URL:"
echo "   vercel env add NEXT_PUBLIC_APP_URL production"
echo "   Then enter: $FRONTEND_URL"
echo "   Finally: vercel --prod"
echo ""
echo "📊 Monitor your deployment:"
echo "   - View logs: vercel logs production"
echo "   - Check env vars: vercel env ls"
echo "   - Dashboard: https://vercel.com/dashboard"
echo ""

