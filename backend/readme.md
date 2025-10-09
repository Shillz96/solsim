# Solsim Backend

Backend API for [Solsim.fun](https://solsim.fun), a Solana paper trading simulator.

---

## Features
- 🪙 **Paper Trading** (simulate buys/sells on Solana tokens)
- 📈 **PnL Tracking** (unrealized + realized, VWAP, MC averages)
- 🏆 **Leaderboards**
- 🔥 **Trending Tokens** (Dexscreener + metadata enrichment)
- 🎁 **Rewards System** (trade → points → SIM token claim)
- 👤 **Profiles** (email or wallet sign-in, avatars, handles, bios)
- 📡 **Live Prices** (Helius WebSocket + Redis pub/sub → frontend WS)

---

## Stack
- [Fastify](https://fastify.io/) (HTTP server)
- [Prisma](https://www.prisma.io/) (Postgres ORM)
- [Redis](https://upstash.com/) (caching, pub/sub)
- [Helius](https://helius.dev/) (Solana RPC + logs)
- [Dexscreener](https://docs.dexscreener.com/) (token fallback data)
- [Jupiter](https://station.jup.ag/) (quote fallback)

---

## Directory
