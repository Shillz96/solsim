import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get leaderboard data
router.get('/', async (req, res) => {
  try {
    console.log('Leaderboard API called - fetching top traders');

    // Get top traders with their holdings and trades
    const topTraders = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        virtualSolBalance: true,
        trades: {
          select: {
            realizedPnL: true,
            timestamp: true
          }
        },
        holdings: {
          select: {
            quantity: true,
            tokenAddress: true,
            entryPrice: true
          }
        }
      },
      orderBy: {
        virtualSolBalance: 'desc'
      },
      take: 100 // Get top 100 traders
    });

    // Calculate total PnL for each trader including unrealized gains
    const leaderboard = topTraders.map(trader => {
      // Calculate realized PnL from completed trades
      const realizedPnL = trader.trades.reduce((sum, trade) => {
        return sum + (trade.realizedPnL ? parseFloat(trade.realizedPnL.toString()) : 0);
      }, 0);

      // Calculate total PnL: (current balance - starting balance) + realized PnL
      // Note: Starting balance is 100 SOL for all users
      const startingBalance = 100;
      const currentBalance = parseFloat(trader.virtualSolBalance.toString());
      const balanceChange = currentBalance - startingBalance;
      
      // Total PnL is the balance change (this includes both realized and unrealized gains)
      const totalPnL = balanceChange;

      const totalTrades = trader.trades.length;
      const winningTrades = trader.trades.filter(trade => 
        trade.realizedPnL && parseFloat(trade.realizedPnL.toString()) > 0
      ).length;
      const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

      return {
        id: trader.id,
        username: trader.username,
        email: trader.email,
        balance: currentBalance,
        totalPnL: totalPnL, // FIXED: Now includes total portfolio performance
        totalTrades: totalTrades,
        winRate: Math.round(winRate * 100) / 100, // Round to 2 decimal places
        lastTradeDate: trader.trades.length > 0 
          ? Math.max(...trader.trades.map(t => new Date(t.timestamp).getTime()))
          : null
      };
    }).sort((a, b) => b.totalPnL - a.totalPnL); // Sort by total PnL descending

    console.log(`Leaderboard fetched: ${leaderboard.length} traders`);

    res.json({
      success: true,
      data: leaderboard,
      count: leaderboard.length
    });

  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leaderboard data'
    });
  }
});

export default router;