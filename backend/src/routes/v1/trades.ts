import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { TradeService } from '../../services/tradeService.js';
import { PriceService } from '../../services/priceService.js';
import { PortfolioService } from '../../services/portfolioService.js';
import { authMiddleware, getUserId } from '../../lib/unifiedAuth.js';
import { serializeDecimals } from '../../utils/decimal.js';
import { tradeLimiter } from '../../middleware/rateLimiter.js';
import { validateTradeAmount, validatePagination, preventNoSQLInjection } from '../../middleware/validation.js';
import { logger } from '../../utils/logger.js';
import prisma from '../../lib/prisma.js';
import type { Server as SocketIOServer } from 'socket.io';

const router = Router();

// Service instances - injected via SimpleServiceFactory
let tradeService: TradeService;
let priceService: PriceService;
let portfolioService: PortfolioService;

// Initialize services
export function initializeTradesRoutes(services: {
  tradeService: TradeService;
  priceService: PriceService;
  portfolioService: PortfolioService;
}) {
  tradeService = services.tradeService;
  priceService = services.priceService;
  portfolioService = services.portfolioService;
}

// Apply authentication and security middleware
router.use(authMiddleware);
router.use(preventNoSQLInjection);

/**
 * Helper function to emit WebSocket events safely
 */
const emitTradeEvent = (
  io: SocketIOServer | undefined,
  userId: string,
  tokenAddress: string,
  action: string,
  data: any
): void => {
  if (!io) return;

  try {
    // Emit to user's room
    io.to(`user:${userId}`).emit('message', {
      type: 'trade_executed',
      userId,
      timestamp: Date.now(),
      data,
    });

    // Emit to token-specific room
    io.to(`token:${tokenAddress}`).emit('message', {
      type: 'trade_update',
      tokenAddress,
      action,
      timestamp: Date.now(),
    });
  } catch (error) {
    logger.error('WebSocket emit error:', error);
    // Don't throw - WebSocket failures shouldn't break trades
  }
};

/**
 * GET /api/v1/trades/history
 * Get paginated trade history for authenticated user
 */
router.get('/history', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = getUserId(req);
    const { tokenAddress, limit: limitQuery, offset: offsetQuery } = req.query;

    // Validate pagination parameters
    const { limit, offset, errors } = validatePagination(limitQuery, offsetQuery);
    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        error: errors[0],
      });
      return;
    }

    const trades = await tradeService.getTradeHistory(
      userId,
      tokenAddress as string | undefined,
      limit,
      offset
    );

    res.json({
      success: true,
      data: {
        trades: trades.map((trade) => serializeDecimals(trade)),
        pagination: {
          limit,
          offset,
          hasMore: trades.length === limit,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/trades/stats
 * Get trade statistics for authenticated user
 */
router.get('/stats', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = getUserId(req);
    
    // Get trade stats manually since getTradeStats doesn't exist
    const trades = await prisma.trade.findMany({
      where: { userId }
    });
    
    const totalTrades = trades.length;
    const buyTrades = trades.filter(t => t.action === 'BUY').length;
    const sellTrades = trades.filter(t => t.action === 'SELL').length;
    const totalRealizedPnL = trades.reduce((sum, t) => sum + parseFloat(t.realizedPnL?.toString() || '0'), 0);
    
    const stats = {
      totalTrades,
      buyTrades,
      sellTrades,
      totalRealizedPnL
    };

    res.json({
      success: true,
      data: { stats },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/trades/execute
 * Execute a trade with comprehensive validation and rate limiting
 */
router.post('/execute', tradeLimiter, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = getUserId(req);
    const { action, tokenAddress, amountSol } = req.body;

    // Validate required fields
    if (!action || !tokenAddress || amountSol === undefined) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: action, tokenAddress, amountSol',
      });
      return;
    }

    // Validate action
    if (!['buy', 'sell'].includes(action)) {
      res.status(400).json({
        success: false,
        error: 'Invalid action. Must be "buy" or "sell"',
      });
      return;
    }

    // Validate amount
    const amountValidation = validateTradeAmount(amountSol);
    if (!amountValidation.isValid) {
      res.status(400).json({
        success: false,
        error: amountValidation.error,
      });
      return;
    }

    // Validate token address format (Solana address)
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(tokenAddress)) {
      res.status(400).json({
        success: false,
        error: 'Invalid token address format',
      });
      return;
    }

    // Get token metadata with timeout
    let tokenData;
    try {
      tokenData = await Promise.race([
        priceService.getPrice(tokenAddress),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Token info timeout')), 5000)
        ),
      ]);
    } catch (error) {
      logger.warn(`Token info fetch failed for ${tokenAddress}:`, error);
      // Continue with trade using fallback data
      tokenData = {
        address: tokenAddress,
        price: 0,
        timestamp: Date.now(),
        source: 'fallback' as const
      };
    }

    // Execute trade
    let result;
    if (action === 'buy') {
      result = await tradeService.executeBuy(
        userId,
        { tokenAddress, amountSol }
      );
    } else {
      result = await tradeService.executeSell(
        userId,
        { tokenAddress, amountSol }
      );
    }

    // Emit WebSocket notification
    const io = req.app.get('io') as SocketIOServer | undefined;
    emitTradeEvent(io, userId, tokenAddress, action, {
      balance: {
        newBalance: parseFloat(result.updatedBalance),
      },
      trade: result.trade,
      holding: result.updatedHolding,
      newBalance: parseFloat(result.updatedBalance),
      realizedPnL: result.realizedPnL ? parseFloat(result.realizedPnL) : undefined,
    });

    logger.info(`Trade executed: ${userId} ${action} ${amountSol} SOL of ${tokenAddress}`);

    res.json({
      success: true,
      data: { result },
    });
  } catch (error) {
    // Enhanced error logging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    logger.error('Trade execution failed:', {
      error: errorMessage,
      stack: errorStack,
      userId: (req as any).user?.id || 'unknown',
      request: {
        action: req.body.action,
        tokenAddress: req.body.tokenAddress,
        amountSol: req.body.amountSol,
      },
      timestamp: new Date().toISOString(),
    });

    next(error);
  }
});

/**
 * GET /api/v1/trades/history/:userId
 * Get trade history for specific user (admin endpoint)
 * TODO: Add proper admin authorization
 */
router.get('/history/:userId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = req.params;
    const { tokenAddress, limit: limitQuery, offset: offsetQuery } = req.query;

    // TODO: Implement admin authorization check
    // For now, users can only view their own history
    const requestingUserId = getUserId(req);
    if (requestingUserId !== userId) {
      res.status(403).json({
        success: false,
        error: 'Unauthorized to view this user\'s trade history',
      });
      return;
    }

    // Validate pagination
    const { limit, offset, errors } = validatePagination(limitQuery, offsetQuery);
    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        error: errors[0],
      });
      return;
    }

    const trades = await tradeService.getTradeHistory(
      userId,
      tokenAddress as string | undefined,
      limit,
      offset
    );

    res.json({
      success: true,
      data: {
        trades: trades.map((trade) => serializeDecimals(trade)),
        pagination: {
          limit,
          offset,
          hasMore: trades.length === limit,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/trades/buy
 * Legacy buy endpoint for backward compatibility
 * @deprecated Use /trades/execute instead
 */
router.post('/buy', tradeLimiter, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = getUserId(req);
    const { tokenAddress, amountSol } = req.body;

    if (!tokenAddress || amountSol === undefined) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: tokenAddress, amountSol',
      });
      return;
    }

    // Validate amount
    const amountValidation = validateTradeAmount(amountSol);
    if (!amountValidation.isValid) {
      res.status(400).json({
        success: false,
        error: amountValidation.error,
      });
      return;
    }

    // Get token metadata
    const tokenData = await priceService.getPrice(tokenAddress);

    // Execute buy trade
    const result = await tradeService.executeBuy(
      userId,
      { tokenAddress, amountSol }
    );

    res.json({
      success: true,
      data: { result },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/trades/sell
 * Legacy sell endpoint for backward compatibility
 * @deprecated Use /trades/execute instead
 */
router.post('/sell', tradeLimiter, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = getUserId(req);
    const { tokenAddress, amountSol } = req.body;

    if (!tokenAddress || amountSol === undefined) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: tokenAddress, amountSol',
      });
      return;
    }

    // Validate amount
    const amountValidation = validateTradeAmount(amountSol);
    if (!amountValidation.isValid) {
      res.status(400).json({
        success: false,
        error: amountValidation.error,
      });
      return;
    }

    // Get token metadata
    const tokenData = await priceService.getPrice(tokenAddress);

    // Execute sell trade
    const result = await tradeService.executeSell(
      userId,
      { tokenAddress, amountSol }
    );

    res.json({
      success: true,
      data: { result },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/trades/recent
 * Get recent trades across all users (public endpoint)
 */
router.get('/recent', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { limit: limitQuery } = req.query;

    // Validate pagination
    const { limit, errors } = validatePagination(limitQuery, 0);
    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        error: errors[0],
      });
      return;
    }

    const trades = await prisma.trade.findMany({
      take: Math.min(limit, 50), // Max 50 for public endpoint
      orderBy: { timestamp: 'desc' },
      select: {
        id: true,
        userId: true,
        tokenAddress: true,
        action: true,
        quantity: true,
        price: true,
        totalCost: true,
        timestamp: true,
        // Don't expose sensitive user data
      },
    });

    res.json({
      success: true,
      data: {
        trades: trades.map((trade) => serializeDecimals(trade)),
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
