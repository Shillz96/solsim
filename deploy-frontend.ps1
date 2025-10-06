# SolSim Frontend Deployment Script for Vercel (PowerShell)
# This script automates the Vercel frontend deployment process

$ErrorActionPreference = "Stop"

Write-Host "🚀 SolSim Frontend Deployment to Vercel" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Vercel CLI is installed
if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Vercel CLI is not installed." -ForegroundColor Red
    Write-Host "📦 Install it with: npm install -g vercel" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Vercel CLI found" -ForegroundColor Green
Write-Host ""

# Navigate to frontend directory
Set-Location "$PSScriptRoot\frontend"

Write-Host "📂 Current directory: $(Get-Location)" -ForegroundColor Blue
Write-Host ""

# Check if logged in to Vercel
Write-Host "🔐 Checking Vercel authentication..." -ForegroundColor Blue
try {
    vercel whoami | Out-Null
    Write-Host "✅ Already logged in to Vercel" -ForegroundColor Green
} catch {
    Write-Host "❌ Not logged in to Vercel" -ForegroundColor Red
    Write-Host "🔑 Running: vercel login" -ForegroundColor Yellow
    vercel login
}
Write-Host ""

# Prompt for backend URL
Write-Host "🔗 Enter your Railway backend URL (e.g., https://solsim-backend.up.railway.app):" -ForegroundColor Yellow
$BACKEND_URL = Read-Host

if ([string]::IsNullOrWhiteSpace($BACKEND_URL)) {
    Write-Host "❌ Backend URL is required!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Set environment variables for production
Write-Host "⚙️  Setting environment variables..." -ForegroundColor Blue

# NEXT_PUBLIC_API_URL
Write-Host "Setting NEXT_PUBLIC_API_URL..." -ForegroundColor Gray
$BACKEND_URL | vercel env add NEXT_PUBLIC_API_URL production

# NEXT_PUBLIC_ENV
Write-Host "Setting NEXT_PUBLIC_ENV..." -ForegroundColor Gray
"production" | vercel env add NEXT_PUBLIC_ENV production

Write-Host "✅ Environment variables set" -ForegroundColor Green
Write-Host ""

# Deploy to production
Write-Host "🚀 Deploying to Vercel production..." -ForegroundColor Blue
vercel --prod --yes
Write-Host ""

# Get deployment URL
Write-Host "🌐 Getting deployment URL..." -ForegroundColor Blue
$deploymentInfo = vercel ls --prod 2>&1 | Out-String
$FRONTEND_URL = if ($deploymentInfo -match 'https://[^\s]+') { $matches[0] } else { $null }

if ([string]::IsNullOrWhiteSpace($FRONTEND_URL)) {
    Write-Host "⚠️  Could not automatically detect URL. Please check Vercel dashboard." -ForegroundColor Yellow
    Write-Host "📊 Dashboard: https://vercel.com/dashboard" -ForegroundColor Cyan
    $FRONTEND_URL = "https://solsim.vercel.app"
} else {
    Write-Host "✅ Frontend deployed at: $FRONTEND_URL" -ForegroundColor Green
}
Write-Host ""

# Final instructions
Write-Host "✅ Frontend Deployment Complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Frontend URL: $FRONTEND_URL" -ForegroundColor Cyan
Write-Host "🔗 Backend URL: $BACKEND_URL" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Yellow
Write-Host "   1. Test your frontend: $FRONTEND_URL"
Write-Host "   2. Update backend CORS settings:"
Write-Host "      cd ..\backend"
Write-Host "      railway variables set FRONTEND_ORIGIN=$FRONTEND_URL"
Write-Host "      railway up"
Write-Host "   3. Test the full connection by logging in"
Write-Host ""
Write-Host "⚙️  If you need to update NEXT_PUBLIC_APP_URL:" -ForegroundColor Yellow
Write-Host "   vercel env add NEXT_PUBLIC_APP_URL production"
Write-Host "   Then enter: $FRONTEND_URL"
Write-Host "   Finally: vercel --prod"
Write-Host ""
Write-Host "📊 Monitor your deployment:" -ForegroundColor Yellow
Write-Host "   - View logs: vercel logs production"
Write-Host "   - Check env vars: vercel env ls"
Write-Host "   - Dashboard: https://vercel.com/dashboard"
Write-Host ""

