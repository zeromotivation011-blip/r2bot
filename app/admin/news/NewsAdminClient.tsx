'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

export type NewsRow = {
  url: string
  title: string
  source: string | null
  topic: string | null
  published_at: string | null
  pinned: boolean
  hidden: boolean
  curated_summary: string | null
}

export function NewsAdminClient({ rows }: { rows: NewsRow[] }) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return rows
    return rows.filter((r) => r.title.toLowerCase().includes(s) || (r.source ?? '').toLowerCase().includes(s))
  }, [rows, q])

  async function patch(url: string, body: Record<string, unknown>) {
    setBusy(url)
    try {
      await fetch('/api/admin/news', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url, ...body }),
      })
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      <input
        value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title or source…"
        style={{
          width: '100%', maxWidth: 420, marginBottom: 16, background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.12)', color: '#f4f4f5', padding: '10px 14px',
          borderRadius: 10, fontSize: 14, outline: 'none',
        }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.length === 0 ? (
          <p style={{ color: '#64748b' }}>No archived stories yet.</p>
        ) : filtered.map((r) => (
          <div
            key={r.url}
            style={{
              padding: 14, borderRadius: 12,
              background: r.pinned ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${r.pinned ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.08)'}`,
              opacity: r.hidden ? 0.5 : 1,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ minWidth: 240, flex: 1 }}>
                <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ color: '#f4f4f5', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
                  {r.title || r.url}
                </a>
                <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>
                  {r.source} · {r.topic}{r.pinned ? ' · 📌 pinned' : ''}{r.hidden ? ' · 🚫 hidden' : ''}
                </div>
                {editing === r.url ? (
                  <div style={{ marginTop: 8 }}>
                    <textarea
                      value={draft} onChange={(e) => setDraft(e.target.value)} rows={2}
                      placeholder="Custom summary…"
                      style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#f4f4f5', padding: 8, borderRadius: 8, fontSize: 13 }}
                    />
                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                      <button onClick={() => { patch(r.url, { curated_summary: draft, title: r.title }); setEditing(null) }} style={btn}>Save summary</button>
                      <button onClick={() => setEditing(null)} style={btnGhost}>Cancel</button>
                    </div>
                  </div>
                ) : r.curated_summary ? (
                  <p style={{ color: '#94a3b8', fontSize: 12, margin: '6px 0 0' }}>✎ {r.curated_summary}</p>
                ) : null}
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <button disabled={busy === r.url} onClick={() => patch(r.url, { pinned: !r.pinned, title: r.title })} style={btn}>
                  {r.pinned ? 'Unpin' : 'Pin'}
                </button>
                <button disabled={busy === r.url} onClick={() => patch(r.url, { hidden: !r.hidden, title: r.title })} style={btn}>
                  {r.hidden ? 'Unhide' : 'Hide'}
                </button>
                <button onClick={() => { setEditing(r.url); setDraft(r.curated_summary ?? '') }} style={btnGhost}>Summary</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const btn: React.CSSProperties = {
  padding: '6px 12px', background: 'rgba(255,255,255,0.08)', color: '#f4f4f5',
  border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
}
const btnGhost: React.CSSProperties = {
  padding: '6px 12px', background: 'transparent', color: '#94a3b8',
  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12, cursor: 'pointer',
}
