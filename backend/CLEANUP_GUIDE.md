# Cleanup Guide - Backend Code Organization

## Current State

The backend has multiple versions of the price service from iterative development. Here's what each file does and whether it should be kept:

## Price Service Files

### ✅ KEEP: `priceService-optimized.ts`
- **Status**: ACTIVE - Currently in use
- **Purpose**: Production price service with all optimizations
- **Features**:
  - PumpPortal WebSocket integration
  - Smart routing for pump.fun tokens
  - Multi-layer caching
  - Circuit breakers
  - Batch fetching

### ❌ REMOVE: `priceService.ts`
- **Status**: DEPRECATED
- **Purpose**: Original simple price service
- **Why Remove**: Replaced by optimized version

### ❌ REMOVE: `priceService-v2.ts`
- **Status**: DEPRECATED
- **Purpose**: Intermediate version with Helius WebSocket
- **Why Remove**: Functionality merged into optimized version

### ❌ REMOVE: `priceService-helius-ws.ts`
- **Status**: DEPRECATED
- **Purpose**: Experimental Helius-only WebSocket version
- **Why Remove**: Superseded by optimized version with multiple sources

## Other Files to Clean

### ✅ KEEP These Documentation Files:
- `API_USAGE_DOCUMENTATION.md` - Comprehensive API guide
- `TOKEN_PRICE_DISCOVERY_ARCHITECTURE.md` - Price discovery strategy
- `PUMP_FUN_OPTIMIZATION_STRATEGY.md` - Pump.fun integration details
- `LOW_LIQUIDITY_TOKEN_STRATEGY.md` - Negative caching strategy

### ❌ REMOVE These Test/Temp Files:
- `test-pumpportal.ts` - Test file (already removed)
- `cleanup-wallet-activities.sql` - One-time cleanup script (already removed)

## Recommended Cleanup Commands

```bash
# Navigate to backend
cd backend

# Remove deprecated price service files
rm src/plugins/priceService.ts
rm src/plugins/priceService-v2.ts
rm src/plugins/priceService-helius-ws.ts

# Keep only the optimized version
# src/plugins/priceService-optimized.ts ✅

# Optional: Rename optimized to main version (requires code update)
# mv src/plugins/priceService-optimized.ts src/plugins/priceService.ts
# Then update import in src/index.ts
```

## Import Updates Required

If you rename `priceService-optimized.ts` to `priceService.ts`, update:

**File**: `src/index.ts`
```typescript
// Change from:
import priceService from "./plugins/priceService-optimized.js";

// To:
import priceService from "./plugins/priceService.js";
```

## Database Cleanup

The SQL cleanup script was for one-time use and has been removed. If wallet activities need cleaning in the future, use this query:

```sql
-- Remove wallet activities without valid images
DELETE FROM "WalletActivity"
WHERE image IS NULL
   OR image = ''
   OR image NOT LIKE 'http%';
```

## Environment Variables

No changes needed. All environment variables are documented in:
- `ENVIRONMENT_SETUP.md`
- `API_USAGE_DOCUMENTATION.md`

## Testing After Cleanup

After removing deprecated files:

1. **Build Test**:
```bash
npm run build
```

2. **Type Check**:
```bash
npm run type-check
```

3. **Start Dev Server**:
```bash
npm run dev
```

## Git Cleanup

After removing files, commit the cleanup:

```bash
git add -A
git commit -m "chore: remove deprecated price service implementations

- Removed old priceService.ts, priceService-v2.ts, priceService-helius-ws.ts
- Keeping only priceService-optimized.ts as the production version
- All functionality preserved in the optimized version"
```

## Summary

The cleanup will:
- Remove 3 deprecated price service files (~45KB of unused code)
- Keep all documentation for future reference
- Maintain full functionality with the optimized service
- Reduce confusion about which service is active

Total files to remove: 3
Total documentation to keep: 4
Active service: `priceService-optimized.ts`