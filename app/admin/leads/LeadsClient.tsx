'use client'

import { useMemo, useState } from 'react'

export type Lead = {
  id: string
  email: string
  phone: string
  source: string | null
  page: string | null
  created_at: string
}

function toCsv(rows: Lead[]): string {
  const header = ['email', 'phone', 'source', 'page', 'created_at']
  const esc = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`
  const lines = rows.map((r) =>
    [r.email, r.phone, r.source ?? '', r.page ?? '', r.created_at].map((v) => esc(String(v))).join(','),
  )
  return [header.join(','), ...lines].join('\n')
}

export function LeadsClient({ leads }: { leads: Lead[] }) {
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return leads
    return leads.filter(
      (l) =>
        l.email.toLowerCase().includes(s) ||
        l.phone.toLowerCase().includes(s) ||
        (l.page ?? '').toLowerCase().includes(s),
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
          placeholder="Search email, phone, or page…"
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
              <th style={th}>Phone</th>
              <th style={th}>Source</th>
              <th style={th}>Page</th>
              <th style={th}>Captured</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} style={{ ...td, textAlign: 'center', color: '#64748b' }}>No leads yet.</td></tr>
            ) : (
              filtered.map((l) => (
                <tr key={l.id} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ ...td, color: '#f4f4f5' }}>{l.email}</td>
                  <td style={td}>{l.phone}</td>
                  <td style={td}>{l.source}</td>
                  <td style={{ ...td, color: '#64748b' }}>{l.page}</td>
                  <td style={{ ...td, color: '#64748b', whiteSpace: 'nowrap' }}>
                    {new Date(l.created_at).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const th: React.CSSProperties = { padding: '10px 14px', fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }
const td: React.CSSProperties = { padding: '10px 14px', color: '#cbd5e1' }
