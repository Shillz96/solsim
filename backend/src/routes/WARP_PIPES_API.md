# Warp Pipes API Documentation

Base URL: `/api/warp-pipes`

## Endpoints

### 1. Get Token Discovery Feed

Get tokens organized by state (bonded, graduating, new) with filtering and sorting.

**Endpoint**: `GET /api/warp-pipes/feed`

**Authentication**: Optional (shows `isWatched` status if authenticated)

**Query Parameters**:
- `searchQuery` (string, optional) - Search by symbol or name
- `sortBy` (enum, optional) - Sort method: `hot` (default), `new`, `watched`, `alphabetical`
- `minLiquidity` (number, optional) - Minimum liquidity in USD
- `onlyWatched` (boolean, optional) - Show only watched tokens (requires auth)
- `limit` (number, optional) - Max tokens per state (1-100, default: 50)

**Response**:
```json
{
  "bonded": [
    {
      "mint": "7xKXt...",
      "symbol": "MARIO",
      "name": "Mario Coin",
      "logoURI": "https://...",
      "state": "bonded",
      "liqUsd": null,
      "poolAgeMin": null,
      "priceImpactPctAt1pct": null,
      "freezeRevoked": false,
      "mintRenounced": false,
      "creatorVerified": false,
      "bondingCurveProgress": 45.5,
      "hotScore": 92,
      "watcherCount": 5,
      "isWatched": false,
      "firstSeenAt": "2025-01-23T10:30:00Z",
      "lastUpdatedAt": "2025-01-23T10:32:00Z",
      "stateChangedAt": "2025-01-23T10:30:00Z"
    }
  ],
  "graduating": [...],
  "new": [...]
}
```

**Example**:
```bash
# Get all tokens sorted by hot score
curl http://localhost:4000/api/warp-pipes/feed

# Search for "PEACH" tokens
curl "http://localhost:4000/api/warp-pipes/feed?searchQuery=PEACH"

# Get new tokens with minimum $10k liquidity
curl "http://localhost:4000/api/warp-pipes/feed?sortBy=new&minLiquidity=10000"

# Get only watched tokens (requires auth)
curl -H "Authorization: Bearer <token>" \
  "http://localhost:4000/api/warp-pipes/feed?onlyWatched=true"
```

---

### 2. Add Token Watch

Add a token to your watchlist with notification preferences.

**Endpoint**: `POST /api/warp-pipes/watch`

**Authentication**: Required (JWT)

**Request Body**:
```json
{
  "mint": "7xKXt...",
  "preferences": {
    "notifyOnGraduation": true,
    "notifyOnMigration": true,
    "notifyOnPriceChange": false
  }
}
```

**Response**:
```json
{
  "success": true,
  "watch": {
    "id": "watch_abc123",
    "mint": "7xKXt...",
    "notifyOnGraduation": true,
    "notifyOnMigration": true,
    "notifyOnPriceChange": false,
    "currentState": "bonded",
    "createdAt": "2025-01-23T10:35:00Z"
  }
}
```

**Errors**:
- `404` - Token not found in TokenDiscovery
- `409` - Already watching this token

**Example**:
```bash
curl -X POST http://localhost:4000/api/warp-pipes/watch \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "mint": "7xKXt...",
    "preferences": {
      "notifyOnGraduation": true,
      "notifyOnMigration": true
    }
  }'
```

---

### 3. Remove Token Watch

Remove a token from your watchlist.

**Endpoint**: `DELETE /api/warp-pipes/watch/:mint`

**Authentication**: Required (JWT)

**Response**:
```json
{
  "success": true
}
```

**Errors**:
- `404` - Watch not found

**Example**:
```bash
curl -X DELETE http://localhost:4000/api/warp-pipes/watch/7xKXt... \
  -H "Authorization: Bearer <token>"
```

---

### 4. Update Watch Preferences

Update notification preferences for a watched token.

**Endpoint**: `PATCH /api/warp-pipes/watch/:mint`

**Authentication**: Required (JWT)

**Request Body**:
```json
{
  "preferences": {
    "notifyOnGraduation": false,
    "notifyOnMigration": true,
    "notifyOnPriceChange": true
  }
}
```

**Response**:
```json
{
  "success": true,
  "watch": {
    "id": "watch_abc123",
    "mint": "7xKXt...",
    "notifyOnGraduation": false,
    "notifyOnMigration": true,
    "notifyOnPriceChange": true,
    "currentState": "graduating",
    "createdAt": "2025-01-23T10:35:00Z"
  }
}
```

**Example**:
```bash
curl -X PATCH http://localhost:4000/api/warp-pipes/watch/7xKXt... \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "preferences": {
      "notifyOnPriceChange": true
    }
  }'
```

---

### 5. Get User's Watches

Get all tokens on your watchlist with current token data.

**Endpoint**: `GET /api/warp-pipes/watches`

**Authentication**: Required (JWT)

**Response**:
```json
{
  "watches": [
    {
      "id": "watch_abc123",
      "mint": "7xKXt...",
      "notifyOnGraduation": true,
      "notifyOnMigration": true,
      "notifyOnPriceChange": false,
      "currentState": "bonded",
      "createdAt": "2025-01-23T10:35:00Z",
      "token": {
        "symbol": "MARIO",
        "name": "Mario Coin",
        "logoURI": "https://...",
        "state": "graduating",
        "hotScore": 87
      }
    }
  ]
}
```

**Example**:
```bash
curl http://localhost:4000/api/warp-pipes/watches \
  -H "Authorization: Bearer <token>"
```

---

### 6. Get Token Health Data

Get detailed health capsule data for a specific token.

**Endpoint**: `GET /api/warp-pipes/health/:mint`

**Authentication**: Optional

**Response**:
```json
{
  "mint": "7xKXt...",
  "health": {
    "freezeRevoked": true,
    "mintRenounced": true,
    "priceImpact1Pct": 0.85,
    "liquidityUsd": 42500,
    "poolAgeMin": 12,
    "state": "new",
    "bondingCurveProgress": null
  }
}
```

**Cache**: 5 minutes

**Example**:
```bash
curl http://localhost:4000/api/warp-pipes/health/7xKXt...
```

---

### 7. Get Token Details

Get complete token information including watch status.

**Endpoint**: `GET /api/warp-pipes/token/:mint`

**Authentication**: Optional (shows `isWatched` status if authenticated)

**Response**:
```json
{
  "token": {
    "mint": "7xKXt...",
    "symbol": "MARIO",
    "name": "Mario Coin",
    "logoURI": "https://...",
    "state": "new",
    "liqUsd": 42500,
    "poolAgeMin": 12,
    "priceImpactPctAt1pct": 0.85,
    "freezeRevoked": true,
    "mintRenounced": true,
    "creatorVerified": false,
    "bondingCurveProgress": null,
    "hotScore": 87,
    "watcherCount": 23,
    "isWatched": true,
    "firstSeenAt": "2025-01-23T10:30:00Z",
    "lastUpdatedAt": "2025-01-23T10:45:00Z",
    "stateChangedAt": "2025-01-23T10:42:00Z"
  }
}
```

**Cache**: 2 hours

**Example**:
```bash
curl http://localhost:4000/api/warp-pipes/token/7xKXt... \
  -H "Authorization: Bearer <token>"
```

---

## Data Models

### TokenRow

```typescript
interface TokenRow {
  mint: string;
  symbol: string | null;
  name: string | null;
  logoURI: string | null;
  state: 'bonded' | 'graduating' | 'new';

  // Health metrics
  liqUsd?: number;
  poolAgeMin?: number;
  priceImpactPctAt1pct?: number;
  freezeRevoked: boolean;
  mintRenounced: boolean;
  creatorVerified?: boolean;

  // Bonding curve data (bonded/graduating only)
  bondingCurveProgress?: number; // 0-100%

  // Trending metrics
  hotScore: number;
  watcherCount: number;
  isWatched?: boolean; // Only present if authenticated

  // Timestamps
  firstSeenAt: string; // ISO 8601
  lastUpdatedAt: string;
  stateChangedAt: string;
}
```

### WatchPreferences

```typescript
interface WatchPreferences {
  notifyOnGraduation: boolean; // bonded → graduating
  notifyOnMigration: boolean;  // graduating → new
  notifyOnPriceChange: boolean; // price alerts (future)
}
```

---

## Caching Strategy

| Endpoint | Cache Type | TTL | Key Pattern |
|----------|------------|-----|-------------|
| `/feed` | None | - | - |
| `/token/:mint` | Redis | 2 hours | `token:{mint}` |
| `/health/:mint` | Redis | 5 minutes | `health:{mint}` |
| `/watches` | None | - | - |

**Cache Invalidation**:
- Token cache invalidated on: state change, watch add/remove
- Health cache invalidated on: never (TTL expires naturally)

---

## Performance Notes

### Feed Endpoint

- Queries 3 separate states in parallel
- Applies user-specific filters efficiently
- Limit parameter prevents large result sets
- Expected response time: 50-200ms

### Watch Operations

- Auto-increment/decrement watcher count
- Cache invalidation on mutations
- Watch uniqueness enforced via DB constraint

### Health Endpoint

- 5-minute cache prevents excessive RPC calls
- Jupiter API: ~2 req/s limit
- DexScreener: ~5 req/s limit
- Helius RPC: Plan-dependent

---

## Error Responses

All endpoints return standardized error responses:

```json
{
  "error": "Error message here"
}
```

**Common Status Codes**:
- `200` - Success
- `400` - Bad request (validation error)
- `401` - Unauthorized (missing/invalid JWT)
- `404` - Resource not found
- `409` - Conflict (already watching)
- `500` - Internal server error

---

## Testing

### Manual Testing

```bash
# 1. Start backend
cd backend && npm run dev

# 2. Check health endpoint
curl http://localhost:4000/health

# 3. Test feed endpoint
curl http://localhost:4000/api/warp-pipes/feed | jq

# 4. Get auth token (login first)
TOKEN=$(curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' | jq -r '.token')

# 5. Add a watch
curl -X POST http://localhost:4000/api/warp-pipes/watch \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mint":"7xKXt..."}'

# 6. Get watches
curl http://localhost:4000/api/warp-pipes/watches \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Postman Collection

Import the following collection for easy testing:

```json
{
  "info": { "name": "Warp Pipes API" },
  "item": [
    {
      "name": "Get Feed",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/api/warp-pipes/feed"
      }
    },
    {
      "name": "Add Watch",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/api/warp-pipes/watch",
        "header": [
          { "key": "Authorization", "value": "Bearer {{token}}" }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"mint\": \"7xKXt...\"\n}"
        }
      }
    }
  ],
  "variable": [
    { "key": "baseUrl", "value": "http://localhost:4000" },
    { "key": "token", "value": "" }
  ]
}
```

---

## Next Steps

After API implementation:

1. **Test endpoints** with real data from worker
2. **Deploy to Railway** with migration
3. **Build frontend** Warp Pipes Hub page
4. **Create React Query hooks** for data fetching
5. **Implement Room page** for individual tokens

---

**Last Updated**: January 23, 2025
