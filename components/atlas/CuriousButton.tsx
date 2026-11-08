'use client'

// components/atlas/CuriousButton.tsx
// "I'm feeling curious" — picks a random unvisited concept with a slot-machine
// reveal, then navigates to its detail page.

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { pickCuriousSlug } from '@/lib/atlas-xp'

interface AtlasNodeLite {
  slug: string
  type: string
  title: string
  hookLine?: string
  oneLiner?: string
}

export function CuriousButton({ nodes }: { nodes: AtlasNodeLite[] }) {
  const router = useRouter()
  const [rolling, setRolling] = useState(false)
  const [reveal, setReveal] = useState<AtlasNodeLite | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const handleClick = () => {
    if (rolling || nodes.length === 0) return
    const allSlugs = nodes.map(n => n.slug)
    const chosen = pickCuriousSlug(allSlugs)
    if (!chosen) return
    const node = nodes.find(n => n.slug === chosen)
    if (!node) return

    setRolling(true)
    setReveal(null)
    let ticks = 0
    intervalRef.current = setInterval(() => {
      const random = nodes[Math.floor(Math.random() * nodes.length)]
      setReveal(random)
      ticks++
      if (ticks > 14) {
        if (intervalRef.current) clearInterval(intervalRef.current)
        setReveal(node)
        setTimeout(() => {
          router.push(`/atlas/${node.type}/${node.slug}`)
        }, 800)
      }
    }, 70)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={rolling || nodes.length === 0}
      className="cb"
      aria-label="Pick a random Atlas concept to explore"
    >
      <span className="cb-icon" aria-hidden>🎲</span>
      <span className="cb-body">
        <span className="cb-title">I&apos;m feeling curious</span>
        <span className="cb-sub">
          {rolling && reveal ? <span className="counter-tick">{reveal.title}</span> : 'Surprise me with a robotics rabbit hole'}
        </span>
      </span>
      <span className="cb-arrow" aria-hidden>→</span>
      <style jsx>{`
        /* Was a purple-to-orange gradient with a violet border, a yellow
           title and lilac subtext — four colours used nowhere else on the
           site, sitting next to the search box. It is a button; it looks
           like the other buttons now. */
        .cb {
          display: flex; align-items: center; gap: 16px;
          width: 100%;
          padding: 18px 22px;
          background: var(--surface-1);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          color: var(--text-1);
          cursor: pointer;
          text-align: left;
          transition: transform .15s var(--ease), border-color .15s var(--ease), background .15s var(--ease);
        }
        .cb:hover:not(:disabled) {
          transform: translateY(-2px);
          border-color: var(--border-2);
          background: var(--surface-2);
        }
        .cb:disabled { opacity: 0.7; cursor: wait; }
        .cb-icon { font-size: 26px; }
        .cb-body { display: flex; flex-direction: column; flex: 1; gap: 4px; }
        .cb-title { font-size: var(--t-body); font-weight: 650; color: var(--text-1); }
        .cb-sub { font-size: var(--t-small); color: var(--text-3); min-height: 18px; }
        .cb-arrow { font-size: 18px; color: var(--text-3); }
        .cb:hover:not(:disabled) .cb-arrow { color: var(--amber-bright); }
      `}</style>
    </button>
  )
}
