-- Performance Indexes for Production Database
-- Target: TokenDiscovery table (warp-pipes feed queries)

CREATE INDEX IF NOT EXISTS token_discovery_state_volume
ON "TokenDiscovery" (state, volume24h DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS token_discovery_state_newest
ON "TokenDiscovery" (state, "firstSeenAt" DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS token_discovery_state_changed
ON "TokenDiscovery" (state, "stateChangedAt" DESC NULLS LAST);
