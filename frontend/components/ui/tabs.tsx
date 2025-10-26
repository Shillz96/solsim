'use client'

import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'

import { cn } from '@/lib/utils'

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn('flex flex-col gap-2', className)}
      {...props}
    />
  )
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        'inline-flex w-fit items-center justify-center',
        'bg-white/60 border-2 border-[var(--outline-black)] rounded-lg',
        'p-1',
        className,
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        'inline-flex h-9 flex-1 items-center justify-center gap-1.5',
        'rounded-md px-3 py-2 text-sm font-bold transition-all',
        'text-[var(--outline-black)] whitespace-nowrap',
        // Inactive state
        'data-[state=inactive]:opacity-60',
        // Active state - Mario colors (default: luigi green)
        'data-[state=active]:bg-[var(--luigi-green)]',
        'data-[state=active]:text-white',
        'data-[state=active]:shadow-none',
        // Hover
        'hover:opacity-100',
        // Disabled
        'disabled:pointer-events-none disabled:opacity-40',
        // Icons
        '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=\'size-\'])]:size-4',
        className,
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn('flex-1 outline-none transition-all duration-300 ease-in-out', className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
