/**
 * Activity Check Utility
 *
 * Check if system should run background jobs based on user activity
 * Uses Redis for IPC between WebSocket server and worker
 * Extracted from tokenDiscoveryWorker.ts (lines 119-150)
 */

import Redis from 'ioredis';
import { loggers } from '../../../utils/logger.js';
import { config } from '../config/index.js';

const logger = loggers.server;

/**
 * Check if system should run background jobs based on user activity
 * Uses Redis to coordinate with WebSocket server (separate Node.js process)
 * Returns false when system is idle (no users, no recent activity)
 */
export async function shouldRunBackgroundJobs(redis: Redis): Promise<boolean> {
  try {
    // Read active user count from Redis (written by WebSocket server)
    const activeUserCount = await redis.get('system:active_users');
    const count = activeUserCount ? parseInt(activeUserCount) : 0;

    // Always run if there are active users
    if (count > 0) {
      return true;
    }

    // If no active users, check if there was recent activity (within last 10 minutes)
    const lastActivity = await redis.get('system:last_activity');
    if (!lastActivity) {
      return false; // No activity data, consider idle
    }

    const timeSinceLastActivity = Date.now() - parseInt(lastActivity);

    return timeSinceLastActivity < config.retention.IDLE_THRESHOLD_MS;
  } catch (error) {
    logger.error({ error }, 'Error checking background job status');
    // On error, default to running jobs (fail-safe)
    return true;
  }
}

/**
 * Export stub functions for type compatibility with ws.ts
 * Actual coordination happens via Redis (see ws.ts for implementation)
 */
export async function updateActiveUserCount(count: number): Promise<void> {
  // NO-OP: This worker runs in separate process, can't share memory
  // WebSocket server writes to Redis directly
}

export function markActivity(): void {
  // NO-OP: This worker runs in separate process, can't share memory
  // WebSocket server writes to Redis directly
}
