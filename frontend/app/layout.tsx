import { Metadata } from 'next'
import ClientLayout from './client-layout'
import './theme.css'
import './globals.css'
import './wallet-modal-override.css'
import { cn } from "@/lib/utils"

// Use VERCEL_URL for preview deployments, fallback to custom domain for production
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL 
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://oneupsol.fun')

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: '1UP SOL - Mario-themed Solana Paper Trading',
    template: '%s | 1UP SOL',
  },
  description: '1UP your Solana trading skills! Mario-themed paper trading game with real-time prices, FIFO accounting, and earn rewards. Practice trading without risk!',
  keywords: [
    'Solana',
    'paper trading',
    'crypto trading',
    'Mario',
    'trading game',
    'practice trading',
    'SOL',
    'cryptocurrency',
    'pump.fun',
    'meme coins',
    'trading simulator'
  ],
  authors: [{ name: '1UP SOL Team' }],
  creator: '1UP SOL',
  publisher: '1UP SOL',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: '1UP SOL',
    title: '1UP SOL - Mario-themed Solana Paper Trading',
    description: '1UP your Solana trading skills! Mario-themed paper trading game with real-time prices, FIFO accounting, and earn rewards. Practice trading without risk!',
    images: [
      {
        url: '/og-banner.png',
        width: 1200,
        height: 630,
        alt: '1UP SOL - Mario-themed Solana Paper Trading Game',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@1upsolfun',
    creator: '@1upsolfun',
    title: '1UP SOL - Mario-themed Solana Paper Trading',
    description: '1UP your Solana trading skills! Mario-themed paper trading game with real-time prices, FIFO accounting, and earn rewards. Practice trading without risk!',
    images: ['/og-banner.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-32x32.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  themeColor: '#FFFAE9',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className={cn("h-full bg-background text-foreground antialiased")}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}
