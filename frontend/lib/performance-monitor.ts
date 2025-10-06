// Performance Monitor for SolSim Frontend
// Tracks API performance, rate limit issues, and user experience metrics

export interface PerformanceMetrics {
  apiCalls: {
    total: number;
    successful: number;
    failed: number;
    rateLimited: number;
  };
  timing: {
    averageResponseTime: number;
    slowestEndpoint: string;
    fastestEndpoint: string;
  };
  errors: {
    circuitBreakerTriggered: number;
    authErrors: number;
    networkErrors: number;
  };
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics = {
    apiCalls: { total: 0, successful: 0, failed: 0, rateLimited: 0 },
    timing: { averageResponseTime: 0, slowestEndpoint: '', fastestEndpoint: '' },
    errors: { circuitBreakerTriggered: 0, authErrors: 0, networkErrors: 0 },
  };
  private responseTimes: number[] = [];
  private endpointTimes: Map<string, number[]> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  recordApiCall(
    endpoint: string,
    duration: number,
    success: boolean,
    statusCode?: number
  ): void {
    this.metrics.apiCalls.total++;
    
    if (success) {
      this.metrics.apiCalls.successful++;
    } else {
      this.metrics.apiCalls.failed++;
      
      if (statusCode === 429) {
        this.metrics.apiCalls.rateLimited++;
      }
    }

    // Track response times
    this.responseTimes.push(duration);
    if (this.responseTimes.length > 100) {
      this.responseTimes.shift(); // Keep only last 100 measurements
    }

    // Track per-endpoint times
    const endpointTimes = this.endpointTimes.get(endpoint) || [];
    endpointTimes.push(duration);
    if (endpointTimes.length > 10) {
      endpointTimes.shift(); // Keep only last 10 measurements per endpoint
    }
    this.endpointTimes.set(endpoint, endpointTimes);

    // Update timing metrics
    this.updateTimingMetrics();
  }

  recordError(type: 'circuit-breaker' | 'auth' | 'network'): void {
    switch (type) {
      case 'circuit-breaker':
        this.metrics.errors.circuitBreakerTriggered++;
        break;
      case 'auth':
        this.metrics.errors.authErrors++;
        break;
      case 'network':
        this.metrics.errors.networkErrors++;
        break;
    }
  }

  private updateTimingMetrics(): void {
    if (this.responseTimes.length === 0) return;

    // Calculate average response time
    const total = this.responseTimes.reduce((sum, time) => sum + time, 0);
    this.metrics.timing.averageResponseTime = total / this.responseTimes.length;

    // Find slowest and fastest endpoints
    let slowest = { endpoint: '', time: 0 };
    let fastest = { endpoint: '', time: Infinity };

    for (const [endpoint, times] of this.endpointTimes.entries()) {
      if (times.length === 0) continue;
      
      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      
      if (avgTime > slowest.time) {
        slowest = { endpoint, time: avgTime };
      }
      
      if (avgTime < fastest.time) {
        fastest = { endpoint, time: avgTime };
      }
    }

    this.metrics.timing.slowestEndpoint = slowest.endpoint;
    this.metrics.timing.fastestEndpoint = fastest.endpoint;
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  getHealthScore(): number {
    const total = this.metrics.apiCalls.total;
    if (total === 0) return 100;

    const successRate = (this.metrics.apiCalls.successful / total) * 100;
    const rateLimitImpact = (this.metrics.apiCalls.rateLimited / total) * 50; // 50% penalty for rate limits
    
    return Math.max(0, Math.min(100, successRate - rateLimitImpact));
  }

  reset(): void {
    this.metrics = {
      apiCalls: { total: 0, successful: 0, failed: 0, rateLimited: 0 },
      timing: { averageResponseTime: 0, slowestEndpoint: '', fastestEndpoint: '' },
      errors: { circuitBreakerTriggered: 0, authErrors: 0, networkErrors: 0 },
    };
    this.responseTimes = [];
    this.endpointTimes.clear();
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();
