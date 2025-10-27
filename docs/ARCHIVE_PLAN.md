# Archive Plan - Experimental Features

**Date**: 2025-10-27
**Purpose**: Remove experimental/unused features to simplify codebase
**Method**: Archive branch + file removal

## Core Features (KEEP)
- ✅ Paper trading with virtual SOL
- ✅ Real-time PnL tracking (FIFO)
- ✅ Rewards system (XP/points)
- ✅ Warp Pipes (PumpPortal memecoin scanner)
- ✅ Leaderboard
- ✅ Wallet Tracker (KOL copy trading)
- ✅ Basic authentication

## Future Features (KEEP)
- ✅ Perps (planned)
- ✅ Stocks (planned)

## Files to Archive (Remove from Main)

### Backend - Real Trading
- [ ] `backend/src/routes/realTrade.ts`
- [ ] `backend/src/services/realTradeService.ts`

### Backend - Multi-Wallet Management
- [ ] `backend/src/routes/wallet.ts`
- [ ] `backend/src/routes/auth/walletAuth.ts`
- [ ] `backend/src/services/walletManagementService.ts`
- [ ] `backend/src/services/walletActivityService.ts`
- [ ] `backend/src/services/walletEncryptionService.ts`
- [ ] `backend/src/services/walletService.ts`

### Backend - Purchase/Conversion System
- [ ] `backend/src/routes/purchase.ts`
- [ ] `backend/src/services/purchaseService.ts`

### Backend - Experimental
- [ ] `backend/src/routes/walletTrackerExample.ts`

### Frontend - Multi-Wallet Management
- [ ] `frontend/app/wallet-management/page.tsx`
- [ ] `frontend/components/portfolio/wallet-management.tsx`
- [ ] `frontend/components/portfolio/wallet-management-panel.tsx`
- [ ] `frontend/components/modals/import-wallet-modal.tsx`
- [ ] `frontend/components/trading/wallet-selector.tsx`

### Frontend - Purchase/Conversion System
- [ ] `frontend/components/modals/purchase-modal.tsx`
- [ ] `frontend/components/purchase/` (entire directory)
- [ ] `frontend/lib/purchase-transaction.ts`

### Frontend - Real Trading
- [ ] `frontend/components/trading/real-trade-confirmation-modal.tsx`
- [ ] `frontend/lib/real-trade-api.ts`

## Database Tables (Consider removing in future migration)
- `ConversionHistory` - Token purchase/conversion tracking
- `PurchaseTransaction` - Real token purchases
- `UserWallet` - Multi-wallet management

## Steps to Execute

### 1. Create Archive Branch
```bash
git checkout main
git pull
git checkout -b archive/experimental-features-2025-10-27
git push origin archive/experimental-features-2025-10-27
```

### 2. Return to Main and Remove Files
```bash
git checkout main

# Remove backend files
rm backend/src/routes/realTrade.ts
rm backend/src/routes/wallet.ts
rm backend/src/routes/auth/walletAuth.ts
rm backend/src/routes/purchase.ts
rm backend/src/routes/walletTrackerExample.ts
rm backend/src/services/realTradeService.ts
rm backend/src/services/walletManagementService.ts
rm backend/src/services/walletActivityService.ts
rm backend/src/services/walletEncryptionService.ts
rm backend/src/services/walletService.ts
rm backend/src/services/purchaseService.ts

# Remove frontend files
rm -rf frontend/app/wallet-management
rm -rf frontend/components/purchase
rm frontend/components/portfolio/wallet-management.tsx
rm frontend/components/portfolio/wallet-management-panel.tsx
rm frontend/components/modals/import-wallet-modal.tsx
rm frontend/components/modals/purchase-modal.tsx
rm frontend/components/trading/wallet-selector.tsx
rm frontend/components/trading/real-trade-confirmation-modal.tsx
rm frontend/lib/purchase-transaction.ts
rm frontend/lib/real-trade-api.ts
```

### 3. Clean Up Imports/References
- [ ] Remove route registrations in `backend/src/index.ts`
- [ ] Remove API exports in `frontend/lib/api.ts`
- [ ] Update TypeScript types
- [ ] Remove unused imports

### 4. Test Build
```bash
cd backend && npm run build
cd frontend && npm run type-check
```

### 5. Commit Cleanup
```bash
git add .
git commit -m "refactor: archive experimental features

Archived features preserved in branch: archive/experimental-features-2025-10-27

Removed:
- Real trading system (not core - paper trading only)
- Multi-wallet management (not core - single account)
- Purchase/conversion system (not core)
- Experimental wallet tracker examples

Core features retained:
- Paper trading with virtual SOL
- Real-time PnL (FIFO)
- Rewards system
- Warp Pipes (PumpPortal)
- Leaderboard
- KOL Wallet Tracker

Future features retained:
- Perps (planned)
- Stocks (planned)
"

git push origin main
```

## Recovery Instructions

If you need to recover any archived features:

```bash
# 1. View archived files
git checkout archive/experimental-features-2025-10-27

# 2. Copy specific file back to main
git checkout main
git checkout archive/experimental-features-2025-10-27 -- path/to/file.ts

# 3. Or cherry-pick specific commits
git cherry-pick <commit-hash>
```

## Notes
- Archive branch will remain in remote repository indefinitely
- All files preserved in Git history
- Can recover any feature at any time
- Database tables can be removed in future migration if needed
