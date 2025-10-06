# SolSim Backend Deployment Script for Railway v4+ (Simplified)
# Railway CLI v4+ requires using the dashboard for environment variables

$ErrorActionPreference = "Stop"

Write-Host "🚀 SolSim Backend Deployment to Railway" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Note: Railway CLI v4+ changed the commands." -ForegroundColor Yellow
Write-Host "We'll use the dashboard for environment variables." -ForegroundColor Yellow
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

# Initialize Railway project
Write-Host "🆕 Initializing Railway project..." -ForegroundColor Blue
Write-Host "   Follow the prompts to create your project" -ForegroundColor Yellow
railway init
Write-Host ""

# Generate JWT_SECRET for user to copy
Write-Host "🔐 Generating secure JWT Secret..." -ForegroundColor Blue
$bytes = New-Object byte[] 48
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$JWT_SECRET = [Convert]::ToBase64String($bytes)
Write-Host ""
Write-Host "✅ Generated JWT Secret (copy this!):" -ForegroundColor Green
Write-Host "$JWT_SECRET" -ForegroundColor White
Write-Host ""

# Create a temporary file with the secret
$JWT_SECRET | Out-File -FilePath "jwt_secret.txt" -NoNewline
Write-Host "💾 JWT Secret also saved to: backend/jwt_secret.txt" -ForegroundColor Green
Write-Host ""

# Instructions for Railway dashboard
Write-Host "📝 IMPORTANT: Next Steps in Railway Dashboard" -ForegroundColor Yellow
Write-Host "=============================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Opening Railway dashboard in your browser..." -ForegroundColor Cyan
Start-Process "https://railway.app/dashboard"
Start-Sleep -Seconds 2
Write-Host ""
Write-Host "2. In the Railway dashboard:" -ForegroundColor Cyan
Write-Host "   a) Click 'Add Service' → PostgreSQL" -ForegroundColor White
Write-Host "   b) Click 'Add Service' → Redis" -ForegroundColor White
Write-Host "   c) Click on your backend service" -ForegroundColor White
Write-Host "   d) Go to 'Variables' tab" -ForegroundColor White
Write-Host "   e) Click 'Add Variable' and add these:" -ForegroundColor White
Write-Host ""
Write-Host "   Required Variables:" -ForegroundColor Yellow
Write-Host "   -------------------" -ForegroundColor Yellow
Write-Host "   JWT_SECRET=$JWT_SECRET" -ForegroundColor White
Write-Host "   NODE_ENV=production" -ForegroundColor White
Write-Host "   PORT=4002" -ForegroundColor White
Write-Host "   FRONTEND_ORIGIN=https://solsim.vercel.app" -ForegroundColor White
Write-Host "   DEV_AUTH_BYPASS=false" -ForegroundColor White
Write-Host "   DEXSCREENER_BASE_URL=https://api.dexscreener.com/latest" -ForegroundColor White
Write-Host ""
Write-Host "   Your API Keys (if you have them):" -ForegroundColor Yellow
Write-Host "   ----------------------------------" -ForegroundColor Yellow
Write-Host "   BIRDEYE_API_KEY=your-actual-key" -ForegroundColor White
Write-Host "   HELIUS_API_KEY=your-actual-key" -ForegroundColor White
Write-Host "   COINGECKO_API_KEY=your-actual-key" -ForegroundColor White
Write-Host ""
Write-Host "   Note: DATABASE_URL and REDIS_URL are set automatically" -ForegroundColor Green
Write-Host ""

Write-Host "⏸️  Press Enter after you've added the variables in the dashboard..." -ForegroundColor Yellow
Read-Host

# Deploy to Railway
Write-Host "🚀 Deploying to Railway..." -ForegroundColor Blue
railway up
Write-Host ""

# Get the domain
Write-Host "🌐 Getting deployment URL..." -ForegroundColor Blue
Write-Host "   Run: railway domain" -ForegroundColor Yellow
$BACKEND_URL = railway domain 2>&1 | Select-Object -Last 1
if ($BACKEND_URL) {
    Write-Host "✅ Backend URL: $BACKEND_URL" -ForegroundColor Green
    $BACKEND_URL | Out-File -FilePath "backend_url.txt" -NoNewline
    Write-Host "💾 Backend URL saved to: backend/backend_url.txt" -ForegroundColor Green
} else {
    Write-Host "⚠️  Could not get URL automatically. Check Railway dashboard." -ForegroundColor Yellow
}
Write-Host ""

# Run database migrations
Write-Host "🗄️  Running database migrations..." -ForegroundColor Blue
railway run npm run db:migrate:prod
Write-Host "✅ Migrations complete" -ForegroundColor Green
Write-Host ""

# Optional: Seed database
Write-Host "🌱 Do you want to seed the database with test data? (y/N)" -ForegroundColor Yellow
$SEED_RESPONSE = Read-Host
if ($SEED_RESPONSE -eq "y" -or $SEED_RESPONSE -eq "Y") {
    Write-Host "🌱 Seeding database..." -ForegroundColor Blue
    railway run npm run db:seed
    Write-Host "✅ Database seeded" -ForegroundColor Green
}
Write-Host ""

# Final instructions
Write-Host "✅ Backend Deployment Complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""
if ($BACKEND_URL) {
    Write-Host "🌐 Backend URL: $BACKEND_URL" -ForegroundColor Cyan
    Write-Host ""
}
Write-Host "📝 Next steps:" -ForegroundColor Yellow
Write-Host "   1. Test health endpoint: curl $BACKEND_URL/health" -ForegroundColor White
Write-Host "   2. Deploy frontend: cd ..\frontend ; .\deploy-frontend-simple.ps1" -ForegroundColor White
Write-Host "   3. After frontend deploys, update FRONTEND_ORIGIN in Railway dashboard" -ForegroundColor White
Write-Host ""
Write-Host "📊 Useful commands:" -ForegroundColor Yellow
Write-Host "   - View logs: railway logs" -ForegroundColor White
Write-Host "   - View variables: railway variables" -ForegroundColor White
Write-Host "   - Open dashboard: railway open" -ForegroundColor White
Write-Host ""

# Clean up
Write-Host "🧹 Cleaning up temporary files..." -ForegroundColor Blue
Write-Host "   (Keeping jwt_secret.txt and backend_url.txt for your reference)" -ForegroundColor Yellow
Write-Host ""
Write-Host "✅ Done! Check the Railway dashboard for deployment status." -ForegroundColor Green
Write-Host ""

