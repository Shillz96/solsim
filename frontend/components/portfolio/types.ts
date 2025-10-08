/**
 * Shared types for portfolio components
 */
import { Token } from '../trading/types';

/**
 * Portfolio position representing a held token
 */
export interface Position {
  id: string;
  token: Token;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  value: number;
  profitLoss: number;
  profitLossPercent: number;
  lastUpdated?: Date;
}

/**
 * Trade history record
 */
export interface TradeHistory {
  id: string;
  timestamp: Date;
  token: Token;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  totalValue: number;
  fee?: number;
}

/**
 * Portfolio summary data
 */
export interface PortfolioSummary {
  portfolioValue: number;
  portfolioChange24h?: number;
  totalPnL: number;
  pnlChangePercent?: number;
  activePositionsCount: number;
  totalTradesCount: number;
  positions: Position[];
  recentTrades: TradeHistory[];
  cashBalance: number;
  lastUpdated: Date;
}

/**
 * Props for the portfolio positions table
 */
export interface PortfolioPositionsProps {
  positions: Position[];
  isLoading?: boolean;
  onSelectPosition?: (position: Position) => void;
}

/**
 * Props for the trade history table
 */
export interface TradeHistoryProps {
  trades: TradeHistory[];
  isLoading?: boolean;
  limit?: number;
  showFilters?: boolean;
}