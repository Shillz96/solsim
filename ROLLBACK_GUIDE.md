# Rollback Guide - 2025 Modernization

> **Emergency rollback procedures for the 2025 modernization updates**

## 🚨 Quick Rollback (If Something Goes Wrong)

If you encounter critical issues and need to immediately revert all changes:

```bash
# Option 1: Reset to backup branch (destroys all modernization work)
git checkout main
git reset --hard origin/pre-modernization-2025-backup
git push --force origin main

# Option 2: Keep work but restore old state (safe)
git checkout pre-modernization-2025-backup
git checkout -b main-restored
```

---

## 📋 Backup Information

**Backup Branch:** `pre-modernization-2025-backup`
**Working Branch:** `modernization-2025`
**Created:** $(date)
**Backup Location:** GitHub remote + local

### What's Backed Up

- ✅ Complete codebase state before modernization
- ✅ All frontend files (Tailwind config, CSS, components)
- ✅ Documentation files
- ✅ Configuration files (Next.js, TypeScript, etc.)

---

## 🔄 Rollback Scenarios

### Scenario 1: "I need to undo everything immediately"

**When to use:** Critical production bug, nothing works

```bash
# 1. Checkout backup branch
git checkout pre-modernization-2025-backup

# 2. Create new main branch from backup
git branch -D main
git checkout -b main

# 3. Force push to restore production
git push --force origin main

# 4. Redeploy
cd frontend && npm run build
```

**Time estimate:** 5 minutes
**Risk level:** ⚠️ High (destroys modernization work)
**Recovery:** Modernization work is lost, start over from backup

---

### Scenario 2: "I want to test both versions"

**When to use:** Want to compare old vs new side-by-side

```bash
# Keep modernization branch
git checkout modernization-2025

# Deploy old version to staging
git checkout pre-modernization-2025-backup
npm run deploy:staging

# Deploy new version to different environment
git checkout modernization-2025
npm run deploy:preview
```

**Time estimate:** 10 minutes
**Risk level:** ✅ Safe (nothing is destroyed)

---

### Scenario 3: "One feature broke, keep the rest"

**When to use:** Most changes work, but one specific update causes issues

```bash
# 1. Identify the problematic file(s)
git log --oneline modernization-2025

# 2. Revert specific commit(s)
git revert <commit-hash>

# 3. Or restore individual file from backup
git checkout pre-modernization-2025-backup -- path/to/file.tsx

# 4. Test and commit
npm run build
git add .
git commit -m "fix: revert problematic changes"
```

**Time estimate:** 15 minutes
**Risk level:** ✅ Safe (surgical fix)

---

### Scenario 4: "Colors look wrong on some displays"

**When to use:** Display-P3 colors aren't working as expected

```bash
# Revert just the color system changes
git checkout pre-modernization-2025-backup -- frontend/app/globals.css
git checkout pre-modernization-2025-backup -- frontend/tailwind.config.js

# Test
cd frontend && npm run dev

# Commit if satisfied
git add frontend/app/globals.css frontend/tailwind.config.js
git commit -m "revert: restore original color system"
```

**Time estimate:** 5 minutes
**Risk level:** ✅ Safe
**What you keep:** View Transitions, Popover API, scroll animations

---

### Scenario 5: "View Transitions cause navigation issues"

**When to use:** Page transitions break navigation or cause errors

```bash
# Disable View Transitions in Next.js config
# Edit frontend/next.config.mjs and remove:
#   experimental: { viewTransition: true }

# Or revert entire config
git checkout pre-modernization-2025-backup -- frontend/next.config.mjs

# Rebuild
cd frontend && npm run build
```

**Time estimate:** 2 minutes
**Risk level:** ✅ Safe
**What you keep:** Everything else (colors, Tailwind v4, etc.)

---

### Scenario 6: "Bundle size increased too much"

**When to use:** App feels slower, bundle analysis shows issues

```bash
# Analyze current bundle
cd frontend
npm run analyze

# Compare with backup
git stash
git checkout pre-modernization-2025-backup
npm run analyze
git checkout modernization-2025
git stash pop

# Identify large chunks and revert specific imports
# Edit files to restore old import patterns
```

**Time estimate:** 20 minutes
**Risk level:** ⚠️ Medium (requires investigation)

---

## 🧪 Gradual Rollback Strategy

If you want to roll back incrementally:

### Step 1: Identify What's Broken
```bash
# Check browser console
# Check Next.js build errors
# Check Lighthouse scores
# Check user reports
```

### Step 2: Isolate the Problem
```bash
# Test each modernization feature individually
# Disable View Transitions → test
# Revert color system → test
# Restore old Tailwind config → test
```

### Step 3: Surgical Revert
```bash
# Only revert the specific problematic change
git diff pre-modernization-2025-backup..modernization-2025 -- path/to/file
git checkout pre-modernization-2025-backup -- path/to/file
```

### Step 4: Test & Iterate
```bash
npm run build
npm run test
# Manual testing
```

---

## 📝 File-Specific Rollback Commands

### Tailwind Configuration
```bash
git checkout pre-modernization-2025-backup -- frontend/tailwind.config.js
```

### Global CSS
```bash
git checkout pre-modernization-2025-backup -- frontend/app/globals.css
```

### Next.js Config
```bash
git checkout pre-modernization-2025-backup -- frontend/next.config.mjs
```

### Specific Component
```bash
git checkout pre-modernization-2025-backup -- frontend/components/path/to/component.tsx
```

### All Frontend Files
```bash
git checkout pre-modernization-2025-backup -- frontend/
```

---

## 🔍 Verification After Rollback

After any rollback, verify:

```bash
# 1. Build succeeds
cd frontend
npm run build

# 2. No TypeScript errors
npm run type-check

# 3. Tests pass
npm test

# 4. Lighthouse scores acceptable
npm run build && npm start
# Run Lighthouse manually

# 5. Visual check
npm run dev
# Open http://localhost:3000
# Check all pages manually
```

---

## 🛡️ Prevention (For Next Time)

**What we learned:**

1. ✅ **Always create backup branch** (we did this!)
2. ✅ **Test incrementally** (roll out one feature at a time)
3. ✅ **Document each change** (commit messages)
4. ✅ **Use feature flags** (enable/disable without code changes)
5. ✅ **Measure before/after** (Lighthouse, bundle size)

**For future modernizations:**

```bash
# Use feature flags for new features
const USE_VIEW_TRANSITIONS = process.env.NEXT_PUBLIC_FEATURE_VIEW_TRANSITIONS === 'true'

// Conditional enablement
if (USE_VIEW_TRANSITIONS && 'startViewTransition' in document) {
  // Use View Transitions
} else {
  // Fallback
}
```

---

## 🆘 Emergency Contacts

If rollback doesn't solve the issue:

1. **Check GitHub Issues** - Someone may have seen this before
2. **Check Vercel/Railway logs** - Deployment errors
3. **Check browser console** - Client-side errors
4. **Post in team chat** - Get help from teammates

---

## 📊 Rollback Decision Matrix

| Symptom | Likely Cause | Rollback Action | Time |
|---------|--------------|-----------------|------|
| Pages won't load | Build error | Full rollback | 5 min |
| Colors look off | P3 color issue | Revert globals.css | 5 min |
| Navigation broken | View Transitions | Disable in next.config | 2 min |
| Slow performance | Bundle size | Analyze & selective revert | 20 min |
| Popover broken | Native API issue | Revert specific component | 10 min |
| Layout shifted | CSS changes | Revert globals.css | 5 min |
| TypeScript errors | Config issue | Revert tsconfig/tailwind | 5 min |

---

## ✅ Pre-Rollback Checklist

Before rolling back, answer these:

- [ ] Did I backup my current work? (`git stash` or branch)
- [ ] Did I identify the specific problem?
- [ ] Did I check browser console for errors?
- [ ] Did I review recent commits? (`git log`)
- [ ] Do I know which file(s) to revert?
- [ ] Is production currently broken? (Priority)
- [ ] Can I test after rollback?

---

## 🎯 Success Criteria

Rollback is successful when:

- ✅ App builds without errors
- ✅ All pages load correctly
- ✅ No console errors
- ✅ Lighthouse scores restored
- ✅ User experience back to normal
- ✅ Tests pass

---

## 📚 Additional Resources

- [Git Reset Documentation](https://git-scm.com/docs/git-reset)
- [Git Revert Documentation](https://git-scm.com/docs/git-revert)
- [GitHub Backup Best Practices](https://docs.github.com/en/repositories)

---

**Remember:** The backup branch `pre-modernization-2025-backup` will remain available on GitHub indefinitely. You can always reference it or restore from it at any time.

**Stay calm, test thoroughly, and rollback confidently!** 🚀
