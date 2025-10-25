# 🎨 Mario Styling Refactor - Quick Reference Examples

## ✨ What Changed?

We've created a comprehensive styling system that reduces code duplication and makes styling more consistent across the app. You now have **3 ways** to apply Mario styling:

1. **CSS Utility Classes** - Fastest for simple static elements
2. **marioStyles Functions** - Best for dynamic/conditional styling  
3. **Manual Tailwind** - For unique edge cases

---

## 🔄 Before & After Examples

### **Example 1: Standard Card**

❌ **Before (Repetitive)**
```tsx
<div className="bg-white border-4 border-[var(--outline-black)] shadow-[6px_6px_0_var(--outline-black)] rounded-xl p-4 hover:shadow-[8px_8px_0_var(--outline-black)] hover:-translate-y-1 transition-all">
  Card content
</div>
```

✅ **After (Clean & Simple)**
```tsx
// Option 1: CSS class
<div className="mario-card-lg">
  Card content
</div>

// Option 2: marioStyles function (if you need to control hover)
<div className={marioStyles.cardLg(true)}>
  Card content
</div>
```

**Benefit:** 180 characters → 30 characters (83% reduction!)

---

### **Example 2: Button Variants**

❌ **Before**
```tsx
<button className="bg-[var(--luigi-green)] hover:bg-[var(--pipe-green)] text-white border-3 border-[var(--outline-black)] shadow-[3px_3px_0_var(--outline-black)] hover:shadow-[4px_4px_0_var(--outline-black)] hover:-translate-y-0.5 transition-all rounded-lg px-4 py-2 font-bold">
  Buy Token
</button>
```

✅ **After**
```tsx
// Option 1: CSS class
<button className="mario-btn-success">
  Buy Token
</button>

// Option 2: marioStyles with size control
<button className={marioStyles.button('success', 'lg')}>
  Buy Token
</button>
```

**Benefit:** 280 characters → 35 characters (87% reduction!)

---

### **Example 3: Avatar Sizes**

❌ **Before**
```tsx
<div className="h-16 w-16 rounded-full border-3 border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] overflow-hidden">
  <img src="/user.png" alt="User" />
</div>
```

✅ **After**
```tsx
// Option 1: CSS classes
<div className="mario-avatar mario-avatar-lg">
  <img src="/user.png" alt="User" />
</div>

// Option 2: marioStyles function
<div className={marioStyles.avatar('lg')}>
  <img src="/user.png" alt="User" />
</div>
```

---

### **Example 4: Status Badges**

❌ **Before**
```tsx
<div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-3 border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] font-mario font-bold text-xs text-white capitalize bg-[var(--luigi-green)]">
  <Wifi className="h-3.5 w-3.5" />
  <span>Online</span>
</div>
```

✅ **After**
```tsx
<div className={marioStyles.statusBox('var(--luigi-green)', 'md')}>
  <Wifi className="h-3.5 w-3.5" />
  <span>Online</span>
</div>
```

---

### **Example 5: Hardcoded Border Radius**

❌ **Before (Don't do this)**
```tsx
<div className="rounded-[16px] border-4 border-[var(--outline-black)]">
  Content
</div>

<div className="rounded-[14px] border-3 border-[var(--outline-black)]">
  Content
</div>

<div className="rounded-[12px] border-2 border-[var(--outline-black)]">
  Content
</div>
```

✅ **After (Use semantic Tailwind classes)**
```tsx
<div className="rounded-2xl border-4 border-[var(--outline-black)]">
  Content
</div>

<div className="rounded-xl border-3 border-[var(--outline-black)]">
  Content
</div>

<div className="rounded-lg border-2 border-[var(--outline-black)]">
  Content
</div>
```

**Why?** 
- Semantic classes map to CSS variables in `theme.css`
- Easier to maintain globally
- Better IDE autocomplete
- Consistent with Tailwind conventions

---

## 🎯 Quick Decision Guide

**Use CSS Classes when:**
- Element styling is static/unchanging
- You want the fastest implementation
- It's a simple, common pattern

```tsx
<div className="mario-card">Simple static card</div>
<button className="mario-btn-primary">Click me</button>
```

**Use marioStyles Functions when:**
- Styling is dynamic or conditional
- You need to control hover/size variants
- You want TypeScript type safety

```tsx
<div className={marioStyles.cardLg(shouldHover)}>
  Dynamic card
</div>

<button className={marioStyles.button(variant, size)}>
  {buttonText}
</button>
```

**Use Manual Tailwind when:**
- You need a truly unique design
- None of the utilities fit your use case
- You're prototyping something new

```tsx
<div className="border-6 border-[var(--custom-color)] shadow-[10px_10px_0_black] rounded-3xl">
  Custom unique element
</div>
```

---

## 📋 Refactoring Checklist

When refactoring components:

- [ ] Replace hardcoded `rounded-[Xpx]` with semantic Tailwind classes (`rounded-lg`, `rounded-xl`, etc.)
- [ ] Look for repeated `border-X border-[var(--outline-black)] shadow-[Xpx_Xpx_0_...]` patterns
- [ ] Check if marioStyles has a function that matches your use case
- [ ] Consider using CSS utility classes for simple static elements
- [ ] Test hover states and transitions still work correctly
- [ ] Verify spacing and layout remain unchanged (especially for /pipe-network, /warp-pipes, /room)

---

## 🚀 Benefits of This Refactor

1. **83-87% reduction** in styling code duplication
2. **Consistent visual hierarchy** across the entire app
3. **Easier maintenance** - update styles in one place
4. **Better developer experience** - clear semantic names
5. **Type safety** - TypeScript support for marioStyles functions
6. **Faster development** - less time writing repetitive classes
7. **Smaller bundle size** - CSS classes are more efficient than inline Tailwind

---

## 💡 Pro Tips

**Combine utilities for complex components:**
```tsx
<div className={cn(
  marioStyles.cardLg(true),
  "bg-gradient-to-br from-[var(--sky-blue)]/20 to-white"
)}>
  Card with gradient background and hover
</div>
```

**Use marioStyles constants for one-off shadow needs:**
```tsx
<div className={cn("custom-element", marioStyles.shadowLg)}>
  Element with large Mario shadow
</div>
```

**Layer CSS classes with Tailwind overrides:**
```tsx
<div className="mario-card p-8">
  {/* Override default padding (p-3) with p-8 */}
</div>
```

---

## 📚 Resources

- **Full documentation:** `MARIO_THEME_CONSISTENCY_GUIDE.md`
- **Theme variables:** `app/theme.css`
- **marioStyles source:** `lib/utils.ts`
- **CSS utilities:** `app/globals.css`

---

## ❓ Questions?

**Q: Should I refactor existing components immediately?**  
A: No rush! Refactor as you touch components. The old styles still work.

**Q: What about /pipe-network, /warp-pipes, and /room pages?**  
A: Leave their spacing/layout alone! Only update if you're changing functionality.

**Q: Can I mix old and new styling?**  
A: Yes, they're compatible. Refactor gradually for safety.

**Q: What if I need a custom shadow size?**  
A: Use manual Tailwind: `shadow-[5px_5px_0_var(--outline-black)]`
