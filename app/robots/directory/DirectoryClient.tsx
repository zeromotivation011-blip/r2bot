'use client'
import { useMemo, useState } from 'react'
import { DIRECTORY, DIR_TYPES, type DirType } from '@/lib/robots-directory'

export default function DirectoryClient() {
  const [type, setType] = useState<DirType | 'all'>('all')
  const [country, setCountry] = useState('all')
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<'year' | 'name'>('year')
  const countries = useMemo(() => [...new Set(DIRECTORY.map((r) => r.country))].sort(), [])
  const rows = useMemo(() => DIRECTORY.filter((r) => (type === 'all' || r.type === type) && (country === 'all' || r.country === country) && (!q || (r.name + ' ' + r.maker + ' ' + r.line).toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => (sort === 'year' ? a.year - b.year : a.name.localeCompare(b.name))), [type, country, q, sort])
  const chip = (on: boolean) => ({ padding: '6px 12px', borderRadius: 999, cursor: 'pointer', fontSize: 13, fontWeight: 600, border: '1px solid rgba(255,255,255,0.2)', background: on ? '#FC6818' : 'transparent', color: on ? '#fff' : 'var(--text-2)' }) as const
  const field = { padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 14 } as const
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <button style={chip(type === 'all')} onClick={() => setType('all')}>All</button>
        {DIR_TYPES.map((t) => <button key={t.id} style={chip(type === t.id)} onClick={() => setType(t.id)}>{t.label}</button>)}
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search robots" aria-label="Search robots" style={{ ...field, flex: '1 1 200px' }} />
        <select value={country} onChange={(e) => setCountry(e.target.value)} aria-label="Country" style={field}>
          <option value="all">All countries</option>{countries.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as 'year' | 'name')} aria-label="Sort" style={field}>
          <option value="year">Oldest first</option><option value="name">A to Z</option>
        </select>
      </div>
      <p style={{ color: 'var(--text-2)', fontSize: 13, margin: '0 0 10px' }}>{rows.length} of {DIRECTORY.length} robots</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
        {rows.map((r) => (
          <div key={r.name} style={{ padding: 16, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ color: '#FC6818', fontSize: 12, fontWeight: 800 }}>{r.year} · {DIR_TYPES.find((t) => t.id === r.type)?.label.toUpperCase()}</div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 17, margin: '4px 0' }}>{r.name}</div>
            <div style={{ color: 'var(--text-2)', fontSize: 13 }}>{r.flag} {r.maker}</div>
            <p style={{ color: 'var(--text-2)', fontSize: 14, lineHeight: 1.5, margin: '8px 0 0' }}>{r.line}</p>
          </div>
        ))}
      </div>
      {rows.length === 0 && <p style={{ color: 'var(--text-2)' }}>No robots match. Clear a filter to see more.</p>}
    </div>
  )
}
