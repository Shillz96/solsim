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
        'bg-[#FFFAE9] border-3 border-outline rounded-lg shadow-[3px_3px_0_var(--outline-black)]',
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
        'inline-flex h-10 flex-1 items-center justify-center gap-1.5',
        'rounded-lg px-3 py-2 text-sm font-bold transition-all',
        'text-outline whitespace-nowrap',
        'border-3 border-outline',
        'shadow-[2px_2px_0_var(--outline-black)]',
        // Inactive state
        'data-[state=inactive]:opacity-70 data-[state=inactive]:bg-card',
        // Hover state (inactive only)
        'hover:data-[state=inactive]:shadow-[3px_3px_0_var(--outline-black)] hover:data-[state=inactive]:-translate-y-0.5 hover:data-[state=inactive]:opacity-100',
        // Active state - Mario colors (default: luigi green)
        'data-[state=active]:bg-luigi',
        'data-[state=active]:text-white',
        'data-[state=active]:shadow-[3px_3px_0_var(--outline-black)]',
        'data-[state=active]:scale-105',
        'data-[state=active]:-translate-y-0.5',
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
