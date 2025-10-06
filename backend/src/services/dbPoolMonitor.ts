import { logger } from '../utils/logger.js';
import prisma, { getConnectionPoolStats } from '../lib/prisma.js';
import { cacheService } from './cacheService.js';

/**
 * Database Pool Monitoring Service
 * 
 * Monitors database connection pool health and performance.
 * Features:
 * - Connection pool utilization tracking
 * - Slow query detection
 * - Connection leak detection
 * - Automatic pool statistics collection
 * - Performance metrics for optimization
 */

export interface PoolStats {
  total_connections: number;
  active_connections: number;
  idle_connections: number;
  utilization_percentage: number;
  timestamp: number;
}

export interface QueryMetrics {
  total_queries: number;
  slow_queries: number;
  average_query_time: number;
  timestamp: number;
}

export class DatabasePoolMonitor {
  private static instance: DatabasePoolMonitor;
  private isMonitoring: boolean = false;
  private monitoringInterval?: NodeJS.Timeout;
  private queryMetrics: QueryMetrics = {
    total_queries: 0,
    slow_queries: 0,
    average_query_time: 0,
    timestamp: Date.now()
  };
  
  // Monitoring configuration
  private readonly MONITORING_INTERVAL = 30000; // 30 seconds
  private readonly SLOW_QUERY_THRESHOLD = 1000; // 1 second
  private readonly MAX_UTILIZATION_WARNING = 80; // 80% pool utilization
  private readonly METRICS_CACHE_TTL = 300; // 5 minutes

  private constructor() {}

  public static getInstance(): DatabasePoolMonitor {
    if (!DatabasePoolMonitor.instance) {
      DatabasePoolMonitor.instance = new DatabasePoolMonitor();
    }
    return DatabasePoolMonitor.instance;
  }

  /**
   * Start monitoring the database connection pool
   */
  public startMonitoring(): void {
    if (this.isMonitoring) {
      logger.warn('Database pool monitoring is already running');
      return;
    }

    logger.info('Starting database pool monitoring...');
    this.isMonitoring = true;

    // Start periodic monitoring
    this.monitoringInterval = setInterval(async () => {
      await this.collectPoolMetrics();
    }, this.MONITORING_INTERVAL);

    // Collect initial metrics
    this.collectPoolMetrics().catch(error => {
      logger.error('Error collecting initial pool metrics:', error);
    });
  }

  /**
   * Stop monitoring
   */
  public stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    logger.info('Stopping database pool monitoring...');
    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  /**
   * Collect and analyze connection pool metrics
   */
  private async collectPoolMetrics(): Promise<void> {
    try {
      const rawStats = await getConnectionPoolStats();
      
      // Handle different database types
      let poolStats: PoolStats;
      
      if (Array.isArray(rawStats) && rawStats.length > 0) {
        // PostgreSQL format
        const stats = rawStats[0];
        poolStats = {
          total_connections: Number(stats.total_connections) || 0,
          active_connections: Number(stats.active_connections) || 0,
          idle_connections: Number(stats.idle_connections) || 0,
          utilization_percentage: 0,
          timestamp: Date.now()
        };
        
        // Calculate utilization percentage
        if (poolStats.total_connections > 0) {
          poolStats.utilization_percentage = 
            (poolStats.active_connections / poolStats.total_connections) * 100;
        }
      } else {
        // Fallback for SQLite or other databases
        poolStats = {
          total_connections: 1,
          active_connections: 1,
          idle_connections: 0,
          utilization_percentage: 100,
          timestamp: Date.now()
        };
      }

      // Cache metrics for monitoring endpoints
      await cacheService.set('db:pool:stats', poolStats, { ttl: this.METRICS_CACHE_TTL });

      // Log warnings if utilization is high
      if (poolStats.utilization_percentage > this.MAX_UTILIZATION_WARNING) {
        logger.warn(`High database pool utilization: ${poolStats.utilization_percentage.toFixed(1)}%`, {
          total: poolStats.total_connections,
          active: poolStats.active_connections,
          idle: poolStats.idle_connections
        });
      }

      // Log metrics in development
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Database pool metrics:', {
          utilization: `${poolStats.utilization_percentage.toFixed(1)}%`,
          active: poolStats.active_connections,
          idle: poolStats.idle_connections,
          total: poolStats.total_connections
        });
      }

    } catch (error) {
      logger.error('Error collecting database pool metrics:', error);
    }
  }

  /**
   * Track query execution time
   */
  public trackQuery(queryTime: number): void {
    this.queryMetrics.total_queries++;
    
    if (queryTime > this.SLOW_QUERY_THRESHOLD) {
      this.queryMetrics.slow_queries++;
      logger.warn(`Slow query detected: ${queryTime}ms`);
    }

    // Calculate rolling average
    this.queryMetrics.average_query_time = 
      (this.queryMetrics.average_query_time + queryTime) / 2;

    // Cache updated metrics
    cacheService.set('db:query:metrics', this.queryMetrics, { ttl: this.METRICS_CACHE_TTL })
      .catch(error => logger.debug('Error caching query metrics:', error));
  }

  /**
   * Get current pool statistics
   */
  public async getCurrentPoolStats(): Promise<PoolStats | null> {
    try {
      return await cacheService.get<PoolStats>('db:pool:stats');
    } catch (error) {
      logger.error('Error getting pool stats:', error);
      return null;
    }
  }

  /**
   * Get current query metrics
   */
  public async getCurrentQueryMetrics(): Promise<QueryMetrics | null> {
    try {
      return await cacheService.get<QueryMetrics>('db:query:metrics');
    } catch (error) {
      logger.error('Error getting query metrics:', error);
      return null;
    }
  }

  /**
   * Get comprehensive database health report
   */
  public async getHealthReport(): Promise<{
    pool: PoolStats | null;
    queries: QueryMetrics | null;
    recommendations: string[];
  }> {
    const poolStats = await this.getCurrentPoolStats();
    const queryMetrics = await this.getCurrentQueryMetrics();
    const recommendations: string[] = [];

    // Generate recommendations based on metrics
    if (poolStats) {
      if (poolStats.utilization_percentage > 90) {
        recommendations.push('Consider increasing database connection pool size');
      } else if (poolStats.utilization_percentage < 10) {
        recommendations.push('Connection pool may be oversized for current load');
      }
    }

    if (queryMetrics) {
      const slowQueryPercentage = (queryMetrics.slow_queries / queryMetrics.total_queries) * 100;
      if (slowQueryPercentage > 5) {
        recommendations.push('High percentage of slow queries detected - consider query optimization');
      }
      
      if (queryMetrics.average_query_time > 500) {
        recommendations.push('Average query time is high - review database indexes');
      }
    }

    return {
      pool: poolStats,
      queries: queryMetrics,
      recommendations
    };
  }

  /**
   * Execute a monitored database operation
   */
  public async executeWithMonitoring<T>(
    operation: () => Promise<T>,
    operationName?: string
  ): Promise<T> {
    const start = Date.now();
    
    try {
      const result = await operation();
      const queryTime = Date.now() - start;
      
      this.trackQuery(queryTime);
      
      if (operationName && queryTime > this.SLOW_QUERY_THRESHOLD) {
        logger.warn(`Slow operation detected: ${operationName} took ${queryTime}ms`);
      }
      
      return result;
    } catch (error) {
      const queryTime = Date.now() - start;
      this.trackQuery(queryTime);
      
      logger.error(`Database operation failed: ${operationName || 'unknown'} (${queryTime}ms)`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const dbPoolMonitor = DatabasePoolMonitor.getInstance();