/**
 * Moderation Bot Service
 * 
 * Automated moderation system with Mario theme integration
 * Handles spam detection, toxicity filtering, and auto-moderation actions
 */

import prisma from '../plugins/prisma';
import redis from '../plugins/redis';
import { currentConfig, ModerationConfig } from '../config/moderationConfig';

export interface ModerationResult {
  violations: Violation[];
  action: ModerationAction;
  reason: string;
  duration?: number; // minutes
}

export interface Violation {
  type: 'SPAM' | 'TOXICITY' | 'PUMP_DUMP' | 'MALICIOUS_LINK' | 'CAPS_SPAM' | 'REPEAT_MESSAGE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number; // 0-100
  details: string;
}

export interface ModerationAction {
  type: 'WARNING' | 'MUTE' | 'BAN' | 'KICK' | 'STRIKE';
  duration?: number; // minutes
  reason: string;
}

export class ModerationBot {
  private static readonly SPAM_PATTERNS = [
    /(.)\1{4,}/g, // Repeated characters
    /(.)\1{3,}/g, // Repeated characters (less strict)
    /(.)\1{2,}/g, // Repeated characters (even less strict)
  ];

  private static readonly TOXICITY_PATTERNS = [
    /\b(kill|die|hate|stupid|idiot|moron|retard|fuck|shit|bitch|asshole)\b/gi,
    /\b(scam|rug|pump|dump|ponzi|pyramid)\b/gi,
    /\b(suicide|murder|violence|threat)\b/gi,
  ];

  private static readonly PUMP_DUMP_PATTERNS = [
    /\b(moon|rocket|to the moon|100x|1000x|lambo|yacht)\b/gi,
    /\b(buy now|sell now|pump|dump|manipulation)\b/gi,
    /\b(insider|tip|secret|exclusive|guaranteed)\b/gi,
  ];

  private static readonly MALICIOUS_LINK_PATTERNS = [
    /(bit\.ly|tinyurl|short\.link|t\.co)/gi,
    /(phishing|scam|malware|virus)/gi,
    /(click here|free money|win now)/gi,
  ];

  // Configuration will be loaded from moderationConfig.ts

  /**
   * Analyze message for violations
   */
  static async analyzeMessage(userId: string, content: string): Promise<ModerationResult> {
    const violations: Violation[] = [];

    // Check for spam patterns
    const spamViolation = await this.detectSpam(userId, content);
    if (spamViolation) violations.push(spamViolation);

    // Check for toxicity
    const toxicityViolation = this.detectToxicity(content);
    if (toxicityViolation) violations.push(toxicityViolation);

    // Check for pump & dump
    const pumpDumpViolation = this.detectPumpDump(content);
    if (pumpDumpViolation) violations.push(pumpDumpViolation);

    // Check for malicious links
    const maliciousLinkViolation = this.detectMaliciousLinks(content);
    if (maliciousLinkViolation) violations.push(maliciousLinkViolation);

    // Check for caps spam
    const capsSpamViolation = this.detectCapsSpam(content);
    if (capsSpamViolation) violations.push(capsSpamViolation);

    // Check for repeat messages
    const repeatViolation = await this.detectRepeatMessages(userId, content);
    if (repeatViolation) violations.push(repeatViolation);

    // Determine action based on violations
    const action = this.determineAction(violations);
    const reason = this.generateReason(violations);

    return {
      violations,
      action,
      reason,
      duration: action.duration
    };
  }

  /**
   * Detect spam patterns
   */
  private static async detectSpam(userId: string, content: string): Promise<Violation | null> {
    // Check rate limiting
    const rateLimitKey = `chat:ratelimit:${userId}`;
    const rateLimit = await this.checkRateLimit(
      rateLimitKey, 
      currentConfig.rateLimit.messagesPerWindow, 
      currentConfig.rateLimit.windowSeconds
    );
    
    if (!rateLimit.allowed) {
      return {
        type: 'SPAM',
        severity: 'HIGH',
        confidence: 95,
        details: 'Rate limit exceeded'
      };
    }

    // Check for repeated characters
    for (const pattern of this.SPAM_PATTERNS) {
      if (pattern.test(content)) {
        return {
          type: 'SPAM',
          severity: 'MEDIUM',
          confidence: 80,
          details: 'Repeated characters detected'
        };
      }
    }

    // Check for duplicate messages
    const messageHash = this.getMessageHash(userId, content);
    const isDuplicate = await this.isDuplicateMessage(messageHash);
    
    if (isDuplicate) {
      return {
        type: 'SPAM',
        severity: 'HIGH',
        confidence: 90,
        details: 'Duplicate message detected'
      };
    }

    return null;
  }

  /**
   * Detect toxicity in content
   */
  private static detectToxicity(content: string): Violation | null {
    for (const pattern of this.TOXICITY_PATTERNS) {
      if (pattern.test(content)) {
        return {
          type: 'TOXICITY',
          severity: 'HIGH',
          confidence: 85,
          details: 'Toxic language detected'
        };
      }
    }

    return null;
  }

  /**
   * Detect pump & dump schemes
   */
  private static detectPumpDump(content: string): Violation | null {
    for (const pattern of this.PUMP_DUMP_PATTERNS) {
      if (pattern.test(content)) {
        return {
          type: 'PUMP_DUMP',
          severity: 'CRITICAL',
          confidence: 90,
          details: 'Pump & dump scheme detected'
        };
      }
    }

    return null;
  }

  /**
   * Detect malicious links
   */
  private static detectMaliciousLinks(content: string): Violation | null {
    for (const pattern of this.MALICIOUS_LINK_PATTERNS) {
      if (pattern.test(content)) {
        return {
          type: 'MALICIOUS_LINK',
          severity: 'CRITICAL',
          confidence: 95,
          details: 'Malicious link detected'
        };
      }
    }

    return null;
  }

  /**
   * Detect caps spam
   */
  private static detectCapsSpam(content: string): Violation | null {
    if (!currentConfig.capsSpam.enabled) return null;

    const capsCount = (content.match(/[A-Z]/g) || []).length;
    const totalCount = content.length;
    const capsRatio = capsCount / totalCount;

    if (capsRatio > currentConfig.capsSpam.capsRatioThreshold && totalCount > currentConfig.capsSpam.minMessageLength) {
      return {
        type: 'CAPS_SPAM',
        severity: 'LOW',
        confidence: 70,
        details: 'Excessive caps usage'
      };
    }

    return null;
  }

  /**
   * Detect repeat messages
   */
  private static async detectRepeatMessages(userId: string, content: string): Promise<Violation | null> {
    const recentMessages = await prisma.chatMessage.findMany({
      where: {
        userId,
        createdAt: {
          gte: new Date(Date.now() - currentConfig.spam.duplicateMessageWindow * 1000)
        }
      },
      orderBy: { createdAt: 'desc' },
      take: currentConfig.spam.duplicateMessageThreshold
    });

    const identicalCount = recentMessages.filter(msg => 
      msg.content.toLowerCase() === content.toLowerCase()
    ).length;

    if (identicalCount >= currentConfig.spam.duplicateMessageThreshold) {
      return {
        type: 'REPEAT_MESSAGE',
        severity: 'MEDIUM',
        confidence: 85,
        details: 'Repeated messages detected'
      };
    }

    return null;
  }

  /**
   * Determine moderation action based on violations
   */
  private static determineAction(violations: Violation[]): ModerationAction {
    if (violations.length === 0) {
      return { type: 'WARNING', reason: 'No violations detected' };
    }

    const criticalViolations = violations.filter(v => v.severity === 'CRITICAL');
    const highViolations = violations.filter(v => v.severity === 'HIGH');
    const mediumViolations = violations.filter(v => v.severity === 'MEDIUM');
    const lowViolations = violations.filter(v => v.severity === 'LOW');

    // Critical violations = immediate ban
    if (criticalViolations.length > 0) {
      return {
        type: 'BAN',
        duration: currentConfig.durations.ban,
        reason: 'Critical violation detected'
      };
    }

    // High violations = mute
    if (highViolations.length > 0) {
      return {
        type: 'MUTE',
        duration: currentConfig.durations.mute,
        reason: 'High severity violation'
      };
    }

    // Medium violations = strike
    if (mediumViolations.length > 0) {
      return {
        type: 'STRIKE',
        reason: 'Medium severity violation'
      };
    }

    // Low violations = warning
    if (lowViolations.length > 0) {
      return {
        type: 'WARNING',
        reason: 'Low severity violation'
      };
    }

    return { type: 'WARNING', reason: 'Violation detected' };
  }

  /**
   * Generate reason for moderation action
   */
  private static generateReason(violations: Violation[]): string {
    if (violations.length === 0) return 'No violations detected';
    
    const violationTypes = violations.map(v => v.type).join(', ');
    return `Violations detected: ${violationTypes}`;
  }

  /**
   * Execute moderation action
   */
  static async executeAction(userId: string, action: ModerationAction, moderatorId?: string): Promise<boolean> {
    try {
      const moderationAction = await prisma.chatModerationAction.create({
        data: {
          userId,
          moderatorId,
          action: action.type,
          reason: action.reason,
          duration: action.duration,
          expiresAt: action.duration ? new Date(Date.now() + action.duration * 60 * 1000) : null
        }
      });

      // Update user moderation status
      await this.updateUserModerationStatus(userId, action);

      return true;
    } catch (error) {
      console.error('Error executing moderation action:', error);
      return false;
    }
  }

  /**
   * Update user moderation status
   */
  private static async updateUserModerationStatus(userId: string, action: ModerationAction): Promise<void> {
    const status = await prisma.userModerationStatus.findUnique({
      where: { userId }
    });

    if (!status) {
      await prisma.userModerationStatus.create({
        data: {
          userId,
          trustScore: currentConfig.trustScore.initialScore,
          strikes: 0,
          isMuted: false,
          isBanned: false,
          violationCount: 0
        }
      });
    }

    const updates: any = {
      lastViolation: new Date(),
      violationCount: { increment: 1 }
    };

    switch (action.type) {
      case 'BAN':
        updates.isBanned = true;
        updates.bannedUntil = action.duration ? new Date(Date.now() + action.duration * 60 * 1000) : null;
        updates.trustScore = Math.max(
          currentConfig.trustScore.minScore, 
          (status?.trustScore || currentConfig.trustScore.initialScore) - currentConfig.trustScore.banPenalty
        );
        break;
      case 'MUTE':
        updates.isMuted = true;
        updates.mutedUntil = action.duration ? new Date(Date.now() + action.duration * 60 * 1000) : null;
        updates.trustScore = Math.max(
          currentConfig.trustScore.minScore, 
          (status?.trustScore || currentConfig.trustScore.initialScore) - currentConfig.trustScore.mutePenalty
        );
        break;
      case 'STRIKE':
        updates.strikes = { increment: 1 };
        updates.trustScore = Math.max(
          currentConfig.trustScore.minScore, 
          (status?.trustScore || currentConfig.trustScore.initialScore) - currentConfig.trustScore.strikePenalty
        );
        break;
      case 'WARNING':
        updates.trustScore = Math.max(
          currentConfig.trustScore.minScore, 
          (status?.trustScore || currentConfig.trustScore.initialScore) - currentConfig.trustScore.warningPenalty
        );
        break;
    }

    await prisma.userModerationStatus.update({
      where: { userId },
      data: updates
    });
  }

  /**
   * Check rate limit
   */
  private static async checkRateLimit(key: string, limit: number, window: number): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const current = await redis.get(key);
    const count = current ? parseInt(current) : 0;
    
    if (count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: Date.now() + window * 1000
      };
    }

    await redis.incr(key);
    await redis.expire(key, window);
    
    return {
      allowed: true,
      remaining: limit - count - 1,
      resetAt: Date.now() + window * 1000
    };
  }

  /**
   * Get message hash for duplicate detection
   */
  private static getMessageHash(userId: string, content: string): string {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(`${userId}:${content.toLowerCase()}`).digest('hex');
  }

  /**
   * Check if message is duplicate
   */
  private static async isDuplicateMessage(hash: string): Promise<boolean> {
    const key = `chat:duplicate:${hash}`;
    const exists = await redis.exists(key);
    
    if (exists) {
      return true;
    }

    await redis.setex(key, 30, '1'); // 30 seconds
    return false;
  }

  /**
   * Clean up expired moderation actions
   */
  static async cleanupExpiredActions(): Promise<void> {
    try {
      await prisma.$executeRaw`
        SELECT cleanup_expired_moderation();
      `;
    } catch (error) {
      console.error('Error cleaning up expired moderation actions:', error);
    }
  }

  /**
   * Get user moderation status
   */
  static async getUserModerationStatus(userId: string): Promise<{
    canChat: boolean;
    isMuted: boolean;
    isBanned: boolean;
    mutedUntil?: Date;
    bannedUntil?: Date;
    trustScore: number;
    strikes: number;
  }> {
    const status = await prisma.userModerationStatus.findUnique({
      where: { userId }
    });

    if (!status) {
      return {
        canChat: true,
        isMuted: false,
        isBanned: false,
        trustScore: currentConfig.trustScore.initialScore,
        strikes: 0
      };
    }

    const now = new Date();
    const isMuted = status.isMuted && (!status.mutedUntil || status.mutedUntil > now);
    const isBanned = status.isBanned && (!status.bannedUntil || status.bannedUntil > now);
    const canChat = !isMuted && !isBanned;

    return {
      canChat,
      isMuted,
      isBanned,
      mutedUntil: status.mutedUntil || undefined,
      bannedUntil: status.bannedUntil || undefined,
      trustScore: status.trustScore,
      strikes: status.strikes
    };
  }
}
