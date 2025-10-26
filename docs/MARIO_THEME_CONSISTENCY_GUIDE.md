# 🎮 Mario Theme Consistency Guide

## 🎯 **UPDATED STYLING SYSTEM - USE THESE UTILITIES!**

We've created comprehensive styling utilities to make Mario-themed components easier and more consistent. You now have **three ways** to apply Mario styling:

### **Option 1: CSS Utility Classes** (Fastest for simple elements)
```tsx
<div className="mario-card">Simple card</div>
<button className="mario-btn-primary">Click me</button>
<div className="mario-avatar-md">👤</div>
```

### **Option 2: marioStyles Utility Functions** (Best for dynamic styling)
```tsx
import { marioStyles } from '@/lib/utils'

<div className={marioStyles.cardLg(true)}>Interactive large card</div>
<button className={marioStyles.button('success', 'lg')}>Buy Token</button>
<div className={marioStyles.avatar('xl')}>👤</div>
```

### **Option 3: Manual Tailwind Classes** (For unique cases)
```tsx
<div className="border-4 border-[var(--outline-black)] shadow-[6px_6px_0_var(--outline-black)] rounded-2xl">
  Custom styled element
</div>
```

---

## 🎨 **CARD SYSTEM**

### **CSS Classes**
```css
.mario-card          /* Standard card: 3px border, 3px shadow, rounded-xl */
.mario-card-lg       /* Large card: 4px border, 6px shadow, rounded-2xl */
.mario-card-sm       /* Small card: 2px border, 2px shadow, rounded-lg */
```

### **marioStyles Functions**
```tsx
marioStyles.card(hover?)           // Standard card with optional hover
marioStyles.cardLg(hover?)         // Large prominent card
marioStyles.cardSm(hover?)         // Compact card
marioStyles.cardGradient(gradient, hover?)  // Card with gradient bg
```

**Examples:**
```tsx
// Standard card
<div className="mario-card">
  <h3>Token Stats</h3>
  <p>Price: $0.50</p>
</div>

// Large hero card with hover
<div className={marioStyles.cardLg(true)}>
  <h1>Featured Token</h1>
</div>

// Small list item
<div className="mario-card-sm">Quick stat</div>
```

---

## 🔘 **BUTTON SYSTEM**

### **CSS Classes**
```css
.mario-btn-primary   /* Star yellow button */
.mario-btn-success   /* Luigi green button */
.mario-btn-danger    /* Mario red button */
```

### **marioStyles Functions**
```tsx
marioStyles.button(variant, size)
// Variants: 'primary' | 'danger' | 'success' | 'secondary' | 'outline'
// Sizes: 'sm' | 'md' | 'lg'

marioStyles.iconButton(variant, size)
// For circular icon-only buttons
```

**Examples:**
```tsx
// Primary button
<button className="mario-btn-primary">
  Buy Token
</button>

// Dynamic success button with size
<button className={marioStyles.button('success', 'lg')}>
  Sell Token
</button>

// Icon button
<button className={marioStyles.iconButton('primary', 40)}>
  <Star />
</button>
```

---

## 💎 **SHADOW SYSTEM**

### **CSS Classes**
```css
.mario-shadow-sm     /* 2px shadow - Subtle depth */
.mario-shadow        /* 3px shadow - Standard */
.mario-shadow-md     /* 4px shadow - Medium depth */
.mario-shadow-lg     /* 6px shadow - Prominent */
.mario-shadow-xl     /* 8px shadow - Maximum depth */
```

### **marioStyles Constants**
```tsx
marioStyles.shadowSm   // 'shadow-[2px_2px_0_var(--outline-black)]'
marioStyles.shadowMd   // 'shadow-[3px_3px_0_var(--outline-black)]'
marioStyles.shadowLg   // 'shadow-[6px_6px_0_var(--outline-black)]'
marioStyles.shadowXl   // 'shadow-[8px_8px_0_var(--outline-black)]'
```

**Usage Guidelines:**
- **sm (2px)**: Badges, small interactive elements
- **md (3px)**: Standard cards, buttons
- **lg (6px)**: Featured cards, important CTAs
- **xl (8px)**: Hero sections, modal overlays

---

## 🧍 **AVATAR SYSTEM**

### **CSS Classes**
```css
.mario-avatar           /* Base avatar styling */
.mario-avatar-xs        /* 16px - Tiny */
.mario-avatar-sm        /* 24px - Small */
.mario-avatar-md        /* 40px - Medium */
.mario-avatar-lg        /* 64px - Large */
.mario-avatar-xl        /* 96px - Extra Large */
```

### **marioStyles Function**
```tsx
marioStyles.avatar(size)
// Sizes: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
```

**Examples:**
```tsx
// CSS class
<div className="mario-avatar mario-avatar-md">
  <img src="/user.png" alt="User" />
</div>

// marioStyles function
<div className={marioStyles.avatar('lg')}>
  <img src="/user.png" alt="User" />
</div>
```

---

## 🏅 **BADGE SYSTEM**

### **CSS Classes**
```css
.mario-badge            /* Small icon badge (16px) */
.mario-status-box       /* Status indicator */
.mario-status-box-sm    /* Small status indicator */
```

### **marioStyles Functions**
```tsx
marioStyles.badge              // Small icon badge
marioStyles.badgeLg(variant)   // Larger badge with text
// Variants: 'gold' | 'silver' | 'bronze' | 'admin' | 'verified'

marioStyles.statusBox(color, size)
// For colored status indicators
```

**Examples:**
```tsx
// Small badge
<div className="mario-badge">🏆</div>

// Large badge with variant
<div className={marioStyles.badgeLg('admin')}>
  ADMIN
</div>

// Status box
<div className={marioStyles.statusBox('var(--luigi-green)', 'md')}>
  <Wifi /> Online
</div>
```

---

## 📦 **BORDER SYSTEM**

### **CSS Classes**
```css
.mario-border-sm     /* 2px border - Subtle */
.mario-border        /* 3px border - Standard */
.mario-border-lg     /* 4px border - Prominent */
```

**Usage Guidelines:**
- **2px**: Dividers, subtle separators, small elements
- **3px**: Standard UI elements, cards, buttons
- **4px**: Hero sections, major cards, primary CTAs

---

## 🎯 **BORDER RADIUS STANDARDS**

Always use Tailwind's semantic radius classes:

```tsx
rounded-lg      // 8px - Small elements, badges
rounded-xl      // 12px - Standard cards
rounded-2xl     // 16px - Large cards, modals
rounded-full    // Circles - avatars, icon buttons
```

❌ **DON'T USE** hardcoded pixel values:
```tsx
// BAD
rounded-[16px]
rounded-[14px]
rounded-[12px]

// GOOD
rounded-2xl
rounded-xl
rounded-lg
```

---

## 🧩 **FORM ELEMENTS**

### **marioStyles Functions**
```tsx
marioStyles.input(size)    // Text input with Mario styling
// Sizes: 'sm' | 'md' | 'lg'

marioStyles.select         // Select dropdown with Mario styling
```

**Examples:**
```tsx
<input
  type="text"
  className={marioStyles.input('md')}
  placeholder="Enter amount..."
/>

<select className={marioStyles.select}>
  <option>Option 1</option>
</select>
```

---

## 🔧 **UTILITY HELPERS**

### **marioStyles Additional Functions**

```tsx
// Headers and sections
marioStyles.headerGradient(fromColor, toColor?)
marioStyles.sectionHeader

// Empty states
marioStyles.emptyStateIcon(bgColor, size?)

// Vitals/metrics cards
marioStyles.vitalsCard(bgGradient?)
marioStyles.vitalsIcon(bgColor, size)

// Layout
marioStyles.divider(orientation)  // 'horizontal' | 'vertical'
marioStyles.skeleton              // Loading skeleton
marioStyles.navBar                // Navigation bar styling
```

### **CSS Utility Classes**

```css
.mario-divider          /* Horizontal divider */
.mario-divider-vertical /* Vertical divider */
.mario-interactive      /* Generic interactive element with hover */
```

---

## 🎨 **COLOR VARIABLES - ALWAYS USE THESE**

### **Primary Colors**
- `var(--mario-red)` - Mario red for primary actions
- `var(--luigi-green)` - Luigi green for success/profit
- `var(--star-yellow)` - Star yellow for highlights
- `var(--coin-gold)` - Coin gold for accents
- `var(--sky-blue)` - Sky blue for backgrounds
- `var(--outline-black)` - Black for borders and outlines

### **Background Colors**
- `var(--background)` - Main background
- `var(--card)` - Card backgrounds
- `var(--muted)` - Muted backgrounds

## 🔧 **UTILITY CLASSES - USE THESE FOR CONSISTENCY**

### **Page Layout**
- `.mario-page-bg` - Standard page background
- `.mario-card-standard` - Standard card styling
- `.mario-section-card` - Content section cards
- `.mario-header-card` - Page header cards

### **Interactive Elements**
- `.mario-btn-standard` - Standard button styling
- `.mario-icon-container` - Icon background containers

### **Typography**
- `.mario-title-standard` - Page titles
- `.mario-subtitle-standard` - Page subtitles
- `.font-mario` - Mario font family

## 📋 **CHECKLIST FOR ALL PAGES**

### ✅ **Required Elements**
- [ ] Page uses `bg-gradient-to-br from-background via-background to-muted/20`
- [ ] All cards use `border-4 border-[var(--outline-black)]`
- [ ] All cards use `shadow-[6px_6px_0_var(--outline-black)]`
- [ ] All buttons use `border-3 border-[var(--outline-black)]`
- [ ] All buttons use `shadow-[3px_3px_0_var(--outline-black)]`
- [ ] Headers use `font-mario` class
- [ ] Colors use CSS variables (not hardcoded)

### ❌ **What NOT to Use**
- ❌ Different background gradients
- ❌ Hardcoded colors instead of CSS variables
- ❌ Inconsistent border widths
- ❌ Missing shadows on cards/buttons
- ❌ Non-Mario fonts for headers

## 🚀 **IMPLEMENTATION EXAMPLES**

### **Page Template**
```tsx
<div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
  <main className="container mx-auto px-4 py-6">
    {/* Header Card */}
    <div className="bg-[var(--sky-blue)]/20 border-4 border-[var(--outline-black)] rounded-xl p-6 shadow-[8px_8px_0_var(--outline-black)]">
      <h1 className="text-3xl font-mario font-bold text-[var(--outline-black)]">PAGE TITLE</h1>
    </div>
    
    {/* Content Cards */}
    <div className="bg-white border-4 border-[var(--outline-black)] rounded-xl p-6 shadow-[6px_6px_0_var(--outline-black)]">
      {/* Content */}
    </div>
  </main>
</div>
```

### **Button Template**
```tsx
<button className="bg-[var(--star-yellow)] text-[var(--outline-black)] border-3 border-[var(--outline-black)] shadow-[3px_3px_0_var(--outline-black)] rounded-lg font-mario px-4 py-2">
  BUTTON TEXT
</button>
```

## 🎯 **GOAL: 100% CONSISTENCY**

Every page and component should look like it belongs to the same Mario-themed game. Use these patterns consistently across:

- ✅ Portfolio page (already perfect)
- ✅ Trade page (needs updates)
- ✅ Leaderboard page (needs updates)
- ✅ Pipe Network page (needs updates)
- ✅ All components (needs updates)

**Remember: The portfolio page is the gold standard - make everything else match it!**
