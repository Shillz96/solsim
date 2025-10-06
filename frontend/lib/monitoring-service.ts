// System Monitoring API Service
// Handles health checks, metrics, and system status

import apiClient from './api-client'
import type { HealthCheck, SystemMetrics } from './types/api-types'

class MonitoringService {
  // Get application health status
  async getHealth(): Promise<HealthCheck> {
    return apiClient.get<HealthCheck>('/api/v1/monitoring/health-json')
  }

  // Get system metrics
  async getMetrics(): Promise<SystemMetrics> {
    return apiClient.get<SystemMetrics>('/api/v1/monitoring/metrics-json')
  }

  // Check if system is ready
  async getReadyStatus(): Promise<{ status: string; timestamp: number }> {
    return apiClient.get('/api/v1/monitoring/ready')
  }

  // Check if system is live
  async getLiveStatus(): Promise<{ status: string; timestamp: number }> {
    return apiClient.get('/api/v1/monitoring/live')
  }

  // Get system alerts
  async getAlerts(): Promise<Array<{
    id: string
    level: 'info' | 'warning' | 'error' | 'critical'
    message: string
    timestamp: number
    resolved: boolean
  }>> {
    return apiClient.get('/api/v1/monitoring/alerts')
  }

  // Get performance targets
  async getPerformanceTargets(): Promise<{
    responseTime: number
    errorRate: number
    uptime: number
  }> {
    return apiClient.get('/api/v1/monitoring/performance-targets')
  }

  // Run performance test
  async runPerformanceTest(): Promise<{
    responseTime: number
    throughput: number
    errorRate: number
    testDuration: number
  }> {
    return apiClient.post('/api/v1/monitoring/performance-test')
  }

  // Get comprehensive system status
  async getSystemStatus(): Promise<{
    overall: 'healthy' | 'degraded' | 'unhealthy'
    timestamp: number
    components: {
      database: 'healthy' | 'degraded' | 'unhealthy'
      priceService: 'healthy' | 'degraded' | 'unhealthy'
      tradingService: 'healthy' | 'degraded' | 'unhealthy'
      portfolioService: 'healthy' | 'degraded' | 'unhealthy'
    }
    metrics: SystemMetrics
    alerts: Array<any>
  }> {
    return apiClient.get('/api/v1/monitoring/system-status')
  }
}

// Export singleton instance
const monitoringService = new MonitoringService()
export default monitoringService