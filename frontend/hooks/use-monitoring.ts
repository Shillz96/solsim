// Monitoring hooks for real-time system health and metrics
// Provides reactive data for monitoring dashboard components

import { useState, useEffect, useCallback } from 'react'
import monitoringService from '@/lib/monitoring-service'
import type { HealthCheck, SystemMetrics } from '@/lib/types/api-types'

// Health check hook with auto-refresh
export function useHealthCheck(refreshInterval: number = 30000) {
  const [data, setData] = useState<HealthCheck | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchHealth = useCallback(async () => {
    try {
      // Don't set loading=true on refetch, only on initial load
      setError(null)
      const health = await monitoringService.getHealth()
      setData(health)
      setLoading(false) // Set false after first successful load
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch health data')
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHealth()
    
    if (refreshInterval > 0) {
      const interval = setInterval(fetchHealth, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [refreshInterval]) // Remove fetchHealth dependency to prevent loops

  return { 
    data, 
    loading, 
    error, 
    refetch: fetchHealth 
  }
}

// System metrics hook with auto-refresh
export function useSystemMetrics(refreshInterval: number = 15000) {
  const [data, setData] = useState<SystemMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMetrics = useCallback(async () => {
    try {
      // Don't set loading=true on refetch, only on initial load
      setError(null)
      const metrics = await monitoringService.getMetrics()
      setData(metrics)
      setLoading(false) // Set false after first successful load
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics data')
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMetrics()
    
    if (refreshInterval > 0) {
      const interval = setInterval(fetchMetrics, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [refreshInterval]) // Remove fetchMetrics dependency to prevent loops

  return { 
    data, 
    loading, 
    error, 
    refetch: fetchMetrics 
  }
}

// System alerts hook with auto-refresh
export function useSystemAlerts(refreshInterval: number = 10000) {
  const [data, setData] = useState<Array<{
    id: string
    level: 'info' | 'warning' | 'error' | 'critical'
    message: string
    timestamp: number
    resolved: boolean
  }> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAlerts = useCallback(async () => {
    try {
      // Don't set loading=true on refetch, only on initial load
      setError(null)
      const alerts = await monitoringService.getAlerts()
      setData(alerts)
      setLoading(false) // Set false after first successful load
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch alerts data')
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAlerts()
    
    if (refreshInterval > 0) {
      const interval = setInterval(fetchAlerts, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [refreshInterval]) // Remove fetchAlerts dependency to prevent loops

  return { 
    data, 
    loading, 
    error, 
    refetch: fetchAlerts 
  }
}

// Comprehensive system status hook
export function useSystemStatus(refreshInterval: number = 20000) {
  const [data, setData] = useState<{
    overall: 'healthy' | 'degraded' | 'unhealthy'
    components: {
      database: 'healthy' | 'degraded' | 'unhealthy'
      priceService: 'healthy' | 'degraded' | 'unhealthy'
      tradingService: 'healthy' | 'degraded' | 'unhealthy'
      portfolioService: 'healthy' | 'degraded' | 'unhealthy'
    }
    metrics: SystemMetrics
    alerts: Array<any>
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      // Don't set loading=true on refetch, only on initial load
      setError(null)
      const status = await monitoringService.getSystemStatus()
      setData(status)
      setLoading(false) // Set false after first successful load
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch system status')
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
    
    if (refreshInterval > 0) {
      const interval = setInterval(fetchStatus, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [refreshInterval]) // Remove fetchStatus dependency to prevent loops

  return { 
    data, 
    loading, 
    error, 
    refetch: fetchStatus 
  }
}

// Performance test hook
export function usePerformanceTest() {
  const [data, setData] = useState<{
    responseTime: number
    throughput: number
    errorRate: number
    testDuration: number
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runTest = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await monitoringService.runPerformanceTest()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run performance test')
    } finally {
      setLoading(false)
    }
  }, [])

  return { 
    data, 
    loading, 
    error, 
    runTest 
  }
}