/**
 * Type Declarations for Chat System
 * 
 * Extends Fastify and WebSocket types with custom properties
 */

import 'fastify';
import 'ws';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      userTier: string;
      sessionId: string;
    };
  }

  interface FastifyInstance {
    prisma: typeof import('@prisma/client').PrismaClient.prototype;
  }
}

declare module 'ws' {
  interface WebSocket {
    isAlive?: boolean;
  }
}
