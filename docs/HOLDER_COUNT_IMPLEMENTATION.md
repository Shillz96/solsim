# Holder Count Implementation

**Date**: October 26, 2025  
**Status**: ✅ Complete and Deployed

## Problem
Holder counts were showing as `0` or `null` for tokens because:
1. Backend was hardcoding `holderCount: null` in search endpoint
2. PumpPortal WebSocket doesn't send holder count data
3. No mechanism existed to fetch actual on-chain holder counts

## Solution Implemented

### 1. Created HolderCountService (`backend/src/services/holderCountService.ts`)
- Uses Helius RPC `getProgramAccounts` to query SPL Token Program
- Filters token accounts by mint address
- Counts unique owners with balance > 0
- Provides both total count and top holders functionality

**Key Methods:**
- `getHolderCount(mint)` - Returns total unique holders with balance > 0
- `getTopHolders(mint)` - Returns top 20 holders using `getTokenLargestAccounts`
- `getHolderCounts(mints[])` - Batch processing with concurrency limit

**URL Format (Critical):**
```typescript
https://mainnet.helius-rpc.com/?api-key=${KEY}
// NO trailing slash after API key!
```

### 2. Fixed Backend Endpoints

**`/api/search/token/:mint`** (backend/src/routes/search.ts)
- Changed from hardcoded `holderCount: null`
- Now uses `tokenDiscovery.holderCount` with proper null checking
- Uses explicit check: `holderCount !== null && holderCount !== undefined`

**`/api/market/holders/:mint`** (backend/src/routes/market.ts)
- Updated to use `holderCountService`
- Fetches both top holders and total count in parallel
- Returns accurate holder counts instead of just top 20

### 3. Added Background Job to TokenDiscoveryWorker

**Location**: `backend/src/workers/tokenDiscoveryWorker.ts`

**Function**: `updateHolderCounts()`
- Runs every 10 minutes (configurable via `HOLDER_COUNT_UPDATE_INTERVAL`)
- Fetches holder counts for up to 50 active tokens per batch
- Updates oldest tokens first (ordered by `lastUpdatedAt`)
- Only processes tokens with status != 'DEAD'
- Batch processes using `holderCountService.getHolderCounts()`

**Schedule:**
```typescript
setInterval(updateHolderCounts, HOLDER_COUNT_UPDATE_INTERVAL); // Every 10 min
setTimeout(updateHolderCounts, 10000); // Initial run 10 sec after startup
```

### 4. Frontend Integration

**No changes needed!** Frontend components already correctly handle holder counts:

- `token-vitals-bar.tsx` - Displays holder count in vitals bar
- `market-data-panels.tsx` - Shows holder distribution panel
- Room pages - Fetch and display holder data from API

**Data Flow:**
```
Helius RPC → holderCountService → TokenDiscovery table → API endpoints → Frontend
```

## Testing

### Test Endpoints
```bash
# Test direct holder count service
curl https://solsim-production.up.railway.app/api/search/test/holders/G43AzE2DeRXyCsiaVNtZFVGbuw9rD1cCNLXPCjy4pump

# Test token details (includes holder count)
curl https://solsim-production.up.railway.app/api/search/token/G43AzE2DeRXyCsiaVNtZFVGbuw9rD1cCNLXPCjy4pump

# Test market holders endpoint
curl https://solsim-production.up.railway.app/api/market/holders/G43AzE2DeRXyCsiaVNtZFVGbuw9rD1cCNLXPCjy4pump?limit=5
```

### Test Results (VAMP Token: G43AzE2DeRXyCsiaVNtZFVGbuw9rD1cCNLXPCjy4pump)
- **Holder Count**: 139 unique holders
- **API Response Time**: ~126ms
- **Top Holders**: Successfully returns top 20 accounts

## Configuration

### Environment Variables Required
```env
HELIUS_API=your_helius_api_key_here
```

### Rate Limiting
- HolderCountService: 5 concurrent requests max
- TokenDiscoveryWorker: 50 tokens per 10-minute batch
- 50ms delay between sequential updates

## Monitoring

**Worker Logs:**
```
[TokenDiscovery] Updating holder counts...
[TokenDiscovery] Fetching holder counts for 50 tokens...
[TokenDiscovery] Updated VAMP: 139 holders
[TokenDiscovery] Holder counts updated: 45 succeeded, 5 failed
```

**Service Logs:**
```
[HolderCount] G43AzE2DeRXyCsiaVNtZFVGbuw9rD1cCNLXPCjy4pump: 139 holders with balance > 0
```

## Future Improvements

1. **Real-time Updates**: Consider WebSocket notifications when holder count changes significantly
2. **Caching Strategy**: Add Redis cache for frequently accessed holder counts
3. **Historical Tracking**: Store holder count history for trend analysis
4. **Alert System**: Notify when holder count crosses thresholds (100, 500, 1000+)

## Deployment Status

✅ All changes deployed to Railway production  
✅ Background worker running and updating holder counts  
✅ Frontend displaying correct data  
✅ API endpoints returning accurate counts  

## Files Modified

1. `backend/src/services/holderCountService.ts` - NEW
2. `backend/src/routes/search.ts` - Fixed holderCount extraction
3. `backend/src/routes/market.ts` - Integrated holderCountService
4. `backend/src/workers/tokenDiscoveryWorker.ts` - Added periodic updates
5. Frontend components - NO CHANGES (already correct)

## Key Learnings

1. **PumpPortal Limitation**: WebSocket doesn't include holder data, need external source
2. **URL Format Critical**: Trailing slashes break Helius RPC API calls
3. **Null Handling**: Must use explicit `!== null && !== undefined` for 0 values
4. **Rate Limiting**: Helius has limits, batch processing essential for scale
5. **Background Jobs**: 10-minute interval balances freshness vs. API costs
