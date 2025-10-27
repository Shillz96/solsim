# 1UP SOL Mario Theme - Priority Fix List

**Generated:** January 2025
**Total Issues:** ~650+ instances across 50+ files
**Estimated Effort:** 15-20 hours

---

## 🔴 PRIORITY 1 - Critical Theme Violations (Must Fix)

### 1.1 Gray/Slate/Zinc Color Usage (19 Files)

#### Background Colors - 12 Files

**File: `components/portfolio/overview-tab.tsx:67`**
```tsx
// ❌ Current
<div className="bg-gray-200 border-3 border-outline rounded-full h-4 overflow-hidden">

// ✅ Fix
<div className="bg-[var(--pipe-green)]/10 border-3 border-outline rounded-full h-4 overflow-hidden">
```

**File: `components/wallet-tracker/wallet-manager.tsx`**
- Search for: `bg-gray-*`, `bg-slate-*`, `bg-zinc-*`
- Replace with: `bg-[var(--pipe-green)]/10` or `bg-muted`

**File: `components/modals/HourlyRewardWinnersModal.tsx`**
- Search for: `bg-gray-*`, `bg-slate-*`, `bg-zinc-*`
- Replace with: Mario theme color or `bg-muted`

**File: `app/profile/settings/page.tsx`**
- Search for: `bg-gray-*`, `bg-slate-*`, `bg-zinc-*`
- Replace with: Mario theme color or `bg-[var(--background)]`

**File: `components/trading/lightweight-chart.tsx`**
- Search for: `bg-gray-*`, `bg-slate-*`, `bg-zinc-*`
- Replace with: Mario theme color

**File: `app/roadmap/page.tsx`**
- Search for: `bg-gray-*`, `bg-slate-*`, `bg-zinc-*`
- Replace with: `bg-muted` or Mario theme color

**File: `app/rewards/page.tsx`**
- Search for: `bg-gray-*`, `bg-slate-*`, `bg-zinc-*`
- Replace with: Mario theme color

**File: `components/modals/auth-modal.tsx`**
- Search for: `bg-gray-*`, `bg-slate-*`, `bg-zinc-*`
- Replace with: `bg-[var(--card)]` or `bg-muted`

**File: `components/modals/share-pnl-dialog.tsx`**
- Search for: `bg-gray-*`, `bg-slate-*`, `bg-zinc-*`
- Replace with: Mario theme color

**File: `components/portfolio/achievements-tab.tsx`**
- Search for: `bg-gray-*`, `bg-slate-*`, `bg-zinc-*`
- Replace with: `bg-muted` or Mario theme color

**File: `components/portfolio/pnl-card.tsx`**
- Search for: `bg-gray-*`, `bg-slate-*`, `bg-zinc-*`
- Replace with: Mario theme color

**File: `components/portfolio/wallet-tracker-panel.tsx`**
- Search for: `bg-gray-*`, `bg-slate-*`, `bg-zinc-*`
- Replace with: Mario theme color

#### Text Colors - 7 Files

**File: `components/trading/lightweight-chart.tsx`**
- Search for: `text-gray-*`, `text-slate-*`, `text-zinc-*`
- Replace with: `text-[var(--outline-black)]` or `text-foreground`

**File: `components/portfolio/wallet-tracker-panel.tsx`**
- Search for: `text-gray-*`, `text-slate-*`, `text-zinc-*`
- Replace with: `text-[var(--outline-black)]` or `text-muted-foreground`

**File: `components/wallet-tracker/wallet-activity-list.tsx`**
- Search for: `text-gray-*`, `text-slate-*`, `text-zinc-*`
- Replace with: Mario theme color

**Error Pages (4 files):**
- `app/rewards/error.tsx`
- `app/profile/error.tsx`
- `app/leaderboard/error.tsx`
- `app/portfolio/error.tsx`

All error pages:
- Search for: `text-gray-*`, `text-slate-*`, `text-zinc-*`
- Replace with: `text-[var(--outline-black)]` or `text-foreground`

---

### 1.2 Hardcoded Hex Colors (3+ Files)

**File: `components/market/MarketHover.tsx:70-81`**
```tsx
// ❌ Current - 11 hardcoded hex values
const getFearGreedColor = (value: number) => {
  if (value >= 75) return "#16a34a"; // Extreme Greed - green
  if (value >= 55) return "#84cc16"; // Greed - lime
  if (value >= 45) return "#fbbf24"; // Neutral - amber
  if (value >= 25) return "#f97316"; // Fear - orange
  return "#ef4444"; // Extreme Fear - red
};

// ✅ Fix - Use Mario theme colors
const getFearGreedColor = (value: number) => {
  if (value >= 75) return "var(--luigi-green)"; // Extreme Greed
  if (value >= 55) return "var(--pipe-green)"; // Greed
  if (value >= 45) return "var(--star-yellow)"; // Neutral
  if (value >= 25) return "var(--coin-gold)"; // Fear
  return "var(--mario-red)"; // Extreme Fear
};

const getAltcoinSeasonColor = (value: number) => {
  if (value >= 75) return "var(--luigi-green)"; // Altseason
  if (value >= 50) return "var(--star-yellow)"; // Mixed
  return "var(--sky-blue)"; // Bitcoin Season
};
```

**File: `components/landing/leaderboard-preview.tsx:131`**
```tsx
// ❌ Current
<span className={`font-mono ${trader.rank <= 3 ? 'font-bold' : 'font-medium'} ${trader.roi >= 0 ? 'text-[#00ff85]' : 'text-red-500'}`}>

// ✅ Fix
<span className={`font-mono ${trader.rank <= 3 ? 'font-bold' : 'font-medium'} ${trader.roi >= 0 ? 'text-[var(--luigi-green)]' : 'text-[var(--mario-red)]'}`}>
```

**File: `components/level/level-progress-modal.tsx:23`**
```tsx
// ❌ Current
<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#FFFAE9] border-3 border-pipe-800 shadow-xl">

// ✅ Fix
<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[var(--background)] border-3 border-[var(--outline-black)] shadow-xl">
```

---

### 1.3 Soft Shadows → Block Shadows (20+ Files)

#### UI Components with Soft Shadows

**Pattern to Fix:**
```tsx
// ❌ Wrong - Soft blur shadows
shadow-sm → shadow-[2px_2px_0_var(--outline-black)]
shadow-md → shadow-[3px_3px_0_var(--outline-black)]
shadow-lg → shadow-[4px_4px_0_var(--outline-black)]
shadow-xl → shadow-[6px_6px_0_var(--outline-black)]

// ✅ Or use Mario shadow classes
shadow-sm → mario-shadow-sm
shadow-md → mario-shadow
shadow-lg → mario-shadow-lg
shadow-xl → mario-shadow-xl
```

**Files to Fix:**

1. `components/ui/dialog.tsx` - Replace all `shadow-*` with block shadows
2. `components/trading/sliding-trending-ticker.tsx` - Replace soft shadows
3. `components/window/FloatingWindows.tsx` - Replace soft shadows
4. `components/ui/sheet.tsx` - Replace soft shadows
5. `components/level/xp-progress-bar.tsx` - Replace soft shadows
6. `components/ui/toast.tsx` - Replace soft shadows
7. `components/ui/navigation-menu.tsx` - Replace soft shadows
8. `components/ui/alert-dialog.tsx` - Replace soft shadows
9. `components/ui/context-menu.tsx` - Replace soft shadows
10. `components/ui/menubar.tsx` - Replace soft shadows
11. `components/ui/select.tsx` - Replace soft shadows
12. `components/ui/hover-card.tsx` - Replace soft shadows
13. `components/landing/hero-section.tsx` - Replace soft shadows
14. `components/ui/checkbox.tsx` - Replace soft shadows
15. `components/warp-pipes/token-column.tsx` - Replace soft shadows
16. `components/landing/leaderboard-preview.tsx` - Replace soft shadows
17. `components/level/level-progress-modal.tsx` - Replace soft shadows (also fix `shadow-xl`)
18. `components/modals/share-pnl-dialog.tsx` - Replace soft shadows
19. `components/trading/mario-position-pnl.tsx` - Replace soft shadows
20. `components/trading/trade-timeline.tsx` - Replace soft shadows

**Example Fix (components/ui/dialog.tsx):**
```tsx
// Search and replace in file:
shadow-sm  → shadow-[2px_2px_0_var(--outline-black)]
shadow-md  → shadow-[3px_3px_0_var(--outline-black)]
shadow-lg  → shadow-[4px_4px_0_var(--outline-black)]
shadow-xl  → shadow-[6px_6px_0_var(--outline-black)]
```

---

## 🟡 PRIORITY 2 - Medium Impact Issues (Should Fix)

### 2.1 Generic Rounded Corners (501 Instances)

**Automated Fix Strategy:**

Create regex find/replace pattern:
```regex
Find:    rounded-(sm|md|lg|xl)\s
Replace: rounded-[var(--radius-\1)]
```

**Manual Review Required For:**
- `rounded-full` (keep as-is for circular elements)
- `rounded-[clamp(...)]` (responsive corners, keep as-is)

**Top Offender Files:**
1. UI components (`components/ui/**/*.tsx`) - ~200 instances
2. Trading components (`components/trading/**/*.tsx`) - ~100 instances
3. Portfolio components (`components/portfolio/**/*.tsx`) - ~80 instances
4. App pages (`app/**/*.tsx`) - ~60 instances
5. Landing components (`components/landing/**/*.tsx`) - ~40 instances

**Specific Mappings:**
```tsx
rounded-sm  → rounded-[var(--radius-sm)]   or rounded-[10px]
rounded-md  → rounded-[var(--radius-md)]   or rounded-[12px]
rounded-lg  → rounded-[var(--radius-lg)]   or rounded-[14px]
rounded-xl  → rounded-[var(--radius-xl)]   or rounded-[16px]
rounded-2xl → rounded-[var(--radius-2xl)]  or rounded-[20px]
```

---

### 2.2 Border Width Standardization

**Current Issues:**
- Many `border` (1px) should be `border-3` (3px)
- Some `border-2` (2px) should be upgraded to `border-3` or `border-4`

**Strategy:**

**For Cards/Panels:**
```tsx
// ❌ Current
border border-border → border-3 border-[var(--outline-black)]

// ✅ Fix
border-3 border-[var(--outline-black)]  // Standard elements
border-4 border-[var(--outline-black)]  // Hero/prominent elements
```

**For Dividers/Separators:**
```tsx
// ✅ Keep 1px for subtle dividers
divide-y divide-border  // OK for table rows, list items
border-t border-border  // OK for section separators
```

**Files Requiring Review:**
- `components/landing/leaderboard-preview.tsx` - Multiple border usage
- `components/leaderboard/responsive-leaderboard.tsx` - Table borders
- `components/purchase/purchase-history.tsx` - Card borders
- `components/ui/leaderboard-card.tsx` - Avatar borders (`border-2` → `border-3`)
- All components with `className="...border..."` (~50+ files)

---

### 2.3 tailwind.config.js Color Refactoring

**File: `frontend/tailwind.config.js`**

**Current Issue:** 56 hardcoded hex colors that duplicate theme.css

**Fix Strategy:**

Replace hardcoded hex values with CSS variable references:

```js
// ❌ Current
mario: {
  DEFAULT: "var(--mario-red)", // Good!
  light: "#FF6B6B",            // ❌ Should reference theme
  dark: "#B31D1A",             // ❌ Should reference theme
}

// ✅ Fix - Define in theme.css first, then reference
// Add to theme.css:
// --mario-red-light: oklch(72% 0.20 27);
// --mario-red-dark: oklch(45% 0.22 27);

// Then in tailwind.config.js:
mario: {
  DEFAULT: "var(--mario-red)",
  light: "var(--mario-red-light)",
  dark: "var(--mario-red-dark)",
}
```

**Colors to Migrate:**
1. Mario variants (light, dark)
2. Luigi variants (light, dark)
3. Star variants (light, dark)
4. Coin variants (light, dark)
5. Sky variants (light, dark)
6. Brick variants (light, dark)
7. Pipe variants (light, dark)
8. Primary scale (50-950)
9. Chart colors

**Estimated Effort:** 1-2 hours

---

## 🟢 PRIORITY 3 - Polish & Optimization (Nice to Have)

### 3.1 Increase Mario Card Class Adoption

**Low Adoption Files** - Manually refactor to use `.mario-card`:

```tsx
// ❌ Current pattern
<div className="rounded-lg border bg-white shadow-sm p-4">
  {content}
</div>

// ✅ Mario card pattern
<div className="mario-card">
  {content}
</div>
```

**Candidates for Refactoring:**
- Trading panel cards
- Portfolio position cards
- Profile cards
- Settings panels

**Estimated Effort:** 2-3 hours

---

### 3.2 Z-Index Single Issue

**File: `components/ui/navigation-menu.tsx:146`**

```tsx
// ❌ Current
'top-full z-[1] flex h-1.5 items-end justify-center overflow-hidden'

// ✅ Fix
'top-full z-background-texture flex h-1.5 items-end justify-center overflow-hidden'
```

---

### 3.3 Cleanup Legacy Code

**File: `frontend/app/globals.css`**

- Remove commented-out code blocks
- Remove unused legacy classes
- Consolidate duplicate definitions

**Estimated Effort:** 30 minutes

---

## Automated Fix Scripts

### Script 1: Replace Gray Colors
```bash
#!/bin/bash
# Replace bg-gray-200 with Mario theme color
find frontend/components -name "*.tsx" -type f -exec sed -i 's/bg-gray-200/bg-[var(--pipe-green)]\/10/g' {} +

# Replace text-gray-* with foreground colors
find frontend/components -name "*.tsx" -type f -exec sed -i 's/text-gray-500/text-[var(--outline-black)]\/70/g' {} +
find frontend/components -name "*.tsx" -type f -exec sed -i 's/text-gray-600/text-[var(--outline-black)]\/80/g' {} +
find frontend/components -name "*.tsx" -type f -exec sed -i 's/text-gray-700/text-[var(--outline-black)]/g' {} +
```

### Script 2: Replace Soft Shadows
```bash
#!/bin/bash
# Replace soft shadows with block shadows
find frontend/components -name "*.tsx" -type f -exec sed -i 's/shadow-sm/shadow-[2px_2px_0_var(--outline-black)]/g' {} +
find frontend/components -name "*.tsx" -type f -exec sed -i 's/shadow-md(?!:)/shadow-[3px_3px_0_var(--outline-black)]/g' {} +
find frontend/components -name "*.tsx" -type f -exec sed -i 's/shadow-lg/shadow-[4px_4px_0_var(--outline-black)]/g' {} +
```

### Script 3: Standardize Borders
```bash
#!/bin/bash
# Replace generic border with border-3 for card elements
# (Requires manual review - this is a starting point)
find frontend/components -name "*.tsx" -type f -exec sed -i 's/"border border-border"/"border-3 border-[var(--outline-black)]"/g' {} +
```

**⚠️ Warning:** Test these scripts on a backup branch first! Manual review required after automated changes.

---

## Validation Checklist

After applying fixes, run these checks:

```bash
# 1. Check for remaining gray/slate/zinc usage
grep -r "bg-\(gray\|slate\|zinc\)" frontend/components --include="*.tsx" | wc -l
# Expected: 0

# 2. Check for remaining soft shadows
grep -r "shadow-\(sm\|md\|lg\|xl\)" frontend/components --include="*.tsx" | wc -l
# Expected: 0

# 3. Check for hardcoded hex colors (excluding theme files)
grep -rn "#[0-9A-Fa-f]\{6\}" frontend/components --include="*.tsx" | wc -l
# Expected: <5

# 4. Check for generic rounded corners
grep -r "rounded-\(sm\|md\|lg\|xl\)\s" frontend/components --include="*.tsx" | wc -l
# Expected: 0

# 5. Visual regression test
npm run build && npm run start
# Manual: Review key pages for visual consistency
```

---

## Timeline Estimate

**Week 1:**
- Day 1-2: Fix gray/slate/zinc colors (19 files)
- Day 2-3: Fix hardcoded hex colors (3 files)
- Day 3-4: Replace soft shadows with block shadows (20+ files)

**Week 2:**
- Day 1-2: Refactor rounded corners (501 instances, semi-automated)
- Day 3: Standardize border widths (manual review)
- Day 4: tailwind.config.js color migration
- Day 5: Testing & validation

**Total:** ~10 working days (15-20 hours)

---

**End of Fix List**
