/**
 * Mario-themed Level System for 1UP SOL
 *
 * XP sources:
 * - Trading activity (volume-based)
 * - Successful trades (profit-based)
 * - Daily streaks
 * - Achievements
 * - Leaderboard performance
 */

export interface LevelInfo {
  level: number;
  currentXP: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  xpIntoLevel: number;
  progressPercent: number;
  title: string;
  icon: string;
  color: string;
  badgeColor: string;
}

export interface LevelThreshold {
  level: number;
  xpRequired: number;
  title: string;
  icon: string;
  color: string;
  badgeColor: string;
}

/**
 * Mario-themed level thresholds
 * Exponential growth similar to classic Mario games
 */
export const LEVEL_THRESHOLDS: LevelThreshold[] = [
  { level: 1, xpRequired: 0, title: "Goomba Trader", icon: "🍄", color: "var(--color-mario-brown)", badgeColor: "mario-brown" },
  { level: 2, xpRequired: 100, title: "Koopa Novice", icon: "🐢", color: "var(--color-mario-green)", badgeColor: "mario-green" },
  { level: 3, xpRequired: 250, title: "Coin Collector", icon: "🪙", color: "var(--color-mario-yellow)", badgeColor: "mario-yellow" },
  { level: 4, xpRequired: 500, title: "Fire Flower", icon: "🌼", color: "var(--color-mario-orange)", badgeColor: "mario-orange" },
  { level: 5, xpRequired: 1000, title: "Super Trader", icon: "⭐", color: "var(--color-mario-yellow)", badgeColor: "mario-yellow" },
  { level: 6, xpRequired: 2000, title: "Tanooki Master", icon: "🍂", color: "var(--color-mario-brown)", badgeColor: "mario-brown" },
  { level: 7, xpRequired: 4000, title: "Cape Feather", icon: "🪶", color: "var(--color-mario-blue)", badgeColor: "mario-blue" },
  { level: 8, xpRequired: 7500, title: "Star Power", icon: "✨", color: "var(--color-mario-yellow)", badgeColor: "mario-yellow" },
  { level: 9, xpRequired: 12500, title: "Metal Mario", icon: "🛡️", color: "var(--color-mario-gray)", badgeColor: "mario-gray" },
  { level: 10, xpRequired: 20000, title: "Wing Cap", icon: "🦅", color: "var(--color-mario-blue)", badgeColor: "mario-blue" },
  { level: 11, xpRequired: 30000, title: "Gold Flower", icon: "💰", color: "var(--color-mario-yellow)", badgeColor: "mario-yellow" },
  { level: 12, xpRequired: 45000, title: "Rainbow Road", icon: "🌈", color: "var(--color-mario-rainbow)", badgeColor: "mario-rainbow" },
  { level: 13, xpRequired: 65000, title: "Blue Shell", icon: "🔵", color: "var(--color-mario-blue)", badgeColor: "mario-blue" },
  { level: 14, xpRequired: 90000, title: "Bullet Bill", icon: "💥", color: "var(--color-mario-gray)", badgeColor: "mario-gray" },
  { level: 15, xpRequired: 125000, title: "Chain Chomp", icon: "⚫", color: "var(--color-mario-gray)", badgeColor: "mario-gray" },
  { level: 16, xpRequired: 170000, title: "Mega Mushroom", icon: "🍄💪", color: "var(--color-mario-red)", badgeColor: "mario-red" },
  { level: 17, xpRequired: 230000, title: "Invincibility Star", icon: "⭐🌟", color: "var(--color-mario-yellow)", badgeColor: "mario-yellow" },
  { level: 18, xpRequired: 310000, title: "Bowser Slayer", icon: "🐉", color: "var(--color-mario-orange)", badgeColor: "mario-orange" },
  { level: 19, xpRequired: 420000, title: "Princess Peach", icon: "👑", color: "var(--color-mario-pink)", badgeColor: "mario-pink" },
  { level: 20, xpRequired: 570000, title: "LEGENDARY LUIGI", icon: "💚🔥", color: "var(--color-mario-green)", badgeColor: "mario-green" },
];

/**
 * Calculate level info from total XP
 */
export function calculateLevel(totalXP: number): LevelInfo {
  // Find current level
  let currentLevel = 1;
  let currentThreshold = LEVEL_THRESHOLDS[0];
  let nextThreshold = LEVEL_THRESHOLDS[1];

  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXP >= LEVEL_THRESHOLDS[i].xpRequired) {
      currentLevel = LEVEL_THRESHOLDS[i].level;
      currentThreshold = LEVEL_THRESHOLDS[i];
      nextThreshold = LEVEL_THRESHOLDS[i + 1] || {
        ...LEVEL_THRESHOLDS[i],
        level: currentLevel + 1,
        xpRequired: LEVEL_THRESHOLDS[i].xpRequired + 100000,
      };
      break;
    }
  }

  const xpIntoLevel = totalXP - currentThreshold.xpRequired;
  const xpNeededForNext = nextThreshold.xpRequired - currentThreshold.xpRequired;
  const progressPercent = Math.min(100, (xpIntoLevel / xpNeededForNext) * 100);

  return {
    level: currentLevel,
    currentXP: totalXP,
    xpForCurrentLevel: currentThreshold.xpRequired,
    xpForNextLevel: nextThreshold.xpRequired,
    xpIntoLevel,
    progressPercent,
    title: currentThreshold.title,
    icon: currentThreshold.icon,
    color: currentThreshold.color,
    badgeColor: currentThreshold.badgeColor,
  };
}

/**
 * XP reward calculations
 */
export const XP_REWARDS = {
  // Trading activity
  TRADE_BASE: 10, // Base XP per trade
  TRADE_VOLUME_MULTIPLIER: 0.1, // XP per $1 traded (10 XP per $100)

  // Profit-based rewards
  PROFITABLE_TRADE: 25, // Bonus for profitable trade
  PROFIT_MULTIPLIER: 0.5, // XP per $1 profit (50 XP per $100 profit)

  // Milestones
  FIRST_TRADE: 100,
  TENTH_TRADE: 250,
  FIFTIETH_TRADE: 500,
  HUNDREDTH_TRADE: 1000,

  // Achievements
  DIAMOND_HANDS: 500, // Hold winning position for 7+ days
  PAPER_HANDS_RECOVERY: 300, // Recover from 50%+ loss
  PORTFOLIO_ATH: 750, // All-time high portfolio value
  TEN_BAGGER: 1000, // 10x return on single trade

  // Leaderboard
  TOP_100: 200,
  TOP_50: 400,
  TOP_25: 750,
  TOP_10: 1500,
  TOP_3: 3000,
  FIRST_PLACE: 5000,

  // Daily activity
  DAILY_LOGIN: 10,
  DAILY_TRADE_STREAK_BONUS: 50, // Per day in streak
  WEEKLY_VOLUME_LEADER: 1000,
};

/**
 * Calculate XP for a trade
 */
export function calculateTradeXP(params: {
  volumeUsd: number;
  profitUsd?: number;
  isProfitable?: boolean;
}): number {
  let xp = XP_REWARDS.TRADE_BASE;

  // Volume-based XP
  xp += params.volumeUsd * XP_REWARDS.TRADE_VOLUME_MULTIPLIER;

  // Profit bonus
  if (params.isProfitable && params.profitUsd) {
    xp += XP_REWARDS.PROFITABLE_TRADE;
    xp += Math.max(0, params.profitUsd) * XP_REWARDS.PROFIT_MULTIPLIER;
  }

  return Math.floor(xp);
}

/**
 * Calculate XP for leaderboard position
 */
export function calculateLeaderboardXP(rank: number): number {
  if (rank === 1) return XP_REWARDS.FIRST_PLACE;
  if (rank <= 3) return XP_REWARDS.TOP_3;
  if (rank <= 10) return XP_REWARDS.TOP_10;
  if (rank <= 25) return XP_REWARDS.TOP_25;
  if (rank <= 50) return XP_REWARDS.TOP_50;
  if (rank <= 100) return XP_REWARDS.TOP_100;
  return 0;
}

/**
 * Format XP number with commas
 */
export function formatXP(xp: number): string {
  return Math.floor(xp).toLocaleString();
}

/**
 * Get level badge CSS class
 */
export function getLevelBadgeClass(level: number): string {
  const threshold = LEVEL_THRESHOLDS.find(t => t.level === level);
  return threshold ? `badge-${threshold.badgeColor}` : 'badge-mario-brown';
}

/**
 * Check if user leveled up
 */
export function checkLevelUp(oldXP: number, newXP: number): {
  leveledUp: boolean;
  oldLevel: number;
  newLevel: number;
  newTitle: string;
  newIcon: string;
} {
  const oldLevelInfo = calculateLevel(oldXP);
  const newLevelInfo = calculateLevel(newXP);

  return {
    leveledUp: newLevelInfo.level > oldLevelInfo.level,
    oldLevel: oldLevelInfo.level,
    newLevel: newLevelInfo.level,
    newTitle: newLevelInfo.title,
    newIcon: newLevelInfo.icon,
  };
}

/**
 * Get next level milestone
 */
export function getNextMilestone(currentXP: number): {
  level: number;
  title: string;
  xpNeeded: number;
  icon: string;
} {
  const currentLevel = calculateLevel(currentXP);
  const nextThreshold = LEVEL_THRESHOLDS.find(t => t.level === currentLevel.level + 1);

  if (!nextThreshold) {
    return {
      level: currentLevel.level + 1,
      title: "Max Level",
      xpNeeded: 0,
      icon: "👑",
    };
  }

  return {
    level: nextThreshold.level,
    title: nextThreshold.title,
    xpNeeded: nextThreshold.xpRequired - currentXP,
    icon: nextThreshold.icon,
  };
}
