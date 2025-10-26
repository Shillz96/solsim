# Backend Archive

This directory contains archived code that is no longer actively used in production.

## Files

### tradeServiceV2.ts

**Archived**: 2025-10-26
**Reason**: Unused alternative implementation of trade service
**Status**: Never imported or used in production

**Why Archived**:
- V1 (tradeService.ts) is the production service with full feature set
- V2 lacks critical features: distributed locking, real-time PnL, notifications
- V2 was never integrated into any routes
- Keeping V1 as the canonical trade service

**Advantages of V2** (if needed in future):
- Better lot closure tracking with `LotClosure` table records
- More detailed audit trail for FIFO lot consumption

**Reference**: See `docs/TRADE_SERVICE_AUDIT.md` for full comparison

---

If you need to restore this file, simply move it back to `backend/src/services/`.
