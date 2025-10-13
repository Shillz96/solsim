"use client"

import { useEffect } from "react"
import { formatNumber } from "@/lib/format"
import { EnhancedCard, CardGrid, CardSection } from "@/components/ui/enhanced-card-system"
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
// ✅ Import standardized components instead of manual formatting
import { PriceCell, MoneyCell } from "@/components/ui/table-cells"
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
  
  // Format numbers for display using the global formatter
  const formatNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined) return 'N/A'
    return formatNumber(num)
  }

  if (isLoading) {
    return (
      <EnhancedCard className="p-4 mb-4 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
        <span className="text-muted-foreground">Loading token information...</span>
      </EnhancedCard>
    )
  }

  if (error || !tokenDetails) {
    return (
      <EnhancedCard className="p-4 mb-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load token information: {error instanceof Error ? error.message : "Unknown error"}
          </AlertDescription>
        </Alert>
      </EnhancedCard>
    )
  }

  const priceChange = livePrice?.change24h || (tokenDetails.priceChange24h ? Number(tokenDetails.priceChange24h) : null)
  const isPositiveChange = priceChange !== undefined && priceChange !== null && priceChange > 0
  const isNegativeChange = priceChange !== undefined && priceChange !== null && priceChange < 0
  
  // Get SOL price for equivalents
  const solPrice = livePrices.get('So11111111111111111111111111111111111111112')?.price || 0
  
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
    <EnhancedCard className="relative overflow-hidden border border-border/50 bg-card/50 backdrop-blur-sm">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-blue-500/5 opacity-50"></div>
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-blue-500"></div>
      
      <div className="relative z-10 p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 overflow-hidden">
          <div className="flex items-center">
            <div className="relative">
              <TokenImage 
                src={tokenDetails.imageUrl || tokenDetails.logoURI} 
                alt={tokenDetails.name || 'Token'} 
                size={56}
                className="mr-4 ring-2 ring-primary/20 ring-offset-2 ring-offset-background"
              />
              {tokenDetails.isNew && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              )}
              {tokenDetails.isTrending && (
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              )}
            </div>
            
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                  {tokenDetails.symbol}
                </h1>
                <Badge variant="outline" className="h-7 px-3 font-medium bg-muted/50 backdrop-blur-sm">
                  {tokenDetails.name}
                </Badge>
                
                {tokenDetails.isNew && (
                  <Badge variant="default" className="bg-blue-600 hover:bg-blue-700 animate-pulse">
                    🔥 New
                  </Badge>
                )}
                
                {tokenDetails.isTrending && (
                  <Badge variant="default" className="bg-green-600 hover:bg-green-700 animate-pulse">
                    📈 Trending
                  </Badge>
                )}
              </div>
              
              <div className="text-sm text-muted-foreground font-mono truncate max-w-[300px] mt-2 bg-muted/30 px-2 py-1 rounded">
                {tokenAddress}
              </div>
              
              {/* Enhanced Social Links */}
              <div className="flex gap-2 mt-3">
                <TooltipProvider>
                  {websites.slice(0, 1).map((website: string, index: number) => (
                    <Tooltip key={index}>
                      <TooltipTrigger asChild>
                        <Link 
                          href={website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          <Button variant="outline" size="sm" className="h-8 w-8 p-0 bg-background/50 hover:bg-primary/20 transition-all duration-200">
                            <Globe className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Website</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                  
                  {socials.slice(0, 2).map((social: string, index: number) => (
                    <Tooltip key={`social-${index}`}>
                      <TooltipTrigger asChild>
                        <Link 
                          href={social} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          <Button variant="outline" size="sm" className="h-8 w-8 p-0 bg-background/50 hover:bg-primary/20 transition-all duration-200">
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
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0 bg-background/50 hover:bg-primary/20 transition-all duration-200">
                          <ExternalLink className="h-4 w-4" />
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
          
          {/* ✅ Enhanced Metrics Section with Standardized Components */}
          <div className="flex flex-wrap items-center gap-6 ml-auto">
            <div className="text-center p-4 bg-muted/30 rounded-lg backdrop-blur-sm">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Price</div>
              <div className="flex items-center gap-2">
                {/* ✅ Use PriceCell for standardized price display with SOL equivalent */}
                <PriceCell 
                  priceUsd={currentPrice}
                  priceChangePercent={priceChange || undefined}
                  className="text-xl font-mono font-bold"
                  showSolEquiv={true}
                />
                {priceChange !== undefined && priceChange !== null && (
                  <div className={`flex items-center text-sm px-2 py-1 rounded-full ${
                    isPositiveChange 
                      ? 'text-green-400 bg-green-500/10' 
                      : isNegativeChange 
                        ? 'text-red-400 bg-red-500/10' 
                        : 'text-muted-foreground bg-muted/20'
                  }`}>
                    {isPositiveChange && <TrendingUp className="h-3 w-3 mr-1" />}
                    {isNegativeChange && <TrendingDown className="h-3 w-3 mr-1" />}
                    <AnimatedNumber
                      value={priceChange}
                      prefix={priceChange >= 0 ? "+" : ""}
                      suffix="%"
                      decimals={2}
                      colorize={false}
                    />
                  </div>
                )}
              </div>
            </div>
            
            {tokenDetails.marketCapUsd && (
              <div className="text-center p-4 bg-muted/30 rounded-lg backdrop-blur-sm">
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Market Cap</div>
                {/* ✅ Use MoneyCell for market cap with SOL equivalent */}
                <MoneyCell 
                  usd={Number(tokenDetails.marketCapUsd)}
                  className="text-lg font-mono font-bold"
                  hideSolEquiv={false}
                />
              </div>
            )}
            
            {tokenDetails.volume24h && (
              <div className="text-center p-4 bg-muted/30 rounded-lg backdrop-blur-sm">
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">24h Volume</div>
                {/* ✅ Use MoneyCell for volume with SOL equivalent */}
                <MoneyCell 
                  usd={Number(tokenDetails.volume24h)}
                  className="text-lg font-mono font-bold"
                  hideSolEquiv={false}
                />
              </div>
            )}
            
            {tokenDetails.liquidityUsd && (
              <div className="text-center p-4 bg-muted/30 rounded-lg backdrop-blur-sm">
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Liquidity</div>
                {/* ✅ Use MoneyCell for liquidity with SOL equivalent */}
                <MoneyCell 
                  usd={Number(tokenDetails.liquidityUsd)}
                  className="text-lg font-mono font-bold"
                  hideSolEquiv={false}
                />
              </div>
            )}
          </div>
        </div>
        
        {/* Enhanced Additional Details Section */}
        <div className="mt-6 pt-4 border-t border-border/50 flex flex-wrap gap-x-8 gap-y-3 text-sm">
          {tokenDetails.holderCount && (
            <div className="flex items-center gap-2 px-3 py-2 bg-muted/20 rounded-lg">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Holders:</span>
              <span className="font-semibold">{Number(tokenDetails.holderCount).toLocaleString()}</span>
            </div>
          )}
          
          {tokenDetails.firstSeenAt && (
            <div className="flex items-center gap-2 px-3 py-2 bg-muted/20 rounded-lg">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">First Seen:</span>
              <span className="font-semibold">{formatTimestamp(tokenDetails.firstSeenAt)}</span>
            </div>
          )}
          
          {websites.length > 0 && websites[0] && (
            <div className="flex items-center gap-2 px-3 py-2 bg-muted/20 rounded-lg">
              <Globe className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Website:</span>
              <Link 
                href={websites[0]} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline truncate max-w-[200px] font-semibold"
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
              <Badge variant="secondary" className="flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-secondary/80 transition-colors bg-primary/10 hover:bg-primary/20">
                <ExternalLink className="h-4 w-4" />
                View on DexScreener
              </Badge>
            </Link>
          </div>
        </div>
      </div>
    </EnhancedCard>
  )
}