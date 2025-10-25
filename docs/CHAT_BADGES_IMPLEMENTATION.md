# Chat Badges & Moderation System Implementation

## 🏆 Badge System Architecture

### Database Schema Extensions

```prisma
// User Badges - Track earned badges
model UserBadge {
  id          String   @id @default(uuid())
  userId      String
  badgeId     String
  earnedAt    DateTime @default(now())
  isActive    Boolean  @default(true) // Can toggle badge display
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  badge       Badge    @relation(fields: [badgeId], references: [id])
  
  @@unique([userId, badgeId]) // Prevent duplicate badges
  @@index([userId, isActive], map: "user_active_badges")
}

// Badge Definitions
model Badge {
  id          String   @id @default(uuid())
  name        String   @unique // "Founder", "Profit Master", etc.
  description String   // "First 100 users to join"
  icon        String   // Icon name or URL
  color       String   // Mario theme color
  rarity      BadgeRarity @default(COMMON)
  category    BadgeCategory
  isVisible   Boolean  @default(true)
  requirements JSON?   // Criteria for earning (stored as JSON)
  createdAt   DateTime @default(now())
  
  userBadges  UserBadge[]
  
  @@index([category, rarity], map: "badge_category_rarity")
}

enum BadgeRarity {
  COMMON      // Green - Most users can earn
  UNCOMMON    // Blue - Requires some effort  
  RARE        // Purple - Significant achievement
  EPIC        // Orange - Major accomplishment
  LEGENDARY   // Red - Extremely rare
  MYTHIC      // Gold - Almost impossible
}

enum BadgeCategory {
  FOUNDER     // Early adopter badges
  TRADING     // Trading achievements
  COMMUNITY   // Social/community badges
  SPECIAL     // Event/limited time badges
  MODERATION // Trust/moderation badges
}

// Badge Requirements (JSON structure examples)
// {
//   "type": "user_count",
//   "maxUsers": 100,
//   "field": "createdAt"
// }
// {
//   "type": "trading_profit", 
//   "minProfitPercent": 1000
// }
// {
//   "type": "consecutive_trades",
//   "minTrades": 5,
//   "allProfitable": true
// }

// Chat Moderation Actions (extend existing)
model ChatModerationAction {
  id           String    @id @default(uuid())
  userId       String
  moderatorId  String?   // null for automated actions
  action       ModerationAction
  reason       String?
  duration     Int?      // minutes
  expiresAt    DateTime?
  createdAt    DateTime  @default(now())
  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId, createdAt(sort: Desc)])
  @@index([action, createdAt(sort: Desc)])
  @@index([expiresAt])
}

enum ModerationAction {
  MUTE
  BAN  
  STRIKE
  UNMUTE
  UNBAN
  CLEAR_STRIKES
  WARNING
  KICK
}

// User Trust Score & Moderation Status
model UserModerationStatus {
  id              String    @id @default(uuid())
  userId          String    @unique
  trustScore      Int       @default(100) // 0-100
  strikes         Int       @default(0)
  isMuted         Boolean   @default(false)
  mutedUntil      DateTime?
  isBanned        Boolean   @default(false)
  bannedUntil     DateTime?
  lastViolation   DateTime?
  violationCount  Int       @default(0)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([trustScore], map: "user_trust_score")
  @@index([isMuted, mutedUntil], map: "user_mute_status")
  @@index([isBanned, bannedUntil], map: "user_ban_status")
}
```

## 🎮 Mario-Themed Badge Design

### Badge Visual System
```typescript
// Badge display with Mario theme
interface BadgeDisplay {
  name: string;
  icon: string; // Mario-themed icons
  color: string; // Mario color palette
  rarity: BadgeRarity;
  glow?: boolean; // Special effects for rare badges
  animation?: string; // Special animations
}

// Mario Badge Icons
const BADGE_ICONS = {
  FOUNDER: '👑', // Crown
  EARLY_ADOPTER: '⭐', // Star
  PROFIT_MASTER: '📈', // Chart
  SPEED_DEMON: '⚡', // Lightning
  DIAMOND_HANDS: '💎', // Diamond
  CHAT_CHAMPION: '💬', // Chat bubble
  MODERATOR: '🛡️', // Shield
  ADMIN: '👑', // Crown
  // ... more icons
};

// Mario Badge Colors
const BADGE_COLORS = {
  COMMON: 'bg-luigi-green-500',      // Green
  UNCOMMON: 'bg-sky-blue-500',      // Blue  
  RARE: 'bg-star-yellow-500',       // Yellow
  EPIC: 'bg-mario-red-500',         // Red
  LEGENDARY: 'bg-coin-yellow-500',  // Gold
  MYTHIC: 'bg-star-yellow-400',     // Bright gold
};
```

## 🤖 Automated Moderation Bot

### Bot Features
```typescript
// Moderation Bot Service
class ModerationBot {
  // Auto-detect violations
  async checkMessage(userId: string, content: string): Promise<ModerationResult> {
    const violations = [];
    
    // Spam detection
    if (await this.detectSpam(userId, content)) {
      violations.push({ type: 'SPAM', severity: 'MEDIUM' });
    }
    
    // Toxicity detection
    if (await this.detectToxicity(content)) {
      violations.push({ type: 'TOXICITY', severity: 'HIGH' });
    }
    
    // Pump & dump detection
    if (await this.detectPumpDump(content)) {
      violations.push({ type: 'PUMP_DUMP', severity: 'HIGH' });
    }
    
    // Link safety check
    if (await this.detectMaliciousLinks(content)) {
      violations.push({ type: 'MALICIOUS_LINK', severity: 'CRITICAL' });
    }
    
    return { violations, action: this.determineAction(violations) };
  }
  
  // Auto-moderation actions
  async handleViolation(userId: string, violation: Violation): Promise<void> {
    switch (violation.severity) {
      case 'LOW':
        await this.addStrike(userId, violation.type);
        break;
      case 'MEDIUM':
        await this.muteUser(userId, 5); // 5 minutes
        break;
      case 'HIGH':
        await this.muteUser(userId, 30); // 30 minutes
        await this.addStrike(userId, violation.type);
        break;
      case 'CRITICAL':
        await this.banUser(userId, 24 * 60); // 24 hours
        break;
    }
  }
}
```

### Moderation Commands
```typescript
// Chat Commands System
interface ChatCommand {
  command: string;
  description: string;
  permission: UserTier[];
  handler: (args: string[], moderatorId: string) => Promise<CommandResult>;
}

const MODERATION_COMMANDS: ChatCommand[] = [
  {
    command: '/mute',
    description: 'Mute a user for specified duration',
    permission: ['MODERATOR', 'ADMINISTRATOR'],
    handler: async (args, moderatorId) => {
      const [username, duration, ...reasonParts] = args;
      const reason = reasonParts.join(' ');
      const durationMinutes = this.parseDuration(duration);
      
      return await this.muteUser(username, durationMinutes, reason, moderatorId);
    }
  },
  {
    command: '/ban',
    description: 'Ban a user permanently or temporarily',
    permission: ['ADMINISTRATOR'],
    handler: async (args, moderatorId) => {
      const [username, duration, ...reasonParts] = args;
      const reason = reasonParts.join(' ');
      const durationMinutes = duration === 'permanent' ? null : this.parseDuration(duration);
      
      return await this.banUser(username, durationMinutes, reason, moderatorId);
    }
  },
  {
    command: '/clear',
    description: 'Clear recent messages from chat',
    permission: ['MODERATOR', 'ADMINISTRATOR'],
    handler: async (args, moderatorId) => {
      const count = parseInt(args[0]) || 10;
      return await this.clearMessages(count, moderatorId);
    }
  },
  {
    command: '/announce',
    description: 'Send announcement to chat',
    permission: ['MODERATOR', 'ADMINISTRATOR'],
    handler: async (args, moderatorId) => {
      const message = args.join(' ');
      return await this.sendAnnouncement(message, moderatorId);
    }
  }
];
```

## 🎯 Badge Awarding Logic

### Automated Badge Triggers
```typescript
// Badge Service
class BadgeService {
  // Check and award badges based on user actions
  async checkTradingBadges(userId: string, trade: Trade): Promise<Badge[]> {
    const newBadges = [];
    
    // Check profit master badge
    if (trade.realizedPnL && trade.realizedPnL > 1000) {
      const badge = await this.awardBadge(userId, 'PROFIT_MASTER');
      if (badge) newBadges.push(badge);
    }
    
    // Check speed demon badge
    const tokenAge = Date.now() - new Date(trade.createdAt).getTime();
    if (tokenAge < 60000) { // Within 1 minute
      const badge = await this.awardBadge(userId, 'SPEED_DEMON');
      if (badge) newBadges.push(badge);
    }
    
    return newBadges;
  }
  
  // Check community badges
  async checkCommunityBadges(userId: string, message: ChatMessage): Promise<Badge[]> {
    const newBadges = [];
    
    // Check if message gets upvoted (implement upvoting system)
    const upvotes = await this.getMessageUpvotes(message.id);
    if (upvotes >= 10) {
      const badge = await this.awardBadge(userId, 'CHAT_CHAMPION');
      if (badge) newBadges.push(badge);
    }
    
    return newBadges;
  }
  
  // Award badge if not already earned
  async awardBadge(userId: string, badgeName: string): Promise<Badge | null> {
    const badge = await prisma.badge.findUnique({ where: { name: badgeName } });
    if (!badge) return null;
    
    // Check if user already has this badge
    const existing = await prisma.userBadge.findUnique({
      where: { userId_badgeId: { userId, badgeId: badge.id } }
    });
    
    if (existing) return null; // Already has badge
    
    // Award the badge
    await prisma.userBadge.create({
      data: { userId, badgeId: badge.id }
    });
    
    return badge;
  }
}
```

## 🎨 Frontend Badge Display

### Badge Components
```typescript
// Badge Display Component
interface BadgeProps {
  badge: Badge;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  animated?: boolean;
}

export function Badge({ badge, size = 'md', showTooltip = true, animated = false }: BadgeProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 text-xs',
    md: 'w-6 h-6 text-sm', 
    lg: 'w-8 h-8 text-lg'
  };
  
  const rarityClasses = {
    COMMON: 'bg-luigi-green-500 border-luigi-green-600',
    UNCOMMON: 'bg-sky-blue-500 border-sky-blue-600',
    RARE: 'bg-star-yellow-500 border-star-yellow-600',
    EPIC: 'bg-mario-red-500 border-mario-red-600',
    LEGENDARY: 'bg-coin-yellow-500 border-coin-yellow-600',
    MYTHIC: 'bg-star-yellow-400 border-star-yellow-500 shadow-glow'
  };
  
  return (
    <div className={`
      ${sizeClasses[size]}
      ${rarityClasses[badge.rarity]}
      ${animated ? 'animate-pulse' : ''}
      rounded-full border-2 flex items-center justify-center
      shadow-mario cursor-pointer
    `}>
      <span>{badge.icon}</span>
      {showTooltip && (
        <div className="absolute bottom-full mb-2 hidden group-hover:block">
          <div className="bg-pipe-800 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
            {badge.name}
          </div>
        </div>
      )}
    </div>
  );
}

// User Badge Collection
export function UserBadges({ userId, maxDisplay = 5 }: { userId: string; maxDisplay?: number }) {
  const { data: badges } = useQuery({
    queryKey: ['user-badges', userId],
    queryFn: () => fetchUserBadges(userId)
  });
  
  return (
    <div className="flex gap-1">
      {badges?.slice(0, maxDisplay).map((userBadge) => (
        <Badge key={userBadge.id} badge={userBadge.badge} size="sm" />
      ))}
      {badges && badges.length > maxDisplay && (
        <div className="w-4 h-4 bg-pipe-300 rounded-full flex items-center justify-center text-xs">
          +{badges.length - maxDisplay}
        </div>
      )}
    </div>
  );
}
```

## 🚀 Implementation Plan

### Phase 1: Database & Backend
1. **Database Migration** - Add badge tables to schema
2. **Badge Service** - Create badge awarding logic
3. **Moderation Bot** - Implement automated moderation
4. **API Endpoints** - Badge management, moderation commands

### Phase 2: Frontend Components  
1. **Badge Display** - Mario-themed badge components
2. **User Profiles** - Badge collections
3. **Chat Integration** - Badge display in messages
4. **Moderation UI** - Admin panel for moderation

### Phase 3: Advanced Features
1. **Badge Notifications** - Real-time badge awards
2. **Badge Leaderboards** - Most badges, rarest badges
3. **Custom Badges** - Admin-created special badges
4. **Badge Trading** - Trade badges (future feature)

## 🎮 Mario Theme Integration

### Badge Animations
- **Rare Badge Glow** - Subtle glow effect for rare badges
- **Badge Unlock Animation** - Celebration when earning new badge
- **Badge Hover Effects** - 3D lift effect on hover
- **Badge Collection Sound** - Mario coin sound for new badges

### Color Scheme
- Use existing Mario color palette
- Maintain consistency with current theme
- Add special effects for legendary/mythic badges
- Ensure accessibility with proper contrast

This system will create an engaging, Mario-themed community experience with proper moderation tools! 🎮✨


