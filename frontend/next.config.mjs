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
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      'recharts',
      'framer-motion',
      '@radix-ui/react-icons',
      '@solana/web3.js',
      '@solana/wallet-adapter-react',
    ],
    
    // Type-safe environment variables with IntelliSense (Next.js 15.1+)
    typedEnv: true,
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
    remotePatterns: [
      // Pump.fun main domain
      {
        protocol: 'https',
        hostname: 'pump.fun',
      },
      // Pump.fun subdomains (e.g., ipfs.pump.fun)
      {
        protocol: 'https',
        hostname: '**.pump.fun',
      },
      // Solana CDN for token logos
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
        pathname: '/solana-labs/**',
      },
      // IPFS gateways for token metadata
      {
        protocol: 'https',
        hostname: 'ipfs.io',
        pathname: '/ipfs/**',
      },
      {
        protocol: 'https',
        hostname: 'cloudflare-ipfs.com',
        pathname: '/ipfs/**',
      },
      // Additional token metadata sources
      {
        protocol: 'https',
        hostname: 'fidelion.io',
        pathname: '/metadata/**',
      },
      {
        protocol: 'https',
        hostname: 'pump.mypinata.cloud',
        pathname: '/ipfs/**',
      },
      {
        protocol: 'https',
        hostname: 'gateway.irys.xyz',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ipfs.erebrus.io',
        pathname: '/ipfs/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.moonshot.com',
        pathname: '/**',
      },
      // External service logos
      {
        protocol: 'https',
        hostname: 'images.seeklogo.com',
        pathname: '/logo-png/**',
      },
      // Token logo sources
      {
        protocol: 'https',
        hostname: 'static.jup.ag',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cryptologos.cc',
        pathname: '/logos/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.jsdelivr.net',
        pathname: '/gh/trustwallet/assets/**',
      },
      {
        protocol: 'https',
        hostname: 'assets.coingecko.com',
        pathname: '/coins/images/**',
      },
      {
        protocol: 'https',
        hostname: 'coin-images.coingecko.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'arweave.net',
        pathname: '/**',
      },
      // External content providers
      {
        protocol: 'https',
        hostname: 'cdn.prod.website-files.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'xstocks.fi',
        pathname: '/**',
      },
      // Only allow HTTP in development
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
    ignoreDuringBuilds: false, // Enable linting during builds for production quality
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
  ],
})

export default withBundleAnalyzer(withSerwist(nextConfig))
