// lib/kids/parent-controls.ts — the grown-up controls for R2BOT Kids.
//
// Set by a parent in the parent hub (/kids/parents, behind the parental gate)
// and stored on THIS DEVICE only (localStorage; no account, nothing sent).
//
//   dailyMinutes   a gentle daily time budget (0 = no budget). Never a hard
//                  lock mid-activity: the shell shows a wind-down banner five
//                  minutes before, then a kind "time for a break" banner.
//   quietHours     e.g. 20:00–07:00: the same kind banner, no lock.
//   askSpark       Ask Spark (the kids' helper) on or off. When off the Spark
//                  button is hidden. Spark's safety / helpline answers are never
//                  put behind a gate.
//   camera         Workshop "See it in my room" (camera and AR) and the Vision Lab camera on or off.
//   outboundLinks  links that leave R2BOT Kids on or off. When on they still go
//                  through the parental gate.
//
// React: useParentControls(), useKidsTimeStatus(). Non-React: readParentControls(),
// sparkAllowed(), cameraAllowed(), outboundLinksAllowed(), isQuietTime().
// Usage time: tickKidsUsage() (called by components/kids/parents/ParentTimeKeeperClient.tsx).

import { useSyncExternalStore } from 'react'

export interface QuietHours {
  on: boolean
  /** "HH:MM", local time. */
  start: string
  /** "HH:MM", local time. May be earlier than start (wraps past midnight). */
  end: string
}

export interface ParentControls {
  v: 1
  /** Minutes per day; 0 = no budget. */
  dailyMinutes: number
  quietHours: QuietHours
  askSpark: boolean
  camera: boolean
  outboundLinks: boolean
}

export const PARENT_CONTROLS_KEY = 'r2bot_kids_parent_controls_v1'
export const PARENT_CONTROLS_EVENT = 'r2bot:kids-parent-controls'
export const KIDS_USAGE_KEY = 'r2bot_kids_usage_v1'
export const KIDS_USAGE_EVENT = 'r2bot:kids-usage'

/** The budgets a parent can pick (minutes). 0 = no budget. */
export const DAILY_MINUTE_CHOICES = [0, 15, 30, 45, 60, 90, 120] as const
/** The wind-down banner appears this many minutes before the budget runs out. */
export const WIND_DOWN_MINUTES = 5

export const DEFAULT_PARENT_CONTROLS: Readonly<ParentControls> = Object.freeze({
  v: 1,
  dailyMinutes: 0,
  quietHours: Object.freeze({ on: false, start: '20:00', end: '07:00' }),
  askSpark: true,
  camera: true,
  outboundLinks: true,
}) as Readonly<ParentControls>

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/

function cleanTime(v: unknown, fallback: string): string {
  return typeof v === 'string' && HHMM.test(v) ? v : fallback
}

function cleanMinutes(v: unknown): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return 0
  return Math.min(600, Math.max(0, Math.round(v)))
}

function sanitize(raw: unknown): ParentControls {
  const d = DEFAULT_PARENT_CONTROLS
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const q = o.quietHours && typeof o.quietHours === 'object' ? (o.quietHours as Record<string, unknown>) : {}
  return {
    v: 1,
    dailyMinutes: cleanMinutes(o.dailyMinutes),
    quietHours: {
      on: typeof q.on === 'boolean' ? q.on : d.quietHours.on,
      start: cleanTime(q.start, d.quietHours.start),
      end: cleanTime(q.end, d.quietHours.end),
    },
    askSpark: typeof o.askSpark === 'boolean' ? o.askSpark : d.askSpark,
    camera: typeof o.camera === 'boolean' ? o.camera : d.camera,
    outboundLinks: typeof o.outboundLinks === 'boolean' ? o.outboundLinks : d.outboundLinks,
  }
}

let cache: ParentControls | null = null

/** Current controls (defaults on the server). Cached until the next change. */
export function readParentControls(): ParentControls {
  if (typeof window === 'undefined') return DEFAULT_PARENT_CONTROLS as ParentControls
  if (!cache) {
    let parsed: unknown = null
    try {
      const raw = window.localStorage.getItem(PARENT_CONTROLS_KEY)
      if (raw) parsed = JSON.parse(raw)
    } catch {
      parsed = null
    }
    cache = sanitize(parsed)
  }
  return cache
}

/** Update some controls; persists and fires PARENT_CONTROLS_EVENT. */
export function updateParentControls(patch: Partial<Omit<ParentControls, 'v'>>): ParentControls {
  const cur = readParentControls()
  const next = sanitize({ ...cur, ...patch, quietHours: { ...cur.quietHours, ...(patch.quietHours ?? {}) } })
  if (typeof window === 'undefined') return next
  try {
    window.localStorage.setItem(PARENT_CONTROLS_KEY, JSON.stringify(next))
  } catch {
    /* private mode: applies for this visit only */
  }
  cache = next
  window.dispatchEvent(new CustomEvent<ParentControls>(PARENT_CONTROLS_EVENT, { detail: next }))
  return next
}

export function resetParentControls(): ParentControls {
  return updateParentControls({ ...DEFAULT_PARENT_CONTROLS, quietHours: { ...DEFAULT_PARENT_CONTROLS.quietHours } })
}

export function subscribeParentControls(fn: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const onLocal = () => fn()
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === PARENT_CONTROLS_KEY) {
      cache = null
      fn()
    }
  }
  window.addEventListener(PARENT_CONTROLS_EVENT, onLocal)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(PARENT_CONTROLS_EVENT, onLocal)
    window.removeEventListener('storage', onStorage)
  }
}

const serverControls = (): ParentControls => DEFAULT_PARENT_CONTROLS as ParentControls

/** React hook: live controls (defaults during SSR and the first client render). */
export function useParentControls(): ParentControls {
  return useSyncExternalStore(subscribeParentControls, readParentControls, serverControls)
}

// ── Simple questions other surfaces ask ─────────────────────────────────────

/** Ask Spark allowed on this device? (Hide the button when false; never gate safety answers.) */
export function sparkAllowed(): boolean {
  return readParentControls().askSpark
}
/** Camera / AR allowed on this device? */
export function cameraAllowed(): boolean {
  return readParentControls().camera
}
/** Links that leave R2BOT Kids allowed on this device? (They are still gated when true.) */
export function outboundLinksAllowed(): boolean {
  return readParentControls().outboundLinks
}

function minutesOfDay(hhmm: string): number {
  const m = HHMM.exec(hhmm)
  return m ? Number(m[1]) * 60 + Number(m[2]) : 0
}

/** True when `now` falls inside the quiet hours (which may wrap past midnight). */
export function isQuietTime(c: ParentControls = readParentControls(), now: Date = new Date()): boolean {
  if (!c.quietHours.on) return false
  const s = minutesOfDay(c.quietHours.start)
  const e = minutesOfDay(c.quietHours.end)
  if (s === e) return false
  const t = now.getHours() * 60 + now.getMinutes()
  return s < e ? t >= s && t < e : t >= s || t < e
}

// ── Usage time (this device, today) ─────────────────────────────────────────

export interface KidsUsage {
  /** Local YYYY-MM-DD. */
  day: string
  seconds: number
  /** ms timestamp of the last counted tick (dedupes several open tabs). */
  last: number
}

function localDay(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

let usageCache: KidsUsage | null = null

export function readKidsUsage(now: Date = new Date()): KidsUsage {
  const today = localDay(now)
  if (typeof window === 'undefined') return { day: today, seconds: 0, last: 0 }
  if (!usageCache || usageCache.day !== today) {
    let u: KidsUsage = { day: today, seconds: 0, last: 0 }
    try {
      const raw = window.localStorage.getItem(KIDS_USAGE_KEY)
      if (raw) {
        const p = JSON.parse(raw) as Partial<KidsUsage>
        if (p && p.day === today && typeof p.seconds === 'number' && Number.isFinite(p.seconds)) {
          u = { day: today, seconds: Math.max(0, Math.min(86_400, p.seconds)), last: typeof p.last === 'number' ? p.last : 0 }
        }
      }
    } catch {
      /* defaults */
    }
    usageCache = u
  }
  return usageCache
}

/**
 * Count up to `maxSeconds` of play since the last tick (any tab). Call it on a
 * timer while a kids page is visible. Several tabs never double-count: a tick
 * only adds the time since the last tick that any tab recorded.
 */
export function tickKidsUsage(maxSeconds = 20, nowMs: number = Date.now()): KidsUsage {
  if (typeof window === 'undefined') return readKidsUsage()
  usageCache = null // another tab may have written
  const u = readKidsUsage(new Date(nowMs))
  const since = u.last ? (nowMs - u.last) / 1000 : maxSeconds
  const add = Math.max(0, Math.min(maxSeconds, since))
  if (add < 5 && u.last) return u
  const next: KidsUsage = { day: u.day, seconds: Math.round(u.seconds + add), last: nowMs }
  try {
    window.localStorage.setItem(KIDS_USAGE_KEY, JSON.stringify(next))
  } catch {
    /* noop */
  }
  usageCache = next
  window.dispatchEvent(new CustomEvent<KidsUsage>(KIDS_USAGE_EVENT, { detail: next }))
  return next
}

function subscribeUsage(fn: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === KIDS_USAGE_KEY) {
      usageCache = null
      fn()
    }
  }
  window.addEventListener(KIDS_USAGE_EVENT, fn)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(KIDS_USAGE_EVENT, fn)
    window.removeEventListener('storage', onStorage)
  }
}

const serverUsage: KidsUsage = { day: '', seconds: 0, last: 0 }

export function useKidsUsage(): KidsUsage {
  return useSyncExternalStore(subscribeUsage, () => readKidsUsage(), () => serverUsage)
}

// ── Time status: what the shell should say ──────────────────────────────────

export type KidsTimeState = 'ok' | 'winding-down' | 'over' | 'quiet'

export interface KidsTimeStatus {
  state: KidsTimeState
  /** Minutes played today on this device. */
  minutesToday: number
  /** Minutes left in today's budget (null = no budget). */
  minutesLeft: number | null
}

export function kidsTimeStatus(
  c: ParentControls = readParentControls(),
  u: KidsUsage = readKidsUsage(),
  now: Date = new Date(),
): KidsTimeStatus {
  const minutesToday = Math.floor(u.seconds / 60)
  const minutesLeft = c.dailyMinutes > 0 ? Math.max(0, c.dailyMinutes - u.seconds / 60) : null
  let state: KidsTimeState = 'ok'
  if (isQuietTime(c, now)) state = 'quiet'
  else if (minutesLeft !== null && minutesLeft <= 0) state = 'over'
  else if (minutesLeft !== null && minutesLeft <= WIND_DOWN_MINUTES) state = 'winding-down'
  return { state, minutesToday, minutesLeft: minutesLeft === null ? null : Math.ceil(minutesLeft) }
}

/** React hook: the live time status (re-evaluated on every usage tick and control change). */
export function useKidsTimeStatus(): KidsTimeStatus {
  const c = useParentControls()
  const u = useKidsUsage()
  return kidsTimeStatus(c, u)
}
