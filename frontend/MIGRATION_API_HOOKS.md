# API Hooks Migration Guide

## Migrating from `api-hooks.ts` to `api-hooks-v2.ts`

This guide helps you migrate from the legacy `api-hooks.ts` to the modern `api-hooks-v2.ts` which uses TanStack Query (React Query) for superior caching, automatic refetching, and optimistic updates.

---

## 🎯 Why Migrate?

### Benefits of `api-hooks-v2.ts`:

✅ **Automatic Caching** - Responses cached automatically with configurable TTL  
✅ **Background Refetching** - Stale data refetched automatically  
✅ **Optimistic Updates** - Instant UI updates before server confirmation  
✅ **Request Deduplication** - Multiple components using same data = single request  
✅ **Better TypeScript Support** - Full type inference for queries and mutations  
✅ **Error Boundaries** - Built-in error handling with retry logic  
✅ **DevTools** - React Query DevTools for debugging

---

## 📦 Installation

No additional dependencies needed! TanStack Query is already configured in `query-provider.tsx`.

Make sure your app is wrapped with `QueryProvider`:

```tsx
// app/layout.tsx
import { QueryProvider } from '@/lib/query-provider'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  )
}
```

---

## 🔄 Migration Examples

### 1. Authentication Hook

#### Before (`api-hooks.ts`):
```tsx
import { useAuth } from '@/lib/api-hooks'

function MyComponent() {
  const { user, loading, error, login, logout } = useAuth()
  
  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>
  
  return <div>Welcome {user?.username}</div>
}
```

#### After (`api-hooks-v2.ts`):
```tsx
import { useAuth } from '@/lib/api-hooks-v2'

function MyComponent() {
  const { user, isLoading, error, login, logout } = useAuth()
  
  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  
  return <div>Welcome {user?.username}</div>
}
```

**Key Changes:**
- `loading` → `isLoading` (consistent with TanStack Query naming)
- `error` is now a typed `Error` object with `.message` property

---

### 2. Portfolio Data

#### Before:
```tsx
import { usePortfolio } from '@/lib/api-hooks'

function Portfolio() {
  const { data: portfolio, loading, error, refresh } = usePortfolio()
  
  const handleRefresh = async () => {
    await refresh()
  }
  
  return (
    <div>
      {portfolio?.positions.map(pos => (
        <div key={pos.tokenAddress}>{pos.tokenSymbol}</div>
      ))}
      <button onClick={handleRefresh}>Refresh</button>
    </div>
  )
}
```

#### After:
```tsx
import { usePortfolio } from '@/lib/api-hooks-v2'

function Portfolio() {
  const { data: portfolio, isLoading, error, refetch } = usePortfolio()
  
  return (
    <div>
      {portfolio?.positions.map(pos => (
        <div key={pos.tokenAddress}>{pos.tokenSymbol}</div>
      ))}
      <button onClick={() => refetch()}>Refresh</button>
    </div>
  )
}
```

**Key Changes:**
- `refresh()` → `refetch()` (returns a promise automatically)
- Automatic background refetching every 30 seconds (configurable)

---

### 3. Trending Tokens with Category Filter

#### Before:
```tsx
import { useTrendingTokens } from '@/lib/api-hooks'

function TrendingList() {
  const { data: tokens, loading, error } = useTrendingTokens(20, 'meme')
  
  return <div>...</div>
}
```

#### After:
```tsx
import { useTrendingTokens } from '@/lib/api-hooks-v2'

function TrendingList() {
  const { data: tokens, isLoading, error } = useTrendingTokens(20, 'meme')
  
  return <div>...</div>
}
```

**Key Changes:**
- Same API! Just change the import
- Now includes automatic caching and refetching

---

### 4. Trade Execution with Optimistic Updates

#### Before:
```tsx
import { useExecuteTrade } from '@/lib/api-hooks'

function TradingPanel() {
  const { executeTrade, loading } = useExecuteTrade()
  
  const handleBuy = async () => {
    try {
      await executeTrade({
        tokenAddress: 'So111...',
        type: 'buy',
        amount: 1.5
      })
      // Manually refresh portfolio
      await portfolioRefresh()
    } catch (err) {
      console.error(err)
    }
  }
  
  return <button onClick={handleBuy} disabled={loading}>Buy</button>
}
```

#### After:
```tsx
import { useExecuteTrade } from '@/lib/api-hooks-v2'

function TradingPanel() {
  const { mutate: executeTrade, isPending } = useExecuteTrade()
  
  const handleBuy = () => {
    executeTrade({
      tokenAddress: 'So111...',
      type: 'buy',
      amount: 1.5
    }, {
      onSuccess: (data) => {
        toast.success(`Trade executed: ${data.executedAmount} tokens`)
      },
      onError: (error) => {
        toast.error(`Trade failed: ${error.message}`)
      }
    })
    // Portfolio automatically refetched via invalidation!
  }
  
  return <button onClick={handleBuy} disabled={isPending}>Buy</button>
}
```

**Key Changes:**
- `loading` → `isPending` for mutations
- Callbacks passed to mutation call instead of try/catch
- Automatic cache invalidation refetches related data

---

### 5. Trade History with Pagination

#### Before:
```tsx
import { useTradeHistory } from '@/lib/api-hooks'

function TradeHistory() {
  const { data: trades, loading, error } = useTradeHistory(50)
  
  return <div>...</div>
}
```

#### After:
```tsx
import { useTradeHistory } from '@/lib/api-hooks-v2'

function TradeHistory() {
  const { 
    data: trades, 
    isLoading, 
    error,
    isFetching, // True during background refetch
    isStale     // True if data needs refetch
  } = useTradeHistory(50)
  
  return (
    <div>
      {isFetching && <div className="loading-indicator">Updating...</div>}
      {/* trades render */}
    </div>
  )
}
```

**Key Changes:**
- Additional state indicators (`isFetching`, `isStale`)
- Shows background update status

---

### 6. Search Tokens (Debounced)

#### Before:
```tsx
import { useState, useEffect } from 'react'
import { searchTokens } from '@/lib/market-service'

function TokenSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length > 2) {
        setLoading(true)
        const data = await searchTokens(query)
        setResults(data)
        setLoading(false)
      }
    }, 300)
    
    return () => clearTimeout(timer)
  }, [query])
  
  return <input value={query} onChange={e => setQuery(e.target.value)} />
}
```

#### After:
```tsx
import { useState } from 'react'
import { useSearchTokens } from '@/lib/api-hooks-v2'

function TokenSearch() {
  const [query, setQuery] = useState('')
  const { data: results, isLoading } = useSearchTokens(query)
  // Debouncing and caching handled automatically!
  
  return <input value={query} onChange={e => setQuery(e.target.value)} />
}
```

**Key Changes:**
- Debouncing built into the hook
- Automatic request cancellation on rapid typing
- Results cached per query

---

## 🎨 Advanced Features

### Custom Cache Times

```tsx
import { usePortfolio } from '@/lib/api-hooks-v2'

function Portfolio() {
  const { data } = usePortfolio({
    staleTime: 60000,      // Consider data stale after 1 minute
    gcTime: 300000,        // Keep in cache for 5 minutes
    refetchInterval: 10000 // Refetch every 10 seconds
  })
  
  return <div>...</div>
}
```

### Manual Cache Invalidation

```tsx
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/api-hooks-v2'

function AdminPanel() {
  const queryClient = useQueryClient()
  
  const handleClearCache = () => {
    // Invalidate specific queries
    queryClient.invalidateQueries({ queryKey: queryKeys.portfolio() })
    
    // Clear all portfolio-related caches
    queryClient.removeQueries({ queryKey: queryKeys.portfolio })
  }
  
  return <button onClick={handleClearCache}>Clear Cache</button>
}
```

### Optimistic Updates Example

```tsx
import { useUpdateProfile } from '@/lib/api-hooks-v2'
import { useQueryClient } from '@tanstack/react-query'

function ProfileEditor() {
  const queryClient = useQueryClient()
  const { mutate: updateProfile } = useUpdateProfile()
  
  const handleSave = (newData) => {
    updateProfile(newData, {
      // Update UI immediately before server responds
      onMutate: async (newProfile) => {
        await queryClient.cancelQueries({ queryKey: ['user', 'profile'] })
        const previous = queryClient.getQueryData(['user', 'profile'])
        queryClient.setQueryData(['user', 'profile'], newProfile)
        return { previous }
      },
      // Rollback on error
      onError: (err, newProfile, context) => {
        queryClient.setQueryData(['user', 'profile'], context.previous)
      }
    })
  }
  
  return <button onClick={handleSave}>Save</button>
}
```

---

## 📋 Complete Migration Checklist

- [ ] Verify `QueryProvider` wraps your app
- [ ] Update imports from `api-hooks.ts` → `api-hooks-v2.ts`
- [ ] Change `loading` → `isLoading` 
- [ ] Change `refresh()` → `refetch()`
- [ ] Update trade mutations to use callbacks instead of try/catch
- [ ] Remove manual debouncing logic (built into hooks)
- [ ] Test all features with React Query DevTools
- [ ] Remove `api-hooks.ts` once migration complete

---

## 🐛 Troubleshooting

### "Query data is undefined"
- Check if component is wrapped in `QueryProvider`
- Verify API endpoint is returning data correctly
- Check network tab for failed requests

### "Too many re-renders"
- Don't call `refetch()` inside render body
- Use `useEffect` or event handlers for refetch calls

### "Cache not updating after mutation"
- Ensure mutation includes `onSuccess` with `queryClient.invalidateQueries()`
- Check that query keys match between query and invalidation

---

## 🔗 Additional Resources

- [TanStack Query Docs](https://tanstack.com/query/latest/docs/react/overview)
- [React Query DevTools](https://tanstack.com/query/latest/docs/react/devtools)
- [SolSim Query Provider](./lib/query-provider.tsx)

---

## 💬 Questions?

If you encounter issues during migration, check:
1. Console for TanStack Query errors
2. Network tab for failed API calls
3. React Query DevTools for cache state

**Happy Migrating! 🚀**
