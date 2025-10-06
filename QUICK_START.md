# 🚀 Quick Start Guide - New Improvements

## New Backend Endpoints

### 1. User Settings Update
```typescript
PUT /api/v1/user/settings
Authorization: Bearer <token>

// Request
{
  "displayName": "Cool Trader",
  "bio": "Professional crypto trader",
  "isProfilePublic": true,
  "twitter": "cooltrader",
  "discord": "cooltrader#1234"
}

// Response
{
  "success": true,
  "data": {
    "id": "user123",
    "displayName": "Cool Trader",
    "bio": "Professional crypto trader",
    // ... other fields
  }
}
```

### 2. User Search
```typescript
GET /api/v1/user/search?q=trader&limit=10

// Response
{
  "success": true,
  "data": [
    {
      "id": "user123",
      "username": "cooltrader",
      "displayName": "Cool Trader",
      "avatarUrl": "...",
      "virtualSolBalance": "150.50"
    }
  ],
  "meta": {
    "count": 1,
    "query": "trader",
    "limit": 10
  }
}
```

### 3. User Statistics
```typescript
GET /api/v1/user/stats
Authorization: Bearer <token>

// Response
{
  "success": true,
  "data": {
    "totalTrades": 42,
    "winRate": 65.5,
    "totalPnL": 25.75,
    "avgTradeSize": 5.2,
    "rank": 15,
    "bestTrade": 10.5,
    "worstTrade": -2.3
  }
}
```

## Using Standard Response Helpers (Backend)

```typescript
import { sendSuccess, sendError, sendValidationError } from '../utils/responseHelper';

// Success response
router.get('/example', async (req, res) => {
  const data = await fetchData();
  sendSuccess(res, data, {
    message: 'Data fetched successfully',
    meta: { count: data.length }
  });
});

// Error response
router.post('/example', async (req, res) => {
  try {
    // ... logic
  } catch (error) {
    sendValidationError(res, 'Invalid input data');
  }
});

// Paginated response
import { sendPaginated } from '../utils/responseHelper';

router.get('/items', async (req, res) => {
  const items = await fetchItems();
  sendPaginated(res, items, {
    limit: 20,
    offset: 0,
    total: 100
  });
});
```

## Using Enhanced Caching (Backend)

```typescript
import { priceCache, marketCache, cacheManager, CacheNamespaces, CacheTTL } from '../services/enhancedCacheService';

// Simple get/set
const price = priceCache.get('SOL');
if (!price) {
  const newPrice = await fetchPrice('SOL');
  priceCache.set('SOL', newPrice);
}

// Get or set (cache-aside pattern)
const trendingTokens = await marketCache.getOrSet('trending', async () => {
  return await trendingService.getTrending(20);
});

// Custom namespace with custom TTL
cacheManager.set('custom-data', 'key123', myData, 60000); // 1 minute TTL
const data = cacheManager.get('custom-data', 'key123');

// Clear cache
cacheManager.clear(CacheNamespaces.LEADERBOARD);

// Get statistics
const stats = cacheManager.getStatistics(CacheNamespaces.PRICES);
console.log(`Hit rate: ${stats.hitRate * 100}%`);
console.log(`Cache size: ${stats.size} entries`);
```

## Frontend Leaderboard Integration

```typescript
// The leaderboard page now uses real API data
import leaderboardService from '@/lib/leaderboard-service';

// In your component
useEffect(() => {
  const fetchData = async () => {
    try {
      const data = await leaderboardService.getLeaderboard();
      setLeaderboardData(data);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    }
  };

  fetchData();
  
  // Auto-refresh every 30 seconds
  const interval = setInterval(fetchData, 30000);
  return () => clearInterval(interval);
}, []);
```

## Error Logging (Frontend)

```typescript
import { errorLogger } from '@/lib/error-logger';

// Log errors with context
try {
  await riskyOperation();
} catch (error) {
  errorLogger.error('Operation failed', {
    error,
    action: 'risky_operation',
    component: 'MyComponent',
    metadata: { userId: user.id }
  });
  throw error;
}

// API errors are automatically logged by the API client
// But you can also log manually
errorLogger.apiError('/api/v1/trades/execute', error, {
  metadata: { tradeAmount: 10 }
});

// Performance logging
const startTime = Date.now();
await someOperation();
errorLogger.performance('Operation completed', Date.now() - startTime, {
  metadata: { operationType: 'trade' }
});
```

## Running Tests

```bash
# Backend integration tests
cd backend
npm test tests/integration/user-endpoints.test.ts
npm test tests/integration/leaderboard-endpoints.test.ts

# Run all backend tests
npm test

# Frontend tests (when added)
cd frontend
npm test
```

## Applying Caching to Your Routes

### Example: Market Routes
```typescript
// Before
router.get('/trending', async (req, res) => {
  const tokens = await trendingService.getTrending(limit);
  res.json({ success: true, data: { tokens } });
});

// After (with caching)
import { marketCache } from '../services/enhancedCacheService';
import { sendSuccess } from '../utils/responseHelper';

router.get('/trending', async (req, res) => {
  const tokens = await marketCache.getOrSet(`trending-${limit}`, async () => {
    return await trendingService.getTrending(limit);
  });
  
  sendSuccess(res, { tokens }, {
    meta: { cached: true, count: tokens.length }
  });
});
```

### Example: Leaderboard Route
```typescript
import { leaderboardCache } from '../services/enhancedCacheService';
import { sendSuccess } from '../utils/responseHelper';

router.get('/', async (req, res) => {
  const leaderboard = await leaderboardCache.getOrSet('all', async () => {
    // Expensive database query
    const topTraders = await calculateLeaderboard();
    return topTraders;
  });
  
  sendSuccess(res, leaderboard, {
    meta: { count: leaderboard.length }
  });
});
```

## Frontend Service Usage

```typescript
// User service
import userService from '@/lib/user-service';

// Search users
const users = await userService.searchUsers('trader', 10);

// Get user stats
const stats = await userService.getUserStats(); // Own stats
const otherStats = await userService.getUserStats('userId123'); // Other user

// Update settings
await userService.updateSettings({
  isProfilePublic: true,
  displayName: 'New Name'
});
```

## Cache Invalidation Patterns

```typescript
// After updating data, invalidate related caches
router.post('/trades/execute', async (req, res) => {
  const trade = await tradeService.execute(req.body);
  
  // Invalidate relevant caches
  cacheManager.delete(CacheNamespaces.PORTFOLIO, `user-${userId}`);
  cacheManager.clear(CacheNamespaces.LEADERBOARD); // Clear all leaderboard cache
  
  sendSuccess(res, trade);
});
```

## Monitoring Cache Performance

```typescript
// Add an admin endpoint
router.get('/monitoring/cache-stats', requireAdmin, (req, res) => {
  const allStats = cacheManager.getAllStatistics();
  
  sendSuccess(res, allStats, {
    message: 'Cache statistics retrieved'
  });
});

// Response
{
  "prices": {
    "hits": 1543,
    "misses": 87,
    "sets": 95,
    "size": 42,
    "hitRate": 0.946
  },
  "leaderboard": {
    "hits": 234,
    "misses": 12,
    "sets": 15,
    "size": 1,
    "hitRate": 0.951
  }
}
```

## Best Practices

### 1. Always Use Response Helpers
```typescript
// ❌ Don't do this
res.json({ data: user });

// ✅ Do this
sendSuccess(res, user);
```

### 2. Cache Expensive Operations
```typescript
// ❌ Don't do this
const trending = await calculateTrendingTokens(); // Expensive!

// ✅ Do this
const trending = await marketCache.getOrSet('trending', async () => {
  return await calculateTrendingTokens();
});
```

### 3. Log Errors with Context
```typescript
// ❌ Don't do this
console.error(error);

// ✅ Do this
errorLogger.error('Operation failed', {
  error,
  action: 'user_action',
  metadata: { additionalContext: 'value' }
});
```

### 4. Write Tests for New Features
```typescript
describe('My New Feature', () => {
  it('should work correctly', async () => {
    const result = await myFeature();
    expect(result).toBeDefined();
  });
});
```

## Troubleshooting

### Cache Not Working?
1. Check if cache namespace is initialized
2. Verify TTL is appropriate
3. Check cache statistics: `cacheManager.getStatistics('namespace')`

### Tests Failing?
1. Ensure test database is clean: `npx prisma migrate reset --force`
2. Check if test user cleanup is working
3. Verify API_URL environment variable

### Leaderboard Not Showing Data?
1. Check if users exist in database
2. Verify backend endpoint: `curl http://localhost:4002/api/v1/leaderboard`
3. Check browser console for errors
4. Verify authentication token is valid

## Need Help?

1. Check `IMPLEMENTATION_REPORT.md` for detailed documentation
2. Review test files for usage examples
3. Check error logs in browser console and server logs
4. Ensure all dependencies are installed: `npm install`

---

**Last Updated:** January 2025
