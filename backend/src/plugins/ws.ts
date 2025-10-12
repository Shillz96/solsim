// WebSocket plugin for real-time updates
import { FastifyInstance } from "fastify";
import priceService from "./priceService.js";

// Helper function to convert backend PriceTick to frontend PriceUpdate format
function convertToFrontendPrice(tick: any) {
  return {
    type: "price",
    mint: tick.mint,
    price: tick.priceUsd,
    change24h: tick.change24h || 0,
    timestamp: tick.timestamp
  };
}

export default async function wsPlugin(app: FastifyInstance) {
  // Enhanced WebSocket route for price updates with real data
  app.get("/ws/prices", { websocket: true }, (socket, req) => {
      console.log("🔌 Client connected to price WebSocket");
      
      const subscribedTokens = new Set<string>();
      const priceSubscriptions = new Map<string, () => void>();
      
      // Send an initial hello message so clients immediately receive a frame
      try {
        socket.send(JSON.stringify({ type: "hello", message: "connected", ts: Date.now() }));
      } catch (e) {
        console.error("❌ Failed to send hello message:", e);
      }

      // Heartbeat: send lightweight ping frames to keep connection alive across proxies
      const HEARTBEAT_MS = 25000; // 25s is safe for most proxies
      let heartbeat: NodeJS.Timeout | null = setInterval(() => {
        try {
          // If socket is not open, skip
          // readyState 1 === OPEN
          // @ts-ignore ws type exposed by fastify-websocket
          if ((socket as any).readyState !== 1) return;
          // Prefer native ping when available, otherwise send a JSON ping
          // @ts-ignore ws exposes ping()
          if (typeof (socket as any).ping === 'function') {
            try { (socket as any).ping(); } catch { /* ignore */ }
          } else {
            socket.send(JSON.stringify({ type: "ping", ts: Date.now() }));
          }
        } catch (err) {
          console.error("❌ Heartbeat error:", err);
        }
      }, HEARTBEAT_MS);
      
      // Enhanced subscription with real price service integration
      socket.on("message", (message) => {
        try {
          const data = JSON.parse(message.toString());
          console.log("📨 Received:", data.type, data.mint ? `(${data.mint})` : '');
          
          if (data.type === "subscribe" && data.mint) {
            subscribedTokens.add(data.mint);
            console.log(`📡 Subscribed to ${data.mint}`);
            
            // Send current cached price immediately if available
            priceService.getLastTick(data.mint).then(tick => {
              const priceUpdate = convertToFrontendPrice(tick);
              socket.send(JSON.stringify(priceUpdate));
              console.log(`💰 Sent cached price for ${data.mint}: $${tick.priceUsd}`);
            }).catch(err => {
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
            
            // Subscribe to real-time price updates for this token
            const unsubscribe = priceService.subscribe((tick) => {
              if (tick.mint === data.mint && subscribedTokens.has(data.mint)) {
                try {
                  const priceUpdate = convertToFrontendPrice(tick);
                  socket.send(JSON.stringify(priceUpdate));
                  console.log(`🔄 Live price update for ${data.mint}: $${tick.priceUsd}`);
                } catch (err) {
                  console.error(`❌ Failed to send price update for ${data.mint}:`, err);
                }
              }
            });
            
            // Store the unsubscribe function
            priceSubscriptions.set(data.mint, unsubscribe);
            
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
            } catch (err) {
              console.error("❌ Failed to send pong:", err);
            }
          }
        } catch (error) {
          console.error("❌ Error parsing message:", error);
        }
      });
      
      socket.on("close", () => {
        console.log("🔌 Client disconnected");
        
        // Clean up heartbeat
        if (heartbeat) {
          clearInterval(heartbeat);
          heartbeat = null;
        }
        
        // Clean up all price service subscriptions
        priceSubscriptions.forEach((unsubscribe) => {
          unsubscribe();
        });
        priceSubscriptions.clear();
        subscribedTokens.clear();
      });
      
      socket.on("error", (error) => {
        console.error("❌ WebSocket error:", error);
        
        // Clean up on error
        if (heartbeat) {
          clearInterval(heartbeat);
          heartbeat = null;
        }
        priceSubscriptions.forEach((unsubscribe) => {
          unsubscribe();
        });
        priceSubscriptions.clear();
      });
  });
}