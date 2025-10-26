# Safe Styling Fix Guide

This guide will help you fix styling issues **without breaking your current design**.

## Phase 1: Diagnosis (5 minutes)

### Step 1.1: Run Browser Diagnostic

1. Open your app in browser (localhost:3000)
2. Open DevTools Console (F12)
3. Copy and paste content from `public/style-diagnostic.js` into console
4. Run: `styleDiagnostic.runAll()`

**What to look for:**
- Soft shadows count (should be 0 for pure Mario theme)
- Color mismatches (should be 0)
- Z-index conflicts (low number is okay)
- Class conflicts (should be 0)

### Step 1.2: Run Code Audit (requires Node.js)

```bash
cd frontend
npm install -g glob  # If not already installed
node scripts/style-audit.js > style-audit-report.txt
```

**What to look for:**
- Files with mixed shadows
- Files with mixed color references
- High number of unique border radius values

### Step 1.3: Visual Inspection

Open these pages and look for styling issues:
- `/` - Home page
- `/trade` - Trade panel
- `/portfolio` - Portfolio page
- `/leaderboard` - Leaderboard

**Take screenshots of any issues you see:**
- Buttons with wrong shadows
- Colors that don't match
- Borders that look inconsistent
- Spacing that feels off

---

## Phase 2: Create Backup (2 minutes)

**IMPORTANT:** Always create a backup before making changes!

```bash
# From the frontend directory
git add .
git commit -m "Checkpoint before styling fixes"
git branch styling-fixes-backup

# Or just commit current changes
git stash  # If you have uncommitted work
```

---

## Phase 3: Quick Wins (15 minutes)

These fixes are **low-risk** and **high-impact**.

### Fix 1: Standardize Soft Shadows → Mario Shadows

**Problem:** Tailwind soft shadows break the Mario aesthetic.

**Find & Replace (in VS Code):**

Open VS Code and use Find in Files (Ctrl+Shift+F):

```
Find:    \bshadow-sm\b
Replace: shadow-[2px_2px_0_var(--outline-black)]
Files:   components/**/*.tsx, app/**/*.tsx

Find:    \bshadow-md\b
Replace: shadow-[3px_3px_0_var(--outline-black)]

Find:    \bshadow-lg\b
Replace: shadow-[6px_6px_0_var(--outline-black)]

Find:    \bshadow-xl\b
Replace: shadow-[8px_8px_0_var(--outline-black)]
```

**Test after each replacement:**
```bash
npm run dev
# Check the app visually
```

**If something breaks:**
```bash
git diff  # See what changed
git checkout .  # Revert if needed
```

### Fix 2: Consolidate Hover Shadows

**Problem:** Inconsistent hover effects.

**Find & Replace:**

```
Find:    hover:shadow-md
Replace: hover:shadow-[4px_4px_0_var(--outline-black)]

Find:    hover:shadow-lg
Replace: hover:shadow-[8px_8px_0_var(--outline-black)]
```

### Fix 3: Remove Unused Utility Classes

**Audit what's actually used:**

```bash
cd frontend
grep -rh "className=.*mario-" components/ app/ | \
  grep -o 'mario-[a-z-]*' | \
  sort | uniq -c | sort -rn > mario-class-usage.txt
```

**Open `globals.css` and comment out unused classes:**

```css
/* ❌ UNUSED - Commented out 2025-01-XX
.mario-btn-blue {
  background: var(--color-super);
  color: #ffffff;
}
*/
```

---

## Phase 4: Medium Risk Fixes (30 minutes)

### Fix 4: Unify Color References

**Goal:** Use **ONLY CSS variables** for colors.

**Why:** Single source of truth, easier maintenance.

**Strategy:**

1. **Create color mapping file** (for reference):

```typescript
// lib/color-mapping.ts
export const MARIO_COLORS = {
  // CSS Variable → Tailwind class
  'var(--mario-red)': 'bg-mario',
  'var(--luigi-green)': 'bg-luigi',
  'var(--star-yellow)': 'bg-star',
  'var(--coin-gold)': 'bg-coin',
  'var(--sky-blue)': 'bg-sky',
  'var(--pipe-green)': 'bg-pipe',
  'var(--outline-black)': 'bg-outline',
} as const;
```

2. **Choose ONE approach** (I recommend CSS variables):

**Option A: CSS Variables (Recommended)**
```tsx
// ✅ Consistent approach
className="bg-[var(--mario-red)] text-white"
className="border-[var(--outline-black)]"
```

**Option B: Tailwind Classes**
```tsx
// ✅ Also consistent
className="bg-mario text-white"
className="border-outline"
```

3. **Fix ONE component at a time:**

```bash
# Start with a small component
code components/ui/button.tsx

# Make changes, test immediately
npm run dev
```

**Example fix (Button component):**

```tsx
// ❌ Before (mixed approaches)
<button className="bg-mario hover:bg-[var(--mario-red)]" />

// ✅ After (consistent)
<button className="bg-[var(--mario-red)] hover:bg-[var(--mario-red)]/90" />
```

4. **Test and commit after each component:**

```bash
git add components/ui/button.tsx
git commit -m "fix(button): Standardize to CSS variable colors"
```

### Fix 5: Standardize Border Radius

**Problem:** Too many different radius values (14px, 16px, 12px, etc.)

**Solution:** Use semantic tokens only.

**Audit current usage:**

```bash
grep -rh "rounded-\[" components/ app/ | \
  grep -o 'rounded-\[[0-9]*px\]' | \
  sort | uniq -c | sort -rn
```

**Mapping table:**

| Current | Replace With | Size |
|---------|--------------|------|
| `rounded-[8px]` | `rounded-lg` | 8px |
| `rounded-[10px]` | `rounded-lg` | 8px (close enough) |
| `rounded-[12px]` | `rounded-xl` | 12px |
| `rounded-[14px]` | `rounded-xl` | 12px (close enough) |
| `rounded-[16px]` | `rounded-2xl` | 16px |
| `rounded-[20px]` | `rounded-2xl` | 16px (close enough) |

**Find & Replace:**

```
Find:    rounded-\[12px\]
Replace: rounded-xl

Find:    rounded-\[14px\]
Replace: rounded-xl

Find:    rounded-\[16px\]
Replace: rounded-2xl
```

**Test visually** - small differences (12px → 8px) are usually fine.

---

## Phase 5: Surgical Fixes for Specific Issues (Variable time)

Use this phase for **specific visual bugs** you identified in Phase 1.

### Template for Component-Specific Fix

1. **Isolate the component:**
   - Find the file (e.g., `components/trade-panel/TradePanelBuyTab.tsx`)
   - Open in editor

2. **Identify the specific issue:**
   - Wrong shadow? Wrong color? Wrong spacing?

3. **Find the problematic className:**
   ```tsx
   // Example: Button has soft shadow instead of Mario shadow
   <button className="shadow-md hover:shadow-lg" />
   ```

4. **Fix with Mario-themed class:**
   ```tsx
   <button className="shadow-[3px_3px_0_var(--outline-black)] hover:shadow-[4px_4px_0_var(--outline-black)]" />
   ```

5. **Test in isolation (if possible):**
   - Use Storybook (if you have it)
   - Or test in the app directly

6. **Commit immediately:**
   ```bash
   git add components/trade-panel/TradePanelBuyTab.tsx
   git commit -m "fix(trade-panel): Replace soft shadow with Mario shadow on buy button"
   ```

---

## Phase 6: Prevent Future Issues (10 minutes)

### Create Linting Rule

Add to `.eslintrc.json`:

```json
{
  "rules": {
    "no-restricted-syntax": [
      "warn",
      {
        "selector": "Literal[value=/shadow-(sm|md|lg|xl)(?!-\\[)/]",
        "message": "Use Mario block shadows instead of Tailwind soft shadows"
      }
    ]
  }
}
```

### Update Component Guidelines

Add to your `CLAUDE.md`:

```markdown
## Styling Rules - MUST FOLLOW

1. **Shadows:** ONLY use Mario block shadows
   - ✅ `shadow-[3px_3px_0_var(--outline-black)]`
   - ❌ `shadow-md` (soft shadow)

2. **Colors:** Use CSS variables consistently
   - ✅ `bg-[var(--mario-red)]`
   - ⚠️ `bg-mario` (okay, but less flexible)
   - ❌ Mixed usage in same file

3. **Border Radius:** Use semantic tokens
   - ✅ `rounded-lg`, `rounded-xl`, `rounded-2xl`
   - ❌ `rounded-[14px]` (avoid custom values)

4. **Class Merging:** Base classes first, overrides last
   - ✅ `cn(marioStyles.card(), "rounded-xl")`
   - ❌ `cn("rounded-xl", marioStyles.card())` (will be overridden)
```

---

## Troubleshooting Common Issues

### Issue: "I changed the class but nothing happened"

**Possible causes:**

1. **CSS specificity conflict:**
   - Check if a global class is overriding
   - Use browser DevTools → Inspect → See which styles apply

2. **Tailwind not rebuilding:**
   ```bash
   # Kill dev server, clear cache, restart
   rm -rf .next
   npm run dev
   ```

3. **Class in wrong merge order:**
   ```tsx
   // ❌ Wrong order
   cn("bg-white", marioStyles.card()) // bg-white gets overridden

   // ✅ Correct order
   cn(marioStyles.card(), "bg-white") // bg-white overrides
   ```

### Issue: "Colors don't match between CSS var and Tailwind"

**Fix:**

1. Open `tailwind.config.js`
2. Find color definition:
   ```js
   mario: { DEFAULT: "#E52521" }
   ```
3. Open `theme.css`
4. Check CSS variable:
   ```css
   --mario-red: #E52521;
   ```
5. Ensure they match **exactly**

### Issue: "Shadow looks too subtle/strong"

**Adjust shadow size:**

```tsx
// Too subtle
shadow-[2px_2px_0_var(--outline-black)]

// Standard
shadow-[3px_3px_0_var(--outline-black)]

// Strong
shadow-[6px_6px_0_var(--outline-black)]
```

**Adjust hover lift:**

```tsx
// Subtle lift
hover:-translate-y-[1px]

// Standard lift
hover:-translate-y-[2px]

// Strong lift
hover:-translate-y-[4px]
```

---

## Testing Checklist

After each fix, test these pages:

- [ ] Home page loads without errors
- [ ] Trade panel buy/sell buttons work
- [ ] Portfolio cards render correctly
- [ ] Leaderboard shows properly
- [ ] Modal dialogs open correctly
- [ ] Mobile view (if applicable)

**Visual regression test:**
- Take before/after screenshots
- Compare side-by-side
- Ensure intentional changes only

---

## Emergency Rollback

If something breaks badly:

```bash
# Rollback to last commit
git reset --hard HEAD

# Or rollback to backup branch
git checkout styling-fixes-backup

# Or rollback specific file
git checkout HEAD -- components/problematic-file.tsx
```

---

## When to Ask for Help

Ask in chat if:

1. You've identified an issue but don't know which file to edit
2. Changes don't seem to apply (caching issue?)
3. Colors still don't match after fixing
4. You're unsure which approach to take (CSS vars vs Tailwind)

**Provide this info:**

- Screenshot of the issue
- File path of affected component
- What you've tried so far
- Browser DevTools Inspect output (right-click element → Inspect)

---

## Summary: Safe Fix Workflow

```
1. Diagnose → Run diagnostics, take screenshots
2. Backup → Commit or create branch
3. Fix → One small change at a time
4. Test → Visual check after each change
5. Commit → Commit each successful fix
6. Repeat → Go to next issue

If something breaks → Rollback → Try smaller change
```

**Remember:** Small, incremental fixes are safer than big rewrites!
