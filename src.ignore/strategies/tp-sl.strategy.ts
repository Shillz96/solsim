import { BaseStrategy, StrategyConfig } from './base.strategy';
import { TokenPosition } from '../models/position.model';
import { TradingSignal } from '../calculators/trading-signal.calculator';
import { TradingRule } from '../models/trading-rule.model';
import tradingRuleModel from '../models/trading-rule.model';
import tradingSignalCalculator from '../calculators/trading-signal.calculator';
import tradingConfig from '../config/trading.config';
import logger from '../utils/logger';

/**
 * Take Profit / Stop Loss Strategy
 */
export class TpSlStrategy extends BaseStrategy {
  private rules: Map<string, TradingRule> = new Map();

  constructor(config: StrategyConfig) {
    super(config);
    this.loadRules();
  }

  /**
   * Load trading rules from database
   */
  private loadRules(): void {
    const dbRules = tradingRuleModel.getAll('TP_SL');
    this.rules.clear();

    for (const rule of dbRules) {
      this.rules.set(rule.tokenMint, rule);
      logger.debug(
        `[TpSlStrategy] Loaded rule for ${rule.tokenSymbol}: TP ${rule.takeProfit}%, SL ${rule.stopLoss}%`
      );
    }

    logger.info(`[TpSlStrategy] Loaded ${this.rules.size} TP/SL rules from database`);
  }

  /**
   * Reload rules from database (useful when rules are updated)
   */
  reloadRules(): void {
    this.loadRules();
  }

  /**
   * Get rule for a specific token
   */
  getRule(tokenMint: string): TradingRule | null {
    return this.rules.get(tokenMint) || null;
  }

  /**
   * Check if position should trigger a trade
   */
  shouldTrade(position: TokenPosition, currentPriceSol: number): TradingSignal | null {
    // Check if we have a specific rule for this token
    let rule = this.rules.get(position.tokenMint);

    // If no specific rule exists, use global defaults
    if (!rule) {
      rule = {
        tokenMint: position.tokenMint,
        tokenSymbol: position.tokenSymbol,
        strategy: 'TP_SL',
        takeProfit: tradingConfig.global.defaultTakeProfit,
        stopLoss: tradingConfig.global.defaultStopLoss,
        sellPercentage: tradingConfig.global.defaultSellPercentage,
        enabled: true,
      };
    }

    // Skip if rule is disabled
    if (!rule.enabled) {
      return null;
    }

    // Calculate signal using the calculator
    const signal = tradingSignalCalculator.calculateSignal(position, currentPriceSol, rule);

    // Return signal if action is needed
    if (signal.action === 'SELL') {
      return signal;
    }

    return null;
  }

  /**
   * Add or update a TP/SL rule
   */
  addRule(rule: TradingRule): void {
    tradingRuleModel.upsert(rule);
    this.rules.set(rule.tokenMint, rule);
    logger.info(`[TpSlStrategy] Added/updated rule for ${rule.tokenSymbol || rule.tokenMint}`);
  }

  /**
   * Remove a TP/SL rule
   */
  removeRule(tokenMint: string): void {
    tradingRuleModel.disable(tokenMint, 'TP_SL');
    this.rules.delete(tokenMint);
    logger.info(`[TpSlStrategy] Removed rule for ${tokenMint}`);
  }

  /**
   * Get all active rules
   */
  getAllRules(): TradingRule[] {
    return Array.from(this.rules.values());
  }
}
