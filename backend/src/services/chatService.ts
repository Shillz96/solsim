/**
 * Chat Service
 *
 * Handles chat message operations:
 * - Sending messages
 * - Fetching message history
 * - Room metadata
 */

import prisma from '../lib/prisma.js';
import { sanitizeChatMessage, getMessageHash } from '../utils/chatSanitizer.js';
import { checkRateLimit, isDuplicateMessage, CHAT_MESSAGE_LIMIT } from '../utils/chatRateLimiter.js';
import { checkModerationStatus, addStrike } from './moderationService.js';

/**
 * Chat message with user info
 */
export interface ChatMessageWithUser {
  id: string;
  roomId: string;
  userId: string;
  content: string;
  createdAt: Date;
  user: {
    id: string;
    handle: string;
    displayName: string | null;
    avatarUrl: string | null;
    userTier: string;
  };
}

/**
 * Result of sending a message
 */
export interface SendMessageResult {
  success: boolean;
  message?: ChatMessageWithUser;
  error?: string;
  rateLimited?: boolean;
  remaining?: number;
}

/**
 * Send a chat message
 * @param userId - User sending message
 * @param roomId - Room ID (token mint or 'lobby')
 * @param content - Message content
 * @returns Send result with message data or error
 */
export async function sendMessage(
  userId: string,
  roomId: string,
  content: string
): Promise<SendMessageResult> {
  try {
    // 1. Check moderation status
    const modStatus = await checkModerationStatus(userId);
    if (!modStatus.canChat) {
      if (modStatus.isBanned) {
        return {
          success: false,
          error: 'You are banned from chat',
        };
      }
      if (modStatus.isMuted) {
        const mutedUntil = modStatus.mutedUntil?.toISOString();
        return {
          success: false,
          error: `You are muted until ${mutedUntil}`,
        };
      }
    }

    // 2. Sanitize content
    let sanitized: string;
    try {
      sanitized = sanitizeChatMessage(content);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Invalid message content',
      };
    }

    // 3. Rate limit check
    const rateLimitKey = `chat:ratelimit:${userId}`;
    const rateLimit = await checkRateLimit(rateLimitKey, CHAT_MESSAGE_LIMIT);
    if (!rateLimit.allowed) {
      return {
        success: false,
        error: `Rate limit exceeded. Try again in ${rateLimit.resetAt - Math.floor(Date.now() / 1000)}s`,
        rateLimited: true,
        remaining: rateLimit.remaining,
      };
    }

    // 4. Duplicate detection
    const messageHash = getMessageHash(userId, sanitized);
    const isDuplicate = await isDuplicateMessage(messageHash);
    if (isDuplicate) {
      // Give a strike for spam
      await addStrike(userId, 'Duplicate message spam');
      return {
        success: false,
        error: 'Duplicate message detected. Please wait before sending the same message again.',
      };
    }

    // 5. Save message to database
    const message = await prisma.chatMessage.create({
      data: {
        userId,
        roomId,
        content: sanitized,
      },
      include: {
        user: {
          select: {
            id: true,
            handle: true,
            displayName: true,
            avatarUrl: true,
            userTier: true,
          },
        },
      },
    });

    return {
      success: true,
      message: message as ChatMessageWithUser,
      remaining: rateLimit.remaining - 1,
    };
  } catch (error) {
    console.error('Error sending chat message:', error);
    return {
      success: false,
      error: 'Failed to send message. Please try again.',
    };
  }
}

/**
 * Get recent messages for a room
 * @param roomId - Room ID (token mint or 'lobby')
 * @param limit - Number of messages to fetch (default 100)
 * @returns Array of messages with user info
 */
export async function getRecentMessages(
  roomId: string,
  limit: number = 100
): Promise<ChatMessageWithUser[]> {
  const messages = await prisma.chatMessage.findMany({
    where: { roomId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          handle: true,
          displayName: true,
          avatarUrl: true,
          userTier: true,
        },
      },
    },
  });

  // Return in chronological order (oldest first)
  return messages.reverse() as ChatMessageWithUser[];
}

/**
 * Get room metadata (participant count, last message time)
 * @param roomId - Room ID
 * @returns Room metadata
 */
export async function getRoomMetadata(roomId: string) {
  const [messageCount, lastMessage, uniqueParticipants] = await Promise.all([
    // Total message count
    prisma.chatMessage.count({
      where: { roomId },
    }),

    // Last message
    prisma.chatMessage.findFirst({
      where: { roomId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),

    // Unique participants (last 24h)
    prisma.chatMessage.findMany({
      where: {
        roomId,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
      distinct: ['userId'],
      select: { userId: true },
    }),
  ]);

  return {
    roomId,
    messageCount,
    lastMessageAt: lastMessage?.createdAt || null,
    activeParticipants24h: uniqueParticipants.length,
  };
}

/**
 * Delete a message (admin only)
 * @param messageId - Message ID to delete
 * @param moderatorId - Moderator performing deletion
 * @returns Success status
 */
export async function deleteMessage(
  messageId: string,
  moderatorId: string
): Promise<boolean> {
  try {
    await prisma.chatMessage.delete({
      where: { id: messageId },
    });

    // TODO: Log deletion action
    return true;
  } catch (error) {
    console.error('Error deleting message:', error);
    return false;
  }
}
