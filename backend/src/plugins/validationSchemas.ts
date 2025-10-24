/**
 * Validation Schemas for Badge and Moderation Routes
 * 
 * Simple validation schemas that work with the existing validation system
 */

export const badgeSchemas = {
  badgeAward: {
    type: 'object',
    required: ['badgeName'],
    properties: {
      badgeName: {
        type: 'string',
        minLength: 1,
        maxLength: 100
      },
      userId: {
        type: 'string',
        pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      }
    },
    additionalProperties: false
  },

  toggleBadge: {
    type: 'object',
    required: ['badgeId'],
    properties: {
      badgeId: {
        type: 'string',
        pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      }
    },
    additionalProperties: false
  }
};

export const moderationSchemas = {
  muteUser: {
    type: 'object',
    required: ['username', 'duration', 'reason'],
    properties: {
      username: {
        type: 'string',
        minLength: 1,
        maxLength: 50
      },
      duration: {
        type: 'number',
        minimum: 1,
        maximum: 10080
      },
      reason: {
        type: 'string',
        minLength: 1,
        maxLength: 500
      }
    },
    additionalProperties: false
  },

  banUser: {
    type: 'object',
    required: ['username', 'reason'],
    properties: {
      username: {
        type: 'string',
        minLength: 1,
        maxLength: 50
      },
      duration: {
        type: 'number',
        minimum: 1,
        maximum: 10080
      },
      reason: {
        type: 'string',
        minLength: 1,
        maxLength: 500
      }
    },
    additionalProperties: false
  },

  kickUser: {
    type: 'object',
    required: ['username', 'reason'],
    properties: {
      username: {
        type: 'string',
        minLength: 1,
        maxLength: 50
      },
      reason: {
        type: 'string',
        minLength: 1,
        maxLength: 500
      }
    },
    additionalProperties: false
  },

  clearMessages: {
    type: 'object',
    required: ['count'],
    properties: {
      count: {
        type: 'number',
        minimum: 1,
        maximum: 100
      },
      roomId: {
        type: 'string',
        minLength: 1,
        maxLength: 100
      }
    },
    additionalProperties: false
  },

  announce: {
    type: 'object',
    required: ['message'],
    properties: {
      message: {
        type: 'string',
        minLength: 1,
        maxLength: 500
      },
      roomId: {
        type: 'string',
        minLength: 1,
        maxLength: 100
      }
    },
    additionalProperties: false
  }
};


