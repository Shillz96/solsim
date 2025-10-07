import cors from 'cors';
import { config } from '../config/environment.js';

// Simplified CORS configuration
const allowedOrigins = config.frontendOrigin.includes(',') 
  ? config.frontendOrigin.split(',').map(o => o.trim())
  : [config.frontendOrigin];

// Add Vercel deployment URLs dynamically
// Production URL should be added via FRONTEND_ORIGIN environment variable

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    // Check for exact matches
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Check for Vercel patterns (more flexible matching)
    if (origin.match(/^https:\/\/.*\.vercel\.app$/) || 
        origin.match(/^https:\/\/frontend-.*\.vercel\.app$/) ||
        origin.includes('vercel.app')) {
      return callback(null, true);
    }
    
    // Allow localhost for development
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-dev-user-id', 'x-dev-email'],
  maxAge: 86400, // 24 hours
});