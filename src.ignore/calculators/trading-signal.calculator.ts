import { TokenPosition } from '../models/position.model';
import { TradingRule } from '../models/trading-rule.model';
import logger from '../utils/logger';

export interface TradingSignal {
  action: 'SELL' | 'HOLD';
  trigger: 'TAKE_PROFIT' | 'STOP_LOSS' | null;
  tokenMint: string;
  tokenSymbol: string | null;
  currentPnLPercent: number;
  currentPnLSol: number;
  amountToSell: number;
  reason: string;
}

class TradingSignalCalculator {
  /**
   * Calculate trading signal based on position PnL and rules
   */
  calculateSignal(
    position: TokenPosition,
    currentPriceSol: number,
    rule: TradingRule
  ): TradingSignal {
    // Calculate current PnL
    const currentValueSol = position.totalAmount * currentPriceSol;
    const pnlSol = currentValueSol - position.totalInvestedSol;
    const pnlPercent = position.totalInvestedSol > 0
      ? (pnlSol / position.totalInvestedSol) * 100
      : 0;

    // Calculate amount to sell based on rule
    const amountToSell = position.totalAmount * (rule.sellPercentage / 100);

    // Check Take Profit
    if (pnlPercent >= rule.takeProfit) {
      return {
        action: 'SELL',
        trigger: 'TAKE_PROFIT',
        tokenMint: position.tokenMint,
        tokenSymbol: position.tokenSymbol,
        currentPnLPercent: pnlPercent,
        currentPnLSol: pnlSol,
        amountToSell,
        reason: `Take Profit triggered at +${pnlPercent.toFixed(2)}% (target: +${rule.takeProfit}%)`,
      };
    }

    // Check Stop Loss
    if (pnlPercent <= rule.stopLoss) {
      return {
        action: 'SELL',
        trigger: 'STOP_LOSS',
        tokenMint: position.tokenMint,
        tokenSymbol: position.tokenSymbol,
        currentPnLPercent: pnlPercent,
        currentPnLSol: pnlSol,
        amountToSell,
        reason: `Stop Loss triggered at ${pnlPercent.toFixed(2)}% (target: ${rule.stopLoss}%)`,
      };
    }

    // No action needed
    return {
      action: 'HOLD',
      trigger: null,
      tokenMint: position.tokenMint,
      tokenSymbol: position.tokenSymbol,
      currentPnLPercent: pnlPercent,
      currentPnLSol: pnlSol,
      amountToSell: 0,
      reason: `Holding - PnL at ${pnlPercent.toFixed(2)}%`,
    };
  }

  /**
   * Validate if a signal should be executed
   */
  shouldExecute(signal: TradingSignal, minTradeValueSol: number): boolean {
    if (signal.action === 'HOLD') {
      return false;
    }

    // Don't execute if amount is too small
    if (signal.amountToSell <= 0) {
      logger.warning(`[Signal] Cannot execute - amount to sell is 0`);
      return false;
    }

    // Additional validation could be added here
    // - Check if market is liquid enough
    // - Check if slippage is acceptable
    // etc.

    return true;
  }
}

export default new TradingSignalCalculator();
