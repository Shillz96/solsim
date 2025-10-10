import { type ReactNode } from 'react';

/**
 * Token object for trading components
 * Note: This interface is mapped from Backend.Token where:
 * - id maps to address
 * - logoUrl maps to imageUrl || logoURI
 * - priceChangePercent24h is derived from priceChange24h
 */
export interface Token {
  id: string; // Maps to Backend.Token.address
  name: string;
  symbol: string;
  logoUrl: string; // Maps to Backend.Token.imageUrl || logoURI
  priceChangePercent24h?: number; // Derived from Backend.Token.priceChange24h
}

/**
 * Trade type - either buy or sell
 */
export type TradeType = 'buy' | 'sell';

/**
 * Trade preview information
 */
export interface TradePreview {
  executionPrice: number;
  networkFee: number;
  totalCost: number;
  amountInTokens: number;
  amountInUsd: number;
  slippageBps?: number;      // Slippage tolerance in basis points (e.g., 100 = 1%)
  minReceived?: number;       // Minimum tokens to receive after slippage
  priceImpactPct?: number;    // Price impact percentage
}

/**
 * Trade confirmation details
 */
export interface TradeDetails extends TradePreview {
  token: Token;
  tradeType: TradeType;
  tokenAmount: number;
  totalValue: number;
  timestamp?: Date;
}

/**
 * Trading form component props
 */
export interface TradingFormProps {
  /** Selected token for trading */
  token: Token;
  /** Current price of the token in USD */
  currentPrice: number;
  /** Optional initial trade type (buy or sell) */
  initialTradeType?: TradeType;
  /** Handler for submitting the trade */
  onSubmitTrade: (tradeDetails: TradeDetails) => Promise<void>;
  /** Optional classes to apply to the form container */
  className?: string;
  /** Optional children to render in the form */
  children?: ReactNode;
}

/**
 * Trade confirmation dialog props
 */
export interface TradeConfirmationProps {
  /** Whether the confirmation dialog is open */
  open: boolean;
  /** Handler for changing the dialog open state */
  onOpenChange: (open: boolean) => void;
  /** Trade details to confirm */
  tradeDetails: TradeDetails;
  /** Whether the trade is currently being submitted */
  isSubmitting?: boolean;
  /** Handler for confirming the trade */
  onConfirm: () => Promise<void>;
  /** Handler for cancelling the trade */
  onCancel: () => void;
}

/**
 * Token select component props
 */
export interface TokenSelectProps {
  /** Array of available tokens */
  tokens: Token[];
  /** Optional initially selected token */
  selectedToken?: Token;
  /** Handler for selecting a token */
  onSelectToken: (token: Token | null) => void;
  /** Optional loading state */
  isLoading?: boolean;
  /** Optional error message */
  error?: string;
  /** Optional recent tokens to show */
  recentTokens?: Token[];
  /** Optional placeholder for search input */
  placeholder?: string;
}

/**
 * Portfolio metrics component props
 */
export interface PortfolioMetricsProps {
  /** Total portfolio value in USD */
  portfolioValue: number;
  /** 24h change in portfolio value (percentage) */
  portfolioChange24h?: number;
  /** Total profit/loss in USD */
  totalPnL?: number;
  /** Change in profit/loss (percentage) */
  pnlChangePercent?: number;
  /** Number of active positions */
  activePositionsCount: number;
  /** Total number of trades */
  totalTradesCount: number;
  /** Optional loading state */
  isLoading?: boolean;
}

/**
 * Trend indicator props
 */
export interface TrendIndicatorProps {
  /** Value to indicate trend direction and magnitude */
  value: number;
  /** Optional size of the indicator */
  size?: 'sm' | 'md' | 'lg';
  /** Optional label to display with the value */
  label?: string;
  /** Optional suffix for the value (%, pts, etc) */
  suffix?: string;
  /** Optional classes to apply */
  className?: string;
}

/**
 * Price and trend display props
 */
export interface PriceTrendDisplayProps {
  /** Current price value */
  price: number;
  /** Price change value (can be absolute or percentage) */
  priceChange?: number;
  /** Whether the price change is a percentage */
  isPercentage?: boolean;
  /** Optional volume for additional context */
  volume24h?: number;
  /** Optional time period label */
  timeframe?: string;
  /** Optional classes to apply */
  className?: string;
}