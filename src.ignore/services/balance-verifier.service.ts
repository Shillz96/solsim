import balanceService from './balance.service';
import positionModel from '../models/position.model';
import config from '../config/env';
import logger from '../utils/logger';
import chalk from 'chalk';

interface BalanceDiscrepancy {
  tokenMint: string;
  tokenSymbol: string | null;
  walletBalance: number;
  positionAmount: number;
  difference: number;
  percentDiff: number;
}

class BalanceVerifierService {
  /**
   * Verify wallet balances match position amounts
   */
  async verifyBalances(): Promise<{
    discrepancies: BalanceDiscrepancy[];
    allMatch: boolean;
  }> {
    const discrepancies: BalanceDiscrepancy[] = [];

    try {
      // Get all positions
      const positions = positionModel.getAll();

      // Get wallet balances
      const walletBalances = await balanceService.getAllBalances(config.WALLET_ADDRESS);
      const balances = new Map(walletBalances.map(b => [b.mint, b.uiAmount]));

      // Check each position against wallet balance
      for (const position of positions) {
        const walletBalance = balances.get(position.tokenMint) || 0;
        const positionAmount = position.totalAmount;

        // Allow small differences due to rounding (< 0.001%)
        const diff = Math.abs(walletBalance - positionAmount);
        const percentDiff = positionAmount > 0
          ? (diff / positionAmount) * 100
          : (walletBalance > 0 ? 100 : 0);

        if (percentDiff > 0.001) {
          discrepancies.push({
            tokenMint: position.tokenMint,
            tokenSymbol: position.tokenSymbol,
            walletBalance,
            positionAmount,
            difference: walletBalance - positionAmount,
            percentDiff,
          });
        }
      }

      // Also check for tokens in wallet but not in positions
      for (const [mint, balance] of balances.entries()) {
        if (balance > 0) {
          const hasPosition = positions.some(p => p.tokenMint === mint);
          if (!hasPosition) {
            discrepancies.push({
              tokenMint: mint,
              tokenSymbol: null,
              walletBalance: balance,
              positionAmount: 0,
              difference: balance,
              percentDiff: 100,
            });
          }
        }
      }

      return {
        discrepancies,
        allMatch: discrepancies.length === 0,
      };
    } catch (error: any) {
      logger.error(`Failed to verify balances: ${error.message}`);
      return {
        discrepancies: [],
        allMatch: false,
      };
    }
  }

  /**
   * Display balance discrepancies
   */
  async displayDiscrepancies(): Promise<void> {
    console.log(chalk.bold.cyan('\n🔍 Verifying wallet balances...\n'));

    const result = await this.verifyBalances();

    if (result.allMatch) {
      console.log(chalk.green('✅ All balances match!'));
      return;
    }

    console.log(chalk.yellow(`⚠️  Found ${result.discrepancies.length} discrepancy(ies):\n`));

    for (const disc of result.discrepancies) {
      const symbol = disc.tokenSymbol || disc.tokenMint.slice(0, 8);
      const diffColor = disc.difference >= 0 ? 'green' : 'red';

      console.log(chalk.white(`Token: ${symbol}`));
      console.log(chalk.gray(`  Wallet:   ${disc.walletBalance.toFixed(6)}`));
      console.log(chalk.gray(`  Position: ${disc.positionAmount.toFixed(6)}`));
      console.log(chalk[diffColor](`  Diff:     ${disc.difference >= 0 ? '+' : ''}${disc.difference.toFixed(6)} (${disc.percentDiff.toFixed(2)}%)`));
      console.log('');
    }

    console.log(chalk.yellow('💡 Run "npm run sync" to update positions from wallet\n'));
  }

  /**
   * Fix discrepancies by syncing
   */
  async fixDiscrepancies(): Promise<void> {
    const result = await this.verifyBalances();

    if (result.allMatch) {
      logger.success('All balances match - nothing to fix');
      return;
    }

    logger.warning(`Found ${result.discrepancies.length} discrepancies - please run "npm run sync" to update`);
  }
}

export default new BalanceVerifierService();
