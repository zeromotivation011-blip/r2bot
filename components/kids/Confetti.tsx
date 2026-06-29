'use client'

// components/kids/Confetti.tsx
// Lightweight DOM-based confetti for celebrations.
// Wrap the kids zone with <ConfettiProvider />, then call useConfetti().fire()
// from anywhere underneath.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

const PALETTE = [
  '#FFD700', // gold
  '#FF6B35', // orange
  '#7C3AED', // purple
  '#10B981', // green
  '#3B82F6', // blue
  '#EF4444', // red
  '#FBBF24', // amber
  '#F472B6', // pink
] as const

interface Particle {
  id: number
  left: number       // viewport % start position
  startTop: number   // viewport px start position
  color: string
  size: number       // px
  delay: number      // s
  dx: number         // px drift (left/right) by the end
  duration: number   // s
  shape: 'circle' | 'square' | 'rect'
  rotateStart: number
}

interface Burst {
  id: number
  particles: Particle[]
}

interface FireOptions {
  x?: number          // viewport px — center of burst origin
  y?: number          // viewport px
  count?: number      // particle count (default 36)
}

interface ConfettiApi {
  fire: (opts?: FireOptions) => void
}

const ConfettiCtx = createContext<ConfettiApi | null>(null)

function makeParticles(opts: FireOptions): Particle[] {
  const count = opts.count ?? 36
  const originX =
    typeof opts.x === 'number'
      ? opts.x
      : typeof window !== 'undefined'
        ? window.innerWidth / 2
        : 0
  const originY = typeof opts.y === 'number' ? opts.y : 60
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1
  const result: Particle[] = []
  for (let i = 0; i < count; i++) {
    const spread = (Math.random() - 0.5) * 240 // horizontal spread in px
    const left = ((originX + spread) / vw) * 100
    const color = PALETTE[Math.floor(Math.random() * PALETTE.length)]
    const shapeRoll = Math.random()
    const shape: Particle['shape'] =
      shapeRoll < 0.45 ? 'circle' : shapeRoll < 0.85 ? 'square' : 'rect'
    result.push({
      id: i,
      left,
      startTop: originY,
      color,
      size: 6 + Math.random() * 8,
      delay: Math.random() * 0.18,
      dx: (Math.random() - 0.5) * 220,
      duration: 1.6 + Math.random() * 1.2,
      shape,
      rotateStart: Math.floor(Math.random() * 360),
    })
  }
  return result
}

export function ConfettiProvider({ children }: { children: React.ReactNode }) {
  const [bursts, setBursts] = useState<Burst[]>([])
  const idRef = useRef(0)

  const fire = useCallback((opts: FireOptions = {}) => {
    if (typeof window === 'undefined') return
    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const count = reduced ? Math.min(12, opts.count ?? 36) : opts.count ?? 36
    const id = ++idRef.current
    const burst: Burst = { id, particles: makeParticles({ ...opts, count }) }
    setBursts(prev => [...prev, burst])
    // Cleanup after the longest particle lifetime.
    const maxLife = burst.particles.reduce(
      (m, p) => Math.max(m, p.delay + p.duration),
      0,
    )
    window.setTimeout(() => {
      setBursts(prev => prev.filter(b => b.id !== id))
    }, (maxLife + 0.2) * 1000)
  }, [])

  const api = useMemo<ConfettiApi>(() => ({ fire }), [fire])

  return (
    <ConfettiCtx.Provider value={api}>
      {children}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          overflow: 'hidden',
          zIndex: 9999,
        }}
      >
        {bursts.map(b => (
          <BurstLayer key={b.id} burst={b} />
        ))}
      </div>
    </ConfettiCtx.Provider>
  )
}

function BurstLayer({ burst }: { burst: Burst }) {
  return (
    <>
      {burst.particles.map(p => {
        const base: React.CSSProperties = {
          position: 'absolute',
          left: `${p.left}%`,
          top: `${p.startTop}px`,
          width: p.shape === 'rect' ? p.size * 1.6 : p.size,
          height: p.shape === 'rect' ? p.size * 0.5 : p.size,
          background: p.color,
          borderRadius: p.shape === 'circle' ? '50%' : 2,
          animation: `confetti-fall ${p.duration}s ${p.delay}s ease-out forwards`,
          transform: `rotate(${p.rotateStart}deg)`,
          // expose drift to the keyframe
          ['--cf-dx' as keyof React.CSSProperties as string]: `${p.dx}px`,
          willChange: 'transform, opacity',
        }
        return <span key={p.id} style={base} />
      })}
    </>
  )
}

export function useConfetti(): ConfettiApi {
  const ctx = useContext(ConfettiCtx)
  // Fallback no-op so components can be rendered outside the provider (e.g. tests).
  return ctx ?? { fire: () => undefined }
}

// Convenience: also expose an imperative event-based trigger for non-React code.
const EVENT = 'r2bot:confetti'
export function fireConfetti(opts?: FireOptions) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(EVENT, { detail: opts ?? {} }))
}

export function useConfettiEventBridge() {
  const { fire } = useConfetti()
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handler = (e: Event) => {
      const ce = e as CustomEvent<FireOptions>
      fire(ce.detail)
    }
    window.addEventListener(EVENT, handler)
    return () => window.removeEventListener(EVENT, handler)
  }, [fire])
}
