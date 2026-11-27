// lib/kids/settings.ts — the R2BOT Kids device settings (one store).
//
// Settings live ONLY on this device (localStorage) — no account, nothing sent
// anywhere. Every change fires KIDS_SETTINGS_EVENT on window (and other tabs
// pick it up through the `storage` event), so any component can react.
//
// SSR-safe: on the server, and before hydration, every reader returns
// DEFAULT_KIDS_SETTINGS.
//
// Classes set on <html> while inside /kids (applyKidsSettingsToDocument, and
// KIDS_SETTINGS_BOOT_SCRIPT before first paint). CSS: components/kids/settings/kids-settings.css.
//   - `kids-large-text`    → kids text ~112% (textSize 'large' or 'larger')
//   - `kids-larger-text`   → kids text ~125% (textSize 'larger', with kids-large-text)
//   - `kids-reduce-motion` → animations and transitions cut, on top of prefers-reduced-motion
//   - `kids-lite-3d`       → informational (3D views read liteDpr()/kidsRenderHints())
//   - `kids-high-contrast` → brighter text and borders, solid surfaces, thick focus rings
//   - `kids-dyslexia`      → a plain system font stack, wider letter/word/line spacing, no italics
//   - `kids-colour-safe`   → shape/icon cues on [data-cue] and on selected/pressed/invalid controls
//   - `kids-read-aloud`    → "read everything to me" (tap text to hear it; spoken feedback)
//   - `kids-calm`          → no confetti, soft reward sounds, still celebrations
//   - `kids-scan`          → keyboard/switch scanning, big focus ring on the scanned control
//
// Access runtime: when readAloud or scanMode is on, applyKidsSettingsToDocument
// lazy-loads components/kids/settings/access-runtime.ts (tap-to-hear, spoken
// aria-live feedback, scanning). Nothing of it is in the first load otherwise.
//
// Voice (Spark speaks) is stored under the existing key used by lib/kids-voice.ts
// (`r2bot_kids_voice`), so the header's voice button and this page are one setting.

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'

export type KidsTextSize = 'normal' | 'large' | 'larger'
export type KidsScanMode = 'off' | 'step' | 'auto'
/** "More time": every game timer is multiplied by this. */
export type KidsTimeScale = 1 | 1.5 | 2
export const KIDS_TIME_SCALES: readonly KidsTimeScale[] = [1, 1.5, 2]
/** Auto-scan: seconds the highlight rests on each control. */
export const KIDS_SCAN_SPEEDS: readonly number[] = [1.5, 2.5, 4]

export interface KidsSettings {
  /** Sound effects (playSound in lib/kids-audio.ts). */
  sound: boolean
  /** Sound-effect volume, 0..1. */
  volume: number
  /** Background music (Story Theatre / episode music beds). Read with kidsMusicOn(). */
  music: boolean
  /** Spark speaks out loud (speech synthesis). Also the master switch for read-aloud. */
  voice: boolean
  /** "Read everything to me": tap any text to hear it, feedback is spoken. Needs voice. */
  readAloud: boolean
  /** Cut animations, on top of the device's prefers-reduced-motion. */
  reduceMotion: boolean
  /** Text size. */
  textSize: KidsTextSize
  /** Derived from textSize (kept for older readers): true when textSize is not 'normal'. */
  largeText: boolean
  /** Lite graphics for older phones. null = never chosen (off). */
  lite3d: boolean | null
  /** Brighter text and borders, solid surfaces. */
  highContrast: boolean
  /** Dyslexia-friendly reading: system font stack and wider spacing. */
  dyslexia: boolean
  /** Colour-blind safe cues: shapes and icons alongside colour. */
  colourSafe: boolean
  /** Calm mode: no confetti, soft reward sounds, still celebrations. */
  calm: boolean
  /** "More time": game timers multiplied by this. */
  timeScale: KidsTimeScale
  /** Untimed play: games that can run without a clock do. */
  untimed: boolean
  /** Keyboard/switch scanning. 'step': Space moves, Enter picks. 'auto': the highlight moves by itself, Space/Enter picks. */
  scanMode: KidsScanMode
  /** Auto-scan: seconds per control (one of KIDS_SCAN_SPEEDS). */
  scanSpeed: number
}

export const DEFAULT_KIDS_SETTINGS: Readonly<KidsSettings> = Object.freeze({
  sound: true,
  volume: 0.6,
  music: true,
  voice: true,
  readAloud: false,
  reduceMotion: false,
  textSize: 'normal',
  largeText: false,
  lite3d: null,
  highContrast: false,
  dyslexia: false,
  colourSafe: false,
  calm: false,
  timeScale: 1,
  untimed: false,
  scanMode: 'off',
  scanSpeed: 2.5,
})

// Keys, class names and the boot script live in a hook-free module so the server
// layout (app/kids/layout.tsx) can import the boot script without React hooks.
import {
  KIDS_CALM_CLASS,
  KIDS_COLOUR_SAFE_CLASS,
  KIDS_DYSLEXIA_CLASS,
  KIDS_HIGH_CONTRAST_CLASS,
  KIDS_LARGE_TEXT_CLASS,
  KIDS_LARGER_TEXT_CLASS,
  KIDS_LITE_3D_CLASS,
  KIDS_READ_ALOUD_CLASS,
  KIDS_REDUCE_MOTION_CLASS,
  KIDS_SCAN_CLASS,
  KIDS_SETTINGS_EVENT,
  KIDS_SETTINGS_KEY,
  KIDS_VOICE_KEY,
} from './settings-boot'
export {
  KIDS_CALM_CLASS,
  KIDS_COLOUR_SAFE_CLASS,
  KIDS_DYSLEXIA_CLASS,
  KIDS_HIGH_CONTRAST_CLASS,
  KIDS_LARGE_TEXT_CLASS,
  KIDS_LARGER_TEXT_CLASS,
  KIDS_LITE_3D_CLASS,
  KIDS_READ_ALOUD_CLASS,
  KIDS_REDUCE_MOTION_CLASS,
  KIDS_SCAN_CLASS,
  KIDS_SETTINGS_BOOT_SCRIPT,
  KIDS_SETTINGS_EVENT,
  KIDS_SETTINGS_KEY,
  KIDS_VOICE_KEY,
} from './settings-boot'

type StoredSettings = Partial<Omit<KidsSettings, 'voice'>>

function clamp01(n: number): number {
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : DEFAULT_KIDS_SETTINGS.volume
}

function readFromStorage(): KidsSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_KIDS_SETTINGS }
  let stored: StoredSettings = {}
  let voiceRaw: string | null = null
  try {
    const raw = window.localStorage.getItem(KIDS_SETTINGS_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') stored = parsed as StoredSettings
    }
    voiceRaw = window.localStorage.getItem(KIDS_VOICE_KEY)
  } catch {
    /* private mode / bad JSON: defaults */
  }
  return normalise(stored, voiceRaw !== 'false')
}

const bool = (v: unknown, d: boolean): boolean => (typeof v === 'boolean' ? v : d)

/** Fills defaults and repairs anything out of range (stored JSON is untrusted). Exported for the verify script. */
export function normalise(stored: StoredSettings, voice: boolean): KidsSettings {
  const d = DEFAULT_KIDS_SETTINGS
  const textSize: KidsTextSize =
    stored.textSize === 'normal' || stored.textSize === 'large' || stored.textSize === 'larger'
      ? stored.textSize
      : stored.largeText === true ? 'large' : 'normal'
  const timeScale: KidsTimeScale = KIDS_TIME_SCALES.includes(stored.timeScale as KidsTimeScale) ? (stored.timeScale as KidsTimeScale) : d.timeScale
  const scanMode: KidsScanMode = stored.scanMode === 'step' || stored.scanMode === 'auto' ? stored.scanMode : 'off'
  const scanSpeed = typeof stored.scanSpeed === 'number' && KIDS_SCAN_SPEEDS.includes(stored.scanSpeed) ? stored.scanSpeed : d.scanSpeed
  return {
    sound: bool(stored.sound, d.sound),
    volume: typeof stored.volume === 'number' ? clamp01(stored.volume) : d.volume,
    music: bool(stored.music, d.music),
    voice,
    readAloud: bool(stored.readAloud, d.readAloud),
    reduceMotion: bool(stored.reduceMotion, d.reduceMotion),
    textSize,
    largeText: textSize !== 'normal',
    lite3d: typeof stored.lite3d === 'boolean' ? stored.lite3d : null,
    highContrast: bool(stored.highContrast, d.highContrast),
    dyslexia: bool(stored.dyslexia, d.dyslexia),
    colourSafe: bool(stored.colourSafe, d.colourSafe),
    calm: bool(stored.calm, d.calm),
    timeScale,
    untimed: bool(stored.untimed, d.untimed),
    scanMode,
    scanSpeed,
  }
}

// A cached snapshot keeps useSyncExternalStore stable (same object until a change).
let cache: KidsSettings | null = null

/** Current settings (defaults on the server). Cheap: cached until the next change. */
export function readKidsSettings(): KidsSettings {
  if (typeof window === 'undefined') return DEFAULT_KIDS_SETTINGS as KidsSettings
  // The header's voice button (lib/kids-voice.ts) writes its key without our event:
  // re-check that one key so a cached snapshot never disagrees with it.
  if (cache) {
    let voiceRaw: string | null = null
    try { voiceRaw = window.localStorage.getItem(KIDS_VOICE_KEY) } catch { /* noop */ }
    if ((voiceRaw !== 'false') !== cache.voice) cache = null
  }
  if (!cache) cache = readFromStorage()
  return cache
}

/** Update some settings; persists, applies the <html> classes and fires KIDS_SETTINGS_EVENT. */
export function updateKidsSettings(patch: Partial<KidsSettings>): KidsSettings {
  const merged: KidsSettings = { ...readKidsSettings(), ...patch }
  // The old boolean still works as a patch: largeText true/false picks a size.
  if (patch.largeText !== undefined && patch.textSize === undefined) {
    merged.textSize = patch.largeText ? (merged.textSize === 'normal' ? 'large' : merged.textSize) : 'normal'
  }
  const next = normalise(merged, merged.voice)
  if (typeof window === 'undefined') return next
  const { voice, ...rest } = next
  try {
    window.localStorage.setItem(KIDS_SETTINGS_KEY, JSON.stringify(rest))
    window.localStorage.setItem(KIDS_VOICE_KEY, String(voice))
  } catch {
    /* noop — the setting still applies for this visit */
  }
  cache = next
  if (!voice && 'speechSynthesis' in window) window.speechSynthesis.cancel()
  applyKidsSettingsToDocument(next)
  window.dispatchEvent(new CustomEvent<KidsSettings>(KIDS_SETTINGS_EVENT, { detail: next }))
  return next
}

/** Back to defaults (keeps nothing). */
export function resetKidsSettings(): KidsSettings {
  return updateKidsSettings({ ...DEFAULT_KIDS_SETTINGS })
}

/** Subscribe to changes (this tab and other tabs). Returns an unsubscribe. */
export function subscribeKidsSettings(fn: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const onLocal = () => fn()
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === KIDS_SETTINGS_KEY || e.key === KIDS_VOICE_KEY) {
      cache = null
      applyKidsSettingsToDocument(readKidsSettings())
      fn()
    }
  }
  window.addEventListener(KIDS_SETTINGS_EVENT, onLocal)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(KIDS_SETTINGS_EVENT, onLocal)
    window.removeEventListener('storage', onStorage)
  }
}

const serverSnapshot = (): KidsSettings => DEFAULT_KIDS_SETTINGS as KidsSettings

/** React hook: the live settings (defaults during SSR and the first client render). */
export function useKidsSettings(): KidsSettings {
  return useSyncExternalStore(subscribeKidsSettings, readKidsSettings, serverSnapshot)
}

/**
 * Sets/clears the kids classes on <html>, and starts/stops the access runtime
 * (read-aloud + scanning). Call with null to remove them all (leaving /kids).
 * The kids shell calls this on every kids page (via RewardToastClient).
 */
export function applyKidsSettingsToDocument(s: KidsSettings | null): void {
  if (typeof document === 'undefined') return
  const cl = document.documentElement.classList
  cl.toggle(KIDS_LARGE_TEXT_CLASS, !!s?.largeText)
  cl.toggle(KIDS_LARGER_TEXT_CLASS, s?.textSize === 'larger')
  cl.toggle(KIDS_REDUCE_MOTION_CLASS, !!s?.reduceMotion)
  cl.toggle(KIDS_LITE_3D_CLASS, !!s?.lite3d)
  cl.toggle(KIDS_HIGH_CONTRAST_CLASS, !!s?.highContrast)
  cl.toggle(KIDS_DYSLEXIA_CLASS, !!s?.dyslexia)
  cl.toggle(KIDS_COLOUR_SAFE_CLASS, !!s?.colourSafe)
  cl.toggle(KIDS_READ_ALOUD_CLASS, !!s?.readAloud && !!s?.voice)
  cl.toggle(KIDS_CALM_CLASS, !!s?.calm)
  cl.toggle(KIDS_SCAN_CLASS, !!s && s.scanMode !== 'off')
  syncAccessRuntime(s)
}

// The runtime is code-split: loaded only once read-aloud or scanning is switched on.
type AccessRuntime = typeof import('@/components/kids/settings/access-runtime')
let runtime: Promise<AccessRuntime> | null = null
function syncAccessRuntime(s: KidsSettings | null): void {
  const wanted = !!s && ((s.readAloud && s.voice) || s.scanMode !== 'off')
  if (!wanted) {
    if (runtime) void runtime.then((m) => m.stopAccessRuntime()).catch(() => undefined)
    return
  }
  if (!runtime) runtime = import('@/components/kids/settings/access-runtime')
  void runtime.then((m) => m.startAccessRuntime()).catch(() => { runtime = null })
}

// ─── Motion ────────────────────────────────────────────────────────────────

function systemPrefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Non-React: true when the device asks for reduced motion OR the kids setting is on. */
export function kidsReducedMotion(): boolean {
  return systemPrefersReducedMotion() || readKidsSettings().reduceMotion
}

/** React hook: reduce motion (device preference OR the kids setting). False during SSR. */
export function useKidsReducedMotion(): boolean {
  const { reduceMotion } = useKidsSettings()
  const [system, setSystem] = useState(false)
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setSystem(mq.matches)
    const on = () => setSystem(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return reduceMotion || system
}

// ─── Lite 3D ───────────────────────────────────────────────────────────────

/** True when the device looks like an older/low-power phone. A suggestion only — never applied by itself. */
export function suggestLite3D(): boolean {
  if (typeof navigator === 'undefined') return false
  const cores = navigator.hardwareConcurrency
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  return (typeof cores === 'number' && cores > 0 && cores <= 4) || (typeof memory === 'number' && memory > 0 && memory <= 3)
}

/** Non-React: Lite graphics chosen on this device. */
export function kidsLite3D(): boolean {
  return readKidsSettings().lite3d === true
}

/** React hook: Lite graphics chosen on this device (false during SSR). */
export function useKidsLite3D(): boolean {
  return useKidsSettings().lite3d === true
}

/** Pixel ratio for a WebGL renderer: 1 in Lite mode, else the device's, capped at `max` (default 2). */
export function liteDpr(max = 2): number {
  const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1
  return kidsLite3D() ? 1 : Math.min(max, dpr)
}

export interface KidsRenderHints {
  /** Use with renderer.setPixelRatio(). */
  dpr: number
  /** Pass to new WebGLRenderer({ antialias }). */
  antialias: boolean
  /** Whether to enable shadow maps / castShadow. */
  shadows: boolean
}

/** Everything a three.js view needs to honour Lite graphics. */
export function kidsRenderHints(max = 2): KidsRenderHints {
  const lite = kidsLite3D()
  return { dpr: liteDpr(max), antialias: !lite, shadows: !lite }
}

// ─── Calm, music and time (roadmap #89 / #25) ──────────────────────────────

/** Non-React: calm mode (no confetti, soft reward sounds). Canvas effects (episode fx, ceremonies) read this. */
export function kidsCalm(): boolean {
  return readKidsSettings().calm
}

/** React hook: calm mode (false during SSR). */
export function useKidsCalm(): boolean {
  return useKidsSettings().calm
}

/** Non-React: background music allowed (the music switch). Sound effects are a separate switch. */
export function kidsMusicOn(): boolean {
  const s = readKidsSettings()
  return s.music && s.volume > 0
}

export interface KidsTime {
  /** Multiplier for every timer (1, 1.5 or 2). */
  scale: KidsTimeScale
  /** Untimed play: run without a clock when the game can. */
  untimed: boolean
  /**
   * A game's time limit in the same unit it was given (seconds or ms), after
   * "more time". Infinity when untimed, so `t >= limit` never fires.
   */
  limit: (base: number) => number
}

function timeFrom(s: KidsSettings): KidsTime {
  const scale = s.timeScale
  const untimed = s.untimed
  return { scale, untimed, limit: (base: number) => (untimed ? Infinity : base * scale) }
}

/** Non-React: the "more time" settings. Read when a round starts. */
export function kidsTime(): KidsTime {
  return timeFrom(readKidsSettings())
}

/** Non-React shorthand: kidsTime().limit(base). */
export function kidsTimeLimit(base: number): number {
  return kidsTime().limit(base)
}

/** React hook: the "more time" settings (1× and timed during SSR). */
export function useKidsTime(): KidsTime {
  const s = useKidsSettings()
  return useMemo(() => timeFrom(s), [s])
}
