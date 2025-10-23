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
  // Disable strict mode for now to prevent WebSocket double-mounting issues in production
  // TODO: Re-enable once WebSocket provider is more resilient to rapid mount/unmount cycles
  reactStrictMode: false,

  // Experimental features - 2025 Modernization
  experimental: {
    // Optimize package imports for better tree-shaking
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      'recharts',
      'framer-motion',
      '@radix-ui/react-icons',
    ],
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

    // Ensure styled-jsx is bundled in serverless functions (Vercel fix)
    if (isServer) {
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        // Don't externalize styled-jsx - bundle it instead
        config.externals = config.externals.filter(
          (external) => typeof external !== 'string' || !external.includes('styled-jsx')
        );
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
  disable: true, // Temporarily disable to debug 500 errors
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
    // Vercel Analytics - Don't intercept these scripts
    /_vercel\/insights/,
    /_vercel\/speed-insights/,
  ],
})

export default withBundleAnalyzer(withSerwist(nextConfig))
