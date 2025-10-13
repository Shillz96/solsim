// WebSocket plugin for real-time updates with contract-compliant formatting
import { FastifyInstance } from "fastify";
import priceService from "./priceService.js";

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
    
    if (sent > 0) {
      console.log(`📊 Broadcasted price update for ${tick.mint} to ${sent} clients`);
    }
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
      console.log("🔌 Client connected to price WebSocket");
      console.log("🌐 Client IP:", req.ip);
      console.log("🌐 Client headers:", req.headers['user-agent']);
      
      // @ts-ignore
      socket.isAlive = true;
      clients.add(socket);
      
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
          console.log("📨 Received:", data.type || data.t, data.mint ? `(${data.mint})` : '');
          
          if (data.type === "subscribe" && data.mint) {
            subscribedTokens.add(data.mint);
            console.log(`📡 Subscribed to ${data.mint}`);
            
            // Send current cached price immediately if available
            if (data.mint === 'So11111111111111111111111111111111111111112') {
              // Special handling for SOL - always send current price
              const solPrice = priceService.getSolPrice();
              const priceLamports = solToLamports(solPrice);
              console.log(`💰 Sending SOL price directly: $${solPrice} (${priceLamports} lamports)`);
              
              socket.send(JSON.stringify({
                t: "price",
                d: {
                  v: 1,
                  seq: ++seq,
                  mint: data.mint,
                  priceLamports,
                  ts: Date.now()
                }
              }));
            } else {
              // For other tokens, try the cache first
              priceService.getLastTick(data.mint).then(tick => {
                if (tick) {
                  const priceLamports = solToLamports(tick.priceUsd / priceService.getSolPrice());
                  
                  socket.send(JSON.stringify({
                    t: "price",
                    d: {
                      v: 1,
                      seq: ++seq,
                      mint: data.mint,
                      priceLamports,
                      ts: tick.timestamp
                    }
                  }));
                  console.log(`💰 Sent cached price for ${data.mint}: $${tick.priceUsd} (${priceLamports} lamports)`);
                } else {
                  // Send a placeholder response when no price is available
                  socket.send(JSON.stringify({
                    t: "price",
                    d: {
                      v: 1,
                      seq: ++seq,
                      mint: data.mint,
                      priceLamports: "0",
                      ts: Date.now()
                    }
                  }));
                  console.log(`⚠️ No cached price available for ${data.mint}`);
                }
              }).catch(err => {
                console.error(`❌ Failed to get price for ${data.mint}:`, err);
                // Send a placeholder response so the client knows we received the subscription
                socket.send(JSON.stringify({
                  t: "price",
                  d: {
                    v: 1,
                    seq: ++seq,
                    mint: data.mint,
                    priceLamports: "0",
                    ts: Date.now()
                  }
                }));
              });
            }
            
            // Subscribe to real-time price updates for this token using manual subscription
            console.log(`🔌 Setting up subscription for ${data.mint}`);
            const unsubscribe = priceService.subscribe((tick) => {
              console.log(`🔔 Price callback triggered for ${tick.mint}, subscribed to: ${data.mint}, match: ${tick.mint === data.mint}`);
              if (tick.mint === data.mint && subscribedTokens.has(data.mint)) {
                try {
                  const priceLamports = tick.mint === 'So11111111111111111111111111111111111111112' 
                    ? solToLamports(tick.priceUsd) 
                    : solToLamports(tick.priceUsd / priceService.getSolPrice());
                  
                  socket.send(JSON.stringify({
                    t: "price",
                    d: {
                      v: 1,
                      seq: ++seq,
                      mint: data.mint,
                      priceLamports,
                      ts: tick.timestamp
                    }
                  }));
                  console.log(`🔄 Live price update sent for ${data.mint}: $${tick.priceUsd} (${priceLamports} lamports)`);
                } catch (err) {
                  console.error(`❌ Failed to send price update for ${data.mint}:`, err);
                }
              }
            });
            
            // Store the unsubscribe function
            priceSubscriptions.set(data.mint, unsubscribe);
            console.log(`📊 Total WebSocket subscribers: ${priceSubscriptions.size}`);
            
          } else if (data.type === "unsubscribe" && data.mint) {
            subscribedTokens.delete(data.mint);
            console.log(`📡 Unsubscribed from ${data.mint}`);
            
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
              console.log("💓 Responded to client ping with pong");
            } catch (err) {
              console.error("❌ Failed to send pong:", err);
            }
          } else if (data.type === "pong") {
            // Client responded to our ping - connection is healthy
            console.log("💓 Received pong from client - connection healthy");
          } else if (data.t === "pong") {
            // Handle client pong in the new format
            console.log("💓 Received pong from hardened client - connection healthy");
          }
        } catch (error) {
          console.error("❌ Error parsing message:", error);
        }
      });
      
      socket.on("close", () => {
        console.log("🔌 Client disconnected");
        
        // Remove from clients set
        clients.delete(socket);
        
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
        
        // Clean up subscriptions
        priceSubscriptions.forEach((unsubscribe) => {
          unsubscribe();
        });
        priceSubscriptions.clear();
      });
  });

  // Add a mock price broadcaster for testing (remove when real data is wired)
  setInterval(() => {
    app.broadcastPrice({ 
      mint: "So11111111111111111111111111111111111111112", 
      priceLamports: solToLamports(Math.random() * 200 + 100) // Random SOL price between $100-300
    });
  }, 2000); // Every 2 seconds for testing
}