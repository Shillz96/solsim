import { useEffect, useRef } from 'react'

interface Options {
  enabled?: boolean
  root?: Element | null
  rootMargin?: string
  threshold?: number | number[]
}

export function useIntersectionObserver(
  ref: React.RefObject<Element | null>,
  callback: () => void,
  options: Options = {}
) {
  const {
    enabled = true,
    root = null,
    rootMargin = '0px',
    threshold = 0
  } = options

  const callbackRef = useRef(callback)

  useEffect(() => {
    callbackRef.current = callback
  })

  useEffect(() => {
    if (!enabled || !ref.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            callbackRef.current()
          }
        })
      },
      {
        root,
        rootMargin,
        threshold
      }
    )

    const element = ref.current
    observer.observe(element)

    return () => {
      observer.unobserve(element)
    }
  }, [enabled, ref, root, rootMargin, threshold])
}