/**
 * React Hook for PumpPortal Real-Time Trade Stream
 * 
 * Manages WebSocket connection to PumpPortal and provides
 * real-time trade updates and token metadata for a specific token.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  streamTokenTrades, 
  streamTokenMetadata,
  RecentTrade, 
  TokenMetadata,
  TradeStreamStatus 
} from '@/lib/pumpportal-trades';

export interface UsePumpPortalTradesOptions {
  /** Token mint address to stream trades for */
  tokenMint: string;
  /** Maximum number of trades to keep in memory */
  maxTrades?: number;
  /** Whether to enable the WebSocket connection */
  enabled?: boolean;
}

export interface UsePumpPortalTradesResult {
  /** Array of recent trades (newest first) */
  trades: RecentTrade[];
  /** Connection status */
  status: TradeStreamStatus;
  /** Any error that occurred */
  error: Error | null;
  /** Manually reconnect */
  reconnect: () => void;
  /** Clear all trades */
  clearTrades: () => void;
}

/**
 * Hook to stream real-time trades for a token from PumpPortal
 * 
 * @example
 * ```tsx
 * const { trades, status } = usePumpPortalTrades({ 
 *   tokenMint: 'ABC123...',
 *   maxTrades: 50 
 * });
 * ```
 */
export function usePumpPortalTrades({
  tokenMint,
  maxTrades = 50,
  enabled = true,
}: UsePumpPortalTradesOptions): UsePumpPortalTradesResult {
  const [trades, setTrades] = useState<RecentTrade[]>([]);
  const [status, setStatus] = useState<TradeStreamStatus>("connecting");
  const [error, setError] = useState<Error | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const reconnectCountRef = useRef(0);

  const connect = useCallback(() => {
    if (!enabled || !tokenMint) return;

    // Clean up any existing connection
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    console.log(`[usePumpPortalTrades] Connecting to stream for ${tokenMint}`);

    // Start the WebSocket stream
    cleanupRef.current = streamTokenTrades(tokenMint, {
      onTrade: (trade) => {
        setTrades((prev) => {
          // Add new trade at the beginning (newest first)
          const updated = [trade, ...prev];
          // Keep only the most recent trades
          return updated.slice(0, maxTrades);
        });
      },
      onStatus: (newStatus) => {
        console.log(`[usePumpPortalTrades] Status changed: ${newStatus}`);
        setStatus(newStatus);

        // Auto-reconnect on close (but not on intentional disconnect)
        if (newStatus === "closed" && enabled && reconnectCountRef.current < 3) {
          reconnectCountRef.current++;
          console.log(`[usePumpPortalTrades] Auto-reconnecting (attempt ${reconnectCountRef.current})`);
          setTimeout(() => {
            if (enabled) connect();
          }, 2000 * reconnectCountRef.current); // Exponential backoff
        } else if (newStatus === "connected") {
          reconnectCountRef.current = 0; // Reset on successful connection
        }
      },
      onError: (err) => {
        console.error(`[usePumpPortalTrades] Error:`, err);
        setError(err);
      },
    });
  }, [enabled, tokenMint, maxTrades]);

  const reconnect = useCallback(() => {
    reconnectCountRef.current = 0;
    connect();
  }, [connect]);

  const clearTrades = useCallback(() => {
    setTrades([]);
  }, []);

  // Connect on mount and when dependencies change
  useEffect(() => {
    if (!enabled || !tokenMint) {
      setStatus("closed");
      return;
    }

    connect();

    // Cleanup on unmount or when dependencies change
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [enabled, tokenMint, connect]);

  return {
    trades,
    status,
    error,
    reconnect,
    clearTrades,
  };
}

/**
 * Hook variant that combines PumpPortal real-time stream
 * with historical trades from the backend API.
 * 
 * This gives you:
 * 1. Initial historical trades on mount (backfill)
 * 2. Real-time updates via WebSocket
 * 
 * @example
 * ```tsx
 * const { trades, status } = usePumpPortalTradesWithHistory({ 
 *   tokenMint: 'ABC123...'
 * });
 * ```
 */
export function usePumpPortalTradesWithHistory({
  tokenMint,
  maxTrades = 50,
  enabled = true,
}: UsePumpPortalTradesOptions): UsePumpPortalTradesResult & { isLoadingHistory: boolean } {
  const [historicalTrades, setHistoricalTrades] = useState<RecentTrade[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const hasLoadedHistoryRef = useRef(false);

  // Load historical trades from backend API
  useEffect(() => {
    if (!enabled || !tokenMint || hasLoadedHistoryRef.current) return;

    const loadHistory = async () => {
      try {
        setIsLoadingHistory(true);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const response = await fetch(`${apiUrl}/api/market/trades/${tokenMint}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch historical trades');
        }

        const data = await response.json();
        const trades = data.trades || [];

        // Transform backend format to PumpPortal format
        const transformed: RecentTrade[] = trades.map((t: any) => ({
          ts: t.timestamp || Date.now(),
          side: t.side?.toLowerCase() === 'buy' || t.type === 'buy' ? 'buy' : 'sell',
          priceSol: t.price || t.solPerToken,
          amountSol: t.solAmount || t.totalCost,
          amountToken: t.tokenAmount || t.quantity,
          signer: t.signer || t.user?.id || 'unknown',
          sig: t.sig || t.signature || '',
          mint: tokenMint,
        }));

        setHistoricalTrades(transformed);
        hasLoadedHistoryRef.current = true;
      } catch (error) {
        console.error('[usePumpPortalTradesWithHistory] Failed to load history:', error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadHistory();
  }, [enabled, tokenMint]);

  // Use the real-time hook
  const realtimeResult = usePumpPortalTrades({ tokenMint, maxTrades, enabled });

  // Merge historical and real-time trades
  const mergedTrades = useCallback(() => {
    // Combine and deduplicate by signature
    const tradeMap = new Map<string, RecentTrade>();

    // Add real-time trades first (highest priority)
    realtimeResult.trades.forEach(trade => {
      if (trade.sig) {
        tradeMap.set(trade.sig, trade);
      }
    });

    // Add historical trades (only if not already present)
    historicalTrades.forEach(trade => {
      if (trade.sig && !tradeMap.has(trade.sig)) {
        tradeMap.set(trade.sig, trade);
      }
    });

    // Convert back to array and sort by timestamp (newest first)
    return Array.from(tradeMap.values())
      .sort((a, b) => b.ts - a.ts)
      .slice(0, maxTrades);
  }, [realtimeResult.trades, historicalTrades, maxTrades]);

  return {
    ...realtimeResult,
    trades: mergedTrades(),
    isLoadingHistory,
  };
}

/**
 * Hook to stream real-time token metadata (including holder count) from PumpPortal
 * 
 * Useful for displaying live holder count on token cards in warp-pipes.
 * 
 * @example
 * ```tsx
 * const { metadata, status } = usePumpPortalMetadata({ 
 *   tokenMint: 'ABC123...'
 * });
 * 
 * // Display live holder count
 * <div>Holders: {metadata?.holderCount || '—'}</div>
 * ```
 */
export function usePumpPortalMetadata({
  tokenMint,
  enabled = true,
}: {
  tokenMint: string;
  enabled?: boolean;
}): {
  metadata: TokenMetadata | null;
  status: TradeStreamStatus;
  error: Error | null;
} {
  const [metadata, setMetadata] = useState<TokenMetadata | null>(null);
  const [status, setStatus] = useState<TradeStreamStatus>("connecting");
  const [error, setError] = useState<Error | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!enabled || !tokenMint) {
      setStatus("closed");
      return;
    }

    // Clean up any existing connection
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    console.log(`[usePumpPortalMetadata] Connecting to stream for ${tokenMint}`);

    // Start the WebSocket stream for metadata
    cleanupRef.current = streamTokenMetadata(tokenMint, {
      onMetadata: (newMetadata) => {
        setMetadata(newMetadata);
      },
      onStatus: (newStatus) => {
        console.log(`[usePumpPortalMetadata] Status changed: ${newStatus}`);
        setStatus(newStatus);
      },
      onError: (err) => {
        console.error(`[usePumpPortalMetadata] Error:`, err);
        setError(err);
      },
    });

    // Cleanup on unmount or when dependencies change
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [enabled, tokenMint]);

  return {
    metadata,
    status,
    error,
  };
}

/**
 * Trader statistics calculated from live trades
 */
export interface TopTrader {
  address: string;
  totalBuys: number;
  totalSells: number;
  volumeSol: number;
  profitSol: number;
  trades: number;
  lastTradeTime: number;
}

/**
 * Hook to calculate top traders from real-time trade stream
 * 
 * Aggregates buy/sell activity and calculates P&L for each trader.
 * 
 * @example
 * ```tsx
 * const { topTraders, status } = useTopTradersFromStream({ 
 *   tokenMint: 'ABC123...',
 *   limit: 10
 * });
 * ```
 */
export function useTopTradersFromStream({
  tokenMint,
  limit = 10,
  enabled = true,
}: {
  tokenMint: string;
  limit?: number;
  enabled?: boolean;
}): {
  topTraders: TopTrader[];
  status: TradeStreamStatus;
  error: Error | null;
} {
  const { trades, status, error } = usePumpPortalTrades({
    tokenMint,
    maxTrades: 100, // Track more trades for better trader analysis
    enabled,
  });

  const topTraders = useMemo(() => {
    // Aggregate trader stats from trades
    const traderMap = new Map<string, TopTrader>();

    trades.forEach(trade => {
      const address = trade.signer;
      if (!address) return;

      const existing = traderMap.get(address) || {
        address,
        totalBuys: 0,
        totalSells: 0,
        volumeSol: 0,
        profitSol: 0,
        trades: 0,
        lastTradeTime: 0,
      };

      const solAmount = trade.amountSol || 0;

      if (trade.side === 'buy') {
        existing.totalBuys += solAmount;
        // Buying costs SOL (negative P&L)
        existing.profitSol -= solAmount;
      } else {
        existing.totalSells += solAmount;
        // Selling earns SOL (positive P&L)
        existing.profitSol += solAmount;
      }

      existing.volumeSol += solAmount;
      existing.trades += 1;
      existing.lastTradeTime = Math.max(existing.lastTradeTime, trade.ts);

      traderMap.set(address, existing);
    });

    // Sort by profit (highest first) and limit results
    return Array.from(traderMap.values())
      .sort((a, b) => b.profitSol - a.profitSol)
      .slice(0, limit);
  }, [trades, limit]);

  return {
    topTraders,
    status,
    error,
  };
}

/**
 * Holder information with balance tracking
 */
export interface HolderInfo {
  address: string;
  balance: number;
  percentage: number;
  isActive: boolean; // Recently traded
  lastActivity?: number;
}

/**
 * Hook to track holder changes from trade stream
 * 
 * Note: This provides estimates based on recent trades.
 * For accurate holder data, combine with backend API.
 * 
 * @example
 * ```tsx
 * const { activeHolders, status } = useActiveHoldersFromStream({ 
 *   tokenMint: 'ABC123...'
 * });
 * ```
 */
export function useActiveHoldersFromStream({
  tokenMint,
  enabled = true,
}: {
  tokenMint: string;
  enabled?: boolean;
}): {
  activeHolders: HolderInfo[];
  totalActiveHolders: number;
  status: TradeStreamStatus;
  error: Error | null;
} {
  const { trades, status, error } = usePumpPortalTrades({
    tokenMint,
    maxTrades: 100,
    enabled,
  });

  const { activeHolders, totalActiveHolders } = useMemo(() => {
    // Track holders who have traded recently
    const holderMap = new Map<string, HolderInfo>();

    trades.forEach(trade => {
      const address = trade.signer;
      if (!address) return;

      const existing = holderMap.get(address) || {
        address,
        balance: 0,
        percentage: 0,
        isActive: true,
        lastActivity: 0,
      };

      // Estimate balance changes from trades
      // Note: This is approximate - real balance requires on-chain query
      if (trade.side === 'buy') {
        existing.balance += trade.amountToken || 0;
      } else {
        existing.balance -= trade.amountToken || 0;
      }

      existing.lastActivity = Math.max(existing.lastActivity || 0, trade.ts);
      
      holderMap.set(address, existing);
    });

    // Filter out holders with zero/negative balance
    const activeHolders = Array.from(holderMap.values())
      .filter(h => h.balance > 0)
      .sort((a, b) => b.balance - a.balance);

    // Calculate percentages (rough estimate)
    const totalSupply = activeHolders.reduce((sum, h) => sum + h.balance, 0);
    activeHolders.forEach(holder => {
      holder.percentage = totalSupply > 0 ? (holder.balance / totalSupply) * 100 : 0;
    });

    return {
      activeHolders,
      totalActiveHolders: holderMap.size,
    };
  }, [trades]);

  return {
    activeHolders,
    totalActiveHolders,
    status,
    error,
  };
}
