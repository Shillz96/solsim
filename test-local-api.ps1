# Test the LOCAL Warp Pipes API
Write-Host "Testing LOCAL Warp Pipes API..." -ForegroundColor Green

try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/api/warp-pipes/feed" -UseBasicParsing
    $json = $response.Content | ConvertFrom-Json

    Write-Host "`nAPI Response:" -ForegroundColor Cyan
    Write-Host "BONDED: $($json.bonded.Count)" -ForegroundColor Yellow
    Write-Host "GRADUATING: $($json.graduating.Count)" -ForegroundColor Yellow
    Write-Host "NEW: $($json.new.Count)" -ForegroundColor Yellow

    if ($json.new -and $json.new.Count -gt 0) {
        Write-Host "`nSample NEW token:" -ForegroundColor Cyan
        Write-Host "Mint: $($json.new[0].mint)"
        Write-Host "Symbol: $($json.new[0].symbol)"
        Write-Host "Status: $($json.new[0].status)"
    } else {
        Write-Host "`n⚠️ NO NEW TOKENS IN API RESPONSE!" -ForegroundColor Red
    }

    if ($json._debug) {
        Write-Host "`nDebug Info:" -ForegroundColor Cyan
        $json._debug | ConvertTo-Json -Depth 2
    }

    Write-Host "`n✅ Full response keys:" -ForegroundColor Green
    $json.PSObject.Properties.Name | ForEach-Object { Write-Host "  - $_" }

} catch {
    Write-Host "`n❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Make sure backend is running on http://localhost:8000" -ForegroundColor Yellow
}
