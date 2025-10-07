export interface TpSlRule {
  tokenMint?: string;
  tokenSymbol?: string;
  takeProfit: number;      // % gain to trigger sell (e.g., 20 = +20%)
  stopLoss: number;        // % loss to trigger sell (e.g., -10 = -10%)
  sellPercentage: number;  // % of position to sell (100 = sell all)
  enabled: boolean;
}

export interface GlobalTradingConfig {
  enabled: boolean;
  dryRun: boolean;              // Test mode - no real trades
  checkInterval: number;        // ms between checks
  maxSlippage: number;          // % max slippage for swaps
  maxTradesPerHour: number;     // Safety limit
  minTradeValueSol: number;     // Min trade size in SOL

  // Default TP/SL for all positions
  defaultTakeProfit: number;    // % gain to trigger sell
  defaultStopLoss: number;      // % loss to trigger sell (negative number)
  defaultSellPercentage: number; // % of position to sell
}

export interface TradingConfig {
  global: GlobalTradingConfig;
  tpslRules: Record<string, TpSlRule>; // Key = tokenMint or symbol
}

// Default Trading Configuration
export const tradingConfig: TradingConfig = {
  global: {
    enabled: true,
    dryRun: false,             // ⚠️ LIVE TRADING MODE - REAL SWAPS!
    checkInterval: 10000,      // Check every 10 seconds
    maxSlippage: 3.0,          // 3% max slippage (higher for small amounts)
    maxTradesPerHour: 20,      // Max 20 trades per hour
    minTradeValueSol: 0.0001,  // Minimum 0.0001 SOL trade value

    // 🎯 CHANGE THESE VALUES TO ADJUST TP/SL
    defaultTakeProfit: 15,      // Sell at +5% profit
    defaultStopLoss: -10,       // Sell at -3% loss
    defaultSellPercentage: 100, // Sell 100% of position
  },

  // TP/SL Rules per Token
  tpslRules: {
    // Example: PUMP token
    // 'pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn': {
    //   tokenSymbol: 'PUMP',
    //   takeProfit: 20,    // Sell at +20%
    //   stopLoss: -10,     // Sell at -10%
    //   sellPercentage: 100,
    //   enabled: true,
    // },

    // Add your rules here or use DB-based rules (later)
  },
};

export default tradingConfig;
