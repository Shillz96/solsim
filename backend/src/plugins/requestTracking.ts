// Request tracking and logging for debugging and monitoring
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'crypto';
import { performance } from 'perf_hooks';

// Extend Fastify types
declare module 'fastify' {
  interface FastifyRequest {
    requestId: string;
    startTime: number;
    userId?: string;
  }
}

// Track concurrent requests for monitoring
let concurrentRequests = 0;
let maxConcurrentRequests = 0;
const slowRequestThreshold = 3000; // 3 seconds

// Request metrics for monitoring
const requestMetrics = {
  total: 0,
  successful: 0,
  failed: 0,
  slow: 0,
  byEndpoint: new Map<string, number>(),
  byStatus: new Map<number, number>(),
  errors: [] as Array<{
    timestamp: string;
    requestId: string;
    endpoint: string;
    error: string;
    userId?: string;
  }>
};

export default async function requestTrackingPlugin(app: FastifyInstance) {
  // Add request ID to all requests
  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    // Generate or use existing request ID
    request.requestId = request.headers['x-request-id'] as string || randomUUID();
    request.startTime = performance.now();

    // Track concurrent requests
    concurrentRequests++;
    maxConcurrentRequests = Math.max(maxConcurrentRequests, concurrentRequests);
    requestMetrics.total++;

    // Set request ID header for response
    reply.header('x-request-id', request.requestId);

    // Track endpoint usage
    const endpoint = `${request.method} ${request.routerPath || request.url}`;
    requestMetrics.byEndpoint.set(
      endpoint,
      (requestMetrics.byEndpoint.get(endpoint) || 0) + 1
    );

    // Log request start in development
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[${request.requestId}] ${request.method} ${request.url} - Started`);
    }
  });

  // Extract user ID after authentication
  app.addHook('preHandler', async (request: FastifyRequest) => {
    // @ts-ignore - user might be attached by auth middleware
    if (request.user?.id) {
      // @ts-ignore
      request.userId = request.user.id;
    }
  });

  // Log response and track metrics
  app.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const responseTime = performance.now() - request.startTime;
    concurrentRequests--;

    // Track status codes
    requestMetrics.byStatus.set(
      reply.statusCode,
      (requestMetrics.byStatus.get(reply.statusCode) || 0) + 1
    );

    // Track successful vs failed
    if (reply.statusCode < 400) {
      requestMetrics.successful++;
    } else {
      requestMetrics.failed++;
    }

    // Track slow requests
    if (responseTime > slowRequestThreshold) {
      requestMetrics.slow++;
      console.warn(
        `⚠️ Slow request detected [${request.requestId}]: ${request.method} ${request.url} took ${responseTime.toFixed(2)}ms`
      );
    }

    // Log response in development or for errors
    if (process.env.NODE_ENV !== 'production' || reply.statusCode >= 400) {
      const logLevel = reply.statusCode >= 500 ? 'error' :
                      reply.statusCode >= 400 ? 'warn' : 'info';

      const logMessage = `[${request.requestId}] ${request.method} ${request.url} - ${reply.statusCode} (${responseTime.toFixed(2)}ms)`;

      if (request.userId) {
        console[logLevel](`${logMessage} [User: ${request.userId}]`);
      } else {
        console[logLevel](logMessage);
      }
    }

    // Log critical performance issues
    if (responseTime > 10000) {
      console.error(
        `🚨 CRITICAL: Request [${request.requestId}] took ${responseTime.toFixed(2)}ms!`,
        {
          endpoint: `${request.method} ${request.url}`,
          userId: request.userId,
          statusCode: reply.statusCode
        }
      );
    }
  });

  // Error tracking
  app.addHook('onError', async (request: FastifyRequest, reply: FastifyReply, error: Error) => {
    console.error(
      `❌ Error [${request.requestId}]: ${error.message}`,
      {
        endpoint: `${request.method} ${request.url}`,
        userId: request.userId,
        stack: error.stack,
        statusCode: reply.statusCode
      }
    );

    // Store recent errors for monitoring
    requestMetrics.errors.push({
      timestamp: new Date().toISOString(),
      requestId: request.requestId,
      endpoint: `${request.method} ${request.url}`,
      error: error.message,
      userId: request.userId
    });

    // Keep only last 100 errors in memory
    if (requestMetrics.errors.length > 100) {
      requestMetrics.errors.shift();
    }
  });

  // Metrics endpoint for monitoring
  app.get('/metrics/requests', async (request, reply) => {
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();

    return {
      uptime: Math.floor(uptime),
      timestamp: new Date().toISOString(),
      requests: {
        total: requestMetrics.total,
        successful: requestMetrics.successful,
        failed: requestMetrics.failed,
        slow: requestMetrics.slow,
        concurrent: {
          current: concurrentRequests,
          max: maxConcurrentRequests
        },
        successRate: requestMetrics.total > 0
          ? ((requestMetrics.successful / requestMetrics.total) * 100).toFixed(2) + '%'
          : '0%',
        errorRate: requestMetrics.total > 0
          ? ((requestMetrics.failed / requestMetrics.total) * 100).toFixed(2) + '%'
          : '0%'
      },
      topEndpoints: Array.from(requestMetrics.byEndpoint.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([endpoint, count]) => ({ endpoint, count })),
      statusCodes: Object.fromEntries(requestMetrics.byStatus),
      recentErrors: requestMetrics.errors.slice(-10),
      memory: {
        used: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        total: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        percentage: ((memUsage.heapUsed / memUsage.heapTotal) * 100).toFixed(2) + '%'
      }
    };
  });

  // Request ID getter endpoint for debugging
  app.get('/request-id', async (request, reply) => {
    return { requestId: request.requestId };
  });

  console.log('✅ Request tracking and monitoring initialized');
}