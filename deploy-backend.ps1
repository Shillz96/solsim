# SolSim Backend Deployment Script for Railway (PowerShell)
# This script automates the Railway backend deployment process

$ErrorActionPreference = "Stop"

Write-Host "🚀 SolSim Backend Deployment to Railway" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Railway CLI is installed
if (-not (Get-Command railway -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Railway CLI is not installed." -ForegroundColor Red
    Write-Host "📦 Install it with: npm install -g @railway/cli" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Railway CLI found" -ForegroundColor Green
Write-Host ""

# Navigate to backend directory
Set-Location "$PSScriptRoot\backend"

Write-Host "📂 Current directory: $(Get-Location)" -ForegroundColor Blue
Write-Host ""

# Check if logged in to Railway
Write-Host "🔐 Checking Railway authentication..." -ForegroundColor Blue
try {
    railway whoami | Out-Null
    Write-Host "✅ Already logged in to Railway" -ForegroundColor Green
} catch {
    Write-Host "❌ Not logged in to Railway" -ForegroundColor Red
    Write-Host "🔑 Running: railway login" -ForegroundColor Yellow
    railway login
}
Write-Host ""

# Initialize Railway project if not already done
if (-not (Test-Path ".railway")) {
    Write-Host "🆕 Initializing Railway project..." -ForegroundColor Blue
    railway init -n solsim-backend
} else {
    Write-Host "✅ Railway project already initialized" -ForegroundColor Green
}
Write-Host ""

# Add PostgreSQL if not already added
Write-Host "🐘 Setting up PostgreSQL..." -ForegroundColor Blue
try {
    railway add --service postgres
} catch {
    Write-Host "PostgreSQL may already be added" -ForegroundColor Yellow
}
Write-Host ""

# Add Redis if not already added
Write-Host "🔴 Setting up Redis..." -ForegroundColor Blue
try {
    railway add --service redis
} catch {
    Write-Host "Redis may already be added" -ForegroundColor Yellow
}
Write-Host ""

# Generate JWT_SECRET
Write-Host "🔐 Generating JWT Secret..." -ForegroundColor Blue
$bytes = New-Object byte[] 48
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$JWT_SECRET = [Convert]::ToBase64String($bytes)
Write-Host "✅ JWT Secret generated: (saved for manual entry)" -ForegroundColor Green
Write-Host ""

# Note about environment variables
Write-Host "⚙️  Setting environment variables..." -ForegroundColor Blue
Write-Host "📝 Railway CLI v4+ requires setting variables through the dashboard." -ForegroundColor Yellow
Write-Host "   Opening Railway dashboard to set variables..." -ForegroundColor Yellow
Write-Host ""
Write-Host "   Please set these variables in the Railway dashboard:" -ForegroundColor Cyan
Write-Host "   - JWT_SECRET=$JWT_SECRET" -ForegroundColor White
Write-Host "   - NODE_ENV=production" -ForegroundColor White
Write-Host "   - PORT=4002" -ForegroundColor White
Write-Host "   - DEV_AUTH_BYPASS=false" -ForegroundColor White
Write-Host "   - DEXSCREENER_BASE_URL=https://api.dexscreener.com/latest" -ForegroundColor White
Write-Host ""
Write-Host "   DATABASE_URL and REDIS_URL will be set automatically by Railway" -ForegroundColor Green
Write-Host ""

# Open Railway dashboard
Start-Process "https://railway.app/dashboard"

# Prompt for API keys if needed
Write-Host ""
Write-Host "📝 Please set your API keys manually if not already set:" -ForegroundColor Yellow
Write-Host "   railway variables set BIRDEYE_API_KEY=your-key"
Write-Host "   railway variables set HELIUS_API_KEY=your-key"
Write-Host "   railway variables set COINGECKO_API_KEY=your-key"
Write-Host ""
Write-Host "⏸️  Press Enter to continue with deployment, or Ctrl+C to exit and set keys first..." -ForegroundColor Yellow
Read-Host

# Deploy to Railway
Write-Host "🚀 Deploying to Railway..." -ForegroundColor Blue
railway up
Write-Host ""

# Get the domain
Write-Host "🌐 Getting deployment URL..." -ForegroundColor Blue
$BACKEND_URL = railway domain 2>&1 | Select-Object -Last 1
Write-Host "✅ Backend deployed at: $BACKEND_URL" -ForegroundColor Green
Write-Host ""

# Run database migrations
Write-Host "🗄️  Running database migrations..." -ForegroundColor Blue
railway run npm run db:migrate:prod
Write-Host "✅ Migrations complete" -ForegroundColor Green
Write-Host ""

# Optional: Seed database
Write-Host "🌱 Do you want to seed the database? (y/N)" -ForegroundColor Yellow
$SEED_RESPONSE = Read-Host
if ($SEED_RESPONSE -eq "y" -or $SEED_RESPONSE -eq "Y") {
    Write-Host "🌱 Seeding database..." -ForegroundColor Blue
    railway run npm run db:seed
    Write-Host "✅ Database seeded" -ForegroundColor Green
}
Write-Host ""

# Show logs
Write-Host "📋 Recent logs:" -ForegroundColor Blue
railway logs --limit 20
Write-Host ""

# Final instructions
Write-Host "✅ Backend Deployment Complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Backend URL: $BACKEND_URL" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Yellow
Write-Host "   1. Save your backend URL: $BACKEND_URL"
Write-Host "   2. Test health endpoint: curl $BACKEND_URL/health"
Write-Host "   3. Set FRONTEND_ORIGIN after Vercel deployment:"
Write-Host "      railway variables set FRONTEND_ORIGIN=https://your-vercel-url.vercel.app"
Write-Host "   4. Deploy frontend with: cd ..\frontend ; vercel --prod"
Write-Host ""
Write-Host "📊 Monitor your deployment:" -ForegroundColor Yellow
Write-Host "   - View logs: railway logs --tail"
Write-Host "   - Check variables: railway variables"
Write-Host "   - Dashboard: https://railway.app/project"
Write-Host ""

