'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';

export type TradeMode = 'PAPER' | 'REAL';
export type FundingSource = 'DEPOSITED' | 'WALLET';

interface TradingModeContextType {
  // Current trading mode
  tradeMode: TradeMode;
  setTradeMode: (mode: TradeMode) => void;

  // Funding source for real trading
  fundingSource: FundingSource;
  setFundingSource: (source: FundingSource) => void;

  // Balances
  virtualSolBalance: number;
  realSolBalance: number;
  walletSolBalance: number | null;

  // Active balance based on current mode
  activeBalance: number;

  // Loading states
  isLoading: boolean;
  isSwitchingMode: boolean;

  // Actions
  switchToRealTrading: () => Promise<void>;
  switchToPaperTrading: () => Promise<void>;
  refreshBalances: () => Promise<void>;
}

const TradingModeContext = createContext<TradingModeContextType | undefined>(undefined);

export function TradingModeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const [tradeMode, setTradeModeState] = useState<TradeMode>('PAPER');
  const [fundingSource, setFundingSource] = useState<FundingSource>('DEPOSITED');
  const [virtualSolBalance, setVirtualSolBalance] = useState<number>(100);
  const [realSolBalance, setRealSolBalance] = useState<number>(0);
  const [walletSolBalance, setWalletSolBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSwitchingMode, setIsSwitchingMode] = useState<boolean>(false);

  // Calculate active balance based on mode and funding source
  const activeBalance = React.useMemo(() => {
    if (tradeMode === 'PAPER') {
      return virtualSolBalance;
    }
    if (fundingSource === 'DEPOSITED') {
      return realSolBalance;
    }
    return walletSolBalance ?? 0;
  }, [tradeMode, fundingSource, virtualSolBalance, realSolBalance, walletSolBalance]);

  // Fetch user balances from backend
  const refreshBalances = useCallback(async () => {
    if (!user?.id) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/user-profile/${user.id}/balances`);

      if (!response.ok) {
        throw new Error('Failed to fetch balances');
      }

      const data = await response.json();
      setVirtualSolBalance(data.virtualSolBalance ?? 100);
      setRealSolBalance(data.realSolBalance ?? 0);
      setTradeModeState(data.tradingMode ?? 'PAPER');
    } catch (error) {
      console.error('Error fetching balances:', error);
    }
  }, [user?.id]);

  // Load initial state
  useEffect(() => {
    const loadInitialState = async () => {
      setIsLoading(true);
      await refreshBalances();

      // Load saved preferences from localStorage
      const savedFundingSource = localStorage.getItem('tradingFundingSource') as FundingSource;
      if (savedFundingSource) {
        setFundingSource(savedFundingSource);
      }

      setIsLoading(false);
    };

    if (user?.id) {
      loadInitialState();
    }
  }, [user?.id, refreshBalances]);

  // Save funding source preference
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('tradingFundingSource', fundingSource);
    }
  }, [fundingSource, isLoading]);

  // Switch to real trading
  const switchToRealTrading = useCallback(async () => {
    if (!user?.id || tradeMode === 'REAL') return;

    setIsSwitchingMode(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/user-profile/${user.id}/trading-mode`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tradingMode: 'REAL' }),
      });

      if (!response.ok) {
        throw new Error('Failed to switch to real trading');
      }

      setTradeModeState('REAL');
      await refreshBalances();
    } catch (error) {
      console.error('Error switching to real trading:', error);
      throw error;
    } finally {
      setIsSwitchingMode(false);
    }
  }, [user?.id, tradeMode, refreshBalances]);

  // Switch to paper trading
  const switchToPaperTrading = useCallback(async () => {
    if (!user?.id || tradeMode === 'PAPER') return;

    setIsSwitchingMode(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/user-profile/${user.id}/trading-mode`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tradingMode: 'PAPER' }),
      });

      if (!response.ok) {
        throw new Error('Failed to switch to paper trading');
      }

      setTradeModeState('PAPER');
      await refreshBalances();
    } catch (error) {
      console.error('Error switching to paper trading:', error);
      throw error;
    } finally {
      setIsSwitchingMode(false);
    }
  }, [user?.id, tradeMode, refreshBalances]);

  const setTradeMode = useCallback((mode: TradeMode) => {
    if (mode === 'REAL') {
      switchToRealTrading();
    } else {
      switchToPaperTrading();
    }
  }, [switchToRealTrading, switchToPaperTrading]);

  const value: TradingModeContextType = {
    tradeMode,
    setTradeMode,
    fundingSource,
    setFundingSource,
    virtualSolBalance,
    realSolBalance,
    walletSolBalance,
    activeBalance,
    isLoading,
    isSwitchingMode,
    switchToRealTrading,
    switchToPaperTrading,
    refreshBalances,
  };

  return (
    <TradingModeContext.Provider value={value}>
      {children}
    </TradingModeContext.Provider>
  );
}

export function useTradingMode() {
  const context = useContext(TradingModeContext);
  if (context === undefined) {
    throw new Error('useTradingMode must be used within a TradingModeProvider');
  }
  return context;
}
