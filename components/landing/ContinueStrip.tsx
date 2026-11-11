'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

/** Shows returning visitors where they left off in Quick Lessons. Renders nothing for new visitors. */
/** `lessons` is the ordered live list (slug + title) from the server — the full catalogue stays out of the client bundle. */
export default function ContinueStrip({ lessons }: { lessons: { slug: string; title: string }[] }) {
  const [done, setDone] = useState<string[] | null>(null)
  useEffect(() => {
    try { const v = JSON.parse(localStorage.getItem('r2bot_shorts_done') || '[]'); setDone(Array.isArray(v) ? v : []) } catch { setDone([]) }
  }, [])
  if (!done || done.length === 0 || done.length >= lessons.length) return null
  const next = lessons.find((s) => !done.includes(s.slug))
  if (!next) return null
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px' }}>
      <Link href={`/shorts/${next.slug}`} style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', padding: '14px 18px', borderRadius: 14, textDecoration: 'none', background: 'rgba(252,104,24,0.12)', border: '1px solid rgba(252,104,24,0.5)' }}>
        <span style={{ fontSize: 22 }} aria-hidden>🔥</span>
        <span style={{ color: '#fff', fontWeight: 800 }}>Welcome back. You finished {done.length} of {lessons.length} Quick Lessons.</span>
        <span style={{ color: '#FC6818', fontWeight: 800, marginLeft: 'auto' }}>Next: {next.title.split(':')[0]} →</span>
      </Link>
    </div>
  )
}
