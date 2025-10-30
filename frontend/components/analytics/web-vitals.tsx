'use client'

/**
 * Web Vitals Monitoring Component
 *
 * Tracks Core Web Vitals and reports to console (and optionally analytics)
 * - LCP (Largest Contentful Paint) - Loading performance
 * - FID (First Input Delay) - Interactivity
 * - CLS (Cumulative Layout Shift) - Visual stability
 * - FCP (First Contentful Paint) - Initial render
 * - TTFB (Time to First Byte) - Server response time
 * - INP (Interaction to Next Paint) - Responsiveness
 */

import { useEffect } from 'react'
import { onCLS, onFCP, onFID, onLCP, onTTFB, onINP, type Metric } from 'web-vitals'

interface WebVitalsProps {
  /**
   * Optional callback to send metrics to analytics service
   * (e.g., Google Analytics, Sentry, Datadog, etc.)
   */
  onMetric?: (metric: Metric) => void
}

export function WebVitals({ onMetric }: WebVitalsProps = {}) {
  useEffect(() => {
    const handleMetric = (metric: Metric) => {
      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        const value = metric.name === 'CLS'
          ? metric.value.toFixed(4)
          : Math.round(metric.value)

        const rating = metric.rating === 'good' ? '=â'
          : metric.rating === 'needs-improvement' ? '=á'
          : '=4'

        console.log(
          `${rating} ${metric.name}:`,
          value,
          metric.rating,
          `(${metric.navigationType})`
        )
      }

      // Send to analytics if callback provided
      if (onMetric) {
        onMetric(metric)
      }
    }

    // Register all Core Web Vitals observers
    onCLS(handleMetric)
    onFCP(handleMetric)
    onFID(handleMetric)
    onLCP(handleMetric)
    onTTFB(handleMetric)
    onINP(handleMetric)
  }, [onMetric])

  // This component doesn't render anything
  return null
}

/**
 * Example usage with Google Analytics:
 *
 * ```tsx
 * <WebVitals
 *   onMetric={(metric) => {
 *     // Send to Google Analytics
 *     window.gtag?.('event', metric.name, {
 *       value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
 *       metric_id: metric.id,
 *       metric_value: metric.value,
 *       metric_delta: metric.delta,
 *       metric_rating: metric.rating,
 *     })
 *   }}
 * />
 * ```
 *
 * Example usage with custom analytics:
 *
 * ```tsx
 * <WebVitals
 *   onMetric={(metric) => {
 *     fetch('/api/analytics/web-vitals', {
 *       method: 'POST',
 *       headers: { 'Content-Type': 'application/json' },
 *       body: JSON.stringify({
 *         name: metric.name,
 *         value: metric.value,
 *         rating: metric.rating,
 *         navigationType: metric.navigationType,
 *         timestamp: Date.now(),
 *       }),
 *     })
 *   }}
 * />
 * ```
 */
