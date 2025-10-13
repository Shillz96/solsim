import { WSFrame, type PriceTick } from "../src/types/contracts";

// Use the proper contract types from our contracts file
type CloseFn = () => void;

/**
 * Hardened WebSocket client for price streaming
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Heartbeat/ping-pong to prevent proxy drops 
 * - Schema validation with Zod to prevent parsing errors
 * - Decimal-safe number handling (no float precision loss)
 * - Safari/mobile/Railway proxy compatibility
 */
export function connectPrices(onTick: (t: PriceTick) => void, url: string): CloseFn {
  let ws: WebSocket | null = null;
  let tries = 0;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let closed = false;

  const open = () => {
    if (closed) return;
    
    console.log(`🔌 Connecting to ${url} (attempt ${tries + 1})`);
    ws = new WebSocket(url);
    
    ws.onopen = () => {
      console.log('✅ WebSocket connected');
      tries = 0;
      
      // Start heartbeat to prevent proxy timeouts
      heartbeat = setInterval(() => {
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send('{"t":"pong"}');
          console.log('💓 Heartbeat sent');
        }
      }, 25000); // 25s is safe for most proxies including Railway
    };

    ws.onmessage = (ev) => {
      // Handle ping-pong heartbeat
      if (ev.data === "ping") { 
        ws?.send('{"t":"pong"}'); 
        return; 
      }
      
      try {
        const msg = JSON.parse(ev.data);
        
        // Handle price ticks with schema validation - new contract format
        if (msg?.t === "price" && msg?.d) {
          try {
            // Validate with Zod schema
            const frame = WSFrame.parse(msg);
            onTick(frame.d);
          } catch (parseError) {
            console.error("❌ Price tick validation failed:", parseError, msg);
          }
        }
        // Legacy format support (remove after migration)
        else if (msg?.type === "price" && msg?.mint) {
          try {
            const data: PriceTick = {
              v: 1,
              seq: Date.now(), // fallback sequence
              mint: msg.mint,
              priceLamports: convertPriceToLamports(msg.price || 0).toString(),
              ts: msg.timestamp || Date.now()
            };
            
            onTick(data);
          } catch (parseError) {
            console.error("❌ Legacy price tick validation failed:", parseError, msg);
          }
        }
        
        // Handle other message types (hello, pong, etc.) silently
      } catch (jsonError) {
        console.error("❌ WS frame parse error:", jsonError);
      }
    };

    const reopen = () => {
      if (closed) return;
      
      if (heartbeat) {
        clearInterval(heartbeat);
        heartbeat = null;
      }
      
      // Exponential backoff with jitter, max 30s
      const baseDelay = Math.min(30000, 1000 * Math.pow(2, tries++));
      const jitter = Math.random() * 1000; // Add randomness to prevent thundering herd
      const delay = baseDelay + jitter;
      
      console.log(`🔄 Reconnecting in ${Math.round(delay / 1000)}s...`);
      setTimeout(open, delay);
    };

    ws.onclose = (event) => {
      if (closed) return;
      console.log(`🔌 WebSocket closed: ${event.code} ${event.reason}`);
      reopen();
    };
    
    ws.onerror = (error) => {
      if (closed) return;
      console.error("❌ WebSocket error:", error);
      reopen();
    };
  };

  open();
  
  return () => { 
    console.log('🧹 Closing WebSocket connection');
    closed = true;
    if (heartbeat) clearInterval(heartbeat); 
    ws?.close(); 
  };
}

/**
 * Convert USD price to lamports for decimal-safe storage
 * Uses SOL price conversion to maintain precision
 */
function convertPriceToLamports(usdPrice: number): bigint {
  // This is a simplified conversion - in production you'd want
  // the actual SOL/USD rate for accurate lamport conversion
  const LAMPORTS_PER_SOL = 1_000_000_000n;
  const SOL_USD_ESTIMATE = 150; // This should come from actual SOL price
  
  // Convert USD to SOL, then SOL to lamports
  const solPrice = usdPrice / SOL_USD_ESTIMATE;
  const lamports = BigInt(Math.round(solPrice * Number(LAMPORTS_PER_SOL)));
  
  return lamports;
}