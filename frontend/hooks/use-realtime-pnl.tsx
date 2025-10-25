"use client"

/**
 * Real-time PnL Hook
 *
 * Subscribes to WebSocket PnL updates with optimistic UI updates
 * - Position-specific PnL (per token)
 * - Portfolio-wide PnL (all positions)
 * - Optimistic updates before server confirmation
 * - Automatic reconnection on disconnect
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './use-auth';

interface PositionPnL {
  mint: string;
  unrealizedPnL: number;
  totalPnL: number;
  qty: string;
  avgCost: string;
  currentPrice: number;
  timestamp: number;
}

interface PortfolioPnL {
  totalValue: number;
  totalCostBasis: number;
  realizedPnL: number;
  unrealizedPnL: number;
  totalPnL: number;
  timestamp: number;
}

interface OptimisticTrade {
  mint: string;
  side: 'BUY' | 'SELL';
  qty: number;
  price: number;
  timestamp: number;
}

export function useRealtimePnL(tradeMode: 'PAPER' | 'REAL' = 'PAPER') {
  const { user } = useAuth();
  const [positions, setPositions] = useState<Map<string, PositionPnL>>(new Map());
  const [portfolio, setPortfolio] = useState<PortfolioPnL | null>(null);
  const [connected, setConnected] = useState(false);
  const [optimisticTrades, setOptimisticTrades] = useState<OptimisticTrade[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  // Get WebSocket URL
  const getWsUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = process.env.NEXT_PUBLIC_WS_URL?.replace(/^https?:\/\//, '')
      || process.env.NEXT_PUBLIC_API_URL?.replace(/^https?:\/\//, '')
      || 'localhost:4000';

    return `${protocol}//${host}/ws/pnl?userId=${user?.id}&tradeMode=${tradeMode}`;
  }, [user?.id, tradeMode]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!user?.id || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const ws = new WebSocket(getWsUrl());

      ws.onopen = () => {
        console.log('[PnL] WebSocket connected');
        setConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === 'initial') {
            // Initial position state
            const initialPositions = new Map<string, PositionPnL>();
            message.positions.forEach((pos: any) => {
              initialPositions.set(pos.mint, {
                mint: pos.mint,
                unrealizedPnL: 0,
                totalPnL: parseFloat(pos.realizedPnL || '0'),
                qty: pos.qty,
                avgCost: pos.avgCost,
                currentPrice: 0,
                timestamp: Date.now()
              });
            });
            setPositions(initialPositions);

          } else if (message.type === 'pnlTick') {
            // Position-specific PnL update
            const data = message.data;
            setPositions(prev => {
              const updated = new Map(prev);
              updated.set(data.mint, data);
              return updated;
            });

          } else if (message.type === 'portfolioPnl') {
            // Portfolio-wide PnL update
            setPortfolio(message.data);

          } else if (message.type === 'pong') {
            // Keepalive response
          }
        } catch (err) {
          console.error('[PnL] Failed to parse message:', err);
        }
      };

      ws.onclose = () => {
        console.log('[PnL] WebSocket disconnected');
        setConnected(false);
        wsRef.current = null;

        // Exponential backoff reconnect
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        reconnectAttemptsRef.current++;

        reconnectTimeoutRef.current = setTimeout(() => {
          console.log(`[PnL] Reconnecting... (attempt ${reconnectAttemptsRef.current})`);
          connect();
        }, delay);
      };

      ws.onerror = (error) => {
        console.error('[PnL] WebSocket error:', error);
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('[PnL] Failed to connect:', err);
    }
  }, [user?.id, tradeMode, getWsUrl]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setConnected(false);
  }, []);

  // Add optimistic trade update
  const addOptimisticTrade = useCallback((
    mint: string,
    side: 'BUY' | 'SELL',
    qty: number,
    price: number
  ) => {
    const trade: OptimisticTrade = {
      mint,
      side,
      qty,
      price,
      timestamp: Date.now()
    };

    setOptimisticTrades(prev => [...prev, trade]);

    // Update position optimistically
    setPositions(prev => {
      const updated = new Map(prev);
      const current = updated.get(mint);

      if (side === 'BUY') {
        // Optimistically add to position
        const currentQty = current ? parseFloat(current.qty) : 0;
        const currentAvgCost = current ? parseFloat(current.avgCost) : 0;
        const newQty = currentQty + qty;
        const newAvgCost = newQty > 0
          ? (currentAvgCost * currentQty + price * qty) / newQty
          : 0;

        updated.set(mint, {
          ...current,
          mint,
          qty: newQty.toString(),
          avgCost: newAvgCost.toString(),
          currentPrice: price,
          unrealizedPnL: (price - newAvgCost) * newQty,
          totalPnL: (price - newAvgCost) * newQty,
          timestamp: Date.now()
        } as PositionPnL);

      } else if (current) {
        // Optimistically reduce position
        const currentQty = parseFloat(current.qty);
        const avgCost = parseFloat(current.avgCost);
        const newQty = Math.max(0, currentQty - qty);

        // Calculate realized PnL from this sell
        const realizedGain = (price - avgCost) * Math.min(qty, currentQty);

        updated.set(mint, {
          ...current,
          qty: newQty.toString(),
          unrealizedPnL: (price - avgCost) * newQty,
          totalPnL: current.totalPnL + realizedGain,
          timestamp: Date.now()
        });
      }

      return updated;
    });

    // Clear optimistic trade after server confirms (5 seconds timeout)
    setTimeout(() => {
      setOptimisticTrades(prev => prev.filter(t => t.timestamp !== trade.timestamp));
    }, 5000);
  }, []);

  // Clear all optimistic trades
  const clearOptimisticTrades = useCallback(() => {
    setOptimisticTrades([]);
  }, []);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    if (user?.id) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [user?.id, tradeMode, connect, disconnect]);

  // Ping keepalive every 25 seconds
  useEffect(() => {
    if (!connected || !wsRef.current) return;

    const interval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25000);

    return () => clearInterval(interval);
  }, [connected]);

  return {
    positions,
    portfolio,
    connected,
    optimisticTrades,
    addOptimisticTrade,
    clearOptimisticTrades,
    reconnect: connect
  };
}
