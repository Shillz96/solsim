'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Activity, AlertTriangle, RefreshCw } from 'lucide-react'
import { useSystemStatus } from '@/hooks/use-monitoring'
import Link from 'next/link'

interface MonitoringStatusWidgetProps {
  showDetails?: boolean
  className?: string
}

export function MonitoringStatusWidget({ 
  showDetails = true, 
  className = '' 
}: MonitoringStatusWidgetProps) {
  const { data: systemStatus, loading, error, refetch } = useSystemStatus(30000)

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Activity className="h-4 w-4 text-green-600" />
      case 'degraded':
      case 'unhealthy':
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      default:
        return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  if (!showDetails) {
    // Compact status indicator for header/sidebar
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {loading ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
        ) : error ? (
          <AlertTriangle className="h-4 w-4 text-red-500" />
        ) : (
          getStatusIcon(systemStatus?.overall || 'unknown')
        )}
        <Badge className={getStatusColor(systemStatus?.overall || 'unknown')}>
          {loading ? 'Loading...' : error ? 'Error' : systemStatus?.overall || 'Unknown'}
        </Badge>
        <Link href="/monitoring">
          <Button variant="ghost" size="sm" className="h-6 px-2">
            Details
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">System Status</CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={refetch}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Link href="/monitoring">
            <Button variant="outline" size="sm">
              View Details
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <div className="h-6 bg-gray-200 animate-pulse rounded" />
            <div className="h-4 bg-gray-200 animate-pulse rounded w-3/4" />
          </div>
        ) : error ? (
          <div className="text-red-500 text-sm">
            Error loading system status: {String(error)}
          </div>
        ) : systemStatus ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Status</span>
              <Badge className={getStatusColor(systemStatus.overall)}>
                {systemStatus.overall}
              </Badge>
            </div>
            
            {systemStatus.components && (
              <div className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">Components</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(systemStatus.components).map(([component, status]) => (
                    <div key={component} className="flex items-center justify-between">
                      <span className="capitalize truncate">
                        {component.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <Badge variant="outline" className={`text-xs ${getStatusColor(status)}`}>
                        {status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {systemStatus.alerts && systemStatus.alerts.length > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <AlertTriangle className="h-3 w-3 text-yellow-500" />
                <span className="text-muted-foreground">
                  {systemStatus.alerts.filter((alert: any) => !alert.resolved).length} active alerts
                </span>
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}