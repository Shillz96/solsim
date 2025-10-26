# Styling Diagnostic & Conflict Resolution Guide

## Current Architecture Overview

### Layer 1: CSS Custom Properties (`theme.css`)
```css
--mario-red: #E52521
--color-brand: oklch(55% 0.22 27)
--radius-xl: 1rem
--z-modal: 1010
```
- **Scope**: Global CSS variables
- **Priority**: Lowest (can be overridden by any CSS)
- **Used in**: Both Tailwind utilities AND raw CSS

### Layer 2: Global Utility Classes (`globals.css`)
```css
.mario-card { border: 3px solid var(--outline-black); ... }
.mario-btn { background: var(--color-star); ... }
```
- **Scope**: Global classes
- **Priority**: Medium (can override Tailwind defaults)
- **Used in**: Direct className usage

### Layer 3: Tailwind Config (`tailwind.config.js`)
```js
colors: {
  mario: { DEFAULT: "#E52521", light: "#FF6B6B" },
  luigi: { DEFAULT: "#43B047" }
}
```
- **Scope**: Generates Tailwind utilities (`bg-mario`, `text-luigi`)
- **Priority**: High (compiled utilities)
- **Used in**: className with Tailwind utilities

### Layer 4: JavaScript Utilities (`utils.ts`)
```ts
marioStyles.card() => "rounded-xl border-3 ..."
```
- **Scope**: Runtime-generated class strings
- **Priority**: Varies (depends on `cn()` merge order)
- **Used in**: Dynamic component styling

## Common Conflict Patterns

### 🔴 Conflict #1: Color Mismatches
**Problem**: Same color defined differently across layers

**Example**:
- `theme.css`: `--mario-red: #E52521`
- `tailwind.config.js`: `mario: { DEFAULT: "#E52521" }`
- If these drift, `bg-[var(--mario-red)]` and `bg-mario` show different colors

**Solution**: Single source of truth (choose ONE)

---

### 🔴 Conflict #2: Shadow Wars
**Problem**: Tailwind soft shadows vs. Mario block shadows

**Example**:
```tsx
// Tailwind soft shadow
<div className="shadow-md" /> // 0 4px 12px rgba(0,0,0,0.2)

// Mario block shadow
<div className="mario-shadow" /> // 3px 3px 0 var(--outline-black)
```

**Solution**: Always use Mario shadows for consistency

---

### 🔴 Conflict #3: Border Radius Inconsistency
**Problem**: Multiple radius scales

**Example**:
- `theme.css`: `--radius-xl: 1rem` (16px)
- `tailwind.config.js`: `xl: "calc(var(--radius) + 2px)"` (10px)
- `globals.css`: `border-radius: var(--radius-xl)`

**Solution**: Unify on CSS custom properties

---

### 🔴 Conflict #4: Class Order Issues
**Problem**: `cn()` merge order can break styles

**Example**:
```tsx
// ❌ WRONG - base classes last
<div className={cn("rounded-xl border-4", marioStyles.card())} />

// ✅ CORRECT - base classes first
<div className={cn(marioStyles.card(), "rounded-xl border-4")} />
```

**Reason**: `twMerge()` keeps the LAST conflicting class

---

## Diagnostic Steps

### Step 1: Identify Conflicting Styles

Run this in your browser console on any page:

```js
// Find elements with conflicting shadow styles
document.querySelectorAll('[class*="shadow"]').forEach(el => {
  const computed = getComputedStyle(el);
  const shadow = computed.boxShadow;

  // Check if it's a soft shadow (contains rgba/rgb)
  if (shadow.includes('rgba') || shadow.includes('rgb')) {
    console.warn('Soft shadow found:', el.className, shadow);
  }

  // Check for Mario block shadow pattern (e.g., "3px 3px 0")
  if (shadow.match(/\d+px \d+px 0/)) {
    console.log('✅ Mario shadow:', el.className, shadow);
  }
});
```

### Step 2: Find Color Inconsistencies

```js
// Check computed colors vs. expected
const testDiv = document.createElement('div');
testDiv.className = 'bg-mario';
document.body.appendChild(testDiv);
const bgMario = getComputedStyle(testDiv).backgroundColor;

testDiv.className = 'bg-[var(--mario-red)]';
const bgVar = getComputedStyle(testDiv).backgroundColor;

console.log('bg-mario:', bgMario);
console.log('bg-[var(--mario-red)]:', bgVar);
console.log('Match:', bgMario === bgVar);

document.body.removeChild(testDiv);
```

### Step 3: Check Z-index Conflicts

```js
// Find all elements with z-index
const zIndexElements = Array.from(document.querySelectorAll('*'))
  .filter(el => {
    const z = getComputedStyle(el).zIndex;
    return z !== 'auto' && z !== '0';
  })
  .map(el => ({
    element: el.tagName,
    class: el.className,
    zIndex: getComputedStyle(el).zIndex
  }))
  .sort((a, b) => parseInt(b.zIndex) - parseInt(a.zIndex));

console.table(zIndexElements);
```

---

## Resolution Strategies

### Strategy 1: CSS Custom Properties First (Recommended)

**Principle**: Use `theme.css` as single source of truth

**Changes**:
1. Keep all colors in `theme.css`
2. Reference them in Tailwind config:
```js
// tailwind.config.js
colors: {
  mario: "var(--mario-red)",
  luigi: "var(--luigi-green)",
}
```
3. Remove duplicate color definitions

**Pros**:
- Single source of truth
- Easy to update colors globally
- Works in both Tailwind and raw CSS

**Cons**:
- Less Tailwind autocomplete
- No color scale shades (mario-50, mario-100)

---

### Strategy 2: Consolidate Shadow System

**Current State**: Multiple shadow systems compete

**Fix**:
```css
/* globals.css - Remove soft shadows, keep only Mario shadows */
.shadow-sm { box-shadow: 2px 2px 0 var(--outline-black) !important; }
.shadow { box-shadow: 3px 3px 0 var(--outline-black) !important; }
.shadow-md { box-shadow: 4px 4px 0 var(--outline-black) !important; }
.shadow-lg { box-shadow: 6px 6px 0 var(--outline-black) !important; }
```

**Or** in `tailwind.config.js`:
```js
boxShadow: {
  'sm': '2px 2px 0 var(--outline-black)',
  'DEFAULT': '3px 3px 0 var(--outline-black)',
  'md': '4px 4px 0 var(--outline-black)',
  'lg': '6px 6px 0 var(--outline-black)',
}
```

---

### Strategy 3: Remove Unused Utility Classes

**Audit** which classes are actually used:

```bash
# Find all className usages
cd frontend
grep -r "className=" components/ app/ | grep -o 'mario-[a-z-]*' | sort | uniq -c | sort -rn
```

**Remove** unused classes from `globals.css` to reduce conflicts

---

### Strategy 4: Enforce Style Guidelines

**Create a style guide component**:

```tsx
// components/ui/mario-primitives.tsx
export const MarioCard = ({ children, hover = true, size = "md" }) => (
  <div className={cn(marioStyles.card(hover), size === "lg" && "p-6")}>
    {children}
  </div>
);

export const MarioButton = ({ children, variant = "primary", ...props }) => (
  <button className={cn(marioStyles.button(variant))} {...props}>
    {children}
  </button>
);
```

**Then enforce** usage of these components instead of raw classNames

---

## Quick Fixes for Common Issues

### Issue: Buttons have wrong shadow on hover

**Find**:
```bash
grep -r "hover:shadow-" components/
```

**Fix**: Replace all with Mario shadows:
```tsx
// ❌ Before
className="shadow-md hover:shadow-lg"

// ✅ After
className="shadow-[3px_3px_0_var(--outline-black)] hover:shadow-[4px_4px_0_var(--outline-black)]"
```

---

### Issue: Colors don't match between pages

**Find**:
```bash
# Find all color usages
grep -r "bg-mario\|bg-\[var(--mario" components/ app/
```

**Fix**: Standardize on one approach:
```tsx
// ✅ Option A: CSS variable (recommended)
className="bg-[var(--mario-red)]"

// ✅ Option B: Tailwind utility
className="bg-mario"
```

---

### Issue: Border radius looks inconsistent

**Find**:
```bash
grep -r "rounded-" components/ app/ | grep -v "rounded-full"
```

**Fix**: Use only standardized values:
```tsx
// ❌ Avoid custom values
className="rounded-[14px]"

// ✅ Use semantic tokens
className="rounded-xl" // 16px from theme
```

---

## Next Steps

1. **Run diagnostics** (browser console scripts above)
2. **Document conflicts** - List specific issues you're seeing
3. **Choose strategy** - Pick one resolution strategy
4. **Create migration plan** - Don't change everything at once
5. **Test thoroughly** - Check each component after changes

## Need Help?

Tell me:
1. What specific styling issues are you seeing? (screenshots help!)
2. Which components are affected?
3. What behavior do you expect vs. what you're getting?

I can then create a surgical fix that preserves your current design while resolving conflicts.
