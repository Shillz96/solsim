/**
 * WCAG AA Contrast Verification Script
 *
 * Tests all Mario theme color combinations for WCAG AA compliance
 *
 * WCAG AA Requirements:
 * - Normal text: 4.5:1 minimum contrast ratio
 * - Large text (18pt+ or 14pt+ bold): 3:1 minimum
 * - UI components: 3:1 minimum
 */

// Mario Theme Colors (from theme.css)
const colors = {
  // Core Mario Colors
  'mario-red': '#E52521',
  'luigi-green': '#2E8B32',
  'star-yellow': '#FFD800',
  'coin-yellow': '#FFD700',
  'sky-blue': '#A6D8FF',
  'pipe-green': '#00994C',
  'outline-black': '#1C1C1C',

  // Backgrounds
  'background': '#FFFAE9',  // Warm cream
  'card': '#FFFAE9',

  // Light card variants (calculated with color-mix)
  'card-portfolio': colorMix('#43B047', 15, '#FFFAE9', 85),  // Light Luigi green
  'card-stats': colorMix('#FFD800', 15, '#FFFAE9', 85),      // Light star yellow
  'card-info': colorMix('#A6D8FF', 15, '#FFFAE9', 85),       // Light sky blue
  'card-success': colorMix('#43B047', 20, '#FFFAE9', 80),    // Light green
  'card-warning': colorMix('#E52521', 10, '#FFFAE9', 90),    // Light red
  'card-trading': colorMix('#00994C', 10, '#FFFAE9', 90),    // Light pipe green
  'card-token': colorMix('#A6D8FF', 25, '#FFFAE9', 75),      // Sky blue
  'card-neutral': colorMix('#00994C', 8, '#FFFAE9', 92),     // Very light pipe green
};

// Helper: Color mixing simulation (simplified for sRGB)
function colorMix(color1, percent1, color2, percent2) {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const p1 = percent1 / 100;
  const p2 = percent2 / 100;

  const r = Math.round(c1.r * p1 + c2.r * p2);
  const g = Math.round(c1.g * p1 + c2.g * p2);
  const b = Math.round(c1.b * p1 + c2.b * p2);

  return rgbToHex(r, g, b);
}

// Helper: Hex to RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// Helper: RGB to Hex
function rgbToHex(r, g, b) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// Helper: Relative luminance (WCAG formula)
function relativeLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Helper: Contrast ratio (WCAG formula)
function contrastRatio(color1, color2) {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  const L1 = relativeLuminance(rgb1.r, rgb1.g, rgb1.b);
  const L2 = relativeLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);

  return (lighter + 0.05) / (darker + 0.05);
}

// Test combinations
const testCases = [
  // Light card backgrounds vs dark text
  { bg: 'card-portfolio', fg: 'outline-black', type: 'normal', context: 'Portfolio card text' },
  { bg: 'card-stats', fg: 'outline-black', type: 'normal', context: 'Stats card text' },
  { bg: 'card-info', fg: 'outline-black', type: 'normal', context: 'Info card text' },
  { bg: 'card-success', fg: 'outline-black', type: 'normal', context: 'Success card text' },
  { bg: 'card-warning', fg: 'outline-black', type: 'normal', context: 'Warning card text' },
  { bg: 'card-trading', fg: 'outline-black', type: 'normal', context: 'Trading card text' },
  { bg: 'card-token', fg: 'outline-black', type: 'normal', context: 'Token card text' },
  { bg: 'card-neutral', fg: 'outline-black', type: 'normal', context: 'Neutral card text' },

  // Main background vs text
  { bg: 'background', fg: 'outline-black', type: 'normal', context: 'Page background vs text' },

  // Button colors vs white text
  { bg: 'mario-red', fg: '#FFFFFF', type: 'large', context: 'Mario red button text' },
  { bg: 'luigi-green', fg: '#FFFFFF', type: 'large', context: 'Luigi green button text' },
  { bg: 'star-yellow', fg: 'outline-black', type: 'large', context: 'Star yellow button text' },
  { bg: 'sky-blue', fg: 'outline-black', type: 'large', context: 'Sky blue button text' },
  { bg: 'pipe-green', fg: '#FFFFFF', type: 'large', context: 'Pipe green button text' },

  // Profit/loss colors vs backgrounds
  { bg: 'background', fg: 'luigi-green', type: 'normal', context: 'Profit text on background' },
  { bg: 'background', fg: 'mario-red', type: 'normal', context: 'Loss text on background' },
  { bg: 'card-portfolio', fg: 'luigi-green', type: 'normal', context: 'Profit on portfolio card' },
  { bg: 'card-portfolio', fg: 'mario-red', type: 'normal', context: 'Loss on portfolio card' },
];

// Run tests
console.log('\n🎨 WCAG AA Contrast Verification for Mario Theme\n');
console.log('━'.repeat(80));

let passCount = 0;
let failCount = 0;
const failures = [];

testCases.forEach(test => {
  const bgColor = colors[test.bg];
  const fgColor = test.fg.startsWith('#') ? test.fg : colors[test.fg];
  const ratio = contrastRatio(bgColor, fgColor);

  // WCAG AA requirements
  const required = test.type === 'normal' ? 4.5 : 3.0;
  const pass = ratio >= required;

  const status = pass ? '✅ PASS' : '❌ FAIL';
  const icon = pass ? '✅' : '❌';

  console.log(`\n${status} - ${test.context}`);
  console.log(`   Background: ${test.bg} (${bgColor})`);
  console.log(`   Foreground: ${test.fg} (${fgColor})`);
  console.log(`   Contrast: ${ratio.toFixed(2)}:1 (required: ${required}:1 for ${test.type} text)`);

  if (pass) {
    passCount++;
  } else {
    failCount++;
    failures.push({
      ...test,
      ratio: ratio.toFixed(2),
      required,
      bgColor,
      fgColor
    });
  }
});

// Summary
console.log('\n' + '━'.repeat(80));
console.log(`\n📊 Summary: ${passCount} passed, ${failCount} failed out of ${testCases.length} tests\n`);

if (failures.length > 0) {
  console.log('⚠️  Failed Tests:\n');
  failures.forEach(f => {
    console.log(`   ❌ ${f.context}`);
    console.log(`      ${f.ratio}:1 (need ${f.required}:1) - ${f.bg} vs ${f.fg}`);
    console.log(`      Suggestion: Increase contrast or use larger text`);
  });
  console.log('\n');
  process.exit(1);
} else {
  console.log('✅ All contrast tests passed! Theme is WCAG AA compliant.\n');
  process.exit(0);
}
