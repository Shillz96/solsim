# Z-Index Consolidation - Phase 1.1 Complete ✅

**Date:** October 25, 2025  
**Status:** Complete  
**Priority:** Critical

## Summary

Successfully consolidated 3 conflicting z-index systems into a single unified token system using CSS custom properties. All hardcoded z-index values have been replaced with references to the new centralized system.

## Changes Made

### 1. Created Unified Z-Index Token System

**File:** `frontend/app/theme.css`

Added comprehensive z-index scale with clear hierarchy:

```css
/* Base Content Layers (0-10) */
--z-base: 0;
--z-background-texture: 1;      /* Background texture layer */
--z-content: 2;                 /* Main content layer */
--z-foreground-texture: 9999;   /* Top texture overlay */

/* Interface Elements (100-900) */
--z-header: 100;
--z-nav: 200;
--z-dropdown: 300;
--z-sidebar: 400;
--z-sticky: 500;

/* Overlay Elements (1000-1900) */
--z-modal-backdrop: 1000;
--z-modal: 1010;
--z-wallet-modal-backdrop: 1100;  /* Wallet modal system */
--z-wallet-modal: 1110;           /* Wallet modal content */
--z-popover: 1200;
--z-badge-tooltip: 1300;
--z-tooltip: 1400;

/* System Overlays (2000+) */
--z-toast: 2000;
--z-loading: 2100;
--z-onboarding: 2200;

/* Debug & Special (9999) */
--z-debug: 9998;
```

### 2. Removed Hardcoded Values from Wallet Modal

**File:** `frontend/app/wallet-modal-override.css`

**Before:**
```css
.wallet-adapter-modal-wrapper {
  z-index: 9999 !important;
}
.wallet-adapter-modal-overlay {
  z-index: 9998 !important;
}
```

**After:**
```css
.wallet-adapter-modal-wrapper {
  z-index: var(--z-wallet-modal) !important;
}
.wallet-adapter-modal-overlay {
  z-index: var(--z-wallet-modal-backdrop) !important;
}
```

### 3. Updated Global Styles

**File:** `frontend/app/globals.css`

- Background texture: `z-index: 1` → `var(--z-background-texture)`
- Foreground texture: `z-index: 9999` → `var(--z-foreground-texture)`
- Body children: `z-index: 2` → `var(--z-content)`
- Tab focus: `z-index: 10` → `var(--z-content)`

### 4. Updated Badge Styles

**File:** `frontend/styles/badges.css`

- Badge tooltips: `z-index: 1000` → `var(--z-badge-tooltip)`
- Badge notifications: `z-index: 1000` → `var(--z-toast)`
- Badge modal overlay: `z-index: 1000` → `var(--z-modal-backdrop)`

### 5. Cleaned Up Panel CSS

**File:** `frontend/styles/panel.css`

- Removed duplicate z-index definitions (now in theme.css)
- Updated header comment to reference theme.css as single source of truth
- Maintained all panel utility classes

### 6. Updated Tailwind Config

**File:** `frontend/tailwind.config.js`

Replaced hardcoded z-index scale with CSS custom property references:

**Before:**
```javascript
zIndex: {
  'dropdown': '1000',
  'sticky': '1100',
  'modal': '1300',
  'popover': '1400',
  'tooltip': '1500',
}
```

**After:**
```javascript
zIndex: {
  'base': 'var(--z-base)',
  'content': 'var(--z-content)',
  'header': 'var(--z-header)',
  'nav': 'var(--z-nav)',
  'dropdown': 'var(--z-dropdown)',
  'modal': 'var(--z-modal)',
  'wallet-modal': 'var(--z-wallet-modal)',
  'popover': 'var(--z-popover)',
  'tooltip': 'var(--z-tooltip)',
  'toast': 'var(--z-toast)',
  // ... full list in config
}
```

### 7. Updated React Components

**File:** `frontend/lib/onboarding-provider.tsx`
- Changed `zIndex: 9999` → `zIndex: "var(--z-onboarding)"`

**File:** `frontend/components/window/FloatingWindows.tsx`
- Changed `style={{ zIndex: 100 }}` → `style={{ zIndex: FLOATING_WINDOWS_CONTAINER_Z }}`
- Added constant: `const FLOATING_WINDOWS_CONTAINER_Z = 'var(--z-header)';`

## Benefits

1. **Single Source of Truth:** All z-index values defined in one location (`theme.css`)
2. **Predictable Layering:** Clear hierarchy prevents conflicts
3. **Easy Maintenance:** Update one value to affect entire app
4. **Better Developer Experience:** Named tokens are self-documenting
5. **Tailwind Integration:** Available as utilities (e.g., `z-modal`, `z-tooltip`)
6. **Raw CSS Support:** Works in vanilla CSS via `var(--z-modal)`

## Usage Examples

### Tailwind Utilities
```tsx
<div className="z-modal">Modal Content</div>
<div className="z-tooltip">Tooltip</div>
```

### Raw CSS
```tsx
<div style={{ zIndex: 'var(--z-modal)' }}>Modal</div>
```

### CSS Files
```css
.my-component {
  z-index: var(--z-modal);
}
```

## Verification

✅ No hardcoded z-index values in CSS files  
✅ No hardcoded z-index values in TSX files (except dynamic FloatingWindows)  
✅ TypeScript compilation passes  
✅ All systems reference unified token system  

## Files Modified

1. `frontend/app/theme.css` - Added z-index tokens
2. `frontend/app/wallet-modal-override.css` - Updated to use tokens
3. `frontend/app/globals.css` - Updated to use tokens
4. `frontend/styles/badges.css` - Updated to use tokens
5. `frontend/styles/panel.css` - Removed duplicate definitions
6. `frontend/tailwind.config.js` - Updated to reference tokens
7. `frontend/lib/onboarding-provider.tsx` - Updated inline style
8. `frontend/components/window/FloatingWindows.tsx` - Updated inline style

## Next Steps (Phase 1 Remaining)

- [ ] 1.2 Consolidate Color Systems
- [ ] 1.3 Audit Component Library Usage
- [ ] 1.4 Database Connection Pooling

## Notes

- FloatingWindows component uses dynamic z-index (`w.z`) which is intentional for window stacking
- All z-index tokens use clear naming convention with `--z-` prefix
- Wallet modal has dedicated tokens (`--z-wallet-modal`, `--z-wallet-modal-backdrop`) to prevent conflicts with regular modals
