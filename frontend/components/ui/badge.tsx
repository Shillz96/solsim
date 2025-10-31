import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-lg border px-2.5 py-1 text-xs font-bold w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive transition-all overflow-hidden border-3 border-outline shadow-[2px_2px_0_var(--outline-black)]',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground [a&]:hover:bg-primary/90 [a&]:hover:shadow-[3px_3px_0_var(--outline-black)]',
        secondary:
          'bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90 [a&]:hover:shadow-[3px_3px_0_var(--outline-black)]',
        destructive:
          'bg-mario text-white [a&]:hover:bg-mario/90 focus-visible:ring-mario/20 [a&]:hover:shadow-[3px_3px_0_var(--outline-black)]',
        outline:
          'text-foreground bg-white [a&]:hover:bg-accent [a&]:hover:text-accent-foreground [a&]:hover:shadow-[3px_3px_0_var(--outline-black)]',
        success:
          'bg-luigi text-white [a&]:hover:bg-luigi/90 [a&]:hover:shadow-[3px_3px_0_var(--outline-black)]',
        warning:
          'bg-star text-outline [a&]:hover:bg-star/90 [a&]:hover:shadow-[3px_3px_0_var(--outline-black)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span'

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
