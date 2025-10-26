# PumpPortal Real-Time Data Integration

## Overview

The application now features comprehensive real-time data updates via PumpPortal's WebSocket API across multiple components:
- **Warp Pipes Cards** - Live holder count, market cap, bonding curve progress
- **Room Page Market Data Panels** - Live trades, top traders, active holders
- All data updates instantly without polling or manual refresh

## Implementation Details

### 1. WebSocket Utility (`frontend/lib/pumpportal-trades.ts`)

- **`streamTokenMetadata(mint, callbacks)`** - Streams real-time token metadata including:
  - `holderCount` - Current number of token holders
  - `marketCapSol` - Market cap in SOL
  - `bondingCurveProgress` - Bonding curve completion percentage
  - Social links (Twitter, Telegram, Website)

### 2. React Hook (`frontend/hooks/use-pumpportal-trades.ts`)

- **`usePumpPortalMetadata({ tokenMint, enabled })`** - React hook for consuming metadata stream
  - Returns: `{ metadata, status, error }`
  - Auto-connects/disconnects based on `enabled` prop
  - Handles reconnection logic

### 3. Usage in Token Cards

#### Option A: Real-Time Holder Count (Recommended for Priority Tokens)

Use this approach for tokens that need live holder count updates (e.g., ABOUT_TO_BOND status):

```tsx
import { usePumpPortalMetadata } from '@/hooks/use-pumpportal-trades';

function TokenCard({ data }: { data: TokenRow }) {
  // Enable live updates for tokens about to bond
  const shouldStreamMetadata = data.status === 'ABOUT_TO_BOND';
  
  const { metadata } = usePumpPortalMetadata({
    tokenMint: data.mint,
    enabled: shouldStreamMetadata
  });

  // Use live holder count if available, fallback to cached
  const holderCount = metadata?.holderCount ?? data.holderCount;

  return (
    <div>
      <div>Holders: {holderCount?.toLocaleString() || '—'}</div>
      {shouldStreamMetadata && (
        <span className="text-xs text-green-500">● Live</span>
      )}
    </div>
  );
}
```

#### Option B: Static Holder Count (Default)

For tokens that don't need real-time updates, continue using the cached `data.holderCount`:

```tsx
function TokenCard({ data }: { data: TokenRow }) {
  return (
    <div>Holders: {data.holderCount?.toLocaleString() || '—'}</div>
  );
}
```

## Performance Considerations

### WebSocket Connection Strategy

**✅ DO:**
- Use real-time streaming for high-priority tokens (ABOUT_TO_BOND, newly launched)
- Limit concurrent WebSocket connections (max 10-20)
- Disconnect when tokens scroll out of view

**❌ DON'T:**
- Open WebSocket connections for every token in the feed (hundreds)
- Keep connections open indefinitely
- Use real-time streaming for DEAD or OLD tokens

### Recommended Implementation Pattern

```tsx
function WarpPipesHub() {
  const tokens = useWarpPipesFeed();
  
  // Only stream metadata for top 10 ABOUT_TO_BOND tokens
  const priorityTokens = tokens
    .filter(t => t.status === 'ABOUT_TO_BOND')
    .slice(0, 10);

  return (
    <div>
      {tokens.map(token => (
        <TokenCard
          key={token.mint}
          data={token}
          enableLiveUpdates={priorityTokens.some(t => t.mint === token.mint)}
        />
      ))}
    </div>
  );
}
```

## Data Flow

```
PumpPortal WebSocket → streamTokenMetadata() → usePumpPortalMetadata() → TokenCard
                                                           ↓
                                                    metadata.holderCount
```

## Backend Integration

The backend already receives holder count from PumpPortal and stores it in the database via `tokenDiscoveryWorker.ts`:

- **New Token Events** - `holderCount` from PumpPortal's `newToken` event
- **Swap Events** - Updates may include holder count changes
- **Database Storage** - `Token.holderCount` field (BigInt)

The warp-pipes API (`/api/warp-pipes/feed`) returns this cached holder count by default.

## Testing

To verify the real-time holder count is working:

1. **Open DevTools Console** - Look for `[PumpPortal Metadata]` logs
2. **Navigate to Warp Pipes** - Select a token with ABOUT_TO_BOND status
3. **Monitor Updates** - Holder count should update when trades occur
4. **Check Status** - Look for "● Live" indicator next to holder count

## Error Handling

The hook handles common errors gracefully:

- **Connection failures** - Returns cached `data.holderCount`
- **Parse errors** - Logged to console, doesn't crash UI
- **Rate limits** - PumpPortal has generous limits for data stream
- **Reconnection** - Automatic with exponential backoff

## API Reference

### `streamTokenMetadata(mint, callbacks)`

**Parameters:**
- `mint: string` - Token mint address
- `callbacks.onMetadata: (metadata: TokenMetadata) => void` - Called on updates
- `callbacks.onStatus?: (status: TradeStreamStatus) => void` - Connection status
- `callbacks.onError?: (error: Error) => void` - Error handler

**Returns:** `() => void` - Cleanup function to close connection

### `usePumpPortalMetadata({ tokenMint, enabled })`

**Parameters:**
- `tokenMint: string` - Token mint address
- `enabled?: boolean` - Whether to start the stream (default: true)

**Returns:**
```typescript
{
  metadata: TokenMetadata | null;
  status: TradeStreamStatus;
  error: Error | null;
}
```

### `TokenMetadata` Type

```typescript
{
  mint: string;
  holderCount?: number;         // ← Real-time holder count
  marketCapSol?: number;
  vSolInBondingCurve?: number;
  bondingCurveProgress?: number;
  name?: string;
  symbol?: string;
  twitter?: string;
  telegram?: string;
  website?: string;
  timestamp: number;
}
```

## Future Enhancements

1. **Batch Subscriptions** - Subscribe to multiple tokens on one WebSocket
2. **Delta Updates** - Only show changes (e.g., "+5 holders")
3. **Historical Tracking** - Store holder count history for charts
4. **Notifications** - Alert when holder count crosses thresholds
5. **Aggregation** - Show total holder count across all watched tokens

## Related Files

- `frontend/lib/pumpportal-trades.ts` - WebSocket utilities
- `frontend/hooks/use-pumpportal-trades.ts` - React hooks
- `frontend/components/warp-pipes/token-card.tsx` - Token card UI
- `backend/src/services/pumpPortalStreamService.ts` - Backend WebSocket service
- `backend/src/workers/tokenDiscoveryWorker.ts` - Token discovery worker

## Documentation Links

- [PumpPortal API Docs](https://pumpportal.fun/api-docs)
- [PumpPortal Data Stream](https://pumpportal.fun/trading)
