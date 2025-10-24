# Floating Window System

A draggable, resizable window system for 1UP SOL using `react-rnd`.

## Features

- ✅ **Drag & Resize**: Windows can be dragged by title bar and resized from all edges
- ✅ **Z-Index Management**: Clicking a window brings it to the front
- ✅ **Snap Grid**: 8px snap for clean positioning
- ✅ **Persistent State**: Window positions saved to localStorage
- ✅ **Keyboard Shortcuts**: Press `Esc` to close the active window
- ✅ **Mario-Themed**: Yellow title bars with bold borders and shadows
- ✅ **Mobile Compatible**: Touch support with `touch-action: none`

## Usage

### 1. Wrap Your App

The `WindowManager` is already added to `/app/layout.tsx`:

```tsx
<WindowManager>
  <YourApp />
  <FloatingWindows />
</WindowManager>
```

### 2. Open a Window

Use the `useWindowManager` hook anywhere in your app:

```tsx
import { useWindowManager } from '@/components/window'

function MyComponent() {
  const { openWindow } = useWindowManager()

  const handleOpenWalletTracker = () => {
    openWindow({
      id: 'wallet-tracker',
      title: '👀 Wallet Tracker',
      content: <WalletTrackerContent />,
      x: 100,
      y: 100,
      width: 900,
      height: 600
    })
  }

  return (
    <button onClick={handleOpenWalletTracker}>
      Open Wallet Tracker
    </button>
  )
}
```

### 3. Window API

```tsx
const {
  windows,           // Array of open windows
  openWindow,        // Open or bring to front
  closeWindow,       // Close by ID
  bringToFront,      // Bring to front by ID
  updateBounds,      // Update position/size
  topZ               // Current highest z-index
} = useWindowManager()
```

## Window Properties

```tsx
type WinState = {
  id: string           // Unique identifier (reuse to bring existing to front)
  title: string        // Title bar text
  content: ReactNode   // Window content
  x: number            // X position (px)
  y: number            // Y position (px)
  width: number        // Width (px, min 320)
  height: number       // Height (px, min 240)
  z: number            // Z-index (managed automatically)
}
```

## Styling

Windows use Mario-themed styling:
- **Title Bar**: Yellow gradient (`from-[#f7d33d] to-[#ffd700]`)
- **Border**: 3px solid black
- **Shadow**: `4px 4px 0 rgba(0,0,0,1)` (bold drop shadow)
- **Close Button**: Red gradient with hover effects
- **Font**: Press Start 2P for title bar

## Keyboard Shortcuts

- `Esc` - Close the topmost (active) window

## Examples

### Open Multiple Windows

```tsx
// Open chart window
openWindow({
  id: 'chart',
  title: '📈 Price Chart',
  content: <LightweightChart />,
  x: 80, y: 80, width: 600, height: 400
})

// Open trade panel
openWindow({
  id: 'trade',
  title: '💰 Trade Panel',
  content: <TradePanel />,
  x: 700, y: 120, width: 400, height: 500
})
```

### Reusing Window IDs

If you call `openWindow()` with the same `id`, it will:
1. Bring the existing window to front (if already open)
2. Update its content
3. Keep its current position/size

This prevents duplicate windows and gives users a consistent experience.

## Implementation Details

### LocalStorage Persistence

Window positions are persisted to localStorage under key `solsim-windows-state`:
- Saved on every position/size change
- Restored on page load
- Content is NOT persisted (only id, title, position, size)

### Mobile Support

- Uses `touch-action: none` for proper touch dragging
- Both `onMouseDown` and `onTouchStart` for activation
- Both `onClick` and `onTouchEnd` for close button

### Bounds

Windows are constrained to `bounds="parent"`, meaning they can't be dragged outside the viewport.

## Files

- `WindowManager.tsx` - Context provider and state management
- `FloatingWindows.tsx` - Renders draggable windows using react-rnd
- `index.ts` - Exports for easy importing

## Future Enhancements

- [ ] Maximize/minimize buttons
- [ ] Double-click title bar to maximize
- [ ] Window tabs/grouping
- [ ] Custom themes per window
- [ ] Window animations (open/close)
