# Spacing & Layout Improvements

## Overview
This document outlines the comprehensive spacing and layout improvements made to the trade, leaderboard, and portfolio pages to align with the minimal black/white aesthetic and improve visual hierarchy.

## Changes Made

### 1. Overall Page Layout (`frontend/app/trade/page.tsx`)
- **Increased main padding**: Changed from `px-2 py-4` to `px-6 py-6` for better breathing room
- **Improved grid gaps**: Increased from `gap-3` to `gap-6` between major sections
- **Added visual dividers**: 
  - Chart section: Added `border-l border-border pl-6` to separate from sidebar
  - Trade panel: Added `border-l border-border pl-6` for clear separation
- **Increased bottom section spacing**: Changed from `mt-3` to `mt-8` for Active Positions
- **Improved sticky positioning**: Updated top offset from `top-4` to `top-6` and height calculations

### 2. Trading Panel (`frontend/components/trading/trading-panel.tsx`)
- **Card styling**: Added `border border-border rounded-none shadow-none` for flat, minimal look
- **Section headings**: Made bolder with `font-bold text-lg` and added `mb-4` spacing
- **Button grid improvements**:
  - Increased gap from `gap-3` to `gap-4` for better scanability
  - Added `space-y-4` to parent containers for vertical rhythm
- **Label styling**: Made labels bold with `text-sm font-bold` for better hierarchy
- **Separator spacing**: Increased from `my-4` to `my-6` for clearer section breaks
- **Price info box**: 
  - Changed to `rounded-none` and added `border border-border`
  - Increased internal spacing from `space-y-2` to `space-y-3`
- **Holdings card**: 
  - Changed to `rounded-none` with `p-4` and `border border-border`
  - Made heading bold with `mb-3` spacing
- **Input sections**: Increased spacing from `space-y-2` to `space-y-3`

### 3. PnL Card (`frontend/components/portfolio/pnl-card.tsx`)
- **Card styling**: Added `border border-border rounded-none shadow-none` for consistency
- **Heading spacing**: Added `mb-4` to section header
- **Emphasized PnL value**:
  - Increased from `text-3xl` to `text-4xl` for the main value
  - Increased percentage from `text-lg` to `text-xl`
  - Increased gap between values from `gap-2` to `gap-3`
- **Made "Total P&L" label bold**: Changed to `text-sm font-bold`

### 4. Position Notes (`frontend/components/shared/position-notes.tsx`)
- **Card padding**: Increased from `p-4` to `p-6` for better readability
- **Card styling**: Added `border border-border rounded-none shadow-none`
- **Heading improvements**:
  - Changed from `text-sm` to `text-lg font-bold`
  - Increased bottom margin from `mb-4` to `mb-6`
- **Note spacing**: Increased from `space-y-3` to `space-y-4`
- **Individual notes**:
  - Changed to `rounded-none` with `p-4` padding
  - Increased internal spacing from `space-y-2` to `space-y-3`
  - Made token symbol bold
  - Increased grid gap from `gap-2` to `gap-3`

### 5. Chart Component (`frontend/components/trading/dexscreener-chart.tsx`)
- **Card styling**: Added `border border-border rounded-none shadow-none` for consistency

### 6. Global Card Component (`frontend/components/ui/card.tsx`)
- **Default styling**: Changed from `rounded-xl` to `rounded-none` for boxy minimalism
- **Shadow**: Changed from `shadow-sm` to `shadow-none` for flat design

## Design Principles Applied

### Spacing Hierarchy
- **Page level**: `px-6 py-6` for main container
- **Section gaps**: `gap-6` between major sections
- **Card padding**: `p-6` for standard cards
- **Internal spacing**: `space-y-4` for related elements, `space-y-6` for distinct sections

### Typography Scale
- **Main headings**: `text-lg font-bold` or `text-xl font-bold`
- **Labels**: `text-sm font-bold` for emphasis
- **Body text**: `text-sm` for secondary information
- **Large values**: `text-4xl font-bold` for emphasized numbers

### Visual Elements
- **Borders**: Consistent `border border-border` using theme variables
- **Border radius**: `rounded-none` for sharp, minimal aesthetic
- **Shadows**: `shadow-none` to maintain flat design
- **Dividers**: Left borders (`border-l`) for vertical section separation

## Theme Integration
All changes use theme variables instead of hardcoded values:
- `border-border` for borders
- `bg-card` for card backgrounds
- `text-muted-foreground` for secondary text
- `text-foreground` for primary text

This ensures the improvements work seamlessly with both light and dark modes while maintaining the minimal black/white aesthetic.

### 7. Leaderboard Page (`frontend/app/leaderboard/page.tsx`)
- **Container padding**: Increased from `px-4 py-8` to `px-6 py-8`
- **Header improvements**:
  - Removed gradient text styling for cleaner look
  - Increased heading bottom margin to `mb-4`
  - Made description text larger (`text-lg`)
- **Error card**: Added `border border-border rounded-none shadow-none` for consistency
- **Grid spacing**: Increased from `gap-6` to `gap-8` between columns
- **Time range filter**: Increased bottom margin from `mb-6` to `mb-8`
- **Your Rank card**:
  - Changed to `rounded-none shadow-none` with `border border-border`
  - Replaced gradient background with `bg-muted/30`
  - Made heading bold with `mb-4` spacing
  - Enhanced stat labels: `text-sm font-bold` with `mb-2`
  - Increased stat values from default to `text-lg`
- **Top Performers card**:
  - Updated to `rounded-none shadow-none` with `border border-border`
  - Made heading bold with `mb-6` spacing
  - Individual performer items: `rounded-none` with `p-4` and `border border-border`
- **Competition Stats card**:
  - Applied minimal styling: `rounded-none shadow-none` with `border border-border`
  - Made heading bold with `mb-6` spacing
  - Enhanced labels: `text-sm font-bold`
  - Increased values to `text-lg`
  - Increased spacing from `space-y-3` to `space-y-4`

### 8. Portfolio Page (`frontend/app/portfolio/page.tsx`)
- **Container padding**: Increased from `px-4 py-6` to `px-6 py-8`
- **Header improvements**:
  - Increased heading from `text-3xl` to `text-4xl`
  - Added `mb-4` to heading
  - Made description larger (`text-lg`)
  - Increased section bottom margin from `mb-6` to `mb-8`
- **Grid spacing**: Increased from `gap-6` to `gap-8` between columns
- **Main content column**: Increased spacing from `space-y-6` to `space-y-8`
- **Tabs list**: Increased bottom margin from `mb-4` to `mb-6`
- **Performance card**:
  - Updated to `rounded-none shadow-none` with `border border-border`
  - Made heading bold with `mb-6` spacing
- **Sidebar improvements**:
  - Made "Trending Tokens" heading bold
  - Increased heading bottom margin to `mb-6`
  - Updated sticky positioning from `top-6` to `top-8`

### 9. Trading Action Buttons - Glowy Green/Red (`frontend/app/globals.css` & `frontend/components/trading/trading-panel.tsx`)
- **New CSS Classes**: Added `.btn-buy`, `.btn-sell`, `.tab-buy`, and `.tab-sell` with glowing effects
- **Buy Button Styling**:
  - Green background (`#00ff85`) with glowing shadow effect
  - Increased height to `h-14` for better prominence
  - Larger text (`text-lg font-bold`) and icon (`h-5 w-5`)
  - Hover effect: Enhanced glow with `box-shadow: 0 0 30px rgba(0, 255, 133, 0.5)`
  - Subtle lift on hover (`transform: translateY(-1px)`)
- **Sell Button Styling**:
  - Red background (`#ff4d4d`) with glowing shadow effect
  - Matching height (`h-14`) and text size (`text-lg font-bold`)
  - Hover effect: Enhanced glow with `box-shadow: 0 0 30px rgba(255, 77, 77, 0.5)`
  - Subtle lift on hover
- **Tab Triggers**:
  - Buy tab: Green background with subtle glow when active
  - Sell tab: Red background with subtle glow when active
  - Increased height to `h-12` and font weight to `font-bold text-base`
- **Accessibility**: Proper disabled states with reduced opacity
- **Dark Mode**: Colors remain consistent across themes

## Benefits
1. **Improved readability**: More breathing room between elements
2. **Better hierarchy**: Clear visual distinction between sections
3. **Enhanced scannability**: Increased spacing makes buttons and options easier to identify
4. **Brand consistency**: Flat, minimal design aligns with the black/white aesthetic across all pages
5. **Responsive design**: All spacing scales appropriately on different screen sizes
6. **Unified experience**: Consistent spacing and styling across trade, leaderboard, and portfolio pages

