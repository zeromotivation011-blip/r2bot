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
        .cb {
          display: flex; align-items: center; gap: 16px;
          width: 100%;
          padding: 18px 22px;
          background: linear-gradient(135deg, rgba(124,58,237,0.16), rgba(245,158,11,0.10));
          border: 1px solid rgba(124,58,237,0.4);
          border-radius: 16px;
          color: #f4f4f5;
          cursor: pointer;
          text-align: left;
          transition: transform .15s, border-color .15s;
        }
        .cb:hover:not(:disabled) { transform: translateY(-2px); border-color: #fbbf24; }
        .cb:disabled { opacity: 0.7; cursor: wait; }
        .cb-icon { font-size: 32px; }
        .cb-body { display: flex; flex-direction: column; flex: 1; gap: 4px; }
        .cb-title { font-size: 17px; font-weight: 900; color: #fde047; }
        .cb-sub { font-size: 13px; color: #c4b5fd; min-height: 18px; }
        .cb-arrow {
          font-size: 22px; color: #fbbf24; font-weight: 900;
        }
      `}</style>
    </button>
  )
}
