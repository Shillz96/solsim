// Debug routes for price service monitoring
import { FastifyInstance } from "fastify";
import priceService from "../plugins/priceService-optimized.js";
import { pumpPortalStreamService } from "../services/pumpPortalStreamService.js";

export default async function debugRoutes(app: FastifyInstance) {
  // Debug endpoint to check price service status
  app.get("/api/debug/price-service", async (request, reply) => {
    try {
      const stats = priceService.getStats();
      const allPrices = priceService.getAllCachedPrices();
      
      return {
        success: true,
        stats,
        prices: allPrices,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error("❌ Debug price service error:", error);
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Force price update for testing
  app.post("/api/debug/force-price-update", async (request, reply) => {
    try {
      console.log("🔄 Forcing price update via debug endpoint...");
      
      // Trigger SOL price update manually
      await (priceService as any).updateSolPrice();
      
      const stats = priceService.getStats();
      
      return {
        success: true,
        message: "Price update triggered",
        stats,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error("❌ Force price update error:", error);
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Test WebSocket subscribers
  app.get("/api/debug/websocket-subscribers", async (request, reply) => {
    try {
      const subscriberCount = priceService.listenerCount('price');

      return {
        success: true,
        subscriberCount,
        message: `${subscriberCount} active WebSocket price subscribers`,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error("❌ WebSocket subscriber debug error:", error);
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Force reconnect PumpPortal WebSocket
  app.post("/api/debug/reconnect-pumpportal", async (request, reply) => {
    try {
      console.log("🔄 Manual PumpPortal WebSocket reconnection requested...");

      // Stop and restart the PumpPortal stream service
      await pumpPortalStreamService.stop();
      await pumpPortalStreamService.start();

      const stats = priceService.getStats();

      return {
        success: true,
        message: "PumpPortal WebSocket reconnection triggered successfully",
        stats,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error("❌ PumpPortal reconnection error:", error);
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Debug endpoint for SOL price diagnostics
  app.get("/api/debug/sol-price", async (request, reply) => {
    try {
      const solPrice = priceService.getSolPrice();
      const solPriceAge = priceService.getSolPriceAge();
      const stats = priceService.getStats();

      // Check if price is stale or invalid
      const isStale = solPriceAge > 60000; // > 1 minute
      const isInvalid = solPrice < 50 || solPrice > 500; // Outside reasonable range

      return {
        success: true,
        solPrice: {
          current: solPrice,
          ageMs: solPriceAge,
          ageSeconds: Math.floor(solPriceAge / 1000),
          isStale,
          isInvalid,
          status: isInvalid ? 'INVALID' : isStale ? 'STALE' : 'OK'
        },
        stats,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error("❌ SOL price debug error:", error);
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
}