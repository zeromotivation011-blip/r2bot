export const ORANGE = '#FC6818'
export const BLUE = '#38bdf8'
export const panel = { padding: 16, borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', margin: '20px 0' } as const
export const title = { color: '#FC6818', fontWeight: 800, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' as const }
export const note = { color: '#94a3b8', fontSize: 14, lineHeight: 1.55, margin: '8px 0 0' } as const
export const btn = (on = false) => ({ padding: '8px 13px', borderRadius: 9, cursor: 'pointer', fontSize: 14, fontWeight: 600,
  border: '1px solid rgba(255,255,255,0.2)', background: on ? ORANGE : 'transparent', color: on ? '#fff' : '#cbd5e1' }) as const
export function rng(seed: number) {
  let a = seed >>> 0
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
