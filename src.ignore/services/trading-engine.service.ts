import tradingConfig from '../config/trading.config';
import positionModel from '../models/position.model';
import tradeHistoryModel from '../models/trade-history.model';
import jupiterService from './jupiter.service';
import balanceService from './balance.service';
import config from '../config/env';
import { TpSlStrategy } from '../strategies/tp-sl.strategy';
import logger from '../utils/logger';
import chalk from 'chalk';

export interface TradingEngineConfig {
  dryRun?: boolean;
  checkInterval?: number;
  onTradeExecuted?: () => Promise<void>;
}

class TradingEngineService {
  private running: boolean = false;
  private strategy: TpSlStrategy | null = null;
  private lastTradeTimestamps: number[] = [];
  private onTradeExecutedCallback?: () => Promise<void>;

  /**
   * Start the trading engine
   */
  async start(config?: TradingEngineConfig): Promise<void> {
    const finalConfig = {
      dryRun: config?.dryRun ?? tradingConfig.global.dryRun,
      checkInterval: config?.checkInterval ?? tradingConfig.global.checkInterval,
    };

    if (!tradingConfig.global.enabled) {
      logger.warning('Trading is disabled in config');
      return;
    }

    this.running = true;
    this.onTradeExecutedCallback = config?.onTradeExecuted;

    // Initialize strategy
    this.strategy = new TpSlStrategy({
      dryRun: finalConfig.dryRun,
      maxSlippage: tradingConfig.global.maxSlippage,
    });

    console.log('\n' + chalk.bold.magenta('━'.repeat(70)));
    console.log(chalk.bold.magenta('🤖  AUTO-TRADING ENGINE'));
    console.log(chalk.bold.magenta('━'.repeat(70)));
    console.log(chalk.white('Mode:           ') + (finalConfig.dryRun ? chalk.bgYellow.black.bold(' DRY RUN ') : chalk.bgRed.white.bold(' LIVE ')));
    console.log(chalk.white('Check Interval: ') + chalk.cyan(`${finalConfig.checkInterval / 1000}s`));
    console.log(chalk.white('Max Slippage:   ') + chalk.cyan(`${tradingConfig.global.maxSlippage}%`));
    console.log(chalk.bold.magenta('━'.repeat(70)) + '\n');

    // Display active rules
    const rules = this.strategy.getAllRules();
    if (rules.length > 0) {
      console.log(chalk.bold.cyan('📋 Token-Specific Rules:\n'));
      for (const rule of rules) {
        console.log(
          chalk.yellow(`   ${rule.tokenSymbol || rule.tokenMint.slice(0, 8)}: `) +
          chalk.green(`TP +${rule.takeProfit}%`) + chalk.gray(' | ') +
          chalk.red(`SL ${rule.stopLoss}%`) + chalk.gray(' | ') +
          chalk.white(`Sell ${rule.sellPercentage}%`)
        );
      }
      console.log('');
    }

    // Always show global defaults
    console.log(chalk.bold.cyan('🌍 Global Defaults (for all other tokens):\n'));
    console.log(
      chalk.white('   ') +
      chalk.green(`TP +${tradingConfig.global.defaultTakeProfit}%`) + chalk.gray(' | ') +
      chalk.red(`SL ${tradingConfig.global.defaultStopLoss}%`) + chalk.gray(' | ') +
      chalk.white(`Sell ${tradingConfig.global.defaultSellPercentage}%`)
    );
    console.log('');

    // Main loop
    while (this.running) {
      try {
        await this.checkPositions();

        // Show summary after check
        await this.showSummary();

        // Separator and wait message
        console.log('');
        console.log(chalk.gray('─'.repeat(70)));
        console.log(chalk.cyan(`⏰ Next check in ${finalConfig.checkInterval / 1000}s...`) + chalk.gray(' (Press Ctrl+C to stop)'));
        console.log(chalk.gray('─'.repeat(70)) + '\n');

        // Wait for next check
        await new Promise(resolve => setTimeout(resolve, finalConfig.checkInterval));
      } catch (error: any) {
        console.log(chalk.red(`Error in trading loop: ${error.message}`));
        await new Promise(resolve => setTimeout(resolve, finalConfig.checkInterval));
      }
    }

    logger.info('🛑 Trading engine stopped');
  }

  /**
   * Stop the trading engine
   */
  stop(): void {
    this.running = false;
  }

  /**
   * Check all positions for trading signals
   */
  private async checkPositions(): Promise<void> {
    if (!this.strategy) {
      logger.error('Strategy not initialized');
      return;
    }

    // Get all active positions
    const positions = positionModel.getAll();
    const SOL_MINT = 'So11111111111111111111111111111111111111112';
    const MIN_AMOUNT = 0.0001; // Ignore dust positions (< 0.0001 SOL value)
    const tradingPositions = positions.filter(p =>
      p.tokenMint !== SOL_MINT &&
      p.totalAmount > MIN_AMOUNT
    );

    if (tradingPositions.length === 0) {
      console.log(chalk.gray(`[${logger.timestamp()}]`) + chalk.white(' No positions to check'));
      return;
    }

    console.log(chalk.gray(`[${logger.timestamp()}]`) + chalk.white(` Checking ${tradingPositions.length} position${tradingPositions.length > 1 ? 's' : ''}...`));

    for (const position of tradingPositions) {
      try {
        await this.checkPosition(position);
      } catch (error: any) {
        logger.error(`Error checking position ${position.tokenSymbol}: ${error.message}`);
      }

      // Small delay between checks to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  /**
   * Check a single position for trading signals
   */
  private async checkPosition(position: any): Promise<void> {
    if (!this.strategy) return;

    // Skip positions with zero or invalid cost basis (not yet synced)
    if (!position.totalInvestedSol || position.totalInvestedSol <= 0) {
      console.log(chalk.gray(`[${logger.timestamp()}]`) + chalk.yellow(` Skipping ${position.tokenSymbol} - invalid cost basis (not synced yet)`));
      return;
    }

    // Get current price in SOL using Jupiter (more accurate than DexScreener)
    let currentPriceSol = await jupiterService.getPriceSolFromJupiter(position.tokenMint, true);

    // Fallback to DexScreener if Jupiter fails
    if (!currentPriceSol) {
      currentPriceSol = await jupiterService.getPriceSolFromDexScreener(position.tokenMint, true);
    }

    if (!currentPriceSol) {
      console.log(chalk.gray(`[${logger.timestamp()}]`) + chalk.yellow(` Could not get price for ${position.tokenSymbol}`));
      return;
    }

    // Calculate current PnL for display (safe division)
    const currentValueSol = position.totalAmount * currentPriceSol;
    const unrealizedPnLSol = currentValueSol - position.totalInvestedSol;
    const unrealizedPnLPercent = position.totalInvestedSol > 0
      ? ((currentValueSol - position.totalInvestedSol) / position.totalInvestedSol) * 100
      : 0;

    // Get rule for this token
    const rule = this.strategy.getRule(position.tokenMint);
    const tp = rule ? rule.takeProfit : tradingConfig.global.defaultTakeProfit;
    const sl = rule ? rule.stopLoss : tradingConfig.global.defaultStopLoss;

    const pnlColor = unrealizedPnLPercent >= 0 ? 'green' : 'red';
    const statusText = unrealizedPnLPercent <= sl + 0.5 && unrealizedPnLPercent > sl
      ? chalk.yellow('⚠ Approaching SL')
      : '';

    const pnlSign = unrealizedPnLPercent >= 0 ? '+' : '';
    console.log(
      chalk.gray(`[${logger.timestamp()}]`) + chalk.white(` ${position.tokenSymbol}: `) +
      chalk[pnlColor](`${pnlSign}${unrealizedPnLPercent.toFixed(2)}%`) +
      chalk.gray(` (${pnlSign}${unrealizedPnLSol.toFixed(6)} SOL)`) +
      chalk.gray(` | TP: ${tp}%, SL: ${sl}%`) +
      (statusText ? ' ' + statusText : '')
    );

    // Check if should trade
    const signal = this.strategy.shouldTrade(position, currentPriceSol);

    if (!signal) {
      return; // No action needed
    }

    // Check rate limits
    if (!this.checkRateLimit()) {
      console.log(chalk.yellow('⚠️  Rate limit exceeded - skipping trade'));
      return;
    }

    // Execute trade
    const success = await this.strategy.execute(signal);

    if (success) {
      // Record trade timestamp for rate limiting
      this.lastTradeTimestamps.push(Date.now());

      // Clean up old timestamps (older than 1 hour)
      const oneHourAgo = Date.now() - 3600000;
      this.lastTradeTimestamps = this.lastTradeTimestamps.filter(t => t > oneHourAgo);

      // Trigger immediate sync after trade
      if (this.onTradeExecutedCallback) {
        console.log(chalk.cyan('\n⚡ Triggering immediate sync after trade...\n'));
        await this.onTradeExecutedCallback();
      }
    }
  }

  /**
   * Check if we're within rate limits
   */
  private checkRateLimit(): boolean {
    const oneHourAgo = Date.now() - 3600000;
    const recentTrades = this.lastTradeTimestamps.filter(t => t > oneHourAgo);

    return recentTrades.length < tradingConfig.global.maxTradesPerHour;
  }

  /**
   * Show summary after each check cycle
   */
  private async showSummary(): Promise<void> {
    // Get wallet balance
    const solBalance = await balanceService.getSOLBalance(config.WALLET_ADDRESS);

    // Get total PnL
    const pnlStats = tradeHistoryModel.getTotalPnL();

    // Only show if we have trades or non-zero balance
    if (pnlStats.totalTrades === 0 && solBalance === 0) {
      return;
    }

    console.log('');
    console.log(chalk.bold.cyan('📊 SUMMARY'));
    console.log(chalk.gray('─'.repeat(70)));

    // Wallet Balance
    console.log(chalk.white('Wallet Balance: ') + chalk.cyan(`${solBalance.toFixed(6)} SOL`));

    // Total PnL (only if we have trades)
    if (pnlStats.totalTrades > 0) {
      const pnlColor = pnlStats.totalPnlSol >= 0 ? 'green' : 'red';
      const pnlSign = pnlStats.totalPnlSol >= 0 ? '+' : '';
      console.log(
        chalk.white('Total PnL:      ') +
        chalk[pnlColor](`${pnlSign}${pnlStats.totalPnlSol.toFixed(6)} SOL`) +
        chalk.gray(` (${pnlStats.wins}W/${pnlStats.losses}L)`)
      );
    }
  }

  /**
   * Get trading statistics
   */
  getStats(): {
    running: boolean;
    activeRules: number;
    tradesLastHour: number;
    totalTrades: number;
  } {
    const oneHourAgo = new Date(Date.now() - 3600000);
    const tradesLastHour = tradeHistoryModel.getCount(oneHourAgo);
    const totalTrades = tradeHistoryModel.getCount();

    return {
      running: this.running,
      activeRules: this.strategy?.getAllRules().length || 0,
      tradesLastHour,
      totalTrades,
    };
  }
}

export default new TradingEngineService();
