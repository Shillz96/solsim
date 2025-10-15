-- Performance Optimization: Add missing database indexes
-- Apply this via Railway Postgres: railway connect -s Postgres
-- Then run: \i add_performance_indexes.sql

-- 1. Position: Index for portfolio queries filtering by qty > 0
CREATE INDEX IF NOT EXISTS "user_positions_by_qty" ON "Position" ("userId", "qty" DESC);

-- 2. RealizedPnL: Index for mint-specific PnL queries
CREATE INDEX IF NOT EXISTS "mint_pnl_chronological" ON "RealizedPnL" ("mint", "createdAt" DESC);

-- 3. Trade: Index for buy/sell history queries
CREATE INDEX IF NOT EXISTS "user_trade_side" ON "Trade" ("userId", "side", "createdAt" DESC);

-- Verify indexes were created
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE indexname IN ('user_positions_by_qty', 'mint_pnl_chronological', 'user_trade_side')
ORDER BY tablename, indexname;
