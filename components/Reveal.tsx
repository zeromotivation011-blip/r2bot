'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

type Direction = 'up' | 'down' | 'left' | 'right' | 'scale'

/**
 * Fade-in-on-scroll that is visible by default.
 *
 * The previous version rendered `opacity: 0` into the server HTML and relied
 * on an IntersectionObserver to show the content. Six homepage sections were
 * therefore invisible to anyone without JavaScript, to slow connections until
 * hydration, to reduced-motion users for 1.2 s, and to any crawler that does
 * not run scripts. Now the markup is visible as served; a tiny inline script in
 * the root layout adds `html.js` before first paint, and only then does the
 * stylesheet hide `.r2-reveal` until it is marked `is-shown`. No JS → no hide.
 * `prefers-reduced-motion` is handled in CSS, so there is no flash either way.
 */
export function Reveal({
  children,
  delay = 0,
  distance = 16,
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
      { threshold: 0.01, rootMargin: '0px 0px 15% 0px' },
    )
    io.observe(el)
    const failsafe = window.setTimeout(() => setShown(true), 1200)
    return () => { io.disconnect(); window.clearTimeout(failsafe) }
  }, [])

  const hidden =
    direction === 'up' ? `translate3d(0, ${distance}px, 0)` :
    direction === 'down' ? `translate3d(0, -${distance}px, 0)` :
    direction === 'left' ? `translate3d(${distance}px, 0, 0)` :
    direction === 'right' ? `translate3d(-${distance}px, 0, 0)` :
    'scale(0.96)'

  return (
    <div
      ref={ref}
      className={`r2-reveal${shown ? ' is-shown' : ''}${className ? ` ${className}` : ''}`}
      style={{ '--r2-reveal-from': hidden, '--r2-reveal-delay': `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </div>
  )
}
