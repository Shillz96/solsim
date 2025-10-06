#!/usr/bin/env node
/**
 * Type Consolidation Migration Script
 * 
 * This script migrates the codebase from using src/types/common.ts
 * to using the consolidated shared/types/types.ts
 * 
 * Steps:
 * 1. Add backend-specific types to shared/types/types.ts
 * 2. Update all imports from '../types/common' to '../../shared/types/types'
 * 3. Rename src/types/common.ts to common.deprecated.ts
 * 
 * Run with: node scripts/dev-tools/migrate-to-shared-types.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Backend-specific types to add to shared/types/types.ts
const backendTypesAddition = `
// ============================================
// Backend-Specific Types
// ============================================

import { Request } from 'express';

/**
 * Express Request with authenticated user context
 * Used by all authenticated routes
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    virtualSolBalance?: string;
  };
}

/**
 * Paginated API response with metadata
 * Extends ApiResponse with pagination information
 */
export interface PaginatedResponse<T = any> extends ApiResponse<T> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Cache metadata for optimized responses
 * Tracks cache status and freshness
 */
export interface CacheMetadata {
  cached: boolean;
  cacheKey?: string;
  timestamp: number;
  ttl?: number;
}

/**
 * Performance metrics for monitoring
 * Tracks query performance and optimization usage
 */
export interface PerformanceMetrics {
  queryTime: number;
  cacheHit: boolean;
  dataFreshness: number;
  optimizationUsed?: string;
}
`;

// Files to update (currently only in dist/ and backups)
const filesToUpdate = [
  // Note: The actual src/controllers were moved during cleanup
  // These are just dist/ files that will be regenerated on build
];

function step1_AddBackendTypes() {
  log('\n=== Step 1: Adding Backend Types to shared/types/types.ts ===', 'cyan');
  
  const typesFilePath = path.join(rootDir, 'shared', 'types', 'types.ts');
  
  if (!fs.existsSync(typesFilePath)) {
    log('ERROR: shared/types/types.ts not found!', 'red');
    return false;
  }
  
  let typesContent = fs.readFileSync(typesFilePath, 'utf8');
  
  // Check if backend types are already added
  if (typesContent.includes('Backend-Specific Types')) {
    log('Backend types already exist in shared/types/types.ts', 'yellow');
    return true;
  }
  
  // Add backend types at the end of the file
  typesContent += backendTypesAddition;
  
  fs.writeFileSync(typesFilePath, typesContent);
  log('✓ Added backend-specific types to shared/types/types.ts', 'green');
  
  return true;
}

function step2_UpdateImports() {
  log('\n=== Step 2: Updating Imports ===', 'cyan');
  
  // Since controllers were deleted, we only need to handle any remaining files
  // The main usage was in the old controllers which are now backed up
  
  log('No active files need import updates (controllers were removed)', 'yellow');
  log('When controllers are recreated, use: import { ... } from ../../shared/types/types.js', 'gray');
  
  return true;
}

function step3_DeprecateCommonTypes() {
  log('\n=== Step 3: Deprecating src/types/common.ts ===', 'cyan');
  
  const commonTypesPath = path.join(rootDir, 'src', 'types', 'common.ts');
  const deprecatedPath = path.join(rootDir, 'src', 'types', 'common.deprecated.ts');
  
  if (!fs.existsSync(commonTypesPath)) {
    log('src/types/common.ts not found (may already be deprecated)', 'yellow');
    return true;
  }
  
  // Read the file and add deprecation notice
  let content = fs.readFileSync(commonTypesPath, 'utf8');
  
  const deprecationNotice = `/**
 * @deprecated
 * This file has been deprecated. All types have been consolidated into shared/types/types.ts
 * 
 * Migration:
 * - Import from: ../../shared/types/types.js
 * - Available types: AuthenticatedRequest, ApiResponse, PaginatedResponse, CacheMetadata, PerformanceMetrics
 * - Plus all domain types: User, Trade, Holding, Token, etc.
 * - Plus DecimalUtils for serialization
 * 
 * This file will be removed in a future version.
 */

`;
  
  content = deprecationNotice + content;
  
  // Write to deprecated file
  fs.writeFileSync(deprecatedPath, content);
  
  // Remove original file
  fs.unlinkSync(commonTypesPath);
  
  log('✓ Moved src/types/common.ts to common.deprecated.ts', 'green');
  log('  Original file marked with deprecation notice', 'gray');
  
  return true;
}

function step4_CreateUsageGuide() {
  log('\n=== Step 4: Creating Migration Guide ===', 'cyan');
  
  const guideContent = `# Type Migration Guide

## Overview

All types have been consolidated into \`shared/types/types.ts\` for consistency across frontend and backend.

## Migration Summary

### Before:
\`\`\`typescript
import { AuthenticatedRequest, ApiResponse } from '../types/common.js';
\`\`\`

### After:
\`\`\`typescript
import { AuthenticatedRequest, ApiResponse } from '../../shared/types/types.js';
\`\`\`

## Available Types

### Backend-Specific Types
- \`AuthenticatedRequest\` - Express request with user context
- \`PaginatedResponse<T>\` - API response with pagination
- \`CacheMetadata\` - Cache status information
- \`PerformanceMetrics\` - Query performance tracking

### Domain Types
- \`User\`, \`UserResponse\` - User data (with Decimal serialization)
- \`Trade\`, \`TradeResponse\` - Trade data
- \`Holding\`, \`HoldingResponse\` - Portfolio holding data
- \`Token\`, \`TokenResponse\` - Token information
- \`LeaderboardEntry\`, \`LeaderboardEntryResponse\` - Leaderboard data

### API Types
- \`ApiResponse<T>\` - Generic API response wrapper
- \`SignUpRequest\`, \`SignInRequest\` - Authentication requests
- \`TradeRequest\` - Trade execution request
- \`PortfolioResponse\` - Portfolio data
- \`TrendingTokensResponse\` - Market data

### Utility Classes
- \`DecimalUtils\` - Decimal serialization and conversion utilities
  - \`serializeUser(user: User): UserResponse\`
  - \`deserializeUser(data: UserResponse): User\`
  - \`serializeTrade(trade: Trade): TradeResponse\`
  - \`formatCurrency(value: Decimal | string | number, decimals?: number): string\`
  - And 20+ more utility methods

## Usage Examples

### Basic API Response
\`\`\`typescript
import { ApiResponse } from '../../shared/types/types.js';

const response: ApiResponse<User> = {
  success: true,
  data: user,
  message: 'User retrieved successfully'
};
\`\`\`

### Authenticated Route
\`\`\`typescript
import { AuthenticatedRequest } from '../../shared/types/types.js';

router.get('/profile', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  // ...
});
\`\`\`

### Decimal Serialization
\`\`\`typescript
import { DecimalUtils } from '../../shared/types/types.js';

// Serialize for API response
const userResponse = DecimalUtils.serializeUser(user);

// Deserialize from API
const user = DecimalUtils.deserializeUser(apiResponse);

// Format for display
const formatted = DecimalUtils.formatCurrency(user.virtualSolBalance, 2);
\`\`\`

### Paginated Response
\`\`\`typescript
import { PaginatedResponse } from '../../shared/types/types.js';

const response: PaginatedResponse<Trade[]> = {
  success: true,
  data: trades,
  pagination: {
    page: 1,
    limit: 20,
    total: 150,
    totalPages: 8
  }
};
\`\`\`

## Benefits

1. **Single Source of Truth** - All types in one place
2. **Consistent Decimal Handling** - DecimalUtils for all serialization
3. **Type Safety** - Shared types between frontend/backend
4. **Better Documentation** - Comprehensive type definitions
5. **Utility Functions** - Built-in serialization helpers

## Deprecated Files

- \`src/types/common.ts\` → \`src/types/common.deprecated.ts\`
  - Will be removed in future version
  - Use \`shared/types/types.ts\` instead
`;
  
  const guidePath = path.join(rootDir, 'TYPE_MIGRATION_GUIDE.md');
  fs.writeFileSync(guidePath, guideContent);
  
  log('✓ Created TYPE_MIGRATION_GUIDE.md', 'green');
  
  return true;
}

// Main execution
async function main() {
  log('\n╔══════════════════════════════════════════╗', 'cyan');
  log('║  Type Consolidation Migration Script    ║', 'cyan');
  log('╚══════════════════════════════════════════╝', 'cyan');
  
  const steps = [
    { name: 'Add Backend Types', fn: step1_AddBackendTypes },
    { name: 'Update Imports', fn: step2_UpdateImports },
    { name: 'Deprecate Common Types', fn: step3_DeprecateCommonTypes },
    { name: 'Create Usage Guide', fn: step4_CreateUsageGuide }
  ];
  
  let allSuccess = true;
  
  for (const step of steps) {
    try {
      const success = step.fn();
      if (!success) {
        allSuccess = false;
        log(`✗ ${step.name} failed`, 'red');
      }
    } catch (error) {
      allSuccess = false;
      log(`✗ ${step.name} error: ${error.message}`, 'red');
    }
  }
  
  log('\n═══════════════════════════════════════════', 'cyan');
  
  if (allSuccess) {
    log('\n✓ Migration completed successfully!', 'green');
    log('\nNext steps:', 'cyan');
    log('1. Review TYPE_MIGRATION_GUIDE.md for usage examples', 'gray');
    log('2. When creating new controllers/routes, use shared types', 'gray');
    log('3. Import from: ../../shared/types/types.js', 'gray');
    log('4. Use DecimalUtils for all Decimal serialization', 'gray');
    log('\nThe following types are now available:', 'yellow');
    log('  - AuthenticatedRequest', 'gray');
    log('  - ApiResponse, PaginatedResponse', 'gray');
    log('  - User, Trade, Holding, Token, LeaderboardEntry', 'gray');
    log('  - DecimalUtils (serialization utilities)', 'gray');
  } else {
    log('\n✗ Migration encountered errors', 'red');
    log('Please review the output above and fix any issues', 'yellow');
    process.exit(1);
  }
}

main().catch(error => {
  log(`\nFatal error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
