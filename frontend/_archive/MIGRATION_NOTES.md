# Theme Migration Notes - VirtualSol to Mario Theme

**Date**: 2025-01-22
**Migration**: Old VirtualSol Theme → Mario Theme (1UP SOL)

## Overview

This directory contains archived files from the old VirtualSol theming system. The codebase has been migrated to a Mario-themed design system with light mode only.

## What Was Changed

### Theme System Changes
- **Removed**: Dark mode support (completely eliminated)
- **Removed**: Old color scales (slate, zinc, neutral, stone)
- **Added**: Mario-themed colors (mario-red, luigi-green, star-yellow, coin-yellow, etc.)
- **Added**: OKLCH color system with Display-P3 wide gamut support
- **Added**: Tailwind v4 CSS theme tokens

### Branding Changes
- **Old**: VirtualSol branding
- **New**: 1UP SOL branding with Mario game aesthetic

### Design Philosophy Changes
- **Old**: Modern, sleek, gradient-heavy design with glass effects
- **New**: Retro Mario game aesthetic with flat colors, pixel fonts, 3D block shadows

## Archived Files

### Backups Directory (`_archive/backups/`)
- `page.tsx.backup` - Old docs page with VirtualSol branding
- `page.tsx.bak` - Old settings page backup

## Active Mario Theme Files

### Core Theme Files (DO NOT ARCHIVE)
- `app/globals.css` - Main Mario theme CSS with OKLCH colors
- `app/theme.css` - Tailwind v4 CSS theme tokens
- `tailwind.config.js` - Tailwind configuration with Mario colors
- `components/providers.tsx` - Forces light mode only (`forcedTheme="light"`)

### Mario-Themed Components (DO NOT ARCHIVE)
- `components/landing/` - All landing page components use Mario theme
- `components/trading/mario-*.tsx` - Mario-themed trading components
- `components/navigation/` - Navigation with Mario theme
- `components/level/` - XP and level components with Mario aesthetic

## Components That Were Updated

### Dark Mode Cleanup
Removed `dark:` class prefixes from 48+ component files including:
- Leaderboard components
- Rewards components
- Trading components
- Wallet components
- Auth components
- Shared UI components

### Color Scheme Updates
Updated from old Tailwind color scales to Mario theme:
- `bg-gray-*` → `bg-sky-*` (Mario sky blue)
- `bg-slate-*` → `bg-brick-*` (Mario brick red/brown)
- `text-zinc-*` → `text-mario-*` or `text-pipe-*`
- `border-neutral-*` → `border-mario-*` or `border-pipe-*`

### Shadcn UI Components
Updated all shadcn/ui components to use Mario theme colors instead of default slate/zinc scales.

## Migration Guidelines

If you need to restore old theme behavior:

1. **Restore dark mode**:
   - Remove `forcedTheme="light"` from `components/providers.tsx`
   - Re-add dark mode CSS to `app/globals.css`
   - Add back `dark:` class prefixes to components

2. **Restore old colors**:
   - Update `tailwind.config.js` to use old color scales
   - Replace Mario color classes with old color classes
   - Update `app/globals.css` custom properties

3. **Restore VirtualSol branding**:
   - Search and replace "1UP SOL" with "VirtualSol"
   - Update logo and favicon
   - Update meta tags in `app/layout.tsx`

## DO NOT Archive These

The following are part of the active Mario theme and should NOT be archived:
- Any file with "mario" in the name
- `globals.css`, `theme.css`, `tailwind.config.js`
- Landing page components
- Navigation components
- Current trading panel components

## Rollback Information

For complete rollback procedures, see:
- `ROLLBACK_GUIDE.md` in the root directory
- Remote backup branch: `pre-modernization-2025-backup`

## Questions?

If you're unsure whether a file should be archived:
1. Check if it contains "mario" in filename → KEEP
2. Check if it's referenced in `CLAUDE.md` or `ARCHITECTURE.md` → KEEP
3. Check if it has `.bak`, `.backup`, or `.old` extension → ARCHIVE
4. Check if it contains only old VirtualSol branding → ARCHIVE
5. When in doubt → KEEP (you can always archive later)
