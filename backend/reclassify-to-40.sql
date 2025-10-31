-- Reclassify tokens from 'graduating' to 'new' if they have < 40% bonding curve progress
UPDATE "TokenDiscovery" 
SET 
  state = 'new', 
  "stateChangedAt" = NOW()
WHERE 
  state = 'graduating' 
  AND "bondingCurveProgress" < 40;

-- Show count by state after update
SELECT state, COUNT(*) as count FROM "TokenDiscovery" GROUP BY state ORDER BY state;
