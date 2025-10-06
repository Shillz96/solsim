import withSerwistInit from '@serwist/next'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable strict mode for better development experience
  reactStrictMode: true,
  
  // React Compiler (Experimental) - Auto-optimizes components
  // Temporarily disabled to fix build issues
  // experimental: {
  //   reactCompiler: {
  //     compilationMode: 'annotation',
  //   },
  // },

  // Production optimizations
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Image optimization
  images: {
    domains: [
      'cf-ipfs.com', 
      'pump.fun',
      'raw.githubusercontent.com', // Solana token list
      'arweave.net', // Arweave storage
      'ipfs.io', // IPFS gateway
      'gateway.pinata.cloud', // Pinata IPFS gateway
      'cloudflare-ipfs.com', // Cloudflare IPFS gateway
      'thumbnails.padre.gg', // Padre thumbnails
      'static.four.meme', // Four.meme static assets
      'pbs.twimg.com', // Twitter/X images
      'abs.twimg.com', // Twitter/X images
      'ton.twimg.com', // Twitter/X images
      'video.twimg.com', // Twitter/X video thumbnails
      'img.freepik.com', // Freepik images
      'images.unsplash.com', // Unsplash images
      'cdn.pixabay.com', // Pixabay images
      'i.imgur.com', // Imgur images
      'imgur.com', // Imgur images
      'assets.coingecko.com', // CoinGecko token images
      'coin-images.coingecko.com', // CoinGecko images
      'logos.covalenthq.com', // Covalent logos
      'raw.githubusercontent.com', // GitHub raw files
      'github.com', // GitHub avatars
      'avatars.githubusercontent.com', // GitHub avatars
      'solana.fm', // Solana FM images
      'metadata.rapidlaunch.io', // RapidLaunch metadata
      'axiomtrading.sfo3.cdn.digitaloceanspaces.com', // Axiom Trading CDN
      'bafkreicmjcpd2qvd4qkbyizboo5tdy5uhbu5zx3xrbjsipoinbysu5fv2q.ipfs.nftstorage.link', // IPFS storage
      'bafkreihhmsmmcxmzl3gcmqu52myrbtvj7iogqofrylm4p7gmofvfob65zy.ipfs.nftstorage.link', // IPFS storage
      'bafybeicqiiqq6bbrrvrlv2j7aanopwyrcgcdudbhvkukpdu5cw3a2turaa.ipfs.nftstorage.link', // IPFS storage
      'bafkreicd5ijwhv5bzcpso5p5sqsc7efgg5f5vedg5fzupsl6i4c3tjhyvi.ipfs.nftstorage.link', // IPFS storage
      'bafybeiaoa7pw52xbsomr2klv3tg37ka6bjwekvugssvxz2twsnaupkg7lu.ipfs.nftstorage.link' // IPFS storage
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.ipfs.nftstorage.link',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.ipfs.dweb.link',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'bafkrei*.ipfs.nftstorage.link',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'bafybei*.ipfs.nftstorage.link',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'static.four.meme',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'thumbnails.padre.gg',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.twimg.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.imgur.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.coingecko.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.githubusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.pixabay.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.freepik.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.cdn.digitaloceanspaces.com',
        port: '',
        pathname: '/**',
      }
    ],
    formats: ['image/avif', 'image/webp'],
    unoptimized: false, // Enable optimization for better performance
  },

  // TypeScript and ESLint configuration
  typescript: {
    ignoreBuildErrors: false, // Enable type checking for better code quality
  },
  eslint: {
    ignoreDuringBuilds: false, // Enable linting for better code quality
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
  ],
})

export default withSerwist(nextConfig)
