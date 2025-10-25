/**
 * Moderation Bot Configuration
 * 
 * Centralized configuration for moderation thresholds and settings
 * with Mario theme integration and adjustable parameters
 */

export interface ModerationConfig {
  // Rate Limiting
  rateLimit: {
    messagesPerWindow: number;
    windowSeconds: number;
    burstLimit: number;
  };

  // Spam Detection
  spam: {
    repeatedCharThreshold: number; // Number of repeated characters
    duplicateMessageWindow: number; // Seconds to check for duplicates
    duplicateMessageThreshold: number; // Number of identical messages
  };

  // Toxicity Detection
  toxicity: {
    enabled: boolean;
    confidenceThreshold: number; // 0-100
    severityThreshold: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };

  // Pump & Dump Detection
  pumpDump: {
    enabled: boolean;
    confidenceThreshold: number; // 0-100
    severityThreshold: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };

  // Caps Spam Detection
  capsSpam: {
    enabled: boolean;
    capsRatioThreshold: number; // 0-1 (70% = 0.7)
    minMessageLength: number; // Minimum message length to check
  };

  // Action Thresholds
  actions: {
    warningThreshold: number; // Number of violations before warning
    strikeThreshold: number; // Number of violations before strike
    muteThreshold: number; // Number of violations before mute
    banThreshold: number; // Number of violations before ban
  };

  // Trust Score System
  trustScore: {
    initialScore: number;
    warningPenalty: number;
    strikePenalty: number;
    mutePenalty: number;
    banPenalty: number;
    minScore: number;
    maxScore: number;
  };

  // Duration Settings (in minutes)
  durations: {
    warning: number;
    strike: number;
    mute: number;
    ban: number;
  };

  // Mario Theme Settings
  marioTheme: {
    enabled: boolean;
    useMarioMessages: boolean;
    marioViolationMessages: string[];
  };
}

export const defaultModerationConfig: ModerationConfig = {
  // Rate Limiting - Much more lenient, only prevent excessive spam
  rateLimit: {
    messagesPerWindow: 50, // 50 messages (was 10)
    windowSeconds: 15, // per 15 seconds
    burstLimit: 20 // Allow 20 messages in quick succession (was 5)
  },

  // Spam Detection - Only detect obvious spam patterns
  spam: {
    repeatedCharThreshold: 8, // 8+ repeated characters = spam (was 4)
    duplicateMessageWindow: 60, // Check last 60 seconds (was 10)
    duplicateMessageThreshold: 20 // 20+ identical messages = spam (was 10)
  },

  // Toxicity Detection - Disabled for lenient moderation
  toxicity: {
    enabled: false, // Disabled - let users express themselves
    confidenceThreshold: 95, // 95% confidence required (was 80%)
    severityThreshold: 'CRITICAL' // Only critical severity (was MEDIUM)
  },

  // Pump & Dump Detection - Disabled for lenient moderation
  pumpDump: {
    enabled: false, // Disabled - allow trading discussion
    confidenceThreshold: 95, // 95% confidence required (was 85%)
    severityThreshold: 'CRITICAL' // Only critical severity (was HIGH)
  },

  // Caps Spam Detection - Much more lenient
  capsSpam: {
    enabled: true,
    capsRatioThreshold: 0.9, // 90% caps = spam (was 70%)
    minMessageLength: 20 // Only check messages 20+ characters (was 10)
  },

  // Action Thresholds - Much more lenient escalation
  actions: {
    warningThreshold: 5, // 5 violations = warning (was 1)
    strikeThreshold: 10, // 10 violations = strike (was 2)
    muteThreshold: 20, // 20 violations = mute (was 3)
    banThreshold: 50 // 50 violations = ban (was 5)
  },

  // Trust Score System - More forgiving
  trustScore: {
    initialScore: 100, // Start with perfect trust
    warningPenalty: 2, // -2 points for warning (was 5)
    strikePenalty: 5, // -5 points for strike (was 10)
    mutePenalty: 10, // -10 points for mute (was 20)
    banPenalty: 25, // -25 points for ban (was 50)
    minScore: 0, // Minimum trust score
    maxScore: 100 // Maximum trust score
  },

  // Duration Settings - Shorter durations
  durations: {
    warning: 0, // Warnings don't expire
    strike: 0, // Strikes don't expire
    mute: 5, // 5 minutes mute (was 30)
    ban: 60 // 1 hour ban (was 24 hours)
  },

  // Mario Theme Settings - Fun moderation messages
  marioTheme: {
    enabled: true,
    useMarioMessages: true,
    marioViolationMessages: [
      "🍄 That's-a not-a nice-a message! Try again with better words!",
      "🪨 Bowser's minions don't use that language! Be more like Mario!",
      "⭐ Princess Peach wouldn't approve of that message!",
      "🦆 Yoshi says: 'Be kind to other players!'",
      "🏰 That message doesn't belong in the Mushroom Kingdom!",
      "🍄 Mario says: 'Use your power-ups for good, not spam!'",
      "⭐ Luigi's ghost hunting skills detected something spooky in that message!",
      "🦆 Toad says: 'That's not how we talk in the Mushroom Kingdom!'"
    ]
  }
};

// Environment-specific configurations
export const getModerationConfig = (): ModerationConfig => {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'production':
      return {
        ...defaultModerationConfig,
        // Lenient settings for production - only block obvious spam
        rateLimit: {
          messagesPerWindow: 30, // 30 messages (was 8)
          windowSeconds: 15,
          burstLimit: 15 // Allow 15 messages in quick succession (was 3)
        },
        actions: {
          warningThreshold: 10, // 10 violations = warning (was 1)
          strikeThreshold: 20, // 20 violations = strike (was 2)
          muteThreshold: 30, // 30 violations = mute (was 3)
          banThreshold: 50 // 50 violations = ban (was 4)
        },
        trustScore: {
          ...defaultModerationConfig.trustScore,
          banPenalty: 25 // Same as default (was 75)
        }
      };

    case 'staging':
      return {
        ...defaultModerationConfig,
        // Lenient settings for staging
        rateLimit: {
          messagesPerWindow: 40, // 40 messages (was 12)
          windowSeconds: 15,
          burstLimit: 20 // Allow 20 messages in quick succession (was 4)
        }
      };

    case 'development':
    default:
      return {
        ...defaultModerationConfig,
        // Very lenient settings for development
        rateLimit: {
          messagesPerWindow: 100, // 100 messages (was 20)
          windowSeconds: 15,
          burstLimit: 50 // Allow 50 messages in quick succession (was 10)
        },
        actions: {
          warningThreshold: 20, // 20 violations = warning (was 2)
          strikeThreshold: 40, // 40 violations = strike (was 4)
          muteThreshold: 60, // 60 violations = mute (was 6)
          banThreshold: 100 // 100 violations = ban (was 10)
        }
      };
  }
};

// Configuration validation
export const validateModerationConfig = (config: ModerationConfig): string[] => {
  const errors: string[] = [];

  // Validate rate limiting
  if (config.rateLimit.messagesPerWindow <= 0) {
    errors.push('Rate limit messages per window must be positive');
  }
  if (config.rateLimit.windowSeconds <= 0) {
    errors.push('Rate limit window seconds must be positive');
  }

  // Validate thresholds
  if (config.capsSpam.capsRatioThreshold < 0 || config.capsSpam.capsRatioThreshold > 1) {
    errors.push('Caps spam ratio threshold must be between 0 and 1');
  }

  // Validate trust score
  if (config.trustScore.initialScore < config.trustScore.minScore || 
      config.trustScore.initialScore > config.trustScore.maxScore) {
    errors.push('Initial trust score must be within min/max range');
  }

  // Validate durations
  if (config.durations.mute < 0) {
    errors.push('Mute duration must be non-negative');
  }
  if (config.durations.ban < 0) {
    errors.push('Ban duration must be non-negative');
  }

  return errors;
};

// Export current configuration
export const currentConfig = getModerationConfig();
