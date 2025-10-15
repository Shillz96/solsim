# VirtualSol Backend + Frontend

A paper trading platform on Solana with real-time PnL tracking, rewards, trending tokens, and KOL wallet tracking.

---

## Backend

### Features
- Fastify + Prisma + Redis backend
- Paper trading with accurate PnL
- Leaderboards & rewards
- Token metadata enrichment
- Dexscreener + Helius data sources
- Redis WebSocket for live prices
- Wallet tracker (follow KOLs)
- Candle API for chart overlays
- Token search API

### Running
```bash
cd backend
npm install
npx prisma migrate dev
npm run dev
Frontend (Next.js)
Features

Portfolio Mini-Bar (live updates)

Navbar Search with trending + hover preview

Dexscreener chart embed with custom overlay lines (Avg Buy/Sell)

Trade strip & history components

Running
cd frontend
npm install
npm run dev

Env Variables

See .env.example:

DATABASE_URL

REDIS_URL

SOLANA_RPC

HELIUS_API / HELIUS_WS

DEXSCREENER_BASE

JUPITER_BASE

VSOL_TOKEN_MINT

REWARDS_WALLET_SECRET