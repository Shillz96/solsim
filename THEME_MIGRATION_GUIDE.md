# Mario Theme Migration Guide

**Quick reference for fixing common theme violations**

---

## Color Replacements

### Background Colors

| ❌ Old Pattern | ✅ New Pattern | Usage |
|----------------|----------------|-------|
| `bg-gray-100` | `bg-[var(--background)]` | Page backgrounds |
| `bg-gray-200` | `bg-[var(--pipe-green)]/10` | XP bars, subtle fills |
| `bg-gray-300` | `bg-[var(--pipe-green)]/20` | Disabled states |
| `bg-slate-100` | `bg-muted` | Muted backgrounds |
| `bg-zinc-900` | `bg-[var(--outline-black)]` | Dark accents |

### Text Colors

| ❌ Old Pattern | ✅ New Pattern | Usage |
|----------------|----------------|-------|
| `text-gray-400` | `text-[var(--outline-black)]/50` | Placeholders |
| `text-gray-500` | `text-[var(--outline-black)]/70` | Muted text |
| `text-gray-600` | `text-[var(--outline-black)]/80` | Secondary text |
| `text-gray-700` | `text-[var(--outline-black)]` | Primary text |
| `text-slate-400` | `text-muted-foreground` | Muted text |

---

## Shadow Replacements

### Block Shadows (Mario Style)

| ❌ Soft Shadow | ✅ Block Shadow | Usage |
|----------------|-----------------|-------|
| `shadow-sm` | `shadow-[2px_2px_0_var(--outline-black)]` | Small elements |
| `shadow-md` | `shadow-[3px_3px_0_var(--outline-black)]` | Standard cards |
| `shadow-lg` | `shadow-[4px_4px_0_var(--outline-black)]` | Large cards |
| `shadow-xl` | `shadow-[6px_6px_0_var(--outline-black)]` | Hero elements |

**Or use Mario shadow classes:**
```tsx
shadow-sm → mario-shadow-sm
shadow-md → mario-shadow
shadow-lg → mario-shadow-lg
shadow-xl → mario-shadow-xl
```

**Hover States:**
```tsx
// ❌ Old
hover:shadow-lg

// ✅ New
hover:shadow-[4px_4px_0_var(--outline-black)]
```

---

## Border Replacements

### Border Widths

| ❌ Old Pattern | ✅ New Pattern | Usage |
|----------------|----------------|-------|
| `border` | `border-3 border-[var(--outline-black)]` | Standard cards |
| `border-2` | `border-3 border-[var(--outline-black)]` | Upgrade to Mario standard |
| `border-4` | ✅ Keep as-is | Hero elements (correct!) |

**Border Colors:**
```tsx
// ❌ Old
border border-gray-300

// ✅ New
border-3 border-[var(--outline-black)]
```

---

## Rounded Corner Replacements

### Explicit Pixel Values

| ❌ Generic | ✅ Explicit | Usage |
|-----------|-------------|-------|
| `rounded-sm` | `rounded-[10px]` or `rounded-[var(--radius-sm)]` | Small elements |
| `rounded-md` | `rounded-[12px]` or `rounded-[var(--radius-md)]` | Standard cards |
| `rounded-lg` | `rounded-[14px]` or `rounded-[var(--radius-lg)]` | Large cards |
| `rounded-xl` | `rounded-[16px]` or `rounded-[var(--radius-xl)]` | Hero elements |
| `rounded-2xl` | `rounded-[20px]` or `rounded-[var(--radius-2xl)]` | Extra large |

**Keep as-is:**
- `rounded-full` (circular elements - avatars, badges)

---

## Component Patterns

### Cards

```tsx
// ❌ Old Pattern
<div className="rounded-lg border bg-white shadow-sm p-4">
  {content}
</div>

// ✅ Mario Card Pattern
<div className="mario-card">
  {content}
</div>

// ✅ Or inline Mario styling
<div className="bg-white border-3 border-[var(--outline-black)] shadow-[3px_3px_0_var(--outline-black)] rounded-[14px] p-6">
  {content}
</div>
```

### Buttons

```tsx
// ❌ Old Pattern
<button className="bg-red-500 text-white rounded-md px-4 py-2 shadow-sm">
  Click me
</button>

// ✅ CartridgePill Pattern
<CartridgePill
  value="Click me"
  bgColor="var(--mario-red)"
  size="md"
/>

// ✅ Mario Button Classes
<button className="mario-btn-red">
  Click me
</button>
```

### Typography

```tsx
// ❌ Old Pattern
<h1 className="text-4xl font-bold text-gray-900">

// ✅ Mario Pattern
<h1 className="font-display text-4xl text-[var(--mario-red)]">

// Display Font: Headers, titles (Luckiest Guy)
className="font-display"

// Body Font: UI text, paragraphs (Manrope)
className="font-body"

// Numeric Font: Prices, addresses (JetBrains Mono)
className="font-numeric"
```

---

## Before/After Examples

### Example 1: XP Progress Bar

```tsx
// ❌ BEFORE (overview-tab.tsx:67)
<div className="bg-gray-200 border-3 border-outline rounded-full h-4 overflow-hidden">
  <motion.div
    className="bg-gradient-to-r from-[var(--luigi-green)] to-[var(--luigi-green)]/80 h-full"
    style={{ width: `${(xp / nextLevelXp) * 100}%` }}
  />
</div>

// ✅ AFTER
<div className="bg-[var(--pipe-green)]/10 border-3 border-[var(--outline-black)] rounded-full h-4 overflow-hidden">
  <motion.div
    className="bg-gradient-to-r from-[var(--luigi-green)] to-[var(--luigi-green)]/80 h-full"
    style={{ width: `${(xp / nextLevelXp) * 100}%` }}
  />
</div>
```

### Example 2: Market Sentiment Colors

```tsx
// ❌ BEFORE (MarketHover.tsx:70-81)
const getFearGreedColor = (value: number) => {
  if (value >= 75) return "#16a34a"; // Extreme Greed
  if (value >= 55) return "#84cc16"; // Greed
  if (value >= 45) return "#fbbf24"; // Neutral
  if (value >= 25) return "#f97316"; // Fear
  return "#ef4444"; // Extreme Fear
};

// ✅ AFTER
const getFearGreedColor = (value: number) => {
  if (value >= 75) return "var(--luigi-green)"; // Extreme Greed
  if (value >= 55) return "var(--pipe-green)"; // Greed
  if (value >= 45) return "var(--star-yellow)"; // Neutral
  if (value >= 25) return "var(--coin-gold)"; // Fear
  return "var(--mario-red)"; // Extreme Fear
};
```

### Example 3: Dialog Shadow

```tsx
// ❌ BEFORE
<DialogContent className="shadow-lg rounded-lg border">
  {content}
</DialogContent>

// ✅ AFTER
<DialogContent className="shadow-[4px_4px_0_var(--outline-black)] rounded-[14px] border-3 border-[var(--outline-black)]">
  {content}
</DialogContent>
```

### Example 4: Leaderboard ROI Colors

```tsx
// ❌ BEFORE (leaderboard-preview.tsx:131)
<span className={`font-mono ${trader.roi >= 0 ? 'text-[#00ff85]' : 'text-red-500'}`}>
  {trader.roi}%
</span>

// ✅ AFTER
<span className={`font-mono ${trader.roi >= 0 ? 'text-[var(--luigi-green)]' : 'text-[var(--mario-red)]'}`}>
  {trader.roi}%
</span>
```

---

## Quick Commands

### Find Violations

```bash
# Find gray/slate/zinc backgrounds
grep -r "bg-\(gray\|slate\|zinc\)" frontend/components --include="*.tsx"

# Find gray/slate/zinc text colors
grep -r "text-\(gray\|slate\|zinc\)" frontend/components --include="*.tsx"

# Find soft shadows
grep -r "shadow-\(sm\|md\|lg\|xl\)" frontend/components --include="*.tsx"

# Find hardcoded hex colors
grep -rn "#[0-9A-Fa-f]\{6\}" frontend/components --include="*.tsx"

# Find generic rounded corners
grep -r "rounded-\(sm\|md\|lg\|xl\)\s" frontend/components --include="*.tsx"

# Find border usage (potential 1px borders)
grep -r "className=\".*\sborder\s" frontend/components --include="*.tsx"
```

### Automated Fixes

**⚠️ Warning:** Test on a backup branch first!

```bash
# Replace common gray backgrounds
find frontend/components -name "*.tsx" -type f -exec sed -i 's/bg-gray-200/bg-[var(--pipe-green)]\/10/g' {} +

# Replace common text colors
find frontend/components -name "*.tsx" -type f -exec sed -i 's/text-gray-700/text-[var(--outline-black)]/g' {} +

# Replace soft shadows (requires manual review)
find frontend/components -name "*.tsx" -type f -exec sed -i 's/shadow-md/shadow-[3px_3px_0_var(--outline-black)]/g' {} +
```

---

## Validation Checklist

After migration, verify:

- [ ] No `gray-*`, `slate-*`, `zinc-*` in component files
- [ ] No soft shadows (`shadow-sm/md/lg/xl`)
- [ ] No hardcoded hex colors (except in theme files)
- [ ] Borders use `border-3` or `border-4` (not `border`)
- [ ] Rounded corners use explicit pixel values
- [ ] Visual consistency across all pages
- [ ] No visual regressions on mobile
- [ ] Color contrast meets WCAG AA standards

---

## Testing

```bash
# Build and run
npm run build
npm run dev

# Check for type errors
npm run type-check

# Visual regression test
# 1. Open http://localhost:3000
# 2. Navigate through key pages:
#    - Landing page
#    - Portfolio
#    - Leaderboard
#    - Trading room
# 3. Verify Mario theme consistency (colors, shadows, borders)
```

---

## Reference Links

- **THEME_AUDIT_REPORT.md** - Complete audit findings
- **THEME_FIX_LIST.md** - Detailed fix list with file paths
- **docs/theme/MARIO_THEME_DESIGN_SYSTEM.md** - Design system documentation
- **CLAUDE.md** - Developer guidelines

---

**Need help?** Check the audit report or design system documentation!
