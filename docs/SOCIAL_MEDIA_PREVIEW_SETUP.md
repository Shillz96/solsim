# Social Media Preview Image Implementation

## Overview
This implementation sets up proper Open Graph and Twitter Card meta tags for social media sharing across platforms like iMessage, Telegram, Twitter (X), Facebook, Discord, and others.

## What Was Implemented

### 1. Dynamic Open Graph Image (`app/opengraph-image.tsx`)
- Generates a 1200x630px PNG image using Next.js's `ImageResponse` API
- Uses the banner image: `1up Site banner preview.png`
- Automatically served at `/opengraph-image` route
- Includes fallback text-based image if banner fails to load
- Metadata: alt text, size, content type

### 2. Twitter Card Image (`app/twitter-image.tsx`)
- Generates a 1200x630px PNG image specifically for Twitter
- Uses the same banner image for consistency
- Automatically served at `/twitter-image` route
- Twitter recommends `summary_large_image` card type with this size

### 3. Static Banner Copy (`public/og-banner.png`)
- Created a copy of the banner with a standard name
- Can be referenced directly in metadata
- Serves as a fallback for simpler implementations

### 4. Shared Metadata Configuration (`app/metadata.ts`)
- Centralized metadata configuration
- Includes Open Graph and Twitter Card settings
- Keywords for SEO
- Proper image dimensions and alt text
- Robot indexing rules

### 5. Updated Layout Meta Tags (`app/layout.tsx`)
- Added comprehensive meta tags in the `<head>`:
  - **Open Graph**: type, url, title, description, site_name
  - **Twitter Cards**: card type, url, title, description, creator
- Uses `summary_large_image` card type for maximum visibility

### 6. Enhanced Page Metadata (`app/page.tsx`)
- Updated home page metadata with proper structure
- Includes Twitter and Open Graph specific configurations
- Better descriptions for social sharing

### 7. Environment Variables
- Added `NEXT_PUBLIC_SITE_URL` to environment files:
  - `.env.example`: http://localhost:3000
  - `.env.production`: https://1upsol.fun
  - `.env.vercel.production`: https://1upsol.fun
- **Vercel System Variables**: The code automatically uses `VERCEL_URL` for preview deployments
  - `VERCEL_URL` is automatically provided by Vercel (no manual setup needed)
  - Production uses `NEXT_PUBLIC_SITE_URL` for the custom domain
  - Preview deployments use `https://${VERCEL_URL}` automatically

## How It Works

### Next.js File-based Metadata
Next.js automatically generates proper meta tags when you create these special files:
- `opengraph-image.tsx` → generates `/opengraph-image` route
- `twitter-image.tsx` → generates `/twitter-image` route

These are then automatically referenced in the HTML `<head>`:
```html
<meta property="og:image" content="https://1upsol.fun/opengraph-image" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:image" content="https://1upsol.fun/twitter-image" />
```

### Image Specifications
According to the latest documentation (2025):

**Open Graph (Facebook, LinkedIn, iMessage, Telegram)**:
- Recommended size: 1200x630px
- Aspect ratio: 1.91:1
- Format: PNG, JPEG, or WebP
- Max file size: 8MB (Facebook), 5MB (Twitter)

**Twitter Cards**:
- Card type: `summary_large_image`
- Size: 1200x630px (can be up to 4096x4096px)
- Aspect ratio: 2:1
- Format: PNG, JPEG, WebP, GIF
- Max file size: 5MB

## Testing Social Media Previews

### 1. Twitter Card Validator
Visit: https://cards-dev.twitter.com/validator
- Enter your URL: https://1upsol.fun
- View how the card will appear on Twitter/X

### 2. Facebook Sharing Debugger
Visit: https://developers.facebook.com/tools/debug/
- Enter your URL
- View Open Graph data and preview

### 3. LinkedIn Post Inspector
Visit: https://www.linkedin.com/post-inspector/
- Check how your link appears on LinkedIn

### 4. Open Graph Preview
Visit: https://www.opengraph.xyz/
- Quick preview of Open Graph tags

### 5. iMessage/Telegram
Simply paste your link in a chat to see the rich preview

## Vercel Deployment

After deploying to Vercel, the setup works automatically with Vercel's system:

1. **Environment Variable (Optional but Recommended)**:
   - Go to: https://vercel.com/[your-team]/solsim/settings/environment-variables
   - Add: `NEXT_PUBLIC_SITE_URL` = `https://1upsol.fun`
   - Apply to: Production only
   - **Note**: This ensures production uses your custom domain instead of vercel.app URLs

2. **Automatic Preview Deployments**:
   - Preview deployments automatically use `VERCEL_URL` (no setup needed)
   - Example: `https://solsim-git-feature-team.vercel.app`
   - Open Graph images will use the correct preview URL automatically

3. **System Environment Variables** (Automatic):
   - `VERCEL_URL`: Deployment URL (e.g., `solsim-abc123.vercel.app`)
   - `VERCEL_ENV`: Environment type (`production`, `preview`, `development`)
   - These are automatically provided by Vercel - no manual configuration needed

2. **Clear Cache** (if needed):
   - After deployment, social platforms cache images
   - Use validation tools above to force a refresh
   - For Twitter: use the Card Validator
   - For Facebook: use the Sharing Debugger "Scrape Again" button
   - **Note**: Preview deployments get unique URLs, so cache is not an issue

3. **Test the Preview**:
   - Wait 5-10 minutes after deployment for CDN propagation
   - Share the link on different platforms to verify

## File Structure
```
frontend/
├── app/
│   ├── opengraph-image.tsx       # Open Graph image generator
│   ├── twitter-image.tsx         # Twitter Card image generator
│   ├── metadata.ts               # Shared metadata config
│   ├── layout.tsx                # Updated with meta tags
│   └── page.tsx                  # Updated home page metadata
├── public/
│   ├── 1up Site banner preview.png  # Original banner
│   └── og-banner.png             # Copy for direct reference
├── .env.production               # Added NEXT_PUBLIC_SITE_URL
└── .env.vercel.production        # Added NEXT_PUBLIC_SITE_URL
```

## Meta Tags Reference

### Open Graph Tags (Facebook, LinkedIn, iMessage, Telegram, Discord)
```html
<meta property="og:type" content="website" />
<meta property="og:url" content="https://1upsol.fun/" />
<meta property="og:title" content="1UP SOL - Mario-themed Solana Paper Trading Game" />
<meta property="og:description" content="1UP your Solana trading skills! Mario-themed paper trading game..." />
<meta property="og:site_name" content="1UP SOL" />
<meta property="og:image" content="https://1upsol.fun/opengraph-image" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="1UP SOL - Mario-themed Solana Paper Trading Game" />
```

### Twitter Card Tags
```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:url" content="https://1upsol.fun/" />
<meta name="twitter:title" content="1UP SOL - Mario-themed Solana Paper Trading Game" />
<meta name="twitter:description" content="1UP your Solana trading skills!..." />
<meta name="twitter:creator" content="@1upsolfun" />
<meta name="twitter:image" content="https://1upsol.fun/twitter-image" />
<meta name="twitter:image:alt" content="1UP SOL - Mario-themed Solana Paper Trading Game" />
```

## Troubleshooting

### Preview Not Showing
1. Clear social media cache using validation tools
2. Check that images are publicly accessible
3. Verify environment variables are set in Vercel
4. Check browser console for meta tag rendering
5. Wait 5-10 minutes for CDN propagation

### Image Not Loading
1. Verify banner file exists at `public/1up Site banner preview.png`
2. Check Next.js build logs for image generation errors
3. Test direct image URLs: `/opengraph-image` and `/twitter-image`
4. Ensure file permissions are correct

### Wrong Image Showing
1. Social platforms cache aggressively (7-30 days)
2. Use platform-specific debuggers to force refresh
3. For Twitter: Card Validator with "Preview card" button
4. For Facebook: Sharing Debugger with "Scrape Again" button

## Resources

- [Open Graph Protocol](https://ogp.me/)
- [Twitter Card Documentation](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/markup)
- [Next.js Metadata API](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
- [Next.js Open Graph Images](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image)
- [Vercel OG Image Generation](https://vercel.com/docs/functions/og-image-generation)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables/system-environment-variables)

## Vercel-Specific Features

### Automatic Preview URLs
The implementation automatically uses Vercel's `VERCEL_URL` for preview deployments:
```typescript
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL 
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://1upsol.fun')
```

This means:
- **Production**: Uses `NEXT_PUBLIC_SITE_URL` (1upsol.fun)
- **Preview**: Uses `VERCEL_URL` (e.g., solsim-git-feature.vercel.app)
- **Local**: Falls back to 1upsol.fun

### Why This Matters
1. **Preview Deployments**: Each PR gets unique Open Graph images with correct URLs
2. **No Manual Setup**: `VERCEL_URL` is automatically injected by Vercel
3. **CDN Caching**: Vercel automatically caches generated OG images on their CDN
4. **No Headless Browser**: Uses `@vercel/og` (Satori) - much faster than Puppeteer

### System Environment Variables (Auto-provided)
Vercel automatically provides these (no configuration needed):
- `VERCEL_URL`: Current deployment URL
- `VERCEL_ENV`: `production`, `preview`, or `development`
- `VERCEL_GIT_COMMIT_REF`: Branch name
- `VERCEL_GIT_COMMIT_SHA`: Commit hash

These are used internally by Next.js and `@vercel/og` for proper URL resolution.

## Maintenance

When updating the banner image:
1. Replace `public/1up Site banner preview.png`
2. Update `public/og-banner.png` (or let build regenerate)
3. Deploy to Vercel
4. Clear cache on social platforms using debugger tools
5. Wait 5-10 minutes for full propagation
