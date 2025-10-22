import Image from 'next/image'
import { cn } from '@/lib/utils'

interface MarioPageHeaderProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
}

/**
 * MarioPageHeader - Reusable component for displaying Mario-themed header images
 *
 * Usage:
 * <MarioPageHeader
 *   src="/trade-header.png"
 *   alt="Trade"
 *   width={600}
 *   height={150}
 * />
 */
export function MarioPageHeader({
  src,
  alt,
  width = 800,
  height = 150,
  className,
  priority = false
}: MarioPageHeaderProps) {
  return (
    <div className={cn("flex justify-center mb-6 md:mb-8", className)}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className="max-w-full h-auto drop-shadow-lg"
        priority={priority}
      />
    </div>
  )
}
