'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

export type BlogListItem = { slug: string; title: string; date: string; status: string }

type Form = {
  slug: string; title: string; description: string; date: string
  status: string; body: string; data: Record<string, unknown>
}

const today = () => new Date().toISOString().slice(0, 10)
const EMPTY: Form = { slug: '', title: '', description: '', date: today(), status: 'published', body: '', data: {} }

export function BlogAdminClient({ items }: { items: BlogListItem[] }) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [form, setForm] = useState<Form | null>(null)
  const [editingSlug, setEditingSlug] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving'>('idle')
  const [msg, setMsg] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return s ? items.filter((i) => i.title.toLowerCase().includes(s) || i.slug.includes(s)) : items
  }, [items, q])

  const set = (k: keyof Form, v: string) => setForm((f) => (f ? { ...f, [k]: v } : f))

  function newPost() { setForm({ ...EMPTY, date: today() }); setEditingSlug(null); setMsg(null) }

  async function edit(slug: string) {
    setStatus('loading'); setMsg(null); setEditingSlug(slug)
    try {
      const res = await fetch(`/api/admin/blog?slug=${encodeURIComponent(slug)}`)
      const json = await res.json()
      if (json.ok && json.post) {
        const p = json.post
        setForm({
          slug: p.slug, title: p.title ?? '', description: p.description ?? '',
          date: (p.date ?? today()).slice(0, 10), status: p.status ?? 'published',
          body: p.body ?? '', data: (p.data && typeof p.data === 'object') ? p.data : {},
        })
      } else setMsg(json.error || 'Could not load post.')
    } catch { setMsg('Network error.') } finally { setStatus('idle') }
  }

  async function save() {
    if (!form) return
    setStatus('saving'); setMsg(null)
    try {
      const res = await fetch('/api/admin/blog', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form),
      })
      const json = await res.json()
      setMsg(json.ok ? 'Saved.' : (json.error || 'Save failed.'))
      if (json.ok) router.refresh()
    } catch { setMsg('Network error.') } finally { setStatus('idle') }
  }

  async function importFiles() {
    setImporting(true); setMsg(null)
    try {
      const res = await fetch('/api/admin/blog/import', { method: 'POST' })
      const json = await res.json()
      setMsg(json.ok ? `Imported ${json.processed} posts from files.` : (json.error || 'Import failed.'))
      if (json.ok) router.refresh()
    } catch { setMsg('Network error.') } finally { setImporting(false) }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 340px) 1fr', gap: 24, alignItems: 'start' }}>
      <div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" style={inputStyle} />
          <button onClick={newPost} style={{ ...btnPrimary, whiteSpace: 'nowrap' }}>+ New</button>
        </div>
        <button onClick={importFiles} disabled={importing} style={{
          width: '100%', marginBottom: 10, padding: '8px', background: 'transparent', color: '#94a3b8',
          border: '1px dashed rgba(255,255,255,0.2)', borderRadius: 10, fontSize: 12, cursor: 'pointer', opacity: importing ? 0.6 : 1,
        }}>{importing ? 'Importing…' : '⤓ Import posts from files'}</button>
        <div style={{ maxHeight: 620, overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}>
          {filtered.length === 0 ? <p style={{ padding: 16, color: '#64748b', fontSize: 13 }}>No posts.</p> :
            filtered.map((i) => (
              <button key={i.slug} onClick={() => edit(i.slug)} style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px',
                background: editingSlug === i.slug ? 'rgba(245,158,11,0.1)' : 'transparent',
                border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer',
              }}>
                <span style={{ color: '#f4f4f5', fontSize: 13, fontWeight: 700 }}>{i.title}</span>
                <span style={{ display: 'block', color: '#64748b', fontSize: 11 }}>{i.date} · {i.status}</span>
              </button>
            ))}
        </div>
      </div>

      <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: 22, minHeight: 400 }}>
        {!form ? <p style={{ color: '#64748b' }}>Select a post, or click <strong>+ New</strong>.</p> :
          status === 'loading' ? <p style={{ color: '#94a3b8' }}>Loading…</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px 130px', gap: 12 }}>
                <label style={lbl}>Slug<input value={form.slug} onChange={(e) => set('slug', e.target.value)} placeholder="my-post" style={inputStyle} /></label>
                <label style={lbl}>Date<input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} style={inputStyle} /></label>
                <label style={lbl}>Status
                  <select value={form.status} onChange={(e) => set('status', e.target.value)} style={inputStyle}>
                    <option value="published">published</option><option value="draft">draft</option>
                  </select>
                </label>
              </div>
              <label style={lbl}>Title<input value={form.title} onChange={(e) => set('title', e.target.value)} style={inputStyle} /></label>
              <label style={lbl}>Description<input value={form.description} onChange={(e) => set('description', e.target.value)} style={inputStyle} /></label>
              <label style={lbl}>Body (Markdown)
                <textarea value={form.body} onChange={(e) => set('body', e.target.value)} rows={18}
                  style={{ ...inputStyle, fontFamily: 'monospace', resize: 'vertical', lineHeight: 1.5 }} />
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <button onClick={save} disabled={status === 'saving'} style={{ ...btnPrimary, opacity: status === 'saving' ? 0.6 : 1 }}>
                  {status === 'saving' ? 'Saving…' : 'Save post'}
                </button>
                {msg && <span style={{ fontSize: 13, color: msg.includes('fail') || msg.includes('error') ? '#ef4444' : '#10b981' }}>{msg}</span>}
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
