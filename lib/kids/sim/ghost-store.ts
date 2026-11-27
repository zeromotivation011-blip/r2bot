// lib/kids/sim/ghost-store.ts
// Where the Flight Recorder keeps each child's best run per arena (the ghost they
// race: "beat yourself", never anyone else). Device-only localStorage, one
// store per child through profileKey(). Nothing personal: poses and a time.
// Browser-only; every function is safe to call on the server (it does nothing).

import { profileKey } from '../profiles'
import { parseGhost, type Ghost } from './recorder'

export const GHOSTS_BASE = 'r2bot_kids_sim_ghosts_v1'
/** Most arenas remembered; the oldest ghost goes first. */
export const MAX_GHOSTS = 40

interface Store {
  /** arenaId → ghost; insertion order = age. */
  g: Record<string, Ghost>
}

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

function read(): Store {
  const s = storage()
  if (!s) return { g: {} }
  try {
    const raw = s.getItem(profileKey(GHOSTS_BASE))
    if (!raw) return { g: {} }
    const parsed = JSON.parse(raw) as { g?: Record<string, unknown> }
    const out: Store = { g: {} }
    for (const [k, v] of Object.entries(parsed.g ?? {})) {
      const ghost = parseGhost(v)
      if (ghost && ghost.arenaId === k) out.g[k] = ghost
    }
    return out
  } catch {
    return { g: {} }
  }
}

export function loadGhost(arenaId: string): Ghost | null {
  return read().g[arenaId] ?? null
}

/** Keep `ghost` as the best for its arena. Returns false if storage is full or unavailable (the run still counts). */
export function saveGhost(ghost: Ghost): boolean {
  const s = storage()
  if (!s) return false
  const st = read()
  delete st.g[ghost.arenaId]
  st.g[ghost.arenaId] = ghost
  const keys = Object.keys(st.g)
  for (let i = 0; i < keys.length - MAX_GHOSTS; i++) delete st.g[keys[i]]
  try {
    s.setItem(profileKey(GHOSTS_BASE), JSON.stringify(st))
    return true
  } catch {
    return false
  }
}

export function clearGhost(arenaId: string): void {
  const s = storage()
  if (!s) return
  const st = read()
  if (!st.g[arenaId]) return
  delete st.g[arenaId]
  try {
    s.setItem(profileKey(GHOSTS_BASE), JSON.stringify(st))
  } catch {
    /* ignore */
  }
}
