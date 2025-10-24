'use client';

import dynamic from 'next/dynamic';
import { useWindowManager } from './WindowManager';
import type { WinState } from './WindowManager';
import { useCallback, useState, Component, ReactNode, useEffect } from 'react';

// react-rnd exports a named Rnd; dynamic import to avoid SSR issues
const Rnd = dynamic(async () => {
  try {
    const module = await import('react-rnd');
    return module.Rnd;
  } catch (error) {
    console.error('Failed to load react-rnd:', error);
    // Return a no-op component
    return ({ children }: any) => <div className="select-none">{children}</div>;
  }
}, {
  ssr: false,
  loading: ({ children }: any) => <div className="select-none">{children}</div> // Fallback during loading
});

class FloatingWindowsErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('FloatingWindows error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-red-100 border-4 border-red-500 rounded-lg m-4 p-4 z-50">
          <h3 className="font-['Press_Start_2P',_monospace] text-red-800 text-sm mb-2">
            Window System Error
          </h3>
          <p className="text-red-700 text-xs mb-4">
            The floating window system encountered an error and couldn't load.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-3 py-1 bg-red-600 text-white rounded border-2 border-red-700 text-xs"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function FloatingWindows() {
  const { windows, bringToFront, updateBounds, closeWindow } = useWindowManager();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  // Update viewport size
  useEffect(() => {
    const updateViewport = () => {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  // Keyboard controls for focused window
  // Constrain position to viewport with snap-to-edge behavior
  const constrainPosition = useCallback((x: number, y: number, width: number, height: number) => {
    const margin = 20; // Minimum distance from edge
    const snapThreshold = 30; // Distance for magnetic snap

    let constrainedX = Math.max(margin, Math.min(x, viewportSize.width - width - margin));
    let constrainedY = Math.max(margin, Math.min(y, viewportSize.height - height - margin));

    // Magnetic snap to edges
    if (Math.abs(constrainedX - margin) < snapThreshold) constrainedX = margin;
    if (Math.abs(constrainedX - (viewportSize.width - width - margin)) < snapThreshold) {
      constrainedX = viewportSize.width - width - margin;
    }
    if (Math.abs(constrainedY - margin) < snapThreshold) constrainedY = margin;
    if (Math.abs(constrainedY - (viewportSize.height - height - margin)) < snapThreshold) {
      constrainedY = viewportSize.height - height - margin;
    }

    return { x: constrainedX, y: constrainedY };
  }, [viewportSize]);

  // Constrain dimensions to viewport
  const constrainDimensions = useCallback((width: number, height: number) => {
    const maxWidth = viewportSize.width - 40; // Account for margins
    const maxHeight = viewportSize.height - 40;

    return {
      width: Math.min(width, maxWidth),
      height: Math.min(height, maxHeight)
    };
  }, [viewportSize]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (focusedId) {
          closeWindow(focusedId);
        }
        return;
      }

      if (!focusedId) return;

      const window = windows.find(w => w.id === focusedId);
      if (!window) return;

      const step = e.shiftKey ? 50 : 10; // Larger steps with Shift

      let newBounds = { ...window };

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          newBounds.y = Math.max(0, window.y - step);
          break;
        case 'ArrowDown':
          e.preventDefault();
          newBounds.y = window.y + step;
          break;
        case 'ArrowLeft':
          e.preventDefault();
          newBounds.x = Math.max(0, window.x - step);
          break;
        case 'ArrowRight':
          e.preventDefault();
          newBounds.x = window.x + step;
          break;
      }

      if (newBounds !== window) {
        const constrained = constrainPosition(newBounds.x, newBounds.y, newBounds.width, newBounds.height);
        const constrainedDims = constrainDimensions(newBounds.width, newBounds.height);
        updateBounds(focusedId, {
          x: constrained.x,
          y: constrained.y,
          width: constrainedDims.width,
          height: constrainedDims.height
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedId, windows, viewportSize, bringToFront, closeWindow, updateBounds, constrainPosition, constrainDimensions]);

  const onActivate = useCallback((id: string) => {
    bringToFront(id);
  }, [bringToFront]);

  // Check if window can be resized (not at min dimensions)
  const canResize = useCallback((w: WinState) => {
    const minW = Math.min(320, viewportSize.width - 40);
    const minH = Math.min(240, viewportSize.height - 40);
    return w.width > minW || w.height > minH;
  }, [viewportSize]);

  return (
    <FloatingWindowsErrorBoundary>
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 100 }}>
        {windows.map(w => (
          <Rnd
            key={w.id}
            default={{ x: w.x, y: w.y, width: w.width, height: w.height }}
            position={{ x: w.x, y: w.y }}
            size={{ width: w.width, height: w.height }}
            bounds="parent"
            minWidth={Math.min(320, viewportSize.width - 40)}
            minHeight={Math.min(240, viewportSize.height - 40)}
            dragGrid={[8, 8]}
            resizeGrid={[8, 8]}
            dragHandleClassName="window-drag-handle"
            onDragStart={() => {
              onActivate(w.id);
              setDraggingId(w.id);
            }}
            onResizeStart={() => onActivate(w.id)}
            onDragStop={(_, data) => {
              const constrained = constrainPosition(data.x, data.y, w.width, w.height);
              updateBounds(w.id, constrained);
              setDraggingId(null);
            }}
            onResizeStop={(_, __, ref, ___, pos) => {
              const constrainedPos = constrainPosition(pos.x, pos.y, ref.offsetWidth, ref.offsetHeight);
              const constrainedDims = constrainDimensions(ref.offsetWidth, ref.offsetHeight);
              updateBounds(w.id, {
                width: constrainedDims.width,
                height: constrainedDims.height,
                x: constrainedPos.x,
                y: constrainedPos.y
              });
            }}
            enableResizing={canResize(w) ? {
              top: true, right: true, bottom: true, left: true,
              topRight: true, bottomRight: true, bottomLeft: true, topLeft: true
            } : false}
            style={{ zIndex: w.z }}
            className="pointer-events-auto"
            disableDragging={false}
          >
          <div
            tabIndex={0}
            onMouseDown={() => onActivate(w.id)}
            onFocus={() => setFocusedId(w.id)}
            onBlur={() => setFocusedId(null)}
            className={
              draggingId === w.id
                ? "flex flex-col h-full rounded-lg border-[3px] border-black bg-gradient-to-br from-white via-white to-gray-50 opacity-90 scale-[0.98] focus:outline-none focus:ring-4 focus:ring-blue-500"
                : focusedId === w.id
                ? "flex flex-col h-full rounded-lg border-[3px] border-blue-500 bg-gradient-to-br from-white via-white to-gray-50 shadow-[4px_4px_0_rgba(0,0,0,1)] focus:outline-none focus:ring-4 focus:ring-blue-500"
                : "flex flex-col h-full rounded-lg border-[3px] border-black bg-gradient-to-br from-white via-white to-gray-50 shadow-[4px_4px_0_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-transform focus:outline-none focus:ring-4 focus:ring-blue-500"
            }
            style={{
              willChange: 'transform',
              transform: 'translateZ(0)',
              backfaceVisibility: 'hidden'
            }}
          >
            {/* Title bar (drag handle) */}
            <div
              className="
                window-drag-handle
                flex items-center justify-between px-4 py-2.5
                cursor-move rounded-t-md
                bg-gradient-to-r from-[#f7d33d] to-[#ffd700]
                border-b-[3px] border-black
                font-['Press_Start_2P',_monospace]
                select-none
              "
              role="banner"
              aria-label={`${w.title} window header`}
            >
              <span className="text-xs font-bold truncate text-black drop-shadow-sm pointer-events-none">
                {w.title}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeWindow(w.id);
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                }}
                className="
                  h-11 w-11 grid place-items-center rounded-md
                  border-[3px] border-black
                  bg-gradient-to-b from-red-500 to-red-600
                  hover:from-red-600 hover:to-red-700
                  active:translate-y-[2px] active:shadow-none
                  transition-all
                  shadow-[2px_2px_0_rgba(0,0,0,1)]
                  text-white font-bold text-lg
                  pointer-events-auto
                  z-10
                "
                aria-label={`Close ${w.title}`}
                title={`Close ${w.title}`}
                type="button"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 overflow-hidden bg-white/90 rounded-b-md pointer-events-auto">
              {w.content}
            </div>

            {/* Resize handles visual enhancement - only show when resizable */}
            {canResize(w) && (
              <div
                className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize pointer-events-none z-20"
                title="Resize window"
              >
                <div className="absolute bottom-1 right-1 w-4 h-4 bg-black/60 rounded-sm border border-white/50" />
              </div>
            )}
          </div>
        </Rnd>
      ))}
      </div>
    </FloatingWindowsErrorBoundary>
  );
}
