/**
 * Health Check Routes
 *
 * Provides monitoring endpoints for system health and debugging:
 * - Circuit breaker status
 * - Price service health
 * - Last update timestamps
 */

import { FastifyInstance } from 'fastify';

export default async function healthRoutes(app: FastifyInstance) {
  /**
   * Price Service Health Check
   * Returns circuit breaker status, error rates, and last update times
   */
  app.get('/health/prices', async (req, reply) => {
    try {
      // Get price service instance from app decorators
      const priceService = app.priceService;

      if (!priceService) {
        return reply.code(503).send({
          error: 'Price service not initialized',
          isHealthy: false
        });
      }

      // Get circuit breaker stats (using the new getStats method)
      const jupiterStats = priceService.jupiterBreaker?.getStats() || {
        state: 'UNKNOWN',
        failures: 0,
        fires: 0,
        errorRate: 0,
        isHealthy: false
      };

      const coinGeckoStats = priceService.coinGeckoBreaker?.getStats() || {
        state: 'UNKNOWN',
        failures: 0,
        fires: 0,
        errorRate: 0,
        isHealthy: false
      };

      // Get health metrics
      const health = priceService.getHealth();

      return {
        circuitBreaker: {
          jupiter: jupiterStats,
          coinGecko: coinGeckoStats
        },
        health: {
          lastPriceUpdate: health.lastPriceUpdate,
          lastPriceUpdateAgo: health.lastPriceUpdateAgo,
          pumpPortalConnected: health.pumpPortalConnected,
          isHealthy: health.isHealthy
        },
        isHealthy: jupiterStats.isHealthy && health.isHealthy,
        timestamp: Date.now()
      };
    } catch (error: any) {
      app.log.error({ error }, "Failed to fetch health status");
      return reply.code(500).send({
        error: error.message || 'Failed to fetch health status',
        isHealthy: false
      });
    }
  });

  /**
   * General Health Check
   * Quick endpoint for uptime monitoring - ALWAYS returns 200 for Railway health checks
   * Returns warmup state if background services are still initializing
   */
  app.get('/health', async (req, reply) => {
    const priceService = app.priceService;
    const health = priceService?.getHealth();
    
    // Check if services are still warming up
    const isWarmingUp = !health?.pumpPortalConnected || health?.lastPriceUpdateAgo > 60000;
    
    return {
      status: isWarmingUp ? 'warming_up' : 'ok',
      uptime: process.uptime(),
      timestamp: Date.now(),
      services: {
        pumpPortal: health?.pumpPortalConnected ? 'connected' : 'connecting',
        priceUpdates: health?.lastPriceUpdateAgo < 60000 ? 'active' : 'pending'
      }
    };
  });

  /**
   * Manual Circuit Breaker Reset (Admin endpoint)
   * Allows manual reset of circuit breaker in emergency situations
   */
  app.post('/admin/reset-circuit-breaker', async (req, reply) => {
    try {
      const priceService = app.priceService;

      if (!priceService) {
        return reply.code(503).send({
          error: 'Price service not initialized',
          success: false
        });
      }

      // Reset Jupiter circuit breaker
      if (priceService.jupiterBreaker) {
        priceService.jupiterBreaker.reset();
      }

      // Reset CoinGecko circuit breaker
      if (priceService.coinGeckoBreaker) {
        priceService.coinGeckoBreaker.reset();
      }

      app.log.warn('Circuit breakers manually reset via admin endpoint');

      return {
        success: true,
        message: 'Circuit breaker manually reset',
        timestamp: Date.now()
      };
    } catch (error: any) {
      app.log.error({ error }, "Failed to reset circuit breaker");
      return reply.code(500).send({
        error: error.message || 'Failed to reset circuit breaker',
        success: false
      });
    }
  });
}
