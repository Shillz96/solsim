# Quick Configuration Reference

## 🚀 Environment Variables Cheat Sheet

### ✅ DO's
```bash
# Server-only variables (never exposed to browser)
DATABASE_URL=postgresql://...
API_SECRET=your-secret-key

# Client variables (embedded in bundle)
NEXT_PUBLIC_API_URL=https://api.example.com
NEXT_PUBLIC_WS_URL=wss://ws.example.com
```

### ❌ DON'Ts
```bash
# NEVER put secrets in NEXT_PUBLIC_ variables
NEXT_PUBLIC_SECRET_KEY=sk_live_... # ❌ Exposed to browser!

# NEVER use dynamic variable names
const key = 'NEXT_PUBLIC_API'; process.env[key] # ❌ Won't work!

# NEVER destructure process.env
const { NEXT_PUBLIC_URL } = process.env # ❌ Won't work!
```

### ✅ Correct Usage in Code
```typescript
// ✅ Direct access only
const apiUrl = process.env.NEXT_PUBLIC_API_URL

// ❌ These don't work
const key = 'NEXT_PUBLIC_API_URL'
const apiUrl = process.env[key] // Fails at runtime
```

---

## 🖼️ Image Domains - Allowed List

Only these domains are allowed for `next/image`:

```javascript
// ✅ Allowed
pump.fun
*.pump.fun (all subdomains)
raw.githubusercontent.com/solana-labs/**
ipfs.io/ipfs/**
cloudflare-ipfs.com/ipfs/**
localhost (dev only)

// ❌ Not Allowed
Any other domain will fail with 400 error
```

### Adding New Domains
```javascript
// In next.config.mjs → images.remotePatterns
{
  protocol: 'https',
  hostname: 'your-cdn.com',
  pathname: '/images/**', // Optional: restrict to path
}
```

---

## ⚛️ React Strict Mode - Enabled

Strict mode is now **enabled** for better development checks.

### If WebSocket Issues Occur:
```typescript
// ✅ Use useRef to prevent double-mounting
const wsRef = useRef<WebSocket | null>(null);

useEffect(() => {
  if (wsRef.current) return; // Already connected
  
  wsRef.current = new WebSocket(url);
  
  return () => {
    wsRef.current?.close();
    wsRef.current = null;
  };
}, []);
```

---

## 🔧 Build Commands

```bash
# Type checking
npm run type-check

# Linting (now required for builds)
npm run lint

# Fix auto-fixable issues
npm run lint -- --fix

# Full production build
npm run build

# Development
npm run dev
```

---

## 🐛 Common Issues & Fixes

### Issue: Image 400 Error
**Cause:** Domain not in `remotePatterns`  
**Fix:** Add domain to `next.config.mjs` → `images.remotePatterns`

### Issue: Environment variable is `undefined`
**Cause:** Missing `NEXT_PUBLIC_` prefix for client-side variables  
**Fix:** Rename `API_URL` → `NEXT_PUBLIC_API_URL`

### Issue: ESLint errors during build
**Cause:** `eslint.ignoreDuringBuilds` now `false`  
**Fix:** Run `npm run lint -- --fix` and fix remaining issues

### Issue: WebSocket connects twice
**Cause:** React Strict Mode (intentional in dev)  
**Fix:** Use `useRef` pattern above (only needed if causing actual problems)

---

## 📦 Package Optimizations

These packages are optimized for tree-shaking:
- `lucide-react`
- `date-fns`
- `recharts`
- `framer-motion`
- `@radix-ui/react-icons`
- `@solana/web3.js`
- `@solana/wallet-adapter-react`

Import only what you need:
```typescript
// ✅ Good - tree-shakeable
import { Wallet } from 'lucide-react'

// ❌ Bad - imports everything
import * as Icons from 'lucide-react'
```

---

## 🔒 Security Checklist

- [x] No secrets in `NEXT_PUBLIC_` variables
- [x] Image domains explicitly whitelisted
- [x] ESLint enabled in production builds
- [x] TypeScript strict mode enabled
- [x] React Strict Mode enabled
- [x] CSP headers for images configured
- [x] Image qualities array defined
- [x] Maximum redirects limited to 3

---

## 📊 Performance Tips

1. **Use `next/image`** instead of `<img>` tags
2. **Import only what you need** from large packages
3. **Use `NEXT_PUBLIC_` only when necessary** (smaller bundles)
4. **Lazy load components** with `next/dynamic`
5. **Keep SVG tokens small** or use PNG/WebP versions

---

## 🆘 Need Help?

- Check `docs/CONFIG_IMPROVEMENTS_2025.md` for detailed explanations
- Check `docs/ENVIRONMENT_VARIABLES.md` for env var documentation
- Check Next.js docs: https://nextjs.org/docs

---

**Quick Reference Version:** 1.0  
**Last Updated:** October 26, 2025  
**Print this:** Keep it handy during development!
