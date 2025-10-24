'use client';

import React, { createContext, useContext, useMemo, useState, useCallback, useEffect, useRef, useReducer } from 'react';

export type WinState = {
  id: string;
  title: string;
  content: React.ReactNode;
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
  hasUnsavedWork?: boolean; // For confirmation dialogs
};

export type WindowTemplate = {
  id: string;
  title: string;
  content: () => React.ReactNode;
  defaultBounds: { x: number; y: number; width: number; height: number };
  hasUnsavedWork?: boolean;
};

type WindowAction =
  | { type: 'OPEN_WINDOW'; payload: Omit<WinState, 'z'> }
  | { type: 'CLOSE_WINDOW'; payload: { id: string } }
  | { type: 'BRING_TO_FRONT'; payload: { id: string } }
  | { type: 'UPDATE_BOUNDS'; payload: { id: string; bounds: Partial<Pick<WinState, 'x'|'y'|'width'|'height'>> } }
  | { type: 'RESTORE_WINDOWS'; payload: { windows: WinState[] } }
  | { type: 'REGISTER_TEMPLATE'; payload: { template: WindowTemplate } }
  | { type: 'SET_UNSAVED_WORK'; payload: { id: string; hasUnsavedWork: boolean } };

type WindowState = {
  windows: WinState[];
  templates: Map<string, WindowTemplate>;
  isInitialized: boolean;
};

type Ctx = {
  windows: WinState[];
  openWindow: (w: Omit<WinState, 'z'>) => void;
  closeWindow: (id: string) => void;
  bringToFront: (id: string) => void;
  updateBounds: (id: string, p: Partial<Pick<WinState, 'x'|'y'|'width'|'height'>>) => void;
  registerWindowTemplate: (template: WindowTemplate) => void;
  restorePersistedWindows: () => void;
  setWindowUnsavedWork: (id: string, hasUnsavedWork: boolean) => void;
  topZ: number;
  maxWindows: number;
};

const WindowCtx = createContext<Ctx | null>(null);

const MAX_WINDOWS = 10;
const Z_INDEX_LIMIT = 1000;
const DEBOUNCE_DELAY = 500;
const STORAGE_KEY = 'solsim-windows-state';
const OPEN_WINDOWS_KEY = 'solsim-open-windows';

// Safe localStorage wrapper with error handling
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window === 'undefined') return null;
      return localStorage.getItem(key);
    } catch (e) {
      console.warn('localStorage read failed:', e);
      return null;
    }
  },

  setItem: (key: string, value: string): boolean => {
    try {
      if (typeof window === 'undefined') return false;
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded, clearing old data');
        try {
          // Try to clear some space
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(OPEN_WINDOWS_KEY);
          localStorage.setItem(key, value);
          return true;
        } catch {
          console.error('Failed to clear localStorage space');
        }
      } else {
        console.warn('localStorage write failed:', e);
      }
      return false;
    }
  },

  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn('localStorage remove failed:', e);
    }
  }
};

// Viewport-aware position adjustment
const adjustPositionForViewport = (x: number, y: number, width: number, height: number) => {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Ensure window is at least partially visible
  const minVisible = 50; // minimum pixels visible
  let adjustedX = x;
  let adjustedY = y;

  if (x + width < minVisible) adjustedX = minVisible - width;
  if (x > viewportWidth - minVisible) adjustedX = viewportWidth - minVisible;
  if (y + height < minVisible) adjustedY = minVisible - height;
  if (y > viewportHeight - minVisible) adjustedY = viewportHeight - minVisible;

  // Ensure window doesn't go off-screen completely
  adjustedX = Math.max(0, Math.min(adjustedX, viewportWidth - width));
  adjustedY = Math.max(0, Math.min(adjustedY, viewportHeight - height));

  return { x: adjustedX, y: adjustedY };
};

// Debounced localStorage save
const useDebouncedSave = (data: any, delay: number = DEBOUNCE_DELAY) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastDataRef = useRef<any>(null);

  useEffect(() => {
    if (JSON.stringify(data) === JSON.stringify(lastDataRef.current)) return;

    lastDataRef.current = data;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (data.windows && data.windows.length > 0) {
        const toStore = data.windows.map(({ id, title, x, y, width, height, z }: WinState) => ({
          id, title, x, y, width, height, z
        }));
        safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));

        const openWindowIds = data.windows.map((w: WinState) => w.id);
        safeLocalStorage.setItem(OPEN_WINDOWS_KEY, JSON.stringify(openWindowIds));
      } else {
        safeLocalStorage.removeItem(STORAGE_KEY);
        safeLocalStorage.removeItem(OPEN_WINDOWS_KEY);
      }
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, delay]);
};

const windowReducer = (state: WindowState, action: WindowAction): WindowState => {
  switch (action.type) {
    case 'OPEN_WINDOW': {
      const { payload: newWindow } = action;

      // Check window limit
      if (state.windows.length >= MAX_WINDOWS) {
        console.warn(`Maximum window limit (${MAX_WINDOWS}) reached`);
        return state;
      }

      // Check if window already exists
      const existingIndex = state.windows.findIndex(w => w.id === newWindow.id);
      if (existingIndex !== -1) {
        // Bring to front
        const existing = state.windows[existingIndex];
        const maxZ = Math.max(...state.windows.map(w => w.z));
        const newZ = maxZ >= Z_INDEX_LIMIT ? 1 : maxZ + 1;

        const updatedWindows = state.windows.map((w, i) =>
          i === existingIndex ? { ...w, z: newZ, content: newWindow.content } : w
        );

        return { ...state, windows: updatedWindows };
      }

      // Add new window
      const maxZ = state.windows.length ? Math.max(...state.windows.map(w => w.z)) : 100;
      const newZ = maxZ >= Z_INDEX_LIMIT ? 1 : maxZ + 1;

      return {
        ...state,
        windows: [...state.windows, { ...newWindow, z: newZ }]
      };
    }

    case 'CLOSE_WINDOW':
      return {
        ...state,
        windows: state.windows.filter(w => w.id !== action.payload.id)
      };

    case 'BRING_TO_FRONT': {
      const maxZ = state.windows.length ? Math.max(...state.windows.map(w => w.z)) : 100;
      const newZ = maxZ >= Z_INDEX_LIMIT ? 1 : maxZ + 1;

      return {
        ...state,
        windows: state.windows.map(w =>
          w.id === action.payload.id ? { ...w, z: newZ } : w
        )
      };
    }

    case 'UPDATE_BOUNDS':
      return {
        ...state,
        windows: state.windows.map(w =>
          w.id === action.payload.id ? { ...w, ...action.payload.bounds } : w
        )
      };

    case 'RESTORE_WINDOWS':
      return {
        ...state,
        windows: action.payload.windows,
        isInitialized: true
      };

    case 'REGISTER_TEMPLATE':
      return {
        ...state,
        templates: new Map(state.templates).set(action.payload.template.id, action.payload.template)
      };

    case 'SET_UNSAVED_WORK':
      return {
        ...state,
        windows: state.windows.map(w =>
          w.id === action.payload.id ? { ...w, hasUnsavedWork: action.payload.hasUnsavedWork } : w
        )
      };

    default:
      return state;
  }
};

export function useWindowManager() {
  const ctx = useContext(WindowCtx);
  if (!ctx) throw new Error('useWindowManager must be used within <WindowManager>');
  return ctx;
}

export function useWindowTemplate(template: WindowTemplate) {
  const { registerWindowTemplate } = useWindowManager();

  useEffect(() => {
    registerWindowTemplate(template);
  }, [registerWindowTemplate, template]);
}

export default function WindowManager({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(windowReducer, {
    windows: [],
    templates: new Map(),
    isInitialized: false
  });

  const topZ = useMemo(() =>
    state.windows.length ? Math.max(...state.windows.map(w => w.z)) : 100,
    [state.windows]
  );

  // Debounced persistence
  useDebouncedSave(state);

  // Initialize windows once on mount
  useEffect(() => {
    if (state.isInitialized) return;

    const stored = safeLocalStorage.getItem(OPEN_WINDOWS_KEY);
    if (stored) {
      try {
        const openWindowIds: string[] = JSON.parse(stored);
        const windowStates = safeLocalStorage.getItem(STORAGE_KEY);
        let savedBounds: Record<string, Partial<WinState>> = {};

        if (windowStates) {
          const parsed = JSON.parse(windowStates);
          if (Array.isArray(parsed)) {
            savedBounds = parsed.reduce((acc, w) => {
              acc[w.id] = { x: w.x, y: w.y, width: w.width, height: w.height };
              return acc;
            }, {} as Record<string, Partial<WinState>>);
          }
        }

        const restoredWindows: WinState[] = [];

        openWindowIds.forEach(id => {
          const template = state.templates.get(id);
          if (template) {
            const saved = savedBounds[id];
            const defaultBounds = template.defaultBounds;

            // Adjust position for current viewport
            const adjustedBounds = adjustPositionForViewport(
              saved?.x ?? defaultBounds.x,
              saved?.y ?? defaultBounds.y,
              saved?.width ?? defaultBounds.width,
              saved?.height ?? defaultBounds.height
            );

            const maxZ = restoredWindows.length ? Math.max(...restoredWindows.map(w => w.z)) : 100;
            const newZ = maxZ >= Z_INDEX_LIMIT ? 1 : maxZ + 1;

            restoredWindows.push({
              id: template.id,
              title: template.title,
              content: template.content(),
              x: adjustedBounds.x,
              y: adjustedBounds.y,
              width: saved?.width ?? defaultBounds.width,
              height: saved?.height ?? defaultBounds.height,
              z: newZ,
              hasUnsavedWork: template.hasUnsavedWork || false
            });
          }
        });

        if (restoredWindows.length > 0) {
          dispatch({ type: 'RESTORE_WINDOWS', payload: { windows: restoredWindows } });
        } else {
          dispatch({ type: 'RESTORE_WINDOWS', payload: { windows: [] } });
        }
      } catch (e) {
        console.error('Failed to restore open windows:', e);
        dispatch({ type: 'RESTORE_WINDOWS', payload: { windows: [] } });
      }
    } else {
      dispatch({ type: 'RESTORE_WINDOWS', payload: { windows: [] } });
    }
  }, [state.isInitialized, state.templates]);

  const openWindow = useCallback((w: Omit<WinState, 'z'>) => {
    if (state.windows.length >= MAX_WINDOWS) {
      // Could integrate with toast system here
      console.warn(`Cannot open more than ${MAX_WINDOWS} windows`);
      return;
    }
    dispatch({ type: 'OPEN_WINDOW', payload: w });
  }, [state.windows.length]);

  const closeWindow = useCallback((id: string) => {
    dispatch({ type: 'CLOSE_WINDOW', payload: { id } });
  }, []);

  const bringToFront = useCallback((id: string) => {
    dispatch({ type: 'BRING_TO_FRONT', payload: { id } });
  }, []);

  const updateBounds = useCallback((id: string, bounds: Partial<Pick<WinState, 'x'|'y'|'width'|'height'>>) => {
    dispatch({ type: 'UPDATE_BOUNDS', payload: { id, bounds } });
  }, []);

  const registerWindowTemplate = useCallback((template: WindowTemplate) => {
    dispatch({ type: 'REGISTER_TEMPLATE', payload: { template } });
  }, []);

  const restorePersistedWindows = useCallback(() => {
    // This is now handled in useEffect, but kept for API compatibility
  }, []);

  const setWindowUnsavedWork = useCallback((id: string, hasUnsavedWork: boolean) => {
    dispatch({ type: 'SET_UNSAVED_WORK', payload: { id, hasUnsavedWork } });
  }, []);

  // Keyboard shortcuts with confirmation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && state.windows.length > 0) {
        const topWindow = state.windows.reduce((max, w) => w.z > max.z ? w : max);

        if (topWindow.hasUnsavedWork) {
          const confirmed = window.confirm(
            `Close "${topWindow.title}"? You may have unsaved changes.`
          );
          if (!confirmed) return;
        }

        closeWindow(topWindow.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.windows, closeWindow]);

  // Focus management for accessibility
  const lastFocusedElementRef = useRef<Element | null>(null);

  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      if (e.target && !(e.target as Element).closest('[data-window]')) {
        lastFocusedElementRef.current = e.target as Element;
      }
    };

    document.addEventListener('focusin', handleFocus);
    return () => document.removeEventListener('focusin', handleFocus);
  }, []);

  const value = useMemo(() => ({
    windows: state.windows,
    openWindow,
    closeWindow,
    bringToFront,
    updateBounds,
    registerWindowTemplate,
    restorePersistedWindows,
    setWindowUnsavedWork,
    topZ,
    maxWindows: MAX_WINDOWS
  }), [
    state.windows,
    openWindow,
    closeWindow,
    bringToFront,
    updateBounds,
    registerWindowTemplate,
    restorePersistedWindows,
    setWindowUnsavedWork,
    topZ
  ]);

  return (
    <WindowCtx.Provider value={value}>
      {children}
    </WindowCtx.Provider>
  );
}
