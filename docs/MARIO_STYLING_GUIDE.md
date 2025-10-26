# Mario Theme Styling Guide - House Rules

## Overview
This guide documents the standardized styling system for 1UP SOL. These rules ensure consistency, performance, and maintainability across the entire codebase.

---

## 🎯 Core Principles

### 1. Single Source of Truth
- **One outline token**: `--outline-black` (others aliased to it)
- **One card scale**: `.mario-card`, `.mario-card-sm`, `.mario-card-lg`
- **One badge definition**: `.mario-badge`
- **One motion scale**: `var(--transition-fast)` (0.15s), `var(--transition)` (0.2s), `var(--transition-slow)` (0.3s)

### 2. Token Usage
```css
/* ✅ CORRECT - Use canonical tokens */
border: 3px solid var(--outline-black);

/* ❌ WRONG - Don't use aliases directly */
border: 3px solid var(--color-outline-black);
```

---

## 🎨 Component Standards

### Cards
Use the standardized card system with proper variants:

```tsx
// Default/medium card
<div className="mario-card">Content</div>

// Small card (compact layouts)
<div className="mario-card-sm">Compact content</div>

// Large card (hero sections)
<div className="mario-card-lg">Prominent content</div>
```

**Specifications:**
- **Small**: 2px border, 2px shadow, `--radius-lg`, 0.5rem padding
- **Default**: 3px border, 3px shadow, `--radius-xl`, 0.75rem padding
- **Large**: 4px border, 6px shadow, `--radius-2xl`, 1.25rem padding

### Badges
Single canonical badge definition:

```tsx
<span className="mario-badge">
  Level 5
</span>
```

**Specifications:**
- 2px border with `--outline-black`
- `--color-coin` background
- 2px shadow
- 0.875rem font size, 700 weight
- 0.5px letter-spacing (not 1px+)

### Buttons
Consistent motion, no glow effects:

```tsx
// Buy button
<button className="btn-buy">Buy SOL</button>

// Sell button
<button className="btn-sell">Sell SOL</button>
```

**Motion Pattern:**
- Hover: `translateY(-2px)` + `4px 4px 0` shadow
- Active: `translateY(1px)` + `2px 2px 0` shadow
- Duration: `var(--transition)` (0.2s)
- **No glow effects** (removed rgba shadows)

---

## 📐 Layout Patterns

### MarioPanel Component
Use the standardized panel for all card-based layouts:

```tsx
import { MarioPanel } from '@/components/ui/mario-panel';

<MarioPanel 
  title="Trading Panel"
  actions={<Button>Refresh</Button>}
>
  <TradingContent />
</MarioPanel>
```

**Benefits:**
- Consistent header structure
- Proper spacing (mb-3, p-4)
- Hover effects built-in
- Token-based styling

---

## 🎭 Typography

### Text Stroke & Shadows
Use lighter strokes for better legibility:

```css
/* ✅ CORRECT - Readable at all sizes */
.mario-title {
  -webkit-text-stroke: 1px var(--outline-black);
  text-shadow: 2px 2px 0 var(--outline-black);
}

/* ❌ WRONG - Too heavy, blurs at small sizes */
.mario-title-old {
  -webkit-text-stroke: 2px var(--outline-black);
  text-shadow: 3px 3px 0 var(--outline-black);
}
```

### Letter Spacing
Reduced from aggressive spacing:

```css
/* ✅ CORRECT - Readable caps */
text-transform: uppercase;
letter-spacing: 0.5px;

/* ❌ WRONG - Too wide */
letter-spacing: 1px;
letter-spacing: 2px;
```

### Type Scale (Use Tailwind utilities)
```tsx
<p className="text-[clamp(14px,1.5vw,16px)]">Body text</p>
<h2 className="text-2xl/7">Section heading</h2>
<h1 className="text-4xl/9">Display heading</h1>
```

---

## 🖼️ Textures & Backgrounds

### Texture Layer Rules
**Maximum two textures, behind content, ≤ 25% opacity:**

```css
/* ✅ CORRECT - Optimized texture */
body::before {
  background-image: url('/papertexture-2.avif');
  background-size: 1600px 1600px;
  opacity: 0.25;
  mix-blend-mode: multiply;
  z-index: 0;
  /* No transforms, no blur */
}

body::after {
  display: none; /* Second overlay removed */
}

/* ❌ WRONG - Performance issues */
body::before {
  opacity: 0.45;
  transform: rotate(1.2deg) scale(1.03);
  filter: blur(0.8px);
  z-index: 1; /* Wrong layering */
}
```

**Rules:**
- ✅ Single texture layer preferred
- ✅ Opacity ≤ 25%
- ✅ `z-index: 0` (behind content)
- ✅ No transforms or filters
- ❌ No second `::after` texture
- ❌ No `z-index: 9999`

---

## ♿ Accessibility

### Focus Styles
High-contrast focus ring on all interactive elements:

```css
button:focus-visible,
a:focus-visible,
[role="button"]:focus-visible {
  outline: 3px solid var(--color-star);
  outline-offset: 2px;
  box-shadow: 0 0 0 2px #fff, 0 0 0 5px var(--outline-black);
}
```

**Automatic** - no need to add manually!

### Touch Targets
Use utility class instead of global sizing:

```tsx
// ✅ CORRECT - Add where needed
<button className="touch-target">
  <Icon />
</button>

// ❌ WRONG - Don't force globally
button {
  min-height: 44px; /* Removed from global styles */
  min-width: 44px;
}
```

---

## 🚀 Performance

### Motion Guidelines
Use consistent transition durations from theme:

```tsx
// ✅ CORRECT
transition: transform var(--transition), box-shadow var(--transition);

// ❌ WRONG - Arbitrary values
transition: all 0.3s;
transition: transform 200ms;
```

### Reduced Motion
Automatically respected via theme tokens:

```css
@media (prefers-reduced-motion: reduce) {
  @theme {
    --transition-fast: 0.01ms;
    --transition: 0.01ms;
    --transition-slow: 0.01ms;
  }
}
```

---

## 📋 Checklist

Before committing new components:

- [ ] Uses `var(--outline-black)` for borders (not `--color-outline-black`)
- [ ] Cards use `.mario-card`, `.mario-card-sm`, or `.mario-card-lg`
- [ ] Badges use `.mario-badge` (not custom definitions)
- [ ] Buttons use motion pattern (translateY + shadow change)
- [ ] No glow effects (rgba shadows removed)
- [ ] Letter-spacing ≤ 0.5px for uppercase text
- [ ] Text-stroke ≤ 1px for readability
- [ ] Transitions use theme tokens (`var(--transition)`)
- [ ] Touch targets use `.touch-target` utility where needed
- [ ] Focus styles rely on automatic global styles

---

## 🔧 Quick Reference

### Token Cheatsheet
```css
/* Borders & Outlines */
--outline-black: oklch(12% 0 0);

/* Border Radius */
--radius-lg: 0.75rem;   /* Cards-sm */
--radius-xl: 1rem;       /* Cards */
--radius-2xl: 1.5rem;    /* Cards-lg */

/* Transitions */
--transition-fast: 0.15s;
--transition: 0.2s;       /* Most common */
--transition-slow: 0.3s;

/* Shadows (Mario style) */
2px 2px 0 var(--outline-black)  /* Small */
3px 3px 0 var(--outline-black)  /* Default */
4px 4px 0 var(--outline-black)  /* Hover */
6px 6px 0 var(--outline-black)  /* Large */
```

### Common Patterns
```tsx
// Standard card
<div className="mario-card">

// Card with hover
<div className="mario-card hover:translate-y-[-2px]">

// Buy/sell buttons
<button className="btn-buy">Buy</button>
<button className="btn-sell">Sell</button>

// Badge
<span className="mario-badge">New</span>

// Touch target
<button className="touch-target">
  <SmallIcon />
</button>
```

---

## 📚 Additional Resources

- **Component Recipe**: `components/ui/mario-panel.tsx`
- **Theme Tokens**: `app/theme.css`
- **Global Styles**: `app/globals.css`
- **Badge System**: `styles/badges.css`

---

*Last updated: 2025-10-25*
*These rules keep the UI cleaner, faster, and more consistent without losing the Mario personality.*
