// WebSocket plugin for real-time updates
import { FastifyInstance } from "fastify";
import priceService from "./priceService.js";

export default async function wsPlugin(app: FastifyInstance) {
  // WebSocket route for price updates
  app.get("/ws/prices", { websocket: true }, (connection, req) => {
      console.log("🔌 Client connected to price WebSocket");
      
      const subscribedTokens = new Set<string>();
      
      // Subscribe to price updates with filtering
      const unsubscribe = priceService.subscribe((tick) => {
        // Only send updates for subscribed tokens (or all if none specified)
        if (subscribedTokens.size === 0 || subscribedTokens.has(tick.mint)) {
          (connection.socket as any).send(JSON.stringify({
            type: "price_update",
            data: tick
          }));
        }
      });
      
      connection.socket.on("message", (message) => {
        try {
          const data = JSON.parse(message.toString());
          
          if (data.type === "subscribe_token" && data.mint) {
            subscribedTokens.add(data.mint);
            console.log(`📡 Client subscribed to ${data.mint}`);
            
            // Send current price immediately
            priceService.getLastTick(data.mint).then(tick => {
              (connection.socket as any).send(JSON.stringify({
                type: "price_update",
                data: tick
              }));
            }).catch(console.error);
          }
          
          if (data.type === "unsubscribe_token" && data.mint) {
            subscribedTokens.delete(data.mint);
            console.log(`📡 Client unsubscribed from ${data.mint}`);
          }
          
          if (data.type === "subscribe_all") {
            subscribedTokens.clear();
            console.log(`📡 Client subscribed to all tokens`);
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      });
      
      connection.socket.on("close", () => {
        console.log("🔌 Client disconnected from price WebSocket");
        unsubscribe();
      });
  });
}