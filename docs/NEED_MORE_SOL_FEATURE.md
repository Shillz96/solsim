# Need More SOL Feature - Implementation Plan

## Overview
Implement a viral marketing feature that rewards users with virtual SOL for sharing their PnL cards on X (Twitter). Users who are running low on SOL can earn more by sharing 3 PnL cards.

## Feature Requirements

### Core Mechanics
- **Reward Amount**: $1000 virtual SOL per completed cycle
- **Share Requirement**: 3 PnL card shares to X
- **Cooldown Period**: 7 days between reward claims
- **Low Balance Threshold**: Trigger when balance < $100 (or < 10% of starting balance)

### User Touchpoints
1. **Auto-popup** - When balance drops below threshold
2. **Profile Dropdown** - Permanent menu item
3. **Portfolio Page** - Banner when low balance
4. **Post-Trade** - Suggestion after losing trade that drops balance low
5. **Trading Header** - Persistent badge/indicator

## Database Schema

### New Table: `SolReward`
```prisma
model SolReward {
  id              String   @id @default(uuid())
  userId          String   @unique
  shareCount      Int      @default(0)
  lastRewardClaim DateTime?
  totalRewarded   Decimal  @default(0)
  weeklyShares    Int      @default(0) // Reset weekly
  weekResetAt     DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@index([lastRewardClaim])
}
```

### Update User Model
Add relation to `User` model:
```prisma
solRewards      SolReward?
```

## Backend Implementation

### 1. API Endpoints

#### `POST /api/rewards/track-share`
Track a PnL share event
```typescript
Request: { userId: string }
Response: {
  shareCount: number,
  remainingShares: number,
  canClaim: boolean,
  cooldownEndsAt?: DateTime
}
```

#### `POST /api/rewards/claim`
Claim SOL reward when 3 shares reached
```typescript
Request: { userId: string }
Response: {
  success: boolean,
  amountAwarded: number,
  newBalance: number,
  nextClaimAvailable: DateTime
}
```

#### `GET /api/rewards/status`
Get current reward status
```typescript
Response: {
  shareCount: number,
  remainingShares: number,
  canClaim: boolean,
  totalRewarded: number,
  lastClaimDate?: DateTime,
  nextClaimAvailable?: DateTime,
  weeklyShares: number
}
```

### 2. Service Layer

#### `rewardService.ts`
```typescript
// Track share event
async function trackShare(userId: string): Promise<RewardStatus>

// Claim reward (validate cooldown, add SOL, reset counter)
async function claimReward(userId: string): Promise<ClaimResult>

// Check if user can claim
async function canClaim(userId: string): Promise<boolean>

// Get reward status
async function getRewardStatus(userId: string): Promise<RewardStatus>

// Check cooldown
async function isInCooldown(userId: string): Promise<boolean>

// Reset weekly shares counter (cron job)
async function resetWeeklyShares(): Promise<void>
```

### 3. Validation & Business Logic
- Validate user exists
- Check cooldown period (7 days)
- Verify share count >= 3
- Prevent duplicate claims
- Rate limiting (max 1 share per 30 seconds to prevent spam)
- Weekly limit (optional: max 9 shares/week = 3 claims/week)

## Frontend Implementation

### 1. New Components

#### `NeedMoreSolDialog.tsx`
Main modal showing:
- Current share progress (X/3)
- Reward amount ($1000 SOL)
- "Share Now" button
- Share history/timeline
- Cooldown timer if applicable

```tsx
interface NeedMoreSolDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentBalance: number
  shareStatus: RewardStatus
  onShare: () => void
  onClaim: () => Promise<void>
}
```

#### `ShareProgressIndicator.tsx`
Compact progress tracker showing X/3 shares
```tsx
interface ShareProgressIndicatorProps {
  shareCount: number
  maxShares: number
  size?: 'sm' | 'md' | 'lg'
}
```

#### `LowBalanceAlert.tsx`
Banner component for portfolio/trading pages
```tsx
interface LowBalanceAlertProps {
  balance: number
  threshold: number
  onOpenRewards: () => void
}
```

### 2. Update Existing Components

#### `share-pnl-dialog.tsx`
Add Twitter share integration:
```tsx
// After successful download/copy, show Twitter share button
const handleShareToTwitter = async () => {
  // Generate share link
  const text = encodeURIComponent(`Check out my trading performance on @VirtualSolana! ${totalPnL >= 0 ? '📈' : '📉'} ${totalPnL >= 0 ? '+' : ''}$${Math.abs(totalPnL).toFixed(2)} PnL\n\nStart your paper trading journey:`)
  const url = encodeURIComponent('https://oneupsol.fun')
  const twitterUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`
  
  // Open Twitter
  window.open(twitterUrl, '_blank')
  
  // Track share
  await trackShare()
}
```

#### `combined-profile-balance.tsx`
Add menu item:
```tsx
<DropdownMenuItem onClick={() => setShowRewardsDialog(true)}>
  <Coins className="h-4 w-4 mr-2" />
  Need More SOL?
  {shareCount > 0 && (
    <Badge className="ml-auto">{shareCount}/3</Badge>
  )}
</DropdownMenuItem>
```

### 3. Hooks

#### `use-sol-rewards.ts`
```typescript
export function useSolRewards() {
  const { user } = useAuth()
  
  // Fetch reward status
  const { data: rewardStatus } = useQuery({
    queryKey: ['solRewards', user?.id],
    queryFn: () => api.getSolRewardStatus(user?.id)
  })
  
  // Track share mutation
  const trackShareMutation = useMutation({
    mutationFn: () => api.trackSolShare(user?.id),
    onSuccess: () => {
      queryClient.invalidateQueries(['solRewards'])
      queryClient.invalidateQueries(['balance'])
    }
  })
  
  // Claim reward mutation
  const claimRewardMutation = useMutation({
    mutationFn: () => api.claimSolReward(user?.id),
    onSuccess: (data) => {
      toast.success(`Claimed $${data.amountAwarded} SOL!`)
      queryClient.invalidateQueries(['solRewards'])
      queryClient.invalidateQueries(['balance'])
    }
  })
  
  return {
    rewardStatus,
    trackShare: trackShareMutation.mutate,
    claimReward: claimRewardMutation.mutate,
    isTracking: trackShareMutation.isPending,
    isClaiming: claimRewardMutation.isPending
  }
}
```

#### `use-low-balance-detection.ts`
```typescript
export function useLowBalanceDetection(threshold = 100) {
  const { data: balance } = useBalance()
  const [hasShownAlert, setHasShownAlert] = useState(false)
  
  useEffect(() => {
    if (balance && parseFloat(balance.balance) < threshold && !hasShownAlert) {
      setHasShownAlert(true)
      // Trigger modal or notification
    }
  }, [balance, threshold, hasShownAlert])
  
  return {
    isLowBalance: balance ? parseFloat(balance.balance) < threshold : false,
    currentBalance: balance ? parseFloat(balance.balance) : 0
  }
}
```

## UI/UX Flow

### 1. Low Balance Detection Flow
```
User balance drops below $100
  ↓
Auto-popup appears: "Need More SOL?"
  ↓
Shows: "Share 3 PnL cards to earn $1000 SOL!"
  ↓
User clicks "Share PnL Now"
  ↓
Opens SharePnLDialog with enhanced Twitter button
  ↓
User downloads/copies image
  ↓
Prominent "Share to X" button appears
  ↓
Opens Twitter with pre-filled text + hashtags
  ↓
Track share (1/3 complete)
  ↓
Show progress: "2 more shares to unlock $1000 SOL!"
```

### 2. Claim Reward Flow
```
User completes 3 shares
  ↓
"Claim Reward" button activates
  ↓
User clicks claim
  ↓
Confetti animation + success message
  ↓
Balance updates: +$1000 SOL
  ↓
Share counter resets to 0/3
  ↓
7-day cooldown starts
```

### 3. Cooldown Display
```
If in cooldown period:
  ↓
Show: "Next reward available in 3 days 4 hours"
  ↓
Display progress bar or countdown timer
  ↓
Allow viewing share history/stats
```

## Placement Locations

### 1. Profile Dropdown (Primary)
**Location**: `combined-profile-balance.tsx`
**Display**: Menu item with badge showing progress
```tsx
<DropdownMenuItem>
  <Sparkles className="h-4 w-4 mr-2 text-star" />
  Need More SOL?
  <Badge className="ml-auto">{shareCount}/3</Badge>
</DropdownMenuItem>
```

### 2. Auto-Popup (Trigger)
**Location**: `app/layout.tsx` or trading pages
**Trigger**: Balance < $100 AND hasn't shown in last 24 hours
**Display**: Full modal with animated entrance

### 3. Portfolio Page Banner
**Location**: `app/portfolio/page.tsx`
**Display**: Top banner (dismissible)
```tsx
{isLowBalance && (
  <Alert variant="info" className="mb-4">
    <Sparkles className="h-4 w-4" />
    <AlertTitle>Need More SOL?</AlertTitle>
    <AlertDescription>
      Share 3 PnL cards to earn $1000 virtual SOL! 
      <Button variant="link" onClick={openRewardsDialog}>
        Get Started →
      </Button>
    </AlertDescription>
  </Alert>
)}
```

### 4. Trading Header Badge
**Location**: `components/trading/token-header.tsx`
**Display**: Small persistent indicator
```tsx
{rewardStatus?.shareCount > 0 && (
  <Badge className="bg-star">
    {rewardStatus.shareCount}/3 shares
  </Badge>
)}
```

### 5. Post-Trade Suggestion
**Location**: After trade execution in `use-trade-execution.ts`
**Trigger**: Losing trade that drops balance < threshold
**Display**: Toast notification with action
```tsx
toast({
  title: "Balance Low",
  description: "Share your PnL cards to earn $1000 SOL!",
  action: (
    <Button size="sm" onClick={openRewardsDialog}>
      Learn More
    </Button>
  )
})
```

## Marketing Copy

### Dialog Title
**"Need More SOL? We've Got You! 🎮"**

### Description
**"Share your trading wins (or lessons learned 😅) with the community and earn $1000 virtual SOL! Complete 3 shares to unlock your reward."**

### Call-to-Action Buttons
- **Primary**: "Share My PnL" (Luigi green)
- **Secondary**: "Learn More" (Sky blue)
- **Claim**: "Claim $1000 SOL!" (Star yellow, animated)

### Twitter Share Template
```
Check out my trading performance on @VirtualSolana! 🎮

{PnL emoji} {PnL amount} ({percentage}%)

Paper trading Solana tokens with ZERO risk. 
Join me: https://oneupsol.fun

#Solana #PaperTrading #Crypto #1UP
```

## Abuse Prevention

### Rate Limiting
- Max 1 share track per 30 seconds per user
- Max 3 shares per day per user
- Max 9 shares per week per user (3 claim cycles)

### Validation
- Check if user actually has PnL data to share
- Verify share timestamps are realistic
- Monitor for suspicious patterns (batch shares)

### Cooldown Enforcement
- 7-day cooldown between claims (strictly enforced)
- Track in database, not client-side
- Display clear countdown timer

### Optional: Twitter Verification
**Phase 2 Enhancement** (requires Twitter OAuth):
- Verify tweet was actually posted
- Check tweet contains required hashtags
- Validate tweet engagement (optional: min 1 like/RT)

## Analytics Tracking

### Events to Track
1. `rewards_modal_opened` - User opens Need More SOL dialog
2. `rewards_share_tracked` - Share counted (1/3, 2/3, 3/3)
3. `rewards_claimed` - User claims $1000 SOL
4. `rewards_twitter_clicked` - User clicks Share to Twitter
5. `rewards_low_balance_triggered` - Auto-popup shown

### Metrics Dashboard
- Total rewards claimed
- Average time to complete 3 shares
- Conversion rate (views → claims)
- Viral coefficient (shares → new users)
- Most active sharers (leaderboard)

## Testing Checklist

### Backend Tests
- [ ] Track share increments counter correctly
- [ ] Cannot claim with < 3 shares
- [ ] Cooldown prevents premature claims
- [ ] Balance updates correctly on claim
- [ ] Counter resets after claim
- [ ] Rate limiting works
- [ ] Weekly reset function works

### Frontend Tests
- [ ] Modal opens/closes correctly
- [ ] Progress indicator updates in real-time
- [ ] Twitter share opens with correct text
- [ ] Claim button disabled during cooldown
- [ ] Confetti animation plays on claim
- [ ] Balance updates in UI after claim
- [ ] Low balance detection triggers correctly

### Integration Tests
- [ ] End-to-end flow: share → track → claim
- [ ] Multiple users don't interfere with each other
- [ ] Concurrent shares handled correctly
- [ ] Network errors handled gracefully

## Implementation Phases

### Phase 1: Backend Foundation (Day 1-2)
- [ ] Create database migration
- [ ] Implement reward service
- [ ] Create API endpoints
- [ ] Add validation & business logic
- [ ] Write backend tests

### Phase 2: Core Frontend (Day 3-4)
- [ ] Create NeedMoreSolDialog component
- [ ] Create ShareProgressIndicator
- [ ] Implement use-sol-rewards hook
- [ ] Update share-pnl-dialog with Twitter integration
- [ ] Add tracking on share events

### Phase 3: UI Integration (Day 5)
- [ ] Add to profile dropdown menu
- [ ] Implement low balance detection
- [ ] Create portfolio page banner
- [ ] Add trading header badge
- [ ] Implement auto-popup logic

### Phase 4: Polish & Testing (Day 6)
- [ ] Add animations (confetti, progress bars)
- [ ] Implement cooldown timer UI
- [ ] Add toast notifications
- [ ] Write frontend tests
- [ ] QA testing

### Phase 5: Analytics & Launch (Day 7)
- [ ] Implement analytics tracking
- [ ] Create admin dashboard view
- [ ] Final testing on staging
- [ ] Deploy to production
- [ ] Monitor metrics

## Success Metrics

### Primary KPIs
- **Adoption Rate**: % of users who complete at least 1 share cycle
- **Viral Coefficient**: New users per shared PnL card
- **Retention**: % of users who return after claiming reward

### Secondary KPIs
- Average shares per user per week
- Time to complete 3 shares
- Claim conversion rate (started → completed)
- Social engagement (Twitter likes, RTs, clicks)

## Future Enhancements

### Phase 2 Ideas
1. **Twitter OAuth Verification** - Verify actual tweet posting
2. **Leaderboard** - Top sharers get bonus rewards
3. **Referral Tracking** - Extra reward if referred user signs up
4. **Tiered Rewards** - Higher rewards for more shares (6 shares = $2500)
5. **Daily Bonus** - Extra small reward for daily shares
6. **Share Templates** - Multiple pre-designed card templates
7. **Social Proof** - Show how many users earned rewards
8. **Achievement Badges** - Special badges for super sharers

### Advanced Features
- Instagram/TikTok support
- Video PnL cards (animated)
- Custom branding for power users
- Community challenges (everyone shares = everyone gets bonus)

## Notes & Considerations

### Why Honor System First?
- Twitter API requires app approval + OAuth flow
- Adds significant complexity to MVP
- Trust-based system is simpler and faster to ship
- Can add verification later if abuse detected

### Balance Threshold Discussion
**Option A**: Fixed threshold ($100)
- Pro: Simple, consistent
- Con: Doesn't scale with user behavior

**Option B**: Percentage-based (10% of starting balance)
- Pro: Adapts to different play styles
- Con: More complex calculation

**Recommendation**: Start with fixed $100, add percentage option in settings later.

### Reward Amount Rationale
$1000 SOL per cycle:
- Significant enough to motivate shares
- Not too high to break game economy
- About 10x minimum trade size
- Allows 10-20 small trades before running low again

## Questions for Product Review

1. **Cooldown Period**: Is 7 days appropriate? Too long/short?
2. **Reward Amount**: Is $1000 the right amount?
3. **Share Requirement**: Should it be 3 shares or different number?
4. **Weekly Limit**: Should we cap total shares per week?
5. **Badge Display**: Where else should we show progress?
6. **Onboarding**: Show explainer on first app launch?
7. **Email Notification**: Send email when eligible to claim?

## Technical Dependencies

### Backend
- Prisma (database ORM) ✅
- Fastify (API framework) ✅
- Node.js cron (weekly reset job) ⚠️ needs adding

### Frontend
- React Query (data fetching) ✅
- Framer Motion (animations) ✅
- React Confetti (claim celebration) ⚠️ needs adding
- Lucide Icons ✅

### External Services
- Twitter Web Intents API (no auth required) ✅
- Optional: Twitter OAuth 2.0 (Phase 2)

## Deployment Checklist

### Pre-Launch
- [ ] Run database migration on production
- [ ] Test all API endpoints on staging
- [ ] Verify Twitter share URLs work correctly
- [ ] Set up monitoring/alerts
- [ ] Prepare rollback plan

### Launch Day
- [ ] Deploy backend changes
- [ ] Deploy frontend changes
- [ ] Verify feature works in production
- [ ] Monitor error rates
- [ ] Watch user adoption metrics

### Post-Launch
- [ ] Gather user feedback
- [ ] Monitor for abuse patterns
- [ ] Analyze social media engagement
- [ ] Plan Phase 2 enhancements
- [ ] Iterate based on data

---

## Ready to Implement?

This feature will drive viral growth while helping users stay engaged even after losing trades. The social sharing aspect creates organic marketing, and the reward system keeps users motivated to participate in the community.

**Estimated Time**: 7 days for full implementation
**Complexity**: Medium
**Business Impact**: High (viral growth potential)
**User Value**: High (helps struggling users, encourages community)

Let's make this happen! 🚀
