import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import path from 'path';
import { config } from './config/environment.js';
import { corsMiddleware } from './middleware/cors.js';
import { errorHandler } from './middleware/errorHandler.js';
import { setupSecurityMiddleware } from './middleware/security.js';
import { logger, logRequest } from './utils/logger.js';
import v1Routes from './routes/v1/index.js';
import solanaTrackerRoutes from './routes/solana-tracker.js';
import { ServiceFactory } from './lib/serviceFactory.js';
import { initializeMarketRoutes } from './routes/v1/market.js';
import { initializePortfolioRoutes } from './routes/v1/portfolio.js';
import { initializeTradesRoutes } from './routes/v1/trades.js';
import { cacheService } from './services/cacheService.js';
import { dbPoolMonitor } from './services/dbPoolMonitor.js';
import { monitoringService } from './services/monitoringService.js';
import PriceStreamService from './price-stream.js';

/**
 * SolSim Backend Server
 * Main entry point for the Express REST API
 */

const app = express();
const httpServer = createServer(app);

// ============================================================================
// MIDDLEWARE CONFIGURATION
// ============================================================================

// Setup security middleware (helmet, compression, etc.)
setupSecurityMiddleware(app);

// Trust proxy for correct client IP detection (important for rate limiting)
// Railway uses multiple proxy layers, so we trust the proxy chain
app.set('trust proxy', true);

// Add monitoring middleware before other middleware
app.use(monitoringService.getHttpMetricsMiddleware());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS middleware (must be before routes)
app.use(corsMiddleware);

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  // Log after response is sent
  res.on('finish', () => {
    const duration = Date.now() - start;
    logRequest(req, duration, res.statusCode);
  });
  
  next();
});

// ============================================================================
// ROUTES
// ============================================================================

// Health check endpoint (versioned for consistency, also available at root for load balancers)
const healthCheckHandler = async (req: Request, res: Response) => {
  try {
    const healthStatus = await monitoringService.getHealthStatus();
    
    // Determine status code based on health and environment
    let statusCode = 200;
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (healthStatus.status === 'unhealthy') {
      statusCode = 503;
    } else if (healthStatus.status === 'degraded') {
      // In production, return 503 if Redis is down (critical for distributed systems)
      // In development, return 200 (degraded is acceptable)
      if (isProduction && healthStatus.checks?.redis?.status === 'unhealthy') {
        statusCode = 503;
        logger.warn('Health check degraded: Redis is down in production');
      } else {
        statusCode = 200;
      }
    }
    
    res.status(statusCode).json({
      success: true,
      status: healthStatus.status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      services: healthStatus.checks,
      metrics: healthStatus.metrics,
      // Add critical warnings for production
      warnings: isProduction && healthStatus.status === 'degraded' 
        ? ['Service is degraded - check Redis and database connections']
        : undefined
    });
  } catch (error) {
    logger.error('Health check error:', error);
    const isProduction = process.env.NODE_ENV === 'production';
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: {
        message: 'Health check failed',
        // Don't expose internal error details in production
        details: isProduction ? 'Service temporarily unavailable' : (error instanceof Error ? error.message : 'Unknown error')
      }
    });
  }
};

// Mount health check at versioned path (primary)
app.get('/api/v1/health', healthCheckHandler);
// Also available at root for load balancers (no auth required)
app.get('/health', healthCheckHandler);

// API version check
app.get('/api/v1/version', (req: Request, res: Response) => {
  res.json({
    version: '1.0.0',
    apiVersion: 'v1',
    environment: process.env.NODE_ENV || 'development',
  });
});

// Initialize services before mounting routes
const serviceFactory = ServiceFactory.getInstance();
const services = {
  priceService: serviceFactory.priceService,
  trendingService: serviceFactory.trendingService,
  portfolioService: serviceFactory.portfolioService,
  tradeService: serviceFactory.tradeService,
  metadataService: serviceFactory.metadataService
};

// Set services on app.locals for routes that need it
app.locals.services = services;

// Initialize route modules with services
initializeMarketRoutes({
  trendingService: services.trendingService,
  priceService: services.priceService,
  metadataService: services.metadataService
});

initializePortfolioRoutes({
  portfolioService: services.portfolioService,
  priceService: services.priceService
});

initializeTradesRoutes({
  tradeService: services.tradeService,
  priceService: services.priceService,
  portfolioService: services.portfolioService,
  metadataService: services.metadataService
});

// Mount v1 API routes
app.use('/api/v1', v1Routes);

// Mount Solana Tracker routes under v1 for consistency
app.use('/api/v1/solana-tracker', solanaTrackerRoutes);

// Serve static avatar files
const uploadsPath = path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsPath, {
  maxAge: '1d', // Cache for 1 day
  etag: true,
  lastModified: true
}));

// 404 handler for unmatched routes
app.use((req: Request, res: Response) => {
  logger.warn(`Route not found: ${req.method} ${req.path}`);
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    path: req.path,
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// Global error handler (must be last)
app.use(errorHandler);

// ============================================================================
// SERVER STARTUP
// ============================================================================

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received, starting graceful shutdown...`);
  
  // Close HTTP server
  httpServer.close(() => {
    logger.info('HTTP server closed');
  });
  
  // Stop monitoring services
  monitoringService.stopCollection();
  dbPoolMonitor.stopMonitoring();
  
  // Close cache connections
  try {
    await cacheService.disconnect();
    logger.info('Cache service disconnected');
  } catch (error) {
    logger.error('Error closing cache connections:', error);
  }
  
  // Close database connections
  try {
    const { disconnectPrisma } = await import('./lib/prisma.js');
    await disconnectPrisma();
    logger.info('Database connections closed');
  } catch (error) {
    logger.error('Error closing database connections:', error);
  }
  
  // Give pending requests time to complete
  setTimeout(() => {
    logger.info('Forcing shutdown after timeout');
    process.exit(0);
  }, 10000); // 10 second timeout
};

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit in production, just log
  if (process.env.NODE_ENV === 'development') {
    process.exit(1);
  }
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // Exit on uncaught exceptions (this is a critical error)
  gracefulShutdown('UNCAUGHT_EXCEPTION');
  setTimeout(() => process.exit(1), 1000);
});

// Start server
const startServer = async () => {
  try {
    // Add a delay in production to ensure database is ready
    if (process.env.NODE_ENV === 'production') {
      logger.info('Waiting for database to be ready...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    // Initialize Redis cache service
    logger.info('Initializing cache service...');
    await cacheService.connect();
    
    // Test database connection with retry logic
    const { checkDatabaseConnection } = await import('./lib/prisma.js');
    await checkDatabaseConnection();
    logger.info('Database connection established');
    
    // Start database pool monitoring
    if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DB_MONITORING === 'true') {
      logger.info('Starting database pool monitoring...');
      dbPoolMonitor.startMonitoring();
    }
    
    // Start metrics collection
    logger.info('Starting monitoring service...');
    monitoringService.startCollection();
    
    // Initialize and start price streaming service on the same server
    logger.info('Starting price streaming service...');
    const priceService = ServiceFactory.getInstance().priceService;
    const priceStreamService = new PriceStreamService(priceService);
    // Use the same HTTP server instead of a separate port for Railway compatibility
    await priceStreamService.attachToServer(httpServer);
    
    // Start HTTP server
    httpServer.listen(config.port, () => {
      logger.info('='.repeat(60));
      logger.info(`🚀 SolSim Backend Server Started`);
      logger.info('='.repeat(60));
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`REST API: http://localhost:${config.port}`);
      logger.info(`Health Check: http://localhost:${config.port}/health`);
      logger.info(`API Version: http://localhost:${config.port}/api/version`);
      logger.info(`Frontend Origin: ${config.frontendOrigin}`);
      logger.info('='.repeat(60));
      
      // Development-only helpful messages
      if (process.env.NODE_ENV === 'development') {
        logger.info('📝 Development Mode Tips:');
        logger.info('  - View logs in console');
        logger.info(`  - API docs: http://localhost:${config.port}/api/v1`);
        logger.info('  - Press Ctrl+C for graceful shutdown');
        logger.info('='.repeat(60));
      }
    });
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

// Export for testing
export { app, httpServer };
