import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Social media crawler user agents that should bypass security
const SOCIAL_CRAWLERS = [
  'facebookexternalhit',
  'Twitterbot',
  'LinkedInBot',
  'WhatsApp',
  'TelegramBot',
  'Slackbot',
  'Discordbot',
  'SkypeUriPreview',
  'AppleBot', // iMessage
  'iMessageBot',
  'Googlebot',
  'bingbot',
]

export function middleware(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') || ''
  
  // Check if it's a social media crawler
  const isSocialCrawler = SOCIAL_CRAWLERS.some(crawler => 
    userAgent.toLowerCase().includes(crawler.toLowerCase())
  )
  
  // If it's a social crawler accessing the home page or OG image, allow through
  if (isSocialCrawler && (
    request.nextUrl.pathname === '/' || 
    request.nextUrl.pathname.includes('og-banner.png')
  )) {
    // Add header to bypass Vercel security
    const response = NextResponse.next()
    response.headers.set('x-vercel-skip-challenge', '1')
    return response
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/',
    '/og-banner.png',
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
