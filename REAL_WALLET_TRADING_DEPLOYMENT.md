# Real Wallet Trading System - Deployment Guide

This guide covers the deployment and configuration of the real wallet trading system including deposits, withdrawals, and wallet trading functionality.

## Prerequisites

- Railway account with PostgreSQL database
- Vercel account for frontend deployment
- Helius API account (for webhooks and RPC)
- Platform wallet with some SOL for withdrawals

## Phase 1: Database Migration

### Option A: Using Railway CLI (Recommended)

```bash
# Install Railway CLI if not already installed
npm install -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# Apply the migration
railway run --service backend "npx prisma migrate deploy"
```

### Option B: Manual SQL Execution

1. Go to Railway Dashboard → Your Project → PostgreSQL
2. Click "Connect" and open the Query tab
3. Execute the SQL from `backend/prisma/migrations/add_deposit_withdrawal.sql`

```sql
-- Copy and paste the contents of backend/prisma/migrations/add_deposit_withdrawal.sql
```

### Verify Migration

```bash
# Check tables were created
railway run --service backend "npx prisma studio"
```

You should see new tables: `Deposit` and `Withdrawal`

## Phase 2: Environment Configuration

### Backend Environment Variables (Railway)

Add these variables in Railway Dashboard → Backend Service → Variables:

```bash
# Platform Wallet Seed (CRITICAL - Keep secure!)
PLATFORM_SEED="your-secure-seed-phrase-here"
# Generate with: import { Keypair } from '@solana/web3.js'; 
# const kp = Keypair.generate(); console.log(kp.secretKey);

# Helius Webhook Secret
HELIUS_WEBHOOK_SECRET="your-webhook-secret-here"
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Withdrawal Limits
MIN_WITHDRAWAL_AMOUNT="0.01"
MAX_WITHDRAWAL_AMOUNT="100"
WITHDRAWAL_FEE="0"

# Deposit Limits
MIN_DEPOSIT_AMOUNT="0.01"

# Helius RPC and WebSocket (should already be set)
HELIUS_RPC_URL="https://mainnet.helius-rpc.com/?api-key=YOUR_KEY"
HELIUS_WS="wss://mainnet.helius-rpc.com/?api-key=YOUR_KEY"
HELIUS_API="YOUR_HELIUS_API_KEY"
```

### Frontend Environment Variables (Vercel)

Add these in Vercel Dashboard → Your Project → Settings → Environment Variables:

```bash
# Helius RPC (for wallet balance fetching)
NEXT_PUBLIC_HELIUS_RPC="https://mainnet.helius-rpc.com/?api-key=YOUR_KEY"

# API URL (should already be set)
NEXT_PUBLIC_API_URL="https://your-backend.railway.app"
```

### Generating Platform Seed

**IMPORTANT**: Generate a secure seed and store it safely!

```javascript
// Run this in Node.js to generate a new wallet
const { Keypair } = require('@solana/web3.js');
const kp = Keypair.generate();
console.log('Public Key:', kp.publicKey.toBase58());
console.log('Secret Key (use as PLATFORM_SEED):', Buffer.from(kp.secretKey).toString('base64'));
```

### Fund Platform Hot Wallet

The platform needs a hot wallet for processing withdrawals:

1. Generate the platform hot wallet address:
```bash
# In your backend environment
node -e "
const { getDepositKeypair } = require('./dist/utils/depositAddressGenerator.js');
const kp = getDepositKeypair('platform-hot-wallet', process.env.PLATFORM_SEED);
console.log('Platform Hot Wallet:', kp.publicKey.toBase58());
"
```

2. Send 0.5-1 SOL to this address for withdrawal processing

## Phase 3: Helius Webhook Configuration

### Create Webhook

1. Go to [Helius Dashboard](https://dashboard.helius.dev)
2. Navigate to "Webhooks" → "Create Webhook"
3. Configure webhook:

**Webhook Type:** Account Activity / Transaction

**Webhook URL:** 
```
https://your-backend.railway.app/api/webhooks/helius
```

**Webhook Secret:** 
```
<your-webhook-secret-from-env>
```

**Webhook Events:**
- ✅ Native SOL Transfers
- ✅ Account Activity

**Test Payload:**
Click "Test Webhook" to verify connectivity

### Register User Deposit Addresses

When users generate deposit addresses, they need to be monitored by Helius.

**Option 1: Dynamic Registration (Recommended)**

Add addresses to webhook as users request them:
- Monitor `GET /api/wallet/deposit-address/:userId` calls
- Use Helius API to add addresses to webhook
- Implement in `depositService.ts`:

```typescript
async function registerAddressWithHelius(address: string) {
  // Call Helius API to add address to webhook
  const response = await fetch('https://api.helius.xyz/v0/webhooks/YOUR_WEBHOOK_ID/addresses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.HELIUS_API}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ addresses: [address] })
  });
}
```

**Option 2: Manual Registration**

For testing, manually add a few deposit addresses:
1. Generate deposit address for test user
2. In Helius Dashboard → Webhooks → Your Webhook → Addresses
3. Add the deposit address

## Phase 4: Deploy Backend

### Generate Prisma Client

```bash
cd backend
npx prisma generate
npm run build
```

### Deploy to Railway

```bash
# Option A: Git push (if auto-deploy enabled)
git add .
git commit -m "Add real wallet trading system"
git push origin main

# Option B: Railway CLI
railway up
```

### Verify Deployment

Check Railway logs for:
```
✅ Deposit service initialized
✅ Withdrawal service initialized
✅ Webhook routes registered
```

Test endpoints:
```bash
# Test deposit address generation
curl https://your-backend.railway.app/api/wallet/deposit-address/USER_ID

# Test webhook (development only)
curl -X POST https://your-backend.railway.app/api/webhooks/helius-test \
  -H "Content-Type: application/json" \
  -d '{"userId": "USER_ID", "txSignature": "TX_SIG"}'
```

## Phase 5: Deploy Frontend

### Install Dependencies

Make sure qrcode.react is installed:
```bash
cd frontend
npm install qrcode.react
npm install --save-dev @types/qrcode.react
```

### Build and Deploy

```bash
# Option A: Vercel CLI
npm run build
vercel --prod

# Option B: Git push (if auto-deploy enabled)
git push origin main
```

### Verify Deployment

1. Open your frontend URL
2. Switch to REAL trading mode
3. Click wallet balance dropdown
4. Verify "Deposit SOL" and "Withdraw SOL" options appear

## Phase 6: Testing

### Test Deposit Flow

1. **Generate Deposit Address**
   - Login to frontend
   - Click wallet balance → "Deposit SOL"
   - Copy deposit address
   - Verify QR code displays

2. **Send Test Deposit**
   ```bash
   # Using Solana CLI (devnet/mainnet)
   solana transfer <DEPOSIT_ADDRESS> 0.1
   ```

3. **Verify Webhook Receives**
   - Check Railway logs for webhook receipt
   - Should see: `[RealTrade] Processing deposit`

4. **Verify Balance Update**
   - Check database: `SELECT * FROM "Deposit" WHERE "userId" = 'USER_ID';`
   - Check user balance: `SELECT "realSolBalance" FROM "User" WHERE id = 'USER_ID';`
   - Frontend should show updated balance

### Test Withdrawal Flow

1. **Request Withdrawal**
   - Click wallet balance → "Withdraw SOL"
   - Enter amount (e.g., 0.05 SOL)
   - Enter destination address
   - Click "Withdraw"

2. **Verify Transaction**
   - Check Solscan for transaction
   - Verify funds received at destination
   - Check withdrawal record in database:
   ```sql
   SELECT * FROM "Withdrawal" WHERE "userId" = 'USER_ID' ORDER BY "requestedAt" DESC LIMIT 1;
   ```

3. **Verify Balance Deduction**
   - Frontend balance should update
   - Database balance should reflect deduction

### Test Wallet Trading

1. **Connect Wallet**
   - Click "Connect Wallet" in navigation
   - Connect Phantom/Solflare

2. **Switch to Wallet Funding**
   - Open trading mode settings
   - Select "WALLET" as funding source
   - Verify wallet SOL balance displays

3. **Execute Buy Trade**
   - Go to token trading page
   - Enter buy amount
   - Click "BUY"
   - Confirm in modal
   - **Sign transaction in wallet** (critical step)
   - Wait for confirmation

4. **Verify Trade Execution**
   - Check position appears in portfolio
   - Check trade record in database:
   ```sql
   SELECT * FROM "Trade" WHERE "userId" = 'USER_ID' AND "tradeMode" = 'REAL' ORDER BY "timestamp" DESC LIMIT 1;
   ```
   - Verify `realTxSignature` is set
   - Check transaction on Solscan

5. **Execute Sell Trade**
   - Select sell percentage
   - Click "SELL"
   - Sign in wallet
   - Verify tokens returned to wallet

## Troubleshooting

### Webhook Not Receiving Deposits

**Check 1: Webhook URL**
```bash
curl https://your-backend.railway.app/api/webhooks/helius
# Should return 200 OK
```

**Check 2: Address Registered**
- Verify deposit address is in Helius webhook config
- Check Helius webhook logs

**Check 3: Railway Logs**
```bash
railway logs --service backend
# Look for webhook receipt messages
```

**Check 4: Signature Verification**
```bash
# Temporarily disable signature check (testing only)
# In webhooks.ts, comment out signature verification
```

### Withdrawal Fails

**Error: "Insufficient balance"**
- Check platform hot wallet has SOL:
```bash
solana balance <PLATFORM_HOT_WALLET_ADDRESS>
```

**Error: "Transaction failed"**
- Check RPC endpoint is responsive
- Increase priority fee in withdrawalService.ts

**Error: "Invalid address"**
- Verify destination address is valid Solana address
- Test with: `new PublicKey(address)` in Node.js

### Wallet Signing Not Working

**Wallet doesn't prompt**
- Check wallet is connected: `wallet.publicKey !== null`
- Check wallet supports signing: `wallet.signTransaction !== undefined`
- Try different wallet (Phantom vs Solflare)

**Transaction fails after signing**
- Check `realTradeApi.submitSignedTransaction` response
- Verify signed transaction is valid base64
- Check Railway logs for submission error

### Balance Not Updating

**After deposit:**
- Check webhook was received (Railway logs)
- Check Deposit table has record
- Refresh balance with `refreshBalances()`

**After trade:**
- Check trade was recorded in database
- Invalidate portfolio cache
- Hard refresh browser (Ctrl+Shift+R)

## Monitoring

### Key Metrics to Monitor

1. **Deposit Success Rate**
```sql
SELECT 
  status, 
  COUNT(*) as count,
  SUM(amount) as total_amount
FROM "Deposit"
WHERE "createdAt" > NOW() - INTERVAL '24 hours'
GROUP BY status;
```

2. **Withdrawal Success Rate**
```sql
SELECT 
  status, 
  COUNT(*) as count,
  SUM(amount) as total_amount
FROM "Withdrawal"
WHERE "requestedAt" > NOW() - INTERVAL '24 hours'
GROUP BY status;
```

3. **Platform Hot Wallet Balance**
```bash
# Add to monitoring dashboard
solana balance <PLATFORM_HOT_WALLET_ADDRESS>
# Alert if < 0.1 SOL
```

4. **Failed Webhooks**
```sql
SELECT COUNT(*) FROM "Deposit" WHERE status = 'FAILED';
```

### Set Up Alerts

**Railway:**
- Set up deployment notifications
- Monitor error logs
- Alert on high memory/CPU usage

**Helius:**
- Monitor webhook delivery rate
- Check for failed deliveries
- Set up retry logic

## Security Considerations

### Critical Secrets

1. **PLATFORM_SEED** - Never expose, never commit
   - Store in Railway environment only
   - Rotate if compromised
   - Use hardware wallet for production

2. **HELIUS_WEBHOOK_SECRET** - Verify all webhooks
   - Rotate periodically
   - Monitor for invalid signatures

### Withdrawal Limits

Consider adding:
- Per-user daily withdrawal limits
- Email confirmation for large withdrawals
- 2FA requirement for withdrawals
- Cooldown period between withdrawals

### Platform Wallet Security

- Use separate hot/cold wallets
- Keep minimal SOL in hot wallet
- Implement withdrawal approval queue
- Monitor for unusual activity

## Rollback Plan

If issues arise:

1. **Disable Deposits**
```typescript
// In webhooks.ts
return reply.code(503).send({ error: 'Deposits temporarily disabled' });
```

2. **Disable Withdrawals**
```typescript
// In wallet.ts
return reply.code(503).send({ error: 'Withdrawals temporarily disabled' });
```

3. **Revert Database**
```sql
-- Rollback migration
DROP TABLE "Withdrawal";
DROP TABLE "Deposit";
```

4. **Revert Frontend**
```bash
vercel rollback
```

## Support

For issues during deployment:
1. Check Railway logs: `railway logs`
2. Check Helius webhook logs in dashboard
3. Review this guide's troubleshooting section
4. Check database state with Prisma Studio

## Next Steps

After successful deployment:
1. ✅ Test all flows with small amounts
2. ✅ Monitor for 24-48 hours
3. ✅ Set up automated monitoring
4. ✅ Configure alerts
5. ✅ Document any custom configurations
6. ✅ Train team on troubleshooting
7. ✅ Announce feature to users

Congratulations! Your real wallet trading system is now live! 🚀

