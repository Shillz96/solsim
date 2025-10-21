/**
 * Page Title Component with View Transition Support
 *
 * Usage:
 * <PageTitle>Portfolio</PageTitle>
 *
 * This component automatically adds view-transition-name for smooth title morphing
 * between pages when using the View Transitions API.
 */

import React from 'react'
import { cn } from '@/lib/utils'

interface PageTitleProps {
  children: React.ReactNode
  className?: string
  as?: 'h1' | 'h2' | 'h3'
}

export function PageTitle({ children, className, as: Component = 'h1' }: PageTitleProps) {
  return (
    <Component
      className={cn(
        "text-3xl font-bold tracking-tight sm:text-4xl",
        className
      )}
      style={{ viewTransitionName: 'page-title' } as React.CSSProperties}
    >
      {children}
    </Component>
  )
}
