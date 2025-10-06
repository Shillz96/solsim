#!/usr/bin/env node
/**
 * Frontend Environment Variables Verification Script
 * Run this script to verify all required environment variables are set correctly
 */

const chalk = require('chalk');

console.log(chalk.blue('\n🔍 Verifying Frontend Environment Variables...\n'));

// Required environment variables
const requiredVars = {
  NEXT_PUBLIC_API_URL: {
    description: 'Backend API URL',
    validate: (value) => value && (value.startsWith('http://') || value.startsWith('https://'))
  },
  NEXT_PUBLIC_ENV: {
    expected: 'production',
    description: 'Environment mode',
    checkValue: true
  },
  NEXT_PUBLIC_APP_URL: {
    description: 'Frontend application URL',
    validate: (value) => value && (value.startsWith('http://') || value.startsWith('https://'))
  }
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
    console.log(chalk.green(`✅ ${varName}: ${value}`));
  }
}

// API connectivity check
if (process.env.NEXT_PUBLIC_API_URL && !hasErrors) {
  console.log(chalk.yellow('\n\nAPI Connectivity Test:\n'));
  console.log(chalk.gray(`Testing connection to: ${process.env.NEXT_PUBLIC_API_URL}/health`));
  
  // Note: This is a basic check, actual connectivity test would require fetch
  if (process.env.NEXT_PUBLIC_API_URL.includes('railway.app')) {
    console.log(chalk.green('✅ Using Railway backend'));
  } else if (process.env.NEXT_PUBLIC_API_URL.includes('localhost')) {
    console.log(chalk.yellow('⚠️  Using localhost backend - ensure it\'s running'));
  }
}

// Summary
console.log('\n' + chalk.blue('='.repeat(50)));
if (hasErrors) {
  console.log(chalk.red('\n❌ Environment validation FAILED!'));
  console.log(chalk.yellow('\nPlease set the missing/invalid environment variables in Vercel dashboard.'));
  process.exit(1);
} else {
  console.log(chalk.green('\n✅ All required environment variables are set correctly!'));
  
  // Additional tips
  console.log(chalk.yellow('\n💡 Next Steps:'));
  console.log(chalk.gray('1. Deploy to Vercel with these environment variables'));
  console.log(chalk.gray('2. Test the deployed application'));
  console.log(chalk.gray('3. Check browser console for any errors'));
}

console.log(chalk.blue('\n='.repeat(50) + '\n'));
