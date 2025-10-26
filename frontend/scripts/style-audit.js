#!/usr/bin/env node

/**
 * Style Audit Tool - Find styling conflicts and inconsistencies
 *
 * Usage:
 *   node scripts/style-audit.js
 *
 * This script analyzes your codebase for common styling conflicts:
 * - Mixed shadow styles (soft vs. Mario block shadows)
 * - Inconsistent color references (var(--mario-red) vs. bg-mario)
 * - Border radius inconsistencies
 * - Duplicate utility classes
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Patterns to check
const patterns = {
  // Shadow patterns
  softShadows: /shadow-(xs|sm|md|lg|xl|2xl|inner|none)\b/g,
  marioShadows: /shadow-\[([\d.]+)px\s+([\d.]+)px\s+0\s+var\(--outline-black\)\]/g,
  globalMarioShadows: /mario-shadow(-sm|-md|-lg|-xl)?/g,

  // Color patterns
  cssVarColors: /bg-\[var\(--([a-z-]+)\)\]/g,
  tailwindColors: /bg-(mario|luigi|star|coin|sky|brick|pipe|super|outline)(-\d+)?/g,
  textColors: /text-(mario|luigi|star|coin|sky|brick|pipe|super|outline)(-\d+)?/g,
  borderColors: /border-(mario|luigi|star|coin|sky|brick|pipe|super|outline)(-\d+)?/g,

  // Border radius patterns
  tailwindRadius: /rounded-(none|sm|md|lg|xl|2xl|3xl|full)/g,
  customRadius: /rounded-\[(\d+)px\]/g,
  varRadius: /rounded-\[var\(--radius-([a-z]+)\)\]/g,

  // Border width patterns
  tailwindBorder: /border(-\d+)?(?!\[)/g,
  customBorder: /border-\[(\d+)px\]/g,
  marioBorder: /mario-border(-sm|-lg)?/g,
};

// File scanning
async function scanFiles() {
  const files = await glob('**/*.{tsx,ts,jsx,js}', {
    cwd: path.join(__dirname, '..'),
    ignore: ['node_modules/**', '.next/**', 'dist/**', 'build/**'],
  });

  return files.map(file => path.join(__dirname, '..', file));
}

// Analyze file for conflicts
function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relativePath = path.relative(path.join(__dirname, '..'), filePath);

  const issues = {
    softShadows: [],
    marioShadows: [],
    mixedShadows: false,
    cssVarColors: [],
    tailwindColors: [],
    mixedColors: false,
    borderStyles: [],
    radiusStyles: [],
  };

  // Check shadows
  const softMatches = content.match(patterns.softShadows) || [];
  const marioMatches = content.match(patterns.marioShadows) || [];
  const globalMarioMatches = content.match(patterns.globalMarioShadows) || [];

  if (softMatches.length > 0) {
    issues.softShadows = [...new Set(softMatches)];
  }

  if (marioMatches.length > 0 || globalMarioMatches.length > 0) {
    issues.marioShadows = [...new Set([...marioMatches, ...globalMarioMatches])];
  }

  // Mixed shadows = soft + Mario in same file
  if (issues.softShadows.length > 0 && issues.marioShadows.length > 0) {
    issues.mixedShadows = true;
  }

  // Check colors
  const cssVarMatches = content.match(patterns.cssVarColors) || [];
  const tailwindMatches = [
    ...(content.match(patterns.tailwindColors) || []),
    ...(content.match(patterns.textColors) || []),
    ...(content.match(patterns.borderColors) || []),
  ];

  if (cssVarMatches.length > 0) {
    issues.cssVarColors = [...new Set(cssVarMatches)];
  }

  if (tailwindMatches.length > 0) {
    issues.tailwindColors = [...new Set(tailwindMatches)];
  }

  // Mixed colors = CSS vars + Tailwind in same file
  if (issues.cssVarColors.length > 0 && issues.tailwindColors.length > 0) {
    issues.mixedColors = true;
  }

  // Check border radius
  const radiusMatches = [
    ...(content.match(patterns.tailwindRadius) || []),
    ...(content.match(patterns.customRadius) || []),
    ...(content.match(patterns.varRadius) || []),
  ];
  issues.radiusStyles = [...new Set(radiusMatches)];

  // Check border widths
  const borderMatches = [
    ...(content.match(patterns.tailwindBorder) || []),
    ...(content.match(patterns.customBorder) || []),
    ...(content.match(patterns.marioBorder) || []),
  ];
  issues.borderStyles = [...new Set(borderMatches)];

  return { relativePath, issues };
}

// Main audit
async function runAudit() {
  log('cyan', '\n========================================');
  log('cyan', '  Mario Theme Style Audit');
  log('cyan', '========================================\n');

  const files = await scanFiles();
  log('blue', `Scanning ${files.length} files...\n`);

  const results = files.map(analyzeFile);

  // Report: Mixed shadows
  log('yellow', '\n📦 SHADOW CONFLICTS');
  log('yellow', '─────────────────────────────────────');
  const mixedShadowFiles = results.filter(r => r.issues.mixedShadows);

  if (mixedShadowFiles.length === 0) {
    log('green', '✅ No mixed shadow conflicts found!');
  } else {
    log('red', `❌ Found ${mixedShadowFiles.length} files with mixed shadows:`);
    mixedShadowFiles.forEach(({ relativePath, issues }) => {
      log('red', `\n  ${relativePath}`);
      log('yellow', `    Soft shadows: ${issues.softShadows.join(', ')}`);
      log('yellow', `    Mario shadows: ${issues.marioShadows.join(', ')}`);
    });
  }

  // Report: Mixed colors
  log('yellow', '\n🎨 COLOR REFERENCE CONFLICTS');
  log('yellow', '─────────────────────────────────────');
  const mixedColorFiles = results.filter(r => r.issues.mixedColors);

  if (mixedColorFiles.length === 0) {
    log('green', '✅ No mixed color conflicts found!');
  } else {
    log('red', `❌ Found ${mixedColorFiles.length} files with mixed color references:`);
    mixedColorFiles.slice(0, 10).forEach(({ relativePath, issues }) => {
      log('red', `\n  ${relativePath}`);
      log('yellow', `    CSS vars: ${issues.cssVarColors.slice(0, 5).join(', ')}${issues.cssVarColors.length > 5 ? '...' : ''}`);
      log('yellow', `    Tailwind: ${issues.tailwindColors.slice(0, 5).join(', ')}${issues.tailwindColors.length > 5 ? '...' : ''}`);
    });

    if (mixedColorFiles.length > 10) {
      log('yellow', `\n  ... and ${mixedColorFiles.length - 10} more files`);
    }
  }

  // Report: Border radius variety
  log('yellow', '\n🔲 BORDER RADIUS USAGE');
  log('yellow', '─────────────────────────────────────');
  const allRadii = new Set();
  results.forEach(r => r.issues.radiusStyles.forEach(s => allRadii.add(s)));

  log('blue', `Found ${allRadii.size} unique border radius styles:`);
  const radiusArray = Array.from(allRadii).sort();
  radiusArray.forEach(radius => {
    const count = results.filter(r => r.issues.radiusStyles.includes(radius)).length;
    log('cyan', `  ${radius.padEnd(25)} - used in ${count} files`);
  });

  // Report: Border width variety
  log('yellow', '\n📏 BORDER WIDTH USAGE');
  log('yellow', '─────────────────────────────────────');
  const allBorders = new Set();
  results.forEach(r => r.issues.borderStyles.forEach(s => allBorders.add(s)));

  log('blue', `Found ${allBorders.size} unique border width styles:`);
  const borderArray = Array.from(allBorders).sort();
  borderArray.forEach(border => {
    const count = results.filter(r => r.issues.borderStyles.includes(border)).length;
    log('cyan', `  ${border.padEnd(25)} - used in ${count} files`);
  });

  // Summary
  log('cyan', '\n========================================');
  log('cyan', '  Audit Summary');
  log('cyan', '========================================');
  log('blue', `Total files scanned: ${files.length}`);
  log(mixedShadowFiles.length > 0 ? 'red' : 'green', `Shadow conflicts: ${mixedShadowFiles.length}`);
  log(mixedColorFiles.length > 0 ? 'red' : 'green', `Color conflicts: ${mixedColorFiles.length}`);
  log('blue', `Unique radius styles: ${allRadii.size}`);
  log('blue', `Unique border styles: ${allBorders.size}`);

  // Recommendations
  log('yellow', '\n💡 RECOMMENDATIONS');
  log('yellow', '─────────────────────────────────────');

  if (mixedShadowFiles.length > 0) {
    log('yellow', '1. Standardize shadows:');
    log('white', '   Replace soft shadows with Mario block shadows');
    log('white', '   Use: shadow-[3px_3px_0_var(--outline-black)]');
  }

  if (mixedColorFiles.length > 0) {
    log('yellow', '2. Standardize color references:');
    log('white', '   Choose ONE approach:');
    log('white', '   - CSS vars: bg-[var(--mario-red)]');
    log('white', '   - Tailwind: bg-mario');
  }

  if (allRadii.size > 8) {
    log('yellow', '3. Consolidate border radius:');
    log('white', '   Use semantic tokens from theme (rounded-sm/md/lg/xl)');
    log('white', '   Avoid custom values like rounded-[14px]');
  }

  log('cyan', '\n========================================\n');
}

// Run audit
runAudit().catch(err => {
  console.error('Error running audit:', err);
  process.exit(1);
});
