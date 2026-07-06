'use client'

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

type Direction = 'up' | 'down' | 'left' | 'right' | 'scale'

/**
 * Premium scroll-reveal wrapper. Fades + slides content in as it enters the
 * viewport, using a soft "expo-out" easing for a high-end feel. Respects
 * prefers-reduced-motion (shows instantly). One-shot (won't re-hide on scroll).
 */
export function Reveal({
  children,
  delay = 0,
  distance = 26,
  direction = 'up',
  className,
}: {
  children: ReactNode
  delay?: number
  distance?: number
  direction?: Direction
  className?: string
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      setShown(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true)
            io.disconnect()
            break
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const hidden =
    direction === 'up' ? `translate3d(0, ${distance}px, 0)` :
    direction === 'down' ? `translate3d(0, -${distance}px, 0)` :
    direction === 'left' ? `translate3d(${distance}px, 0, 0)` :
    direction === 'right' ? `translate3d(-${distance}px, 0, 0)` :
    'scale(0.96)'

  const style: CSSProperties = {
    opacity: shown ? 1 : 0,
    transform: shown ? 'none' : hidden,
    transition: `opacity 800ms cubic-bezier(.16,1,.3,1) ${delay}ms, transform 800ms cubic-bezier(.16,1,.3,1) ${delay}ms`,
    willChange: 'opacity, transform',
  }

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  )
}
