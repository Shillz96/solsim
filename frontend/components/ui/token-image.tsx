"use client"

import { useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface TokenImageProps {
  src?: string | null
  alt: string
  className?: string
  width?: number
  height?: number
  size?: number
  fallback?: string
}

export function TokenImage({ 
  src, 
  alt, 
  className, 
  width, 
  height, 
  size = 32,
  fallback = "/placeholder-token.svg"
}: TokenImageProps) {
  const [hasError, setHasError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const finalWidth = width || size
  const finalHeight = height || size
  const imageSrc = (hasError || !src) ? fallback : src

  return (
    <div className={cn("relative overflow-hidden rounded-full", className)} style={{ width: finalWidth, height: finalHeight }}>
      {isLoading && !hasError && src && (
        <div className="absolute inset-0 bg-muted animate-pulse rounded-full" />
      )}
      <Image
        src={imageSrc}
        alt={alt}
        width={finalWidth}
        height={finalHeight}
        className="object-cover rounded-full"
        onError={() => {
          setHasError(true)
          setIsLoading(false)
        }}
        onLoad={() => setIsLoading(false)}
        priority={false}
        unoptimized={imageSrc === fallback} // Don't optimize placeholder SVGs
      />
    </div>
  )
}