-- Reclassify tokens from 'graduating' to 'new' if they have < 30% bonding curve progress
-- This fixes tokens that were misclassified under the old 15% threshold
UPDATE "TokenDiscovery" 
SET 
  state = 'new', 
  "stateChangedAt" = NOW()
WHERE 
  state = 'graduating' 
  AND "bondingCurveProgress" < 30 
  AND "firstSeenAt" > NOW() - INTERVAL '24 hours'
RETURNING 
  mint, 
  symbol, 
  "bondingCurveProgress",
  "firstSeenAt";
