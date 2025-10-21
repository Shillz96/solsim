import withSerwistInit from '@serwist/next'
import withBundleAnalyzer from '@next/bundle-analyzer'

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable strict mode for now to prevent WebSocket double-mounting issues in production
  // TODO: Re-enable once WebSocket provider is more resilient to rapid mount/unmount cycles
  reactStrictMode: false,

  // Experimental features - 2025 Modernization
  experimental: {
    // View Transitions API - Buttery smooth page transitions
    viewTransition: true,

    // React Compiler - Auto-optimizes components (disabled for now to fix build issues)
    // reactCompiler: {
    //   compilationMode: 'annotation',
    // },
  },

  // Production optimizations
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Image optimization
  images: {
    // Allow all external images - no domain restrictions
    unoptimized: false, // Keep optimization enabled
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Allow all HTTPS domains
      },
      {
        protocol: 'http',
        hostname: '**', // Allow all HTTP domains (for development)
      }
    ],
    // Add dangerouslyAllowSVG for token logos that might be SVG
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // TypeScript and ESLint configuration
  typescript: {
    ignoreBuildErrors: false, // Enable type checking for better code quality
  },
  eslint: {
    ignoreDuringBuilds: true, // Temporarily ignore ESLint during builds
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

  // Set output file tracing root to fix lockfile warning
  outputFileTracingRoot: process.cwd(),

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

export default bundleAnalyzer(withSerwist(nextConfig))
