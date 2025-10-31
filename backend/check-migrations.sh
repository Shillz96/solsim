#!/bin/bash
# Check Railway database migration status

echo "🔍 Checking Prisma migration status in Railway..."
echo ""

# Check if _prisma_migrations table exists
echo "1️⃣ Checking if migrations table exists..."
railway run psql -c "SELECT COUNT(*) as migration_count FROM _prisma_migrations;" 2>/dev/null || echo "❌ _prisma_migrations table not found - DATABASE NOT INITIALIZED!"

echo ""
echo "2️⃣ Checking for TokenDiscovery migration..."
railway run psql -c "SELECT migration_name, finished_at FROM _prisma_migrations WHERE migration_name LIKE '%warp_pipes%' OR migration_name LIKE '%token_discovery%';" 2>/dev/null

echo ""
echo "3️⃣ Checking if TokenDiscovery table exists..."
railway run psql -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'TokenDiscovery';" 2>/dev/null

echo ""
echo "4️⃣ If table exists, count tokens by state..."
railway run psql -c 'SELECT state, COUNT(*) as count FROM "TokenDiscovery" GROUP BY state;' 2>/dev/null || echo "❌ TokenDiscovery table does not exist!"

echo ""
echo "✅ Done!"
