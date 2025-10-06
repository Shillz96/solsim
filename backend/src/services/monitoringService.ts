import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { cacheService } from './cacheService.js';
import { dbPoolMonitor } from './dbPoolMonitor.js';

/**
 * Production Monitoring Service
 * 
 * Comprehensive monitoring solution with:
 * - Prometheus metrics collection
 * - Custom business metrics
 * - Health check endpoints
 * - Performance monitoring
 * - Alert thresholds
 * - Dashboard integration ready
 */

// ============================================================================
// PROMETHEUS METRICS DEFINITIONS
// ============================================================================

// Enable default metrics (CPU, memory, etc.)
collectDefaultMetrics({
  prefix: 'solsim_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
});

// HTTP Metrics
export const httpRequestsTotal = new Counter({
  name: 'solsim_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

export const httpRequestDuration = new Histogram({
  name: 'solsim_http_request_duration_seconds',
  help: 'HTTP request latency',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
});

// Database Metrics
export const dbQueryDuration = new Histogram({
  name: 'solsim_db_query_duration_seconds',
  help: 'Database query execution time',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 5],
});

export const dbConnectionsActive = new Gauge({
  name: 'solsim_db_connections_active',
  help: 'Number of active database connections',
});

export const dbConnectionsIdle = new Gauge({
  name: 'solsim_db_connections_idle',
  help: 'Number of idle database connections',
});

// Cache Metrics
export const cacheOperationsTotal = new Counter({
  name: 'solsim_cache_operations_total',
  help: 'Total cache operations',
  labelNames: ['operation', 'result'],
});

export const cacheHitRate = new Gauge({
  name: 'solsim_cache_hit_rate',
  help: 'Cache hit rate percentage',
});

// WebSocket Metrics
export const wsConnectionsActive = new Gauge({
  name: 'solsim_websocket_connections_active',
  help: 'Number of active WebSocket connections',
});

export const wsMessagesTotal = new Counter({
  name: 'solsim_websocket_messages_total',
  help: 'Total WebSocket messages',
  labelNames: ['type', 'direction'],
});

export const wsSubscriptionsActive = new Gauge({
  name: 'solsim_websocket_subscriptions_active',
  help: 'Number of active WebSocket subscriptions',
});

// Business Metrics
export const tradesTotal = new Counter({
  name: 'solsim_trades_total',
  help: 'Total number of trades executed',
  labelNames: ['action', 'status'],
});

export const tradeVolume = new Counter({
  name: 'solsim_trade_volume_total',
  help: 'Total trading volume in SOL',
  labelNames: ['action'],
});

export const usersActive = new Gauge({
  name: 'solsim_users_active',
  help: 'Number of active users',
});

export const priceUpdatesTotal = new Counter({
  name: 'solsim_price_updates_total',
  help: 'Total price updates processed',
  labelNames: ['source', 'status'],
});

export const apiCallsExternal = new Counter({
  name: 'solsim_external_api_calls_total',
  help: 'External API calls made',
  labelNames: ['service', 'status'],
});

export const apiLatencyExternal = new Histogram({
  name: 'solsim_external_api_latency_seconds',
  help: 'External API call latency',
  labelNames: ['service'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
});

// Error Metrics
export const errorsTotal = new Counter({
  name: 'solsim_errors_total',
  help: 'Total application errors',
  labelNames: ['type', 'severity'],
});

// ============================================================================
// MONITORING SERVICE CLASS
// ============================================================================

export class MonitoringService {
  private static instance: MonitoringService;
  private metricsCollectionInterval?: NodeJS.Timeout;
  private isCollecting = false;

  // Alert thresholds
  private readonly ALERT_THRESHOLDS = {
    HIGH_MEMORY_USAGE: 512, // MB
    HIGH_CPU_USAGE: 80, // %
    HIGH_DB_CONNECTIONS: 18, // out of 20
    LOW_CACHE_HIT_RATE: 70, // %
    HIGH_ERROR_RATE: 5, // errors per minute
    HIGH_RESPONSE_TIME: 2000, // ms
  };

  private constructor() {}

  public static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  /**
   * Start metrics collection
   */
  public startCollection(): void {
    if (this.isCollecting) {
      logger.warn('Metrics collection already running');
      return;
    }

    this.isCollecting = true;
    
    // Collect custom metrics every 30 seconds
    this.metricsCollectionInterval = setInterval(async () => {
      await this.collectCustomMetrics();
    }, 30000);

    logger.info('Monitoring service started - metrics collection enabled');
  }

  /**
   * Stop metrics collection
   */
  public stopCollection(): void {
    if (!this.isCollecting) {
      return;
    }

    this.isCollecting = false;

    if (this.metricsCollectionInterval) {
      clearInterval(this.metricsCollectionInterval);
      this.metricsCollectionInterval = undefined;
    }

    logger.info('Monitoring service stopped');
  }

  /**
   * Collect custom business and infrastructure metrics
   */
  private async collectCustomMetrics(): Promise<void> {
    try {
      // Database metrics
      await this.collectDatabaseMetrics();
      
      // Cache metrics
      await this.collectCacheMetrics();
      
      // Check alert conditions
      await this.checkAlertConditions();

    } catch (error) {
      logger.error('Error collecting custom metrics:', error);
      errorsTotal.inc({ type: 'metrics_collection', severity: 'error' });
    }
  }

  /**
   * Collect database-related metrics
   */
  private async collectDatabaseMetrics(): Promise<void> {
    try {
      const poolStats = await dbPoolMonitor.getCurrentPoolStats();
      
      if (poolStats) {
        dbConnectionsActive.set(poolStats.active_connections);
        dbConnectionsIdle.set(poolStats.idle_connections);
      }
    } catch (error) {
      logger.debug('Error collecting database metrics:', error);
    }
  }

  /**
   * Collect cache-related metrics
   */
  private async collectCacheMetrics(): Promise<void> {
    try {
      const cacheStats = await cacheService.getStats();
      
      if (cacheStats) {
        cacheHitRate.set(cacheStats.hitRate);
      }
    } catch (error) {
      logger.debug('Error collecting cache metrics:', error);
    }
  }

  /**
   * Check alert conditions and log warnings
   */
  private async checkAlertConditions(): Promise<void> {
    try {
      // Check memory usage
      const memUsage = process.memoryUsage();
      const memUsageMB = memUsage.heapUsed / 1024 / 1024;
      
      if (memUsageMB > this.ALERT_THRESHOLDS.HIGH_MEMORY_USAGE) {
        logger.warn(`High memory usage detected: ${memUsageMB.toFixed(2)}MB`);
        errorsTotal.inc({ type: 'high_memory', severity: 'warning' });
      }

      // Check database connections
      const poolStats = await dbPoolMonitor.getCurrentPoolStats();
      if (poolStats && poolStats.active_connections > this.ALERT_THRESHOLDS.HIGH_DB_CONNECTIONS) {
        logger.warn(`High database connection usage: ${poolStats.active_connections}/20`);
        errorsTotal.inc({ type: 'high_db_connections', severity: 'warning' });
      }

      // Check cache hit rate
      const cacheStats = await cacheService.getStats();
      if (cacheStats && cacheStats.hitRate < this.ALERT_THRESHOLDS.LOW_CACHE_HIT_RATE) {
        logger.warn(`Low cache hit rate: ${cacheStats.hitRate.toFixed(2)}%`);
        errorsTotal.inc({ type: 'low_cache_hit_rate', severity: 'warning' });
      }

    } catch (error) {
      logger.debug('Error checking alert conditions:', error);
    }
  }

  /**
   * Express middleware for HTTP metrics
   */
  public getHttpMetricsMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();

      // Increment request counter
      const route = req.route?.path || req.path || 'unknown';
      
      res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        const statusCode = res.statusCode.toString();
        
        // Record metrics
        httpRequestsTotal.inc({
          method: req.method,
          route,
          status_code: statusCode,
        });

        httpRequestDuration.observe(
          {
            method: req.method,
            route,
            status_code: statusCode,
          },
          duration
        );

        // Check for slow requests
        if (duration * 1000 > this.ALERT_THRESHOLDS.HIGH_RESPONSE_TIME) {
          logger.warn(`Slow request detected: ${req.method} ${route} took ${duration * 1000}ms`);
        }
      });

      next();
    };
  }

  /**
   * Track database query performance
   */
  public trackDatabaseQuery<T>(
    operation: string,
    table: string,
    queryFn: () => Promise<T>
  ): Promise<T> {
    const start = Date.now();
    
    return queryFn()
      .then(result => {
        const duration = (Date.now() - start) / 1000;
        dbQueryDuration.observe({ operation, table }, duration);
        return result;
      })
      .catch(error => {
        const duration = (Date.now() - start) / 1000;
        dbQueryDuration.observe({ operation, table }, duration);
        errorsTotal.inc({ type: 'database_error', severity: 'error' });
        throw error;
      });
  }

  /**
   * Track external API calls
   */
  public trackExternalAPICall<T>(
    service: string,
    apiFn: () => Promise<T>
  ): Promise<T> {
    const start = Date.now();
    
    return apiFn()
      .then(result => {
        const duration = (Date.now() - start) / 1000;
        apiCallsExternal.inc({ service, status: 'success' });
        apiLatencyExternal.observe({ service }, duration);
        return result;
      })
      .catch(error => {
        const duration = (Date.now() - start) / 1000;
        apiCallsExternal.inc({ service, status: 'error' });
        apiLatencyExternal.observe({ service }, duration);
        errorsTotal.inc({ type: 'external_api_error', severity: 'error' });
        throw error;
      });
  }

  /**
   * Get comprehensive health status
   */
  public async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, any>;
    metrics: Record<string, any>;
  }> {
    const checks: Record<string, any> = {};
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    try {
      // Database health
      const dbHealth = await dbPoolMonitor.getHealthReport();
      checks.database = {
        status: dbHealth.pool ? 'healthy' : 'unhealthy',
        pool: dbHealth.pool,
        recommendations: dbHealth.recommendations,
      };

      // Cache health
      const cacheHealth = await cacheService.healthCheck();
      checks.cache = cacheHealth;

      // Memory health
      const memUsage = process.memoryUsage();
      const memUsageMB = memUsage.heapUsed / 1024 / 1024;
      checks.memory = {
        status: memUsageMB > this.ALERT_THRESHOLDS.HIGH_MEMORY_USAGE ? 'degraded' : 'healthy',
        heapUsed: `${memUsageMB.toFixed(2)}MB`,
        heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
      };

      // Determine overall status
      if (checks.database.status === 'unhealthy' || checks.cache.status === 'unhealthy') {
        overallStatus = 'unhealthy';
      } else if (checks.memory.status === 'degraded') {
        overallStatus = 'degraded';
      }

      // Get current metrics
      const metrics = {
        connections: {
          database: dbHealth.pool?.active_connections || 0,
          websocket: (wsConnectionsActive as any).get ? (wsConnectionsActive as any).get() : 0,
        },
        cache: {
          hitRate: (cacheHitRate as any).get ? (cacheHitRate as any).get() : 0,
          connected: checks.cache.status === 'healthy',
        },
        performance: {
          memoryUsageMB: memUsageMB,
          uptime: process.uptime(),
        },
      };

      return {
        status: overallStatus,
        checks,
        metrics,
      };

    } catch (error) {
      logger.error('Error getting health status:', error);
      return {
        status: 'unhealthy',
        checks: { error: 'Health check failed' },
        metrics: {},
      };
    }
  }

  /**
   * Get Prometheus metrics
   */
  public async getMetrics(): Promise<string> {
    return register.metrics();
  }

  /**
   * Clear all metrics (useful for testing)
   */
  public clearMetrics(): void {
    register.clear();
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS FOR TRACKING
// ============================================================================

export const trackTrade = (action: 'buy' | 'sell', status: 'success' | 'error', volume?: number) => {
  tradesTotal.inc({ action, status });
  if (status === 'success' && volume) {
    tradeVolume.inc({ action }, volume);
  }
};

export const trackPriceUpdate = (source: string, status: 'success' | 'error') => {
  priceUpdatesTotal.inc({ source, status });
};

export const trackWebSocketMessage = (type: string, direction: 'inbound' | 'outbound') => {
  wsMessagesTotal.inc({ type, direction });
};

export const trackError = (type: string, severity: 'warning' | 'error' | 'critical') => {
  errorsTotal.inc({ type, severity });
};

export const trackCacheOperation = (operation: 'get' | 'set' | 'del', result: 'hit' | 'miss' | 'success' | 'error') => {
  cacheOperationsTotal.inc({ operation, result });
};

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const monitoringService = MonitoringService.getInstance();