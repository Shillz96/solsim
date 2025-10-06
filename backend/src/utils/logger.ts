import winston from 'winston';
import path from 'path';

// Use process.cwd() as base directory for logs
const logsDir = path.join(process.cwd(), 'logs');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  verbose: 'cyan',
  debug: 'blue',
  silly: 'gray'
};

// Tell winston about our colors
winston.addColors(colors);

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    
    // Add metadata if present
    if (Object.keys(metadata).length > 0) {
      // Remove circular references for safe stringification
      const safeMetadata = JSON.stringify(metadata, (key, value) => {
        if (key === 'req' || key === 'res' || key === 'socket') {
          return '[Circular]';
        }
        return value;
      }, 2);
      
      if (safeMetadata !== '{}') {
        msg += ` ${safeMetadata}`;
      }
    }
    
    return msg;
  })
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    
    // Add metadata in development
    if (process.env.NODE_ENV === 'development' && Object.keys(metadata).length > 0) {
      const safeMetadata = JSON.stringify(metadata, (key, value) => {
        if (key === 'req' || key === 'res' || key === 'socket' || key === 'stack') {
          return '[Omitted]';
        }
        return value;
      }, 2);
      
      if (safeMetadata !== '{}') {
        msg += `\n${safeMetadata}`;
      }
    }
    
    return msg;
  })
);

// Define which transports to use
const transports: winston.transport[] = [];

// Always use console transport
transports.push(
  new winston.transports.Console({
    format: process.env.NODE_ENV === 'production' ? format : consoleFormat,
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug')
  })
);

// Add file transport in production
if (process.env.NODE_ENV === 'production') {
  
  // Error log file
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );
  
  // Combined log file
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );
  
  // Trade-specific log file
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'trades.log'),
      level: 'info',
      format: winston.format.combine(
        winston.format.printf((info: any) => {
          // Only log trade-related messages
          if (info.message?.includes('trade') || info.message?.includes('Trade')) {
            return `${info.timestamp} [${info.level}]: ${info.message}`;
          }
          return '';
        })
      ),
      maxsize: 5242880, // 5MB
      maxFiles: 10
    })
  );
}

// Create the logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  levels,
  transports,
  exitOnError: false
});

// Create a stream object for Morgan HTTP logger
export const stream = {
  write: (message: string) => {
    logger.http(message.trim());
  }
};

/**
 * Log trade execution
 */
export const logTrade = (userId: string, trade: any) => {
  logger.info('Trade executed', {
    userId,
    action: trade.action,
    tokenAddress: trade.tokenAddress,
    amount: trade.amount,
    price: trade.price,
    timestamp: new Date().toISOString()
  });
};

/**
 * Log API request
 */
export const logRequest = (req: any, responseTime: number, statusCode: number) => {
  const message = `${req.method} ${req.originalUrl} ${statusCode} ${responseTime}ms`;
  
  const metadata = {
    method: req.method,
    url: req.originalUrl,
    statusCode,
    responseTime,
    ip: req.ip,
    userAgent: req.get('user-agent')
  };
  
  if (statusCode >= 500) {
    logger.error(message, metadata);
  } else if (statusCode >= 400) {
    logger.warn(message, metadata);
  } else {
    logger.http(message, metadata);
  }
};

/**
 * Log database query
 */
export const logDatabaseQuery = (query: string, duration: number, error?: Error) => {
  const metadata = {
    query: query.substring(0, 200), // Truncate long queries
    duration,
    error: error?.message
  };
  
  if (error) {
    logger.error('Database query failed', metadata);
  } else if (duration > 1000) {
    logger.warn('Slow database query detected', metadata);
  } else {
    logger.debug('Database query executed', metadata);
  }
};

/**
 * Log WebSocket event
 */
export const logWebSocketEvent = (event: string, socketId: string, data?: any) => {
  logger.debug(`WebSocket ${event}`, {
    socketId,
    event,
    data: data ? JSON.stringify(data).substring(0, 100) : undefined
  });
};

/**
 * Log performance metric
 */
export const logPerformance = (metric: string, value: number, threshold?: number) => {
  const metadata = {
    metric,
    value,
    threshold,
    exceeded: threshold ? value > threshold : false
  };
  
  if (threshold && value > threshold) {
    logger.warn(`Performance threshold exceeded: ${metric}`, metadata);
  } else {
    logger.debug(`Performance metric: ${metric}`, metadata);
  }
};

/**
 * Replace console methods in production
 */
if (process.env.NODE_ENV === 'production') {
  console.log = (...args) => logger.info(args.join(' '));
  console.info = (...args) => logger.info(args.join(' '));
  console.warn = (...args) => logger.warn(args.join(' '));
  console.error = (...args) => logger.error(args.join(' '));
  console.debug = (...args) => logger.debug(args.join(' '));
}

// Export logger instance and utility functions
export { logger };
export default logger;