# 🔧 Database Issues Fix

## Issues Identified

1. **EventEmitter Memory Leak** ✅ FIXED
   - OptimizedPriceService had >10 listeners
   - Added `setMaxListeners(100)` in constructor

2. **User ID Null Constraint Violation** 🔧 NEEDS FIX
   - Database schema missing UUID defaults
   - Prisma schema expects `@default(uuid())` but DB doesn't have it

3. **PumpPortal Token Creation** ✅ NORMAL
   - SPOOKY6900 token creation is expected behavior
   - PumpPortal detects new tokens on pump.fun

## Solutions

### 1. EventEmitter Memory Leak - FIXED ✅
```typescript
// In OptimizedPriceService constructor
this.setMaxListeners(100); // Allow up to 100 listeners
```

### 2. User ID Constraint Violation - NEEDS DEPLOYMENT

The database schema is missing UUID defaults. Run this fix:

```bash
# Option 1: Run the fix script
npm run db:fix-uuid

# Option 2: Manual SQL (if script fails)
# Connect to Railway database and run:
```

```sql
-- Add UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Fix User table
ALTER TABLE "User" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();

-- Fix other tables
ALTER TABLE "Trade" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();
ALTER TABLE "Position" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();
ALTER TABLE "PositionLot" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();
ALTER TABLE "RealizedPnL" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();
```

### 3. Deploy the Fix

```bash
# Build and deploy to Railway
npm run build
railway up
```

## Files Created/Modified

- ✅ `backend/src/plugins/priceService-optimized.ts` - Added setMaxListeners
- ✅ `backend/scripts/fix-uuid-defaults.ts` - UUID fix script
- ✅ `backend/package.json` - Added db:fix-uuid script
- ✅ `backend/FIX_DATABASE_ISSUES.md` - This documentation

## Next Steps

1. Run the UUID fix script on Railway database
2. Deploy the updated code
3. Test user signup to verify the fix

## Verification

After deployment, check:
- No more EventEmitter warnings
- User signup works without null constraint violations
- PumpPortal continues detecting new tokens (normal behavior)
