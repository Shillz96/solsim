import { Router, Request, Response } from 'express';
import { LRUCache } from 'lru-cache';
import { Decimal } from '@prisma/client/runtime/library';
import { TrendingService } from '../../services/trendingService.js';
import { PriceService } from '../../services/priceService.js';
import { MetadataService } from '../../services/metadataService.js';
import { apiLimiter } from '../../middleware/rateLimiter.js';
import { validateSolanaAddress } from '../../middleware/validation.js';
import { handleRouteError, ValidationError, NotFoundError, validateQueryParams } from '../../utils/errorHandler.js';
import { LIMITS, ERROR_MESSAGES, TIMEOUTS } from '../../config/constants.js';
import { logger } from '../../utils/logger.js';
import { serializeDecimals } from '../../utils/decimal.js';
import prisma from '../../lib/prisma.js';

const router = Router();

// Service instances - will be injected via SimpleServiceFactory
let trendingService: TrendingService;
let priceService: PriceService;
let metadataService: MetadataService;

// LRU Cache for token not found warnings (prevents memory leak)
const tokenWarningCache = new LRUCache<string, number>({
  max: LIMITS.WARNING_CACHE_SIZE,
  ttl: LIMITS.WARNING_CACHE_TTL
});

// Initialize services with SimpleServiceFactory
export function initializeMarketRoutes(services: {
  trendingService: TrendingService;
  priceService: PriceService;
  metadataService: MetadataService;
}) {
  trendingService = services.trendingService;
  priceService = services.priceService;
  metadataService = services.metadataService;
}

/**
 * GET /api/v1/market/trending
 * Get trending tokens with optional category filter
 * 
 * Query Params:
 * - limit: Number of tokens to return (1-100, default 20)
 * - category: Filter by category (gainers|losers|volume|new)
 * 
 * Rate Limit: 100 requests per minute
 */
router.get('/trending', apiLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit, category } = validateQueryParams(req.query, {
      limit: { type: 'number', default: LIMITS.TRENDING_DEFAULT, min: 1, max: LIMITS.TRENDING_MAX },
      category: { type: 'string', required: false }
    });

    // Validate category if provided
    const validCategories = ['gainers', 'losers', 'volume'];
    if (category && !validCategories.includes(category)) {
      throw new ValidationError(`Category must be one of: ${validCategories.join(', ')}`);
    }

    let tokens;
    if (category) {
      tokens = await trendingService.getTrendingByCategory(
        category as 'gainers' | 'losers' | 'volume',
        limit
      );
    } else {
      tokens = await trendingService.getTrending(limit);
    }

    res.json({
      success: true,
      data: { tokens },
      meta: {
        count: tokens.length,
        limit,
        category: category || 'all'
      }
    });
  } catch (error) {
    handleRouteError(error, res, 'Getting trending tokens');
  }
});

/**
 * GET /api/v1/market/search
 * Search for tokens by name or symbol
 * 
 * Query Params:
 * - q: Search query (required)
 * - limit: Number of results (1-50, default 10)
 * 
 * Rate Limit: 100 requests per minute
 */
router.get('/search', apiLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { q, limit } = validateQueryParams(req.query, {
      q: { type: 'string', required: true, min: 1, max: 100 },
      limit: { type: 'number', default: LIMITS.SEARCH_DEFAULT, min: 1, max: LIMITS.SEARCH_MAX }
    });

    // Case-insensitive search for PostgreSQL using mode: 'insensitive'
    let tokens = await prisma.token.findMany({
      where: {
        OR: [
          { symbol: { contains: q, mode: 'insensitive' } },
          { name: { contains: q, mode: 'insensitive' } },
          { address: { equals: q } } // Exact match for addresses
        ]
      },
      take: limit,
      orderBy: { volume24h: 'desc' },
      select: {
        address: true,
        symbol: true,
        name: true,
        imageUrl: true,
        lastPrice: true,
        priceChange24h: true,
        volume24h: true,
        marketCapUsd: true,
        liquidityUsd: true,
        isTrending: true
      }
    });

    // If no results and query looks like a Solana address (32-44 chars, base58)
    // Try to fetch it from external APIs and add to database
    if (tokens.length === 0 && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(q)) {
      logger.info(`[Search] No results for address ${q}, attempting to fetch and save...`);
      
      try {
        // Fetch token metadata
        const metadata = await metadataService.getMetadata(q);
        
        logger.info(`[Search] Metadata fetch result for ${q}:`, metadata ? `${metadata.symbol} - ${metadata.name}` : 'null');
        
        // Metadata is required, but price is optional (might not be available for new tokens)
        if (metadata && metadata.symbol && metadata.name) {
          // Try to fetch current price (optional)
          let priceData = null;
          try {
            priceData = await priceService.getTokenPrices(q);
            logger.info(`[Search] Price fetch result for ${q}:`, priceData ? `$${priceData.price}` : 'null');
          } catch (priceError) {
            logger.warn(`[Search] Price fetch failed for ${q}, continuing with metadata only:`, priceError);
          }
          
          logger.info(`[Search] Attempting to save token ${q} to database...`);
          
          // Save to database with available data
          const savedToken = await prisma.token.upsert({
            where: { address: q },
            update: {
              symbol: metadata.symbol,
              name: metadata.name,
              imageUrl: metadata.logoUri,
              lastPrice: priceData ? new Decimal(priceData.price) : new Decimal(0),
              priceChange24h: new Decimal(0), // Not available from getTokenPrices
              volume24h: new Decimal(0), // Not available from getTokenPrices
              marketCapUsd: priceData?.marketCap ? new Decimal(priceData.marketCap) : new Decimal(0),
              liquidityUsd: new Decimal(0), // Not available from getTokenPrices
              lastUpdatedAt: new Date(),
            },
            create: {
              address: q,
              symbol: metadata.symbol,
              name: metadata.name,
              imageUrl: metadata.logoUri,
              lastPrice: priceData ? new Decimal(priceData.price) : new Decimal(0),
              priceChange24h: new Decimal(0),
              volume24h: new Decimal(0),
              marketCapUsd: priceData?.marketCap ? new Decimal(priceData.marketCap) : new Decimal(0),
              liquidityUsd: new Decimal(0),
            },
            select: {
              address: true,
              symbol: true,
              name: true,
              imageUrl: true,
              lastPrice: true,
              priceChange24h: true,
              volume24h: true,
              marketCapUsd: true,
              liquidityUsd: true,
              isTrending: true
            }
          });

          logger.info(`[Search] ✅ Token ${q} fetched and saved: ${savedToken.symbol} - ${savedToken.name}${priceData ? ` (price: $${priceData.price})` : ' (no price data)'}`);
          tokens = [savedToken];
        } else {
          logger.warn(`[Search] Could not fetch valid metadata for ${q} - metadata: ${JSON.stringify(metadata)}`);
        }
      } catch (fetchError) {
        const errorMsg = fetchError instanceof Error ? fetchError.message : String(fetchError);
        const errorStack = fetchError instanceof Error ? fetchError.stack : undefined;
        logger.error(`[Search] Failed to fetch/save token ${q}: ${errorMsg}`, { stack: errorStack });
        // Continue with empty results
      }
    }

    // Transform tokens to match frontend expectations
    const transformedTokens = tokens.map(token => ({
      address: token.address,
      symbol: token.symbol,
      name: token.name,
      imageUrl: token.imageUrl,
      price: token.lastPrice?.toString() || null,
      priceChange24h: token.priceChange24h ? parseFloat(token.priceChange24h.toString()) : 0,
      marketCap: token.marketCapUsd ? parseFloat(token.marketCapUsd.toString()) : 0,
      trending: token.isTrending || false
    }));

    res.json({
      success: true,
      data: { tokens: transformedTokens },
      meta: {
        count: transformedTokens.length,
        query: q,
        limit
      }
    });
  } catch (error) {
    handleRouteError(error, res, 'Searching tokens');
  }
});

/**
 * GET /api/v1/market/test-pumpfun
 * Test pump.fun integration (development only)
 * 
 * Query Params:
 * - limit: Number of tokens (1-20, default 10)
 * 
 * Note: This endpoint is disabled in production
 */
router.get('/test-pumpfun', apiLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    // Disable in production
    if (process.env.NODE_ENV === 'production') {
      res.status(403).json({
        success: false,
        error: 'Test endpoints are disabled in production'
      });
      return;
    }

    const { limit } = validateQueryParams(req.query, {
      limit: { type: 'number', default: 10, min: 1, max: 20 }
    });

    logger.info('Testing pump.fun integration via API endpoint');
    const tokens = await trendingService.getTrending(limit);

    res.json({
      success: true,
      data: { tokens },
      meta: {
        source: 'pump.fun',
        count: tokens.length,
        environment: 'development'
      },
      info: {
        message: 'This is a test endpoint for pump.fun integration',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    handleRouteError(error, res, 'Testing pump.fun integration');
  }
});

/**
 * GET /api/v1/market/price/:address
 * Get current price for a specific token
 * 
 * Params:
 * - address: Solana token address (required, base58 format)
 * 
 * Rate Limit: 100 requests per minute
 */
router.get('/price/:address', apiLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { address } = req.params;

    // Validate Solana address format
    if (!validateSolanaAddress(address)) {
      throw new ValidationError(ERROR_MESSAGES.INVALID_ADDRESS);
    }

    const price = await priceService.getPrice(address);

    res.json({
      success: true,
      data: {
        address,
        price: price.price || price.toString(),
        ...price,
        timestamp: Date.now()
      }
    });
  } catch (error) {
    handleRouteError(error, res, 'Getting token price');
  }
});

/**
 * GET /api/v1/market/prices
 * Get prices for multiple tokens
 * 
 * Query Params:
 * - addresses: Comma-separated list of Solana addresses (1-20 addresses)
 * 
 * Rate Limit: 100 requests per minute
 */
router.get('/prices', apiLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { addresses } = validateQueryParams(req.query, {
      addresses: { type: 'string', required: true }
    });

    // Parse and validate addresses
    const addressList = addresses
      .split(',')
      .map((addr: string) => addr.trim())
      .filter(Boolean);

    if (addressList.length === 0) {
      throw new ValidationError('At least one address is required');
    }

    if (addressList.length > LIMITS.PRICES_MAX) {
      throw new ValidationError(`Maximum ${LIMITS.PRICES_MAX} addresses allowed`);
    }

    // Validate each address format
    const invalidAddresses = addressList.filter((addr: string) => !validateSolanaAddress(addr));
    if (invalidAddresses.length > 0) {
      throw new ValidationError(`Invalid address format: ${invalidAddresses[0]}`);
    }

    // Fetch prices in parallel
    const prices = await Promise.all(
      addressList.map(async (address: string) => {
        try {
          const priceData = await priceService.getPrice(address);
          return { 
            address, 
            price: priceData?.price?.toString() || '0', 
            success: true,
            timestamp: Date.now()
          };
        } catch (error) {
          logger.warn(`Failed to fetch price for ${address}:`, error);
          return { 
            address, 
            price: '0', 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: Date.now()
          };
        }
      })
    );

    res.json({
      success: true,
      data: { prices },
      meta: {
        total: prices.length,
        successful: prices.filter(p => p.success).length,
        failed: prices.filter(p => !p.success).length
      }
    });
  } catch (error) {
    handleRouteError(error, res, 'Getting token prices');
  }
});

/**
 * GET /api/v1/market/sol-price
 * Get current SOL price in USD
 * 
 * Rate Limit: 100 requests per minute
 */
router.get('/sol-price', apiLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const solPrice = await priceService.getSolPrice();

    res.json({
      success: true,
      data: {
        price: solPrice,
        currency: 'USD',
        source: 'api',
        timestamp: Date.now()
      }
    });
  } catch (error) {
    handleRouteError(error, res, 'Getting SOL price');
  }
});

/**
 * GET /api/v1/market/token/:address
 * Get comprehensive token information
 * 
 * Params:
 * - address: Solana token address (required)
 * 
 * Rate Limit: 100 requests per minute
 */
router.get('/token/:address', apiLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { address } = req.params;

    // Validate Solana address
    if (!validateSolanaAddress(address)) {
      throw new ValidationError(ERROR_MESSAGES.INVALID_ADDRESS);
    }

    // Get token info, price, and metadata with timeout protection
    let tokenData, tokenMetadata;
    try {
      const [priceResult, metadataResult] = await Promise.race([
        Promise.allSettled([
          priceService.getPrice(address),
          metadataService.getMetadata(address)
        ]),
        // 10 second timeout
        new Promise<[null, null]>((resolve) =>
          setTimeout(() => resolve([null, null]), TIMEOUTS.TOKEN_INFO)
        )
      ]);
      
      // Handle price result
      if (priceResult && priceResult.status === 'fulfilled') {
        tokenData = priceResult.value;
      }
      
      // Handle metadata result
      if (metadataResult && metadataResult.status === 'fulfilled') {
        tokenMetadata = metadataResult.value;
      }
    } catch (error) {
      logger.warn(`Failed to fetch token data for ${address}:`, error);
      tokenData = null;
      tokenMetadata = null;
    }

    // If we got token data, return it with metadata
    if (tokenData) {
      res.json({
        success: true,
        data: {
          tokenAddress: address,
          tokenSymbol: tokenMetadata?.symbol || address.substring(0, 6).toUpperCase(),
          tokenName: tokenMetadata?.name || `Token ${address.substring(0, 8)}`,
          imageUrl: tokenMetadata?.logoUri || null,
          price: typeof tokenData.price === 'number' ? tokenData.price : parseFloat(tokenData.price?.toString() || '0'),
          priceChange24h: tokenData.priceChange24h || 0,
          priceChangePercent24h: tokenData.priceChange24h || 0,
          volume24h: tokenData.volume24h || 0,
          marketCap: tokenData.marketCap || 0,
          liquidity: tokenData.liquidity || 0,
          lastUpdated: new Date().toISOString(),
          timestamp: Date.now()
        }
      });
      return;
    }

    // Fallback: Return basic token data for unknown tokens with metadata
    logger.info(`Token ${address} not found in price service, returning fallback data`);
    
    res.json({
      success: true,
      data: {
        tokenAddress: address,
        tokenSymbol: tokenMetadata?.symbol || address.substring(0, 6).toUpperCase(),
        tokenName: tokenMetadata?.name || `Token ${address.substring(0, 8)}`,
        imageUrl: tokenMetadata?.logoUri || null,
        source: 'fallback',
        price: 0,
        priceChange24h: 0,
        priceChangePercent24h: 0,
        volume24h: 0,
        marketCap: 0,
        liquidity: 0,
        lastUpdated: new Date().toISOString(),
        timestamp: Date.now()
      }
    });
  } catch (error) {
    handleRouteError(error, res, 'Getting token info');
  }
});

/**
 * GET /api/v1/market/tokens/:tokenId
 * Get comprehensive token information with fallback
 * (Alternative endpoint for frontend compatibility)
 * 
 * Params:
 * - tokenId: Solana token address (required)
 * 
 * Rate Limit: 100 requests per minute
 */
router.get('/tokens/:tokenId', apiLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { tokenId } = req.params;

    // Validate Solana address
    if (!validateSolanaAddress(tokenId)) {
      throw new ValidationError(ERROR_MESSAGES.INVALID_ADDRESS);
    }

    // Get token info and price with timeout protection
    const [tokenData] = await Promise.race([
      Promise.all([
        priceService.getPrice(tokenId)
      ]),
      // 10 second timeout - return fallback data
      new Promise<[null]>((resolve) =>
        setTimeout(() => resolve([null]), TIMEOUTS.TOKEN_INFO)
      )
    ]);

    // If we got token data from price service, use it
    if (tokenData) {
      res.json({
        success: true,
        data: {
          address: tokenId,
          currentPrice: tokenData.price.toString(),
          price: tokenData.price.toString(),
          marketCap: tokenData.marketCap || '0',
          volume24h: tokenData.volume24h || '0',
          change24h: tokenData.priceChange24h || 0,
          timestamp: Date.now()
        }
      });
      return;
    }

    // Fallback: Return basic token data even if external APIs timeout
    // Rate limit warnings to prevent log spam
    const now = Date.now();
    const lastWarning = tokenWarningCache.get(tokenId) || 0;
    if (now - lastWarning > LIMITS.WARNING_CACHE_TTL) {
      logger.warn(`Token ${tokenId} not found in DexScreener, returning fallback data`);
      tokenWarningCache.set(tokenId, now);
    }

    res.json({
      success: true,
      data: {
        address: tokenId,
        symbol: tokenId.substring(0, 6).toUpperCase(),
        name: `Token ${tokenId.substring(0, 8)}`,
        source: 'fallback',
        currentPrice: '0',
        price: '0',
        marketCap: 0,
        volume24h: 0,
        change24h: 0,
        logoUri: undefined,
        socials: undefined,
        timestamp: Date.now()
      }
    });
  } catch (error) {
    // Even on error, return fallback data to prevent frontend crashes
    const { tokenId } = req.params;
    logger.error('Error in tokens endpoint, returning fallback:', error);
    
    res.json({
      success: true,
      data: {
        address: tokenId,
        symbol: tokenId.substring(0, 6).toUpperCase(),
        name: `Token ${tokenId.substring(0, 8)}`,
        source: 'fallback-error',
        currentPrice: '0',
        price: '0',
        marketCap: 0,
        volume24h: 0,
        change24h: 0,
        timestamp: Date.now()
      }
    });
  }
});

/**
 * GET /api/v1/market/major-crypto-prices
 * Get major cryptocurrency prices (BTC, ETH, SOL)
 * 
 * Rate Limit: 100 requests per minute
 */
router.get('/major-crypto-prices', apiLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    // Get SOL price from our price service
    const solPrice = await priceService.getSolPrice();

    // Return major crypto prices (for now just SOL, can be expanded)
    const majorCryptoPrices = [
      {
        symbol: 'SOL',
        name: 'Solana',
        price: solPrice,
        change24h: 0, // TODO: Implement 24h change calculation
        timestamp: Date.now()
      }
    ];

    res.json({
      success: true,
      data: majorCryptoPrices
    });
  } catch (error) {
    handleRouteError(error, res, 'Getting major crypto prices');
  }
});

/**
 * GET /api/v1/market/stats
 * Get market statistics
 * 
 * Rate Limit: 100 requests per minute
 */
router.get('/stats', apiLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    // Get basic market stats from database
    const [totalTrades, totalVolume, solPrice] = await Promise.all([
      prisma.trade.count(),
      prisma.trade.aggregate({
        _sum: {
          totalCost: true
        }
      }),
      priceService.getSolPrice()
    ]);

    const totalVolumeUsd = (totalVolume._sum.totalCost?.toNumber() || 0) * solPrice;

    res.json({
      success: true,
      data: {
        totalTrades,
        totalVolume: totalVolume._sum.totalCost?.toString() || '0',
        totalVolumeUsd: totalVolumeUsd.toString(),
        solPrice: solPrice.toString(),
        timestamp: Date.now()
      }
    });
  } catch (error) {
    handleRouteError(error, res, 'Getting market stats');
  }
});

export default router;
