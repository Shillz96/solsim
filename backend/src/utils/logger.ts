// Centralized logging utility using Pino
import pino from 'pino';

// Use environment variables directly to avoid circular dependency
const isProduction = process.env.NODE_ENV === 'production';
const logLevel = process.env.LOG_LEVEL || 'info';

// Production-ready logger configuration
const logger = pino({
  transport: isProduction
    ? undefined  // No transport in production (use structured JSON)
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
          messageFormat: '{msg}',
          errorProps: 'stack'
        }
      },
  level: logLevel,

  // Redact sensitive information
  redact: {
    paths: [
      'password',
      'passwordHash',
      'token',
      'authorization',
      'secret',
      'wallet',
      'address',
      'signature',
      'privateKey',
      '*.password',
      '*.token',
      '*.secret',
      '*.wallet',
      '*.address',
      '*.signature',
      '*.privateKey',
      'headers.authorization',
      'headers.cookie',
      'headers.x-api-key'
    ],
    remove: false
  },

  // Add metadata
  base: {
    env: process.env.NODE_ENV || 'development',
    pid: process.pid
  },

  // Serializers
  serializers: {
    err: pino.stdSerializers.err,
    req: (req: any) => ({
      id: req.id,
      method: req.method,
      url: req.url,
      remoteAddress: req.ip
    }),
    res: (res: any) => ({
      statusCode: res.statusCode
    })
  },

  formatters: {
    level: (label: any) => {
      return { level: label };
    }
  },

  timestamp: pino.stdTimeFunctions.isoTime
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

// Helper functions
export function logError(logger: pino.Logger, error: Error | unknown, context?: Record<string, any>) {
  if (error instanceof Error) {
    logger.error({ err: error, ...context }, error.message);
  } else {
    logger.error({ error: String(error), ...context }, 'Unknown error');
  }
}

export function auditLog(userId: string, action: string, details: Record<string, any>) {
  loggers.auth.info({ audit: true, userId, action, ...details }, `Audit: ${action} by user ${userId}`);
}

// Production-safe utility functions
export function truncateWallet(address: string, length = 8): string {
  if (!address || address.length <= length) return address;
  return `${address.slice(0, length)}...`;
}

export function logBatchOperation(logger: pino.Logger, operation: string, count: number, duration?: number) {
  // Only log batch operations every 50 operations or if there's an error
  if (count % 50 === 0 || duration && duration > 5000) {
    logger.info({ operation, count, duration }, `Batch operation: ${operation} (${count} items)`);
  }
}

export function logTokenEvent(logger: pino.Logger, event: string, token: string, wallet?: string) {
  // In production, only log significant events, not every token discovery
  if (isProduction && event === 'discovery') {
    // Skip routine token discovery logs in production
    return;
  }
  
  logger.info({ 
    event, 
    token: token.length > 20 ? truncateWallet(token) : token,
    wallet: wallet ? truncateWallet(wallet) : undefined 
  }, `Token ${event}: ${truncateWallet(token)}`);
}

// Replace console methods in production
if (isProduction) {
  console.log = (...args) => logger.info(args.join(' '));
  console.info = (...args) => logger.info(args.join(' '));
  console.warn = (...args) => logger.warn(args.join(' '));
  console.error = (...args) => logger.error(args.join(' '));
  console.debug = (...args) => logger.debug(args.join(' '));
}

export default logger;
