import { TokenPosition } from '../models/position.model';
import positionModel from '../models/position.model';
import { TradingSignal } from '../calculators/trading-signal.calculator';
import swapService from '../services/swap.service';
import tradeHistoryModel from '../models/trade-history.model';
import logger from '../utils/logger';
import chalk from 'chalk';

export interface StrategyConfig {
  dryRun: boolean;
  maxSlippage: number;
}

/**
 * Abstract base class for all trading strategies
 */
export abstract class BaseStrategy {
  protected config: StrategyConfig;

  constructor(config: StrategyConfig) {
    this.config = config;
  }

  /**
   * Check if position should trigger a trade
   * @returns TradingSignal or null if no action needed
   */
  abstract shouldTrade(position: TokenPosition, currentPriceSol: number): TradingSignal | null;

  /**
   * Execute trade based on signal
   */
  async execute(signal: TradingSignal): Promise<boolean> {
    if (signal.action === 'HOLD') {
      return false;
    }

    // Determine colors and emoji based on trigger type
    const triggerColor = signal.trigger === 'TAKE_PROFIT' ? 'green' : 'red';
    const triggerEmoji = signal.trigger === 'TAKE_PROFIT' ? '📈' : '📉';
    const triggerText = signal.trigger === 'TAKE_PROFIT' ? 'TAKE PROFIT' : 'STOP LOSS';
    const pnlColor = signal.currentPnLPercent >= 0 ? 'green' : 'red';
    const pnlSign = signal.currentPnLPercent >= 0 ? '+' : '';

    console.log('\n' + chalk.bold.cyan('━'.repeat(70)));
    console.log(chalk.bold[triggerColor](`${triggerEmoji}  ${triggerText} TRIGGERED`));
    console.log(chalk.bold.cyan('━'.repeat(70)));
    console.log(chalk.white('Token:   ') + chalk.bold.yellow(signal.tokenSymbol || signal.tokenMint.slice(0, 8)));
    console.log(chalk.white('PnL:     ') + chalk.bold[pnlColor](`${pnlSign}${signal.currentPnLPercent.toFixed(2)}%`) + chalk.gray(` (${pnlSign}${signal.currentPnLSol.toFixed(6)} SOL)`));
    console.log(chalk.white('Amount:  ') + chalk.bold.magenta(signal.amountToSell.toFixed(4)) + chalk.gray(` ${signal.tokenSymbol || 'tokens'}`));
    console.log(chalk.white('Reason:  ') + chalk.gray(signal.reason));
    console.log(chalk.bold.cyan('━'.repeat(70)) + '\n');

    if (this.config.dryRun) {
      console.log(chalk.bgYellow.black.bold('  🧪 DRY RUN MODE ') + chalk.yellow(' - No actual trade executed\n'));

      // Log to trade history as dry run
      tradeHistoryModel.insert({
        tokenMint: signal.tokenMint,
        tokenSymbol: signal.tokenSymbol,
        strategy: 'TP_SL',
        triggerType: signal.trigger!,
        pnlPercent: signal.currentPnLPercent,
        pnlSol: signal.currentPnLSol,
        amountSold: signal.amountToSell,
        solReceived: 0, // Unknown in dry run
        signature: null,
        dryRun: true,
      });

      return true;
    }

    // Execute actual swap
    try {
      console.log(chalk.cyan('💱 Executing swap via Jupiter...\n'));

      const result = await swapService.sellForSol(
        signal.tokenMint,
        signal.amountToSell,
        this.config.maxSlippage
      );

      if (!result) {
        console.log(chalk.red('❌ Swap failed - no result returned\n'));
        return false;
      }

      console.log(chalk.bold.green('━'.repeat(70)));
      console.log(chalk.bold.green('✅  TRADE EXECUTED SUCCESSFULLY'));
      console.log(chalk.bold.green('━'.repeat(70)));
      console.log(chalk.white('Received: ') + chalk.bold.greenBright(`${result.solReceived.toFixed(6)} SOL`));
      console.log(chalk.white('TX:       ') + chalk.gray(result.signature.slice(0, 32) + '...'));
      console.log(chalk.bold.green('━'.repeat(70)) + '\n');

      // Log to trade history
      tradeHistoryModel.insert({
        tokenMint: signal.tokenMint,
        tokenSymbol: signal.tokenSymbol,
        strategy: 'TP_SL',
        triggerType: signal.trigger!,
        pnlPercent: signal.currentPnLPercent,
        pnlSol: signal.currentPnLSol,
        amountSold: signal.amountToSell,
        solReceived: result.solReceived,
        signature: result.signature,
        dryRun: false,
      });

      // Update position after sell
      const currentPosition = positionModel.getByToken(signal.tokenMint);
      if (currentPosition) {
        const newAmount = currentPosition.totalAmount - signal.amountToSell;

        if (newAmount <= 0.001) {
          // Position fully sold or dust remaining - set to 0
          positionModel.upsert({
            tokenMint: signal.tokenMint,
            tokenSymbol: signal.tokenSymbol,
            totalAmount: 0,
            avgCostBasis: 0,
            totalInvestedSol: 0,
          });
          console.log(chalk.bgBlue.white.bold('  📊 POSITION CLOSED ') + chalk.blue(` ${signal.tokenSymbol || signal.tokenMint}\n`));
        } else {
          // Partial sell - update remaining amount
          const newInvested = currentPosition.avgCostBasis * newAmount;
          positionModel.upsert({
            tokenMint: signal.tokenMint,
            tokenSymbol: signal.tokenSymbol,
            totalAmount: newAmount,
            avgCostBasis: currentPosition.avgCostBasis,
            totalInvestedSol: newInvested,
          });
          console.log(chalk.bgBlue.white.bold('  📊 POSITION UPDATED ') + chalk.blue(` ${signal.tokenSymbol}: ${newAmount.toFixed(4)} remaining\n`));
        }
      }

      return true;
    } catch (error: any) {
      console.log(chalk.bgRed.white.bold('  ❌ ERROR ') + chalk.red(` ${error.message}\n`));
      return false;
    }
  }
}
