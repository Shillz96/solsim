# 🎮 Mario Theme Consistency Guide

## 🎯 **STANDARD PATTERNS - USE THESE EVERYWHERE**

### **1. Page Background (REQUIRED on ALL pages)**
```css
className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20"
```
**OR use the utility class:**
```css
className="min-h-screen mario-page-bg"
```

### **2. Mario Card Styling (REQUIRED for ALL cards)**
```css
className="border-4 border-[var(--outline-black)] shadow-[6px_6px_0_var(--outline-black)] rounded-xl"
```
**OR use the utility class:**
```css
className="mario-card-standard"
```

### **3. Mario Button Styling (REQUIRED for ALL buttons)**
```css
className="border-3 border-[var(--outline-black)] shadow-[3px_3px_0_var(--outline-black)]"
```
**OR use the utility class:**
```css
className="mario-btn-standard"
```

### **4. Mario Header Cards (for page headers)**
```css
className="bg-[var(--sky-blue)]/20 border-4 border-[var(--outline-black)] shadow-[8px_8px_0_var(--outline-black)]"
```
**OR use the utility class:**
```css
className="mario-header-card"
```

### **5. Mario Section Cards (for content sections)**
```css
className="bg-white border-4 border-[var(--outline-black)] shadow-[6px_6px_0_var(--outline-black)]"
```
**OR use the utility class:**
```css
className="mario-section-card"
```

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
