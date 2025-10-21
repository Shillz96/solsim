# 🚀 QUICK DEPLOYMENT GUIDE - 5 Minute Rewards Cooldown

## ⚡ STEP 1: Run This SQL on Railway Database

```sql
-- Add lastClaimTime field to User table for 5-minute claim cooldown
ALTER TABLE "User" ADD COLUMN "lastClaimTime" TIMESTAMP(3);

-- Create index for efficient cooldown checks
CREATE INDEX "User_lastClaimTime_idx" ON "User"("lastClaimTime");
```

**How to run:**
1. Go to Railway dashboard
2. Open your database service
3. Click "Query" tab
4. Paste the SQL above
5. Click "Execute"

---

## ✅ STEP 2: Commit & Deploy Changes

```bash
# Backend & Frontend will auto-deploy on push
git add .
git commit -m "Add 5-minute rewards cooldown system"
git push origin main
```

---

## 🎯 What Changed

### Backend (`backend/src/routes/rewards.ts`)
- ✅ Added 5-minute cooldown validation
- ✅ Returns cooldown error if < 5 minutes since last claim
- ✅ Updates `lastClaimTime` on successful claim

### Frontend (`frontend/components/portfolio/rewards-card.tsx`)
- ✅ Real-time countdown timer (MM:SS format)
- ✅ Status badges (Ready/Cooldown)
- ✅ Alert banner during cooldown
- ✅ Disabled claim button during cooldown
- ✅ Better error messages

### Database (`backend/prisma/schema.prisma`)
- ✅ Added `lastClaimTime` field to User model

---

## 🧪 Testing Checklist

- [ ] Run SQL migration on Railway
- [ ] Deploy backend & frontend
- [ ] Go to Portfolio page
- [ ] Connect Solana wallet
- [ ] Click "Claim" on a reward
- [ ] Verify countdown timer appears
- [ ] Verify claim button is disabled
- [ ] Wait 5 minutes
- [ ] Verify "Ready" badge appears
- [ ] Claim again successfully

---

## 🎨 UI Preview

**Before Cooldown:**
```
┌─────────────────────────────────┐
│ 🎁 vSOL Token Rewards           │
│ Claimable every 5 minutes       │
├─────────────────────────────────┤
│ Unclaimed: 150 $vSOL            │
│ Status: [✓ Ready]               │
│                                 │
│ [Claim] ← Button enabled        │
└─────────────────────────────────┘
```

**During Cooldown:**
```
┌─────────────────────────────────┐
│ 🎁 vSOL Token Rewards           │
│ Claimable every 5 minutes       │
├─────────────────────────────────┤
│ ⏱️ Next claim in 4:35           │
│                                 │
│ Unclaimed: 150 $vSOL            │
│ Status: [⏳ Cooldown]           │
│                                 │
│ [Wait 4:35] ← Button disabled   │
└─────────────────────────────────┘
```

---

## 🔧 Customization

**Change Cooldown Duration:**
In `backend/src/routes/rewards.ts`, line ~35:
```typescript
const fiveMinutesInMs = 5 * 60 * 1000; // Change 5 to desired minutes
```

**Change Reward Amount Cap:**
In `backend/src/routes/rewards.ts`, line ~87:
```typescript
rewardAmount = Math.min(rewardAmount, 200); // Change 200 to desired cap
```

---

## 📊 Monitoring

After deployment, check:
1. Railway logs for any errors
2. User claims are processing successfully
3. Cooldown timer is displaying correctly
4. No duplicate claims within 5 minutes

---

## 🆘 Troubleshooting

**Problem: Cooldown not working**
- Check database migration was applied
- Verify `lastClaimTime` column exists in User table
- Check backend logs for errors

**Problem: Timer not updating**
- Clear browser cache
- Hard refresh (Ctrl+Shift+R)
- Check browser console for errors

**Problem: Can't claim at all**
- Verify wallet is connected
- Check email is verified
- Ensure rewards exist to claim

---

## 📞 Support

If you encounter issues:
1. Check Railway backend logs
2. Check browser console (F12)
3. Verify database migration was applied
4. Test with different user account

---

**Status: Ready to Deploy! 🚀**
