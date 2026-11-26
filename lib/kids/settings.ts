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
// KIDS_SETTINGS_BOOT_SCRIPT before first paint):
//   - `kids-large-text`   → kids text scaled to ~112% (CSS in components/kids/settings/kids-settings.css)
//   - `kids-reduce-motion` → animations and transitions cut, on top of prefers-reduced-motion
//   - `kids-lite-3d`       → informational (3D views read liteDpr()/kidsRenderHints())
//
// Voice (Spark speaks) is stored under the existing key used by lib/kids-voice.ts
// (`r2bot_kids_voice`), so the header's voice button and this page are one setting.

import { useEffect, useState, useSyncExternalStore } from 'react'

export interface KidsSettings {
  /** Sound effects (playSound in lib/kids-audio.ts). */
  sound: boolean
  /** Sound-effect volume, 0..1. */
  volume: number
  /** Spark speaks out loud (speech synthesis). */
  voice: boolean
  /** Cut animations, on top of the device's prefers-reduced-motion. */
  reduceMotion: boolean
  /** Scale kids text to ~112%. */
  largeText: boolean
  /** Lite graphics for older phones. null = never chosen (off). */
  lite3d: boolean | null
}

export const DEFAULT_KIDS_SETTINGS: Readonly<KidsSettings> = Object.freeze({
  sound: true,
  volume: 0.6,
  voice: true,
  reduceMotion: false,
  largeText: false,
  lite3d: null,
})

// Keys, class names and the boot script live in a hook-free module so the server
// layout (app/kids/layout.tsx) can import the boot script without React hooks.
import {
  KIDS_LARGE_TEXT_CLASS,
  KIDS_LITE_3D_CLASS,
  KIDS_REDUCE_MOTION_CLASS,
  KIDS_SETTINGS_EVENT,
  KIDS_SETTINGS_KEY,
  KIDS_VOICE_KEY,
} from './settings-boot'
export {
  KIDS_LARGE_TEXT_CLASS,
  KIDS_LITE_3D_CLASS,
  KIDS_REDUCE_MOTION_CLASS,
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
  const d = DEFAULT_KIDS_SETTINGS
  return {
    sound: typeof stored.sound === 'boolean' ? stored.sound : d.sound,
    volume: typeof stored.volume === 'number' ? clamp01(stored.volume) : d.volume,
    voice: voiceRaw !== 'false',
    reduceMotion: typeof stored.reduceMotion === 'boolean' ? stored.reduceMotion : d.reduceMotion,
    largeText: typeof stored.largeText === 'boolean' ? stored.largeText : d.largeText,
    lite3d: typeof stored.lite3d === 'boolean' ? stored.lite3d : null,
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
  const next: KidsSettings = { ...readKidsSettings(), ...patch }
  next.volume = clamp01(next.volume)
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

/** Sets/clears the kids classes on <html>. Call with null to remove them all (leaving /kids). */
export function applyKidsSettingsToDocument(s: KidsSettings | null): void {
  if (typeof document === 'undefined') return
  const cl = document.documentElement.classList
  cl.toggle(KIDS_LARGE_TEXT_CLASS, !!s?.largeText)
  cl.toggle(KIDS_REDUCE_MOTION_CLASS, !!s?.reduceMotion)
  cl.toggle(KIDS_LITE_3D_CLASS, !!s?.lite3d)
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
