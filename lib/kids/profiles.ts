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
// HOW DATA IS KEPT APART — one mechanism, one rule:
//
// Every per-child store asks profileKey(base) for its key (`PROFILE_KEY_BASES`,
// and `PROFILE_KEY_PREFIXES` for stores with one key per item, e.g. a Code Lab
// draft per mission). Member #1 ('p1', the child who used this device before
// profiles existed) keeps the ORIGINAL key, so turning profiles on moves no
// data and cannot lose any. Every other profile uses `<base>::<profileId>`.
// With no one signed in (shared tablet between children) the key is
// `<base>::_none`, which "Done" and the next sign-in wipe (see wipeNamespace).
// A switch only changes `active`: no data is copied, so it is instant.
//
// Until 28 Nov 2026 a second mechanism SWAPPED some stores (Skill Galaxy,
// course, hangar looks, class membership, Vision/Think labs, Code Lab drafts,
// game-seen and world flags): the ACTIVE child's data sat at the plain key and
// the others' at `<key>::<id>`. Those stores now call profileKey() too.
// migrateSwappedLayout() moves a device that still has the old layout, once,
// before any store is read (readProfilesState runs it): the playing child's
// data goes to their own namespace and member #1's comes back to the plain key.
// `LEGACY_SWAPPED_*` lists those stores for the migration only.
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
 * progress-backup.verify.ts (the profile-key check) fails CI if a profileKey()
 * call site uses a base that is not listed (or, for a per-item key, a prefix
 * not in PROFILE_KEY_PREFIXES).
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
  // Swapped until 28 Nov 2026 (see migrateSwappedLayout):
  'r2bot_kids_activities_v1', // Skill Galaxy done map (lib/kids/activities/progress.ts)
  'r2bot_kids_course_v1', // course state (components/kids/course/course-state.ts)
  'r2bot_kids_build_day', // once-a-day build reward (lib/kids/universe/rewards.ts)
  'r2bot_kids_class_v1', // class membership token (lib/kids/classroom-membership-store.ts)
  'r2bot_kids_class_missions_v1', // cached teacher missions (lib/kids/classroom-membership.ts)
  'r2bot_kids_class_powerup_v1', // cached Class Power-Up (lib/kids/classroom-membership.ts)
  'r2bot_kids_hangar_v1', // hangar looks (components/kids/hangar/cosmetics.ts)
  'r2bot_kids_onboarded', // universe intro seen (components/kids/universe/universe-state.ts)
  'r2bot_kids_spark_reward_day', // Ask Spark daily reward (components/kids/ai/spark/SparkSheetClient.tsx)
  'r2bot_kids_vision_v1', // Vision Lab missions done (lib/kids/ai/vision/missions.ts)
]

/**
 * Per-child stores with one key per item (`<prefix><item>`, e.g. one Code Lab
 * draft per mission): profileKey(`<prefix>${item}`). Member #1 keeps the plain
 * keys, so removeProfile('p1') deletes every plain key with one of these prefixes.
 */
export const PROFILE_KEY_PREFIXES: readonly string[] = [
  'r2bot_think_', // How Robots Think labs done (lib/kids/ai/think/common.ts)
  'r2bot_kids_codelab_draft_', // Code Lab drafts (components/kids/codelab/MissionClient.tsx)
  'r2bot_game_seen_', // game intro seen (components/kids/ui/GameShellClient.tsx)
  'r2bot_world_complete_', // World finished flags (components/kids/worlds/*)
]

/**
 * The stores the retired swap mechanism moved on every switch (before 28 Nov
 * 2026). Read ONLY by migrateSwappedLayout(); every one of them is now a
 * profileKey() store (listed above). Exported for the verify script.
 */
export const LEGACY_SWAPPED_KEYS: readonly string[] = [
  'r2bot_kids_activities_v1',
  'r2bot_kids_course_v1',
  'r2bot_kids_build_day',
  'r2bot_kids_class_v1',
  'r2bot_kids_class_missions_v1',
  'r2bot_kids_class_powerup_v1',
  'r2bot_kids_hangar_v1',
  'r2bot_kids_onboarded',
  'r2bot_kids_spark_reward_day',
  'r2bot_kids_vision_v1',
]
export const LEGACY_SWAPPED_PREFIXES: readonly string[] = PROFILE_KEY_PREFIXES

/** Set once the device's stores are in the one-mechanism layout (see migrateSwappedLayout). */
export const LAYOUT_KEY = 'r2bot_kids_profiles_layout'
const LAYOUT_VERSION = '2'

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

/** A per-child base: listed in PROFILE_KEY_BASES or starting with a PROFILE_KEY_PREFIXES entry. */
export function isProfileBase(key: string): boolean {
  if (key.includes(SEP)) return false
  return PROFILE_KEY_BASES.includes(key) || PROFILE_KEY_PREFIXES.some((p) => key.startsWith(p) && key.length > p.length)
}

function isLegacySwappedBase(key: string): boolean {
  if (key.includes(SEP)) return false
  return LEGACY_SWAPPED_KEYS.includes(key) || LEGACY_SWAPPED_PREFIXES.some((p) => key.startsWith(p) && key.length > p.length)
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

function parseState(raw: string | null): ProfilesState | null {
  if (!raw) return null
  try {
    const o = JSON.parse(raw) as Record<string, unknown>
    const profiles = Array.isArray(o.profiles) ? o.profiles.map(cleanProfile).filter((p): p is KidsProfile => !!p) : []
    const seen = new Set<string>()
    const unique = profiles.filter((p) => !seen.has(p.id) && (seen.add(p.id), true))
    const active = typeof o.active === 'string' && unique.some((p) => p.id === o.active) ? o.active : null
    return { v: 1, mode: o.mode === 'shared' ? 'shared' : 'home', active, profiles: unique }
  } catch {
    return null
  }
}

function readStateRaw(s: Storage): ProfilesState | null {
  try {
    return parseState(s.getItem(PROFILES_KEY))
  } catch {
    return null
  }
}

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
  if (cache && cache.raw === raw) {
    if (cache.state) ensureLayout(s, cache.state)
    return cache.state
  }
  const state = parseState(raw)
  cache = { raw, state }
  if (state) ensureLayout(s, state)
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

/** Set only inside withProfile(): profileKey() answers for this profile instead of the player. */
let override: { id: string | null } | null = null

/** THE key for a per-child store, for whoever is playing now. */
export function profileKey(base: string): string {
  const active = activeProfileId() // also runs the one-time layout migration
  return namespacedKey(base, override ? override.id : active)
}

/**
 * Where a per-child store of `profileId` lives. Since every per-child store
 * uses profileKey() this is namespacedKey(); kept for the readers that ask a
 * named profile's data (parent hub, Robodex), and it makes sure the one-time
 * layout migration has run first.
 */
export function storageKeyFor(base: string, profileId: string | null): string {
  readProfilesState()
  return namespacedKey(base, profileId)
}

/**
 * Runs `fn` with profileKey() answering for `profileId` instead of whoever is
 * playing, so a store's own reader/writer can serve one named profile (the
 * parent hub's per-profile backup code: builds, portfolio, Robodex, looks).
 * Synchronous only: `fn` must not await. Always restored, even if `fn` throws.
 */
export function withProfile<T>(profileId: string | null, fn: () => T): T {
  const prev = override
  override = { id: profileId }
  try {
    return fn()
  } finally {
    override = prev
  }
}

// ── one-time move from the retired swap layout ──

function ensureLayout(s: Storage, st: ProfilesState): void {
  try {
    if (s.getItem(LAYOUT_KEY) === LAYOUT_VERSION) return
  } catch {
    return
  }
  migrateSwappedLayout(s, st)
}

function markLayout(s: Storage): void {
  s.setItem(LAYOUT_KEY, LAYOUT_VERSION)
}

/**
 * Moves the stores the retired swap mechanism kept (LEGACY_SWAPPED_*) into
 * the profileKey() layout. Under the swap the plain key held the PLAYING
 * child's copy (or a guest's, with nobody signed in) and every other child's
 * sat at `<key>::<id>`, member #1's included. After it: member #1's copy is at
 * the plain key, every other child's (and a guest's: `::_none`) at their own
 * namespace. Nobody's data is merged with anybody else's, nothing is dropped.
 * All-or-nothing: on a storage error every key is put back and the marker is
 * not set, so the next read tries again. Runs once (LAYOUT_KEY); a second run
 * is a no-op. Exported for the verify script; readers never call it.
 */
export function migrateSwappedLayout(s: Storage | null = ls(), st: ProfilesState | null = null): boolean {
  if (!s) return false
  try {
    if (s.getItem(LAYOUT_KEY) === LAYOUT_VERSION) return true
  } catch {
    return false
  }
  const state = st ?? readStateRaw(s)
  if (!state) return false
  // Three phases, in this order, so a run cut short (and not rolled back) can
  // safely run again: 1. copy each playing child's data home, 2. put member
  // #1's copy at the plain key, 3. drop member #1's old `::p1` copy.
  const home = new Map<string, string>()
  const plain = new Map<string, string | null>()
  const drop: string[] = []
  const bases = new Set<string>()
  for (const k of allKeys(s)) {
    const i = k.indexOf(SEP)
    const base = i < 0 ? k : k.slice(0, i)
    if (isLegacySwappedBase(base)) bases.add(base)
  }
  const get = (k: string): string | null => {
    try {
      return s.getItem(k)
    } catch {
      return null
    }
  }
  const legacy = `${SEP}${LEGACY_PROFILE_ID}`
  for (const base of bases) {
    const live = get(base)
    const p1 = get(`${base}${legacy}`)
    if (state.active === LEGACY_PROFILE_ID) {
      // Member #1 is playing: the plain key is already theirs. A leftover
      // `::p1` copy means a switch was interrupted; the live copy wins.
      if (p1 !== null) {
        if (live === null) plain.set(base, p1)
        drop.push(`${base}${legacy}`)
      }
      continue
    }
    // The plain key holds the playing child's (or the guest's) copy: move it home.
    const ownKey = `${base}${SEP}${state.active ?? NO_PROFILE}`
    // live === p1 with a copy already home: phase 2 ran for this key before
    // (an earlier run was cut short); the plain key is member #1's already.
    if (live !== null && !(live === p1 && get(ownKey) !== null)) home.set(ownKey, live)
    // Member #1's copy comes back to the plain key (none: the plain key is emptied).
    plain.set(base, p1)
    if (p1 !== null) drop.push(`${base}${legacy}`)
  }
  const touched = new Set<string>([...home.keys(), ...plain.keys(), ...drop])
  const before = new Map<string, string | null>()
  for (const k of touched) before.set(k, get(k))
  try {
    for (const [k, v] of home) s.setItem(k, v)
    for (const [k, v] of plain) {
      if (v === null) s.removeItem(k)
      else s.setItem(k, v)
    }
    for (const k of drop) s.removeItem(k)
    markLayout(s)
    return true
  } catch {
    // Put member #1's and the plain keys back. The copies made home in phase 1
    // stay: they equal the live data, so the next run rewrites them unchanged,
    // and if this rollback itself fails part-way, they are what keeps the
    // playing child's data safe (see the `live === p1` guard above).
    for (const k of [...plain.keys(), ...drop]) {
      const v = before.get(k) ?? null
      try {
        if (v === null) s.removeItem(k)
        else s.setItem(k, v)
      } catch {
        /* ignore */
      }
    }
    return false
  }
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
  if (cur) return cur
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
  // A device that turns profiles on now starts in the one-mechanism layout:
  // nothing to migrate (member #1 keeps every plain key).
  const ls0 = ls()
  try {
    ls0?.setItem(LAYOUT_KEY, LAYOUT_VERSION)
  } catch {
    /* the migration is a no-op for member #1 anyway */
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

// ── switching ──

/**
 * Switch who is playing (null = back to the picker). Every per-child store is
 * keyed by profileKey(), so nothing is copied: only `active` changes, which is
 * one write (instant, and nothing to roll back). Fires every store's change
 * event so open screens re-read.
 */
export function switchProfile(to: string | null): boolean {
  const s = ls()
  if (!s) return false
  const st = ensureProfiles()
  if (to !== null && !st.profiles.some((p) => p.id === to)) return false
  const from = st.active
  if (from === to) return true
  const t = nowIso()
  const next: ProfilesState = {
    ...st,
    active: to,
    profiles: st.profiles.map((p) => (p.id === to ? { ...p, lastUsedAt: t } : p)),
  }
  if (!writeState(next)) return false
  // Nobody signed in: wipe whatever a guest left in the "_none" namespace.
  if (to === null || from === null) wipeNamespace(NO_PROFILE)
  announceSwitch()
  return true
}

/**
 * Removes one namespace of the PER-CHILD stores only: a `profileKey()` base
 * (PROFILE_KEY_BASES: progress, robot, Flight Recorder ghosts…, or a
 * PROFILE_KEY_PREFIXES per-item key). It used to remove every key ending in `::<ns>`, so a store this file
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
    if (!isProfileBase(base)) continue
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
    for (const k of allKeys(s)) {
      if (!isProfileBase(k)) continue
      try { s.removeItem(k) } catch { /* ignore */ }
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
