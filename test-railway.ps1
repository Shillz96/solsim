# Test Railway Deployment
# Run this script to check if deployment is complete

Write-Host "Testing Railway Production Deployment..." -ForegroundColor Cyan
Write-Host ""

$url = "https://lovely-nature-production.up.railway.app"
$testToken = "DMsQLYy313XXQhZSwtigKVWoUbEWqfsANTpXD5WBbonk"

# Test 1: Health Check
Write-Host "1. Checking server health..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$url/health" -Method Get
    $uptime = [math]::Round($health.uptime)
    $uptimeMin = [math]::Round($uptime / 60, 1)
    Write-Host "   ✅ Server Status: $($health.status)" -ForegroundColor Green
    Write-Host "   ✅ Uptime: $uptime seconds ($uptimeMin minutes)" -ForegroundColor Green
    Write-Host "   ✅ Database: $($health.services.database.status)" -ForegroundColor Green
    
    if ($uptime -lt 30) {
        Write-Host "   ⚠️  Server just restarted - migration may still be processing" -ForegroundColor Yellow
    }
    Write-Host ""
} catch {
    Write-Host "   ❌ Health check failed: $_" -ForegroundColor Red
    exit 1
}

# Test 2: Token Search
Write-Host "2. Testing token search..." -ForegroundColor Yellow
try {
    $searchUrl = "$url/api/v1/market/search?q=$testToken"
    $result = Invoke-RestMethod -Uri $searchUrl -Method Get
    
    if ($result.data.tokens.Count -gt 0) {
        $token = $result.data.tokens[0]
        Write-Host "   ✅ Token found!" -ForegroundColor Green
        Write-Host "   ✅ Symbol: $($token.symbol)" -ForegroundColor Green
        Write-Host "   ✅ Name: $($token.name)" -ForegroundColor Green
        Write-Host "   ✅ Price: $($token.price)" -ForegroundColor Green
        Write-Host "   ✅ Market Cap: $($token.marketCap)" -ForegroundColor Green
        Write-Host "   ✅ Image: $($token.imageUrl)" -ForegroundColor Green
        Write-Host ""
        Write-Host "🎉 DEPLOYMENT SUCCESSFUL! Token search is working!" -ForegroundColor Green
    } else {
        Write-Host "   ⏳ Token not found yet - migration may still be running" -ForegroundColor Yellow
        Write-Host "   Wait 1-2 minutes and run this script again" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ❌ Search failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "To manually test:" -ForegroundColor Cyan
Write-Host "curl `"$searchUrl`"" -ForegroundColor White
