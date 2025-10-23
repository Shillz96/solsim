# Trade Page Implementation Plan

**Route**: `/room/{ca}` where `{ca}` is the token contract address (mint)
**Created**: January 2025
**Status**: In Development

---

## Overview

A comprehensive trading page with real-time charts, live chat, market data, and enhanced trading panel. Full-width layout with TradingView Lightweight Charts integration.

---

## Page Route

```
/room/[ca]/page.tsx
```

Where `[ca]` is the token mint address (e.g., `DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263`)

---

## Layout Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│ Top App Bar (simplified)                                            │
│ [Logo] 1UP SOL              [Price: $0.0029] [PnL: +12.4%] [Wallet]│
└─────────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────┬───────────────────────────┐
│ MAIN SECTION (flex-1, full width)      │ RIGHT SIDEBAR (380px)     │
│                                         │                           │
│ ┌─────────────────────────────────────┐ │ ┌───────────────────────┐ │
│ │ Token Header                        │ │ │ ENHANCED TRADE PANEL  │ │
│ │ [Icon] BLSH (Buy Low Sell High)     │ │ │                       │ │
│ │ FDV: 3.1M • Liq: 420 SOL            │ │ │ Quick Actions:        │ │
│ │ Mint: Kq...pump [Copy]              │ │ │ [1 SOL][5][10][20]    │ │
│ │ [⚠ Freeze] [✓ Mint Revoked]         │ │ │ Custom Amount Input   │ │
│ └─────────────────────────────────────┘ │ │ [BUY] [SELL]          │ │
│                                         │ │                       │ │
│ ┌─────────────────────────────────────┐ │ │ Real Trade Tips       │ │
│ │ LIGHTWEIGHT CHART (full width)      │ │ │ Current Holdings      │ │
│ │ • Candlestick + Volume              │ │ └───────────────────────┘ │
│ │ • Green UP markers for BUY trades   │ │                           │
│ │ • Red DOWN markers for SELL trades  │ │ ┌───────────────────────┐ │
│ │ • Yellow avg cost line (dashed)     │ │ │ CHAT ROOM             │ │
│ │ • Real-time price updates           │ │ │ (token-specific)      │ │
│ │ (60vh height)                       │ │ │                       │ │
│ │                                     │ │ │ Messages              │ │
│ │ [1m][5m][15m][1h][4h][1d] selector │ │ │ [Input] [Send]        │ │
│ └─────────────────────────────────────┘ │ └───────────────────────┘ │
│                                         │                           │
│ ┌─────────────────────────────────────┐ │                           │
│ │ [Trades|Top Traders|Holders] Tabs   │ │                           │
│ └─────────────────────────────────────┘ │                           │
│                                         │                           │
│ ┌─────────────────────────────────────┐ │                           │
│ │ Recent Trades Panel                 │ │                           │
│ │ • Live trade tape                   │ │                           │
│ │ • Whale alerts (>20 SOL)            │ │                           │
│ │ • Time, Type, Amount, Price, Wallet │ │                           │
│ └─────────────────────────────────────┘ │                           │
└─────────────────────────────────────────┴───────────────────────────┘
┌─────────────────────────────────────────────────────────────────────┐
│ Bottom Quick Trade Bar (sticky)                                     │
│ BLSH - $0.002940  [Quick Buy 1 SOL] [Quick Sell 25%]               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### 1. Main Page Component
**File**: `frontend/app/room/[ca]/page.tsx`
- Dynamic route with token contract address
- Fetches token details from DexScreener/Birdeye
- Manages WebSocket subscriptions
- Responsive layout container

### 2. LightweightChart Component
**File**: `frontend/components/trading/lightweight-chart.tsx`

**Features**:
- TradingView Lightweight Charts v5
- Candlestick series (green up, red down)
- Volume histogram (bottom 30%)
- Buy/sell trade markers (arrows with quantity labels)
- Average cost price line (yellow dashed)
- Real-time price tick updates
- Timeframe selector (1m, 5m, 15m, 1h, 4h, 1d)
- Mobile-responsive with touch gestures

**Technical Details**:

```typescript
// Chart initialization with Mario theme
createChart(container, {
  layout: {
    background: { color: 'var(--background)' }, // #FFFAE9 cream
    textColor: 'var(--outline-black)',
  },
  grid: {
    vertLines: { color: 'var(--border)' },
    horzLines: { color: 'var(--border)' },
  },
})

// Candlestick series
addCandlestickSeries({
  upColor: 'var(--luigi-green-500)',
  downColor: 'var(--mario-red-500)',
  borderUpColor: 'var(--outline-black)',
  borderDownColor: 'var(--outline-black)',
})

// Trade markers
series.setMarkers([
  {
    time: 1234567890,
    position: 'belowBar', // BUY
    color: 'var(--luigi-green-500)',
    shape: 'arrowUp',
    text: 'B 1.2K',
  },
  {
    time: 1234567900,
    position: 'aboveBar', // SELL
    color: 'var(--mario-red-500)',
    shape: 'arrowDown',
    text: 'S 500',
  },
])

// Average cost price line
series.createPriceLine({
  price: 0.002940,
  color: 'var(--star-yellow)',
  lineWidth: 3,
  lineStyle: 2, // Dashed
  axisLabelVisible: true,
  title: 'Avg Cost: $0.002940',
})
```

### 3. Enhanced Trading Panel
**File**: `frontend/components/trading/mario-trading-panel.tsx` (enhance existing)

**New Features to Add**:

1. **Custom Amount Toggle**:
   ```typescript
   <button onClick={() => setShowCustomInput(!showCustomInput)}>
     Custom Amount
   </button>
   {showCustomInput && (
     <input
       type="number"
       placeholder="Enter SOL amount"
       value={customSolAmount}
       onChange={(e) => setCustomSolAmount(e.target.value)}
     />
   )}
   ```

2. **Real Trade Tips Section**:
   ```typescript
   {tradeMode === 'REAL' && (
     <div className="bg-[var(--sky-500)]/10 border-2 border-[var(--sky-500)] rounded-lg p-2">
       <div className="text-xs font-bold">Real Trade Estimate:</div>
       <div className="text-[10px] space-y-0.5">
         <div>Network Fee: ~0.0005 SOL</div>
         <div>PumpPortal Fee: {fundingSource === 'DEPOSITED' ? '1%' : '0.5%'}</div>
         <div>Slippage: 3% (adjustable)</div>
         <div>Route: {route}</div>
       </div>
     </div>
   )}
   ```

3. **Enhanced Holdings Display**:
   ```typescript
   <div className="grid grid-cols-2 gap-2 text-[10px]">
     <div>
       <div className="text-muted-foreground">Holdings</div>
       <div className="font-mono font-bold">{qty}</div>
     </div>
     <div>
       <div className="text-muted-foreground">Avg Cost</div>
       <div className="font-mono font-bold">${avgCost}</div>
     </div>
     <div>
       <div className="text-muted-foreground">Current Value</div>
       <div className="font-mono font-bold">${value}</div>
     </div>
     <div>
       <div className="text-muted-foreground">Unrealized PnL</div>
       <div className="font-mono font-bold text-[var(--luigi-green-500)]">
         +${unrealizedPnL}
       </div>
     </div>
   </div>
   ```

### 4. ChatRoom Component
**File**: `frontend/components/chat/chat-room.tsx`

**Features**:
- Token-specific room (room slug = mint address)
- SIWS (Sign In With Solana) authentication
- Message list with auto-scroll
- Rate limiting UI
- Emoji picker support
- Moderator actions

**Sub-components**:
- `ChatMessage.tsx` - Single message row
- `ChatInput.tsx` - Input with send button
- `ChatAuth.tsx` - SIWS sign-in flow

### 5. Data Panels Component
**File**: `frontend/components/trading/data-panels.tsx`

**Tabs**:
- **Trades**: Recent transactions with whale alerts
- **Top Traders**: 24h leaderboard
- **Holders**: Top 20 holders with % supply

---

## Backend Architecture

### 1. Historical OHLCV Endpoint

**Route**: `GET /api/chart/ohlcv`

**Query Parameters**:
- `mint`: Token contract address
- `type`: Timeframe (`1m`, `5m`, `15m`, `1h`, `4h`, `1d`)
- `limit`: Number of candles (default 500)

**Implementation**:
```typescript
// backend/src/routes/chart.ts
app.get('/chart/ohlcv', async (request, reply) => {
  const { mint, type, limit } = request.query

  // Call Birdeye OHLCV V3 API
  const response = await axios.get(
    'https://public-api.birdeye.so/defi/v3/ohlcv',
    {
      headers: { 'X-API-KEY': process.env.BIRDEYE_API_KEY },
      params: {
        address: mint,
        type,
        time_from: calculateTimeFrom(type, limit),
        time_to: Math.floor(Date.now() / 1000),
      },
    }
  )

  return {
    success: true,
    data: response.data.data,
  }
})
```

**Response Format**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "unixTime": 1234567890,
        "o": 0.002940,
        "h": 0.002950,
        "l": 0.002930,
        "c": 0.002945,
        "v": 12345.67
      }
    ]
  }
}
```

### 2. User Trades for Chart Markers

**Route**: `GET /api/trades/user/:userId/token/:mint`

**Implementation**:
```typescript
app.get('/trades/user/:userId/token/:mint', async (request, reply) => {
  const { userId, mint } = request.params

  const trades = await prisma.trade.findMany({
    where: { userId, mint },
    orderBy: { timestamp: 'asc' },
    select: {
      id: true,
      side: true,
      quantity: true,
      price: true,
      timestamp: true,
    },
  })

  return { success: true, trades }
})
```

### 3. Position/Average Cost Calculation

**Already Exists**: `backend/src/services/pnl.ts`

The `computePnL` function calculates:
- `averageCostLamports` (SOL terms)
- `averageCostUsd` (USD terms)
- `openQuantity`
- `unrealizedPnL`
- `openLots` (FIFO lot tracking)

Frontend fetches via existing `/api/portfolio` endpoint.

### 4. Chat System Backend

**Database Schema**:
```prisma
model ChatRoom {
  slug      String   @id // mint address or 'lobby'
  kind      String   @default("token")
  createdAt DateTime @default(now())
  messages  ChatMessage[]
}

model ChatMessage {
  id        BigInt   @id @default(autoincrement())
  roomSlug  String
  wallet    String
  content   String
  createdAt DateTime @default(now())
  room      ChatRoom @relation(fields: [roomSlug], references: [slug])
}

model ChatUserState {
  wallet      String   @id
  strikes     Int      @default(0)
  mutedUntil  DateTime?
  banned      Boolean  @default(false)
  xp          BigInt   @default(0)
  level       Int      @default(1)
  lastMsgAt   DateTime?
}
```

**Auth Flow**:
1. `POST /auth/chat/nonce` - Generate nonce
2. User signs message with wallet
3. `POST /auth/chat/verify` - Verify signature, return JWT (30min)
4. `WS /realtime?token=<jwt>&room=<mint>` - Connect to chat

**Chat Events**:
- Client → Server: `{ type: 'chat:join', room: 'mint' }`
- Client → Server: `{ type: 'chat:msg', room: 'mint', content: 'gm' }`
- Server → Client: `{ type: 'chat:msg', room, wallet, content, timestamp }`

**Anti-Spam**:
- Rate limit: 10 msgs/15s per wallet (Redis token bucket)
- Duplicate detection: Hash(message) cache (30s TTL)
- Content filter: Strip HTML, max 280 chars
- Strikes: 1st = 10min slow-mode, 2nd = 24h mute, 3rd = ban

### 5. Market Data Endpoints

**Routes**:
- `GET /api/market/:mint/trades` - Recent trades (last 100)
- `GET /api/market/:mint/top-traders` - 24h leaderboard
- `GET /api/market/:mint/holders` - Top holders snapshot
- `GET /api/market/:mint/risk-flags` - Freeze/mint authority check

---

## Mario Theme Integration

### Color Tokens Used

```css
/* Candlestick colors */
--luigi-green-500: #43B047  /* Up candles, BUY markers */
--mario-red-500: #E52521    /* Down candles, SELL markers */

/* Chart elements */
--star-yellow: #FFD800      /* Average cost line */
--sky-500: #A6D8FF          /* Volume bars, info panels */
--outline-black: #1C1C1C    /* Borders, grid lines */
--background: #FFFAE9       /* Chart background */

/* UI elements */
--pipe-100: light green     /* Neutral panels */
--border: #e5e5e5           /* Grid lines */
```

### Component Styling

**All buttons**: Use `<CartridgePill>` component
```typescript
<CartridgePill
  value="Quick Buy 1 SOL"
  bgColor="var(--luigi-green-500)"
  size="sm"
/>
```

**Card style**:
```css
border-4 border-[var(--outline-black)]
shadow-[6px_6px_0_var(--outline-black)]
rounded-[16px]
```

**Hover effects**:
```css
hover:shadow-[8px_8px_0_var(--outline-black)]
hover:-translate-y-[2px]
transition-all
```

---

## Implementation Phases

### Phase 1: Chart Foundation (Days 1-2)
- ✅ Install `lightweight-charts@5.x`
- ✅ Create `/room/[ca]/page.tsx` route
- ✅ Build `LightweightChart` component
- ✅ Implement `/api/chart/ohlcv` endpoint
- ✅ Load historical data from Birdeye
- ✅ Add timeframe selector

### Phase 2: Trade Annotations (Days 2-3)
- ✅ Create `/api/trades/user/:userId/token/:mint` endpoint
- ✅ Implement trade markers (buy/sell arrows)
- ✅ Add marker labels with quantities
- ✅ Test marker positioning

### Phase 3: Average Cost Line (Day 3)
- ✅ Calculate average cost from position data
- ✅ Create horizontal price line
- ✅ Style as yellow dashed line
- ✅ Add axis label

### Phase 4: Enhanced Trade Panel (Days 4-5)
- ✅ Add custom amount toggle
- ✅ Build real trade tips section
- ✅ Enhance holdings display
- ✅ Test trading flows

### Phase 5: Live Updates (Days 5-6)
- ✅ Connect to price stream WebSocket
- ✅ Update last candlestick in real-time
- ✅ Handle reconnection logic
- ✅ Test performance

### Phase 6: Data Panels (Days 6-7)
- ✅ Create Recent Trades panel
- ✅ Add whale alerts (>20 SOL trades)
- ✅ Build Top Traders panel
- ✅ Implement Holders panel
- ✅ Add tab navigation

### Phase 7: Chat System (Days 8-10)
- ✅ Implement SIWS authentication
- ✅ Build chat backend (Redis pub/sub)
- ✅ Create chat UI components
- ✅ Add rate limiting
- ✅ Test multi-room functionality

### Phase 8: Polish & Testing (Days 11-12)
- ✅ Mobile responsive testing
- ✅ WebSocket stress testing
- ✅ Performance optimization
- ✅ Accessibility audit
- ✅ Cross-browser testing

---

## Dependencies

### Frontend
```bash
cd frontend
npm install lightweight-charts@5.x
npm install date-fns  # Time formatting
```

### Backend
```bash
cd backend
npm install axios     # Birdeye API calls
npm install ws        # WebSocket client (optional)
```

---

## Files to Create

### Frontend
- `frontend/app/room/[ca]/page.tsx`
- `frontend/components/trading/lightweight-chart.tsx`
- `frontend/components/chat/chat-room.tsx`
- `frontend/components/chat/chat-message.tsx`
- `frontend/components/chat/chat-input.tsx`
- `frontend/components/chat/chat-auth.tsx`
- `frontend/components/trading/data-panels.tsx`
- `frontend/components/trading/recent-trades-panel.tsx`
- `frontend/components/trading/top-traders-panel.tsx`
- `frontend/components/trading/holders-panel.tsx`
- `frontend/components/trading/bottom-trade-bar.tsx`
- `frontend/hooks/useOHLCVData.ts`
- `frontend/hooks/useTradeMarkers.ts`
- `frontend/hooks/useAverageCostLine.ts`
- `frontend/hooks/useChartLiveUpdates.ts`

### Backend
- `backend/src/routes/chart.ts`
- `backend/src/routes/market.ts`
- `backend/src/routes/auth-chat.ts`
- `backend/src/plugins/chat.ts`
- `backend/src/services/birdeyeOHLCVStream.ts` (optional)
- `backend/src/utils/siws.ts`
- `backend/prisma/migrations/XXX_add_chat_tables.sql`

### Backend (Enhance Existing)
- `backend/src/routes/trades.ts` - Add user trades by token endpoint
- `backend/src/plugins/ws.ts` - Add chat event handlers

---

## Performance Considerations

1. **Chart Data Caching**:
   - Cache OHLCV data for 30 seconds
   - Use Redis for cross-instance caching

2. **WebSocket Optimization**:
   - Batch price updates (max 10/second)
   - Unsubscribe from inactive tokens

3. **Component Memoization**:
   - Memoize LightweightChart component
   - Use React.memo for trade markers
   - Virtualize long trade lists

4. **Database Query Optimization**:
   - Index on `[userId, mint, timestamp]`
   - Limit trade history queries (last 500)

---

## Security Considerations

1. **SIWS Authentication**:
   - Verify wallet signatures server-side
   - Short-lived JWT tokens (30 minutes)
   - Rate limit nonce generation

2. **Chat Moderation**:
   - Content sanitization (strip HTML)
   - Rate limiting (10 msgs/15s)
   - Strike system for abuse

3. **API Security**:
   - Validate all user inputs
   - Sanitize token mint addresses
   - Rate limit API endpoints

---

## Testing Strategy

### Unit Tests
- Chart data transformation functions
- PnL calculation logic
- SIWS signature verification
- Chat message sanitization

### Integration Tests
- OHLCV endpoint with Birdeye API
- WebSocket message flow
- Trade marker rendering
- Average cost line updates

### E2E Tests
- Complete trading flow
- Chat authentication flow
- Real-time price updates
- Mobile responsive layout

---

## Monitoring & Observability

1. **Metrics to Track**:
   - Chart load time
   - WebSocket connection stability
   - API response times
   - Chat message throughput

2. **Error Tracking**:
   - Failed OHLCV fetches
   - WebSocket disconnections
   - Trade marker rendering errors
   - Chat authentication failures

3. **User Analytics**:
   - Timeframe usage distribution
   - Average session duration
   - Trade execution times
   - Chat engagement metrics

---

## Future Enhancements

1. **Advanced Chart Features**:
   - Technical indicators (RSI, MACD, Bollinger Bands)
   - Drawing tools (trendlines, fibonacci)
   - Multiple chart layouts
   - Save chart configurations

2. **Enhanced Chat**:
   - Private messages
   - User mentions (@username)
   - Reactions/emojis on messages
   - Message search

3. **Social Features**:
   - Follow traders
   - Share trades
   - Leaderboards
   - Achievements/badges

4. **Advanced Trading**:
   - Limit orders
   - Stop-loss orders
   - Trade alerts
   - Portfolio analytics

---

## Success Metrics

- Chart loads in <2 seconds
- WebSocket uptime >99.5%
- Average trade execution <3 seconds
- Mobile usability score >90
- Zero critical security issues

---

## Support & Documentation

- User guide for chart features
- Trading tutorial videos
- Chat etiquette guidelines
- API documentation for developers

---

**Last Updated**: January 2025
**Next Review**: After Phase 1 completion
