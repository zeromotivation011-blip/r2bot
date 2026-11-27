// lib/kids/profiles.ts
//
// Profiles on one device (roadmap #41 shared-device mode, #90 family profiles).
// Siblings on a family tablet, or 40 children on 10 lab tablets, each keep their
// own robot and progress. Nothing here leaves the device and nothing here is
// personal: a profile is a nickname (checked by checkNickname in the UI), a
// picture, a colour and an age band. 5–7-year-olds (Explorers) unlock their
// profile with a picture password of 3 emojis; older children tap their
// nickname (a picture password is optional for them).
//
// HOW DATA IS KEPT APART — two mechanisms, one rule each:
//
// 1. NAMESPACED keys (`PROFILE_KEY_BASES`: progress, robot, builds, Passport...). Readers ask
//    profileKey(base) for the key. Member #1 ('p1', the child who used this
//    device before profiles existed) keeps the ORIGINAL key, so the migration
//    moves no data and cannot lose any. Every other profile uses
//    `<base>::<profileId>`. With no one signed in (shared tablet between
//    children) the key is `<base>::_none`, which "Done" and the next sign-in wipe
//    (per-child bases only: see wipeNamespace).
//
// 2. SWAPPED keys (`SWAPPED_KEYS` / `SWAPPED_PREFIXES`): stores owned by other
//    files that read a fixed key (Skill Galaxy, course, hangar looks, class
//    membership, Vision/Think labs, Code Lab drafts...). The ACTIVE profile's
//    data sits at the plain key; switching copies it to `<key>::<oldId>` and
//    brings `<key>::<newId>` back, all-or-nothing (rolled back on a storage
//    error). Those files need no change to be per-profile.
//    ⚠ If a reader of a swapped key starts calling profileKey(), REMOVE the key
//    from SWAPPED_KEYS in the same commit, or the two mechanisms fight.
//
// No state stored (most homes) = one implicit profile 'p1', plain keys: the
// whole feature costs a single-child device nothing until a grown-up adds a
// second profile or turns on shared-tablet mode.
//
// This file must not import lib/kids-progress.ts or lib/kids/robot-design.ts
// (they import it). Events are fired by name for the same reason.

import type { BandId } from './bands'

export const PROFILES_KEY = 'r2bot_kids_profiles_v1'
/** Fired on window when profiles change or the active profile switches. */
export const KIDS_PROFILE_EVENT = 'r2bot:kids-profile'
/** Member #1: the device's original child. Uses the original storage keys. */
export const LEGACY_PROFILE_ID = 'p1'
/** Namespace used while nobody is signed in on a shared tablet. */
export const NO_PROFILE = '_none'
const SEP = '::'

/** Keys whose readers call profileKey(). Exported for the verify script. */
export const NAMESPACED_BASES = ['r2bot_kids_v2', 'r2bot_kids_robot_v1'] as const

/**
 * EVERY base passed to profileKey() anywhere in the app: progress and robot
 * plus the stores that adopted profileKey() later. Member #1 ('p1') keeps all
 * of these at the plain key, so removeProfile('p1') deletes each one; a base
 * missing here would survive the removal (the Passport words did, Nov 2026).
 * profiles.verify.ts fails CI if a profileKey() call site uses a base that is
 * not listed. Never list a SWAPPED_KEYS entry here.
 */
export const PROFILE_KEY_BASES: readonly string[] = [
  ...NAMESPACED_BASES,
  'r2bot_kids_builds_v1', // Make It at Home builds (lib/kids/builds/store.ts)
  'r2bot_kids_portfolio_v1', // portfolio (components/kids/portfolio/portfolio-store.ts)
  'r2bot_kids_robodex_v1', // Robodex cards (lib/kids/robodex/store.ts)
  'r2bot_kids_passport_v1', // Robot Passport restore words (lib/kids/passport-client.ts)
  'r2bot_kids_sim_ghosts_v1', // Flight Recorder ghosts (lib/kids/sim/ghost-store.ts)
  'r2bot_kids_makers_heard_v1', // Makers heard (lib/kids/makers/heard.ts)
  'r2bot_kids_class_misc_v1', // class misconception counts (lib/kids/classroom-diary.ts)
  'r2bot_kids_class_diary_v1', // class activity diary (lib/kids/classroom-diary.ts)
  'r2bot_kids_look_v1', // teen "R2BOT Lab" look (lib/kids/teen-boot.ts)
]

/** Per-child stores read by fixed key elsewhere; swapped on every switch. */
export const SWAPPED_KEYS: readonly string[] = [
  'r2bot_kids_activities_v1', // Skill Galaxy done map (lib/kids/activities/progress.ts)
  'r2bot_kids_course_v1', // course state (components/kids/course/course-state.ts)
  'r2bot_kids_build_day', // once-a-day build reward (rewards.ts)
  'r2bot_kids_class_v1', // class membership token (classroom-membership.ts)
  'r2bot_kids_class_missions_v1', // cached teacher missions
  'r2bot_kids_class_powerup_v1', // cached Class Power-Up (classroom-membership.ts)
  'r2bot_kids_hangar_v1', // hangar looks (components/kids/hangar/cosmetics.ts)
  'r2bot_kids_onboarded', // universe intro seen
  'r2bot_kids_spark_reward_day', // Ask Spark daily reward
  'r2bot_kids_vision_v1', // Vision Lab missions done
]
export const SWAPPED_PREFIXES: readonly string[] = [
  'r2bot_think_', // How Robots Think labs done (lib/kids/ai/think/common.ts)
  'r2bot_kids_codelab_draft_', // Code Lab drafts (MissionClient)
  'r2bot_game_seen_', // game intro seen (GameShellClient)
  'r2bot_world_complete_', // World finished flags (worlds/*)
]

export type DeviceMode = 'home' | 'shared'

/** A "play together" result waiting for the partner's next turn on the device. */
export interface TogetherCredit {
  /** Mission id, e.g. "together-crater". */
  id: string
  stars: number
  at: string
}

export interface KidsProfile {
  id: string
  /** Nickname only (checkNickname): never a full name, email or phone. */
  nickname: string
  /** One emoji from PROFILE_PICTURES. */
  picture: string
  /** Card colour, one of PROFILE_COLORS. */
  color: string
  band: BandId | null
  /** Hash of the picture password, or null for "tap to play". */
  pw: string | null
  /** Set when this profile joined a class on this device (nickname + class only). */
  className: string | null
  createdAt: string
  lastUsedAt: string
  pending: TogetherCredit[]
}

export interface ProfilesState {
  v: 1
  mode: DeviceMode
  /** null = nobody signed in (the picker shows). */
  active: string | null
  profiles: KidsProfile[]
}

/** Pictures a child picks for their profile card. */
export const PROFILE_PICTURES = ['🚀', '🦊', '🐼', '🐯', '🐙', '🦖', '🦄', '🐬', '🌟', '🌈', '⚡', '🎨', '🤖', '🐝', '🍉', '🌻'] as const
/** Card colours (content colour; chrome stays navy + orange). */
export const PROFILE_COLORS = ['#FC6818', '#00B8D4', '#22C55E', '#EC4899', '#3B82F6', '#FACC15', '#EF4444', '#14B8A6'] as const
/** The 9 pictures of the picture password grid. A password is 3 taps, in order. */
export const PASSWORD_PICTURES = ['🍎', '🐶', '🚗', '⭐', '🌙', '🐟', '🎈', '🌳', '🍦'] as const
export const PASSWORD_LENGTH = 3
/** Spoken/accessible names for the password pictures. */
export const PASSWORD_LABELS: Record<string, string> = {
  '🍎': 'apple', '🐶': 'dog', '🚗': 'car', '⭐': 'star', '🌙': 'moon', '🐟': 'fish', '🎈': 'balloon', '🌳': 'tree', '🍦': 'ice cream',
}

export const MAX_PROFILES: Record<DeviceMode, number> = { home: 8, shared: 60 }

// ── storage helpers (never throw) ────────────────────────────────────────────

function ls(): Storage | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null
  } catch {
    return null
  }
}

function fire(name: string): void {
  try {
    window.dispatchEvent(new CustomEvent(name))
  } catch {
    /* not in a browser */
  }
}

/** Every event a profile switch must announce, so every screen re-reads. */
function announceSwitch(): void {
  fire(KIDS_PROFILE_EVENT)
  fire('r2bot:kids-progress') // KIDS_PROGRESS_EVENT
  fire('r2bot:kids-robot') // ROBOT_CHANGED_EVENT
  fire('r2bot:kids-class') // KIDS_CLASS_EVENT
  fire('r2bot:kids-missions') // KIDS_MISSIONS_EVENT
}

function allKeys(s: Storage): string[] {
  const out: string[] = []
  try {
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i)
      if (k !== null) out.push(k)
    }
  } catch {
    /* ignore */
  }
  return out
}

function isSwappedBase(key: string): boolean {
  if (key.includes(SEP)) return false
  return SWAPPED_KEYS.includes(key) || SWAPPED_PREFIXES.some((p) => key.startsWith(p))
}

const ID_RE = /^p[0-9a-z]{1,12}$/
const HEX = /^#[0-9A-Fa-f]{6}$/
const BANDS: readonly BandId[] = ['explorers', 'builders', 'inventors', 'engineers']

function cleanProfile(x: unknown): KidsProfile | null {
  if (!x || typeof x !== 'object') return null
  const o = x as Record<string, unknown>
  if (typeof o.id !== 'string' || !ID_RE.test(o.id)) return null
  if (typeof o.nickname !== 'string' || !o.nickname || o.nickname.length > 20) return null
  const pending = Array.isArray(o.pending)
    ? o.pending
        .filter((c): c is TogetherCredit => !!c && typeof c === 'object' && typeof (c as TogetherCredit).id === 'string' && typeof (c as TogetherCredit).stars === 'number')
        .slice(-20)
        .map((c) => ({ id: c.id.slice(0, 60), stars: Math.max(1, Math.min(3, Math.round(c.stars))), at: typeof c.at === 'string' ? c.at : '' }))
    : []
  return {
    id: o.id,
    nickname: o.nickname,
    picture: typeof o.picture === 'string' && o.picture.length <= 8 ? o.picture : PROFILE_PICTURES[0],
    color: typeof o.color === 'string' && HEX.test(o.color) ? o.color : PROFILE_COLORS[0],
    band: typeof o.band === 'string' && (BANDS as readonly string[]).includes(o.band) ? (o.band as BandId) : null,
    pw: typeof o.pw === 'string' && /^[0-9a-f]{8}$/.test(o.pw) ? o.pw : null,
    className: typeof o.className === 'string' && o.className.length <= 60 ? o.className : null,
    createdAt: typeof o.createdAt === 'string' ? o.createdAt : '',
    lastUsedAt: typeof o.lastUsedAt === 'string' ? o.lastUsedAt : '',
    pending,
  }
}

let cache: { raw: string | null; state: ProfilesState | null } | null = null

/** The stored state, or null when this device never set up profiles (one implicit child, 'p1'). */
export function readProfilesState(): ProfilesState | null {
  const s = ls()
  if (!s) return null
  let raw: string | null = null
  try {
    raw = s.getItem(PROFILES_KEY)
  } catch {
    return null
  }
  if (cache && cache.raw === raw) return cache.state
  let state: ProfilesState | null = null
  if (raw) {
    try {
      const o = JSON.parse(raw) as Record<string, unknown>
      const profiles = Array.isArray(o.profiles) ? o.profiles.map(cleanProfile).filter((p): p is KidsProfile => !!p) : []
      const seen = new Set<string>()
      const unique = profiles.filter((p) => !seen.has(p.id) && (seen.add(p.id), true))
      const active = typeof o.active === 'string' && unique.some((p) => p.id === o.active) ? o.active : null
      state = { v: 1, mode: o.mode === 'shared' ? 'shared' : 'home', active, profiles: unique }
    } catch {
      state = null
    }
  }
  cache = { raw, state }
  return state
}

function writeState(state: ProfilesState): boolean {
  const s = ls()
  if (!s) return false
  try {
    s.setItem(PROFILES_KEY, JSON.stringify(state))
    return true
  } catch {
    return false
  }
}

/** Active profile id. No stored state = the device's original child. */
export function activeProfileId(): string | null {
  const st = readProfilesState()
  return st ? st.active : LEGACY_PROFILE_ID
}

/** The storage key of a namespaced store for one profile (null = nobody signed in). */
export function namespacedKey(base: string, profileId: string | null): string {
  if (profileId === LEGACY_PROFILE_ID) return base
  return `${base}${SEP}${profileId ?? NO_PROFILE}`
}

/** THE key for a per-child store, for whoever is playing now. */
export function profileKey(base: string): string {
  return namespacedKey(base, activeProfileId())
}

/**
 * Where a per-child store of `profileId` lives right now, for either mechanism:
 * a swapped key is the plain key for the active profile and its stash otherwise.
 */
export function storageKeyFor(base: string, profileId: string | null): string {
  if (isSwappedBase(base)) {
    return profileId !== null && profileId === activeProfileId() ? base : `${base}${SEP}${profileId ?? NO_PROFILE}`
  }
  return namespacedKey(base, profileId)
}

// ── reading the original child's details (no import of kids-progress) ──

function legacySeed(): { nickname: string; band: BandId | null } {
  const s = ls()
  let nickname = ''
  let band: BandId | null = null
  try {
    const raw = s?.getItem(NAMESPACED_BASES[0])
    if (raw) {
      const p = JSON.parse(raw) as Record<string, unknown>
      if (typeof p.explorerName === 'string') nickname = p.explorerName
      if (typeof p.band === 'string' && (BANDS as readonly string[]).includes(p.band)) band = p.band as BandId
    }
  } catch {
    /* ignore */
  }
  nickname = nickname.replace(/[^\p{L}\p{M}\p{N} ]/gu, '').trim().slice(0, 20)
  return { nickname: nickname.length >= 2 ? nickname : 'Explorer 1', band }
}

function nowIso(): string {
  return new Date().toISOString()
}

function newId(existing: KidsProfile[]): string {
  for (let i = 0; i < 50; i++) {
    let n = ''
    try {
      const a = new Uint32Array(1)
      globalThis.crypto.getRandomValues(a)
      n = a[0].toString(36)
    } catch {
      n = Math.floor(Math.random() * 0xffffffff).toString(36)
    }
    const id = `p${n.slice(0, 7)}`
    if (id !== LEGACY_PROFILE_ID && ID_RE.test(id) && !existing.some((p) => p.id === id)) return id
  }
  return `p${Date.now().toString(36).slice(-8)}`
}

/**
 * Turn the implicit single child into stored member #1 ('p1', original keys —
 * nothing is moved, so nothing can be lost) and return the state. Safe to call
 * many times. Also tidies any half-finished switch.
 */
export function ensureProfiles(): ProfilesState {
  const cur = readProfilesState()
  if (cur) {
    repair(cur)
    return cur
  }
  const seed = legacySeed()
  const t = nowIso()
  const state: ProfilesState = {
    v: 1,
    mode: 'home',
    active: LEGACY_PROFILE_ID,
    profiles: [
      {
        id: LEGACY_PROFILE_ID,
        nickname: seed.nickname,
        picture: PROFILE_PICTURES[0],
        color: PROFILE_COLORS[0],
        band: seed.band,
        pw: null,
        className: null,
        createdAt: t,
        lastUsedAt: t,
        pending: [],
      },
    ],
  }
  writeState(state)
  fire(KIDS_PROFILE_EVENT)
  return state
}

/** True when the device has more than its one original child, or is a shared tablet. */
export function profilesInUse(st: ProfilesState | null = readProfilesState()): boolean {
  return !!st && (st.mode === 'shared' || st.profiles.length > 1 || st.active === null)
}

/** The picker must show: profiles are set up and nobody is signed in. */
export function needsPicker(st: ProfilesState | null = readProfilesState()): boolean {
  return !!st && st.active === null
}

export function getProfile(id: string | null, st: ProfilesState | null = readProfilesState()): KidsProfile | null {
  if (!id) return null
  return st?.profiles.find((p) => p.id === id) ?? null
}

export function activeProfile(): KidsProfile | null {
  const st = readProfilesState()
  return st ? getProfile(st.active, st) : null
}

// ── swapping the fixed-key stores ──

/** Leftover stash keys for the ACTIVE profile mean a switch was interrupted. */
function repair(st: ProfilesState): void {
  const s = ls()
  if (!s || !st.active) return
  const suffix = `${SEP}${st.active}`
  for (const k of allKeys(s)) {
    if (!k.endsWith(suffix)) continue
    const base = k.slice(0, -suffix.length)
    if (!isSwappedBase(base)) continue
    try {
      const v = s.getItem(k)
      if (s.getItem(base) === null && v !== null) s.setItem(base, v)
      s.removeItem(k)
    } catch {
      /* ignore */
    }
  }
}

/**
 * Switch who is playing (null = back to the picker). All-or-nothing: on a
 * storage error nothing changes and false is returned. Fires every store's
 * change event so open screens re-read.
 */
export function switchProfile(to: string | null): boolean {
  const s = ls()
  if (!s) return false
  const st = ensureProfiles()
  if (to !== null && !st.profiles.some((p) => p.id === to)) return false
  const from = st.active
  if (from === to) return true
  const fromNs = from ?? NO_PROFILE
  const toNs = to ?? NO_PROFILE
  const keys = allKeys(s)
  const canonical = keys.filter(isSwappedBase)
  const written: string[] = []
  // 1. Stash the current child's stores (copy). Any error: undo, change nothing.
  try {
    for (const k of keys) {
      // Drop an old stash for `from` that the live data no longer has.
      if (k.endsWith(`${SEP}${fromNs}`) && isSwappedBase(k.slice(0, -(SEP.length + fromNs.length))) && !canonical.includes(k.slice(0, -(SEP.length + fromNs.length)))) {
        s.removeItem(k)
      }
    }
    if (from !== null) {
      for (const k of canonical) {
        const v = s.getItem(k)
        if (v === null) continue
        s.setItem(`${k}${SEP}${fromNs}`, v)
        written.push(`${k}${SEP}${fromNs}`)
      }
    }
  } catch {
    for (const k of written) {
      try { s.removeItem(k) } catch { /* ignore */ }
    }
    return false
  }
  // 2. Clear the live stores and bring the next child's back.
  const snapshot = new Map<string, string>()
  for (const k of canonical) {
    const v = s.getItem(k)
    if (v !== null) snapshot.set(k, v)
  }
  try {
    for (const k of canonical) s.removeItem(k)
    const suffix = `${SEP}${toNs}`
    if (to !== null) {
      for (const k of allKeys(s)) {
        if (!k.endsWith(suffix)) continue
        const base = k.slice(0, -suffix.length)
        if (!isSwappedBase(base)) continue
        const v = s.getItem(k)
        if (v !== null) s.setItem(base, v)
      }
    }
    const t = nowIso()
    const next: ProfilesState = {
      ...st,
      active: to,
      profiles: st.profiles.map((p) => (p.id === to ? { ...p, lastUsedAt: t } : p)),
    }
    if (!writeState(next)) throw new Error('state')
  } catch {
    // Roll back: live stores exactly as they were, stash of `from` dropped.
    try {
      for (const k of allKeys(s)) if (isSwappedBase(k)) s.removeItem(k)
      for (const [k, v] of snapshot) s.setItem(k, v)
      for (const k of written) s.removeItem(k)
    } catch {
      /* ignore */
    }
    return false
  }
  // 3. The next child's stash is now live: drop it.
  if (to !== null) {
    for (const k of allKeys(s)) {
      if (k.endsWith(`${SEP}${toNs}`) && isSwappedBase(k.slice(0, -(SEP.length + toNs.length)))) {
        try { s.removeItem(k) } catch { /* ignore */ }
      }
    }
  }
  // Nobody signed in: wipe whatever a guest left in the "_none" namespace.
  if (to === null || from === null) wipeNamespace(NO_PROFILE)
  announceSwitch()
  return true
}

/**
 * Removes one namespace of the PER-CHILD stores only: a `profileKey()` base
 * (PROFILE_KEY_BASES: progress, robot, Flight Recorder ghosts…) or a swapped
 * stash. It used to remove every key ending in `::<ns>`, so a store this file
 * does not own that happened to end in `::_none` was wiped by "Done" too.
 * Each child's own namespace (`::<id>`, or the plain keys of member #1) is
 * never touched here, so a child's ghosts survive "Done" and come back when
 * they sign in again (progress-backup.verify.ts checks both).
 */
function wipeNamespace(ns: string): void {
  const s = ls()
  if (!s) return
  const suffix = `${SEP}${ns}`
  for (const k of allKeys(s)) {
    if (!k.endsWith(suffix)) continue
    const base = k.slice(0, -suffix.length)
    if (!PROFILE_KEY_BASES.includes(base) && !isSwappedBase(base)) continue
    try { s.removeItem(k) } catch { /* ignore */ }
  }
}

/** "Done": clear the device for the next child (back to the picker). */
export function finishTurn(): boolean {
  ensureProfiles()
  return switchProfile(null)
}

// ── creating and editing profiles ──

export interface NewProfile {
  nickname: string
  picture?: string
  color?: string
  band?: BandId | null
  /** Picture password (emojis from PASSWORD_PICTURES), or omit for none. */
  password?: string[]
  className?: string | null
}

export type CreateResult = { ok: true; profile: KidsProfile } | { ok: false; reason: 'full' | 'name' | 'storage' }

/** Adds a profile. The caller has already run checkNickname(). Does not switch to it. */
export function createProfile(input: NewProfile): CreateResult {
  const st = ensureProfiles()
  if (st.profiles.length >= MAX_PROFILES[st.mode]) return { ok: false, reason: 'full' }
  const nickname = input.nickname.normalize('NFC').replace(/\s+/g, ' ').trim()
  if (nickname.length < 2 || nickname.length > 20) return { ok: false, reason: 'name' }
  const id = newId(st.profiles)
  const t = nowIso()
  const used = new Set(st.profiles.map((p) => p.color))
  const profile: KidsProfile = {
    id,
    nickname,
    picture: input.picture && (PROFILE_PICTURES as readonly string[]).includes(input.picture) ? input.picture : PROFILE_PICTURES[st.profiles.length % PROFILE_PICTURES.length],
    color: input.color && HEX.test(input.color) ? input.color : PROFILE_COLORS.find((c) => !used.has(c)) ?? PROFILE_COLORS[st.profiles.length % PROFILE_COLORS.length],
    band: input.band ?? null,
    pw: input.password && validPassword(input.password) ? hashPassword(id, input.password) : null,
    className: input.className ?? null,
    createdAt: t,
    lastUsedAt: t,
    pending: [],
  }
  if (!writeState({ ...st, profiles: [...st.profiles, profile] })) return { ok: false, reason: 'storage' }
  fire(KIDS_PROFILE_EVENT)
  return { ok: true, profile }
}

export function updateProfile(id: string, patch: Partial<Pick<KidsProfile, 'nickname' | 'picture' | 'color' | 'band' | 'className'>>): boolean {
  const st = ensureProfiles()
  if (!st.profiles.some((p) => p.id === id)) return false
  const ok = writeState({ ...st, profiles: st.profiles.map((p) => (p.id === id ? { ...p, ...patch } : p)) })
  if (ok) fire(KIDS_PROFILE_EVENT)
  return ok
}

export function setDeviceMode(mode: DeviceMode): void {
  const st = ensureProfiles()
  if (st.mode === mode) return
  writeState({ ...st, mode })
  fire(KIDS_PROFILE_EVENT)
}

/**
 * Removes a profile and every byte it stored on this device. The last profile
 * cannot be removed (reset its progress instead).
 */
export function removeProfile(id: string): boolean {
  const s = ls()
  let st = ensureProfiles()
  if (!s || st.profiles.length <= 1 || !st.profiles.some((p) => p.id === id)) return false
  if (st.active === id) {
    if (!switchProfile(null)) return false
    st = ensureProfiles()
  }
  for (const k of allKeys(s)) {
    if (k.endsWith(`${SEP}${id}`)) {
      try { s.removeItem(k) } catch { /* ignore */ }
    }
  }
  if (id === LEGACY_PROFILE_ID) {
    // p1 keeps every profileKey() store at the plain key (namespacedKey).
    for (const base of PROFILE_KEY_BASES) {
      try { s.removeItem(base) } catch { /* ignore */ }
    }
  }
  writeState({ ...st, profiles: st.profiles.filter((p) => p.id !== id) })
  fire(KIDS_PROFILE_EVENT)
  return true
}

// ── picture password (separates siblings and classmates; not a security boundary) ──

export function validPassword(seq: readonly string[]): boolean {
  return seq.length === PASSWORD_LENGTH && seq.every((e) => (PASSWORD_PICTURES as readonly string[]).includes(e))
}

function fnv(text: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}

/** Stored form of a picture password (the pictures are never stored as-is). */
export function hashPassword(profileId: string, seq: readonly string[]): string {
  return fnv(`r2k-pw|${profileId}|${seq.join(',')}`)
}

export function checkPassword(profileId: string, seq: readonly string[]): boolean {
  const p = getProfile(profileId)
  if (!p) return false
  if (!p.pw) return true
  return validPassword(seq) && hashPassword(profileId, seq) === p.pw
}

/** Set or clear (null) a profile's picture password. */
export function setPassword(profileId: string, seq: readonly string[] | null): boolean {
  const st = ensureProfiles()
  if (!st.profiles.some((p) => p.id === profileId)) return false
  if (seq && !validPassword(seq)) return false
  const ok = writeState({ ...st, profiles: st.profiles.map((p) => (p.id === profileId ? { ...p, pw: seq ? hashPassword(profileId, seq) : null } : p)) })
  if (ok) fire(KIDS_PROFILE_EVENT)
  return ok
}

/** Explorers (5–7) always unlock with pictures; older children only if they chose to. */
export function needsPassword(p: KidsProfile): boolean {
  return !!p.pw
}

// ── classroom: bind a class member to a device profile ──

/**
 * Called by the Join flow BEFORE the membership is saved, so the membership
 * lands in the right profile. With someone signed in, that profile is tagged
 * with the class. With nobody signed in (shared tablet), a profile is made with
 * the class nickname and switched to. Returns the profile id, or null when
 * profiles are not in use (single-child home: nothing to do).
 */
export function bindClassMember(input: { nickname: string; className: string; band: BandId | null }): string | null {
  const st = readProfilesState()
  if (!st) return null
  if (st.active) {
    const cur = getProfile(st.active, st)
    const rename = cur && /^Explorer \d+$/.test(cur.nickname)
    updateProfile(st.active, { className: input.className, ...(rename ? { nickname: input.nickname } : {}), ...(cur && !cur.band && input.band ? { band: input.band } : {}) })
    return st.active
  }
  // Same nickname already on this tablet for this class: sign them in.
  const existing = st.profiles.find((p) => p.className === input.className && p.nickname.toLowerCase() === input.nickname.toLowerCase())
  if (existing) return switchProfile(existing.id) ? existing.id : null
  const made = createProfile({ nickname: input.nickname, band: input.band, className: input.className })
  if (!made.ok) return null
  return switchProfile(made.profile.id) ? made.profile.id : null
}

/**
 * A teacher locked this child's band (classroom sync, migration 0058): the active
 * profile's band follows, so the profile picker and a later profile switch agree
 * with the progress store. No-op when profiles are not in use or it already matches.
 */
export function applyClassBandToProfile(band: BandId): boolean {
  const st = readProfilesState()
  if (!st?.active) return false
  const cur = getProfile(st.active, st)
  if (!cur || cur.band === band) return false
  return updateProfile(st.active, { band })
}

/** The child left their class: untag the active profile. */
export function unbindClassMember(): void {
  const st = readProfilesState()
  if (st?.active) updateProfile(st.active, { className: null })
}

// ── play together: credits for the partner ──

export function addTogetherCredit(profileId: string, credit: { id: string; stars: number }): boolean {
  const st = ensureProfiles()
  if (!st.profiles.some((p) => p.id === profileId)) return false
  const c: TogetherCredit = { id: credit.id.slice(0, 60), stars: Math.max(1, Math.min(3, Math.round(credit.stars))), at: nowIso() }
  return writeState({ ...st, profiles: st.profiles.map((p) => (p.id === profileId ? { ...p, pending: [...p.pending, c].slice(-20) } : p)) })
}

/** Takes (and clears) the active profile's waiting credits; the caller reports them through rewards. */
export function takeTogetherCredits(): TogetherCredit[] {
  const st = readProfilesState()
  if (!st?.active) return []
  const p = getProfile(st.active, st)
  if (!p || !p.pending.length) return []
  writeState({ ...st, profiles: st.profiles.map((x) => (x.id === p.id ? { ...x, pending: [] } : x)) })
  return p.pending
}
