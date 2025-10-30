# 🌳 Git Workflow Guide - Protecting Production

## Overview
This guide ensures you never accidentally break production deployments by following a proper git branching strategy.

---

## 🔴 Golden Rules

1. **NEVER commit directly to `main`** - main auto-deploys to production
2. **NEVER commit `.env` files** - they contain secrets
3. **ALWAYS test on `dev` branch first** - before merging to main
4. **ALWAYS create feature branches** - for new work
5. **ALWAYS pull before pushing** - avoid merge conflicts

---

## 🌿 Branch Structure

```
main (production)           ← Railway + Vercel auto-deploy
  ↑
  └─ dev (staging)          ← Test here first
      ↑
      ├─ feature/new-thing  ← Your work here
      ├─ fix/bug-name       ← Bug fixes here
      └─ refactor/cleanup   ← Refactoring here
```

### Branch Naming Convention
- `feature/descriptive-name` - New features
- `fix/bug-description` - Bug fixes
- `refactor/what-changed` - Code refactoring
- `chore/task-name` - Maintenance tasks

---

## 🚀 Daily Workflow

### Starting New Work

```bash
# 1. Make sure you're on dev branch
git checkout dev

# 2. Pull latest changes
git pull origin dev

# 3. Create feature branch from dev
git checkout -b feature/your-feature-name

# 4. Start coding!
```

### Making Changes

```bash
# 1. Check what you changed
git status
git diff

# 2. Add files (be selective!)
git add src/components/NewComponent.tsx
git add src/services/newService.ts

# Or add all changes (⚠️ be careful!)
git add .

# 3. Commit with meaningful message
git commit -m "feat: add new trading component"

# 4. Push to your feature branch
git push origin feature/your-feature-name
```

### Commit Message Format

```bash
# Format: <type>: <description>

feat: add new trading component
fix: resolve price update bug
refactor: simplify trade execution logic
chore: update dependencies
docs: improve setup documentation
style: fix Mario theme colors
test: add unit tests for PnL calculations
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `refactor` - Code change that neither fixes bug nor adds feature
- `chore` - Maintenance tasks
- `docs` - Documentation changes
- `style` - Code style changes (formatting, colors)
- `test` - Adding or updating tests
- `perf` - Performance improvements

---

## 🔄 Merging to Dev (Testing)

When your feature is ready for testing:

```bash
# 1. Make sure your feature branch is up to date
git checkout feature/your-feature-name
git pull origin dev  # Pull latest dev changes
git merge dev        # Merge dev into your branch

# 2. Resolve any conflicts if they exist
# (VS Code will show merge conflicts)

# 3. Push your updated branch
git push origin feature/your-feature-name

# 4. Merge to dev branch
git checkout dev
git merge feature/your-feature-name
git push origin dev

# 5. Test on staging deployment
# Railway/Vercel will auto-deploy from dev branch
```

**Alternative: Use Pull Requests (Recommended)**

```bash
# 1. Push your feature branch
git push origin feature/your-feature-name

# 2. Go to GitHub
# 3. Click "Create Pull Request"
# 4. Set base: dev, compare: feature/your-feature-name
# 5. Review changes, add description
# 6. Click "Merge Pull Request"
```

---

## 🚢 Deploying to Production

**⚠️ ONLY do this after testing on dev!**

```bash
# 1. Make sure dev is tested and working
# 2. Switch to main branch
git checkout main

# 3. Pull latest main
git pull origin main

# 4. Merge dev into main
git merge dev

# 5. Push to main (triggers production deployment)
git push origin main

# 6. Monitor deployments
# - Railway: https://railway.app (backend)
# - Vercel: https://vercel.com (frontend)

# 7. If something breaks, rollback immediately!
git revert HEAD
git push origin main
```

---

## 🔧 Common Scenarios

### Scenario 1: Quick Bug Fix

```bash
# 1. Create fix branch from main
git checkout main
git pull origin main
git checkout -b fix/critical-bug

# 2. Fix the bug
# (make your changes)

# 3. Commit and push
git add .
git commit -m "fix: resolve critical trading bug"
git push origin fix/critical-bug

# 4. Merge to dev first (test)
git checkout dev
git merge fix/critical-bug
git push origin dev

# 5. After testing, merge to main
git checkout main
git merge fix/critical-bug
git push origin main
```

### Scenario 2: Merge Conflicts

```bash
# If you get merge conflicts:

# 1. Git will mark conflicted files
git status  # See which files have conflicts

# 2. Open conflicted files in VS Code
# Look for conflict markers:
# <<<<<<< HEAD
# your changes
# =======
# their changes
# >>>>>>> branch-name

# 3. Resolve conflicts (choose which code to keep)

# 4. Mark as resolved
git add resolved-file.ts

# 5. Complete the merge
git commit -m "merge: resolve conflicts from dev"

# 6. Push
git push origin your-branch
```

### Scenario 3: Accidentally Committed to Main

```bash
# ⚠️ If you already committed to main (but haven't pushed):

# 1. Move the commit to a new branch
git branch feature/oops-my-changes
git reset --hard HEAD~1  # Undo last commit on main

# 2. Switch to the new branch
git checkout feature/oops-my-changes

# 3. Push the feature branch
git push origin feature/oops-my-changes

# 4. Follow normal workflow from here
```

### Scenario 4: Need to Undo Last Commit

```bash
# If you haven't pushed yet:
git reset --soft HEAD~1  # Keeps changes, removes commit
# or
git reset --hard HEAD~1  # ⚠️ Discards changes, removes commit

# If you already pushed:
git revert HEAD  # Creates new commit that undoes last one
git push origin your-branch
```

---

## 📋 Pre-Push Checklist

Before pushing to dev or main:

- [ ] Ran `npm run lint:frontend` (no errors)
- [ ] Ran `npm run type-check:frontend` (no errors)
- [ ] Tested locally (backend + frontend work)
- [ ] No `.env` files in commit
- [ ] No `console.log` statements left in code
- [ ] Commit message follows format
- [ ] No merge conflicts

---

## 🔒 Protecting Your Branches

### Set Up Branch Protection (GitHub)

1. Go to GitHub repository settings
2. Click "Branches"
3. Add rule for `main` branch:
   - ✅ Require pull request reviews
   - ✅ Require status checks to pass
   - ✅ Require branches to be up to date
   - ✅ Require conversation resolution
   - ✅ Do not allow bypassing

4. Add rule for `dev` branch:
   - ✅ Require pull request reviews (optional)
   - ✅ Require status checks to pass

This prevents accidental direct pushes to main!

---

## 🐛 Troubleshooting

### "Your branch is behind origin/main"

```bash
# Pull the latest changes
git pull origin main
```

### "Your branch has diverged"

```bash
# This means your local and remote have different commits
# Option 1: Merge (creates merge commit)
git pull origin main

# Option 2: Rebase (cleaner history)
git pull --rebase origin main
```

### "I made changes but forgot to create a branch"

```bash
# If you haven't committed yet:
git stash              # Save your changes
git checkout -b feature/new-branch  # Create branch
git stash pop          # Restore changes

# If you already committed:
git branch feature/new-branch  # Create branch with commits
git reset --hard origin/main   # Reset main
git checkout feature/new-branch
```

### "I pushed to main by accident!"

```bash
# If no one else pulled yet:
git reset --hard HEAD~1  # Undo local commit
git push --force origin main  # ⚠️ Force push (dangerous!)

# If others already pulled (safer):
git revert HEAD  # Create new commit that undoes change
git push origin main
```

---

## 📊 Useful Git Commands

### View History

```bash
# See commit history
git log --oneline --graph --all

# See what changed in last commit
git show

# See changes in specific file
git log -p filename.ts
```

### Cleanup

```bash
# Delete local branch
git branch -d feature/old-branch

# Delete remote branch
git push origin --delete feature/old-branch

# Clean up merged branches
git branch --merged | grep -v "\*" | xargs -n 1 git branch -d
```

### Stashing (Temporary Save)

```bash
# Save current work without committing
git stash

# List stashed changes
git stash list

# Apply most recent stash
git stash pop

# Apply specific stash
git stash apply stash@{0}

# Clear all stashes
git stash clear
```

---

## 🎯 Best Practices

1. **Commit Often** - Small, focused commits are better
2. **Pull Often** - Stay up to date with team changes
3. **Meaningful Messages** - Future you will thank you
4. **Test Before Merge** - Always test on dev first
5. **Review Your Changes** - Use `git diff` before committing
6. **Keep Branches Short-Lived** - Merge within a few days
7. **Delete Old Branches** - Clean up after merging

---

## 🆘 Emergency: Production is Broken!

```bash
# 1. Immediately revert last deployment
git checkout main
git revert HEAD
git push origin main

# 2. Railway/Vercel will auto-deploy the revert

# 3. Investigate issue on dev branch
git checkout dev

# 4. Fix the bug on dev
# (make fixes, test thoroughly)

# 5. Once fixed and tested, merge to main
git checkout main
git merge dev
git push origin main
```

---

## 📚 Additional Resources

- [GitHub Flow Guide](https://guides.github.com/introduction/flow/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Documentation](https://git-scm.com/doc)

---

## ✅ Quick Reference Card

```bash
# Start new feature
git checkout dev && git pull && git checkout -b feature/name

# Save work
git add . && git commit -m "feat: description" && git push

# Merge to dev (testing)
git checkout dev && git merge feature/name && git push

# Deploy to production (after testing!)
git checkout main && git merge dev && git push

# Emergency rollback
git revert HEAD && git push origin main
```

---

**Remember: When in doubt, work on a branch. Never directly on main!** 🎮✨
