/**
 * 1UP SOL - Browser Style Diagnostic Tool
 *
 * Run this in your browser console to diagnose styling issues in real-time.
 *
 * Usage:
 *   1. Open DevTools (F12)
 *   2. Copy and paste this entire file into the console
 *   3. Run: styleDiagnostic.runAll()
 *
 * Or run individual checks:
 *   styleDiagnostic.checkShadows()
 *   styleDiagnostic.checkColors()
 *   styleDiagnostic.checkZIndex()
 */

const styleDiagnostic = {
  /**
   * Check for shadow style inconsistencies
   */
  checkShadows() {
    console.group('📦 Shadow Style Check');

    const shadowElements = document.querySelectorAll('[class*="shadow"]');
    const softShadows = [];
    const marioShadows = [];
    const otherShadows = [];

    shadowElements.forEach(el => {
      const computed = getComputedStyle(el);
      const shadow = computed.boxShadow;

      if (shadow === 'none') return;

      const isMarioShadow = shadow.match(/rgb.*\s+\d+px\s+\d+px\s+0px/);
      const isSoftShadow = shadow.match(/rgba.*blur/i) || shadow.includes('rgba');

      if (isMarioShadow) {
        marioShadows.push({
          element: el,
          class: el.className,
          shadow,
        });
      } else if (isSoftShadow) {
        softShadows.push({
          element: el,
          class: el.className,
          shadow,
        });
      } else {
        otherShadows.push({
          element: el,
          class: el.className,
          shadow,
        });
      }
    });

    console.log(`✅ Mario block shadows: ${marioShadows.length}`);
    console.log(`⚠️  Soft shadows (should be Mario): ${softShadows.length}`);
    console.log(`❓ Other shadows: ${otherShadows.length}`);

    if (softShadows.length > 0) {
      console.warn('Found soft shadows (should use Mario block shadows):');
      console.table(softShadows.slice(0, 10));
    }

    if (otherShadows.length > 0) {
      console.log('Other shadow styles:');
      console.table(otherShadows.slice(0, 10));
    }

    console.groupEnd();

    return { marioShadows, softShadows, otherShadows };
  },

  /**
   * Check for color consistency
   */
  checkColors() {
    console.group('🎨 Color Consistency Check');

    // Create test elements
    const testDiv = document.createElement('div');
    testDiv.style.position = 'absolute';
    testDiv.style.left = '-9999px';
    document.body.appendChild(testDiv);

    const colorTests = [
      { name: 'Mario Red (var)', class: 'bg-[var(--mario-red)]', expected: 'rgb(229, 37, 33)' },
      { name: 'Mario Red (Tailwind)', class: 'bg-mario', expected: 'rgb(229, 37, 33)' },
      { name: 'Luigi Green (var)', class: 'bg-[var(--luigi-green)]', expected: 'rgb(67, 176, 71)' },
      { name: 'Luigi Green (Tailwind)', class: 'bg-luigi', expected: 'rgb(67, 176, 71)' },
      { name: 'Star Yellow (var)', class: 'bg-[var(--star-yellow)]', expected: 'rgb(255, 216, 0)' },
      { name: 'Star Yellow (Tailwind)', class: 'bg-star', expected: 'rgb(255, 216, 0)' },
    ];

    const results = colorTests.map(test => {
      testDiv.className = test.class;
      const computed = getComputedStyle(testDiv).backgroundColor;
      const match = computed === test.expected;

      return {
        name: test.name,
        expected: test.expected,
        actual: computed,
        match: match ? '✅' : '❌',
      };
    });

    console.table(results);

    document.body.removeChild(testDiv);

    const mismatches = results.filter(r => r.match === '❌');
    if (mismatches.length > 0) {
      console.warn(`Found ${mismatches.length} color mismatches!`);
    } else {
      console.log('✅ All color definitions match!');
    }

    console.groupEnd();

    return results;
  },

  /**
   * Check z-index layering
   */
  checkZIndex() {
    console.group('📚 Z-Index Layering Check');

    const zIndexElements = Array.from(document.querySelectorAll('*'))
      .map(el => {
        const computed = getComputedStyle(el);
        const z = computed.zIndex;
        const position = computed.position;

        if (z !== 'auto' && z !== '0' && position !== 'static') {
          return {
            element: el.tagName,
            class: el.className.substring(0, 50),
            zIndex: parseInt(z),
            position,
          };
        }
        return null;
      })
      .filter(Boolean)
      .sort((a, b) => b.zIndex - a.zIndex);

    console.log(`Found ${zIndexElements.length} elements with z-index`);
    console.table(zIndexElements.slice(0, 20));

    // Check for conflicts (same z-index)
    const zIndexCounts = {};
    zIndexElements.forEach(el => {
      zIndexCounts[el.zIndex] = (zIndexCounts[el.zIndex] || 0) + 1;
    });

    const conflicts = Object.entries(zIndexCounts)
      .filter(([z, count]) => count > 1)
      .map(([z, count]) => ({ zIndex: parseInt(z), count }));

    if (conflicts.length > 0) {
      console.warn('⚠️  Potential z-index conflicts (multiple elements at same level):');
      console.table(conflicts);
    } else {
      console.log('✅ No z-index conflicts detected');
    }

    console.groupEnd();

    return { elements: zIndexElements, conflicts };
  },

  /**
   * Check border radius consistency
   */
  checkBorderRadius() {
    console.group('🔲 Border Radius Check');

    const elements = document.querySelectorAll('[class*="rounded"]');
    const radiusMap = new Map();

    elements.forEach(el => {
      const computed = getComputedStyle(el);
      const radius = computed.borderRadius;

      if (radius && radius !== '0px') {
        const count = radiusMap.get(radius) || 0;
        radiusMap.set(radius, count + 1);
      }
    });

    const radiusArray = Array.from(radiusMap.entries())
      .map(([radius, count]) => ({ radius, count }))
      .sort((a, b) => b.count - a.count);

    console.log(`Found ${radiusArray.length} unique border radius values`);
    console.table(radiusArray.slice(0, 15));

    if (radiusArray.length > 10) {
      console.warn(`⚠️  Too many unique border radius values (${radiusArray.length})`);
      console.log('💡 Consider consolidating to semantic tokens (sm, md, lg, xl)');
    } else {
      console.log('✅ Border radius usage looks good');
    }

    console.groupEnd();

    return radiusArray;
  },

  /**
   * Check for elements with multiple conflicting classes
   */
  checkClassConflicts() {
    console.group('⚠️  Class Conflict Check');

    const conflicts = [];

    document.querySelectorAll('*').forEach(el => {
      const classes = el.className;
      if (typeof classes !== 'string') return;

      // Check for shadow conflicts
      const hasSoftShadow = /shadow-(xs|sm|md|lg|xl)/.test(classes);
      const hasMarioShadow = /shadow-\[.*var\(--outline-black\)\]/.test(classes);

      if (hasSoftShadow && hasMarioShadow) {
        conflicts.push({
          type: 'Shadow conflict',
          element: el.tagName,
          class: classes.substring(0, 80),
        });
      }

      // Check for multiple border widths
      const borderMatches = classes.match(/border(-\d+)?(?!\[)/g);
      if (borderMatches && borderMatches.length > 1) {
        conflicts.push({
          type: 'Multiple borders',
          element: el.tagName,
          class: classes.substring(0, 80),
        });
      }

      // Check for multiple rounded values
      const roundedMatches = classes.match(/rounded-\w+/g);
      if (roundedMatches && roundedMatches.length > 1) {
        conflicts.push({
          type: 'Multiple rounded',
          element: el.tagName,
          class: classes.substring(0, 80),
        });
      }
    });

    if (conflicts.length > 0) {
      console.warn(`❌ Found ${conflicts.length} class conflicts:`);
      console.table(conflicts);
    } else {
      console.log('✅ No class conflicts detected!');
    }

    console.groupEnd();

    return conflicts;
  },

  /**
   * Highlight elements with style issues on the page
   */
  highlightIssues() {
    console.group('🔍 Highlighting Style Issues');

    // Remove old highlights
    document.querySelectorAll('.style-diagnostic-highlight').forEach(el => el.remove());

    const { softShadows } = this.checkShadows();
    const conflicts = this.checkClassConflicts();

    // Highlight soft shadows
    softShadows.forEach(({ element }) => {
      element.style.outline = '3px solid red';
      element.style.outlineOffset = '2px';

      const label = document.createElement('div');
      label.className = 'style-diagnostic-highlight';
      label.textContent = 'Soft Shadow';
      label.style.cssText = `
        position: absolute;
        top: -20px;
        left: 0;
        background: red;
        color: white;
        padding: 2px 6px;
        font-size: 10px;
        font-weight: bold;
        border-radius: 3px;
        z-index: 99999;
        pointer-events: none;
      `;
      element.style.position = 'relative';
      element.appendChild(label);
    });

    console.log(`Highlighted ${softShadows.length} elements with soft shadows in red`);
    console.log('Run styleDiagnostic.clearHighlights() to remove highlights');

    console.groupEnd();
  },

  /**
   * Clear highlights
   */
  clearHighlights() {
    document.querySelectorAll('.style-diagnostic-highlight').forEach(el => el.remove());
    document.querySelectorAll('[style*="outline"]').forEach(el => {
      el.style.outline = '';
      el.style.outlineOffset = '';
    });
    console.log('✅ Cleared all highlights');
  },

  /**
   * Run all diagnostics
   */
  runAll() {
    console.clear();
    console.log(`
%c ╔══════════════════════════════════════╗
 ║  1UP SOL - Style Diagnostic Tool     ║
 ╚══════════════════════════════════════╝
    `, 'color: #E52521; font-weight: bold; font-size: 14px;');

    const shadowResults = this.checkShadows();
    const colorResults = this.checkColors();
    const zIndexResults = this.checkZIndex();
    const radiusResults = this.checkBorderRadius();
    const conflictResults = this.checkClassConflicts();

    console.group('📊 Summary');
    console.log(`Mario shadows: ${shadowResults.marioShadows.length}`);
    console.log(`Soft shadows: ${shadowResults.softShadows.length}`);
    console.log(`Color mismatches: ${colorResults.filter(r => r.match === '❌').length}`);
    console.log(`Z-index conflicts: ${zIndexResults.conflicts.length}`);
    console.log(`Unique border radii: ${radiusResults.length}`);
    console.log(`Class conflicts: ${conflictResults.length}`);
    console.groupEnd();

    console.log(`
%c💡 Recommendations:
`, 'color: #FFD800; font-weight: bold;');

    if (shadowResults.softShadows.length > 0) {
      console.log('%c• Replace soft shadows with Mario block shadows', 'color: #FF6B6B;');
    }

    if (colorResults.filter(r => r.match === '❌').length > 0) {
      console.log('%c• Fix color definition mismatches in theme', 'color: #FF6B6B;');
    }

    if (radiusResults.length > 10) {
      console.log('%c• Consolidate border radius values', 'color: #FFA000;');
    }

    if (conflictResults.length > 0) {
      console.log('%c• Remove conflicting CSS classes', 'color: #FF6B6B;');
    }

    console.log(`
%cRun individual checks:
  styleDiagnostic.checkShadows()
  styleDiagnostic.checkColors()
  styleDiagnostic.checkZIndex()
  styleDiagnostic.checkBorderRadius()
  styleDiagnostic.checkClassConflicts()
  styleDiagnostic.highlightIssues()
    `, 'color: #43B047;');
  },

  /**
   * Generate a fix report
   */
  generateFixReport() {
    console.group('📋 Fix Report');

    const { softShadows } = this.checkShadows();
    const conflicts = this.checkClassConflicts();

    console.log('Copy these find-and-replace patterns:');
    console.log('');

    // Shadow fixes
    if (softShadows.length > 0) {
      console.log('%cShadow fixes:', 'font-weight: bold;');
      console.log('  Find:    shadow-sm');
      console.log('  Replace: shadow-[2px_2px_0_var(--outline-black)]');
      console.log('');
      console.log('  Find:    shadow-md');
      console.log('  Replace: shadow-[3px_3px_0_var(--outline-black)]');
      console.log('');
      console.log('  Find:    shadow-lg');
      console.log('  Replace: shadow-[6px_6px_0_var(--outline-black)]');
      console.log('');
    }

    console.groupEnd();
  },
};

// Auto-run on load
console.log('%c🔧 Style Diagnostic Tool loaded!', 'color: #43B047; font-weight: bold; font-size: 14px;');
console.log('%cRun: styleDiagnostic.runAll()', 'color: #FFD800; font-weight: bold;');

// Export to window for console access
if (typeof window !== 'undefined') {
  window.styleDiagnostic = styleDiagnostic;
}
