-- High-frequency query optimization indexes for VirtualSol
-- These indexes target the most common query patterns in the application

-- Index for trades by user, mint, and timestamp (descending for recent trades first)
-- Used in: trade history queries, PnL calculations, portfolio views
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_user_mint_ts 
ON trades(userId, mint, timestamp DESC);

-- Index for position lots with remaining quantity > 0 (only active positions)
-- Used in: FIFO trade execution, position management, portfolio calculations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_position_lots_remaining 
ON position_lots(qtyRemaining) 
WHERE qtyRemaining > 0;

-- Additional performance indexes based on common query patterns

-- Index for user sessions (auth lookups)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_user_id 
ON user_sessions(userId, createdAt DESC);

-- Index for portfolio entries by user and mint
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_portfolio_user_mint 
ON portfolio(userId, mint, updatedAt DESC);

-- Index for leaderboard queries (PnL rankings)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_portfolio_pnl_ranking 
ON portfolio(totalPnl DESC, userId) 
WHERE totalPnl IS NOT NULL;

-- Index for recent trades (trending/activity feed)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_recent_activity 
ON trades(timestamp DESC, userId, mint);

-- Index for user notes by mint (quick note lookups)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_notes_user_mint 
ON user_notes(userId, mint, createdAt DESC);

-- Index for reward claims (prevent double claiming)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reward_claims_user_type_date 
ON reward_claims(userId, rewardType, claimDate);

-- Composite index for wallet tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallet_tracking_user_wallet 
ON wallet_tracking(userId, walletAddress, isActive, createdAt DESC);

-- Print completion message
SELECT 'Performance indexes created successfully!' as status;