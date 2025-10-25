#!/usr/bin/env node
/**
 * Generate all favicon sizes from the source favicon.ico
 * This creates optimized icons for web, iOS, and Android devices
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sourceFile = path.join(__dirname, '../public/favicon.ico');
const publicDir = path.join(__dirname, '../public');
const appDir = path.join(__dirname, '../app');

// Icon configurations
const icons = [
  // Web favicons
  { size: 16, name: 'favicon-16x16.png', dir: publicDir },
  { size: 32, name: 'favicon-32x32.png', dir: publicDir },
  { size: 48, name: 'favicon-48x48.png', dir: publicDir },
  
  // Apple Touch Icons
  { size: 180, name: 'apple-touch-icon.png', dir: publicDir },
  { size: 180, name: 'apple-icon.png', dir: appDir },
  
  // Android Chrome Icons
  { size: 192, name: 'android-chrome-192x192.png', dir: publicDir },
  { size: 512, name: 'android-chrome-512x512.png', dir: publicDir },
  
  // Next.js App Router Icons
  { size: 32, name: 'icon.png', dir: appDir }, // Default icon for Next.js
];

async function generateFavicons() {
  console.log('🎨 Generating favicons from:', sourceFile);
  
  if (!fs.existsSync(sourceFile)) {
    console.error('❌ Source favicon.ico not found at:', sourceFile);
    process.exit(1);
  }

  // Ensure directories exist
  if (!fs.existsSync(appDir)) {
    fs.mkdirSync(appDir, { recursive: true });
  }

  // Copy original favicon.ico to app directory for Next.js
  const appFavicon = path.join(appDir, 'favicon.ico');
  fs.copyFileSync(sourceFile, appFavicon);
  console.log('✅ Copied favicon.ico to app directory');

  // Generate all sizes
  for (const icon of icons) {
    const outputPath = path.join(icon.dir, icon.name);
    
    try {
      await sharp(sourceFile)
        .resize(icon.size, icon.size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Generated ${icon.name} (${icon.size}x${icon.size})`);
    } catch (error) {
      console.error(`❌ Failed to generate ${icon.name}:`, error.message);
    }
  }

  console.log('\n🎉 All favicons generated successfully!');
  console.log('\n📝 Next steps:');
  console.log('1. Restart your development server');
  console.log('2. Clear browser cache (Ctrl+Shift+Delete)');
  console.log('3. Hard refresh (Ctrl+Shift+R)');
}

generateFavicons().catch(error => {
  console.error('❌ Error generating favicons:', error);
  process.exit(1);
});
