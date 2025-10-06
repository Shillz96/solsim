'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Activity, Server, Database, TrendingUp, RefreshCw } from 'lucide-react'
import { useHealthCheck, useSystemMetrics, useSystemAlerts, useSystemStatus, usePerformanceTest } from '@/hooks/use-monitoring'

export default function MonitoringPage() {
  const [refreshRate, setRefreshRate] = useState(30000) // 30 seconds default

  const healthCheck = useHealthCheck(refreshRate)
  const systemMetrics = useSystemMetrics(15000) // 15 seconds for metrics
  const systemAlerts = useSystemAlerts(10000) // 10 seconds for alerts
  const systemStatus = useSystemStatus(20000) // 20 seconds for overall status
  const performanceTest = usePerformanceTest()

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'degraded':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'unhealthy':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getAlertColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'destructive'
      case 'error':
        return 'destructive'
      case 'warning':
        return 'secondary'
      case 'info':
        return 'outline'
      default:
        return 'outline'
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Monitoring</h1>
          <p className="text-muted-foreground">
            Real-time monitoring of SolSim backend health and performance
          </p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={refreshRate}
            onChange={(e) => setRefreshRate(Number(e.target.value))}
            className="border rounded px-3 py-1"
          >
            <option value={10000}>10s refresh</option>
            <option value={30000}>30s refresh</option>
            <option value={60000}>1m refresh</option>
            <option value={0}>Manual only</option>
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              healthCheck.refetch()
              systemMetrics.refetch()
              systemAlerts.refetch()
              systemStatus.refetch()
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh All
          </Button>
        </div>
      </div>

      {/* System Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemStatus.loading ? (
                <div className="h-8 bg-gray-200 animate-pulse rounded" />
              ) : systemStatus.error ? (
                <Badge variant="destructive">Error</Badge>
              ) : (
                <Badge className={getStatusColor(systemStatus.data?.overall || 'unknown')}>
                  {systemStatus.data?.overall || 'Unknown'}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemAlerts.loading ? (
                <div className="h-8 bg-gray-200 animate-pulse rounded" />
              ) : systemAlerts.error ? (
                <span className="text-red-500">Error</span>
              ) : (
                <span className={systemAlerts.data?.filter(alert => !alert.resolved).length ? 'text-red-500' : 'text-green-500'}>
                  {systemAlerts.data?.filter(alert => !alert.resolved).length || 0}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemMetrics.loading ? (
                <div className="h-8 bg-gray-200 animate-pulse rounded" />
              ) : systemMetrics.error ? (
                <span className="text-red-500">Error</span>
              ) : (
                <span>{systemMetrics.data?.requests?.avgResponseTime || 0}ms</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemMetrics.loading ? (
                <div className="h-8 bg-gray-200 animate-pulse rounded" />
              ) : systemMetrics.error ? (
                <span className="text-red-500">Error</span>
              ) : (
                <span>{systemMetrics.data?.memory?.percentage || 0}%</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Monitoring Tabs */}
      <Tabs defaultValue="health" className="space-y-4">
        <TabsList>
          <TabsTrigger value="health">Health Check</TabsTrigger>
          <TabsTrigger value="metrics">System Metrics</TabsTrigger>
          <TabsTrigger value="components">Components</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="health" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Application Health</CardTitle>
              <CardDescription>
                Current health status of all system components
              </CardDescription>
            </CardHeader>
            <CardContent>
              {healthCheck.loading ? (
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 animate-pulse rounded" />
                  <div className="h-4 bg-gray-200 animate-pulse rounded w-3/4" />
                  <div className="h-4 bg-gray-200 animate-pulse rounded w-1/2" />
                </div>
              ) : healthCheck.error ? (
                <div className="text-red-500">
                  Error loading health data: {healthCheck.error}
                </div>
              ) : healthCheck.data ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">Status</p>
                      <Badge className={getStatusColor(healthCheck.data.status)}>
                        {healthCheck.data.status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Uptime</p>
                      <p className="text-lg">{healthCheck.data.uptime || 'N/A'}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Last Check</p>
                    <p className="text-sm text-muted-foreground">
                      {healthCheck.data.timestamp ? new Date(healthCheck.data.timestamp).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>System Performance</CardTitle>
                <CardDescription>Current system resource usage</CardDescription>
              </CardHeader>
              <CardContent>
                {systemMetrics.loading ? (
                  <div className="space-y-2">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-4 bg-gray-200 animate-pulse rounded" />
                    ))}
                  </div>
                ) : systemMetrics.error ? (
                  <div className="text-red-500">
                    Error loading metrics: {systemMetrics.error}
                  </div>
                ) : systemMetrics.data ? (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>CPU Usage</span>
                      <span>{systemMetrics.data.cpu?.usage || 0}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Memory Usage</span>
                      <span>{systemMetrics.data.memory?.percentage || 0}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Memory Used</span>
                      <span>{systemMetrics.data.memory?.used || 0}MB</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Response Time</span>
                      <span>{systemMetrics.data.requests?.avgResponseTime || 0}ms</span>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>API Metrics</CardTitle>
                <CardDescription>Request and response statistics</CardDescription>
              </CardHeader>
              <CardContent>
                {systemMetrics.loading ? (
                  <div className="space-y-2">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-4 bg-gray-200 animate-pulse rounded" />
                    ))}
                  </div>
                ) : systemMetrics.error ? (
                  <div className="text-red-500">
                    Error loading API metrics: {systemMetrics.error}
                  </div>
                ) : systemMetrics.data ? (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Total Requests</span>
                      <span>{systemMetrics.data.requests?.total || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Request Errors</span>
                      <span>{systemMetrics.data.requests?.errors || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>DB Connections</span>
                      <span>{systemMetrics.data.database?.connections || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Database Queries</span>
                      <span>{systemMetrics.data.database?.queries || 0}</span>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="components" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Service Components</CardTitle>
              <CardDescription>
                Health status of individual system components
              </CardDescription>
            </CardHeader>
            <CardContent>
              {systemStatus.loading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="h-4 bg-gray-200 animate-pulse rounded w-32" />
                      <div className="h-6 bg-gray-200 animate-pulse rounded w-20" />
                    </div>
                  ))}
                </div>
              ) : systemStatus.error ? (
                <div className="text-red-500">
                  Error loading component status: {systemStatus.error}
                </div>
              ) : systemStatus.data?.components ? (
                <div className="space-y-3">
                  {Object.entries(systemStatus.data.components).map(([component, status]) => (
                    <div key={component} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        <span className="capitalize">{component.replace(/([A-Z])/g, ' $1').trim()}</span>
                      </div>
                      <Badge className={getStatusColor(status)}>
                        {status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Alerts</CardTitle>
              <CardDescription>
                Current alerts and notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              {systemAlerts.loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-4 bg-gray-200 animate-pulse rounded" />
                      <div className="h-3 bg-gray-200 animate-pulse rounded w-3/4" />
                    </div>
                  ))}
                </div>
              ) : systemAlerts.error ? (
                <div className="text-red-500">
                  Error loading alerts: {systemAlerts.error}
                </div>
              ) : systemAlerts.data && systemAlerts.data.length > 0 ? (
                <div className="space-y-3">
                  {systemAlerts.data.slice(0, 10).map((alert) => (
                    <div key={alert.id} className="border rounded p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant={getAlertColor(alert.level)}>
                          {alert.level}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(alert.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm">{alert.message}</p>
                      {alert.resolved && (
                        <Badge variant="outline" className="text-xs">
                          Resolved
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-green-600">No active alerts</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Testing</CardTitle>
              <CardDescription>
                Run performance tests and view results
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={performanceTest.runTest}
                disabled={performanceTest.loading}
                className="w-full"
              >
                {performanceTest.loading ? 'Running Test...' : 'Run Performance Test'}
              </Button>

              {performanceTest.error && (
                <div className="text-red-500">
                  Error: {performanceTest.error}
                </div>
              )}

              {performanceTest.data && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Response Time</p>
                    <p className="text-2xl font-bold">{performanceTest.data.responseTime}ms</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Throughput</p>
                    <p className="text-2xl font-bold">{performanceTest.data.throughput} req/s</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Error Rate</p>
                    <p className="text-2xl font-bold">{performanceTest.data.errorRate}%</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Test Duration</p>
                    <p className="text-2xl font-bold">{performanceTest.data.testDuration}s</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}