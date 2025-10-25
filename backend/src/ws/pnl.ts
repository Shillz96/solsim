/**
 * WebSocket endpoint for real-time PnL streaming
 *
 * Broadcasts PnL updates at 5-10 Hz (200ms intervals)
 * Push-based, no polling required from frontend
 */

import { FastifyRequest } from 'fastify';
import { realtimePnLService } from '../services/realtimePnLService.js';

interface PnLQuery {
  userId?: string;
  tradeMode?: string;
}

export async function handlePnLWebSocket(
  connection: any,
  req: FastifyRequest
) {
  const query = req.query as PnLQuery;
  const userId = query.userId;
  const tradeMode = (query.tradeMode || 'PAPER') as 'PAPER' | 'REAL';

  if (!userId) {
    connection.socket.send(JSON.stringify({
      type: 'error',
      error: 'userId query parameter required'
    }));
    connection.socket.close();
    return;
  }

  console.log(`[PnL WS] Client connected: ${userId} (${tradeMode})`);

  // Send initial position state
  const positions = realtimePnLService.getUserPositions(userId, tradeMode);
  connection.socket.send(JSON.stringify({
    type: 'initial',
    positions: positions.map(pos => ({
      mint: pos.mint,
      qty: pos.qty.toString(),
      avgCost: pos.avgCost.toString(),
      costBasis: pos.costBasis.toString(),
      realizedPnL: pos.realizedPnL.toString()
    }))
  }));

  // Subscribe to PnL updates for this user
  const pnlTickHandler = (event: any) => {
    // Only send updates for this user's positions
    if (event.userId === userId && event.tradeMode === tradeMode) {
      try {
        connection.socket.send(JSON.stringify({
          type: 'pnlTick',
          data: event
        }));
      } catch (err) {
        console.error('[PnL WS] Failed to send update:', err);
      }
    }
  };

  realtimePnLService.on('pnlTick', pnlTickHandler);

  // Handle client messages
  connection.socket.on('message', (message: Buffer) => {
    try {
      const data = JSON.parse(message.toString());

      // Handle ping/pong for keepalive
      if (data.type === 'ping') {
        connection.socket.send(JSON.stringify({ type: 'pong' }));
      }

      // Handle subscribe to specific mint
      if (data.type === 'subscribe' && data.mint) {
        // Client can request updates for specific mints
        // Currently we broadcast all, but could filter here
      }
    } catch (err) {
      console.error('[PnL WS] Failed to parse message:', err);
    }
  });

  // Handle disconnection
  connection.socket.on('close', () => {
    console.log(`[PnL WS] Client disconnected: ${userId}`);
    realtimePnLService.off('pnlTick', pnlTickHandler);
  });

  // Handle errors
  connection.socket.on('error', (err: Error) => {
    console.error('[PnL WS] Socket error:', err);
    realtimePnLService.off('pnlTick', pnlTickHandler);
  });
}
