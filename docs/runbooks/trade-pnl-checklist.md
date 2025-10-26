# Trade PnL Validation Checklist

This runbook provides step-by-step manual validation procedures for trading and PnL calculations to ensure correctness and consistency.

## Prerequisites

- Access to the trading application
- Test user account with sufficient balance
- Browser developer tools open
- Network tab monitoring enabled

## Test Environment Setup

1. **Clear Browser Data**
   - Clear cookies, localStorage, and sessionStorage
   - Hard refresh the page (Ctrl+Shift+R)

2. **Open Developer Tools**
   - Press F12 or right-click → Inspect
   - Go to Network tab
   - Enable "Preserve log" checkbox

3. **Login with Test Account**
   - Use a dedicated test account
   - Note the initial SOL balance
   - Verify account has sufficient funds for testing

## Test Scenarios

### Scenario 1: Basic Buy Order

**Objective**: Verify buy order execution and position creation

**Steps**:
1. Navigate to trading page
2. Select a token (e.g., SOL)
3. Enter quantity: `1.0`
4. Click "Buy" button
5. Wait for confirmation

**Expected Results**:
- [ ] Trade confirmation appears
- [ ] Position shows in portfolio
- [ ] SOL balance decreases by trade cost
- [ ] PnL shows as unrealized (positive or negative)
- [ ] Trade appears in trade history

**Validation Queries**:
```sql
-- Check trade was recorded
SELECT * FROM trades WHERE user_id = 'test_user_id' ORDER BY created_at DESC LIMIT 1;

-- Check position was created
SELECT * FROM positions WHERE user_id = 'test_user_id' AND mint = 'token_mint';

-- Check FIFO lot was created
SELECT * FROM position_lots WHERE user_id = 'test_user_id' AND mint = 'token_mint';
```

### Scenario 2: FIFO Sell Order

**Objective**: Verify FIFO lot consumption and realized PnL calculation

**Steps**:
1. Complete Scenario 1 (buy 1.0 tokens)
2. Buy another 2.0 tokens at different price
3. Sell 1.5 tokens
4. Verify FIFO order

**Expected Results**:
- [ ] First lot (1.0 tokens) is completely consumed
- [ ] Second lot (0.5 tokens) is partially consumed
- [ ] Realized PnL is calculated correctly
- [ ] Remaining position shows correct quantity and cost basis

**Validation Queries**:
```sql
-- Check lot consumption
SELECT * FROM position_lots 
WHERE user_id = 'test_user_id' AND mint = 'token_mint' 
ORDER BY created_at ASC;

-- Check realized PnL
SELECT * FROM realized_pnl 
WHERE user_id = 'test_user_id' AND mint = 'token_mint'
ORDER BY created_at DESC;
```

### Scenario 3: Price Update and Unrealized PnL

**Objective**: Verify real-time price updates and unrealized PnL calculation

**Steps**:
1. Complete Scenario 1 (buy 1.0 tokens)
2. Wait for price update (or manually trigger)
3. Verify unrealized PnL updates
4. Check WebSocket connection

**Expected Results**:
- [ ] Price updates in real-time
- [ ] Unrealized PnL recalculates automatically
- [ ] WebSocket connection is stable
- [ ] No duplicate price updates

**Network Monitoring**:
- Check WebSocket messages in Network tab
- Verify message format and frequency
- Look for connection drops or errors

### Scenario 4: Double-Click Protection

**Objective**: Verify idempotency and double-submit protection

**Steps**:
1. Select token and quantity
2. Rapidly click "Buy" button multiple times
3. Verify only one trade executes
4. Check for error messages

**Expected Results**:
- [ ] Only one trade executes
- [ ] Subsequent clicks are ignored or show error
- [ ] No duplicate trades in database
- [ ] User balance is correct

**Validation Queries**:
```sql
-- Check for duplicate trades
SELECT COUNT(*) as trade_count, mint, side, qty, created_at
FROM trades 
WHERE user_id = 'test_user_id' 
AND created_at > NOW() - INTERVAL '1 minute'
GROUP BY mint, side, qty, created_at
HAVING COUNT(*) > 1;
```

### Scenario 5: Insufficient Balance

**Objective**: Verify balance validation and error handling

**Steps**:
1. Note current SOL balance
2. Enter quantity larger than balance allows
3. Click "Buy" button
4. Verify error message

**Expected Results**:
- [ ] Error message appears
- [ ] No trade is executed
- [ ] Balance remains unchanged
- [ ] Error message is user-friendly

### Scenario 6: Slippage Protection

**Objective**: Verify slippage calculation and protection

**Steps**:
1. Set maximum slippage to 1%
2. Place large buy order
3. Verify slippage calculation
4. Check if trade is rejected for excessive slippage

**Expected Results**:
- [ ] Slippage is calculated correctly
- [ ] Trade is rejected if slippage exceeds limit
- [ ] Error message explains slippage issue
- [ ] User can adjust quantity and retry

### Scenario 7: PnL Reconciliation After Refresh

**Objective**: Verify PnL consistency after page refresh

**Steps**:
1. Complete several buy/sell trades
2. Note current PnL values
3. Refresh the page (F5)
4. Verify PnL values match

**Expected Results**:
- [ ] PnL values are identical after refresh
- [ ] Positions are correctly displayed
- [ ] Trade history is complete
- [ ] No data loss or corruption

**Validation Queries**:
```sql
-- Verify PnL consistency
SELECT 
  p.mint,
  p.qty,
  p.cost_basis,
  COALESCE(SUM(rp.pnl), 0) as total_realized_pnl
FROM positions p
LEFT JOIN realized_pnl rp ON p.user_id = rp.user_id AND p.mint = rp.mint
WHERE p.user_id = 'test_user_id'
GROUP BY p.mint, p.qty, p.cost_basis;
```

### Scenario 8: WebSocket Reconnection

**Objective**: Verify WebSocket resilience and reconnection

**Steps**:
1. Open browser developer tools
2. Go to Network tab → WS
3. Disable network connection
4. Wait 10 seconds
5. Re-enable network connection
6. Verify reconnection

**Expected Results**:
- [ ] WebSocket reconnects automatically
- [ ] Price updates resume
- [ ] No duplicate messages
- [ ] Connection status is accurate

### Scenario 9: Concurrent Trading

**Objective**: Verify system handles concurrent operations

**Steps**:
1. Open two browser tabs/windows
2. Login with same account
3. Place trades simultaneously
4. Verify both trades execute correctly

**Expected Results**:
- [ ] Both trades execute successfully
- [ ] No race conditions
- [ ] PnL calculations are correct
- [ ] Database consistency is maintained

### Scenario 10: Error Recovery

**Objective**: Verify system recovers from errors gracefully

**Steps**:
1. Place a trade
2. Simulate network error (disable network)
3. Re-enable network
4. Verify system recovers

**Expected Results**:
- [ ] System recovers gracefully
- [ ] No data corruption
- [ ] User can continue trading
- [ ] Error messages are helpful

## Performance Validation

### Response Time Checks

- [ ] Trade execution < 1 second
- [ ] Price updates < 250ms
- [ ] Portfolio load < 500ms
- [ ] WebSocket connection < 1 second

### Load Testing

- [ ] System handles 50+ concurrent users
- [ ] No memory leaks during extended use
- [ ] Database performance remains stable
- [ ] WebSocket connections are stable

## Data Integrity Checks

### Database Consistency

```sql
-- Check for orphaned records
SELECT COUNT(*) FROM position_lots pl
LEFT JOIN positions p ON pl.position_id = p.id
WHERE p.id IS NULL;

-- Check for negative quantities
SELECT * FROM positions WHERE qty < 0;
SELECT * FROM position_lots WHERE qty_remaining < 0;

-- Check for missing cost basis
SELECT * FROM positions WHERE cost_basis IS NULL OR cost_basis = 0;
```

### PnL Accuracy

```sql
-- Verify PnL calculations
SELECT 
  p.mint,
  p.qty,
  p.cost_basis,
  COALESCE(SUM(rp.pnl), 0) as realized_pnl,
  (p.qty * current_price - p.cost_basis) as unrealized_pnl
FROM positions p
LEFT JOIN realized_pnl rp ON p.user_id = rp.user_id AND p.mint = rp.mint
WHERE p.user_id = 'test_user_id'
GROUP BY p.mint, p.qty, p.cost_basis;
```

## Troubleshooting

### Common Issues

1. **Trade Not Executing**
   - Check network connection
   - Verify user balance
   - Check for error messages in console
   - Verify API endpoints are responding

2. **PnL Not Updating**
   - Check WebSocket connection
   - Verify price service is running
   - Check for JavaScript errors
   - Refresh page and retry

3. **WebSocket Disconnection**
   - Check network stability
   - Verify WebSocket endpoint
   - Check for rate limiting
   - Monitor connection logs

4. **Database Inconsistencies**
   - Run integrity checks
   - Check for failed transactions
   - Verify FIFO lot ordering
   - Check for duplicate records

### Debug Commands

```bash
# Check service status
curl -X GET http://localhost:3000/api/health

# Check WebSocket connection
wscat -c ws://localhost:3000/ws/prices

# Check database connection
psql -h localhost -U postgres -d solsim -c "SELECT 1;"

# Check Redis connection
redis-cli ping
```

## Sign-off Checklist

- [ ] All test scenarios pass
- [ ] Performance requirements met
- [ ] Data integrity verified
- [ ] Error handling works correctly
- [ ] WebSocket resilience confirmed
- [ ] PnL calculations are accurate
- [ ] No security vulnerabilities found
- [ ] Documentation is complete

## Test Results Template

```
Test Date: ___________
Tester: ___________
Environment: ___________

Scenario 1: Basic Buy Order
- Status: [ ] PASS [ ] FAIL
- Notes: ___________

Scenario 2: FIFO Sell Order
- Status: [ ] PASS [ ] FAIL
- Notes: ___________

Scenario 3: Price Update and Unrealized PnL
- Status: [ ] PASS [ ] FAIL
- Notes: ___________

Scenario 4: Double-Click Protection
- Status: [ ] PASS [ ] FAIL
- Notes: ___________

Scenario 5: Insufficient Balance
- Status: [ ] PASS [ ] FAIL
- Notes: ___________

Scenario 6: Slippage Protection
- Status: [ ] PASS [ ] FAIL
- Notes: ___________

Scenario 7: PnL Reconciliation After Refresh
- Status: [ ] PASS [ ] FAIL
- Notes: ___________

Scenario 8: WebSocket Reconnection
- Status: [ ] PASS [ ] FAIL
- Notes: ___________

Scenario 9: Concurrent Trading
- Status: [ ] PASS [ ] FAIL
- Notes: ___________

Scenario 10: Error Recovery
- Status: [ ] PASS [ ] FAIL
- Notes: ___________

Overall Result: [ ] PASS [ ] FAIL

Issues Found:
1. ___________
2. ___________
3. ___________

Recommendations:
1. ___________
2. ___________
3. ___________
```