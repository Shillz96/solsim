# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

1UP SOL is a **Solana paper trading game** with real-time PnL tracking, FIFO accounting, and Mario-themed UI. Next.js frontend + Fastify backend monorepo.

**NOT a real trading platform** - all trades use virtual SOL for risk-free practice.

## Commands

```bash
# Development
npm run dev:backend     # :8000
npm run dev:frontend    # :3000

# Database  
npm run db:migrate      # Apply Prisma migrations
npm run db:studio       # Open Prisma Studio
```

## Architecture

### Price Updates (PumpPortal WebSocket)
Frontend → `/ws/prices` → `priceService-optimized.ts` → `pumpPortalStreamService.ts` → broadcasts

**Why PumpPortal-only**: Supports ALL Solana tokens, free WebSocket, no race conditions

### Trade Execution (FIFO)
**CRITICAL**: Always consume oldest lots first: `orderBy: { createdAt: 'asc' }`

### Warp Pipes (TokenDiscovery)
`/trending` page uses `TokenDiscovery` table (PumpPortal data), NOT generic trending APIs

```typescript
// ✅ CORRECT - Warp Pipes
useWarpPipesFeed()  // → /api/warp-pipes/feed → TokenDiscovery

// ❌ WRONG
useTrendingTokens() // → /api/trending → Birdeye/DexScreener
```

### CSS Custom Properties (Theme Tokens)

**Always use CSS custom properties for colors** to ensure consistency and maintainability:

```typescript
// ✅ CORRECT - Use CSS custom properties
<div className="bg-[var(--star-yellow)]">
<div className="border-4 border-[var(--outline-black)]">
<div className="text-[var(--mario-red)]">

// ❌ WRONG - Don't use Tailwind color scales
<div className="bg-yellow-400">
<div className="border-gray-900">
<div className="text-red-500">
```

**Available Mario Theme Tokens** (defined in `frontend/app/globals.css`):

```css
--mario-red: #E52521;        /* Mario Red - Primary actions, danger */
--luigi-green: #43B047;      /* Luigi Green - Success, safe states */
--star-yellow: #FFD800;      /* Star Yellow - Highlights, CTAs */
--coin-yellow: #FFD700;      /* Coin Yellow - Gold elements */
--sky-blue: #A6D8FF;         /* Sky Blue - Info, water elements */
--pipe-green: #00994C;       /* Pipe Green - Neutral elements */
--outline-black: #1C1C1C;    /* Outline Black - Borders, shadows */
```

**Common Backgrounds**:
```css
--background: #FFFAE9;       /* Warm Paper Cream - Main background */
--card: #FFFAE9;             /* Card background */
```

### Button Patterns

**CartridgePill Component** - The standard button pattern for 1UP SOL:

## Mario Theme Code Patterns

**CartridgePill Button Component**:
```tsx
<CartridgePill value="Trade" size="sm" bgColor="var(--mario-red)" />
```

**Cards**:
```tsx
className="bg-white border-4 border-[var(--outline-black)] shadow-[6px_6px_0_var(--outline-black)] rounded-[16px] p-6 hover:shadow-[8px_8px_0_var(--outline-black)] hover:-translate-y-[2px] transition-all"
```

**Typography**:
- Headers: `font-mario text-[18px]` (pixel font, 14-32px only)
- Body: `text-[14px]` (system font)
- Numbers: `font-mono text-[16px] font-bold`

**Colors**: Always `var(--mario-red)`, `var(--luigi-green)`, `var(--star-yellow)`, `var(--sky-blue)`, `var(--outline-black)`

**Borders**: `border-3` or `border-4` (never `border-1`)

**Shadows**: Block shadows only - `shadow-[6px_6px_0_var(--outline-black)]`

**Anti-patterns**:
- ❌ Tailwind scales (`bg-red-500`, `border-gray-300`)
- ❌ Dark mode (`dark:`)
- ❌ Soft shadows (`shadow-lg`)
- ❌ Pixel font for body text

See `frontend/MARIO_THEME_DESIGN_SYSTEM.md` for complete docs.
