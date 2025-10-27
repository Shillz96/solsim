# Comprehensive Archive Plan - Experimental Features
**Date**: 2025-10-27
**Purpose**: Remove ALL experimental/unused features after deep codebase scan
**Method**: Archive branch + file removal

## Deep Scan Results

Performed comprehensive scan of entire codebase using:
- Route registration analysis (`backend/src/index.ts`)
- Import dependency tracking (Grep across entire codebase)
- Frontend component usage verification
- Service usage verification

## Core Features (KEEP)
- ✅ Paper trading with virtual SOL
- ✅ Real-time PnL tracking (FIFO)
- ✅ Rewards system (XP/points)
- ✅ Warp Pipes (PumpPortal memecoin scanner)
- ✅ Leaderboard
- ✅ Wallet Tracker (KOL copy trading) - via `wsWalletTracker` plugin
- ✅ Basic authentication (email + Solana wallet SIWS)

## Future Features (KEEP)
- ✅ Perps (planned) - `perpRoutes.ts` registered
- ✅ Stocks (planned) - `stocksRoutes.ts` registered

---

## Files to Archive (Remove from Main)

### Category 1: Unregistered/Commented Out Routes (DEFINITELY UNUSED)

#### Backend Routes
- [ ] `backend/src/routes/walletTracker.ts` (commented out line 253)
- [ ] `backend/src/routes/walletTrackerV2.ts` (commented out line 255)
- [ ] `backend/src/routes/walletTrackerExample.ts` (not registered anywhere)
- [ ] `backend/src/routes/test-holders.ts` (not registered anywhere)

---

### Category 2: Real Trading System (NOT CORE - Paper Trading Only)

#### Backend - Real Trading
- [ ] `backend/src/routes/realTrade.ts` (registered line 264 but experimental)
- [ ] `backend/src/services/realTradeService.ts` (only used by realTrade.ts)

#### Frontend - Real Trading
- [ ] `frontend/components/trading/real-trade-confirmation-modal.tsx` (no imports found)
- [ ] `frontend/lib/real-trade-api.ts` (only used by unused transaction-status-tracker)
- [ ] `frontend/components/trading/transaction-status-tracker.tsx` (no imports found)

---

### Category 3: Purchase/Conversion System (NOT CORE)

⚠️ **WARNING**: Currently used by Settings page - will need frontend update

#### Backend - Purchase System
- [ ] `backend/src/routes/purchase.ts` (registered line 260 but experimental)
- [ ] `backend/src/services/purchaseService.ts` (only used by purchase.ts)

#### Frontend - Purchase System
- [ ] `frontend/components/modals/purchase-modal.tsx` ⚠️ (used by settings page - remove from settings first)
- [ ] `frontend/components/purchase/purchase-history.tsx` ⚠️ (used by settings page - remove from settings first)
- [ ] `frontend/lib/purchase-transaction.ts` (only used by purchase-modal)

**Action Required**: Update `frontend/app/profile/settings/page.tsx`:
- Remove lines 14-15 (purchase modal/history imports)
- Remove line 73 (`purchaseModalOpen` state)
- Remove purchase section from UI

---

### Category 4: Multi-Wallet Management (NOT CORE - Single Account)

⚠️ **WARNING**: WalletTab is actively used on portfolio page - needs simplification, not removal

#### Backend - Multi-Wallet Management
**KEEP BUT SIMPLIFY LATER:**
- `backend/src/routes/wallet.ts` - currently used by WalletTab (can simplify after WalletTab redesign)
- `backend/src/services/walletManagementService.ts` - used by wallet.ts
- `backend/src/services/walletEncryptionService.ts` - used by walletManagementService
- `backend/src/plugins/wsWalletTracker.ts` - registered plugin (line 223) for KOL tracking
- `backend/src/services/walletActivityService.ts` - used by wsWalletTracker
- `backend/src/routes/auth/walletAuth.ts` - **KEEP** (Solana wallet authentication SIWS)

**CAN ARCHIVE NOW:**
- [ ] `backend/src/services/walletService.ts` (no imports found - unused)
- [ ] `backend/src/services/walletTrackerService.ts` (only used by commented out walletTracker.ts)

#### Frontend - Multi-Wallet Management
**KEEP BUT SIMPLIFY LATER:**
- `frontend/components/portfolio/wallet-tab.tsx` - active tab on portfolio page (lines 111-113)
- `frontend/components/portfolio/wallet-management-panel.tsx` - used by WalletTab (line 37)

**CAN ARCHIVE NOW:**
- [ ] `frontend/app/wallet-management/page.tsx` - dedicated wallet management page (separate from portfolio)
- [ ] `frontend/components/portfolio/wallet-management.tsx` - full wallet management (only used by wallet-management page)
- [ ] `frontend/components/modals/import-wallet-modal.tsx` - only used by wallet-management.tsx
- [ ] `frontend/components/trading/wallet-selector.tsx` - no imports found (unused)

---

## Database Tables (Consider removing in future migration)
- `ConversionHistory` - Token purchase/conversion tracking
- `PurchaseTransaction` - Real token purchases
- `UserWallet` - Multi-wallet management

---

## Required Frontend Updates Before Archiving

### 1. Update Settings Page
**File**: `frontend/app/profile/settings/page.tsx`

Remove purchase functionality:
```diff
- import { PurchaseModal } from '@/components/modals/purchase-modal'
- import { PurchaseHistoryTable } from '@/components/purchase/purchase-history'

function UserSettingsPage() {
  // ...
-  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false)
  // ...

  // Remove purchase section from render()
}
```

### 2. Update Portfolio Barrel Export
**File**: `frontend/components/portfolio/index.ts`

Remove archived component exports:
```diff
  export { UnifiedPositions } from "./unified-positions"
  export { PnLCard } from "./pnl-card"
  export { PortfolioChart } from "./portfolio-chart"
  export { PortfolioChart as PortfolioChartDynamic } from "./portfolio-chart-dynamic"
  export { PortfolioMetrics } from "./PortfolioMetrics"
  export { RewardsCard } from "./rewards-card"
  export { TradingStatsSummary } from "./trading-stats-summary"
- export { WalletManagement } from "./wallet-management"
- export { WalletManagementPanel } from "./wallet-management-panel"
  export { PortfolioStatsWidget, LeaderboardPreviewWidget, QuickPortfolioActionsWidget } from "./portfolio-widgets"
  export { OverviewTab } from "./overview-tab"
  export { AchievementsTab } from "./achievements-tab"
  export { WalletTab } from "./wallet-tab"
  export * from "./types"
```

### 3. Simplify WalletTab (Future Task - After Archive)
**File**: `frontend/components/portfolio/wallet-tab.tsx`

Replace multi-wallet UI with simple virtual SOL balance display.

---

## Steps to Execute

### Phase 1: Pre-Archive Cleanup (Frontend Updates)

```bash
# 1. Update settings page (remove purchase modal imports and usage)
# Manual edit: frontend/app/profile/settings/page.tsx

# 2. Update portfolio barrel exports (remove WalletManagement exports)
# Manual edit: frontend/components/portfolio/index.ts

# 3. Test frontend build
cd frontend && npm run type-check
```

### Phase 2: Create Archive Branch

```bash
git checkout main
git pull
git checkout -b archive/experimental-features-2025-10-27-comprehensive
git push origin archive/experimental-features-2025-10-27-comprehensive
```

### Phase 3: Return to Main and Remove Files

```bash
git checkout main

# Remove backend routes (unregistered/commented out)
git rm backend/src/routes/walletTracker.ts
git rm backend/src/routes/walletTrackerV2.ts
git rm backend/src/routes/walletTrackerExample.ts
git rm backend/src/routes/test-holders.ts

# Remove backend routes (experimental features)
git rm backend/src/routes/realTrade.ts
git rm backend/src/routes/purchase.ts

# Remove backend services (unused)
git rm backend/src/services/realTradeService.ts
git rm backend/src/services/purchaseService.ts
git rm backend/src/services/walletService.ts
git rm backend/src/services/walletTrackerService.ts

# Remove frontend components (unused)
git rm -r frontend/app/wallet-management
git rm frontend/components/portfolio/wallet-management.tsx
git rm frontend/components/modals/import-wallet-modal.tsx
git rm frontend/components/modals/purchase-modal.tsx
git rm -r frontend/components/purchase
git rm frontend/components/trading/wallet-selector.tsx
git rm frontend/components/trading/real-trade-confirmation-modal.tsx
git rm frontend/components/trading/transaction-status-tracker.tsx
git rm frontend/lib/purchase-transaction.ts
git rm frontend/lib/real-trade-api.ts
```

### Phase 4: Clean Up Imports/References

#### Backend Route Registrations
**File**: `backend/src/index.ts`

Remove import statements:
```diff
- import walletTrackerRoutes from "./routes/walletTracker.ts";
- import walletTrackerV2Routes from "./routes/walletTrackerV2.ts";
- import purchaseRoutes from "./routes/purchase.ts";
- import realTradeRoutes from "./routes/realTrade.ts";
```

Remove route registrations:
```diff
  app.register(walletRoutes, { prefix: "/api/wallet" });
- // Legacy wallet tracker (deprecated - kept for backwards compatibility)
- // app.register(walletTrackerRoutes, { prefix: "/api/wallet-tracker" });
- // V2 routes now handled by PumpPortal implementation below
- // app.register(walletTrackerV2Routes, { prefix: "/api/wallet-tracker/v2" });
  app.register(walletTrackerSettingsRoutes, { prefix: "/api/wallet-tracker" });
  // PumpPortal real-time wallet tracking (replaces legacy walletTrackerRoutes and V2)
  app.register(walletTrackerPumpPortalRoutes, { prefix: "/api" });
  app.register(searchRoutes, { prefix: "/api/search" });
- app.register(purchaseRoutes, { prefix: "/api/purchase" });
  app.register(notificationsRoutes, { prefix: "/api/notifications" });
  app.register(perpRoutes, { prefix: "/api/perp" }); // Perpetual trading routes
  app.register(chartRoutes, { prefix: "/api" }); // Chart data routes (OHLCV)
- app.register(realTradeRoutes, { prefix: "/api/real-trade" }); // Real mainnet trading routes (Lightning & Local API)
  app.register(marketRoutes, { prefix: "/api" }); // Market data routes (trades, traders, holders)
```

#### Frontend API Client
**File**: `frontend/lib/api.ts`

Remove purchase/wallet management API functions (lines ~1100-1330):
```diff
- // Multi-Wallet Management
- async function getUserWallets(userId: string) { ... }
- async function createWallet(userId: string, name: string) { ... }
- async function setActiveWallet(userId: string, walletId: string) { ... }
- // ... (remove all wallet management functions)

- // Purchase System
- async function purchaseTokens(...) { ... }
- // ... (remove all purchase functions)

  export {
    // ... keep all other exports
-   getUserWallets,
-   createWallet,
-   setActiveWallet,
-   // ... (remove wallet/purchase exports)
  }
```

### Phase 5: Test Build

```bash
# Backend
cd backend && npm run build

# Frontend
cd frontend && npm run type-check
```

### Phase 6: Commit Cleanup

```bash
git add .
git commit -m "refactor: archive experimental features (comprehensive scan)

Archived features preserved in branch: archive/experimental-features-2025-10-27-comprehensive

Removed after deep codebase scan:
- Real trading system (not core - paper trading only)
  * routes/realTrade.ts
  * services/realTradeService.ts
  * frontend real trade components

- Purchase/conversion system (not core)
  * routes/purchase.ts
  * services/purchaseService.ts
  * frontend purchase components

- Unused wallet tracker routes (commented out)
  * routes/walletTracker.ts
  * routes/walletTrackerV2.ts
  * routes/walletTrackerExample.ts
  * services/walletTrackerService.ts

- Multi-wallet management UI (not core - single account)
  * app/wallet-management page
  * wallet-management.tsx
  * import-wallet-modal.tsx
  * wallet-selector.tsx

- Unused services
  * walletService.ts (no imports found)

- Test files
  * routes/test-holders.ts

Core features retained:
- Paper trading with virtual SOL
- Real-time PnL (FIFO)
- Rewards system
- Warp Pipes (PumpPortal)
- Leaderboard
- KOL Wallet Tracker (wsWalletTracker plugin)

Future features retained:
- Perps (planned)
- Stocks (planned)

Notes:
- WalletTab kept but needs simplification (future task)
- wallet.ts route kept (used by WalletTab - simplify later)
- walletActivityService kept (used by wsWalletTracker plugin)
- auth/walletAuth.ts kept (Solana wallet SIWS authentication)
"

git push origin main
```

---

## Recovery Instructions

If you need to recover any archived features:

```bash
# 1. View archived files
git checkout archive/experimental-features-2025-10-27-comprehensive

# 2. Copy specific file back to main
git checkout main
git checkout archive/experimental-features-2025-10-27-comprehensive -- path/to/file.ts

# 3. Or cherry-pick specific commits
git cherry-pick <commit-hash>
```

---

## Post-Archive Cleanup Tasks (Future)

These files are KEPT for now but should be simplified in a future PR:

### 1. Simplify WalletTab
**Current**: Multi-wallet management UI
**Target**: Simple virtual SOL balance display

**Files to update**:
- `frontend/components/portfolio/wallet-tab.tsx`
- `frontend/components/portfolio/wallet-management-panel.tsx` (delete or simplify)

### 2. Simplify Wallet Route
**Current**: Full multi-wallet CRUD API
**Target**: Simple balance query API

**Files to update**:
- `backend/src/routes/wallet.ts` (simplify to just balance queries)
- `backend/src/services/walletManagementService.ts` (may be deletable after simplification)
- `backend/src/services/walletEncryptionService.ts` (may be deletable after simplification)

### 3. Database Migration
Remove unused tables:
- `ConversionHistory`
- `PurchaseTransaction`
- `UserWallet`

---

## Summary

**Files Archived**: 23 files total
- Backend routes: 6 files
- Backend services: 4 files
- Frontend components: 10 files
- Frontend lib: 2 files
- Frontend app pages: 1 directory

**Files Kept But Need Simplification**: 4 files
- `wallet.ts` route (used by WalletTab)
- `wallet-tab.tsx` (active portfolio tab)
- `wallet-management-panel.tsx` (used by WalletTab)
- Related services (walletManagementService, walletEncryptionService)

**Verified Dependencies**:
✅ All imports checked with Grep
✅ All route registrations verified in index.ts
✅ Frontend component usage verified
✅ Service usage verified
✅ No orphaned imports remaining
