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

      // Get health metrics
      const health = priceService.getHealth();

      return {
        circuitBreaker: {
          jupiter: jupiterStats
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
      app.log.error(error);
      return reply.code(500).send({
        error: error.message || 'Failed to fetch health status',
        isHealthy: false
      });
    }
  });

  /**
   * General Health Check
   * Quick endpoint for uptime monitoring
   */
  app.get('/health', async (req, reply) => {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: Date.now()
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

      app.log.warn('Circuit breaker manually reset via admin endpoint');

      return {
        success: true,
        message: 'Circuit breaker manually reset',
        timestamp: Date.now()
      };
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({
        error: error.message || 'Failed to reset circuit breaker',
        success: false
      });
    }
  });
}
