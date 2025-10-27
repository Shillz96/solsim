import { WebSocketServer } from "ws";
import type { IncomingMessage } from "http";
import { loggers } from '../utils/logger.js';

const logger = loggers.websocket;

/**
 * Railway-safe WebSocket server with proper heartbeat implementation
 * 
 * Key features:
 * - 25s ping interval (safe for Railway proxy timeouts)
 * - Proper connection lifecycle management
 * - Graceful termination of dead connections
 * - Origin validation support (TODO)
 * - Token-based auth support (TODO)
 */
export function startWsServer(server: any) {
  const wss = new WebSocketServer({ 
    server, 
    path: "/prices",
    // Additional Railway-safe options
    perMessageDeflate: false, // Reduces CPU overhead
    maxPayload: 64 * 1024,    // 64KB max message size
  });

  logger.info("WebSocket server starting on /prices with Railway-safe heartbeat");

  wss.on("connection", (ws, req: IncomingMessage) => {
    const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    
    logger.debug({ clientIP, userAgent }, `Client connected from ${clientIP}`);
    
    // TODO: Validate token or origin if needed
    // const token = req.headers.authorization;
    // const origin = req.headers.origin;
    
    // Mark connection as alive for heartbeat tracking
    (ws as any).isAlive = true;
    (ws as any).connectedAt = Date.now();

    // Handle pong responses from client heartbeat checks
    ws.on("pong", function heartbeat() {
      (this as any).isAlive = true;
      console.log(`💓 Received pong from client ${clientIP}`);
    });

    // Handle client messages (subscriptions, etc.)
    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        // Handle client-initiated ping
        if (message.t === "ping" || message.type === "ping") {
          ws.send(JSON.stringify({ 
            t: "pong", 
            ts: Date.now() 
          }));
          return;
        }

        // Handle subscription requests
        if (message.t === "subscribe" || message.type === "subscribe") {
          const { mint } = message;
          if (mint) {
            console.log(`📡 Client ${clientIP} subscribed to ${mint}`);
            // TODO: Add to subscription tracking
          }
        }

        if (message.t === "unsubscribe" || message.type === "unsubscribe") {
          const { mint } = message;
          if (mint) {
            console.log(`📡 Client ${clientIP} unsubscribed from ${mint}`);
            // TODO: Remove from subscription tracking
          }
        }

      } catch (error) {
        console.error(`❌ Failed to parse message from ${clientIP}:`, error);
      }
    });

    // Handle connection close
    ws.on("close", (code, reason) => {
      const duration = Date.now() - (ws as any).connectedAt;
      console.log(`🔌 Client ${clientIP} disconnected after ${Math.round(duration/1000)}s (code: ${code}, reason: ${reason})`);
      // TODO: Clean up subscriptions
    });

    // Handle connection errors
    ws.on("error", (error) => {
      console.error(`❌ WebSocket error from ${clientIP}:`, error);
    });

    // Send initial hello message
    try {
      ws.send(JSON.stringify({ 
        t: "hello", 
        message: "connected", 
        ts: Date.now() 
      }));
    } catch (error) {
      console.error(`❌ Failed to send hello to ${clientIP}:`, error);
    }
  });

  // Railway-safe health check interval (25s)
  // This prevents proxy timeouts while being gentle on resources
  const heartbeatInterval = setInterval(() => {
    let activeConnections = 0;
    let terminatedConnections = 0;

    wss.clients.forEach((ws: any) => {
      if (ws.isAlive === false) {
        console.log(`💀 Terminating dead connection`);
        ws.terminate();
        terminatedConnections++;
        return;
      }
      
      // Mark as potentially dead, ping will reset this
      ws.isAlive = false;
      
      try {
        ws.ping();
        activeConnections++;
      } catch (error) {
        console.error(`❌ Failed to ping client:`, error);
        ws.terminate();
        terminatedConnections++;
      }
    });

    if (activeConnections > 0 || terminatedConnections > 0) {
      console.log(`💓 Heartbeat: ${activeConnections} active, ${terminatedConnections} terminated`);
    }
  }, 25000); // 25 seconds - safe for Railway and most proxies

  // Graceful shutdown handling
  const cleanup = () => {
    console.log("🧹 Shutting down WebSocket server...");
    clearInterval(heartbeatInterval);
    
    wss.clients.forEach((ws) => {
      ws.close(1001, "Server shutting down");
    });
    
    wss.close(() => {
      console.log("✅ WebSocket server shut down gracefully");
    });
  };

  // Handle process signals for graceful shutdown
  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);

  return {
    wss,
    cleanup,
    // Helper to broadcast price updates
    broadcastPrice: (priceData: {
      mint: string;
      priceLamports: string;
      seq: number;
      ts?: number;
    }) => {
      const message = JSON.stringify({
        t: "price",
        d: {
          v: 1,
          seq: priceData.seq,
          mint: priceData.mint,
          priceLamports: priceData.priceLamports,
          ts: priceData.ts || Date.now()
        }
      });

      let sent = 0;
      let failed = 0;

      wss.clients.forEach((ws) => {
        if (ws.readyState === ws.OPEN) {
          try {
            ws.send(message);
            sent++;
          } catch (error) {
            console.error(`❌ Failed to send price update:`, error);
            failed++;
          }
        }
      });

      if (sent > 0) {
        console.log(`📊 Broadcasted price update for ${priceData.mint} to ${sent} clients${failed > 0 ? ` (${failed} failed)` : ''}`);
      }
    }
  };
}