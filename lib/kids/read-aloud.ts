// lib/kids/read-aloud.ts — "Read everything to me" (roadmap #25).
//
// One small speech engine for reading text aloud, separate from Spark's
// character voice (sparkSays in lib/kids-audio.ts): a clear, natural voice at
// an easy pace. Everything respects the kids Settings store:
//   - voice off (Settings or the header speaker button) → silent, always;
//   - speakFeedback() speaks only when "Read everything to me" is on.
// Browser-only at call time; safe to import anywhere (no work at import).
//
// THE CONVENTION (how a page takes part):
//   1. Text blocks: any <p>, heading, <li>, <label>, caption or table cell is
//      already readable — in read-aloud mode a tap on it reads it. Mark other
//      blocks with `data-read-aloud` (reads the block's text) or
//      `data-read-aloud="Exactly this sentence"` (reads the given text, e.g.
//      for an emoji-only tile). `data-read-aloud="off"` opts a subtree out
//      (a canvas game, a typing box, a timer that ticks).
//   2. Options and buttons: their accessible name (aria-label, else the text)
//      is read when tapped, or without pressing when held for half a second,
//      or when a keyboard/switch scan lands on them.
//   3. Feedback: anything a page already announces in an aria-live region or
//      role="status"/"alert" (FeedbackCard in every Galaxy template does) is
//      spoken automatically. For feedback that is not in a live region, call
//      speakFeedback('Great — the motor turns!').
//   4. A visible speaker button for a block: <ReadAloud> in
//      components/kids/settings/ReadAloudClient.tsx (works even when the mode
//      is off, as long as voice is on — the Explorers' "hear it" button).
// The runtime that wires 1–3 to taps, holds and live regions is
// components/kids/settings/access-runtime.ts; lib/kids/settings.ts loads it only
// when read-aloud or scanning is switched on.

import { readKidsSettings } from './settings'

const NATURAL = /natural|neural|premium|enhanced|online|siri/i
const GOOD = /google|samantha|daniel|serena|karen|moira|tessa|libby|sonia|ryan|aria|jenny|guy/i

export function readAloudSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'
}

/** Voice on (the master speech switch). */
export function readAloudVoiceOn(): boolean {
  return readKidsSettings().voice
}

/** "Read everything to me" is on (and voice is on). */
export function readAloudModeOn(): boolean {
  const s = readKidsSettings()
  return s.readAloud && s.voice
}

/** Best voice for the page's language: natural/neural voices first. */
function pickVoice(lang: string): SpeechSynthesisVoice | null {
  if (!readAloudSupported()) return null
  const base = lang.slice(0, 2).toLowerCase()
  const all = window.speechSynthesis.getVoices()
  const same = all.filter((v) => v.lang.toLowerCase().startsWith(base))
  const pool = same.length ? same : all.filter((v) => /^en([-_]|$)/i.test(v.lang))
  if (!pool.length) return null
  const score = (v: SpeechSynthesisVoice) => (NATURAL.test(v.name) ? 4 : 0) + (GOOD.test(v.name) ? 2 : 0) + (v.localService ? 0 : 1)
  return [...pool].sort((a, b) => score(b) - score(a))[0] ?? null
}

/** Tidies text for speech: emoji and arrows out, whitespace collapsed, capped in length. */
export function speakableText(raw: string, max = 600): string {
  const t = raw
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/gu, ' ')
    .replace(/[■□▶◀▲▼•·…]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (t.length <= max) return t
  const cut = t.slice(0, max)
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '))
  return end > max / 2 ? cut.slice(0, end + 1) : cut
}

let current: { stop: () => void } | null = null

export interface SpeakOptions {
  /** Called when the speech ends, fails, or is replaced. */
  onEnd?: () => void
  /** Element to mark with `kids-reading` (a cyan outline) while it is read. */
  highlight?: Element | null
  /** Speak even when read-aloud mode is off (a deliberate "hear it" button). Voice must still be on. Default true. */
  always?: boolean
}

/**
 * Reads text aloud now, replacing anything this engine is saying. Silent (and
 * onEnd runs at once) when voice is off, speech is unsupported or text is empty.
 * Returns a stop function.
 */
export function readAloud(text: string, opts: SpeakOptions = {}): () => void {
  const clean = speakableText(text)
  const allowed = opts.always === false ? readAloudModeOn() : readAloudVoiceOn()
  if (!clean || !allowed || !readAloudSupported()) {
    opts.onEnd?.()
    return () => undefined
  }
  stopReadAloud()
  const synth = window.speechSynthesis
  synth.cancel()
  const lang = (typeof document !== 'undefined' && document.documentElement.lang) || (typeof navigator !== 'undefined' && navigator.language) || 'en'
  const u = new SpeechSynthesisUtterance(clean)
  const v = pickVoice(lang)
  if (v) {
    u.voice = v
    u.lang = v.lang
  } else {
    u.lang = lang
  }
  // Natural voices sound right at normal speed; robotic ones are clearer a little slower.
  u.rate = v && NATURAL.test(v.name) ? 0.95 : 0.88
  u.pitch = 1
  const el = opts.highlight ?? null
  el?.classList.add('kids-reading')
  let ended = false
  const end = () => {
    if (ended) return
    ended = true
    el?.classList.remove('kids-reading')
    if (current === handle) current = null
    opts.onEnd?.()
  }
  u.onend = end
  u.onerror = end
  const handle = {
    stop: () => {
      if (ended) return
      try { synth.cancel() } catch { /* ignore */ }
      end()
    },
  }
  current = handle
  synth.speak(u)
  if (synth.paused) synth.resume()
  // Some engines never fire onend for very short strings: unmark after a generous estimate.
  window.setTimeout(end, 1500 + clean.length * 90)
  return handle.stop
}

/** Stops whatever this engine is reading. */
export function stopReadAloud(): void {
  current?.stop()
  current = null
}

/**
 * Spoken feedback for a result ("Yes! The robot reached the flag."). Speaks only
 * in read-aloud mode; a no-op otherwise, so templates can call it freely.
 */
export function speakFeedback(text: string): void {
  if (!readAloudModeOn()) return
  readAloud(text, { always: false })
}

/** The accessible name a screen reader would use, approximately: aria-label, aria-labelledby, alt, then text. */
export function accessibleName(el: Element): string {
  const label = el.getAttribute('aria-label')
  if (label) return label
  const by = el.getAttribute('aria-labelledby')
  if (by) {
    const t = by
      .split(/\s+/)
      .map((id) => el.ownerDocument.getElementById(id)?.textContent ?? '')
      .join(' ')
      .trim()
    if (t) return t
  }
  if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
    const lab = el.labels?.[0]?.textContent ?? ''
    const val = el instanceof HTMLInputElement && el.type === 'range' ? `${el.getAttribute('aria-valuetext') ?? el.value}` : ''
    return `${lab} ${val}`.trim() || el.getAttribute('placeholder') || ''
  }
  if (el instanceof HTMLImageElement) return el.alt
  return visibleText(el)
}

/**
 * Text of an element, skipping aria-hidden parts (decorative emoji) but keeping
 * sr-only text. `skipControls` leaves out buttons and links inside it (a
 * feedback card's "Try again" is not part of the feedback).
 */
export function visibleText(el: Element, opts: { skipControls?: boolean } = {}): string {
  let out = ''
  const walk = (n: Node) => {
    if (n.nodeType === Node.TEXT_NODE) {
      out += n.textContent ?? ''
      return
    }
    if (!(n instanceof Element)) return
    if (n.getAttribute('aria-hidden') === 'true' || n.tagName === 'SCRIPT' || n.tagName === 'STYLE') return
    if (opts.skipControls && n !== el && /^(BUTTON|A|INPUT|SELECT|TEXTAREA)$/.test(n.tagName)) return
    const alt = n instanceof HTMLImageElement ? n.alt : ''
    if (alt) out += ` ${alt} `
    n.childNodes.forEach(walk)
    if (/^(P|DIV|LI|H[1-6]|BR|TD|TH|DT|DD|LABEL|BUTTON)$/.test(n.tagName)) out += ' '
  }
  walk(el)
  return out.replace(/\s+/g, ' ').trim()
}
