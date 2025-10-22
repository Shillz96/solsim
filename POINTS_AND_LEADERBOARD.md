# 1UP SOL - Points & Leaderboard System

**Version**: 2.0
**Last Updated**: January 2025
**System**: XP-based progression with global leaderboards

---

## Table of Contents

1. [Overview](#overview)
2. [XP (Experience Points) System](#xp-experience-points-system)
3. [Level Progression](#level-progression)
4. [Leaderboard System](#leaderboard-system)
5. [Points Calculation](#points-calculation)
6. [Achievements & Bonuses](#achievements--bonuses)
7. [Implementation Details](#implementation-details)

---

## Overview

1UP SOL uses a gamified progression system inspired by classic video games. Players earn **XP (Experience Points)** through trading activity, level up through 20 Mario-themed ranks, and compete on global leaderboards.

### Key Features

- **XP Earning**: Gain XP from every trade, profit, and milestone
- **Level System**: 20 levels from "Goomba Trader" to "Legendary Luigi"
- **Leaderboards**: Compete globally based on portfolio performance
- **Achievements**: Unlock bonuses for hitting milestones
- **Real-time Updates**: Live XP progress bars and leaderboard rankings

---

## XP (Experience Points) System

### How to Earn XP

#### 1. Trading Activity (Base XP)
Every trade earns XP, regardless of profit or loss:

```
Base XP = 10 + (Trade Volume USD * 0.1)
```

**Examples:**
- $100 trade = 10 + (100 × 0.1) = **20 XP**
- $500 trade = 10 + (500 × 0.1) = **60 XP**
- $1,000 trade = 10 + (1,000 × 0.1) = **110 XP**

#### 2. Profitable Trades (Bonus XP)
Profitable trades earn additional XP:

```
Profit Bonus XP = 25 + (Profit USD * 0.5)
```

**Examples:**
- $50 profit = 25 + (50 × 0.5) = **50 bonus XP**
- $200 profit = 25 + (200 × 0.5) = **125 bonus XP**
- $1,000 profit = 25 + (1,000 × 0.5) = **525 bonus XP**

**Total XP for profitable trade:**
```
Total XP = Base XP + Profit Bonus XP
```

**Example:** $500 trade with $100 profit:
- Base: 10 + (500 × 0.1) = 60 XP
- Bonus: 25 + (100 × 0.5) = 75 XP
- **Total: 135 XP**

---

## Level Progression

### 20 Mario-Themed Levels

Players progress through 20 levels with exponentially increasing XP requirements:

| Level | Name | XP Required | Emoji | Description |
|-------|------|-------------|-------|-------------|
| 1 | Goomba Trader | 0 | 🍄 | Just getting started |
| 2 | Coin Collector | 100 | 🪙 | Learning the basics |
| 3 | Koopa Troopa | 250 | 🐢 | Building momentum |
| 4 | Fire Flower | 500 | 🌸 | Heating up |
| 5 | Super Trader | 1,000 | ⭐ | Trading with confidence |
| 6 | Tanooki Suit | 2,000 | 🦝 | Versatile strategies |
| 7 | Yoshi Rider | 4,000 | 🦖 | Fast and agile |
| 8 | Cape Feather | 8,000 | 🪶 | Soaring profits |
| 9 | Metal Mario | 12,000 | 🤖 | Unstoppable |
| 10 | Wing Cap | 20,000 | 🦅 | Flying high |
| 11 | Star Power | 35,000 | 💫 | Invincible streak |
| 12 | Mega Mushroom | 55,000 | 🍄⬆️ | Massive gains |
| 13 | Hammer Bro | 80,000 | 🔨 | Crushing it |
| 14 | Lakitu Cloud | 110,000 | ☁️ | Above the market |
| 15 | Chain Chomp | 125,000 | ⚫ | Aggressive trading |
| 16 | Bowser Jr. | 200,000 | 👑 | Elite trader |
| 17 | Princess Peach | 300,000 | 👸 | Royalty status |
| 18 | King Bowser | 420,000 | 🐉 | Market dominator |
| 19 | Super Mario | 570,000 | 🔴 | Legendary trader |
| 20 | Legendary Luigi | 750,000 | 💚🔥 | Master of markets |

### XP Formula

The XP required for each level follows an exponential curve:

```
Level 1-5: Linear growth (100 XP increments)
Level 6-10: Exponential (2x multiplier)
Level 11-15: Super exponential (1.5-2x multiplier)
Level 16-20: Legendary tier (1.3-1.5x multiplier)
```

**Implementation:**
```typescript
// See: frontend/lib/utils/levelSystem.ts
export const levels = [
  { level: 1, name: "Goomba Trader", xpRequired: 0, emoji: "🍄" },
  { level: 5, name: "Super Trader", xpRequired: 1000, emoji: "⭐" },
  { level: 10, name: "Wing Cap", xpRequired: 20000, emoji: "🦅" },
  { level: 20, name: "Legendary Luigi", xpRequired: 750000, emoji: "💚🔥" },
  // ... see file for complete list
];
```

---

## Leaderboard System

### Ranking Criteria

Players are ranked based on **Portfolio Performance**, calculated as:

```
Score = Total Portfolio Value (USD) + Realized PnL (USD)
```

**Components:**
1. **Current Holdings**: Market value of all open positions
2. **Realized Profits**: Total profits from closed trades
3. **Realized Losses**: Total losses from closed trades (negative impact)

### Leaderboard Tiers

| Rank | Tier | Badge | Bonus XP |
|------|------|-------|----------|
| #1 | Champion | 🏆 | +5,000 XP |
| #2-10 | Elite | 🥇 | +1,500 XP |
| #11-50 | Pro | 🥈 | +500 XP |
| #51-100 | Rising Star | 🥉 | +200 XP |
| #101+ | Trader | - | - |

### Leaderboard Features

- **Real-time Updates**: Rankings update every 60 seconds
- **User Highlight**: Your rank is always highlighted
- **Performance Metrics**: Shows portfolio value, PnL %, and trade count
- **Historical Tracking**: View past rankings and performance trends

---

## Points Calculation

### Trading Volume Points

Players earn points based on cumulative trading volume:

```
Volume Points = Total Volume USD / 1000
```

**Example:**
- $10,000 total volume = **10 points**
- $50,000 total volume = **50 points**
- $100,000 total volume = **100 points**

### Win Rate Multiplier

High win rates boost XP earnings:

```
Win Rate Bonus = (Win Rate % / 10) * 100 XP
```

**Examples:**
- 50% win rate = (50 / 10) × 100 = **500 XP**
- 70% win rate = (70 / 10) × 100 = **700 XP**
- 90% win rate = (90 / 10) × 100 = **900 XP**

---

## Achievements & Bonuses

### Trading Milestones

| Achievement | Requirement | Bonus XP |
|-------------|-------------|----------|
| First Trade | Complete 1 trade | +100 XP |
| Getting Started | Complete 10 trades | +250 XP |
| Active Trader | Complete 50 trades | +500 XP |
| Veteran Trader | Complete 100 trades | +1,000 XP |
| Power Trader | Complete 500 trades | +5,000 XP |

### Performance Achievements

| Achievement | Requirement | Bonus XP |
|-------------|-------------|----------|
| Diamond Hands | Hold position 7+ days | +500 XP |
| 10-Bagger | 10x return on trade | +1,000 XP |
| Perfect Week | 7 profitable trades in a row | +750 XP |
| Portfolio ATH | Reach new all-time high | +750 XP |
| $10K Portfolio | Portfolio value > $10,000 | +1,500 XP |

### Daily Bonuses

| Bonus | Requirement | XP |
|-------|-------------|-----|
| Daily Login | Login once per day | +50 XP |
| Daily Trade | 1 trade per day | +100 XP |
| Active Day | 5+ trades in one day | +250 XP |

---

## Implementation Details

### Database Schema

**User Model** (relevant fields):
```prisma
model User {
  id                String   @id @default(uuid())
  email             String   @unique
  walletAddress     String?  @unique
  totalXP           Int      @default(0)
  currentLevel      Int      @default(1)
  totalTrades       Int      @default(0)
  portfolioValue    Decimal  @default(0)
  realizedPnL       Decimal  @default(0)
  leaderboardScore  Decimal  @default(0) // portfolioValue + realizedPnL
  // ... other fields
}
```

### Frontend Components

**XP Display:**
- `frontend/components/level/xp-progress-bar.tsx` - Progress bar with variants
- `frontend/components/level/xp-badge.tsx` - Compact XP badge for nav
- `frontend/components/level/level-up-toast.tsx` - Level-up celebration

**Leaderboard:**
- `frontend/app/leaderboard/page.tsx` - Main leaderboard page
- `frontend/components/leaderboard/leaderboard-table.tsx` - Rankings table

### Backend Services

**XP Calculation:**
```typescript
// backend/src/services/xpService.ts
export function calculateTradeXP(trade: Trade): number {
  const baseXP = 10 + (trade.volumeUSD * 0.1);
  const profitBonus = trade.profitUSD > 0
    ? 25 + (trade.profitUSD * 0.5)
    : 0;
  return Math.floor(baseXP + profitBonus);
}
```

**Leaderboard Update:**
```typescript
// backend/src/services/leaderboardService.ts
export async function updateLeaderboardScore(userId: string) {
  const portfolio = await getPortfolioValue(userId);
  const realizedPnL = await getRealizedPnL(userId);
  const score = portfolio.add(realizedPnL);

  await prisma.user.update({
    where: { id: userId },
    data: { leaderboardScore: score }
  });
}
```

### API Endpoints

**GET /api/leaderboard**
- Returns top 100 players ranked by score
- Includes user position if authenticated

**GET /api/user/xp**
- Returns current XP, level, and progress to next level

**POST /api/trades** (creates trade)
- Automatically calculates and awards XP
- Updates leaderboard score
- Checks for achievement unlocks

---

## Migration from Old System

### Old VSOL Token System (Deprecated)

The previous reward system used VSOL tokens:
- 1 trade = 1 point = 1,000 VSOL
- $100 volume = 2 points = 2,000 VSOL
- 10% win rate = 10 points = 10,000 VSOL

### New XP System (Current)

The new system focuses on gamification:
- XP earned from every trade (not tokens)
- Level progression with Mario themes
- Leaderboard competition
- Achievement-based bonuses

**Why the Change?**
- More engaging and game-like
- No token economics complications
- Simpler to understand and implement
- Better aligns with "paper trading game" concept

---

## Future Enhancements

### Planned Features

1. **Seasonal Leaderboards**
   - Monthly/quarterly resets
   - Special seasonal rewards
   - Themed competitions

2. **Team Competitions**
   - Form trading teams
   - Team leaderboards
   - Collaborative achievements

3. **Advanced Achievements**
   - Strategy-based achievements (e.g., "Diversified Portfolio")
   - Time-based challenges (e.g., "Weekend Warrior")
   - Social achievements (e.g., "Refer 5 Friends")

4. **XP Multipliers**
   - Daily streak bonuses
   - Special event multipliers
   - VIP tier multipliers

5. **NFT Badges**
   - Mint achievements as Solana NFTs
   - Tradeable badges
   - Rare achievement NFTs

---

## Resources

- **Level System Implementation**: `frontend/lib/utils/levelSystem.ts`
- **XP Progress Component**: `frontend/components/level/xp-progress-bar.tsx`
- **Leaderboard Page**: `frontend/app/leaderboard/page.tsx`
- **Backend XP Service**: `backend/src/services/xpService.ts`
- **Backend Leaderboard Service**: `backend/src/services/leaderboardService.ts`

---

**Level up and compete! 🍄⭐💰**
