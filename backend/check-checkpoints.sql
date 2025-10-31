-- Check recent checkpoint activity
-- Run this a few times over 30 minutes to see if checkpoints are less frequent

SELECT 
  'Current Time' as metric,
  NOW() as value
UNION ALL
SELECT 
  'Last Checkpoint',
  pg_last_wal_replay_lsn()::text
UNION ALL
SELECT
  'WAL Position',
  pg_current_wal_lsn()::text;

-- Check database activity
SELECT 
  datname,
  xact_commit as commits,
  xact_rollback as rollbacks,
  blks_read,
  blks_hit,
  tup_returned,
  tup_fetched,
  tup_inserted,
  tup_updated,
  tup_deleted
FROM pg_stat_database
WHERE datname = current_database();

-- Check table write activity (should be much lower now)
SELECT 
  schemaname,
  relname,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes,
  n_tup_hot_upd as hot_updates,
  last_vacuum,
  last_autovacuum
FROM pg_stat_user_tables
WHERE relname = 'TokenDiscovery'
ORDER BY n_tup_upd DESC;
