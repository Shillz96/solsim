import { Router, Request, Response } from 'express';
import { PortfolioService } from '../../services/portfolioService.js';
import { PriceService } from '../../services/priceService.js';
import { authMiddleware, getUserId } from '../../lib/unifiedAuth.js';
import { apiLimiter, tradeLimiter } from '../../middleware/rateLimiter.js';
import { handleRouteError, ValidationError, NotFoundError, AuthorizationError, validateQueryParams } from '../../utils/errorHandler.js';
import { LIMITS, ERROR_MESSAGES } from '../../config/constants.js';
import { logger } from '../../utils/logger.js';
import prisma from '../../lib/prisma.js';

const router = Router();

// Service instance - will be injected via SimpleServiceFactory
let portfolioService: PortfolioService;
let priceService: PriceService;

// Initialize services with SimpleServiceFactory
export function initializePortfolioRoutes(services: {
  portfolioService: PortfolioService;
  priceService: PriceService;
}) {
  portfolioService = services.portfolioService;
  priceService = services.priceService;
}

// Helper function to get portfolio with proper price conversion
async function getPortfolioWithPrices(userId: string): Promise<any> {
  const holdings = await portfolioService.getHoldings(userId);
  const tokenAddresses = holdings.map(h => h.tokenAddress);
  
  const pricesMap = await priceService.getPrices(tokenAddresses);
  const solPrice = await priceService.getSolPrice();
  
  // Convert TokenPrice map to number map
  const currentPrices = new Map<string, number>();
  pricesMap.forEach((tokenPrice, address) => {
    currentPrices.set(address, tokenPrice.price);
  });
  
  return portfolioService.getPortfolio(userId, currentPrices, solPrice);
}

// Apply authentication middleware to all portfolio routes
router.use(authMiddleware);

/**
 * Admin authorization middleware
 * TODO: Implement proper role-based access control
 */
const requireAdmin = async (req: Request, res: Response, next: any): Promise<void> => {
  try {
    const userId = getUserId(req);
    
    // TODO: Check user role in database
    // For now, we'll disable admin endpoints entirely
    throw new AuthorizationError('Admin endpoints are currently disabled');
    
    // Future implementation:
    // const user = await prisma.user.findUnique({
    //   where: { id: userId },
    //   select: { role: true }
    // });
    // 
    // if (!user || user.role !== 'ADMIN') {
    //   throw new AuthorizationError('Admin access required');
    // }
    // 
    // next();
  } catch (error) {
    handleRouteError(error, res, 'Admin authorization check');
  }
};

/**
 * GET /api/v1/portfolio
 * Get portfolio data for authenticated user
 * 
 * Rate Limit: 100 requests per minute
 * Auth: Required
 */
router.get('/', apiLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    const portfolio = await getPortfolioWithPrices(userId);

    res.json({
      success: true,
      data: { portfolio },
      meta: {
        userId,
        timestamp: Date.now()
      }
    });
  } catch (error) {
    handleRouteError(error, res, 'Getting user portfolio');
  }
});

/**
 * GET /api/v1/portfolio/balance
 * Get SOL balance for authenticated user
 * 
 * Rate Limit: 100 requests per minute
 * Auth: Required
 */
router.get('/balance', apiLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    const balance = await portfolioService.getBalance(userId);

    res.json({
      success: true,
      data: {
        balance,
        currency: 'SOL',
        timestamp: Date.now()
      }
    });
  } catch (error) {
    handleRouteError(error, res, 'Getting user balance');
  }
});

/**
 * GET /api/v1/portfolio/holdings
 * Get detailed holdings for authenticated user
 * 
 * Query Params:
 * - includeZero: Include holdings with zero quantity (default: false)
 * - sortBy: Sort by field (value|quantity|symbol, default: value)
 * - sortOrder: Sort order (asc|desc, default: desc)
 * 
 * Rate Limit: 100 requests per minute
 * Auth: Required
 */
router.get('/holdings', apiLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    
    const { includeZero, sortBy, sortOrder } = validateQueryParams(req.query, {
      includeZero: { type: 'boolean', default: false },
      sortBy: { type: 'string', default: 'value' },
      sortOrder: { type: 'string', default: 'desc' }
    });

    // Validate sort parameters
    const validSortFields = ['value', 'quantity', 'symbol', 'pnl'];
    const validSortOrders = ['asc', 'desc'];
    
    if (!validSortFields.includes(sortBy)) {
      throw new ValidationError(`sortBy must be one of: ${validSortFields.join(', ')}`);
    }
    
    if (!validSortOrders.includes(sortOrder)) {
      throw new ValidationError(`sortOrder must be one of: ${validSortOrders.join(', ')}`);
    }

    // Get user's holdings to determine which token prices we need
    const userHoldings = await portfolioService.getHoldings(userId);
    const tokenAddresses = userHoldings.map(h => h.tokenAddress);
    
    const portfolio = await getPortfolioWithPrices(userId);
    
    let holdings = portfolio.holdings || [];
    
    // Filter zero holdings if requested
    if (!includeZero) {
      holdings = holdings.filter(holding => 
        holding.quantity && parseFloat(holding.quantity.toString()) > 0
      );
    }

    // Sort holdings
    holdings.sort((a, b) => {
      let aValue: number, bValue: number;
      
      switch (sortBy) {
        case 'quantity':
          aValue = parseFloat(a.quantity?.toString() || '0');
          bValue = parseFloat(b.quantity?.toString() || '0');
          break;
        case 'symbol':
          return sortOrder === 'asc' 
            ? (a.tokenSymbol || '').localeCompare(b.tokenSymbol || '')
            : (b.tokenSymbol || '').localeCompare(a.tokenSymbol || '');
        case 'pnl':
          aValue = parseFloat(a.realizedPnL?.toString() || '0') + parseFloat(a.unrealizedPnL?.toString() || '0');
          bValue = parseFloat(b.realizedPnL?.toString() || '0') + parseFloat(b.unrealizedPnL?.toString() || '0');
          break;
        case 'value':
        default:
          aValue = parseFloat(a.currentValue?.toString() || '0');
          bValue = parseFloat(b.currentValue?.toString() || '0');
      }
      
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

    res.json({
      success: true,
      data: { 
        holdings,
        summary: {
          totalHoldings: holdings.length,
          totalValue: portfolio.totalValue,
          totalPnL: portfolio.totalPnL
        }
      },
      meta: {
        userId,
        sortBy,
        sortOrder,
        includeZero,
        timestamp: Date.now()
      }
    });
  } catch (error) {
    handleRouteError(error, res, 'Getting user holdings');
  }
});

/**
 * GET /api/v1/portfolio/performance
 * Get portfolio performance metrics
 * 
 * Query Params:
 * - period: Time period (1d|7d|30d|90d|1y|all, default: 30d)
 * 
 * Rate Limit: 100 requests per minute
 * Auth: Required
 */
router.get('/performance', apiLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    
    const { period } = validateQueryParams(req.query, {
      period: { type: 'string', default: '30d' }
    });

    const validPeriods = ['1d', '7d', '30d', '90d', '1y', 'all'];
    if (!validPeriods.includes(period)) {
      throw new ValidationError(`period must be one of: ${validPeriods.join(', ')}`);
    }

    // Calculate date range based on period
    let startDate: Date | undefined;
    const now = new Date();
    
    switch (period) {
      case '1d':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
        startDate = undefined; // No date filter
        break;
    }

    // Get trades for the period
    const trades = await prisma.trade.findMany({
      where: {
        userId,
        ...(startDate && { timestamp: { gte: startDate } })
      },
      orderBy: { timestamp: 'asc' },
      select: {
        id: true,
        action: true,
        quantity: true,
        price: true,
        totalCost: true,
        realizedPnL: true,
        timestamp: true,
        tokenSymbol: true
      }
    });

    // Calculate performance metrics
    const totalInvested = trades
      .filter(t => t.action === 'BUY')
      .reduce((sum, t) => sum + parseFloat(t.totalCost.toString()), 0);
    
    const totalReturns = trades
      .filter(t => t.action === 'SELL')
      .reduce((sum, t) => sum + parseFloat(t.totalCost.toString()), 0);
    
    const realizedPnL = trades
      .reduce((sum, t) => sum + parseFloat(t.realizedPnL?.toString() || '0'), 0);

    // Get user's holdings to determine which token prices we need
    const holdings = await portfolioService.getHoldings(userId);
    const tokenAddresses = holdings.map(h => h.tokenAddress);
    
    // Get current prices for all holdings
    const pricesMap = await priceService.getPrices(tokenAddresses);
    const solPrice = await priceService.getSolPrice();
    
    const portfolio = await getPortfolioWithPrices(userId);
    const currentValue = parseFloat(portfolio.totalValue?.toString() || '0');
    
    const totalReturn = realizedPnL + (currentValue - totalInvested);
    const totalReturnPercentage = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;

    res.json({
      success: true,
      data: {
        period,
        performance: {
          totalInvested,
          currentValue,
          totalReturn,
          totalReturnPercentage,
          realizedPnL,
          unrealizedPnL: currentValue - totalInvested,
          winRate: 0, // TODO: Calculate win rate
          totalTrades: trades.length,
          profitableTrades: trades.filter(t => parseFloat(t.realizedPnL?.toString() || '0') > 0).length
        },
        tradeHistory: trades
      },
      meta: {
        userId,
        period,
        startDate: startDate?.toISOString(),
        endDate: now.toISOString(),
        timestamp: Date.now()
      }
    });
  } catch (error) {
    handleRouteError(error, res, 'Getting portfolio performance');
  }
});

/**
 * GET /api/v1/portfolio/:userId
 * Get portfolio data for specific user (admin only)
 * 
 * Params:
 * - userId: Target user ID (required)
 * 
 * Rate Limit: 100 requests per minute
 * Auth: Required + Admin
 */
router.get('/:userId', apiLimiter, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = validateQueryParams(req.params, {
      userId: { type: 'string', required: true }
    });

    // Verify target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, email: true }
    });

    if (!targetUser) {
      throw new NotFoundError('Target user not found');
    }

    // Get user's holdings to determine which token prices we need
    const holdings = await portfolioService.getHoldings(userId);
    const tokenAddresses = holdings.map(h => h.tokenAddress);
    
    // Get current prices for all holdings
    const pricesMap = await priceService.getPrices(tokenAddresses);
    const solPrice = await priceService.getSolPrice();
    
    const portfolio = await getPortfolioWithPrices(userId);

    res.json({
      success: true,
      data: { 
        portfolio,
        user: targetUser
      },
      meta: {
        targetUserId: userId,
        requestedBy: getUserId(req),
        timestamp: Date.now()
      }
    });
  } catch (error) {
    handleRouteError(error, res, 'Getting user portfolio (admin)');
  }
});

/**
 * PUT /api/v1/portfolio/balance
 * Update SOL balance for authenticated user (ADMIN ONLY)
 * 
 * Body:
 * - balance: New balance amount (required, positive number, max 1M SOL)
 * - reason: Reason for balance change (required for audit)
 * 
 * Rate Limit: 30 requests per minute (trade limiter)
 * Auth: Required + Admin
 * 
 * WARNING: This endpoint allows arbitrary balance manipulation
 * Consider removing in production or adding strict authorization
 */
router.put('/balance', tradeLimiter, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    
    const { balance, reason } = validateQueryParams(req.body, {
      balance: { 
        type: 'number', 
        required: true, 
        min: 0, 
        max: LIMITS.BALANCE_MAX 
      },
      reason: { 
        type: 'string', 
        required: true, 
        min: 10, 
        max: 500 
      }
    });

    // Log balance change for audit
    logger.warn(`Admin balance change: User ${userId}, New Balance: ${balance}, Reason: ${reason}`);

    // Update balance directly in database since updateSolBalance method doesn't exist
    await prisma.user.update({
      where: { id: userId },
      data: { virtualSolBalance: balance }
    });

    // Record the change in database for audit trail
    // TODO: Create audit log table
    // await prisma.auditLog.create({
    //   data: {
    //     userId,
    //     action: 'BALANCE_UPDATE',
    //     details: { oldBalance: currentBalance, newBalance: balance, reason },
    //     performedBy: getUserId(req),
    //     timestamp: new Date()
    //   }
    // });

    res.json({
      success: true,
      message: 'Balance updated successfully',
      data: {
        newBalance: balance,
        reason,
        timestamp: Date.now()
      }
    });
  } catch (error) {
    handleRouteError(error, res, 'Updating user balance');
  }
});

/**
 * POST /api/v1/portfolio/reset
 * Reset portfolio to default state (ADMIN ONLY)
 * 
 * Body:
 * - confirmReset: Must be "RESET PORTFOLIO" (required)
 * - reason: Reason for reset (required)
 * 
 * Rate Limit: 5 requests per hour (auth limiter)
 * Auth: Required + Admin
 * 
 * WARNING: This will delete all trades and holdings for the user
 */
router.post('/reset', tradeLimiter, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    
    const { confirmReset, reason } = validateQueryParams(req.body, {
      confirmReset: { type: 'string', required: true },
      reason: { type: 'string', required: true, min: 10, max: 500 }
    });

    if (confirmReset !== 'RESET PORTFOLIO') {
      throw new ValidationError('Must confirm reset by typing "RESET PORTFOLIO"');
    }

    // Reset portfolio in transaction
    await prisma.$transaction(async (tx) => {
      // Delete all holdings
      await tx.holding.deleteMany({ where: { userId } });
      
      // Delete all trades
      await tx.trade.deleteMany({ where: { userId } });
      
      // Reset balance to default
      await tx.user.update({
        where: { id: userId },
        data: { 
          virtualSolBalance: LIMITS.BALANCE_DEFAULT,
          updatedAt: new Date()
        }
      });
    });

    logger.warn(`Portfolio reset: User ${userId}, Reason: ${reason}`);

    res.json({
      success: true,
      message: 'Portfolio reset successfully',
      data: {
        newBalance: LIMITS.BALANCE_DEFAULT,
        reason,
        timestamp: Date.now()
      }
    });
  } catch (error) {
    handleRouteError(error, res, 'Resetting portfolio');
  }
});

/**
 * Legacy endpoint redirects
 * For backward compatibility - redirect to new endpoints
 */

/**
 * GET /api/v1/portfolio/trade/portfolio
 * Legacy endpoint - redirects to /api/v1/portfolio
 * @deprecated Use /api/v1/portfolio instead
 */
router.get('/trade/portfolio', (req: Request, res: Response): void => {
  res.redirect(301, '/api/v1/portfolio');
});

export default router;