# Token Discovery Cleanup Script for Railway PostgreSQL
# Connects to Railway database and cleans out tokens older than 2 days

# Set environment variables
$env:PGPASSWORD = "cmvCRszpAAfgyvOZaWrHrWJxeEvvYbZb"
$host = "metro.proxy.rlwy.net"
$port = "13936"
$database = "railway"
$username = "postgres"

Write-Host "🚀 Connecting to Railway PostgreSQL database..." -ForegroundColor Cyan
Write-Host "Host: $host" -ForegroundColor Gray
Write-Host "Database: $database" -ForegroundColor Gray
Write-Host "" 

# Check if psql is available
try {
    psql --version | Out-Null
    Write-Host "✅ psql found" -ForegroundColor Green
} catch {
    Write-Host "❌ psql not found. Please install PostgreSQL client tools." -ForegroundColor Red
    Write-Host "Download from: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    exit 1
}

Write-Host "🧹 Running token cleanup script..." -ForegroundColor Yellow
Write-Host "This will delete all tokens older than 2 days" -ForegroundColor Yellow
Write-Host ""

# Run the cleanup script
try {
    psql -h $host -U $username -p $port -d $database -f "cleanup-tokens.sql"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Token cleanup completed successfully!" -ForegroundColor Green
        Write-Host "Database has been optimized and is ready for launch." -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "❌ Cleanup failed with exit code: $LASTEXITCODE" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error running cleanup script: $_" -ForegroundColor Red
}

# Clear the password from environment
$env:PGPASSWORD = ""

Write-Host ""
Write-Host "🔒 Database connection closed." -ForegroundColor Gray