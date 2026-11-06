'use client'
import { useState } from 'react'
import { DIRECTORY, DIR_TYPES } from '@/lib/robots-directory'

const names = [...DIRECTORY].sort((a, b) => a.name.localeCompare(b.name))
const sel = { padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 15, width: '100%' } as const

export default function CompareClient() {
  const [a, setA] = useState('Unitree Go2')
  const [b, setB] = useState('ANYmal')
  const ra = DIRECTORY.find((r) => r.name === a)
  const rb = DIRECTORY.find((r) => r.name === b)
  const typeLabel = (t: string) => DIR_TYPES.find((x) => x.id === t)?.label ?? t
  const rows: [string, (r: typeof DIRECTORY[number]) => string][] = [
    ['Maker', (r) => r.maker], ['Country', (r) => `${r.flag} ${r.country}`], ['Year', (r) => String(r.year)], ['Type', (r) => typeLabel(r.type)], ['What it is', (r) => r.line],
  ]
  const age = ra && rb ? Math.abs(ra.year - rb.year) : null
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12, marginBottom: 16 }}>
        <select value={a} onChange={(e) => setA(e.target.value)} aria-label="First robot" style={sel}>{names.map((r) => <option key={r.name} value={r.name}>{r.name}</option>)}</select>
        <select value={b} onChange={(e) => setB(e.target.value)} aria-label="Second robot" style={sel}>{names.map((r) => <option key={r.name} value={r.name}>{r.name}</option>)}</select>
      </div>
      {ra && rb && (
        <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.12)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 1fr', background: 'rgba(255,255,255,0.06)', fontWeight: 800, color: '#fff' }}>
            <div style={{ padding: 12 }} /><div style={{ padding: 12 }}>{ra.name}</div><div style={{ padding: 12 }}>{rb.name}</div>
          </div>
          {rows.map(([label, f]) => (
            <div key={label} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 1fr', borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: 14 }}>
              <div style={{ padding: 12, color: '#FC6818', fontWeight: 700 }}>{label}</div>
              <div style={{ padding: 12, color: '#e2e8f0', lineHeight: 1.5 }}>{f(ra)}</div>
              <div style={{ padding: 12, color: '#e2e8f0', lineHeight: 1.5 }}>{f(rb)}</div>
            </div>
          ))}
        </div>
      )}
      {age !== null && ra && rb && (
        <p style={{ color: '#cbd5e1', marginTop: 14, lineHeight: 1.7 }}>
          {ra.year === rb.year ? 'Both appeared in the same year.' : `${ra.year < rb.year ? ra.name : rb.name} came first, ${age} year${age === 1 ? '' : 's'} earlier.`}
          {ra.type === rb.type ? ` Both are in the same group: ${typeLabel(ra.type).toLowerCase()}.` : ` They are different kinds of robot, so compare what each is built to do.`}
        </p>
      )}
    </div>
  )
}
