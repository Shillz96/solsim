# 1UP SOL Mario Theme Design System

**Version**: 2.0
**Last Updated**: January 22, 2025
**Theme**: Mario Retro Game Aesthetic
**Mode**: Light Mode Only

---

## Table of Contents

1. [Overview](#overview)
2. [Design Philosophy](#design-philosophy)
3. [Color System](#color-system)
4. [Typography](#typography)
5. [Spacing & Layout](#spacing--layout)
6. [Component Patterns](#component-patterns)
7. [Animations & Effects](#animations--effects)
8. [Implementation Guidelines](#implementation-guidelines)
9. [Migration from Old Theme](#migration-from-old-theme)

---

## Overview

The 1UP SOL Mario Theme transforms the VirtualSol trading platform into a nostalgic, game-inspired experience that combines retro aesthetics with modern web capabilities. This design system documents the Mario-themed visual language, component patterns, and implementation guidelines.

### Core Principles

1. **Nostalgic Fun**: Evoke the joy and excitement of classic Mario games
2. **Clear Hierarchy**: Use bold colors and shapes to guide user attention
3. **Flat & Bold**: Embrace flat design with strong borders and vibrant colors
4. **Accessible**: Maintain WCAG AA contrast ratios despite playful styling
5. **Modern Polish**: Blend retro aesthetics with contemporary UX patterns

---

## Design Philosophy

### The Mario Aesthetic

The Mario theme draws inspiration from the iconic Nintendo franchise while adapting it for financial trading:

- **Color Palette**: Primary colors (red, blue, yellow, green) inspired by Mario, Luigi, stars, and coins
- **Typography**: Pixel-style display fonts paired with readable system fonts
- **Borders**: Bold 3-4px borders reminiscent of 8-bit/16-bit game graphics
- **Shadows**: 3D block-style shadows instead of soft shadows
- **Icons**: Playful Mario-themed emojis and iconography

### Light Mode Only

The Mario theme is **light mode only** by design:
- Bright, vibrant colors work best on light backgrounds
- Nostalgic games were displayed on bright screens
- Trading interfaces benefit from high contrast on white
- Simplifies maintenance and reduces complexity

---

## Color System

### Primary Colors

Based on iconic Mario elements:

```css
/* Mario Red - Primary action color, danger states */
--mario-red-50: oklch(97% 0.013 25);    /* Lightest tint */
--mario-red-100: oklch(94% 0.025 25);
--mario-red-200: oklch(88% 0.05 25);
--mario-red-300: oklch(82% 0.10 25);
--mario-red-400: oklch(72% 0.15 25);
--mario-red-500: oklch(62% 0.22 25);    /* Base Mario Red */
--mario-red-600: oklch(52% 0.22 25);
--mario-red-700: oklch(42% 0.20 25);
--mario-red-800: oklch(32% 0.15 25);
--mario-red-900: oklch(25% 0.10 25);    /* Darkest shade */

/* Luigi Green - Success states, positive indicators */
--luigi-green-50: oklch(97% 0.013 145);
--luigi-green-500: oklch(62% 0.18 145);  /* Base Luigi Green */
--luigi-green-900: oklch(25% 0.08 145);

/* Star Yellow - Highlights, important elements */
--star-yellow-50: oklch(97% 0.013 95);
--star-yellow-500: oklch(85% 0.15 95);   /* Base Star Yellow */
--star-yellow-900: oklch(35% 0.08 95);

/* Coin Yellow - Secondary highlights, rewards */
--coin-yellow-50: oklch(97% 0.013 85);
--coin-yellow-500: oklch(82% 0.14 85);   /* Base Coin Yellow */
--coin-yellow-900: oklch(32% 0.08 85);

/* Sky Blue - Backgrounds, calm elements */
--sky-50: oklch(98% 0.008 240);
--sky-100: oklch(95% 0.015 240);
--sky-500: oklch(75% 0.10 240);          /* Mario Sky Blue */
--sky-900: oklch(30% 0.06 240);

/* Pipe Green - Neutral accents */
--pipe-50: oklch(96% 0.010 160);
--pipe-100: oklch(92% 0.020 160);
--pipe-200: oklch(88% 0.030 160);
--pipe-300: oklch(80% 0.050 160);
--pipe-400: oklch(70% 0.070 160);
--pipe-500: oklch(60% 0.090 160);        /* Mario Pipe Green */
--pipe-600: oklch(50% 0.090 160);
--pipe-700: oklch(40% 0.070 160);
--pipe-800: oklch(30% 0.050 160);
--pipe-900: oklch(20% 0.030 160);

/* Brick Red/Brown - Neutral backgrounds */
--brick-700: oklch(42% 0.08 40);
--brick-900: oklch(25% 0.05 40);
```

### Display-P3 Wide Gamut Enhancement

On modern displays that support Display-P3 color gamut (MacBooks, iPhones, iPads), colors are automatically enhanced for more vibrant appearance:

```css
@media (color-gamut: p3) {
  --mario-red-500: oklch(62% 0.28 25);   /* 25% more chromatic */
  --luigi-green-500: oklch(62% 0.23 145);
  --star-yellow-500: oklch(85% 0.19 95);
  /* All colors enhanced by 20-30% chroma */
}
```

### Semantic Colors

```css
/* Trading-specific colors */
--color-profit: #00ff85;         /* Bright green for gains */
--color-loss: #ff4444;           /* Bright red for losses */

/* UI feedback colors */
--color-success: var(--luigi-green-500);
--color-warning: var(--star-yellow-500);
--color-error: var(--mario-red-500);
--color-info: var(--sky-500);
```

### Color Usage Guidelines

#### Do's ✅
- Use Mario Red for primary actions (Buy buttons, CTAs)
- Use Luigi Green for success states and positive indicators
- Use Star/Coin Yellow for highlights and rewards
- Use Sky Blue for calm, informational backgrounds
- Use Pipe colors for neutral UI elements (borders, text, icons)
- Maintain contrast ratios of 4.5:1 for text, 3:1 for large text

#### Don'ts ❌
- Don't use dark mode variants
- Don't use low-contrast colors for text
- Don't mix old gray/slate color scales
- Don't use gradients unless Mario-themed
- Don't use muted pastels (use vibrant colors)

---

## Typography

### Font Families

```css
/* Display/Headers - Pixel font for retro game feel */
--font-mario: 'Press Start 2P', 'Courier New', monospace;

/* Body Text - Readable system font */
--font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto',
             'Oxygen', 'Ubuntu', 'Cantarell', 'Helvetica Neue', sans-serif;

/* Monospace - For numbers, prices, code */
--font-mono: 'SF Mono', 'Monaco', 'Cascadia Code', 'Courier New', monospace;
```

### Type Scale

```css
/* Font sizes */
--text-xs: 0.75rem;      /* 12px */
--text-sm: 0.875rem;     /* 14px */
--text-base: 1rem;       /* 16px */
--text-lg: 1.125rem;     /* 18px */
--text-xl: 1.25rem;      /* 20px */
--text-2xl: 1.5rem;      /* 24px */
--text-3xl: 1.875rem;    /* 30px */
--text-4xl: 2.25rem;     /* 36px */
--text-5xl: 3rem;        /* 48px */
--text-6xl: 3.75rem;     /* 60px */

/* Line heights */
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.75;
```

### Typography Guidelines

#### Headers
- Use `.font-mario` class for impactful headers
- Apply text shadows for depth: `3px 3px 6px rgba(0,0,0,0.9)`
- Use sparingly (headers only) - pixel fonts are hard to read in body text

#### Body Text
- Use system fonts for all body text
- Minimum size: 14px (text-sm)
- Optimal reading size: 16px (text-base)
- Maximum line length: 75ch

#### Numbers & Prices
- Use monospace fonts for alignment
- Bold weights for important values
- Color-code profit/loss (green/red)

---

## Spacing & Layout

### Spacing Scale

Based on 4px base unit:

```css
--space-0: 0;
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
--space-20: 5rem;     /* 80px */
--space-24: 6rem;     /* 96px */
```

### Border Styles

```css
/* Mario-style bold borders */
--border-2: 2px solid;
--border-3: 3px solid;
--border-4: 4px solid;
--border-6: 6px solid;

/* Border colors */
--border-mario: 4px solid var(--mario-red-500);
--border-luigi: 4px solid var(--luigi-green-500);
--border-star: 4px solid var(--star-yellow-500);
--border-pipe: 3px solid var(--pipe-400);
```

### Border Radius

```css
/* Slightly rounded corners - not too soft */
--radius-sm: 0.25rem;   /* 4px */
--radius-md: 0.5rem;    /* 8px */
--radius-lg: 0.75rem;   /* 12px */
--radius-xl: 1rem;      /* 16px */
--radius-2xl: 1.25rem;  /* 20px */

/* Avoid rounded-3xl (too soft for Mario aesthetic) */
```

### Shadows

```css
/* 3D block-style shadows */
--shadow-mario: 4px 4px 0 0 rgba(0, 0, 0, 0.3);
--shadow-mario-lg: 6px 6px 0 0 rgba(0, 0, 0, 0.3);
--shadow-mario-hover: 2px 2px 0 0 rgba(0, 0, 0, 0.3);

/* Standard shadows for cards */
--shadow-card: 0 1px 3px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 4px 6px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 8px 16px rgba(0, 0, 0, 0.15);
```

---

## Component Patterns

### Mario Card

The standard card component with Mario styling:

```tsx
<div className="mario-card bg-white border-4 border-mario-yellow rounded-xl shadow-xl p-6">
  {/* Content */}
</div>
```

**Variants**:
- `.mario-card` - White background, bold border
- `.mario-card-red` - Red border
- `.mario-card-green` - Green border (Luigi theme)
- `.mario-card-blue` - Blue border (Sky theme)

### Mario Button

Bold, game-inspired buttons:

```tsx
<button className="mario-btn bg-mario-red text-white border-3 border-mario-red-700 rounded-lg px-6 py-3">
  Click Me!
</button>
```

**Sizes**:
- `.mario-btn-sm` - Small (32px height)
- `.mario-btn` - Medium (40px height)
- `.mario-btn-lg` - Large (48px height)

**Variants**:
- `.mario-btn-primary` - Mario Red
- `.mario-btn-success` - Luigi Green
- `.mario-btn-warning` - Star Yellow
- `.mario-btn-secondary` - Pipe Gray

**States**:
- Hover: Lighter shade, shadow reduces
- Active: Even lighter, no shadow
- Disabled: 50% opacity, no hover effect

### Trade Buttons (Buy/Sell)

Special styling for trading actions:

```tsx
/* Buy Button */
<button className="buy-btn bg-[#00ff85] text-black border-3 border-green-600">
  Buy
</button>

/* Sell Button */
<button className="sell-btn bg-[#ff4444] text-white border-3 border-red-700">
  Sell
</button>
```

### XP Progress Bar

Level progression with Mario styling:

```tsx
<div className="xp-bar bg-pipe-200 rounded-full h-4 overflow-hidden border-2 border-pipe-400">
  <div className="bg-gradient-to-r from-mario-yellow via-mario-orange to-mario-red h-full"
       style={{ width: `${progress}%` }}
  />
</div>
```

### Leaderboard Ranks

Trophy icons with tier colors:

```tsx
{rank === 1 && <Trophy className="h-5 w-5 text-mario-yellow" />}
{rank === 2 && <Trophy className="h-5 w-5 text-pipe-400" />}
{rank === 3 && <Trophy className="h-5 w-5 text-mario-orange" />}
```

### Navigation

Mario-themed navigation with XP badge:

```tsx
<nav className="bg-white border-b-4 border-mario-blue shadow-lg">
  <div className="flex items-center justify-between px-4 py-3">
    <Logo />
    <NavLinks />
    <XPBadge />
    <WalletButton />
  </div>
</nav>
```

---

## Animations & Effects

### View Transitions API

Smooth page transitions (Chrome 111+, Safari 18+):

```css
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 0.3s;
  animation-timing-function: ease-in-out;
}

::view-transition-old(root) {
  animation-name: fade-out;
}

::view-transition-new(root) {
  animation-name: fade-in;
}
```

### Hover Effects

Button hover with shadow reduction:

```css
.mario-btn:hover {
  transform: translateY(-1px);
  box-shadow: 2px 2px 0 0 rgba(0, 0, 0, 0.3);
}

.mario-btn:active {
  transform: translateY(1px);
  box-shadow: none;
}
```

### Loading States

```tsx
<div className="animate-spin rounded-full h-8 w-8 border-b-4 border-mario-red"></div>
```

### Backdrop Blur

Modern polish for cards and overlays:

```css
.backdrop-blur-sm { backdrop-filter: blur(4px); }
.backdrop-blur-md { backdrop-filter: blur(12px); }
```

---

## Implementation Guidelines

### CSS Architecture

```
frontend/app/
├── globals.css           # Main Mario theme CSS
├── theme.css            # Tailwind v4 CSS tokens
└── wallet-modal-override.css  # Wallet-specific overrides

frontend/tailwind.config.js  # Tailwind configuration
```

### Tailwind Configuration

All Mario colors are defined in `tailwind.config.js`:

```js
colors: {
  'mario-red': { 50: '...', 500: '...', 900: '...' },
  'luigi-green': { /* ... */ },
  'star-yellow': { /* ... */ },
  'coin-yellow': { /* ... */ },
  'sky': { /* ... */ },
  'pipe': { /* ... */ },
  'brick': { /* ... */ },
}
```

### Component Organization

```
frontend/components/
├── landing/         # Landing page components (Mario-themed)
├── trading/         # Trading components (mario-*.tsx)
├── navigation/      # Nav components
├── level/           # XP and level components
├── leaderboard/     # Leaderboard components
├── rewards/         # Rewards components
└── shared/          # Shared components
```

### Best Practices

#### ✅ Do's

1. Use Mario theme color classes from Tailwind config
2. Apply bold borders (3-4px) to cards and buttons
3. Use pixel font only for headers
4. Add text shadows to headers over colorful backgrounds
5. Use semantic colors for trading (profit green, loss red)
6. Test colors on both sRGB and P3 displays
7. Maintain WCAG AA contrast ratios
8. Use backdrop-blur for modern polish

#### ❌ Don'ts

1. Don't use dark mode classes (`dark:*`)
2. Don't use old color scales (`slate-*`, `zinc-*`, `gray-*`)
3. Don't use soft, muted colors
4. Don't use thin borders (less than 2px)
5. Don't use pixel font for body text
6. Don't create gradients outside Mario color palette
7. Don't forget mobile responsive design
8. Don't use heavy box-shadows (use 3D block shadows)

---

## Migration from Old Theme

### What Was Removed

- ✗ Dark mode support (completely removed)
- ✗ Old gray/slate/zinc color scales
- ✗ Soft gradients
- ✗ Glass morphism heavy design
- ✗ Thin borders
- ✗ VirtualSol branding

### What Was Added

- ✓ Mario color palette (red, green, yellow, blue)
- ✓ OKLCH color system
- ✓ Display-P3 wide gamut support
- ✓ Pixel font typography
- ✓ Bold 3-4px borders
- ✓ 3D block shadows
- ✓ View Transitions API
- ✓ 1UP SOL branding

### Color Migration Map

```
Old                  → New
------------------   → ----------------------
bg-gray-*           → bg-pipe-* or bg-sky-*
text-gray-*         → text-pipe-*
border-gray-*       → border-pipe-*
bg-slate-*          → bg-pipe-*
text-slate-*        → text-pipe-*
dark:*              → (removed)
```

### Component Migration

See `frontend/_archive/MIGRATION_NOTES.md` for detailed migration history and archived old theme files.

---

## Resources

### Design References
- Mario game color palettes (NES, SNES era)
- Nintendo design guidelines
- Retro game UI patterns

### Testing Tools
- [Contrast Checker](https://webaim.org/resources/contrastchecker/) - WCAG compliance
- Chrome DevTools - Display-P3 color gamut testing
- Safari Web Inspector - OKLCH color validation

### Related Documentation
- `CLAUDE.md` - Project overview
- `ARCHITECTURE.md` - System architecture
- `MODERNIZATION_2025.md` - 2025 modernization plan
- `ROLLBACK_GUIDE.md` - Theme rollback procedures

---

**Last Updated**: January 22, 2025
**Maintained By**: Development Team
**Questions?**: See `CLAUDE.md` for contact information

---

🍄 **Power up your trading with the Mario theme!** 🍄
