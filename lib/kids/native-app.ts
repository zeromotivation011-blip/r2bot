// lib/kids/native-app.ts — saving, sharing, printing and speech inside the R2BOT Kids app.
//
// An Android WebView quietly drops what a browser does for a page: an
// <a download href="blob:…"> click saves nothing, window.print() prints nothing,
// navigator.share does not exist and speechSynthesis has no voice. The app's
// native plugin (apps/kids-mobile/android/…/KidsNativePlugin.java, "KidsNative")
// does each of these on the phone, and this file is the only way to reach it.
//
//   saveBlob(blob, name)   → 'saved' (Downloads › R2BOT Kids) | 'shared' (share sheet
//                             opened, Android 7–9) | 'downloaded' (a browser download) | 'failed'
//   installKidsNativeShims() (standalone app only, components/kids/app/KidsNativeShimsClient.tsx):
//     window.print → the system print service; navigator.share/canShare → the share
//     sheet; speechSynthesis + SpeechSynthesisUtterance → the phone's text-to-speech.
//
// On the website (and in the app's headless tests, where there is no native
// plugin) nothing changes: saveBlob is the same anchor download it always was.

import { KIDS_STANDALONE } from './app-context'

export const KIDS_NATIVE_PLUGIN = 'KidsNative'

interface CapacitorBridge {
  PluginHeaders?: { name: string }[]
  nativePromise?: (plugin: string, method: string, options?: Record<string, unknown>) => Promise<unknown>
}

function capacitor(): CapacitorBridge | null {
  if (typeof window === 'undefined') return null
  const cap = (window as Window & { Capacitor?: CapacitorBridge }).Capacitor
  return cap && typeof cap === 'object' ? cap : null
}

/** True inside the standalone app when the native plugin is there (never on the website). */
export function hasKidsNative(): boolean {
  if (!KIDS_STANDALONE) return false
  const cap = capacitor()
  return !!cap && typeof cap.nativePromise === 'function' && !!cap.PluginHeaders?.some((h) => h.name === KIDS_NATIVE_PLUGIN)
}

async function callNative<T>(method: string, options: Record<string, unknown> = {}): Promise<T> {
  const cap = capacitor()
  if (!cap?.nativePromise) throw new Error('No native bridge')
  return (await cap.nativePromise(KIDS_NATIVE_PLUGIN, method, options)) as T
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer())
  let bin = ''
  const step = 0x8000
  for (let i = 0; i < buf.length; i += step) bin += String.fromCharCode(...buf.subarray(i, i + step))
  return window.btoa(bin)
}

/** A data: URL (e.g. canvas.toDataURL()) as a Blob. */
export function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(',')
  const head = dataUrl.slice(0, comma)
  const body = dataUrl.slice(comma + 1)
  const mime = /^data:([^;,]+)/.exec(head)?.[1] ?? 'application/octet-stream'
  if (!/;base64$/i.test(head)) return new Blob([decodeURIComponent(body)], { type: mime })
  const bin = window.atob(body)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

export type SaveResult = 'saved' | 'shared' | 'downloaded' | 'failed'

/** The browser way: an anchor download (what the website has always done). */
function anchorDownload(blob: Blob, fileName: string): SaveResult {
  try {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 4000)
    return 'downloaded'
  } catch {
    return 'failed'
  }
}

/** Saves a file for the grown-up. In the app it really lands on the phone (or the share sheet opens). */
export async function saveBlob(blob: Blob, fileName: string, title?: string): Promise<SaveResult> {
  if (!hasKidsNative()) return anchorDownload(blob, fileName)
  try {
    const data = await blobToBase64(blob)
    const r = await callNative<{ result?: string }>('saveFile', { data, fileName, mime: blob.type || 'application/octet-stream', title: title ?? fileName })
    return r?.result === 'saved' ? 'saved' : r?.result === 'shared' ? 'shared' : 'failed'
  } catch {
    return 'failed'
  }
}

/** A friendly line for a save result, e.g. "Backup file saved in Downloads › R2BOT Kids." */
export function savedMessage(result: SaveResult, what: string): string {
  switch (result) {
    case 'saved':
      return `${what} saved in Downloads › R2BOT Kids.`
    case 'shared':
      return `Choose where to keep the ${what.toLowerCase()} (Drive, Files or email).`
    case 'downloaded':
      return `${what} saved.`
    default:
      return `Sorry, this device could not save the ${what.toLowerCase()}.`
  }
}

// ── shims for the standalone app ─────────────────────────────────────────────

let installed = false

/**
 * Standalone app only: gives the WebView the browser features the pages already
 * use (print, share, speech) through the native plugin. Idempotent; a no-op on
 * the website or when the plugin is missing.
 */
export function installKidsNativeShims(): void {
  if (installed || !hasKidsNative()) return
  installed = true
  installPrint()
  installShare()
  installSpeech()
}

function installPrint(): void {
  const print = () => {
    void callNative('print', { title: document.title || 'R2BOT Kids' }).catch(() => undefined)
  }
  try {
    Object.defineProperty(window, 'print', { value: print, configurable: true, writable: true })
  } catch {
    /* leave the WebView's own */
  }
}

function installShare(): void {
  const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void>; canShare?: (d?: ShareData) => boolean }
  const canShare = (d?: ShareData): boolean => {
    if (!d) return false
    const files = d.files ?? []
    if (files.length > 1) return false
    return files.length === 1 || !!d.text || !!d.url
  }
  const share = async (d?: ShareData): Promise<void> => {
    if (!d || !canShare(d)) throw new TypeError('Nothing to share')
    const file = d.files?.[0]
    if (file) {
      const data = await blobToBase64(file)
      await callNative('shareFile', { data, fileName: file.name || 'r2bot-kids-file', mime: file.type || 'application/octet-stream', title: d.title ?? '' })
      return
    }
    const text = [d.text, d.url].filter(Boolean).join(' ')
    await callNative('shareText', { text, title: d.title ?? '' })
  }
  try {
    Object.defineProperty(nav, 'share', { value: share, configurable: true, writable: true })
    Object.defineProperty(nav, 'canShare', { value: canShare, configurable: true, writable: true })
  } catch {
    /* leave as is */
  }
}

// speechSynthesis → the phone's text-to-speech engine.

type SpeechEventName = 'start' | 'end' | 'error' | 'pause' | 'resume' | 'boundary' | 'mark'

class NativeUtterance extends EventTarget {
  text: string
  lang = ''
  voice: SpeechSynthesisVoice | null = null
  rate = 1
  pitch = 1
  volume = 1
  onstart: ((ev: Event) => void) | null = null
  onend: ((ev: Event) => void) | null = null
  onerror: ((ev: Event) => void) | null = null
  onpause: ((ev: Event) => void) | null = null
  onresume: ((ev: Event) => void) | null = null
  onboundary: ((ev: Event) => void) | null = null
  onmark: ((ev: Event) => void) | null = null
  constructor(text?: string) {
    super()
    this.text = text ?? ''
  }
  fire(name: SpeechEventName): void {
    const ev = new Event(name)
    try {
      const handler = this[`on${name}` as const]
      handler?.call(this, ev)
    } catch (e) {
      console.error(e)
    }
    this.dispatchEvent(ev)
  }
}

function installSpeech(): void {
  let defaultLang = 'en-GB'
  let available = true
  const voice = (): SpeechSynthesisVoice =>
    ({ name: 'Phone voice', lang: defaultLang, localService: true, default: true, voiceURI: 'android-tts' }) as SpeechSynthesisVoice

  let seq = 0
  const queue: { id: string; u: NativeUtterance }[] = []
  let current: { id: string; u: NativeUtterance } | null = null
  const target = new EventTarget()

  const next = () => {
    if (current || !queue.length) return
    const item = queue.shift()
    if (!item) return
    current = item
    // Events arrive asynchronously, as in a browser: a handler may safely speak again.
    window.setTimeout(() => item.u.fire('start'), 0)
    const vol = Number.isFinite(item.u.volume) ? item.u.volume : 1
    callNative<{ event?: string }>('speak', {
      id: item.id,
      text: item.u.text,
      lang: item.u.lang || item.u.voice?.lang || document.documentElement.lang || defaultLang,
      rate: item.u.rate,
      pitch: item.u.pitch,
      volume: vol,
    })
      .then((r) => done(item.id, r?.event === 'error' ? 'error' : 'end'))
      .catch(() => done(item.id, 'error'))
  }
  const done = (id: string, how: 'end' | 'error') => {
    if (!current || current.id !== id) return // cancelled earlier: already reported
    const u = current.u
    current = null
    next()
    u.fire(how)
  }

  const synth = {
    get speaking() {
      return !!current
    },
    get pending() {
      return queue.length > 0
    },
    paused: false,
    onvoiceschanged: null as ((ev: Event) => void) | null,
    getVoices: (): SpeechSynthesisVoice[] => (available ? [voice()] : []),
    speak(u: SpeechSynthesisUtterance) {
      if (!(u instanceof NativeUtterance)) return
      if (!available || u.volume === 0) {
        // Silent "unlock" lines (iOS trick) and no engine: finish at once.
        window.setTimeout(() => u.fire(available ? 'end' : 'error'), 0)
        return
      }
      queue.push({ id: `s${++seq}`, u })
      next()
    },
    cancel() {
      const dropped = [...(current ? [current] : []), ...queue.splice(0)]
      current = null
      void callNative('stopSpeaking').catch(() => undefined)
      if (dropped.length) window.setTimeout(() => dropped.forEach((item) => item.u.fire('end')), 0)
    },
    pause() {
      /* not supported by the phone engine: speech carries on */
    },
    resume() {
      /* see pause */
    },
    addEventListener: (type: string, cb: EventListenerOrEventListenerObject | null) => target.addEventListener(type, cb),
    removeEventListener: (type: string, cb: EventListenerOrEventListenerObject | null) => target.removeEventListener(type, cb),
    dispatchEvent: (ev: Event) => target.dispatchEvent(ev),
  }

  try {
    Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true, writable: true })
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: NativeUtterance, configurable: true, writable: true })
  } catch {
    return
  }
  // A full page load: stop anything the previous page left reading.
  void callNative('stopSpeaking').catch(() => undefined)
  callNative<{ available?: boolean; lang?: string }>('speechInfo')
    .then((info) => {
      available = info?.available !== false
      if (info?.lang) defaultLang = info.lang
      const ev = new Event('voiceschanged')
      try {
        synth.onvoiceschanged?.(ev)
      } catch {
        /* ignore */
      }
      target.dispatchEvent(ev)
    })
    .catch(() => {
      available = false
    })
}
