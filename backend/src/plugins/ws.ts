// WebSocket plugin for real-time updates with contract-compliant formatting
import { FastifyInstance } from "fastify";
import priceService from "./priceService-optimized.js";
import { realtimePnLService } from "../services/realtimePnLService.js";
import Redis from "ioredis";

// Redis client for IPC with tokenDiscoveryWorker (runs in separate process)
const redis = new Redis(process.env.REDIS_URL || '');

// Convert SOL price to lamports (for contract compliance)
function solToLamports(solPrice: number): string {
  return Math.round(solPrice * 1_000_000_000).toString();
}

// Global broadcast state
const clients = new Set<any>();
let seq = 0;

// Decorator for broadcasting price ticks
declare module "fastify" {
  interface FastifyInstance {
    broadcastPrice: (tick: { mint: string; priceLamports: string; ts?: number }) => void;
  }
}

export default async function wsPlugin(app: FastifyInstance) {
  // Add broadcast method to Fastify instance
  app.decorate("broadcastPrice", (tick: { mint: string; priceLamports: string; ts?: number }) => {
    const frame = JSON.stringify({ 
      t: "price", 
      d: { 
        v: 1, 
        seq: ++seq, 
        mint: tick.mint, 
        priceLamports: tick.priceLamports, 
        ts: tick.ts ?? Date.now() 
      } 
    });
    
    let sent = 0;
    for (const ws of clients) {
      // @ts-ignore
      if (ws.readyState === 1) { // 1 === OPEN
        try { 
          ws.send(frame); 
          sent++;
        } catch (e) {
          // Remove dead connections
          clients.delete(ws);
        }
      }
    }

    // Removed broadcast logging (performance optimization - high-frequency event)
  });

  // Heartbeat cleanup for dead connections
  setInterval(() => {
    for (const ws of clients) {
      // @ts-ignore
      if (ws.isAlive === false) {
        try { ws.terminate(); } catch {}
        clients.delete(ws);
        continue;
      }
      // @ts-ignore
      ws.isAlive = false;
      try { 
        // @ts-ignore
        ws.ping(); 
      } catch {}
    }
  }, 25000);

  // Enhanced WebSocket route for price updates with new contract format
  app.get("/ws/prices", { websocket: true }, (socket, req) => {
      // Removed connection logging (performance optimization)

      // @ts-ignore
      socket.isAlive = true;
      clients.add(socket);

      // Track active user connections via Redis (IPC with worker process)
      redis.setex('system:active_users', 60, clients.size.toString()).catch(() => {});
      redis.setex('system:last_activity', 60, Date.now().toString()).catch(() => {});
      
      const subscribedTokens = new Set<string>();
      const priceSubscriptions = new Map<string, () => void>();
      
      // Send an initial hello message so clients immediately receive a frame
      try {
        socket.send(JSON.stringify({ type: "hello", message: "connected", ts: Date.now() }));
      } catch (e) {
        console.error("❌ Failed to send hello message:", e);
      }

      // Handle pong responses
      socket.on("pong", () => {
        // @ts-ignore
        socket.isAlive = true;
      });
      
      // Enhanced subscription with real price service integration
      socket.on("message", (message) => {
        try {
          const data = JSON.parse(message.toString());
          // Reduced logging - only log for debugging if needed

          // Mark user activity via Redis (IPC with worker process)
          redis.setex('system:last_activity', 60, Date.now().toString()).catch(() => {});

          if (data.type === "subscribe" && data.mint) {
            subscribedTokens.add(data.mint);

            // Send current cached price immediately if available
            if (data.mint === 'So11111111111111111111111111111111111111112') {
              // Special handling for SOL - always send current price
              const solPrice = priceService.getSolPrice();

              socket.send(JSON.stringify({
                type: "price",
                mint: data.mint,
                price: solPrice,
                change24h: 0,
                timestamp: Date.now()
              }));
            } else {
              // For other tokens, try the cache first
              priceService.getLastTick(data.mint).then(async (tick: any) => {
                if (tick) {
                  socket.send(JSON.stringify({
                    type: "price",
                    mint: data.mint,
                    price: tick.priceUsd,
                    change24h: tick.change24h || 0,
                    timestamp: tick.timestamp
                  }));
                  // Cached price sent successfully (log removed to reduce noise)
                } else {
                  // No cached price - fetch fresh data from API (logging removed for performance)

                  try {
                    const freshTick = await priceService.fetchTokenPrice(data.mint);

                    if (freshTick) {
                      socket.send(JSON.stringify({
                        type: "price",
                        mint: data.mint,
                        price: freshTick.priceUsd,
                        change24h: freshTick.change24h || 0,
                        timestamp: freshTick.timestamp
                      }));
                      // Removed success logging (performance optimization)
                    } else {
                      // Still no price available after fetch
                      socket.send(JSON.stringify({
                        type: "price",
                        mint: data.mint,
                        price: 0,
                        change24h: 0,
                        timestamp: Date.now()
                      }));
                      // Removed warning logging (performance optimization)
                    }
                  } catch (err) {
                    console.error(`❌ Failed to fetch fresh price for ${data.mint.slice(0, 8)}:`, err);
                    socket.send(JSON.stringify({
                      type: "price",
                      mint: data.mint,
                      price: 0,
                      change24h: 0,
                      timestamp: Date.now()
                    }));
                  }
                }
              }).catch((err: any) => {
                console.error(`❌ Failed to get price for ${data.mint}:`, err);
                // Send a placeholder response so the client knows we received the subscription
                socket.send(JSON.stringify({
                  type: "price",
                  mint: data.mint,
                  price: 0,
                  change24h: 0,
                  timestamp: Date.now()
                }));
              });
            }

            // Subscribe to PumpPortal for real-time trade events
            priceService.subscribeToPumpPortalToken(data.mint);

            // Subscribe to real-time price updates for this token using manual subscription
            const unsubscribe = priceService.subscribe((tick: any) => {
              if (tick.mint === data.mint && subscribedTokens.has(data.mint)) {
                try {
                  socket.send(JSON.stringify({
                    type: "price",
                    mint: data.mint,
                    price: tick.priceUsd,
                    change24h: tick.change24h || 0,
                    timestamp: tick.timestamp
                  }));
                } catch (err) {
                  console.error(`❌ Failed to send price update for ${data.mint}:`, err);
                }
              }
            });

            // Store the unsubscribe function
            priceSubscriptions.set(data.mint, unsubscribe);

          } else if (data.type === "unsubscribe" && data.mint) {
            subscribedTokens.delete(data.mint);

            // Unsubscribe from PumpPortal trade events
            priceService.unsubscribeFromPumpPortalToken(data.mint);

            // Remove price service subscription
            const unsubscribe = priceSubscriptions.get(data.mint);
            if (unsubscribe) {
              unsubscribe();
              priceSubscriptions.delete(data.mint);
            }

          } else if (data.type === "ping") {
            // Respond to client ping with pong
            try {
              socket.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
            } catch (err) {
              console.error("❌ Failed to send pong:", err);
            }
          } else if (data.type === "pong") {
            // Client responded to our ping - connection is healthy (log removed to reduce noise)
          }
        } catch (error) {
          console.error("❌ Error parsing message:", error);
        }
      });
      
      socket.on("close", () => {
        // Removed disconnect logging (performance optimization)

        // Remove from clients set
        clients.delete(socket);

        // Track active user connections via Redis (IPC with worker process)
        redis.setex('system:active_users', 60, clients.size.toString()).catch(() => {});
        redis.setex('system:last_activity', 60, Date.now().toString()).catch(() => {});

        // Clean up all price service subscriptions
        priceSubscriptions.forEach((unsubscribe) => {
          unsubscribe();
        });
        priceSubscriptions.clear();
        subscribedTokens.clear();
      });
      
      socket.on("error", (error) => {
        console.error("❌ WebSocket error:", error);

        // Remove from clients set
        clients.delete(socket);

        // Track active user connections via Redis (IPC with worker process)
        redis.setex('system:active_users', 60, clients.size.toString()).catch(() => {});
        redis.setex('system:last_activity', 60, Date.now().toString()).catch(() => {});

        // Clean up subscriptions
        priceSubscriptions.forEach((unsubscribe) => {
          unsubscribe();
        });
        priceSubscriptions.clear();
      });
  });

  // Price broadcasts are handled by the price service subscriptions above
  // Real-time prices are emitted when the price service detects updates

  // ============ REAL-TIME PNL WEBSOCKET ============
  // WebSocket endpoint for real-time PnL streaming (5-10 Hz)
  app.get("/ws/pnl", { websocket: true }, (socket, req) => {
    const query = req.query as { userId?: string; tradeMode?: string };
    const userId = query.userId;
    const tradeMode = (query.tradeMode || 'PAPER') as 'PAPER' | 'REAL';

    if (!userId) {
      socket.send(JSON.stringify({
        type: 'error',
        error: 'userId query parameter required'
      }));
      socket.close();
      return;
    }

    console.log(`[PnL WS] Client connected: ${userId} (${tradeMode})`);

    // Send initial position state
    const positions = realtimePnLService.getUserPositions(userId, tradeMode);
    socket.send(JSON.stringify({
      type: 'initial',
      positions: positions.map(pos => ({
        mint: pos.mint,
        qty: pos.qty.toString(),
        avgCost: pos.avgCost.toString(),
        costBasis: pos.costBasis.toString(),
        realizedPnL: pos.realizedPnL.toString()
      }))
    }));

    // Subscribe to position-specific PnL updates
    const pnlTickHandler = (event: any) => {
      // Only send updates for this user's positions
      if (event.userId === userId && event.tradeMode === tradeMode) {
        try {
          socket.send(JSON.stringify({
            type: 'pnlTick',
            data: event
          }));
        } catch (err) {
          console.error('[PnL WS] Failed to send update:', err);
        }
      }
    };

    // Subscribe to portfolio-wide PnL updates
    const portfolioPnlHandler = (event: any) => {
      // Only send updates for this user's portfolio
      if (event.userId === userId && event.tradeMode === tradeMode) {
        try {
          socket.send(JSON.stringify({
            type: 'portfolioPnl',
            data: event
          }));
        } catch (err) {
          console.error('[PnL WS] Failed to send portfolio update:', err);
        }
      }
    };

    realtimePnLService.on('pnlTick', pnlTickHandler);
    realtimePnLService.on('portfolioPnl', portfolioPnlHandler);

    // Handle client messages
    socket.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());

        // Handle ping/pong for keepalive
        if (data.type === 'ping') {
          socket.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        }
      } catch (err) {
        console.error('[PnL WS] Failed to parse message:', err);
      }
    });

    // Handle pong responses
    socket.on("pong", () => {
      // Connection is healthy
    });

    // Handle disconnection
    socket.on('close', () => {
      console.log(`[PnL WS] Client disconnected: ${userId}`);
      realtimePnLService.off('pnlTick', pnlTickHandler);
      realtimePnLService.off('portfolioPnl', portfolioPnlHandler);
    });

    // Handle errors
    socket.on('error', (err) => {
      console.error('[PnL WS] Socket error:', err);
      realtimePnLService.off('pnlTick', pnlTickHandler);
      realtimePnLService.off('portfolioPnl', portfolioPnlHandler);
    });
  });
}