// Minimal WebSocket test plugin
import { FastifyInstance } from "fastify";

export default async function wsTestPlugin(app: FastifyInstance) {
  // Super simple WebSocket test route
  app.get("/test-ws", { websocket: true }, (socket, req) => {
    console.log("🧪 Test WebSocket connected");
    
    socket.send(JSON.stringify({ 
      type: 'test', 
      message: 'Hello from WebSocket!' 
    }));
    
    socket.on("message", (message) => {
      console.log("📨 Test WebSocket message:", message.toString());
      socket.send(JSON.stringify({ 
        type: 'echo', 
        data: message.toString() 
      }));
    });
    
    socket.on("close", () => {
      console.log("🧪 Test WebSocket disconnected");
    });
  });
}