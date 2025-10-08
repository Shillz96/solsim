import { useEffect, RefObject } from 'react'

/**
 * Custom hook for detecting clicks outside a referenced element
 * Useful for closing dropdowns, modals, and popovers
 * 
 * @param ref - Reference to the element to detect outside clicks from
 * @param handler - Callback function to execute when outside click is detected
 * @param enabled - Whether the hook should be active (default: true)
 * 
 * @example
 * ```tsx
 * const dropdownRef = useRef<HTMLDivElement>(null)
 * useClickOutside(dropdownRef, () => setIsOpen(false), isOpen)
 * 
 * return <div ref={dropdownRef}>...</div>
 * ```
 */
export function useClickOutside<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T | null>,
  handler: (event: MouseEvent) => void,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return

    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        handler(event)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [ref, handler, enabled])
}
