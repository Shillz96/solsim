# Real-time PnL Architecture (CURRENT - October 2025)

**CRITICAL**: This is the CURRENT architecture. Do NOT confuse with legacy polling-based systems.

## Overview

The trade panel displays real-time profit/loss (PnL) by combining:
1. **Position data from API** (fetched once, no polling)
2. **Live prices from WebSocket** (continuous real-time updates)

## How Trade Panel PnL Works

**File**: `frontend/components/trade-panel/TradePanelContainer.tsx`

### Data Sources

#### 1. Position Data from API (Fetched Once)

**Endpoint**: `GET /api/portfolio/token-stats`

**Parameters**:
- `userId`: User ID from auth token
- `mint`: Token address
- `tradeMode`: 'PAPER' or 'REAL'

**Returns**:
```typescript
{
  totalBoughtUsd: string,      // Sum of all buy trades in USD
  totalSoldUsd: string,        // Sum of all sell proceeds in USD
  currentHoldingQty: string,   // Current position quantity
  costBasis: string,           // Total cost of current position
  tradeCount: number           // Number of trades for this token
}
```

**Query Configuration** (line 71-81):
```typescript
useQuery({
  queryKey: ['token-stats', user?.id, tokenAddress],
  queryFn: () => api.getTokenTradingStats(user.id, tokenAddress, 'PAPER'),
  enabled: !!user?.id && !!tokenAddress,
  staleTime: 10000,              // 10 seconds
  refetchOnWindowFocus: false,   // Don't refetch on focus
  // NO refetchInterval - only refetch after trades
})
```

**Important**: This data is **only refetched manually** after trade execution via `refetchStats()` (lines 211, 293).

#### 2. Live Prices from WebSocket (Real-time)

**Context**: `usePriceStreamContext()` from `frontend/lib/price-stream-provider.tsx`

**Usage** (lines 63, 150-156):
```typescript
const { prices: livePrices, subscribe, unsubscribe } = usePriceStreamContext()

// Subscribe to token on mount
useEffect(() => {
  if (!tokenAddress) return
  subscribe(tokenAddress)
  return () => unsubscribe(tokenAddress)
}, [tokenAddress, subscribe, unsubscribe])

// Get live price
const livePrice = livePrices.get(tokenAddress)?.price || 0
```

**Updates**: Continuous, sub-second updates as WebSocket receives new prices.

### Frontend PnL Calculation (Lines 96-102)

```typescript
// Get position data from API (fetched once after trades)
const qty = tokenStats ? parseFloat(tokenStats.currentHoldingQty) : 0
const costBasis = tokenStats ? parseFloat(tokenStats.costBasis) : 0

// Get LIVE price from WebSocket
const livePrice = livePrices.get(tokenAddress)?.price || tokenDetails?.price || 0

// Calculate real-time PnL
const currentValue = qty * livePrice
const realtimeUnrealizedPnL = currentValue - costBasis
const realtimePnLPercent = costBasis > 0 ? (realtimeUnrealizedPnL / costBasis) * 100 : 0
```

**Key Points:**
- ✅ PnL updates in **real-time** as WebSocket price changes (< 1 second)
- ✅ No polling - position data fetched only after trades
- ✅ Calculation happens **client-side** for instant updates
- ✅ Falls back to `tokenDetails.price` if WebSocket hasn't connected yet
- ❌ DO NOT add polling intervals or usePositionPnL hook (removed in Oct 2025)

### What Gets Displayed

**Stats Bar Component** (lines 391-397):
```typescript
<TradePanelStatsBar
  bought={tokenStats ? parseFloat(tokenStats.totalBoughtUsd) : 0}
  sold={tokenStats ? parseFloat(tokenStats.totalSoldUsd) : 0}
  holdingValue={currentValue}
  pnl={realtimeUnrealizedPnL}
  pnlPercent={realtimePnLPercent}
/>
```

**Display Values**:
- **BOUGHT**: Sum of all buy trades in USD (from `tokenStats.totalBoughtUsd`)
- **SOLD**: Sum of all sell proceeds in USD (from `tokenStats.totalSoldUsd`)
- **HOLDING**: Current position value = `qty × livePrice` (real-time calculated)
- **PNL**: Unrealized PnL = `currentValue - costBasis` (real-time calculated)

## Backend API: `/api/portfolio/token-stats`

**File**: `backend/src/services/portfolioService.ts` (line 415+)

### Query Logic

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
    where: { userId, mint, tradeMode },
    select: {
      side: true,
      costUsd: true,
      proceedsUsd: true,
      totalCost: true,
      realizedPnL: true,
      feesSol: true,
      solUsdAtFill: true
    },
    orderBy: { createdAt: 'asc' }
  });

  // Calculate totals
  let totalBoughtUsd = D(0);
  let totalSoldUsd = D(0);
  let totalRealizedPnL = D(0);

  for (const trade of trades) {
    if (trade.side === 'BUY') {
      totalBoughtUsd = totalBoughtUsd.add(D(trade.costUsd || 0));
    } else if (trade.side === 'SELL') {
      totalSoldUsd = totalSoldUsd.add(D(trade.proceedsUsd || 0));
      totalRealizedPnL = totalRealizedPnL.add(D(trade.realizedPnL || 0));
    }
  }

  // Get current position
  const position = await prisma.position.findUnique({
    where: {
      userId_mint_tradeMode: { userId, mint, tradeMode }
    },
    select: { qty: true, costBasis: true }
  });

  return {
    mint,
    totalBoughtUsd: totalBoughtUsd.toFixed(2),
    totalSoldUsd: totalSoldUsd.toFixed(2),
    currentHoldingQty: position ? D(position.qty).toFixed(9) : '0',
    costBasis: position ? D(position.costBasis).toFixed(2) : '0',
    realizedPnL: totalRealizedPnL.toFixed(2),
    tradeCount: trades.length
  };
}
```

### Redis Cache

- **Key**: `token:stats:{userId}:{mint}:{tradeMode}`
- **TTL**: 30 seconds
- **Purpose**: Reduce database load for repeated requests
- **Note**: Cache is NOT used by frontend (frontend caches via React Query)

## Trade Execution Flow

### Frontend Flow (`useTradeExecution.ts`)

1. **Call API**:
   ```typescript
   const result = await api.trade({
     userId,
     mint: tokenAddress,
     side: 'BUY',
     qty: tokenQuantity.toString()
   })
   ```

2. **Optimistic Update** (lines 38-44):
   ```typescript
   // Immediately update balance in UI
   queryClient.setQueryData(['user-balance', userId], (old: any) => ({
     ...old,
     balance: (parseFloat(old.balance) - solAmount).toString()
   }))
   ```

3. **On Success** (lines 53-65):
   ```typescript
   if (result.success) {
     // Invalidate queries to trigger refetch
     queryClient.invalidateQueries({ queryKey: ['portfolio'] })
     queryClient.invalidateQueries({ queryKey: ['user-balance', userId] })

     // Show success toast
     toast({ title: "🎉 Trade Success!", ... })

     // Refresh balances and stats
     await refreshBalances()
     onSuccess?.()  // This calls refetchStats() from TradePanelContainer
   }
   ```

4. **PnL Auto-Updates**:
   - Position data now reflects new trade
   - WebSocket continues providing live prices
   - Frontend recalculates PnL automatically

### Backend Flow (`routes/trade.ts`)

1. **Validate Request** (lines 17-35):
   - Check required fields: userId, mint, side, qty
   - Validate side is 'BUY' or 'SELL'
   - Validate quantity is positive number

2. **Execute Trade** (line 39):
   ```typescript
   const result = await fillTrade({ userId, mint, side, qty });
   ```

3. **Save to Database** (in `tradeService.ts`):
   - Create `Trade` record
   - Update/create `Position` record
   - Create `PositionLot` record (FIFO)
   - Update `User` balance

4. **Return Response** (lines 80-114):
   ```typescript
   return {
     success: true,
     trade: { ...tradeData },
     position: { ...positionData },
     portfolioTotals: { ...totals },
     rewardPointsEarned: '...',
     currentPrice: priceUsd
   };
   ```

### Database Tables Updated

When a trade executes, these tables are modified:

1. **`Trade`** - New row created:
   - `id`, `userId`, `mint`, `side`, `quantity`, `price`, `costUsd`, etc.

2. **`Position`** - Updated or created:
   - `qty`: Increased (buy) or decreased (sell)
   - `costBasis`: Updated based on FIFO lot consumption

3. **`PositionLot`** - For buys, new lot created:
   - `qty`, `qtyRemaining`, `unitCostUsd`, `createdAt`

4. **`User`** - Balance updated:
   - `virtualSolBalance`: Decreased (buy) or increased (sell)

## Common Issues & Debugging

### Issue 1: BOUGHT/SOLD showing $0.00

**Symptoms**:
- Trade appears successful in UI
- But BOUGHT/SOLD stats remain at $0.00
- No trade count increment

**Cause**: No Trade records exist in database for this user/token

**Debug Steps**:
1. Check if trades exist:
   ```sql
   SELECT * FROM "Trade"
   WHERE "userId" = 'your-user-id'
     AND mint = 'token-address'
   ORDER BY "createdAt" DESC;
   ```

2. Test API directly:
   ```bash
   curl "https://api.../portfolio/token-stats?userId=...&mint=...&tradeMode=PAPER"
   ```

3. Check backend logs for trade execution errors

**Fixes**:
- If user doesn't exist: Re-login to get valid auth token
- If trades aren't saving: Check backend error logs
- If API returns wrong data: Clear Redis cache

### Issue 2: PnL showing wrong value (e.g., -100%)

**Symptoms**:
- PnL shows extreme values like -100%
- Or shows cost basis value instead of profit/loss

**Cause**: `tokenStats` returns zeros (qty=0, costBasis=0)

**Debug Steps**:
1. Check console for `tokenStats` value:
   ```javascript
   // In browser console
   console.log('tokenStats:', tokenStats)
   ```

2. Test API endpoint:
   ```bash
   curl "https://api.../portfolio/token-stats?userId=...&mint=..."
   ```

3. Verify Position exists:
   ```sql
   SELECT * FROM "Position"
   WHERE "userId" = '...' AND mint = '...';
   ```

**Fixes**:
- If API returns zeros: Check if user has trades for this token
- If Position doesn't exist: Trade execution may have failed
- If wrong calculation: Verify qty and costBasis are being parsed correctly

### Issue 3: "User not found" errors

**Symptoms**:
- Trades fail with "User not found" error
- Balance appears correct but trades don't execute

**Cause**: Invalid userId in JWT token (user doesn't exist in database)

**Debug Steps**:
1. Get userId from localStorage:
   ```javascript
   // Decode JWT token
   const token = localStorage.getItem('accessToken')
   const payload = JSON.parse(atob(token.split('.')[1]))
   console.log('userId:', payload.userId)
   ```

2. Check if user exists:
   ```sql
   SELECT id, email, handle, "virtualSolBalance"
   FROM "User"
   WHERE id = 'userId-from-token';
   ```

**Fixes**:
- Clear localStorage: `localStorage.clear()`
- Re-login to get new valid token
- Verify auth system is issuing correct userIds

### Issue 4: Stats don't update after trade

**Symptoms**:
- Trade executes successfully
- But BOUGHT/SOLD/HOLDING don't change
- Must refresh page to see updates

**Cause**: React Query cache not invalidated after trade

**Debug Steps**:
1. Check if `refetchStats()` is called:
   - Add console.log in TradePanelContainer.tsx line 211
   - Verify onSuccess callback is triggered

2. Check React Query DevTools:
   - Look for 'token-stats' query
   - Verify it refetches after trade

**Fixes**:
- Ensure `refetchStats()` is in onSuccess callback (lines 211, 293)
- Verify query key matches: `['token-stats', user?.id, tokenAddress]`
- Check if query is enabled: `enabled: !!user?.id && !!tokenAddress`

### Issue 5: Same stats for every token

**Symptoms**:
- Clicking different tokens shows same BOUGHT/SOLD values
- Stats appear "stuck" on one token

**Cause**: React Query cache is stale after re-login

**Fix**: Hard refresh to clear cache:
- Windows: `Ctrl + Shift + R` or `Ctrl + F5`
- Mac: `Cmd + Shift + R`

## Removed/Deprecated Features

### ❌ usePositionPnL Hook (Removed October 2025)

**Location**: `frontend/components/trade-panel/hooks/usePositionPnL.ts` (DELETED)

**Why Removed**:
- Added unnecessary complexity with polling
- Created 30-second lag in PnL updates
- Redundant with direct WebSocket + calculation

**Replaced With**: Direct calculation in TradePanelContainer.tsx (lines 96-102)

### ❌ Polling Intervals

**Old Code** (DON'T USE):
```typescript
useQuery({
  queryKey: ['token-stats', ...],
  refetchInterval: 30000,  // ❌ REMOVED - Don't add this back
})
```

**Why Removed**:
- Unnecessary database load
- Creates lag in updates
- WebSocket provides real-time data

**Current Approach**: Only refetch after trades

### ❌ realtimePnLService WebSocket for Trade Panel

**Service**: `backend/services/realtimePnLService.ts` (still exists but not used by trade panel)

**Why Not Used**:
- Trade panel calculates PnL locally (faster)
- WebSocket only broadcasts to portfolio page now
- Reduces WebSocket bandwidth usage

**Still Used By**:
- Portfolio page (for multi-token PnL updates)
- Historical PnL tracking
- Leaderboard calculations

### ❌ API Polling Every 30s

**Old Architecture**:
```
Frontend polls API every 30s
  ↓
Backend recalculates PnL
  ↓
Returns data to frontend
```

**New Architecture**:
```
Frontend fetches position data once
  ↓
WebSocket streams live prices
  ↓
Frontend calculates PnL locally in real-time
```

## Testing Checklist

After making changes to PnL system, verify:

- [ ] Trade execution creates Trade record in database
- [ ] Position is created/updated correctly
- [ ] `/api/portfolio/token-stats` returns correct values
- [ ] BOUGHT displays sum of buy trades
- [ ] SOLD displays sum of sell proceeds
- [ ] HOLDING updates in real-time with WebSocket prices
- [ ] PNL calculates correctly: `(qty × livePrice) - costBasis`
- [ ] PNL% shows correct percentage
- [ ] Stats update immediately after trade
- [ ] Hard refresh clears stale cache
- [ ] Different tokens show different stats
- [ ] WebSocket reconnects after disconnect

## Performance Considerations

### Why This Architecture is Fast

1. **No Polling**: Position data fetched only when needed (after trades)
2. **Client-side Calculation**: PnL computed in browser (no API roundtrip)
3. **WebSocket Real-time**: Prices update sub-second
4. **Redis Cache**: Backend caches tokenStats for 30s (reduces DB load)
5. **React Query Cache**: Frontend caches API responses (10s staleTime)

### Benchmarks

- **PnL Update Latency**: < 1 second (WebSocket → render)
- **Trade Execution**: 200-500ms (API roundtrip)
- **Stats Refresh**: 100-200ms (cached API response)
- **Page Load**: 1-2 seconds (initial data fetch)

## Future Improvements

Potential optimizations (not yet implemented):

1. **Optimistic PnL Updates**: Show PnL immediately after trade (before API response)
2. **WebSocket PnL Broadcast**: Backend pushes position updates via WebSocket
3. **GraphQL Subscriptions**: Replace polling entirely with real-time subscriptions
4. **Service Worker Cache**: Cache tokenStats in service worker for offline support

---

**Last Updated**: 2025-10-27
**Version**: 2.0 (Real-time WebSocket architecture)
**Previous Version**: 1.0 (Polling-based, deprecated October 2025)
