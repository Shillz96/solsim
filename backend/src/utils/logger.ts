// Centralized logging utility using Pino
import pino from 'pino';

// Create logger with appropriate configuration
const logger = pino({
  transport: process.env.NODE_ENV === 'production'
    ? undefined  // No transport in production (use JSON)
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname'
        }
      },
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { level: label };
    }
  }
});

// Create child loggers for different components
export const loggers = {
  server: logger.child({ component: 'server' }),
  priceService: logger.child({ component: 'price-service' }),
  websocket: logger.child({ component: 'websocket' }),
  trade: logger.child({ component: 'trade' }),
  portfolio: logger.child({ component: 'portfolio' }),
  auth: logger.child({ component: 'auth' }),
  redis: logger.child({ component: 'redis' }),
  database: logger.child({ component: 'database' }),
};

export default logger;
