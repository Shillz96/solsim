# Emoji Rendering Issue - Research & Fix

## Problem
Emojis selected from the emoji picker are displaying as raw file paths (e.g., `/emojis/3264-peepostonks.png`) instead of rendering as images in the chat.

## Root Cause Analysis

### 1. **Message Flow**
- User clicks emoji in picker → `/emojis/3264-peepostonks.png` inserted into input
- Message sent via WebSocket → Backend receives path
- Backend sanitizes content → Should preserve emoji paths
- Message broadcast to clients → Frontend receives message
- Frontend renders message → `renderMessageContent()` should parse and display

### 2. **Potential Issues Identified**

#### A. HTML Encoding
The emoji path might be getting HTML-encoded somewhere in the pipeline:
- `/emojis/3264-peepostonks.png` could become `&#x2F;emojis&#x2F;3264-peepostonks.png`
- This would prevent the regex from matching

#### B. Regex Matching
The regex pattern `/\/emojis\/[a-zA-Z0-9_-]+\.(png|gif)/g` should match, but:
- Extra whitespace from sanitization might affect matching
- URL encoding could add `%2F` instead of `/`
- HTML entities could break the pattern

#### C. React Rendering Issues
The original `renderMessageContent` function had:
- Inconsistent return types (array vs single span)
- Potential key collision issues
- No error handling for failed image loads

#### D. Next.js Image Component
- Requires proper configuration for local images
- Might need `unoptimized` flag for emoji images
- Could fail silently without error handlers

## Fix Applied

### Updated `renderMessageContent` Function

**Key improvements:**
1. **HTML Entity Decoding** - Decodes any HTML entities before parsing
2. **Better Regex Handling** - Uses `matchAll` for cleaner iteration
3. **Consistent Return Type** - Always returns a React Fragment
4. **Error Handling** - Image `onError` handler to log failures
5. **Unoptimized Images** - Faster loading for small emoji images
6. **Debug Logging** - Console logs when emojis are detected (remove in production)
7. **Unique Keys** - Better key generation to avoid React warnings

### Code Changes

**File:** `frontend/components/chat/chat-message.tsx`

**Before:**
```tsx
function renderMessageContent(content: string) {
  const emojiRegex = /\/emojis\/[a-zA-Z0-9_-]+\.(png|gif)/g
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match
  
  while ((match = emojiRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={`text-${lastIndex}`}>{content.slice(lastIndex, match.index)}</span>)
    }
    parts.push(
      <Image 
        key={`emoji-${match.index}`}
        src={match[0]} 
        alt="emoji" 
        width={20} 
        height={20}
        className="inline-block object-contain mx-0.5 align-middle"
      />
    )
    lastIndex = match.index + match[0].length
  }
  
  if (lastIndex < content.length) {
    parts.push(<span key={`text-${lastIndex}`}>{content.slice(lastIndex)}</span>)
  }
  
  return parts.length > 0 ? parts : <span>{content}</span>
}
```

**After:**
```tsx
function renderMessageContent(content: string) {
  // Decode any HTML entities
  let decodedContent = content
  if (typeof window !== 'undefined') {
    const textarea = document.createElement('textarea')
    textarea.innerHTML = content
    decodedContent = textarea.value
  }
  
  const emojiRegex = /\/emojis\/[a-zA-Z0-9_-]+\.(png|gif)/g
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  
  const matches = Array.from(decodedContent.matchAll(emojiRegex))
  
  // Debug logging
  if (matches.length > 0 && typeof window !== 'undefined') {
    console.log('🎨 Rendering emojis:', matches.map(m => m[0]))
  }
  
  matches.forEach((match, idx) => {
    const matchIndex = match.index!
    
    if (matchIndex > lastIndex) {
      const textBefore = decodedContent.slice(lastIndex, matchIndex)
      if (textBefore) {
        parts.push(<span key={`text-${lastIndex}-${idx}`}>{textBefore}</span>)
      }
    }
    
    const emojiPath = match[0]
    parts.push(
      <Image 
        key={`emoji-${matchIndex}-${idx}`}
        src={emojiPath}
        alt="emoji" 
        width={20} 
        height={20}
        className="inline-block object-contain mx-0.5 align-middle"
        unoptimized
        onError={(e) => {
          console.error('Failed to load emoji:', emojiPath)
          e.currentTarget.style.display = 'none'
        }}
      />
    )
    
    lastIndex = matchIndex + match[0].length
  })
  
  if (lastIndex < decodedContent.length) {
    const textAfter = decodedContent.slice(lastIndex)
    if (textAfter) {
      parts.push(<span key={`text-end-${lastIndex}`}>{textAfter}</span>)
    }
  }
  
  return <>{parts.length > 0 ? parts : decodedContent}</>
}
```

## Testing Steps

### 1. Check Console Logs
After the fix, when you send an emoji:
- Open browser DevTools console
- Send a message with an emoji
- Look for: `🎨 Rendering emojis: ['/emojis/3264-peepostonks.png']`
- Check for any error messages about failed image loads

### 2. Test Scenarios
- ✅ Single emoji message: `/emojis/3264-peepostonks.png`
- ✅ Emoji with text: `Hello /emojis/3264-peepostonks.png world`
- ✅ Multiple emojis: `/emojis/1425-bitcoin.png /emojis/3264-peepostonks.png`
- ✅ Mixed content: `Trading /emojis/1425-bitcoin.png to the moon! /emojis/37710-stonks.png`

### 3. Debug if Still Not Working

If emojis still show as text, check console for:

**A. No emoji detection logs?**
- Content might be encoded differently
- Add: `console.log('Raw content:', content)` at start of function
- Check what the actual content string looks like

**B. Image load errors?**
- Image files might not be accessible
- Check network tab for 404 errors
- Verify files exist in `/public/emojis/`

**C. Nothing renders at all?**
- React rendering error
- Check React DevTools for component errors
- Look for key warnings in console

## Additional Recommendations

### 1. Backend Sanitization Review
Check if `backend/src/utils/chatSanitizer.ts` is modifying content:
```typescript
// Ensure this doesn't encode emoji paths
export function sanitizeChatMessage(content: string): string {
  // ... should preserve /emojis/ paths
}
```

### 2. WebSocket Message Encoding
Verify WebSocket isn't encoding the content:
```typescript
// In useChatWebSocket.ts
const message = { type: 'send_message', roomId, content };
// Content should be sent as-is, not encoded
```

### 3. Database Storage
Check if Prisma/PostgreSQL is storing the content correctly:
```sql
-- Query a message with emoji
SELECT content FROM "ChatMessage" WHERE content LIKE '%emojis%' LIMIT 1;
-- Should show: /emojis/3264-peepostonks.png (not encoded)
```

## Alternative Solutions

### If HTML Decoding Doesn't Work

Try URL decoding:
```tsx
// Replace HTML decode with URL decode
let decodedContent = decodeURIComponent(content)
```

### If Images Still Don't Load

Use regular `<img>` instead of Next.js `Image`:
```tsx
<img 
  key={`emoji-${matchIndex}-${idx}`}
  src={emojiPath}
  alt="emoji" 
  width="20"
  height="20"
  className="inline-block object-contain mx-0.5 align-middle"
  onError={(e) => {
    console.error('Failed to load emoji:', emojiPath)
    e.currentTarget.style.display = 'none'
  }}
/>
```

### If Regex Isn't Matching

More permissive regex:
```tsx
// Allow any characters in filename
const emojiRegex = /\/emojis\/[^\/\s]+\.(png|gif)/g
```

## Next Steps

1. **Test the fix** - Send an emoji in chat and check console
2. **Review logs** - Look for the debug messages
3. **Verify rendering** - Emoji should appear as image, not text
4. **Remove debug logs** - Once confirmed working, remove console.logs
5. **Test edge cases** - Try different emojis, mixed content, etc.

## Files Modified
- ✅ `frontend/components/chat/chat-message.tsx` - Updated `renderMessageContent` function

## Files to Check (if issue persists)
- `backend/src/utils/chatSanitizer.ts` - Ensure no encoding
- `backend/src/services/chatService.ts` - Verify content preservation
- `frontend/hooks/useChatWebSocket.ts` - Check message sending
- `frontend/lib/contexts/ChatContext.tsx` - Verify message handling
