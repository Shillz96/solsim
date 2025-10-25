#!/usr/bin/env ts-node

/**
 * Run UUID fix script
 * This addresses the null constraint violation on user.id
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function runUuidFix() {
  try {
    console.log('🔧 Running UUID fix script...');
    
    // Run the TypeScript script
    const { stdout, stderr } = await execAsync('npx ts-node scripts/fix-uuid-defaults.ts', {
      cwd: process.cwd()
    });
    
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    
    console.log('✅ UUID fix completed successfully');
    
  } catch (error) {
    console.error('❌ Error running UUID fix:', error);
    throw error;
  }
}

runUuidFix()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
