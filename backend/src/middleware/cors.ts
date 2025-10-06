import cors from 'cors';
import { config } from '../config/environment';

// Simplified CORS configuration
const allowedOrigins = config.frontendOrigin.includes(',') 
  ? config.frontendOrigin.split(',').map(o => o.trim())
  : [config.frontendOrigin];

// Add Vercel deployment URLs for testing
allowedOrigins.push(
  'https://frontend-hceyamb4j-shillz96s-projects.vercel.app'
);

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    // Check for exact matches or Vercel pattern
    if (allowedOrigins.includes(origin) || 
        origin.match(/^https:\/\/frontend-.*\.vercel\.app$/)) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-dev-user-id', 'x-dev-email'],
  maxAge: 86400, // 24 hours
});