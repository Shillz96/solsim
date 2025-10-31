# Token Classification Debug - October 31, 2025

## Problem
New tokens like "peanut the kitkat" (9tAHpZJQKi6C3BsMPihyT39fJiD2ioAZUDvhmggDpump) are:
- ✅ Being received by PumpPortal WebSocket
- ✅ Passing validation (have metadata)
- ❌ NOT showing up in "NEW" column on /warp-pipes page

## Root Cause

Token state classification logic at line 645:

```typescript
// NEW: Brand new launches (< 30% progress)
if (progress < TokenDiscoveryConfig.NEW_TOKEN_MAX_PROGRESS) {
  tokenState = 'new';
}
// GRADUATING: Actively progressing towards completion (30-99%)
else if (progress >= TokenDiscoveryConfig.GRADUATING_MIN_PROGRESS &&
         progress < TokenDiscoveryConfig.GRADUATING_MAX_PROGRESS) {
  tokenState = 'graduating';
}
```

But `NEW_TOKEN_MAX_PROGRESS` was changed to **15%** (line 68):

```typescript
static readonly NEW_TOKEN_MAX_PROGRESS = 15; // 15% (was 30 - wider NEW category)
```

This means:
- Tokens with 0-15% progress → 'new' ✅
- Tokens with 15-100% progress → 'graduating' ❌
- Tokens with 100% progress → 'bonded'

**The problem**: Most tokens launch with some initial liquidity and immediately have 20-40% bonding curve progress, so they skip the 'new' state entirely!

## The Comment Contradiction

Line 645 comment says:
```typescript
// NEW: Brand new launches (< 30% progress)
```

But the actual threshold is **15%**! The comment is outdated.

## Solutions

### Option 1: Increase NEW_TOKEN_MAX_PROGRESS to 30% (RECOMMENDED)
```typescript
static readonly NEW_TOKEN_MAX_PROGRESS = 30; // 30% (catch early launches)
static readonly GRADUATING_MIN_PROGRESS = 30; // 30% (was 15)
```

**Pros**:
- More tokens appear in "NEW" column
- Matches user expectations
- Tokens spend time in each state

**Cons**:
- None

### Option 2: Lower GRADUATING_MIN_PROGRESS to Match
```typescript
static readonly GRADUATING_MIN_PROGRESS = 15; // Match NEW_TOKEN_MAX_PROGRESS
```

**Pros**:
- Keeps current 15% threshold

**Cons**:
- Still misses tokens that launch at 15-30%
- Less visibility for new launches

### Option 3: Overlapping Ranges (BEST)
```typescript
static readonly NEW_TOKEN_MAX_PROGRESS = 40; // 40% (generous NEW window)
static readonly GRADUATING_MIN_PROGRESS = 30; // 30% (start graduating early)
```

**Pros**:
- Tokens from 0-40% show in NEW
- Tokens from 30-100% show in GRADUATING
- 30-40% overlap = tokens appear in BOTH columns
- More visibility overall

**Cons**:
- Slight duplication (actually a feature!)

## Recommended Fix

Change to 30/30 split (no overlap):

```typescript
// State classification thresholds - GMGN/Photon style (show tokens EARLY)
static readonly GRADUATING_MIN_PROGRESS = 30; // 30% (was 15)
static readonly GRADUATING_MAX_PROGRESS = 100; // 100%
static readonly NEW_TOKEN_MAX_PROGRESS = 30; // 30% (was 15 - show more new launches)
```

Update comment at line 645:
```typescript
// NEW: Brand new launches (< 30% progress)
if (progress < TokenDiscoveryConfig.NEW_TOKEN_MAX_PROGRESS) {
  tokenState = 'new';
}
// GRADUATING: Actively progressing towards completion (30-100%)
else if (progress >= TokenDiscoveryConfig.GRADUATING_MIN_PROGRESS &&
         progress < TokenDiscoveryConfig.GRADUATING_MAX_PROGRESS) {
  tokenState = 'graduating';
}
```

## Expected Impact

**Before** (15% threshold):
- NEW column: Tokens with 0-15% progress only
- Most tokens skip NEW state entirely
- Users complain "new tokens not showing"

**After** (30% threshold):
- NEW column: Tokens with 0-30% progress
- More tokens visible in NEW state
- Matches GMGN/Photon behavior

## Migration

After deploying the fix, tokens currently in 'graduating' state with <30% progress will need to be reclassified:

```sql
-- Find tokens misclassified as graduating
SELECT 
  mint, 
  symbol, 
  "bondingCurveProgress",
  state,
  "firstSeenAt"
FROM "TokenDiscovery"
WHERE state = 'graduating' 
  AND "bondingCurveProgress" < 30
  AND "firstSeenAt" > NOW() - INTERVAL '24 hours'
ORDER BY "firstSeenAt" DESC;

-- Reclassify them to 'new'
UPDATE "TokenDiscovery"
SET 
  state = 'new',
  "stateChangedAt" = NOW()
WHERE state = 'graduating' 
  AND "bondingCurveProgress" < 30
  AND "firstSeenAt" > NOW() - INTERVAL '24 hours';
```

## Testing

After deploying:
1. Check /warp-pipes page
2. Verify NEW column has tokens
3. Check Railway logs for: `[TokenDiscovery] 🎯 handleNewToken called`
4. Verify state classification: Should see more tokens in 'new' state
