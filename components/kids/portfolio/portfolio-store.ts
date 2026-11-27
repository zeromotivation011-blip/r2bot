// components/kids/portfolio/portfolio-store.ts
// The portfolio's own small store (roadmap #45): robot snapshots (the robot's
// share code + the day, so the portfolio shows how the robot grew) and teens'
// one-line reflections on portfolio items. Device-only localStorage, one store
// per child via profileKey() (so NOT in SWAPPED_KEYS). Never a photo, never a
// name: share codes keep only letters and numbers of the robot's own name.
// Everything else in the portfolio is READ from the existing stores.

import { profileKey } from '@/lib/kids/profiles'
import { decodeDesign } from '@/lib/kids/robot-design'

export const PORTFOLIO_BASE = 'r2bot_kids_portfolio_v1'
export const PORTFOLIO_EVENT = 'r2bot:kids-portfolio'
export const MAX_SNAPSHOTS = 12
export const PORTFOLIO_REFLECTION_MAX = 140

export interface RobotSnapshot {
  /** encodeDesign() share code. */
  c: string
  /** Local day YYYY-MM-DD. */
  d: string
}

export interface PortfolioState {
  s: RobotSnapshot[]
  /** Item key ("snap:<i>", "runs", "badges") → one-line reflection. */
  r: Record<string, string>
}

const EMPTY: PortfolioState = { s: [], r: {} }

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

export function cleanPortfolio(raw: unknown): PortfolioState {
  if (!raw || typeof raw !== 'object') return { s: [], r: {} }
  const o = raw as { s?: unknown; r?: unknown }
  const s: RobotSnapshot[] = []
  if (Array.isArray(o.s)) {
    for (const x of o.s) {
      if (!x || typeof x !== 'object') continue
      const { c, d } = x as { c?: unknown; d?: unknown }
      if (typeof c === 'string' && c.length <= 200 && decodeDesign(c) && typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) s.push({ c, d })
    }
  }
  const r: Record<string, string> = {}
  if (o.r && typeof o.r === 'object') {
    for (const [k, v] of Object.entries(o.r as Record<string, unknown>)) {
      if (/^[a-z0-9:_-]{1,40}$/.test(k) && typeof v === 'string' && v.trim()) r[k] = v.trim().slice(0, PORTFOLIO_REFLECTION_MAX)
    }
  }
  return { s: s.slice(-MAX_SNAPSHOTS), r }
}

export function readPortfolio(): PortfolioState {
  const st = storage()
  if (!st) return EMPTY
  try {
    const raw = st.getItem(profileKey(PORTFOLIO_BASE))
    return raw ? cleanPortfolio(JSON.parse(raw)) : EMPTY
  } catch {
    return EMPTY
  }
}

function write(p: PortfolioState): boolean {
  const st = storage()
  if (!st) return false
  try {
    st.setItem(profileKey(PORTFOLIO_BASE), JSON.stringify(p))
    window.dispatchEvent(new CustomEvent(PORTFOLIO_EVENT))
    return true
  } catch {
    return false
  }
}

function localDay(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Adds today's snapshot; a second snap on the same day replaces that day's. Oldest drop off after MAX_SNAPSHOTS. */
export function addSnapshot(code: string, now: Date = new Date()): boolean {
  if (!decodeDesign(code)) return false
  const p = readPortfolio()
  const day = localDay(now)
  const s = p.s.filter((x) => x.d !== day)
  s.push({ c: code, d: day })
  return write({ ...p, s: s.slice(-MAX_SNAPSHOTS) })
}

export function removeSnapshot(day: string): boolean {
  const p = readPortfolio()
  const r = { ...p.r }
  delete r[`snap:${day}`]
  return write({ s: p.s.filter((x) => x.d !== day), r })
}

export function setReflection(key: string, text: string): boolean {
  if (!/^[a-z0-9:_-]{1,40}$/.test(key)) return false
  const p = readPortfolio()
  const r = { ...p.r }
  const t = text.trim().slice(0, PORTFOLIO_REFLECTION_MAX)
  if (t) r[key] = t
  else delete r[key]
  return write({ ...p, r })
}

// ── Backup code (lib/kids-progress.ts exportProgressCode `extras.portfolio`) ────
// Extras are capped at 512 characters: the newest robot snapshots that fit
// (usually two or three) ride along as "code@YYYYMMDD" joined by "|".
// Reflections are free text and stay on the device: they are not in the code.

/** The newest robot snapshots as a short string for the progress backup code. */
export function portfolioBackupExtra(p: PortfolioState = readPortfolio()): string {
  const parts: string[] = []
  let len = 3
  for (let i = p.s.length - 1; i >= 0; i--) {
    const part = `${p.s[i].c}@${p.s[i].d.replace(/-/g, '')}`
    if (len + part.length + 1 > 512) break
    parts.unshift(part)
    len += part.length + 1
  }
  return `P1.${parts.join('|')}`
}

/** Merge restored snapshots into the playing child's portfolio (never removes one). Returns how many were added. */
export function restorePortfolioExtra(code: unknown): number {
  if (typeof code !== 'string' || !code.startsWith('P1.') || code.length > 512) return 0
  const raw = code.slice(3).split('|').filter(Boolean).map((x) => {
    const at = x.lastIndexOf('@')
    const d = x.slice(at + 1)
    return { c: x.slice(0, at), d: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` }
  })
  const incoming = cleanPortfolio({ s: raw }).s
  if (!incoming.length) return 0
  const p = readPortfolio()
  const days = new Set(p.s.map((x) => x.d))
  const add = incoming.filter((x) => !days.has(x.d))
  if (!add.length) return 0
  const s = [...p.s, ...add].sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0)).slice(-MAX_SNAPSHOTS)
  write({ ...p, s })
  return add.length
}
