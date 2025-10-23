# Dual-Mode Trading System

This module provides a complete dual-mode trading system (paper vs live) with:

- ✅ Jupiter v6 integration with optional Jito tips
- ✅ Real-time WebSocket price feeds and fill broadcasting
- ✅ Incremental PnL engine for both paper and live trades
- ✅ Allow-list based mode control per wallet
- ✅ Free Lightweight-Charts integration on frontend

## Backend Files (Railway)

- `index.ts` - Main Express server setup with WS attachment
- `routes/swap.ts` - POST /api/swap endpoint with dual-mode logic
- `services/jupiter.ts` - Jupiter v6 quote + swap builders
- `services/pnlEngine.ts` - Incremental PnL tracking (paper + live)
- `services/priceFeed.ts` - Optional Birdeye WS → local broadcast
- `ws.ts` - WebSocket broadcaster for ticks + fills
- `db.ts` - User access control (trade mode lookup)

## Frontend Files (Vercel)

- `components/PriceChart.tsx` - Lightweight-Charts with BUY/SELL bubbles
- `actions/swap.ts` - Server action to call backend /api/swap
- `trade/page.tsx` - Trade UI with mode awareness

## Environment Variables

### Railway (Backend)
```bash
HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
JUP_BASE=https://quote-api.jup.ag/v6
BIRDEYE_WS=wss://public-api.birdeye.so/socket?x-api-key=YOUR_KEY
ALLOWED_ORIGIN=https://oneupsol.fun
PORT=3000
```

### Vercel (Frontend)
```bash
NEXT_PUBLIC_REALTIME_URL=wss://<your-railway-app>.up.railway.app/realtime
NEXT_PUBLIC_BACKEND_URL=https://<your-railway-app>.up.railway.app
```

## Database Setup

```sql
create type trade_mode as enum ('paper','live');

create table if not exists user_access (
  wallet text primary key,
  mode trade_mode not null default 'paper',
  updated_at timestamptz not null default now()
);

-- Seed yourself for testing
insert into user_access(wallet, mode) 
values ('YourWalletBase58','live')
on conflict (wallet) do update 
set mode=excluded.mode, updated_at=now();
```

## Integration Notes

⚠️ **NOT WIRED UP** - These files are ready but need to be integrated:

1. Import swap router in your main backend index
2. Replace `db.ts` mock with your actual Supabase/Prisma client
3. Add WebSocket server to your existing HTTP server
4. Import PriceChart component in your trade pages
5. Update your wallet adapter to pass wallet address to swap actions

## Customization Checklist

- [ ] Add platform fee (1%) via Jupiter fee params
- [ ] Switch to BigInt for exact math (microUSD + lamports)
- [ ] Add SIWS auth to secure /api/swap
- [ ] Add pump.fun bonding curve support for new launches
- [ ] Fetch OHLC history for initial chart data
- [ ] Add priority fee + Jito tip combined logic
