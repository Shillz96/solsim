// WebSocket plugin for real-time updates
import { FastifyInstance } from "fastify";
import priceService from "./priceService.js";

// Helper function to convert backend PriceTick to frontend PriceUpdate format
function convertToFrontendPrice(tick: any) {
  return {
    type: "price_update",
    tokenAddress: tick.mint,
    price: tick.priceUsd,
    change24h: 0, // Could be calculated from historical data if needed
    timestamp: tick.timestamp
  };
}

export default async function wsPlugin(app: FastifyInstance) {
  // WebSocket route for price updates
  app.get("/ws/prices", { websocket: true }, (socket, req) => {
      console.log("🔌 Client connected to price WebSocket");
      
      const subscribedTokens = new Set<string>();
      
      // Subscribe to price updates with filtering
      const unsubscribe = priceService.subscribe((tick) => {
        // Only send updates for subscribed tokens (or all if none specified)
        if (subscribedTokens.size === 0 || subscribedTokens.has(tick.mint)) {
          socket.send(JSON.stringify(convertToFrontendPrice(tick)));
        }
      });
      
      socket.on("message", (message) => {
        try {
          const data = JSON.parse(message.toString());
          
          if (data.type === "subscribe" && data.tokenAddress) {
            subscribedTokens.add(data.tokenAddress);
            console.log(`📡 Client subscribed to ${data.tokenAddress}`);
            
            // Send current price immediately
            priceService.getLastTick(data.tokenAddress).then(tick => {
              socket.send(JSON.stringify(convertToFrontendPrice(tick)));
            }).catch(console.error);
          }
          
          if (data.type === "unsubscribe" && data.tokenAddress) {
            subscribedTokens.delete(data.tokenAddress);
            console.log(`📡 Client unsubscribed from ${data.tokenAddress}`);
          }
          
          if (data.type === "subscribe_all") {
            subscribedTokens.clear();
            console.log(`📡 Client subscribed to all tokens`);
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      });
      
      socket.on("close", () => {
        console.log("🔌 Client disconnected from price WebSocket");
        unsubscribe();
      });
  });
}