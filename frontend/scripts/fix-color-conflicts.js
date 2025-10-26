#!/usr/bin/env node

/**
 * Fix Color Conflicts Script
 *
 * Automatically replaces CSS var color references with Tailwind classes
 * to standardize the Mario theme color system.
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// Color mapping from CSS vars to Tailwind classes
const COLOR_MAPPINGS = {
  // Base semantic colors
  'bg-[var(--card)]': 'bg-card',
  'bg-[var(--background)]': 'bg-background',
  'bg-[var(--foreground)]': 'bg-foreground',
  'text-[var(--foreground)]': 'text-foreground',
  'text-[var(--outline-black)]': 'text-outline',
  'border-[var(--outline-black)]': 'border-outline',
  'bg-[var(--sky-blue)]': 'bg-sky',
  'bg-[var(--star-yellow)]': 'bg-star',
  'bg-[var(--coin-yellow)]': 'bg-coin',
  'bg-[var(--mario-red)]': 'bg-mario',
  'bg-[var(--luigi-green)]': 'bg-luigi',
  'text-[var(--mario-red)]': 'text-mario',
  'text-[var(--luigi-green)]': 'text-luigi',
  'text-[var(--star-yellow)]': 'text-star',
  'text-[var(--coin-yellow)]': 'text-coin',
  'border-[var(--mario-red)]': 'border-mario',
  'border-[var(--luigi-green)]': 'border-luigi',
  'border-[var(--star-yellow)]': 'border-star',
  'border-[var(--coin-yellow)]': 'border-coin',
  'bg-[var(--coin-gold)]': 'bg-coin',
  'bg-[var(--pipe-green)]': 'bg-pipe',
  'bg-[var(--brick-brown)]': 'bg-brick',
  'text-[var(--coin-gold)]': 'text-coin',
  'text-[var(--pipe-green)]': 'text-pipe',
  'text-[var(--brick-brown)]': 'text-brick',
  'border-[var(--coin-gold)]': 'border-coin',
  'border-[var(--pipe-green)]': 'border-pipe',
  'border-[var(--brick-brown)]': 'border-brick',
  'bg-[var(--super-blue)]': 'bg-super',
  'text-[var(--super-blue)]': 'text-super',
  'border-[var(--super-blue)]': 'border-super',
  // Trading-specific colors
  'bg-[var(--color-luigi)]': 'bg-luigi',
  'bg-[var(--color-sell)]': 'bg-mario',
  'bg-[var(--color-star)]': 'bg-star',
  'bg-[var(--color-coin)]': 'bg-coin',
  'bg-[var(--color-super)]': 'bg-super',
  'bg-[var(--color-brand)]': 'bg-mario', // Brand color maps to Mario red
  'text-[var(--color-luigi)]': 'text-luigi',
  'text-[var(--color-sell)]': 'text-mario',
  'text-[var(--color-star)]': 'text-star',
  'text-[var(--color-coin)]': 'text-coin',
  'text-[var(--color-super)]': 'text-super',
  'text-[var(--color-brand)]': 'text-mario',
  'border-[var(--color-luigi)]': 'border-luigi',
  'border-[var(--color-sell)]': 'border-mario',
  'border-[var(--color-star)]': 'border-star',
  'border-[var(--color-coin)]': 'border-coin',
  'border-[var(--color-super)]': 'border-super',
  'border-[var(--color-brand)]': 'border-mario',
};

async function fixColorConflicts() {
  console.log('🔧 Fixing color conflicts...\n');

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

    // Apply all color mappings
    for (const [cssVar, tailwindClass] of Object.entries(COLOR_MAPPINGS)) {
      const regex = new RegExp(cssVar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const matches = content.match(regex);
      if (matches) {
        newContent = newContent.replace(regex, tailwindClass);
        fileFixes += matches.length;
      }
    }

    if (fileFixes > 0) {
      fs.writeFileSync(filePath, newContent);
      console.log(`✅ ${path.relative(path.join(__dirname, '..'), filePath)} - ${fileFixes} fixes`);
      totalFixes += fileFixes;
    }
  }

  console.log(`\n🎉 Fixed ${totalFixes} color conflicts across ${files.length} files!`);
}

fixColorConflicts().catch(err => {
  console.error('Error fixing color conflicts:', err);
  process.exit(1);
});
