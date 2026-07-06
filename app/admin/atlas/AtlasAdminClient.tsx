'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

export type AtlasListItem = {
  id: string
  type: string
  slug: string
  title: string
  status: string
  updated_at: string
}

const TYPES = [
  'concept', 'person', 'company', 'robot', 'paper', 'ai',
  'component', 'tool', 'application', 'advanced', 'electronics',
]

type Form = {
  type: string
  slug: string
  title: string
  summary: string
  category: string
  status: string
  body: string
  data: Record<string, unknown>
}

const EMPTY: Form = { type: 'concept', slug: '', title: '', summary: '', category: '', status: 'published', body: '', data: {} }

export function AtlasAdminClient({ items }: { items: AtlasListItem[] }) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [form, setForm] = useState<Form | null>(null)
  const [editingKey, setEditingKey] = useState<string | null>(null) // "type/slug" when editing
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving' | 'ok' | 'err'>('idle')
  const [msg, setMsg] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return items
    return items.filter((i) => i.title.toLowerCase().includes(s) || i.slug.includes(s) || i.type.includes(s))
  }, [items, q])

  function newEntry() {
    setForm({ ...EMPTY })
    setEditingKey(null)
    setMsg(null); setStatus('idle')
  }

  async function edit(item: AtlasListItem) {
    setStatus('loading'); setMsg(null); setEditingKey(`${item.type}/${item.slug}`)
    try {
      const res = await fetch(`/api/admin/atlas?type=${encodeURIComponent(item.type)}&slug=${encodeURIComponent(item.slug)}`)
      const json = await res.json()
      if (json.ok && json.entry) {
        const e = json.entry
        setForm({
          type: e.type, slug: e.slug, title: e.title ?? '', summary: e.summary ?? '',
          category: e.category ?? '', status: e.status ?? 'published', body: e.body ?? '',
          data: (e.data && typeof e.data === 'object') ? e.data : {},
        })
        setStatus('idle')
      } else {
        setStatus('err'); setMsg(json.error || 'Could not load entry.')
      }
    } catch {
      setStatus('err'); setMsg('Network error.')
    }
  }

  async function save() {
    if (!form) return
    setStatus('saving'); setMsg(null)
    try {
      const res = await fetch('/api/admin/atlas', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (json.ok) {
        setStatus('ok'); setMsg('Saved.')
        router.refresh()
      } else {
        setStatus('err'); setMsg(json.error || 'Save failed.')
      }
    } catch {
      setStatus('err'); setMsg('Network error.')
    }
  }

  const set = (k: keyof Form, v: string) => setForm((f) => (f ? { ...f, [k]: v } : f))

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 360px) 1fr', gap: 24, alignItems: 'start' }}>
      {/* List */}
      <div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…"
            style={inputStyle}
          />
          <button onClick={newEntry} style={{ ...btnPrimary, whiteSpace: 'nowrap' }}>+ New</button>
        </div>
        <div style={{ maxHeight: 620, overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}>
          {filtered.length === 0 ? (
            <p style={{ padding: 16, color: '#64748b', fontSize: 13 }}>No entries. Create one, or run the migration script.</p>
          ) : filtered.map((i) => (
            <button
              key={i.id} onClick={() => edit(i)}
              style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px',
                background: editingKey === `${i.type}/${i.slug}` ? 'rgba(245,158,11,0.1)' : 'transparent',
                border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer',
              }}
            >
              <span style={{ color: '#f4f4f5', fontSize: 13, fontWeight: 700 }}>{i.title}</span>
              <span style={{ display: 'block', color: '#64748b', fontSize: 11 }}>
                {i.type}/{i.slug} · {i.status}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: 22, minHeight: 400 }}>
        {!form ? (
          <p style={{ color: '#64748b' }}>Select an entry to edit, or click <strong>+ New</strong>.</p>
        ) : status === 'loading' ? (
          <p style={{ color: '#94a3b8' }}>Loading…</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 12 }}>
              <label style={lbl}>Type
                <select value={form.type} onChange={(e) => set('type', e.target.value)} style={inputStyle}>
                  {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <label style={lbl}>Slug (url)
                <input value={form.slug} onChange={(e) => set('slug', e.target.value)} placeholder="e.g. pid-controller" style={inputStyle} />
              </label>
            </div>
            <label style={lbl}>Title
              <input value={form.title} onChange={(e) => set('title', e.target.value)} style={inputStyle} />
            </label>
            <label style={lbl}>One-sentence summary
              <input value={form.summary} onChange={(e) => set('summary', e.target.value)} style={inputStyle} />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 12 }}>
              <label style={lbl}>Category
                <input value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="fundamentals, sensors…" style={inputStyle} />
              </label>
              <label style={lbl}>Status
                <select value={form.status} onChange={(e) => set('status', e.target.value)} style={inputStyle}>
                  <option value="published">published</option>
                  <option value="draft">draft</option>
                </select>
              </label>
            </div>
            <label style={lbl}>Body (Markdown)
              <textarea
                value={form.body} onChange={(e) => set('body', e.target.value)} rows={16}
                style={{ ...inputStyle, fontFamily: 'monospace', resize: 'vertical', lineHeight: 1.5 }}
              />
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <button onClick={save} disabled={status === 'saving'} style={{ ...btnPrimary, opacity: status === 'saving' ? 0.6 : 1 }}>
                {status === 'saving' ? 'Saving…' : 'Save entry'}
              </button>
              {msg && <span style={{ fontSize: 13, color: status === 'err' ? '#ef4444' : '#10b981' }}>{msg}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
  color: '#f4f4f5', padding: '9px 12px', borderRadius: 10, fontSize: 14, outline: 'none',
}
const lbl: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, color: '#94a3b8', fontWeight: 700 }
const btnPrimary: React.CSSProperties = {
  padding: '9px 18px', background: '#fbbf24', color: '#0f0a1e', fontWeight: 800,
  fontSize: 14, border: 'none', borderRadius: 10, cursor: 'pointer',
}
