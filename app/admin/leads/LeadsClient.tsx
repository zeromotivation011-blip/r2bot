'use client'

import { useMemo, useState } from 'react'

export type Lead = {
  id: string
  email: string
  name?: string | null
  phone: string | null
  source: string | null
  page: string | null
  meta?: Record<string, unknown> | null
  created_at: string
}

// Renders the jsonb context as something readable: the course someone joined
// the waitlist for, the school they teach at, and so on.
function describeMeta(meta: Record<string, unknown> | null | undefined): string {
  if (!meta || typeof meta !== 'object') return ''
  const m = meta as Record<string, string | undefined>
  if (m.courseTitle || m.courseSlug) return `Course: ${m.courseTitle || m.courseSlug}`
  if (m.schoolName) return `School: ${m.schoolName}${m.city ? `, ${m.city}` : ''}`
  const entries = Object.entries(meta).filter(([, v]) => v !== '' && v != null)
  if (entries.length === 0) return ''
  return entries.map(([k, v]) => `${k}: ${String(v)}`).join(' · ')
}

function toCsv(rows: Lead[]): string {
  const header = ['email', 'name', 'phone', 'source', 'context', 'page', 'created_at']
  const esc = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`
  const lines = rows.map((r) =>
    [
      r.email,
      r.name ?? '',
      r.phone ?? '',
      r.source ?? '',
      // Full JSON in the export so nothing is lost, even though the table
      // shows only a summary.
      r.meta && Object.keys(r.meta).length ? JSON.stringify(r.meta) : '',
      r.page ?? '',
      r.created_at,
    ].map((v) => esc(String(v))).join(','),
  )
  return [header.join(','), ...lines].join('\n')
}

const SOURCE_COLOR: Record<string, string> = {
  'popup': '#38bdf8',
  'academy-waitlist': '#fbbf24',
  'schools-interest': '#a78bfa',
  'newsletter': '#34d399',
}

export function LeadsClient({ leads }: { leads: Lead[] }) {
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return leads
    return leads.filter(
      (l) =>
        l.email.toLowerCase().includes(s) ||
        (l.name ?? '').toLowerCase().includes(s) ||
        (l.phone ?? '').toLowerCase().includes(s) ||
        (l.source ?? '').toLowerCase().includes(s) ||
        (l.page ?? '').toLowerCase().includes(s) ||
        describeMeta(l.meta).toLowerCase().includes(s),
    )
  }, [leads, q])

  function download() {
    const blob = new Blob([toCsv(filtered)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `r2bot-leads-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search email, name, phone, source, course, school…"
          style={{
            flex: 1, minWidth: 220, background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.12)', color: '#f4f4f5',
            padding: '10px 14px', borderRadius: 10, fontSize: 14, outline: 'none',
          }}
        />
        <button
          onClick={download}
          style={{
            padding: '10px 18px', background: '#fbbf24', color: '#0f0a1e',
            fontWeight: 800, fontSize: 14, border: 'none', borderRadius: 10, cursor: 'pointer',
          }}
        >
          Export CSV ({filtered.length})
        </button>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.04)', textAlign: 'left', color: '#94a3b8' }}>
              <th style={th}>Email</th>
              <th style={th}>Name</th>
              <th style={th}>Phone</th>
              <th style={th}>Source</th>
              <th style={th}>Context</th>
              <th style={th}>Page</th>
              <th style={th}>Captured</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ ...td, textAlign: 'center', color: '#64748b' }}>No leads yet.</td></tr>
            ) : (
              filtered.map((l) => {
                const context = describeMeta(l.meta)
                const color = SOURCE_COLOR[l.source ?? ''] ?? '#94a3b8'
                return (
                  <tr key={l.id} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <td style={{ ...td, color: '#f4f4f5' }}>{l.email}</td>
                    <td style={td}>{l.name || '—'}</td>
                    <td style={td}>{l.phone || '—'}</td>
                    <td style={td}>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: 999,
                        fontSize: 11, fontWeight: 700, color,
                        background: `${color}1a`, border: `1px solid ${color}40`,
                      }}>
                        {l.source || 'popup'}
                      </span>
                    </td>
                    <td style={{ ...td, maxWidth: 260 }} title={context}>
                      {context || <span style={{ color: '#475569' }}>—</span>}
                    </td>
                    <td style={{ ...td, color: '#64748b' }}>{l.page}</td>
                    <td style={{ ...td, color: '#64748b', whiteSpace: 'nowrap' }}>
                      {new Date(l.created_at).toLocaleString()}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const th: React.CSSProperties = { padding: '10px 14px', fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }
const td: React.CSSProperties = { padding: '10px 14px', color: '#cbd5e1' }
