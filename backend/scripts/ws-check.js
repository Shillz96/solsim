// Simple WS probe to production to verify handshake and early-close behavior
// Uses the same ws version as backend to avoid client/proxy quirks
import WebSocket from 'ws';

const url = process.env.WS_URL || 'wss://virtualsol-production.up.railway.app/ws/prices';
console.log('Connecting to', url);

const ws = new WebSocket(url, {
  perMessageDeflate: false,
  handshakeTimeout: 8000,
});

const start = Date.now();
let opened = false;

ws.on('open', () => {
  opened = true;
  console.log('OPEN after', Date.now() - start, 'ms');
  ws.send(JSON.stringify({ type: 'subscribe', mint: 'So11111111111111111111111111111111111111112' }));
});

ws.on('message', (data) => {
  try {
    const msg = JSON.parse(data.toString());
    console.log('MESSAGE', msg);
  } catch (e) {
    console.log('MESSAGE raw', data.toString());
  }
});

ws.on('error', (err) => {
  console.log('ERROR', err.message || err);
});

ws.on('close', (code, reason) => {
  const dur = Date.now() - start;
  console.log('CLOSE code', code, 'reason', reason?.toString?.() || '', 'duration', dur, 'ms', 'opened?', opened);
});
