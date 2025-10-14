# Portfolio Hook Migration Guide

## Overview

This guide explains how to migrate from manual portfolio state management to the centralized `usePortfolio` hook system. The new approach provides several benefits:

- **Single Source of Truth**: All portfolio data comes from one centralized hook
- **Consistent Caching**: React Query handles caching automatically (30s refetch, 10s stale time)
- **Reduced Duplicated API Calls**: Multiple components can share the same portfolio data
- **Simplified Code**: No need for manual loading states, error handling, or useEffect boilerplate
- **Better Performance**: Automatic background refetching and optimistic updates

## The New Hooks

### `usePortfolio()`

Main hook for fetching portfolio data.

**Returns:**
- `data`: Portfolio data (positions, totals, etc.)
- `isLoading`: Loading state
- `error`: Error object if fetch failed
- `refetch`: Function to manually refetch data

**Options:**
- `enabled`: Enable/disable the query (default: based on auth status)
- `refetchInterval`: Refetch interval in ms (default: 30000)
- `staleTime`: Time before data is considered stale (default: 10000)

### `usePortfolioMetrics()`

Derived hook that calculates common portfolio statistics.

**Returns:**
```typescript
{
  totalValue: number          // Total portfolio value in USD
  totalPnL: number           // Total profit/loss in USD
  totalPnLPercent: number    // PnL percentage
  totalRealized: number      // Realized PnL
  totalUnrealized: number    // Unrealized PnL
  positionCount: number      // Number of open positions
  isEmpty: boolean           // True if no positions
}
```

### `usePosition(mint: string)`

Get a specific position by token mint address.

**Returns:** `PortfolioPosition | null`

## Migration Examples

### Example 1: Basic Portfolio Data Fetching

#### BEFORE ❌

```tsx
import { useState, useEffect } from 'react'
import * as api from '@/lib/api'
import { useAuth } from '@/hooks/use-auth'

function PortfolioComponent() {
  const { user, isAuthenticated } = useAuth()
  const [portfolio, setPortfolio] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isAuthenticated && user) {
      const loadPortfolio = async () => {
        setLoading(true)
        try {
          const data = await api.getPortfolio(user.id)
          setPortfolio(data)
        } catch (err) {
          setError(err.message)
        } finally {
          setLoading(false)
        }
      }
      loadPortfolio()
    }
  }, [isAuthenticated, user])

  const refreshPortfolio = async () => {
    if (!user) return
    setLoading(true)
    try {
      const data = await api.getPortfolio(user.id)
      setPortfolio(data)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div>
      <h2>Total Value: ${portfolio?.totals.totalValueUsd}</h2>
      <button onClick={refreshPortfolio}>Refresh</button>
    </div>
  )
}
```

#### AFTER ✅

```tsx
import { usePortfolio } from '@/hooks/use-portfolio'

function PortfolioComponent() {
  const {
    data: portfolio,
    isLoading,
    error,
    refetch: refreshPortfolio
  } = usePortfolio()

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      <h2>Total Value: ${portfolio?.totals.totalValueUsd}</h2>
      <button onClick={refreshPortfolio}>Refresh</button>
    </div>
  )
}
```

**Improvements:**
- Removed 20+ lines of boilerplate code
- No manual state management
- No useEffect needed
- Automatic caching and background refetching

---

### Example 2: Portfolio Metrics

#### BEFORE ❌

```tsx
function MetricsDisplay() {
  const { user } = useAuth()
  const [portfolio, setPortfolio] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      api.getPortfolio(user.id)
        .then(setPortfolio)
        .finally(() => setLoading(false))
    }
  }, [user])

  if (loading || !portfolio) return <Skeleton />

  // Manual calculation
  const totalValue = parseFloat(portfolio.totals.totalValueUsd)
  const totalPnL = parseFloat(portfolio.totals.totalPnlUsd)
  const positionCount = portfolio.positions?.filter(p => parseFloat(p.qty) > 0).length || 0
  const costBasis = totalValue - totalPnL
  const totalPnLPercent = costBasis > 0 ? (totalPnL / costBasis) * 100 : 0

  return (
    <div>
      <div>Value: ${totalValue.toFixed(2)}</div>
      <div>PnL: ${totalPnL.toFixed(2)} ({totalPnLPercent.toFixed(2)}%)</div>
      <div>Positions: {positionCount}</div>
    </div>
  )
}
```

#### AFTER ✅

```tsx
import { usePortfolioMetrics } from '@/hooks/use-portfolio'

function MetricsDisplay() {
  const {
    totalValue,
    totalPnL,
    totalPnLPercent,
    positionCount,
    isEmpty
  } = usePortfolioMetrics()

  return (
    <div>
      <div>Value: ${totalValue.toFixed(2)}</div>
      <div>PnL: ${totalPnL.toFixed(2)} ({totalPnLPercent.toFixed(2)}%)</div>
      <div>Positions: {positionCount}</div>
    </div>
  )
}
```

**Improvements:**
- No manual calculations needed
- Metrics are computed consistently across the app
- Automatic zero values when no portfolio data

---

### Example 3: Token Position Lookup

#### BEFORE ❌

```tsx
function TokenHoldingCard({ tokenMint }: { tokenMint: string }) {
  const { user } = useAuth()
  const [portfolio, setPortfolio] = useState(null)
  const [position, setPosition] = useState(null)

  useEffect(() => {
    if (user) {
      api.getPortfolio(user.id).then(setPortfolio)
    }
  }, [user])

  useEffect(() => {
    if (portfolio?.positions) {
      const found = portfolio.positions.find(
        p => p.mint === tokenMint && parseFloat(p.qty) > 0
      )
      setPosition(found || null)
    }
  }, [portfolio, tokenMint])

  if (!position) return <div>No holdings</div>

  return (
    <div>
      <div>Quantity: {position.qty}</div>
      <div>PnL: ${position.unrealizedUsd}</div>
    </div>
  )
}
```

#### AFTER ✅

```tsx
import { usePosition } from '@/hooks/use-portfolio'

function TokenHoldingCard({ tokenMint }: { tokenMint: string }) {
  const position = usePosition(tokenMint)

  if (!position) return <div>No holdings</div>

  return (
    <div>
      <div>Quantity: {position.qty}</div>
      <div>PnL: ${position.unrealizedUsd}</div>
    </div>
  )
}
```

**Improvements:**
- Single line to get position data
- No nested useEffects
- Automatically updates when portfolio changes
- No redundant API calls if another component already fetched portfolio

---

### Example 4: Trading Panel (Complex Example)

This is the most complex migration, showing how trading-panel.tsx was updated.

#### Key Changes:

1. **Replace manual state with hook**:
```tsx
// BEFORE
const [portfolio, setPortfolio] = useState(null)
const [portfolioLoading, setPortfolioLoading] = useState(false)
const [portfolioError, setPortfolioError] = useState(null)

// AFTER
const {
  data: portfolio,
  isLoading: portfolioLoading,
  error: portfolioErrorObj,
  refetch: refreshPortfolio
} = usePortfolio()
const portfolioError = portfolioErrorObj ? portfolioErrorObj.message : null
```

2. **Remove manual loading useEffect**:
```tsx
// BEFORE (DELETE THIS)
useEffect(() => {
  if (isAuthenticated && user) {
    const loadData = async () => {
      setPortfolioLoading(true)
      try {
        const portfolioData = await api.getPortfolio(user.id)
        setPortfolio(portfolioData)
      } catch (err) {
        setPortfolioError(err.message)
      } finally {
        setPortfolioLoading(false)
      }
    }
    loadData()
  }
}, [isAuthenticated, user])

// AFTER - Nothing needed, hook handles it automatically!
```

3. **Simplify refresh function**:
```tsx
// BEFORE (DELETE THIS)
const refreshPortfolio = async () => {
  if (!user) return
  setPortfolioLoading(true)
  try {
    const data = await api.getPortfolio(user.id)
    setPortfolio(data)
    setPortfolioError(null)
  } catch (err) {
    setPortfolioError(err.message)
  } finally {
    setPortfolioLoading(false)
  }
}

// AFTER - Just use refetch from the hook
// (Already destructured as refreshPortfolio in step 1)
```

4. **Update trade success handlers**:
```tsx
// BEFORE
if (result.success) {
  await refreshPortfolio()
  queryClient.invalidateQueries({ queryKey: ['portfolio', userId] })
}

// AFTER - No need to invalidate, refetch handles it
if (result.success) {
  await refreshPortfolio()
}
```

5. **Replace position finding logic**:
```tsx
// BEFORE
const [tokenHolding, setTokenHolding] = useState(null)

useEffect(() => {
  if (portfolio?.positions) {
    const holding = portfolio.positions.find(
      p => p.mint === tokenAddress && parseFloat(p.qty) > 0
    )
    setTokenHolding(holding || null)
  }
}, [portfolio, tokenAddress])

// AFTER
const tokenHolding = usePosition(tokenAddress)
```

---

## Migration Checklist

When migrating a component to use the new hooks:

- [ ] Import `usePortfolio`, `usePortfolioMetrics`, or `usePosition` from `@/hooks/use-portfolio`
- [ ] Remove manual `useState` for portfolio data
- [ ] Remove manual `useState` for loading and error states
- [ ] Delete `useEffect` that calls `api.getPortfolio()`
- [ ] Replace custom refresh functions with `refetch` from the hook
- [ ] Remove manual portfolio position finding logic (use `usePosition` instead)
- [ ] Remove redundant `queryClient.invalidateQueries(['portfolio'])` calls
- [ ] Update error handling to use error object from hook
- [ ] Test that loading states and error states still work correctly
- [ ] Verify that data refreshes properly after trades

---

## Common Patterns

### Pattern 1: Conditional Fetching

If you need to control when portfolio data is fetched:

```tsx
const { data: portfolio } = usePortfolio({
  enabled: shouldFetch, // Only fetch when true
  refetchInterval: 60000, // Custom interval
  staleTime: 5000 // Custom stale time
})
```

### Pattern 2: Loading States

```tsx
const { data: portfolio, isLoading } = usePortfolio()

if (isLoading) return <Skeleton />
if (!portfolio) return null

return <PortfolioDisplay data={portfolio} />
```

### Pattern 3: Error Handling

```tsx
const { data: portfolio, error } = usePortfolio()

if (error) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        Failed to load portfolio: {error.message}
      </AlertDescription>
    </Alert>
  )
}
```

### Pattern 4: Combining Hooks

```tsx
function AdvancedPortfolioView({ selectedToken }: Props) {
  // Get full portfolio data
  const { data: portfolio, isLoading, refetch } = usePortfolio()

  // Get computed metrics
  const { totalValue, totalPnL, positionCount } = usePortfolioMetrics()

  // Get specific position
  const tokenPosition = usePosition(selectedToken)

  return (
    <div>
      <h1>Portfolio Value: ${totalValue}</h1>
      <p>Total Positions: {positionCount}</p>

      {tokenPosition && (
        <div>
          Selected Token: {tokenPosition.qty} tokens
        </div>
      )}

      <button onClick={() => refetch()}>Refresh</button>
    </div>
  )
}
```

---

## Technical Details

### Caching Strategy

The `usePortfolio` hook uses React Query with the following configuration:

- **Query Key**: `['portfolio', userId]` - Unique per user
- **Stale Time**: 10 seconds - Data is considered fresh for 10s
- **Refetch Interval**: 30 seconds - Background refetch every 30s
- **Placeholder Data**: Previous data is kept while refetching for smooth UX

### Shared State

Multiple components using `usePortfolio()` will share the same data:

```tsx
// Component A
const { data } = usePortfolio() // Triggers fetch

// Component B (mounted at same time)
const { data } = usePortfolio() // Uses cached data, no new fetch!
```

### Manual Invalidation

If you need to force a refetch (e.g., after a trade):

```tsx
// Method 1: Use refetch from hook (RECOMMENDED)
const { refetch } = usePortfolio()
await refetch()

// Method 2: Invalidate query (if you don't have access to the hook)
import { useQueryClient } from '@tanstack/react-query'
const queryClient = useQueryClient()
queryClient.invalidateQueries({ queryKey: ['portfolio', userId] })
```

---

## Benefits Summary

### Before Migration
- ❌ Duplicate API calls across components
- ❌ Inconsistent loading states
- ❌ Manual error handling everywhere
- ❌ 20-30 lines of boilerplate per component
- ❌ Easy to forget to refresh after trades
- ❌ No automatic background updates

### After Migration
- ✅ Single API call shared across components
- ✅ Consistent loading states via React Query
- ✅ Centralized error handling
- ✅ 2-3 lines of code per component
- ✅ Simple `refetch()` call after trades
- ✅ Automatic background refetching every 30s

---

## Migration Status

### ✅ Completed
- `trading-panel.tsx` - Full migration with position lookup
- Portfolio metrics calculations centralized
- Loading state skeletons unified

### 🔄 To Migrate
Components that still use manual portfolio fetching:
- Check `app/` directory for any remaining `api.getPortfolio` calls
- Check `components/` for manual portfolio state management
- Verify all position lookups use `usePosition` hook

### 🔍 How to Find Candidates

Search for these patterns in your codebase:
```bash
# Find manual portfolio fetching
grep -r "api.getPortfolio" --include="*.tsx" --include="*.ts"

# Find manual portfolio state
grep -r "useState.*portfolio" --include="*.tsx"

# Find manual position finding
grep -r "portfolio.positions.find" --include="*.tsx"
```

---

## Need Help?

- **Hook Implementation**: See `frontend/hooks/use-portfolio.ts`
- **Example Usage**: See `frontend/components/trading/trading-panel.tsx`
- **React Query Docs**: https://tanstack.com/query/latest/docs/react/overview
- **Questions?**: Ask the team in the #frontend channel

---

**Last Updated**: 2025-10-13
**Author**: Claude Code
**Status**: Active - All new code should use these hooks
