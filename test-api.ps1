# Test the Warp Pipes API directly
Write-Host "Testing Warp Pipes API..." -ForegroundColor Green

$response = Invoke-WebRequest -Uri "https://oneupsol.fun/api/warp-pipes/feed" -UseBasicParsing
$json = $response.Content | ConvertFrom-Json

Write-Host "`nAPI Response:" -ForegroundColor Cyan
Write-Host "BONDED: $($json.bonded.Count)" -ForegroundColor Yellow
Write-Host "GRADUATING: $($json.graduating.Count)" -ForegroundColor Yellow
Write-Host "NEW: $($json.new.Count)" -ForegroundColor Yellow

if ($json.new.Count -gt 0) {
    Write-Host "`nSample NEW token:" -ForegroundColor Cyan
    $json.new[0] | ConvertTo-Json -Depth 2
} else {
    Write-Host "`n⚠️ NO NEW TOKENS IN API RESPONSE!" -ForegroundColor Red
}

if ($json._debug) {
    Write-Host "`nDebug Info:" -ForegroundColor Cyan
    $json._debug | ConvertTo-Json -Depth 2
}
