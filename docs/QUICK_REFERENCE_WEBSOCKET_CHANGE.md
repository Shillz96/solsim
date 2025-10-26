# QUICK REFERENCE: WebSocket Architecture Change

## 🎯 What Changed?
**BEFORE:** Dual WebSocket (Helius + PumpPortal)  
**AFTER:** Single WebSocket (PumpPortal-Only)

## ❓ Why?
PumpPortal supports **ALL Solana tokens**, not just pump.fun:
- Raydium tokens (like BONK) ✅
- pump.fun tokens ✅
- bonk.fun tokens ✅
- Orca, Meteora, LaunchLab ✅
- **ANY token** via `"pool": "auto"` ✅

## 📁 Files Changed
1. `backend/src/plugins/priceService-optimized.ts` - Helius WebSocket disabled
2. `backend/WEBSOCKET_ARCHITECTURE_DECISION.md` - Full documentation
3. `backend/IMPLEMENTATION_SUMMARY_WEBSOCKET_SIMPLIFICATION.md` - This summary
4. `frontend/components/trade-panel/TradePanelContainer.tsx` - Default token changed

## 🔄 Rollback Instructions (If Needed)

### In `priceService-optimized.ts`:

**Step 1:** Find line ~268, uncomment the multi-line block:
```typescript
// Remove /* and */ from around the connectWebSocket() methods
```

**Step 2:** Find line ~257, uncomment this line:
```typescript
async start() {
  await this.connectWebSocket();           // ← Uncomment this
  await this.connectPumpPortalWebSocket();
}
```

**Step 3:** Find line ~214, uncomment these:
```typescript
// private lastHeliusWsMessage = Date.now();        // ← Uncomment
// private readonly DEX_PROGRAMS = [...]            // ← Uncomment
// private readonly HELIUS_WS_URL: string;          // ← Uncomment
```

**Step 4:** Redeploy to Railway

## ✅ Testing Checklist
- [ ] PumpPortal WebSocket connects (check logs)
- [ ] BONK price updates work
- [ ] pump.fun token price updates work
- [ ] Trades execute successfully
- [ ] `/api/debug/prices` shows healthy status

## 📊 Benefits
- ✅ 50% less WebSocket code
- ✅ Simpler architecture (1 connection vs 2)
- ✅ No race conditions
- ✅ Same or better token coverage

## 🔗 Full Documentation
See: `backend/WEBSOCKET_ARCHITECTURE_DECISION.md`

---

**Status:** ✅ Complete  
**Risk:** 🟢 LOW (code preserved for rollback)  
**Next:** Deploy and monitor PumpPortal WebSocket health
