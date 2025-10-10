# Additional Debugging Commands

# Clear Next.js cache completely
Remove-Item -Recurse -Force .next
Remove-Item -Recurse -Force node_modules/.cache

# Reinstall dependencies
npm ci

# Restart development server
npm run dev