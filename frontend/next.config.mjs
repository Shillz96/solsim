import withSerwistInit from '@serwist/next'

// Make bundle analyzer optional - only load if explicitly analyzing
let withBundleAnalyzer = (config) => config
if (process.env.ANALYZE === 'true') {
  try {
    withBundleAnalyzer = (await import('@next/bundle-analyzer')).default({
      enabled: true,
    })
  } catch (e) {
    console.log('Bundle analyzer not available, skipping...')
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable strict mode for better development checks and React 19 compatibility
  // Fix WebSocket double-mounting with proper useEffect cleanup instead of disabling
  reactStrictMode: true,

  // Experimental features - 2025 Modernization
  experimental: {
    // Optimize package imports for better tree-shaking
    // Note: Radix UI components removed - they're already optimized and loading them here
    // creates a large shared chunk. Better to let Next.js code-split them per-page.
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      'recharts',
      'framer-motion',
      '@solana/web3.js',
      '@solana/wallet-adapter-react',
      '@tabler/icons-react',
    ],
    
    // Type-safe environment variables with IntelliSense (Next.js 15.1+)
    // typedEnv: true, // Temporarily disabled - can cause compilation hangs
  },

  // Production optimizations
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Generate source maps in production for better debugging
  productionBrowserSourceMaps: false,

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    // Allow all HTTPS images in both dev and production since /trending and /warp-pipes
    // load dynamic token images from various external sources (pump.fun, IPFS, CDNs, etc.)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      // Allow HTTP localhost in development
      ...(process.env.NODE_ENV === 'development' ? [{
        protocol: 'http',
        hostname: 'localhost',
      }] : [])
    ],
    // Allow SVG for token logos but with strict CSP
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // TypeScript and ESLint configuration
  typescript: {
    ignoreBuildErrors: false, // Enable type checking for better code quality
  },
  eslint: {
    ignoreDuringBuilds: true, // Skip linting during builds to avoid requiring ESLint in CI
    dirs: ['app', 'components', 'lib'], // Specify directories to lint
  },

  // Headers for security and performance
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
      // Explicit Content-Type for OG image to help Apple Messages, Telegram
      {
        source: '/og-banner.png',
        headers: [
          {
            key: 'Content-Type',
            value: 'image/png',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Headers for dynamic OG images
      {
        source: '/opengraph-image',
        headers: [
          {
            key: 'Content-Type',
            value: 'image/png',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/twitter-image',
        headers: [
          {
            key: 'Content-Type',
            value: 'image/png',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, stale-while-revalidate=86400',
          },
        ],
      },
    ];
  },

  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Ignore pino-pretty (optional dependency used by WalletConnect)
    config.resolve.alias = {
      ...config.resolve.alias,
      'pino-pretty': false,
    };

    // Fallback for Node.js modules not available in browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };

      // Aggressive code splitting strategy for production
      if (process.env.NODE_ENV === 'production') {
        config.optimization = {
          ...config.optimization,
          splitChunks: {
            chunks: 'all',
            cacheGroups: {
              // Separate Solana wallet adapters into their own chunk (40-50KB)
              solanaWallet: {
                test: /[\\/]node_modules[\\/](@solana[\\/]wallet-adapter|@solana[\\/]web3\.js)/,
                name: 'solana-wallet',
                priority: 30,
                reuseExistingChunk: true,
              },
              // Separate Radix UI components (20-30KB)
              radixUI: {
                test: /[\\/]node_modules[\\/]@radix-ui/,
                name: 'radix-ui',
                priority: 25,
                reuseExistingChunk: true,
              },
              // Separate React Query (15-20KB)
              reactQuery: {
                test: /[\\/]node_modules[\\/]@tanstack[\\/]react-query/,
                name: 'react-query',
                priority: 20,
                reuseExistingChunk: true,
              },
              // Default vendors chunk
              defaultVendors: {
                test: /[\\/]node_modules[\\/]/,
                priority: 10,
                reuseExistingChunk: true,
              },
            },
          },
        };
      }
    }

    return config;
  },
}

// Configure Serwist for PWA capabilities
const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  swUrl: '/sw.js',
  cacheOnNavigation: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development', // Disable in development
  exclude: [
    // Don't cache these files
    /\.map$/,
    /manifest$/,
    /\.htaccess$/,
    /_next\/static\/chunks\/pages\/.*\.js$/,
    /_next\/static\/media\/.*\.(png|jpg|jpeg|gif|webp|svg|ico)$/,
    // Backend API routes
    /^\/api\//,
    // WebSocket connections - CRITICAL for preventing WebSocket interference
    /ws:/,
    /wss:/,
    /\/ws\//,
    /railway\.app.*\/ws/,
    // External token image sources that cause CORS issues
    /pump\.fun/,
    /ipfs\.io/,
    /gateway\.pinata\.cloud/,
    /cloudflare-ipfs\.com/,
    /nftstorage\.link/,
    /arweave\.net/,
    // API endpoints that might stream or return invalid responses
    /\/api\/.*\/stream/,
    /\/api\/.*\/events/,
    // Price update endpoints
    /\/ws\/prices/,
    /\/api\/prices/,
    // Real-time data endpoints
    /\/api\/trending/,
    /\/api\/tokens\/.*\/price/,
  ],
})

export default withBundleAnalyzer(withSerwist(nextConfig))
