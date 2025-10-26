#!/usr/bin/env node

/**
 * Fix Border Radius Script
 *
 * Replace custom border radius values with semantic theme tokens
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// Border radius mapping from custom values to semantic tokens
const BORDER_RADIUS_MAPPINGS = {
  // Map custom pixel values to semantic tokens
  'rounded-[2px]': 'rounded-xs',     // 2px → xs (4px) - closest
  'rounded-[4px]': 'rounded-xs',     // 4px → xs (4px) - exact
  'rounded-[6px]': 'rounded-sm',     // 6px → sm (6px) - exact
  'rounded-[8px]': 'rounded',        // 8px → default (8px) - exact
  'rounded-[10px]': 'rounded-md',    // 10px → md (10px) - exact
  'rounded-[12px]': 'rounded-lg',    // 12px → lg (12px) - exact
  'rounded-[14px]': 'rounded-lg',    // 14px → lg (12px) - close enough
  'rounded-[16px]': 'rounded-xl',    // 16px → xl (16px) - exact
  'rounded-[20px]': 'rounded-xl',    // 20px → xl (16px) - close enough
  'rounded-[24px]': 'rounded-xxl',   // 24px → xxl (24px) - exact

  // CSS var radius (keep as is - it's semantic)
  // 'rounded-[var(--radius-xl)]': 'rounded-xl', // This is already semantic
};

async function fixBorderRadius() {
  console.log('🔧 Fixing border radius inconsistencies...\n');

  const files = await glob('**/*.{tsx,ts,jsx,js}', {
    cwd: path.join(__dirname, '..'),
    ignore: ['node_modules/**', '.next/**', 'dist/**', 'build/**', 'scripts/**'],
  });

  const fullPaths = files.map(file => path.join(__dirname, '..', file));

  let totalFixes = 0;

  for (const filePath of fullPaths) {
    const content = fs.readFileSync(filePath, 'utf-8');
    let newContent = content;
    let fileFixes = 0;

    // Apply all border radius mappings
    for (const [customValue, semanticToken] of Object.entries(BORDER_RADIUS_MAPPINGS)) {
      const regex = new RegExp(customValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const matches = content.match(regex);
      if (matches) {
        newContent = newContent.replace(regex, semanticToken);
        fileFixes += matches.length;
      }
    }

    if (fileFixes > 0) {
      fs.writeFileSync(filePath, newContent);
      console.log(`✅ ${path.relative(path.join(__dirname, '..'), filePath)} - ${fileFixes} fixes`);
      totalFixes += fileFixes;
    }
  }

  console.log(`\n🎉 Fixed ${totalFixes} border radius inconsistencies across ${files.length} files!`);
}

fixBorderRadius().catch(err => {
  console.error('Error fixing border radius:', err);
  process.exit(1);
});
