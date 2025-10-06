# Deploy Frontend to Vercel Script
# PowerShell script for Windows

Write-Host "🚀 Deploying SolSim Frontend to Vercel" -ForegroundColor Cyan
Write-Host ""

# Check if vercel CLI is installed
try {
    vercel --version | Out-Null
} catch {
    Write-Host "❌ Vercel CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "   npm install -g vercel" -ForegroundColor Yellow
    exit 1
}

Write-Host "📝 Environment Variables for Vercel:" -ForegroundColor Blue
Write-Host ""
Write-Host "NEXT_PUBLIC_API_URL=https://solsim-production.up.railway.app" -ForegroundColor Green
Write-Host "NEXT_PUBLIC_APP_URL=https://solsim.fun" -ForegroundColor Green
Write-Host "NEXT_PUBLIC_ENV=production" -ForegroundColor Green
Write-Host ""

Write-Host "🔧 Starting Vercel deployment..." -ForegroundColor Blue
Write-Host ""

# Deploy with Vercel
vercel --prod

Write-Host ""
Write-Host "✅ Deployment initiated!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host "1. If this is your first deployment, Vercel will ask you to:" -ForegroundColor White
Write-Host "   - Link to your Vercel account" -ForegroundColor White
Write-Host "   - Set up the project" -ForegroundColor White
Write-Host "   - Configure environment variables" -ForegroundColor White
Write-Host ""
Write-Host "2. Make sure to add the environment variables shown above in Vercel dashboard" -ForegroundColor White
Write-Host ""
Write-Host "3. After deployment, update FRONTEND_ORIGIN in Railway to your Vercel URL" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Your backend URL: https://solsim-production.up.railway.app" -ForegroundColor Cyan
Write-Host "🎮 Custom domain: https://solsim.fun" -ForegroundColor Cyan
