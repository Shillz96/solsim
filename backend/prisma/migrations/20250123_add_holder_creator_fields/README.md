# Migration: Add Holder Count and Creator Wallet Fields

**Date**: January 23, 2025

## Purpose
This migration adds two new fields to the `TokenDiscovery` table to support enhanced token metadata display in the Warp Pipes feature:

1. `holderCount` - Number of token holders
2. `creatorWallet` - Token creator's wallet address

## Changes

### New Columns
- `holderCount` (INTEGER, nullable) - Stores the number of unique holders for a token
- `creatorWallet` (TEXT, nullable) - Stores the wallet address of the token creator

### New Index
- `token_discovery_holder_count` - Index on `holderCount` (descending) for efficient sorting by holder count

## Related Files
- `backend/prisma/schema.prisma` - Schema definition updated
- `backend/src/workers/tokenDiscoveryWorker.ts` - Worker updated to capture holder count and creator wallet from PumpPortal events
- `backend/src/services/pumpPortalStreamService.ts` - Service updated to extract holder count and creator data
- `backend/src/routes/warpPipes.ts` - API route updated to return new fields
- `frontend/lib/types/warp-pipes.ts` - TypeScript types updated
- `frontend/components/warp-pipes/token-card.tsx` - UI updated to display new metadata

## Rollback
To rollback this migration:

```sql
DROP INDEX IF EXISTS "token_discovery_holder_count";
ALTER TABLE "TokenDiscovery" DROP COLUMN IF EXISTS "holderCount";
ALTER TABLE "TokenDiscovery" DROP COLUMN IF EXISTS "creatorWallet";
```

## Testing
After applying this migration:

1. Run `npm run prisma:generate` in the backend directory
2. Restart the tokenDiscoveryWorker
3. Verify new tokens capture holderCount and creatorWallet
4. Check Warp Pipes UI displays holder count, transaction count, social links, and creator wallet

