# 1UP SOL - Mario Header Assets Needed

This document lists all the Mario-style header images you need to create for the complete rebrand.

## Reference Image
You already have: `frontend/public/Trending-tokens-header.png`
Use this as your style reference for all other headers!

## Style Guidelines

### Typography
- **Font**: Luckiest Guy (Google Fonts)
- **Text Transform**: UPPERCASE
- **Letter Spacing**: 1-2px for readability

### Color Palette
Use these vibrant Mario colors (mix and match):
- **Mario Red**: #E52521
- **Luigi Green**: #43B047
- **Super Blue**: #2B4EF9
- **Star Yellow**: #FFD800
- **Coin Gold**: #FFB915
- **Sky Blue**: #A6D8FF
- **Pipe Green**: #00994C

### Text Effects
1. **Black Outline**: 2-3px solid black stroke around all letters
2. **3D Shadow**: Offset shadow (3px right, 3px down) in black
3. **Drop Shadow**: Additional subtle shadow (6px right, 6px down) at 25% opacity for depth
4. **Colorful Letters**: Each letter or word can be a different color from the palette

### File Format
- **Format**: PNG with transparent background
- **Resolution**: @2x for retina displays (2x the dimensions listed below)
- **Optimization**: Run through TinyPNG or similar before final delivery

---

## Required Assets

### 1. Main Logo
**Filename**: `1up-sol-logo.png`
**Dimensions**: 400×120px (800×240px @2x)
**Text**: "1UP SOL"
**Colors**: Rainbow gradient (Blue → Red → Yellow → Green)
**Special**: Include a small 1UP mushroom icon or star power-up
**Usage**: Navigation bar, hero section
**Priority**: 🔴 HIGH

---

### 2. Page Headers (Main Pages)

#### Trade Page
**Filename**: `trade-header.png`
**Dimensions**: 600×150px (1200×300px @2x)
**Text**: "TRADE"
**Colors**: Luigi Green + Coin Gold
**Special**: Add coin icons around text
**Usage**: `/trade` page header
**Priority**: 🟡 MEDIUM

#### Portfolio Page
**Filename**: `portfolio-header.png`
**Dimensions**: 700×150px (1400×300px @2x)
**Text**: "PORTFOLIO"
**Colors**: Coin Gold + Star Yellow
**Special**: Add treasure chest or coin bag graphic
**Usage**: `/portfolio` page header
**Priority**: 🟡 MEDIUM

#### Trending Tokens Page
**Filename**: `trending-tokens-header.png`
**Dimensions**: 800×150px (1600×300px @2x)
**Text**: "TRENDING TOKENS"
**Colors**: Rainbow (you already have this!)
**Special**: Colorful, energetic
**Usage**: `/trending` page header
**Priority**: ✅ DONE

#### Leaderboard Page
**Filename**: `leaderboard-header.png`
**Dimensions**: 750×150px (1500×300px @2x)
**Text**: "LEADERBOARD"
**Colors**: Super Blue + Star Yellow
**Special**: Add trophy, crown, or star power-up icons
**Usage**: `/leaderboard` page header
**Priority**: 🔴 HIGH

#### About Page
**Filename**: `about-header.png`
**Dimensions**: 500×120px (1000×240px @2x)
**Text**: "ABOUT"
**Colors**: Mario Red with black outline
**Special**: Simple and bold
**Usage**: `/about` page header
**Priority**: 🟢 LOW

#### Docs Page
**Filename**: `docs-header.png`
**Dimensions**: 500×120px (1000×240px @2x)
**Text**: "DOCS"
**Colors**: Pipe Green + Luigi Green
**Special**: Add question block icon or book
**Usage**: `/docs` page header
**Priority**: 🟡 MEDIUM

---

### 3. Landing Page Section Headers

#### Features Section
**Filename**: `features-header.png`
**Dimensions**: 650×140px (1300×280px @2x)
**Text**: "FEATURES"
**Colors**: Rainbow gradient
**Special**: Fun and inviting
**Usage**: Landing page features section
**Priority**: 🟡 MEDIUM

#### How It Works Section
**Filename**: `how-it-works-header.png`
**Dimensions**: 800×140px (1600×280px @2x)
**Text**: "HOW IT WORKS"
**Colors**: Super Blue + Sky Blue
**Special**: Add arrow or pipe graphics
**Usage**: Landing page how-it-works section
**Priority**: 🟡 MEDIUM

#### Level Up Section (Replaces Rewards)
**Filename**: `level-up-header.png`
**Dimensions**: 700×150px (1400×300px @2x)
**Text**: "LEVEL UP!"
**Colors**: Star Yellow + Coin Gold
**Special**: ADD STAR POWER-UP GRAPHICS! Super important!
**Usage**: Landing page level-up section (replaces rewards)
**Priority**: 🔴 HIGH

#### Start Trading CTA Section
**Filename**: `start-trading-header.png`
**Dimensions**: 800×140px (1600×280px @2x)
**Text**: "START TRADING"
**Colors**: Mario Red + Star Yellow
**Special**: Bold, action-oriented, exciting
**Usage**: Landing page call-to-action section
**Priority**: 🟡 MEDIUM

---

### 4. Logo & Icon Assets (Future)

These can be created later, but list them for completeness:

**Filename**: `1up-sol-icon.png`
**Dimensions**: 512×512px (1024×1024px @2x)
**Usage**: App icon, favicon replacement
**Priority**: 🟢 LOW (can use placeholders for now)

**Filename**: `og-image-1upsol.png`
**Dimensions**: 1200×630px
**Usage**: Social media sharing (Open Graph)
**Priority**: 🟢 LOW

**Filename**: `twitter-card-1upsol.png`
**Dimensions**: 1200×600px
**Usage**: Twitter/X card sharing
**Priority**: 🟢 LOW

---

## Implementation Notes

### How to Use These Assets

1. **Save to**: `frontend/public/` directory
2. **Import in components**:
   ```tsx
   <Image src="/trade-header.png" alt="Trade" width={600} height={150} />
   ```
3. **Responsive**: Use CSS to scale on mobile:
   ```css
   max-width: 100%;
   height: auto;
   ```

### Placeholder Components

We've created placeholder components that show where each header goes:
```tsx
import { TradeHeaderPlaceholder } from '@/components/placeholders'

// Use in your pages until real images are ready:
<TradeHeaderPlaceholder />
```

### Priority Legend
- 🔴 **HIGH**: Critical for core user experience
- 🟡 **MEDIUM**: Important but not blocking
- 🟢 **LOW**: Nice to have, can wait

---

## Quick Reference Table

| Asset | Dimensions | Colors | Priority | Status |
|-------|-----------|--------|----------|--------|
| 1up-sol-logo.png | 400×120 | Rainbow | 🔴 HIGH | ⏳ TODO |
| trade-header.png | 600×150 | Green/Gold | 🟡 MEDIUM | ⏳ TODO |
| portfolio-header.png | 700×150 | Gold/Yellow | 🟡 MEDIUM | ⏳ TODO |
| trending-tokens-header.png | 800×150 | Rainbow | 🔴 HIGH | ✅ DONE |
| leaderboard-header.png | 750×150 | Blue/Yellow | 🔴 HIGH | ⏳ TODO |
| about-header.png | 500×120 | Red | 🟢 LOW | ⏳ TODO |
| docs-header.png | 500×120 | Green | 🟡 MEDIUM | ⏳ TODO |
| features-header.png | 650×140 | Rainbow | 🟡 MEDIUM | ⏳ TODO |
| how-it-works-header.png | 800×140 | Blue | 🟡 MEDIUM | ⏳ TODO |
| level-up-header.png | 700×150 | Yellow | 🔴 HIGH | ⏳ TODO |
| start-trading-header.png | 800×140 | Red/Yellow | 🟡 MEDIUM | ⏳ TODO |

---

## Design Tools Recommendations

### Option 1: Figma/Adobe Illustrator
- Install Luckiest Guy font
- Create artboards at @2x dimensions
- Use stroke effects for outlines
- Layer drop shadows for 3D effect
- Export as PNG @2x

### Option 2: Canva Pro
- Search for "Luckiest Guy" font
- Use "Effects" → "Outline" for black stroke
- Use "Effects" → "Shadow" for depth
- Download as PNG with transparent background
- Upscale to @2x in export settings

### Option 3: Online Generators
- LogoMakr.com
- Hatchful (Shopify)
- Cool Text (cooltext.com)
Then enhance in Photoshop/GIMP

---

## Questions?

If you need clarification on any asset:
1. Check the existing `Trending-tokens-header.png` for reference
2. View placeholder components in the browser for size context
3. Refer to the Mario color palette in `frontend/app/globals.css`

---

**Total Assets**: 11 headers + 3 optional icons
**Already Done**: 1 (Trending Tokens)
**Remaining**: 10 headers

**Estimated Time**: 2-4 hours for all headers (if you're comfortable with design tools)
