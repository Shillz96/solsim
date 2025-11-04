-- Check dead tokens and database health
SELECT
  COUNT(*) as total_tokens,
  COUNT(*) FILTER (WHERE state = 'bonded') as bonded,
  COUNT(*) FILTER (WHERE state = 'graduated') as graduated,
  COUNT(*) FILTER (WHERE state = 'graduating') as graduating,
  COUNT(*) FILTER (WHERE "lastTradeTs" < NOW() - INTERVAL '7 days') as inactive_7d,
  COUNT(*) FILTER (WHERE "lastTradeTs" < NOW() - INTERVAL '3 days') as inactive_3d,
  COUNT(*) FILTER (WHERE "volume24h" = 0 OR "volume24h" IS NULL) as zero_volume
FROM "TokenDiscovery";
