# PnL Bug Analysis - 2025-10-27

## Problem Summary

After executing a buy trade in production (https://oneupsol.fun), the trade panel stats bar shows incorrect values:

### Observed Behavior
- **BOUGHT**: $0.00 ❌ (should show ~$199)
- **SOLD**: $0.00 ✅ (correct - no sells yet)
- **HOLDING**: $199-202 ✅ (correct value)
- **PNL**: Shows either `+$199 (+0.00%)` or `-$218 (-100.00%)` ❌ (should be ~$0)

### User Experience
- User bought 163.29 PAIN tokens for 1 SOL (~$199)
- Trade success message appeared: "1-UP! Trade executed!"
- Holding indicator updated correctly: "Holding: 163.29"
- But BOUGHT/SOLD remain at $0.00
- PnL calculation is wrong

## Root Cause Analysis

### API Investigation

**Test Results**:
```bash
curl "https://solsim-production.up.railway.app/api/portfolio/token-stats?userId=e072a09b-f94f-42a5-870c-1f9e3135a215&mint=1Qf8gESP4i6CFNWerUSDdLKJ9U1LpqTYvjJ2MM4pain&tradeMode=PAPER"
```

**Response**:
```json
{
  "mint": "1Qf8gESP4i6CFNWerUSDdLKJ9U1LpqTYvjJ2MM4pain",
  "totalBoughtUsd": "0.00",
  "totalSoldUsd": "0.00",
  "currentHoldingValue": "0.00",
  "currentHoldingQty": "0",
  "costBasis": "0",
  "realizedPnL": "0.00",
  "unrealizedPnL": "0.00",
  "totalPnL": "0.00",
  "totalFeesSol": "0.000000",
  "totalFeesUsd": "0.00",
  "tradeCount": 0
}
```

**ALL ZEROS!** This means the API cannot find the trade in the database.

### Frontend Calculation Logic

From `frontend/components/trade-panel/TradePanelContainer.tsx` (lines 96-102):

```typescript
// Calculate REAL-TIME PnL using live price + position data
const qty = tokenStats ? parseFloat(tokenStats.currentHoldingQty) : 0
const costBasis = tokenStats ? parseFloat(tokenStats.costBasis) : 0
const currentValue = qty * livePrice
const realtimeUnrealizedPnL = currentValue - costBasis
const realtimePnLPercent = costBasis > 0 ? (realtimeUnrealizedPnL / costBasis) * 100 : 0
```

**When `tokenStats` returns zeros:**
- `qty = 0`
- `costBasis = 0`
- `currentValue = 0 * livePrice = 0`
- `realtimeUnrealizedPnL = 0 - 0 = 0`
- `realtimePnLPercent = 0` (division by zero avoided)

**But the UI shows non-zero values!** This means either:
1. The `tokenStats` is cached/stale
2. There's a race condition where position exists but trades don't
3. The trade succeeded but wasn't saved to database

### Backend API Logic

From `backend/src/services/portfolioService.ts` (line 415+):

```typescript
export async function getTokenTradingStats(
  userId: string,
  mint: string,
  tradeMode: 'PAPER' | 'REAL' = 'PAPER'
) {
  // Redis cache (30s TTL)
  const cacheKey = `token:stats:${userId}:${mint}:${tradeMode}`;

  // Get all trades for this token
  const trades = await prisma.trade.findMany({
    where: {
      userId,
      mint,
      tradeMode
    },
    // ... process trades to calculate totalBoughtUsd, totalSoldUsd, etc.
  });

  // Get current position
  const position = await prisma.position.findUnique({
    where: {
      userId_mint_tradeMode: { userId, mint, tradeMode }
    }
  });

  // Returns zeros if no trades found
}
```

**The query is correct** - it's looking for trades with matching `userId`, `mint`, and `tradeMode`.

## Possible Causes

### 1. Trade Not Saved to Database ❌
**Likelihood**: High

The trade execution might be:
- Failing silently after success message
- Not committing the transaction
- Throwing an error after UI update but before DB save

**Evidence**:
- API returns `tradeCount: 0` (no trades found)
- Position might exist but no Trade records

### 2. Wrong Trade Mode Mismatch ⚠️
**Likelihood**: Medium

If the trade is saved with `tradeMode = 'REAL'` but API queries with `tradeMode = 'PAPER'`:
- Trade exists but won't be found by query
- Position might be created with correct tradeMode

**Check**: Verify tradeMode consistency in trade execution

### 3. Wrong User ID or Mint Address ⚠️
**Likelihood**: Low

If trade is saved with wrong userId or tokenAddress:
- API won't find it
- Position might still be created correctly

### 4. Redis Cache Stale Data ⚠️
**Likelihood**: Medium

If Redis cache has stale zeros and isn't invalidated after trade:
- Fresh trade won't show until cache expires (30s)
- But this doesn't explain why BASE API call returns zeros

### 5. Position Exists But Trades Don't ❌
**Likelihood**: High

Trade execution might:
1. Create/update Position successfully
2. Fail to create Trade record
3. Return success to frontend anyway

**This would explain**:
- "Holding: 163.29" shows correctly (from Position table)
- BOUGHT/SOLD show $0.00 (no Trade records)
- PnL calculation fails (no costBasis from trades)

## Diagnostic Steps

### Step 1: Check Database Directly
```sql
-- Check if Position exists
SELECT * FROM "Position"
WHERE "userId" = 'e072a09b-f94f-42a5-870c-1f9e3135a215'
  AND mint = '1Qf8gESP4i6CFNWerUSDdLKJ9U1LpqTYvjJ2MM4pain';

-- Check if Trade records exist
SELECT * FROM "Trade"
WHERE "userId" = 'e072a09b-f94f-42a5-870c-1f9e3135a215'
  AND mint = '1Qf8gESP4i6CFNWerUSDdLKJ9U1LpqTYvjJ2MM4pain'
ORDER BY "createdAt" DESC;

-- Check if PositionLot exists
SELECT * FROM "PositionLot"
WHERE "userId" = 'e072a09b-f94f-42a5-870c-1f9e3135a215'
  AND mint = '1Qf8gESP4i6CFNWerUSDdLKJ9U1LpqTYvjJ2MM4pain';
```

**Expected**:
- Position: 1 row (qty=163.29, costBasis=~199)
- Trade: 1 row (side=BUY, qty=163.29)
- PositionLot: 1 row (qtyRemaining=163.29)

### Step 2: Check Trade Execution Logs
```bash
railway logs -f | grep "Trade executed\|Trade error\|BUY order"
```

Look for:
- `[Trade] BUY order: userId=..., mint=1Qf8gESP...`
- Any errors after trade execution
- Transaction commit messages

### Step 3: Test Locally
```bash
cd backend
npm run dev

# In another terminal:
curl -X POST http://localhost:4000/api/trade \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "mint": "GLsuNSkEAwKPFDCEGoHkceNbHCqu981rCwhS3VXcpump",
    "side": "BUY",
    "qty": "10"
  }'

# Check if trade was saved:
curl "http://localhost:4000/api/portfolio/token-stats?userId=YOUR_USER_ID&mint=GLsuNSkEAwKPFDCEGoHkceNbHCqu981rCwhS3VXcpump&tradeMode=PAPER"
```

## Recommended Fixes

### Fix 1: Verify Trade Execution Code

Check `backend/src/services/tradeService.ts` - ensure trades are being saved:

```typescript
// After trade execution, verify Trade record is created:
const trade = await prisma.trade.create({
  data: {
    userId,
    mint,
    side,
    qty: q.toString(),
    // ... other fields
  }
});

console.log(`[Trade] Saved trade ID: ${trade.id}`);
```

### Fix 2: Clear Redis Cache After Trade

In `backend/src/services/tradeService.ts`, after successful trade:

```typescript
// Invalidate Redis cache for token stats
const cacheKey = `token:stats:${userId}:${mint}:${tradeMode}`;
await redis.del(cacheKey);
```

### Fix 3: Add Error Handling

Wrap trade execution in try/catch and log errors:

```typescript
try {
  const result = await fillTrade({ userId, mint, side, qty });
  console.log(`[Trade] Success: ${JSON.stringify(result)}`);
  return result;
} catch (error) {
  console.error(`[Trade] Failed:`, error);
  throw error; // Re-throw so frontend knows it failed
}
```

### Fix 4: Frontend Fallback

In `TradePanelContainer.tsx`, add fallback for missing stats:

```typescript
// If tokenStats is empty but we have a position, show warning
useEffect(() => {
  if (hasPosition && tokenStats && tokenStats.tradeCount === 0) {
    console.warn('[TradePanelContainer] Position exists but no trades found - possible data inconsistency');
  }
}, [hasPosition, tokenStats]);
```

## Testing Checklist

After applying fixes:

- [ ] Execute buy trade in local dev environment
- [ ] Verify Trade record is created in database
- [ ] Verify Position is updated correctly
- [ ] Verify PositionLot is created
- [ ] Check `/api/portfolio/token-stats` returns correct values
- [ ] Verify BOUGHT/SOLD display correctly in UI
- [ ] Verify PnL calculation is correct
- [ ] Test sell trade (partial and full)
- [ ] Deploy to staging and re-test
- [ ] Deploy to production

## Current Status

- **Production**: Broken (trades not showing in stats)
- **Bug Severity**: High (affects core trading functionality)
- **User Impact**: Confusing UX - users see success but stats don't update
- **Data Integrity**: Unknown - need to check if trades are actually saved

## Next Steps

1. **URGENT**: Check Railway database to see if Trade records exist
2. Review trade execution code for silent failures
3. Add comprehensive logging to trade flow
4. Test fix in local development
5. Deploy to staging for validation
6. Deploy to production once verified

---

**Created**: 2025-10-27
**Status**: Investigation Complete - Awaiting Database Check
