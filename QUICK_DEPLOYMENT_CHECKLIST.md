# Quick Deployment Checklist - Real Wallet Trading

Use this checklist to deploy the real wallet trading system in under 2 hours.

## Pre-Deployment (15 min)

### 1. Install Frontend Dependencies
```bash
cd frontend
npm install qrcode.react @types/qrcode.react
npm run build  # Verify no errors
```

### 2. Generate Platform Seed
```bash
node -e "const {Keypair} = require('@solana/web3.js'); const kp = Keypair.generate(); console.log('Address:', kp.publicKey.toBase58()); console.log('Seed:', Buffer.from(kp.secretKey).toString('base64'));"
```
**Save the seed securely!**

### 3. Generate Webhook Secret
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Railway Deployment (30 min)

### 4. Set Environment Variables

Go to Railway Dashboard → Backend Service → Variables:

```bash
PLATFORM_SEED="<from-step-2>"
HELIUS_WEBHOOK_SECRET="<from-step-3>"
MIN_WITHDRAWAL_AMOUNT="0.01"
MAX_WITHDRAWAL_AMOUNT="100"
WITHDRAWAL_FEE="0"
MIN_DEPOSIT_AMOUNT="0.01"
```

### 5. Apply Database Migration

Option A - Railway CLI:
```bash
railway link
railway run --service backend "npx prisma migrate deploy"
```

Option B - Manual SQL:
1. Go to Railway → PostgreSQL → Query
2. Paste contents of `backend/prisma/migrations/add_deposit_withdrawal.sql`
3. Execute

### 6. Verify Migration
```bash
railway run --service backend "npx prisma studio"
```
Check for `Deposit` and `Withdrawal` tables.

### 7. Deploy Backend
```bash
git add .
git commit -m "Add real wallet trading system"
git push origin main
```

Wait for Railway deployment to complete.

### 8. Get Platform Hot Wallet Address
```bash
# In Node.js with backend dependencies
const { getDepositKeypair } = require('./backend/dist/utils/depositAddressGenerator.js');
const kp = getDepositKeypair('platform-hot-wallet', process.env.PLATFORM_SEED);
console.log('Hot Wallet:', kp.publicKey.toBase58());
```

### 9. Fund Platform Wallet
Send 0.5-1 SOL to the hot wallet address for processing withdrawals.

## Helius Configuration (15 min)

### 10. Create Webhook

1. Go to https://dashboard.helius.dev
2. Webhooks → Create Webhook
3. Configure:
   - **Type:** Transaction / Account Activity
   - **URL:** `https://your-backend.railway.app/api/webhooks/helius`
   - **Secret:** `<HELIUS_WEBHOOK_SECRET from step 3>`
   - **Events:** ✅ Native SOL Transfers, ✅ Account Activity
4. Save webhook

### 11. Test Webhook
```bash
curl -X POST https://your-backend.railway.app/api/webhooks/helius \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```
Should return 200 OK.

## Vercel Deployment (15 min)

### 12. Set Vercel Environment Variables

Go to Vercel Dashboard → Your Project → Settings → Environment Variables:

```bash
NEXT_PUBLIC_HELIUS_RPC="https://mainnet.helius-rpc.com/?api-key=YOUR_KEY"
```

### 13. Deploy Frontend
```bash
git push origin main
```
Or:
```bash
cd frontend
vercel --prod
```

## Testing (30 min)

### 14. Test Deposit Address Generation

1. Login to frontend
2. Click wallet balance dropdown
3. Click "Deposit SOL"
4. Verify:
   - Deposit address displays
   - QR code appears
   - Address is copyable

### 15. Test Deposit Flow

```bash
# Send test deposit (mainnet-beta)
solana transfer <DEPOSIT_ADDRESS> 0.1 --allow-unfunded-recipient

# Or use Phantom wallet to send
```

Wait 1-2 minutes, then:
- Check Railway logs for webhook receipt
- Verify balance updated in frontend
- Check deposit appears in history

### 16. Test Withdrawal Flow

1. Click "Withdraw SOL"
2. Enter 0.05 SOL
3. Enter your wallet address
4. Click "Withdraw"
5. Verify:
   - Transaction appears on Solscan
   - Funds received
   - Balance deducted in frontend
   - Withdrawal appears in history

### 17. Test Wallet Trading

1. Connect wallet (Phantom/Solflare)
2. Switch to REAL mode
3. Select WALLET as funding source
4. Navigate to a token
5. Execute a small buy (0.01 SOL)
6. Sign transaction in wallet
7. Verify:
   - Transaction confirms
   - Position appears in portfolio
   - Trade appears in history

### 18. Test Sell

1. Select sell percentage (25%)
2. Click "SELL"
3. Sign in wallet
4. Verify tokens returned

## Monitoring Setup (15 min)

### 19. Set Up Alerts

**Railway:**
- Enable deployment notifications
- Set up log alerts for errors

**Platform Wallet:**
- Bookmark Solscan page for hot wallet
- Set reminder to check balance daily

**Helius:**
- Check webhook delivery rate in dashboard
- Enable failure notifications

### 20. Document Custom Config

Create a note with:
- Platform hot wallet address
- Webhook ID from Helius
- Any custom environment variable values
- Test user IDs used for testing

## Go Live! (5 min)

### 21. Announce Feature

- [ ] Update documentation
- [ ] Notify team
- [ ] Prepare user announcement
- [ ] Monitor for first 24 hours

### 22. Monitor First Day

Check every 2-4 hours:
- [ ] Deposit success rate
- [ ] Withdrawal success rate
- [ ] Platform wallet balance
- [ ] Error logs
- [ ] User feedback

## Quick Reference

### Important URLs

**Railway Dashboard:**
`https://railway.app/dashboard`

**Helius Dashboard:**
`https://dashboard.helius.dev`

**Vercel Dashboard:**
`https://vercel.com/dashboard`

**Backend API:**
`https://your-backend.railway.app`

**Frontend:**
`https://your-frontend.vercel.app`

### Key Endpoints

```bash
# Deposit address
GET /api/wallet/deposit-address/:userId

# Deposit history
GET /api/wallet/deposits/:userId

# Withdraw
POST /api/wallet/withdraw

# Withdrawal history
GET /api/wallet/withdrawals/:userId

# Webhook
POST /api/webhooks/helius
```

### Common Issues

**Webhook not receiving:**
- Check Helius webhook logs
- Verify URL is correct
- Check Railway logs

**Withdrawal fails:**
- Check platform wallet balance
- Verify RPC endpoint responsive
- Check transaction on Solscan

**Wallet signing not working:**
- Verify wallet is connected
- Try different wallet
- Check browser console for errors

## Rollback Plan

If critical issues:

1. **Disable deposits:**
```typescript
// In webhooks.ts line ~30
return reply.code(503).send({ error: 'Maintenance mode' });
```

2. **Disable withdrawals:**
```typescript
// In wallet.ts line ~200
return reply.code(503).send({ error: 'Maintenance mode' });
```

3. **Revert frontend:**
```bash
vercel rollback
```

4. **Revert backend:**
```bash
railway rollback
```

## Success Criteria

✅ Deposits auto-credit within 2 minutes
✅ Withdrawals process successfully
✅ Wallet trading executes correctly
✅ No errors in Railway logs
✅ Platform wallet balance stable
✅ Users can see updated balances

## Support Contacts

- **Railway Support:** https://railway.app/help
- **Helius Support:** support@helius.dev
- **Vercel Support:** https://vercel.com/support

---

**Total Estimated Time:** 2 hours
**Recommended:** Test on staging first, deploy during low-traffic hours
**Have fun! 🚀**

