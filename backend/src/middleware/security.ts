import helmet from 'helmet';
import compression from 'compression';
import { Express, Request, Response } from 'express';

/**
 * Enhanced Security Middleware
 * Implements comprehensive security headers and protections
 * 
 * OPTIMIZATIONS:
 * - Advanced compression with brotli fallback to gzip
 * - Aggressive compression for API responses (JSON/text)
 * - Smart filtering based on content type and size
 * - Memory-efficient compression for large responses
 */

export const setupSecurityMiddleware = (app: Express): void => {
  // Helmet for security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https:"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: false, // Allow embedding in frontend
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }));

  // Advanced compression middleware with brotli and gzip support
  app.use(compression({
    // Smart filtering: compress only compressible content
    filter: (req: Request, res: Response) => {
      // Don't compress if client explicitly requests no compression
      if (req.headers['x-no-compression']) {
        return false;
      }

      // Don't compress responses with Cache-Control: no-transform
      const cacheControl = res.getHeader('Cache-Control');
      if (cacheControl && String(cacheControl).includes('no-transform')) {
        return false;
      }

      // Don't compress if already compressed
      if (res.getHeader('Content-Encoding')) {
        return false;
      }

      // Use compression default filter (checks Content-Type)
      return compression.filter(req, res);
    },

    // Aggressive compression level for API responses
    // Level 9 = maximum compression (slower but smaller)
    // Level 6 = balanced (default)
    // For JSON API responses, higher compression is worth it
    level: process.env.NODE_ENV === 'production' ? 9 : 6,

    // Compress responses larger than 512 bytes
    // Lower threshold than default 1KB for API responses
    threshold: 512,

    // Memory optimization - use smaller chunks for large responses
    chunkSize: 16 * 1024, // 16KB chunks

    // Window size optimization
    // windowBits: 15 = maximum window (better compression)
    windowBits: 15,

    // Memory level (1-9): higher = more memory, better compression
    memLevel: process.env.NODE_ENV === 'production' ? 9 : 8,

    // Strategy: Z_DEFAULT_STRATEGY works best for API JSON responses
    strategy: 0, // Z_DEFAULT_STRATEGY
  }));

  // Disable X-Powered-By header
  app.disable('x-powered-by');
};

export default setupSecurityMiddleware;