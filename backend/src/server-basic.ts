import express from 'express';
import cors from 'cors';
import { config } from './config/environment.js';
import { logger } from './utils/logger.js';

const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API info
app.get('/api/version', (req, res) => {
  res.json({
    version: '1.0.0',
    apiVersion: 'v1',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Basic error handler
app.use((err: any, req: any, res: any, next: any) => {
  logger.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

const port = config.port || 4002;

app.listen(port, () => {
  logger.info('='.repeat(50));
  logger.info(`🚀 SolSim Backend Server (Basic) Started`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Server: http://localhost:${port}`);
  logger.info(`Health: http://localhost:${port}/health`);
  logger.info('='.repeat(50));
});

export default app;