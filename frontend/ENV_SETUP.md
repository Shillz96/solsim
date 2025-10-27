# Frontend Environment Setup

The frontend can run in two modes:

## 1. Local Development (Full Stack)
**Use when:** You're developing both frontend and backend

```bash
npm run dev:local
```

This uses:
- Backend: `http://localhost:4000`
- WebSocket: `ws://localhost:4000`
- Requires backend running locally

## 2. Production Backend (Frontend Only)
**Use when:** You're only working on frontend UI/UX

```bash
npm run dev:production
```

This uses:
- Backend: `https://solsim-production.up.railway.app`
- WebSocket: `wss://solsim-production.up.railway.app`
- No backend setup needed

## Quick Switch

Switch between configurations anytime:

```bash
# Switch to local backend
copy .env.local.dev .env.local

# Switch to production backend  
copy .env.local.production .env.local

# Restart dev server (Ctrl+C then npm run dev)
```

## Configuration Files

- `.env.local.dev` - Local backend configuration
- `.env.local.production` - Production backend configuration
- `.env.local` - Active configuration (gitignored, auto-generated)

**Never commit `.env.local`** - it's auto-generated from the template files.
