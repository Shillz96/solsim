#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get all TypeScript and TSX files in the frontend directory
function getAllTsFiles(dir) {
  const files = [];
  
  function traverseDir(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        traverseDir(fullPath);
      } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
        files.push(fullPath);
      }
    }
  }
  
  traverseDir(dir);
  return files;
}

// Property name mappings
const propertyMappings = [
  { from: /token\.tokenAddress/g, to: 'token.address' },
  { from: /token\.tokenName/g, to: 'token.name' },
  { from: /token\.tokenSymbol/g, to: 'token.symbol' },
  { from: /token\.tokenImage/g, to: 'token.imageUrl' },
  
  // Price and change related
  { from: /token\.priceChangePercent24h/g, to: 'parseFloat(token.priceChange24h || \'0\')' },
  { from: /token\.price(?!\w)/g, to: 'parseFloat(token.lastPrice || \'0\')' },
  { from: /token\.marketCap(?!\w)/g, to: 'parseFloat(token.marketCapUsd || \'0\')' },
  { from: /token\.volume24h(?!\w)/g, to: 'parseFloat(token.volume24h || \'0\')' },
  { from: /token\.trendScore/g, to: 'parseFloat(token.momentumScore || \'0\')' },
  
  // Leaderboard entry fixes  
  { from: /entry\.username/g, to: 'entry.displayName' },
  { from: /entry\.pnlPercentage/g, to: 'parseFloat(entry.totalPnlUsd || \'0\')' },
  { from: /entry\.totalValueUsd/g, to: 'entry.totalPnlUsd' },
  
  // Import fixes
  { from: /@\/lib\/types\/api-types/g, to: '@/lib/types/backend' },
  { from: /import type { TrendingToken } from "@\/lib\/types\/backend"/g, to: 'import type * as Backend from "@/lib/types/backend"' },
  
  // Service layer fixes
  { from: /portfolioService\./g, to: 'api.' },
  { from: /userService\./g, to: 'api.' },
  { from: /authService\./g, to: 'api.' },

  // Fix double parseFloat calls
  { from: /parseFloat\(parseFloat\(([^)]+)\)/g, to: 'parseFloat($1)' }
];

const frontendDir = './frontend';
const files = getAllTsFiles(frontendDir);

console.log(`Found ${files.length} TypeScript files to process...`);

let totalReplacements = 0;

for (const file of files) {
  try {
    let content = fs.readFileSync(file, 'utf8');
    let fileChanged = false;
    let fileReplacements = 0;
    
    for (const mapping of propertyMappings) {
      const matches = content.match(mapping.from);
      if (matches) {
        content = content.replace(mapping.from, mapping.to);
        fileReplacements += matches.length;
        fileChanged = true;
      }
    }
    
    if (fileChanged) {
      fs.writeFileSync(file, content);
      console.log(`✓ ${file}: ${fileReplacements} replacements`);
      totalReplacements += fileReplacements;
    }
    
  } catch (error) {
    console.error(`✗ Error processing ${file}: ${error.message}`);
  }
}

console.log(`\nCompleted! Total replacements: ${totalReplacements}`);
console.log('\nRunning build to check for remaining issues...');

// Test build
try {
  execSync('cd frontend && npm run build', { stdio: 'inherit' });
  console.log('✅ Build successful!');
} catch (error) {
  console.log('❌ Build still has issues. Manual fixes needed.');
}
