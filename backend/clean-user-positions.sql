-- Clean all trading data for user 4ebc8c0d-867f-499e-8287-fb9064c0b7f0
-- This will reset their portfolio completely

BEGIN;

-- Check current state before cleaning
SELECT 
  'Before cleanup' as status,
  (SELECT COUNT(*) FROM "Position" WHERE "userId" = '4ebc8c0d-867f-499e-8287-fb9064c0b7f0') as positions,
  (SELECT COUNT(*) FROM "PositionLot" WHERE "userId" = '4ebc8c0d-867f-499e-8287-fb9064c0b7f0') as lots,
  (SELECT COUNT(*) FROM "Trade" WHERE "userId" = '4ebc8c0d-867f-499e-8287-fb9064c0b7f0') as trades,
  (SELECT COUNT(*) FROM "RealizedPnL" WHERE "userId" = '4ebc8c0d-867f-499e-8287-fb9064c0b7f0') as realized_pnl;

-- Delete realized P&L records (note: capital L in RealizedPnL)
DELETE FROM "RealizedPnL" WHERE "userId" = '4ebc8c0d-867f-499e-8287-fb9064c0b7f0';

-- Delete position lots (FIFO tracking)
DELETE FROM "PositionLot" WHERE "userId" = '4ebc8c0d-867f-499e-8287-fb9064c0b7f0';

-- Delete positions
DELETE FROM "Position" WHERE "userId" = '4ebc8c0d-867f-499e-8287-fb9064c0b7f0';

-- Delete trade history
DELETE FROM "Trade" WHERE "userId" = '4ebc8c0d-867f-499e-8287-fb9064c0b7f0';

-- Check state after cleaning
SELECT 
  'After cleanup' as status,
  (SELECT COUNT(*) FROM "Position" WHERE "userId" = '4ebc8c0d-867f-499e-8287-fb9064c0b7f0') as positions,
  (SELECT COUNT(*) FROM "PositionLot" WHERE "userId" = '4ebc8c0d-867f-499e-8287-fb9064c0b7f0') as lots,
  (SELECT COUNT(*) FROM "Trade" WHERE "userId" = '4ebc8c0d-867f-499e-8287-fb9064c0b7f0') as trades,
  (SELECT COUNT(*) FROM "RealizedPnL" WHERE "userId" = '4ebc8c0d-867f-499e-8287-fb9064c0b7f0') as realized_pnl;

-- Show user's current balance
SELECT 
  id,
  email,
  "virtualSolBalance" as sol_balance,
  "createdAt"
FROM "User" 
WHERE id = '4ebc8c0d-867f-499e-8287-fb9064c0b7f0';

COMMIT;
