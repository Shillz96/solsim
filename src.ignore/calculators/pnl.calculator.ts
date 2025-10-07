import positionModel, { TokenPosition } from '../models/position.model';
import jupiterService from '../services/jupiter.service';
import logger from '../utils/logger';

export interface TokenPnL {
  tokenMint: string;
  tokenSymbol: string | null;
  totalAmount: number;
  avgCostBasis: number; // Cost per token in SOL
  totalInvestedSol: number; // Total SOL invested
  currentPriceSol: number | null; // Current price in SOL
  currentValueSol: number; // Current value in SOL
  unrealizedPnL: number; // PnL in SOL
  unrealizedPnLPercent: number; // PnL percentage
}

class PnLCalculator {
  async calculateForToken(position: TokenPosition, currentPriceSol: number | null): Promise<TokenPnL> {
    const priceSol = currentPriceSol || 0;
    const currentValueSol = position.totalAmount * priceSol;
    const unrealizedPnL = currentValueSol - position.totalInvestedSol;
    const unrealizedPnLPercent = position.totalInvestedSol > 0
      ? (unrealizedPnL / position.totalInvestedSol) * 100
      : 0;

    return {
      tokenMint: position.tokenMint,
      tokenSymbol: position.tokenSymbol,
      totalAmount: position.totalAmount,
      avgCostBasis: position.avgCostBasis,
      totalInvestedSol: position.totalInvestedSol,
      currentPriceSol: priceSol,
      currentValueSol,
      unrealizedPnL,
      unrealizedPnLPercent,
    };
  }

  async calculatePortfolioPnL(forceRefresh: boolean = false): Promise<TokenPnL[]> {
    const positions = positionModel.getAll();
    if (positions.length === 0) {
      logger.warning('No active positions found');
      return [];
    }

    // Filter out dust/closed positions (< 0.001 tokens)
    const MIN_POSITION_SIZE = 0.001;
    const activePositions = positions.filter(p => p.totalAmount >= MIN_POSITION_SIZE);

    if (activePositions.length === 0) {
      logger.info('No active positions (all positions below dust threshold)');
      return [];
    }

    logger.info(`Calculating PnL for ${activePositions.length} positions...`);

    const pnlResults: TokenPnL[] = [];

    for (const position of activePositions) {
      // Get direct SOL price from DexScreener (no USD conversion)
      const tokenPriceSol = await jupiterService.getPriceSolFromDexScreener(position.tokenMint, forceRefresh);

      const pnl = await this.calculateForToken(position, tokenPriceSol);
      pnlResults.push(pnl);

      // Rate limit between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    logger.success(`Calculated PnL for ${pnlResults.length} positions`);
    return pnlResults;
  }

  calculateTotalPortfolioPnL(pnlResults: TokenPnL[]): {
    totalInvested: number;
    totalValue: number;
    totalPnL: number;
    totalPnLPercent: number;
  } {
    const totalInvested = pnlResults.reduce((sum, pnl) => sum + pnl.totalInvestedSol, 0);
    const totalValue = pnlResults.reduce((sum, pnl) => sum + pnl.currentValueSol, 0);
    const totalPnL = totalValue - totalInvested;
    const totalPnLPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

    return {
      totalInvested,
      totalValue,
      totalPnL,
      totalPnLPercent,
    };
  }
}

export default new PnLCalculator();
