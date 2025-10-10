"use client"

import { useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  ExternalLink, 
  TrendingUp, 
  TrendingDown, 
  Loader2, 
  AlertCircle,
  Globe, 
  Twitter, 
  MessageSquare,
  Clock,
  Users,
} from "lucide-react"
import { AnimatedNumber } from "@/components/ui/animated-number"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { TokenImage } from "@/components/ui/token-image"
import { usePriceStreamContext } from "@/lib/price-stream-provider"
import { useTokenMetadata } from "@/hooks/use-token-metadata"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface TokenDetailsHeaderProps {
  tokenAddress: string
}

export function TokenDetailsHeader({ tokenAddress }: TokenDetailsHeaderProps) {
  // Fetch token details using the token metadata hook
  const { data: tokenDetails, isLoading, error } = useTokenMetadata(tokenAddress, !!tokenAddress)
  
  // Real-time price stream integration
  const { connected: wsConnected, prices: livePrices, subscribe, unsubscribe } = usePriceStreamContext()
  
  // Subscribe to price updates for this token
  useEffect(() => {
    if (!tokenAddress || !wsConnected) return
    
    subscribe(tokenAddress)
    
    return () => {
      if (wsConnected) {
        unsubscribe(tokenAddress)
      }
    }
  }, [tokenAddress, wsConnected, subscribe, unsubscribe])
  
  // Get current price from WebSocket or fallback to API data
  const livePrice = livePrices.get(tokenAddress)
  // Ensure currentPrice is always a number for AnimatedNumber component
  const currentPrice = livePrice?.price || tokenDetails?.price || Number(tokenDetails?.lastPrice) || 0
  
  // Format numbers for display
  const formatNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined) return 'N/A'
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`
    return `$${num.toLocaleString()}`
  }

  if (isLoading) {
    return (
      <Card className="p-4 mb-4 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
        <span className="text-muted-foreground">Loading token information...</span>
      </Card>
    )
  }

  if (error || !tokenDetails) {
    return (
      <Card className="p-4 mb-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load token information: {error instanceof Error ? error.message : "Unknown error"}
          </AlertDescription>
        </Alert>
      </Card>
    )
  }

  const priceChange = livePrice?.change24h || (tokenDetails.priceChange24h ? Number(tokenDetails.priceChange24h) : null)
  const isPositiveChange = priceChange !== undefined && priceChange !== null && priceChange > 0
  const isNegativeChange = priceChange !== undefined && priceChange !== null && priceChange < 0
  
  // Debug logging for token image URL - helpful for troubleshooting
  if (process.env.NODE_ENV !== 'production') {
    console.debug(`Token ${tokenDetails.symbol} image URL: ${tokenDetails.imageUrl || tokenDetails.logoURI || 'not available'}`)
  }

  // Parse social links
  const parseSocials = () => {
    if (!tokenDetails.socials) return [];
    try {
      return JSON.parse(tokenDetails.socials);
    } catch {
      return [];
    }
  };

  // Parse websites
  const parseWebsites = () => {
    if (!tokenDetails.websites) return [];
    try {
      return JSON.parse(tokenDetails.websites);
    } catch {
      return [];
    }
  };

  const websites = parseWebsites();
  const socials = parseSocials();
  
  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp).toLocaleDateString(undefined, { 
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Helper function to get social icon by URL
  const getSocialIcon = (url: string) => {
    if (url.includes('twitter.com') || url.includes('x.com')) return <Twitter className="h-4 w-4" />;
    if (url.includes('t.me') || url.includes('telegram')) return <MessageSquare className="h-4 w-4" />;
    return <Globe className="h-4 w-4" />;
  };

  return (
    <Card className="p-4 mb-4">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 overflow-hidden">
        <div className="flex items-center">
          <TokenImage 
            src={tokenDetails.imageUrl || tokenDetails.logoURI} 
            alt={tokenDetails.name || 'Token'} 
            size={48}
            className="mr-4"
          />
          
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{tokenDetails.symbol}</h1>
              <Badge variant="outline" className="h-6">
                {tokenDetails.name}
              </Badge>
              
              {tokenDetails.isNew && (
                <Badge variant="default" className="bg-blue-600 hover:bg-blue-700">
                  New
                </Badge>
              )}
              
              {tokenDetails.isTrending && (
                <Badge variant="default">
                  Trending
                </Badge>
              )}
            </div>
            <div className="text-sm text-muted-foreground truncate max-w-[300px] mt-1">
              {tokenAddress}
            </div>
            
            {/* Social Links */}
            <div className="flex gap-2 mt-2">
              <TooltipProvider>
                {websites.slice(0, 1).map((website: string, index: number) => (
                  <Tooltip key={index}>
                    <TooltipTrigger asChild>
                      <Link 
                        href={website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <Button variant="outline" size="sm" className="h-7 w-7 p-0">
                          <Globe className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Website</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
                
                {socials.map((social: string, index: number) => (
                  <Tooltip key={`social-${index}`}>
                    <TooltipTrigger asChild>
                      <Link 
                        href={social} 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <Button variant="outline" size="sm" className="h-7 w-7 p-0">
                          {getSocialIcon(social)}
                        </Button>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{social.includes('twitter.com') || social.includes('x.com') ? 'Twitter' : 
                         social.includes('t.me') ? 'Telegram' : 'Social'}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link 
                      href={`https://solscan.io/token/${tokenAddress}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm" className="h-7 w-7 p-0">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>View on Solscan</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-6 ml-auto">
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Price</div>
            <div className="flex items-center gap-1">
              <AnimatedNumber
                value={currentPrice}
                prefix="$"
                decimals={currentPrice < 0.001 ? 9 : currentPrice < 1 ? 6 : 2}
                className="text-lg font-mono font-bold"
                glowOnChange={true}
              />
              {priceChange !== undefined && priceChange !== null && (
                <span className={`ml-1 flex items-center text-sm ${isPositiveChange ? 'text-green-500' : isNegativeChange ? 'text-red-500' : ''}`}>
                  {isPositiveChange && <TrendingUp className="h-3 w-3 mr-1" />}
                  {isNegativeChange && <TrendingDown className="h-3 w-3 mr-1" />}
                  <AnimatedNumber
                    value={priceChange}
                    prefix={priceChange >= 0 ? "+" : ""}
                    suffix="%"
                    decimals={2}
                    colorize={false}
                  />
                </span>
              )}
            </div>
          </div>
          
          {tokenDetails.marketCapUsd && (
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Market Cap</div>
              <div className="text-lg font-mono font-bold">
                {formatNumber(Number(tokenDetails.marketCapUsd))}
              </div>
            </div>
          )}
          
          {tokenDetails.volume24h && (
            <div className="text-center">
              <div className="text-sm text-muted-foreground">24h Volume</div>
              <div className="text-lg font-mono font-bold">
                {formatNumber(Number(tokenDetails.volume24h))}
              </div>
            </div>
          )}
          
          {tokenDetails.liquidityUsd && (
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Liquidity</div>
              <div className="text-lg font-mono font-bold">
                {formatNumber(Number(tokenDetails.liquidityUsd))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Additional Details Section */}
      <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-x-8 gap-y-2 text-sm">
        {tokenDetails.holderCount && (
          <div className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Holders:</span>
            <span>{Number(tokenDetails.holderCount).toLocaleString()}</span>
          </div>
        )}
        
        {tokenDetails.firstSeenAt && (
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">First Seen:</span>
            <span>{formatTimestamp(tokenDetails.firstSeenAt)}</span>
          </div>
        )}
        
        {websites.length > 0 && websites[0] && (
          <div className="flex items-center gap-1">
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Website:</span>
            <Link 
              href={websites[0]} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline truncate max-w-[200px]"
            >
              {websites[0].replace(/https?:\/\/(www\.)?/, '')}
            </Link>
          </div>
        )}
        
        <div className="ml-auto">
          <Link 
            href={`https://dexscreener.com/solana/${tokenAddress}`} 
            target="_blank" 
            rel="noopener noreferrer"
          >
            <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1 cursor-pointer hover:bg-secondary/80">
              <ExternalLink className="h-3.5 w-3.5 mr-1" />
              View on DexScreener
            </Badge>
          </Link>
        </div>
      </div>
    </Card>
  )
}