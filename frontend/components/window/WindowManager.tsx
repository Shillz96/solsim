'use client';

import React, { createContext, useContext, useMemo, useState, useCallback, useEffect } from 'react';

export type WinState = {
  id: string;
  title: string;
  content: React.ReactNode;
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
};

type Ctx = {
  windows: WinState[];
  openWindow: (w: Omit<WinState, 'z'>) => void;
  closeWindow: (id: string) => void;
  bringToFront: (id: string) => void;
  updateBounds: (id: string, p: Partial<Pick<WinState, 'x'|'y'|'width'|'height'>>) => void;
  topZ: number;
};

const WindowCtx = createContext<Ctx | null>(null);

export function useWindowManager() {
  const ctx = useContext(WindowCtx);
  if (!ctx) throw new Error('useWindowManager must be used within <WindowManager>');
  return ctx;
}

const STORAGE_KEY = 'solsim-windows-state';

export default function WindowManager({ children }: { children: React.ReactNode }) {
  const [windows, setWindows] = useState<WinState[]>([]);
  const topZ = useMemo(() => (windows.length ? Math.max(...windows.map(w => w.z)) : 100), [windows]);

  // Load persisted window state on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Don't restore content, just positions
        if (Array.isArray(parsed)) {
          setWindows(prev => 
            parsed.map(w => ({
              ...w,
              content: prev.find(p => p.id === w.id)?.content || null
            }))
          );
        }
      } catch (e) {
        console.error('Failed to restore window state:', e);
      }
    }
  }, []);

  // Persist window positions (not content)
  useEffect(() => {
    if (windows.length > 0) {
      const toStore = windows.map(({ id, title, x, y, width, height, z }) => ({
        id, title, x, y, width, height, z
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [windows]);

  const openWindow = useCallback((w: Omit<WinState, 'z'>) => {
    setWindows(prev => {
      // If already open, bring to front
      const exists = prev.find(p => p.id === w.id);
      if (exists) {
        const newTop = Math.max(...prev.map(p => p.z)) + 1;
        return prev.map(p => p.id === w.id ? { ...p, z: newTop, content: w.content } : p);
      }
      return [...prev, { ...w, z: topZ + 1 }];
    });
  }, [topZ]);

  const closeWindow = useCallback((id: string) => {
    setWindows(prev => prev.filter(w => w.id !== id));
  }, []);

  const bringToFront = useCallback((id: string) => {
    setWindows(prev => {
      const newTop = (prev.length ? Math.max(...prev.map(w => w.z)) : 100) + 1;
      return prev.map(w => w.id === id ? { ...w, z: newTop } : w);
    });
  }, []);

  const updateBounds = useCallback((id: string, p: Partial<Pick<WinState, 'x'|'y'|'width'|'height'>>) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, ...p } : w));
  }, []);

  // Keyboard shortcuts (Esc to close active window)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && windows.length > 0) {
        const topWindow = windows.reduce((max, w) => w.z > max.z ? w : max);
        closeWindow(topWindow.id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [windows, closeWindow]);

  const value = useMemo(() => ({
    windows, openWindow, closeWindow, bringToFront, updateBounds, topZ
  }), [windows, openWindow, closeWindow, bringToFront, updateBounds, topZ]);

  return (
    <WindowCtx.Provider value={value}>
      {children}
    </WindowCtx.Provider>
  );
}
