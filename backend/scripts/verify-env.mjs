#!/usr/bin/env node
/**
 * Environment Variables Verification Script
 * Run this script to verify all required environment variables are set correctly
 */

import chalk from 'chalk';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

console.log(chalk.blue('\n🔍 Verifying Environment Variables...\n'));

// Required environment variables
const requiredVars = {
  // Core
  NODE_ENV: {
    expected: 'production',
    description: 'Node environment',
    checkValue: true
  },
  PORT: {
    expected: '4002',
    description: 'Server port',
    checkValue: true
  },
  DATABASE_URL: {
    description: 'PostgreSQL connection string',
    validate: (value) => value && (value.includes('postgresql://') || value.includes('postgres://'))
  },
  REDIS_URL: {
    description: 'Redis connection string',
    validate: (value) => value && value.includes('redis://')
  },
  JWT_SECRET: {
    description: 'JWT secret key',
    validate: (value) => value && value.length >= 32
  },
  FRONTEND_ORIGIN: {
    description: 'Allowed frontend origins',
    validate: (value) => value && value.length > 0
  }
};

// Optional but recommended
const optionalVars = {
  BIRDEYE_API_KEY: 'Birdeye API key for token data',
  COINGECKO_API_KEY: 'CoinGecko API key for price data',
  HELIUS_API_KEY: 'Helius API key for Solana RPC',
  DEXSCREENER_BASE_URL: 'DexScreener API base URL',
  DEV_AUTH_BYPASS: 'Development auth bypass flag'
};

let hasErrors = false;

// Check required variables
console.log(chalk.yellow('Required Variables:\n'));
for (const [varName, config] of Object.entries(requiredVars)) {
  const value = process.env[varName];
  
  if (!value) {
    console.log(chalk.red(`❌ ${varName}: NOT SET - ${config.description}`));
    hasErrors = true;
  } else if (config.checkValue && value !== config.expected) {
    console.log(chalk.red(`❌ ${varName}: ${value} (expected: ${config.expected})`));
    hasErrors = true;
  } else if (config.validate && !config.validate(value)) {
    console.log(chalk.red(`❌ ${varName}: Invalid value - ${config.description}`));
    hasErrors = true;
  } else {
    const displayValue = varName.includes('SECRET') || varName.includes('KEY') 
      ? '***' + value.slice(-4) 
      : value;
    console.log(chalk.green(`✅ ${varName}: ${displayValue}`));
  }
}

// Check optional variables
console.log(chalk.yellow('\n\nOptional Variables:\n'));
for (const [varName, description] of Object.entries(optionalVars)) {
  const value = process.env[varName];
  
  if (!value) {
    console.log(chalk.gray(`⚪ ${varName}: Not set - ${description}`));
  } else {
    const displayValue = varName.includes('KEY') ? '***' + value.slice(-4) : value;
    console.log(chalk.green(`✅ ${varName}: ${displayValue}`));
  }
}

// Frontend origin validation
if (process.env.FRONTEND_ORIGIN) {
  console.log(chalk.yellow('\n\nFrontend Origins:\n'));
  const origins = process.env.FRONTEND_ORIGIN.split(',').map(o => o.trim());
  origins.forEach(origin => {
    if (origin.startsWith('http://') || origin.startsWith('https://')) {
      console.log(chalk.green(`✅ ${origin}`));
    } else {
      console.log(chalk.red(`❌ ${origin} - Invalid URL format`));
      hasErrors = true;
    }
  });
}

// Summary
console.log('\n' + chalk.blue('='.repeat(50)));
if (hasErrors) {
  console.log(chalk.red('\n❌ Environment validation FAILED!'));
  console.log(chalk.yellow('\nPlease set the missing/invalid environment variables.'));
  process.exit(1);
} else {
  console.log(chalk.green('\n✅ All required environment variables are set correctly!'));
  
  // Additional recommendations
  const missingOptional = Object.keys(optionalVars).filter(v => !process.env[v]);
  if (missingOptional.length > 0) {
    console.log(chalk.yellow('\n💡 Recommendations:'));
    console.log(chalk.gray('Consider setting these optional variables for full functionality:'));
    missingOptional.forEach(v => console.log(chalk.gray(`  - ${v}`)));
  }
}

console.log(chalk.blue('\n='.repeat(50) + '\n'));
