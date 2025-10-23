# Real Trading Implementation - Testing Guide

This guide provides step-by-step instructions for testing the real trading feature implementation.

## Prerequisites

### Backend Setup

1. **Database Migration**
   ```bash
   cd backend
   npx prisma migrate dev
   npx prisma generate
   ```

2. **Environment Variables**

   Ensure your `backend/.env` includes:
   ```bash
   # Required for real trading
   PUMPPORTAL_API_KEY=your-api-key-from-pumpportal.fun

   # Helius RPC for transaction verification
   HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
   SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY

   # Database
   DATABASE_URL=postgresql://...

   # Redis
   REDIS_URL=redis://...
   ```

3. **Start Backend**
   ```bash
   cd backend
   npm run dev
   ```

### Frontend Setup

1. **Environment Variables**

   Ensure your `frontend/.env.local` includes:
   ```bash
   NEXT_PUBLIC_API_URL=http://localhost:4000
   NEXT_PUBLIC_WS_URL=ws://localhost:4000
   NEXT_PUBLIC_SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
   ```

2. **Start Frontend**
   ```bash
   cd frontend
   npm run dev
   ```

## Testing Checklist

### Phase 1: UI Components

#### 1.1 Trading Mode Toggle (Bottom Navigation)
- [ ] Toggle appears in bottom navigation bar (desktop view)
- [ ] Toggle shows current mode (PAPER highlighted in green, REAL highlighted in red)
- [ ] Toggle displays current active balance
- [ ] Clicking PAPER when in REAL shows confirmation dialog
- [ ] Clicking REAL when in PAPER shows confirmation dialog with warning
- [ ] Confirmation dialog has appropriate styling (Mario theme)
- [ ] Cancel button closes dialog without changing mode
- [ ] Confirm button switches mode successfully
- [ ] Balance updates after mode switch

#### 1.2 Trading Mode Context
- [ ] Context loads initial mode from backend (default: PAPER)
- [ ] Context loads balances correctly
- [ ] virtualSolBalance shows correct paper trading balance
- [ ] realSolBalance shows correct deposited balance
- [ ] activeBalance reflects current mode's balance
- [ ] Mode preference persists in localStorage

### Phase 2: Paper Trading (Existing Functionality)

#### 2.1 Verify Paper Trading Still Works
- [ ] Can execute BUY trades in PAPER mode
- [ ] Can execute SELL trades in PAPER mode
- [ ] virtualSolBalance decreases on buy
- [ ] virtualSolBalance increases on sell
- [ ] Positions update correctly
- [ ] Trade history records paper trades
- [ ] No real transactions are created

### Phase 3: Real Trading - Deposited Balance

#### 3.1 Prerequisites
- [ ] User has deposited SOL balance (check backend user table)
- [ ] realSolBalance > 0
- [ ] User is in REAL trading mode
- [ ] fundingSource is set to DEPOSITED

#### 3.2 Buy Trade Flow (Deposited)
- [ ] Navigate to trade page
- [ ] Select a token
- [ ] Click PAPER/REAL toggle, switch to REAL
- [ ] Select buy amount (e.g., 1 SOL)
- [ ] Click BUY button
- [ ] RealTradeConfirmationModal opens with:
  - [ ] Clear "LIVE TRADING - REAL MONEY" warning
  - [ ] Token information displays correctly
  - [ ] Trade amount shows correctly
  - [ ] Funding source shows "Deposited Balance (1% fee)"
  - [ ] PumpPortal fee calculated correctly (1%)
  - [ ] Network fee displayed
  - [ ] Total cost calculated correctly
  - [ ] Available balance shown
  - [ ] Confirmation checkbox required
  - [ ] Execute button disabled until checkbox checked
- [ ] Check confirmation checkbox
- [ ] Click "Execute BUY Trade" button
- [ ] TransactionStatusTracker opens showing:
  - [ ] "Building Transaction" step
  - [ ] "Submitting Transaction" step
  - [ ] "Confirming Transaction" step
  - [ ] Transaction signature displayed
  - [ ] Solscan link works
  - [ ] Progress updates in real-time
  - [ ] Final "Transaction Confirmed!" state
- [ ] After confirmation:
  - [ ] realSolBalance decreased by total cost
  - [ ] Position created/updated in database
  - [ ] Trade recorded with signature
  - [ ] Transaction link opens on Solscan
  - [ ] Portfolio refreshes automatically

#### 3.3 Sell Trade Flow (Deposited)
- [ ] Have existing position from buy trade
- [ ] Select sell percentage (e.g., 50%)
- [ ] Click SELL button
- [ ] Confirmation modal shows correctly
- [ ] Execute trade
- [ ] Transaction confirmed
- [ ] realSolBalance increased
- [ ] Position updated/reduced
- [ ] Realized PnL recorded

#### 3.4 Error Scenarios (Deposited)
- [ ] Insufficient balance shows error in modal
- [ ] Execute button disabled when insufficient balance
- [ ] API errors display in TransactionStatusTracker
- [ ] Failed transactions show "Transaction Failed" state
- [ ] Error message displayed clearly
- [ ] Can close tracker after error
- [ ] Form resets after error

### Phase 4: Real Trading - Wallet Trading (Advanced)

**Note:** Wallet trading requires user to sign transactions with their connected wallet. This uses the Local Transaction API with 0.5% fees.

#### 4.1 Prerequisites
- [ ] Wallet adapter installed and working
- [ ] User has connected wallet (Phantom/Solflare/Backpack)
- [ ] Wallet has sufficient SOL
- [ ] User is in REAL trading mode
- [ ] fundingSource is set to WALLET

#### 4.2 Wallet Buy Trade Flow
- [ ] Switch fundingSource to WALLET (implementation needed)
- [ ] Select buy amount
- [ ] Click BUY button
- [ ] Confirmation modal shows "Connected Wallet (0.5% fee)"
- [ ] Execute trade
- [ ] TransactionStatusTracker shows "Waiting for Signature" step
- [ ] Wallet popup appears for signing
- [ ] Sign transaction in wallet
- [ ] Transaction submits to network
- [ ] Confirmation received
- [ ] Position updated
- [ ] Trade recorded

#### 4.3 Wallet Error Scenarios
- [ ] User rejects signature shows error
- [ ] Wallet not connected shows error
- [ ] Insufficient wallet balance shows error
- [ ] Network errors handled gracefully

### Phase 5: Backend API Testing

#### 5.1 Test Endpoints with Postman/cURL

**Get User Profile**
```bash
curl http://localhost:4000/api/user-profile/USER_ID
```
Expected: User profile with trading mode and balances

**Get User Balances**
```bash
curl http://localhost:4000/api/user-profile/USER_ID/balances
```
Expected: virtualSolBalance, realSolBalance, tradingMode

**Switch Trading Mode**
```bash
curl -X PATCH http://localhost:4000/api/user-profile/USER_ID/trading-mode \
  -H "Content-Type: application/json" \
  -d '{"tradingMode": "REAL"}'
```
Expected: Success response with updated mode

**Execute Real Trade (Deposited)**
```bash
curl -X POST http://localhost:4000/api/real-trade/execute \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID",
    "mint": "TOKEN_MINT",
    "side": "BUY",
    "amountSol": 1,
    "fundingSource": "DEPOSITED",
    "slippageBps": 300
  }'
```
Expected: Success with transaction signature

**Get Transaction Status**
```bash
curl http://localhost:4000/api/real-trade/status/TRANSACTION_SIGNATURE
```
Expected: Status (PENDING, CONFIRMED, or FAILED)

#### 5.2 Database Verification

After executing trades, verify in database:

```sql
-- Check user balances
SELECT id, "tradingMode", "virtualSolBalance", "realSolBalance"
FROM "User"
WHERE id = 'USER_ID';

-- Check trades
SELECT id, "tradeMode", side, quantity, "totalCost", "realTxSignature", "realTxStatus"
FROM "Trade"
WHERE "userId" = 'USER_ID'
ORDER BY timestamp DESC
LIMIT 10;

-- Check positions
SELECT id, "tradeMode", mint, qty, "avgCost"
FROM "Position"
WHERE "userId" = 'USER_ID';

-- Check position lots (FIFO tracking)
SELECT id, mint, "qtyRemaining", "unitCostUsd", "createdAt"
FROM "PositionLot"
WHERE "userId" = 'USER_ID'
ORDER BY "createdAt" ASC;
```

### Phase 6: Security & Edge Cases

#### 6.1 Security Tests
- [ ] Cannot execute real trades without authentication
- [ ] Cannot execute trades exceeding balance
- [ ] PumpPortal API key never exposed to frontend
- [ ] Transaction signatures verified on-chain
- [ ] User cannot manipulate funding source in API calls
- [ ] Rate limiting works (if implemented)

#### 6.2 Edge Cases
- [ ] Switching modes during active trade
- [ ] Network disconnection during trade
- [ ] Very small trade amounts (<0.001 SOL)
- [ ] Very large trade amounts
- [ ] Rapid consecutive trades
- [ ] Token with no liquidity
- [ ] Expired/invalid token mint

### Phase 7: UI/UX Polish

#### 7.1 Visual Design (Mario Theme)
- [ ] Modal borders use Mario red (border-4)
- [ ] Warning icons display correctly
- [ ] Buttons have proper Mario-style shadows
- [ ] Colors match Mario theme (luigi green for buy, mario red for sell)
- [ ] Typography uses Mario font for headers
- [ ] Spacing and padding consistent with design system

#### 7.2 Responsiveness
- [ ] Modals work on mobile (< 640px)
- [ ] Modals work on tablet (640px - 1024px)
- [ ] Modals work on desktop (> 1024px)
- [ ] Trading mode toggle visible on all screen sizes
- [ ] Transaction tracker readable on mobile

#### 7.3 Accessibility
- [ ] Modals can be dismissed with ESC key
- [ ] Focus management works correctly
- [ ] Confirmation checkbox accessible via keyboard
- [ ] Error messages announced to screen readers
- [ ] Color contrast meets WCAG AA standards

## Common Issues & Troubleshooting

### Issue: Trading mode toggle not visible
**Solution:** Check that TradingModeProvider is in AppProviders hierarchy

### Issue: RealTradeConfirmationModal doesn't open
**Solution:** Verify tradeMode === 'REAL' and realTradeDetails is set correctly

### Issue: Transaction signature not showing
**Solution:** Check that backend returns signature in response and it's stored in state

### Issue: PumpPortal API errors
**Solution:**
- Verify API key is correct in backend .env
- Check API key has sufficient credits
- Review PumpPortal API documentation

### Issue: Balance not updating
**Solution:**
- Call refreshBalances() after trade
- Verify database updated correctly
- Check API endpoint returns updated balances

### Issue: Wallet adapter not loading
**Solution:**
- Check that packages are installed
- Verify SolanaWalletProvider wraps app
- Check browser console for errors

## Performance Testing

### Load Testing
- [ ] Multiple users trading simultaneously
- [ ] High-frequency trades (10+ per minute)
- [ ] Large position sizes
- [ ] Many open positions (50+)

### Metrics to Monitor
- Backend response times (should be < 500ms)
- Transaction confirmation time (typically 2-5 seconds)
- WebSocket connection stability
- Memory usage (frontend & backend)
- Database query performance

## Deployment Checklist

Before deploying to production:

- [ ] All tests passing
- [ ] Database migration applied to production
- [ ] Environment variables set correctly
- [ ] PumpPortal API key valid and funded
- [ ] Rate limiting configured
- [ ] Error logging setup (Sentry/LogRocket)
- [ ] Analytics tracking added
- [ ] User documentation written
- [ ] Support team briefed
- [ ] Rollback plan prepared

## Post-Deployment Monitoring

### Day 1
- [ ] Monitor error rates
- [ ] Check transaction success rates
- [ ] Review user feedback
- [ ] Watch for API errors

### Week 1
- [ ] Analyze trade volume
- [ ] Review fee calculations
- [ ] Check balance accuracy
- [ ] Monitor support tickets

### Month 1
- [ ] User adoption metrics
- [ ] Revenue from fees
- [ ] Performance optimization opportunities
- [ ] Feature requests

## Next Steps & Future Enhancements

See `backend/REAL_TRADING_IMPLEMENTATION_SUMMARY.md` for planned enhancements:
- Deposit/withdrawal implementation
- Unique deposit addresses per user
- Real-time balance updates from blockchain
- Multi-wallet support
- Jito bundle integration
- Trade size limits
- Advanced order types (limit orders, stop-loss)

---

**Last Updated:** 2025-10-23
**Status:** Implementation Complete - Ready for Testing
