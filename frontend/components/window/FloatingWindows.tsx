'use client';

import dynamic from 'next/dynamic';
import { useWindowManager } from './WindowManager';
import { useCallback, useState } from 'react';

// react-rnd exports a named Rnd; dynamic import to avoid SSR issues
const Rnd = dynamic(async () => (await import('react-rnd')).Rnd, { ssr: false });

export default function FloatingWindows() {
  const { windows, bringToFront, updateBounds, closeWindow } = useWindowManager();
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const onActivate = useCallback((id: string) => {
    bringToFront(id);
  }, [bringToFront]);

  return (
    <>
      {windows.map(w => (
        <Rnd
          key={w.id}
          default={{ x: w.x, y: w.y, width: w.width, height: w.height }}
          position={{ x: w.x, y: w.y }}
          size={{ width: w.width, height: w.height }}
          bounds="parent"
          minWidth={320}
          minHeight={240}
          dragGrid={[8, 8]}
          resizeGrid={[8, 8]}
          onDragStart={() => {
            onActivate(w.id);
            setDraggingId(w.id);
          }}
          onResizeStart={() => onActivate(w.id)}
          onDragStop={(_, data) => {
            updateBounds(w.id, { x: data.x, y: data.y });
            setDraggingId(null);
          }}
          onResizeStop={(_, __, ref, ___, pos) => {
            updateBounds(w.id, {
              width: ref.offsetWidth,
              height: ref.offsetHeight,
              x: pos.x,
              y: pos.y
            });
          }}
          enableResizing={{
            top: true, right: true, bottom: true, left: true,
            topRight: true, bottomRight: true, bottomLeft: true, topLeft: true
          }}
          style={{ zIndex: w.z }}
          className="select-none"
        >
          <div
            onMouseDown={() => onActivate(w.id)}
            onTouchStart={() => onActivate(w.id)}
            className={
              draggingId === w.id
                ? "flex flex-col h-full rounded-lg border-[3px] border-black bg-white"
                : "flex flex-col h-full rounded-lg border-[3px] border-black bg-gradient-to-br from-white via-white to-gray-50 shadow-[4px_4px_0_rgba(0,0,0,1)] hover:shadow-[5px_5px_0_rgba(0,0,0,1)] transition-shadow"
            }
            style={{
              touchAction: 'none',
              willChange: 'transform',
              transform: 'translateZ(0)',
              backfaceVisibility: 'hidden'
            }}
          >
            {/* Title bar (drag handle) */}
            <div
              className="
                flex items-center justify-between px-4 py-2.5
                cursor-move rounded-t-md
                bg-gradient-to-r from-[#f7d33d] to-[#ffd700]
                border-b-[3px] border-black
                font-['Press_Start_2P',_monospace]
                select-none
              "
            >
              <span className="text-xs font-bold truncate text-black drop-shadow-sm">
                {w.title}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeWindow(w.id);
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                  closeWindow(w.id);
                }}
                className="
                  h-7 w-7 grid place-items-center rounded-md 
                  border-[3px] border-black 
                  bg-gradient-to-b from-red-500 to-red-600
                  hover:from-red-600 hover:to-red-700
                  active:translate-y-[2px] active:shadow-none
                  transition-all
                  shadow-[2px_2px_0_rgba(0,0,0,1)]
                  text-white font-bold text-lg
                "
                aria-label="Close"
                title="Close"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4 bg-white/90 rounded-b-md">
              {w.content}
            </div>

            {/* Resize handles visual enhancement */}
            <div className="absolute bottom-0 right-0 w-4 h-4 pointer-events-none">
              <div className="absolute bottom-1 right-1 w-2 h-2 bg-black/30 rounded-full" />
            </div>
          </div>
        </Rnd>
      ))}
    </>
  );
}
