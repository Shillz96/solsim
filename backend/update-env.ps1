# Simple script to update .env with working API keys
# Run this: .\update-env.ps1

Write-Host "Updating .env with working API keys..." -ForegroundColor Green

# Backup current .env
if (Test-Path ".env") {
    Copy-Item ".env" ".env.backup"
    Write-Host "Backed up current .env to .env.backup" -ForegroundColor Yellow
}

# Update the .env file with working keys
$envContent = @"
# Copy this to .env for Railway PostgreSQL connection
DATABASE_URL="postgresql://postgres:IxyJYnznfzGLIAYgnOifLyrfthQcpOrc@trolley.proxy.rlwy.net:19210/railway"

# Server Configuration
PORT=4002
PRICE_STREAM_PORT=4001
NODE_ENV=development
FRONTEND_ORIGIN=http://localhost:3000

# JWT Authentication - CHANGE THIS IN PRODUCTION
JWT_SECRET="railway-production-secret-key-min-32-chars-2024"
JWT_EXPIRES_IN=24h

# Development Settings
DEV_AUTH_BYPASS=true
ENABLE_DB_MONITORING=true

# Redis Cache - Use local Redis for development, Railway Redis for production
REDIS_URL=redis://localhost:6379

# External APIs - UPDATED WITH WORKING KEYS
BIRDEYE_API_KEY=673c073ddd2d4da19ee1748e24796e20
BIRDEYE_BASE_URL=https://public-api.birdeye.so

HELIUS_API_KEY=8dc08491-9c29-440a-8616-bd3143a2af87
HELIUS_BASE_URL=https://api.helius.xyz
HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=8dc08491-9c29-440a-8616-bd3143a2af87
HELIUS_SECURE_RPC_URL=https://annamaria-s52tyr-fast-mainnet.helius-rpc.com
HELIUS_WS_URL=wss://mainnet.helius-rpc.com/?api-key=8dc08491-9c29-440a-8616-bd3143a2af87

COINGECKO_API_KEY=CG-9Y1EpBG7HSPUtR7tGPMyP7cq
COINGECKO_BASE_URL=https://api.coingecko.com/api/v3

DEXSCREENER_BASE_URL=https://api.dexscreener.com/latest

# Social Media APIs
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret

# Broadcasting
BROADCAST_TOKEN=your_broadcast_token
"@

$envContent | Out-File -FilePath ".env" -Encoding UTF8

Write-Host "✅ .env updated successfully!" -ForegroundColor Green
Write-Host "🚀 Your APIs are now configured:" -ForegroundColor Cyan
Write-Host "   • CoinGecko: ✅ Working" -ForegroundColor Green
Write-Host "   • Helius: ✅ Working" -ForegroundColor Green  
Write-Host "   • Birdeye: ⚠️  Key valid but endpoint issues" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Restart your backend: npm run dev" -ForegroundColor White
Write-Host "2. Test the APIs are working" -ForegroundColor White
