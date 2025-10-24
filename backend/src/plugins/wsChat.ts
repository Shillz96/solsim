/**
 * Chat WebSocket Plugin
 *
 * Real-time chat WebSocket server with:
 * - JWT authentication
 * - Room-based messaging
 * - Rate limiting
 * - Moderation enforcement
 * - Message broadcasting
 */

/// <reference path="../types/fastify.d.ts" />

import { FastifyInstance } from 'fastify';
import { AuthService } from './auth.js';
import { sendMessage, getRecentMessages } from '../services/chatService.js';
import { checkModerationStatus } from '../services/moderationService.js';
import { WebSocket } from 'ws';

// Extend WebSocket with isAlive property for heartbeat tracking
interface ExtendedWebSocket extends WebSocket {
  isAlive?: boolean;
}

/**
 * Connected client data
 */
interface ChatClient {
  socket: ExtendedWebSocket;
  userId: string;
  handle: string;
  rooms: Set<string>;
}

// Room management: roomId -> Set of clients
const rooms = new Map<string, Set<ChatClient>>();

// Client registry: socket -> client data
const clients = new Map<ExtendedWebSocket, ChatClient>();

/**
 * Join a room
 */
function joinRoom(client: ChatClient, roomId: string) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set());
  }
  rooms.get(roomId)!.add(client);
  client.rooms.add(roomId);

  console.log(`💬 User ${client.handle} joined room ${roomId}`);

  // Broadcast join event to room
  broadcastToRoom(roomId, {
    type: 'user_joined',
    roomId,
    userId: client.userId,
    handle: client.handle,
    participantCount: rooms.get(roomId)!.size,
  }, client);
}

/**
 * Leave a room
 */
function leaveRoom(client: ChatClient, roomId: string) {
  const room = rooms.get(roomId);
  if (room) {
    room.delete(client);
    if (room.size === 0) {
      rooms.delete(roomId);
    } else {
      // Broadcast leave event
      broadcastToRoom(roomId, {
        type: 'user_left',
        roomId,
        userId: client.userId,
        handle: client.handle,
        participantCount: room.size,
      });
    }
  }
  client.rooms.delete(roomId);

  console.log(`💬 User ${client.handle} left room ${roomId}`);
}

/**
 * Leave all rooms (cleanup on disconnect)
 */
function leaveAllRooms(client: ChatClient) {
  for (const roomId of client.rooms) {
    leaveRoom(client, roomId);
  }
}

/**
 * Broadcast message to all clients in a room
 * @param roomId - Room to broadcast to
 * @param message - Message object to send
 * @param exclude - Optional client to exclude from broadcast
 */
function broadcastToRoom(roomId: string, message: any, exclude?: ChatClient) {
  const room = rooms.get(roomId);
  if (!room) return;

  const frame = JSON.stringify(message);
  let sent = 0;

  for (const client of room) {
    if (client === exclude) continue;

    if (client.socket.readyState === 1) { // OPEN
      try {
        client.socket.send(frame);
        sent++;
      } catch (error) {
        console.error(`Failed to send to client:`, error);
      }
    }
  }

  if (sent > 0 && message.type === 'message') {
    console.log(`💬 Broadcasted message in ${roomId} to ${sent} clients`);
  }
}

/**
 * Send error to client
 */
function sendError(socket: WebSocket, error: string, type: string = 'error') {
  try {
    socket.send(JSON.stringify({
      type,
      error,
      timestamp: Date.now(),
    }));
  } catch (e) {
    console.error('Failed to send error:', e);
  }
}

/**
 * Chat WebSocket plugin
 */
export default async function wsChatPlugin(app: FastifyInstance) {
  // Heartbeat cleanup for dead connections (25 seconds, Railway-safe)
  const heartbeat = setInterval(() => {
    for (const [socket, client] of clients.entries()) {
      if (socket.isAlive === false) {
        try { socket.terminate(); } catch {}
        clients.delete(socket);
        leaveAllRooms(client);
        continue;
      }
      socket.isAlive = false;
      try { socket.ping(); } catch {}
    }
  }, 25000);

  // Cleanup on shutdown
  app.addHook('onClose', async () => {
    clearInterval(heartbeat);
    for (const [socket] of clients.entries()) {
      try { socket.close(); } catch {}
    }
  });

  // Chat WebSocket route
  app.get('/ws/chat', { websocket: true }, async (connection, req) => {
    // Cast WebSocket to ExtendedWebSocket for isAlive property
    const socket = connection as ExtendedWebSocket;
    console.log('💬 Chat WebSocket connection attempt from', req.ip);

    // 1. Authenticate via JWT in query params
    const token = (req.query as any).token;
    if (!token) {
      sendError(socket, 'Missing authentication token');
      socket.close();
      return;
    }

    let userId: string;
    let userTier: string;
    try {
      const payload = AuthService.verifyToken(token);
      userId = payload.userId;
      userTier = payload.userTier;
    } catch (error) {
      sendError(socket, 'Invalid or expired token');
      socket.close();
      return;
    }

    // 2. Check if user is banned
    try {
      const modStatus = await checkModerationStatus(userId);
      if (modStatus.isBanned) {
        sendError(socket, 'You are banned from chat', 'banned');
        socket.close();
        return;
      }
    } catch (error) {
      console.error('Moderation check failed:', error);
      sendError(socket, 'Authentication failed');
      socket.close();
      return;
    }

    // 3. Get user handle from database
    let handle: string;
    try {
      const user = await app.prisma.user.findUnique({
        where: { id: userId },
        select: { handle: true },
      });
      if (!user) {
        sendError(socket, 'User not found');
        socket.close();
        return;
      }
      handle = user.handle;
    } catch (error) {
      console.error('Failed to fetch user:', error);
      sendError(socket, 'Authentication failed');
      socket.close();
      return;
    }

    // 4. Create client object
    socket.isAlive = true;
    const client: ChatClient = {
      socket,
      userId,
      handle,
      rooms: new Set(),
    };
    clients.set(socket, client);

    console.log(`✅ Chat client authenticated: ${handle} (${userId})`);

    // 5. Send welcome message
    try {
      socket.send(JSON.stringify({
        type: 'connected',
        message: 'Connected to chat server',
        userId,
        handle,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.error('Failed to send welcome message:', error);
    }

    // 6. Handle pong responses (heartbeat)
    socket.on('pong', () => {
      socket.isAlive = true;
    });

    // 7. Handle incoming messages
    socket.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());

        switch (message.type) {
          case 'join_room': {
            const { roomId } = message;
            if (!roomId) {
              sendError(socket, 'Missing roomId');
              return;
            }
            joinRoom(client, roomId);

            // Load and send recent messages
            try {
              const recentMessages = await getRecentMessages(roomId, 100);
              socket.send(JSON.stringify({
                type: 'message_history',
                roomId,
                messages: recentMessages,
                timestamp: Date.now(),
              }));
            } catch (error) {
              console.error('Failed to load message history:', error);
              sendError(socket, 'Failed to load message history');
            }
            break;
          }

          case 'leave_room': {
            const { roomId } = message;
            if (!roomId) {
              sendError(socket, 'Missing roomId');
              return;
            }
            leaveRoom(client, roomId);
            break;
          }

          case 'send_message': {
            const { roomId, content } = message;
            if (!roomId || !content) {
              sendError(socket, 'Missing roomId or content');
              return;
            }

            // Check if user is in the room
            if (!client.rooms.has(roomId)) {
              sendError(socket, 'You must join the room first');
              return;
            }

            // Send message via service (handles rate limiting, moderation, etc.)
            const result = await sendMessage(userId, roomId, content);

            if (result.success && result.message) {
              // Broadcast to all clients in room (including sender)
              broadcastToRoom(roomId, {
                type: 'message',
                roomId,
                message: result.message,
                timestamp: Date.now(),
              });
            } else {
              // Send error back to sender only
              sendError(socket, result.error || 'Failed to send message', result.rateLimited ? 'rate_limited' : 'error');
            }
            break;
          }

          case 'ping': {
            socket.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
            break;
          }

          default:
            console.log(`Unknown message type: ${message.type}`);
        }
      } catch (error) {
        console.error('Error processing message:', error);
        sendError(socket, 'Invalid message format');
      }
    });

    // 8. Handle disconnect
    socket.on('close', () => {
      console.log(`💬 Chat client disconnected: ${handle}`);
      leaveAllRooms(client);
      clients.delete(socket);
    });

    socket.on('error', (error) => {
      console.error(`💬 Chat WebSocket error for ${handle}:`, error);
      leaveAllRooms(client);
      clients.delete(socket);
    });
  });

  console.log('💬 Chat WebSocket plugin registered at /ws/chat');
}
