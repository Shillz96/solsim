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
  // Rate Limiting - Prevent spam by limiting message frequency
  rateLimit: {
    messagesPerWindow: 10, // 10 messages
    windowSeconds: 15, // per 15 seconds
    burstLimit: 5 // Allow 5 messages in quick succession
  },

  // Spam Detection - Detect and prevent spam patterns
  spam: {
    repeatedCharThreshold: 4, // 4+ repeated characters = spam
    duplicateMessageWindow: 30, // Check last 30 seconds
    duplicateMessageThreshold: 3 // 3+ identical messages = spam
  },

  // Toxicity Detection - Filter harmful language
  toxicity: {
    enabled: true,
    confidenceThreshold: 80, // 80% confidence required
    severityThreshold: 'MEDIUM' // Medium severity and above
  },

  // Pump & Dump Detection - Prevent market manipulation
  pumpDump: {
    enabled: true,
    confidenceThreshold: 85, // 85% confidence required
    severityThreshold: 'HIGH' // High severity and above
  },

  // Caps Spam Detection - Prevent excessive caps usage
  capsSpam: {
    enabled: true,
    capsRatioThreshold: 0.7, // 70% caps = spam
    minMessageLength: 10 // Only check messages 10+ characters
  },

  // Action Thresholds - Escalation system
  actions: {
    warningThreshold: 1, // 1 violation = warning
    strikeThreshold: 2, // 2 violations = strike
    muteThreshold: 3, // 3 violations = mute
    banThreshold: 5 // 5 violations = ban
  },

  // Trust Score System - User reputation tracking
  trustScore: {
    initialScore: 100, // Start with perfect trust
    warningPenalty: 5, // -5 points for warning
    strikePenalty: 10, // -10 points for strike
    mutePenalty: 20, // -20 points for mute
    banPenalty: 50, // -50 points for ban
    minScore: 0, // Minimum trust score
    maxScore: 100 // Maximum trust score
  },

  // Duration Settings - How long actions last
  durations: {
    warning: 0, // Warnings don't expire
    strike: 0, // Strikes don't expire
    mute: 30, // 30 minutes mute
    ban: 1440 // 24 hours ban (1440 minutes)
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
        // Stricter settings for production
        rateLimit: {
          messagesPerWindow: 8,
          windowSeconds: 15,
          burstLimit: 3
        },
        actions: {
          warningThreshold: 1,
          strikeThreshold: 2,
          muteThreshold: 3,
          banThreshold: 4 // Stricter ban threshold
        },
        trustScore: {
          ...defaultModerationConfig.trustScore,
          banPenalty: 75 // Harsher ban penalty
        }
      };

    case 'staging':
      return {
        ...defaultModerationConfig,
        // Moderate settings for staging
        rateLimit: {
          messagesPerWindow: 12,
          windowSeconds: 15,
          burstLimit: 4
        }
      };

    case 'development':
    default:
      return {
        ...defaultModerationConfig,
        // Lenient settings for development
        rateLimit: {
          messagesPerWindow: 20,
          windowSeconds: 15,
          burstLimit: 10
        },
        actions: {
          warningThreshold: 2,
          strikeThreshold: 4,
          muteThreshold: 6,
          banThreshold: 10 // Very lenient for testing
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
