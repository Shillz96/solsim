# Check Railway database migration status
Write-Host "🔍 Checking Prisma migration status in Railway..." -ForegroundColor Cyan
Write-Host ""

Write-Host "1️⃣ Checking if migrations table exists..." -ForegroundColor Yellow
railway run psql -c "SELECT COUNT(*) as migration_count FROM _prisma_migrations;"
Write-Host ""

Write-Host "2️⃣ Checking for TokenDiscovery migration..." -ForegroundColor Yellow
railway run psql -c "SELECT migration_name, finished_at FROM _prisma_migrations WHERE migration_name LIKE '%warp_pipes%' OR migration_name LIKE '%token_discovery%';"
Write-Host ""

Write-Host "3️⃣ Checking if TokenDiscovery table exists..." -ForegroundColor Yellow
railway run psql -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'TokenDiscovery';"
Write-Host ""

Write-Host "4️⃣ Counting tokens by state..." -ForegroundColor Yellow
railway run psql -c 'SELECT state, COUNT(*) as count FROM "TokenDiscovery" GROUP BY state;'
Write-Host ""

Write-Host "✅ Done!" -ForegroundColor Green
