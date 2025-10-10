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
  
  // Process image source to ensure it loads properly
  let processedSrc = src
  if (src) {
    // Handle DexScreener URLs
    if (src.includes('dd.dexscreener.com')) {
      // Ensure the URL has a proper https:// prefix if missing
      if (!src.startsWith('http')) {
        processedSrc = `https://${src}`
      }
    }
    
    // Handle other potential issues with URLs
    if (src.startsWith('//')) {
      processedSrc = `https:${src}`
    }
    
    // Handle IPFS URLs
    if (src.startsWith('ipfs://')) {
      processedSrc = `https://ipfs.io/ipfs/${src.replace('ipfs://', '')}`
    }
    
    // Handle arweave URLs
    if (src.startsWith('ar://')) {
      processedSrc = `https://arweave.net/${src.replace('ar://', '')}`
    }
    
    // Debug image URL in development
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`Original token image URL: ${src}`)
      console.debug(`Processed token image URL: ${processedSrc}`)
    }
  }
  
  const imageSrc = (hasError || !processedSrc) ? fallback : processedSrc

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
        onError={(e) => {
          console.warn(`Failed to load token image: ${src}`, e);
          // Try direct load with unoptimized image if it failed
          setHasError(true);
          setIsLoading(false);
        }}
        onLoad={() => setIsLoading(false)}
        priority={false}
        unoptimized={true} // Disable Next.js image optimization for all token images to avoid potential issues
        referrerPolicy="no-referrer" // Don't send referrer info to external domains
      />
    </div>
  )
}