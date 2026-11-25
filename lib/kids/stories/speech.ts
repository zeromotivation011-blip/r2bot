// lib/kids/stories/speech.ts
// Browser-only voice for the Story Theatre. Each character gets its own pitch,
// rate and (where the device has several) its own voice. Respects the global
// Robot World mute: localStorage r2bot_kids_voice === 'false' means muted.
// Call only from client components.

import type { SpeakerId } from './types'
import { CAST } from './cast'

const VOICE_KEY = 'r2bot_kids_voice'

export function isVoiceMuted(): boolean {
  if (typeof window === 'undefined') return true
  try {
    return window.localStorage.getItem(VOICE_KEY) === 'false'
  } catch {
    return false
  }
}

export function speechAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'
}

let voices: SpeechSynthesisVoice[] = []
const assigned = new Map<SpeakerId, SpeechSynthesisVoice | null>()

function loadVoices() {
  if (!speechAvailable()) return
  const all = window.speechSynthesis.getVoices()
  if (all.length) {
    voices = all.filter((v) => /^en/i.test(v.lang))
    assigned.clear()
  }
}

/** Call once on mount: voices load asynchronously in Chrome. */
export function warmVoices(): () => void {
  if (!speechAvailable()) return () => {}
  loadVoices()
  const onChange = () => loadVoices()
  window.speechSynthesis.addEventListener?.('voiceschanged', onChange)
  return () => window.speechSynthesis.removeEventListener?.('voiceschanged', onChange)
}

const FEMALE = /female|samantha|karen|moira|tessa|victoria|zira|susan|serena|fiona|veena|heera|aria|jenny|libby|sonia|natasha/i
const MALE = /\bmale\b|daniel|alex|fred|rishi|david|mark|george|guy|ryan|thomas|oliver/i

function pickVoice(who: SpeakerId): SpeechSynthesisVoice | null {
  if (assigned.has(who)) return assigned.get(who) ?? null
  if (!voices.length) return null
  const want = CAST[who].voice.prefer
  const pool = want === 'female' ? voices.filter((v) => FEMALE.test(v.name)) : want === 'male' ? voices.filter((v) => MALE.test(v.name) && !FEMALE.test(v.name)) : []
  // Spread "any" characters across the device's voices so they sound different.
  const order: SpeakerId[] = ['narrator', 'spark', 'bolt', 'zippy', 'rover', 'amara', 'lucia']
  const idx = Math.max(0, order.indexOf(who))
  const local = voices.filter((v) => v.localService)
  const base = local.length ? local : voices
  const v = pool.length ? pool[idx % pool.length] : who === 'narrator' ? (voices.find((x) => x.default) ?? base[0]) : base[idx % base.length]
  assigned.set(who, v ?? null)
  return v ?? null
}

export interface SpeakHandle {
  cancel: () => void
}

/**
 * Speak a line in a character's voice. `onBoundary` fires on each word where
 * the browser supports it (drives the mouth). `onEnd` fires exactly once,
 * including on error, cancel-by-browser, or when the browser forgets to fire
 * `end` (a long-standing Chrome bug) — a safety timer covers that.
 */
export function speakLine(
  who: SpeakerId,
  text: string,
  expectedMs: number,
  onEnd: () => void,
  onBoundary?: () => void,
): SpeakHandle {
  let done = false
  let timer: ReturnType<typeof setTimeout> | null = null
  const finish = () => {
    if (done) return
    done = true
    if (timer) clearTimeout(timer)
    onEnd()
  }
  if (!speechAvailable()) {
    timer = setTimeout(finish, expectedMs)
    return { cancel: () => { done = true; if (timer) clearTimeout(timer) } }
  }
  const synth = window.speechSynthesis
  synth.cancel()
  const u = new SpeechSynthesisUtterance(text)
  const profile = CAST[who].voice
  u.pitch = profile.pitch
  u.rate = profile.rate
  u.volume = 1
  const v = pickVoice(who)
  if (v) {
    u.voice = v
    u.lang = v.lang
  } else {
    u.lang = 'en-GB'
  }
  u.onend = finish
  u.onerror = finish
  if (onBoundary) u.onboundary = () => onBoundary()
  // Safety net: generous, so slow voices are never cut off.
  timer = setTimeout(finish, expectedMs * 2.2 + 3000)
  synth.speak(u)
  // Chrome sometimes starts paused after a cancel().
  if (synth.paused) synth.resume()
  return {
    cancel: () => {
      done = true
      if (timer) clearTimeout(timer)
      try { synth.cancel() } catch { /* noop */ }
    },
  }
}

export function stopSpeech(): void {
  if (speechAvailable()) {
    try { window.speechSynthesis.cancel() } catch { /* noop */ }
  }
}
