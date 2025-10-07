import transactionModel, { Transaction } from '../models/transaction.model';
import { TokenPosition } from '../models/position.model';
import jupiterService from '../services/jupiter.service';
import logger from '../utils/logger';

class CostBasisCalculator {
  async calculateSwapPriceSol(signature: string, tokenMint: string): Promise<number | null> {
    // Get all transactions with this signature
    const allTxs = transactionModel.getAll();
    const swapTxs = allTxs.filter(tx => tx.signature === signature);

    if (swapTxs.length < 2) {
      return null;
    }

    // Find the BUY and SELL pair
    const buy = swapTxs.find(tx => tx.type === 'BUY' && tx.tokenMint === tokenMint);
    const sell = swapTxs.find(tx => tx.type === 'SELL');

    if (!buy || !sell) {
      return null;
    }

    // Calculate swap price directly in SOL (no USD conversion needed)
    // If selling SOL for tokens:
    //   - sell.amount = SOL sold
    //   - buy.amount = tokens bought
    //   - pricePerToken = SOL sold / tokens bought

    // If selling tokens for SOL:
    //   - sell.amount = tokens sold
    //   - buy.amount = SOL received
    //   - pricePerToken = SOL received / tokens sold

    const isSellingSol = sell.tokenMint === 'So11111111111111111111111111111111111111112';

    if (isSellingSol) {
      // Selling SOL for tokens: use swap amount only (fee separate)
      const buyPricePerToken = sell.amount / buy.amount;
      return buyPricePerToken;
    } else {
      // Selling tokens for SOL: use swap amount only (fee separate)
      const sellPricePerToken = buy.amount / sell.amount;
      return sellPricePerToken;
    }
  }

  async calculateForToken(tokenMint: string): Promise<TokenPosition | null> {
    const transactions = transactionModel.getAllByToken(tokenMint);
    if (transactions.length === 0) return null;

    // FIFO approach: Track buy lots and reduce them as we sell
    interface BuyLot {
      amount: number;
      valueSol: number;
      pricePerToken: number;
    }

    const buyLots: BuyLot[] = [];
    let totalAmount = 0;

    for (const tx of transactions) {
      if (tx.type === 'BUY' || tx.type === 'TRANSFER_IN') {
        // Use stored SOL value if available, otherwise calculate from swap
        let valueSol = tx.valueSol || 0;

        if (!valueSol && tx.type === 'BUY') {
          // Try to calculate from swap pair
          const swapPrice = await this.calculateSwapPriceSol(tx.signature, tokenMint);
          if (swapPrice) {
            valueSol = tx.amount * swapPrice;
          }
        }

        // Jupiter-style: Don't include fees in cost basis (track only swap price)
        // Fees are separate transaction costs, not part of token value

        // Add new buy lot
        buyLots.push({
          amount: tx.amount,
          valueSol: valueSol, // Use swap value only (no fees)
          pricePerToken: tx.amount > 0 ? valueSol / tx.amount : 0
        });

        totalAmount += tx.amount;
      } else if (tx.type === 'SELL' || tx.type === 'TRANSFER_OUT') {
        // FIFO: Remove from oldest buy lots first
        let amountToSell = tx.amount;

        // Only reduce totalAmount if we have buy lots to cover the sell
        // This handles incomplete history (SELLs before our known BUYs)
        if (buyLots.length > 0) {
          const totalInLots = buyLots.reduce((sum, lot) => sum + lot.amount, 0);

          if (totalInLots >= amountToSell) {
            // Normal case: we have enough to cover the sell
            totalAmount -= tx.amount;
          } else {
            // Incomplete history: only reduce by what we have
            totalAmount -= totalInLots;
            amountToSell = totalInLots;
          }
        }
        // If no buy lots, this SELL is from incomplete history - ignore it

        while (amountToSell > 0 && buyLots.length > 0) {
          const oldestLot = buyLots[0];

          if (oldestLot.amount <= amountToSell) {
            // Completely use up this lot
            amountToSell -= oldestLot.amount;
            buyLots.shift(); // Remove first lot
          } else {
            // Partially use this lot
            const soldRatio = amountToSell / oldestLot.amount;
            oldestLot.amount -= amountToSell;
            oldestLot.valueSol -= oldestLot.valueSol * soldRatio;
            amountToSell = 0;
          }
        }
      }
    }

    // Calculate total invested from remaining buy lots
    const totalInvestedSol = buyLots.reduce((sum, lot) => sum + lot.valueSol, 0);

    if (totalAmount <= 0) {
      return {
        tokenMint,
        tokenSymbol: transactions[0]?.tokenSymbol || null,
        totalAmount: 0,
        avgCostBasis: 0,
        totalInvestedSol: 0,
      };
    }

    // With FIFO, totalInvested should always be >= 0 for positive positions
    // If it's still negative or 0, warn about incomplete history
    if (totalInvestedSol <= 0 && totalAmount > 0) {
      logger.warning(`Incomplete history for ${transactions[0]?.tokenSymbol || tokenMint.slice(0, 8)}: Missing buy data. Cost basis may be inaccurate.`);
    }

    const avgCostBasis = totalAmount > 0 && totalInvestedSol > 0 ? totalInvestedSol / totalAmount : 0;

    return {
      tokenMint,
      tokenSymbol: transactions[0]?.tokenSymbol || null,
      totalAmount,
      avgCostBasis,
      totalInvestedSol: Math.max(0, totalInvestedSol),
    };
  }

  async calculateForAllTokens(): Promise<TokenPosition[]> {
    const uniqueTokens = transactionModel.getUniqueTokens();
    const positions: TokenPosition[] = [];

    logger.info(`Calculating cost basis for ${uniqueTokens.length} tokens...`);

    for (const tokenMint of uniqueTokens) {
      const position = await this.calculateForToken(tokenMint);
      if (position) {
        // Include ALL positions (even with totalAmount = 0) to properly update DB
        positions.push(position);
      }
    }

    const activeCount = positions.filter(p => p.totalAmount > 0).length;
    logger.success(`Calculated cost basis for ${activeCount} active positions (${positions.length - activeCount} closed)`);
    return positions;
  }
}

export default new CostBasisCalculator();
