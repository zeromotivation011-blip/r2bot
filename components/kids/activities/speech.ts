// components/kids/activities/speech.ts
// Reads an activity's intro aloud. Prefers the most natural voice the device
// has (neural/"Natural"/enhanced voices on Edge, Chrome, Safari), falls back to
// any English voice, and stays silent when Robot World's voice is muted
// (localStorage r2bot_kids_voice === 'false'). Browser-only; call from client code.

const VOICE_KEY = 'r2bot_kids_voice'

export function voiceMuted(): boolean {
  if (typeof window === 'undefined') return true
  try {
    return window.localStorage.getItem(VOICE_KEY) === 'false'
  } catch {
    return false
  }
}

export function setVoiceMuted(muted: boolean): void {
  try {
    window.localStorage.setItem(VOICE_KEY, muted ? 'false' : 'true')
  } catch {
    /* ignore */
  }
  if (muted) stopSpeaking()
}

export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'
}

const NATURAL = /natural|neural|premium|enhanced|online|siri/i
const GOOD = /google|samantha|daniel|serena|karen|moira|tessa|libby|sonia|ryan|aria|jenny|guy/i

/** Best English voice on this device: natural/neural first, then known good voices, then any. */
export function pickNaturalVoice(): SpeechSynthesisVoice | null {
  if (!canSpeak()) return null
  const en = window.speechSynthesis.getVoices().filter((v) => /^en([-_]|$)/i.test(v.lang))
  if (!en.length) return null
  const score = (v: SpeechSynthesisVoice) => (NATURAL.test(v.name) ? 4 : 0) + (GOOD.test(v.name) ? 2 : 0) + (v.localService ? 0 : 1) + (/en[-_](GB|US|IN|AU)/i.test(v.lang) ? 1 : 0)
  return [...en].sort((a, b) => score(b) - score(a))[0] ?? null
}

/** Speak text in the most natural voice. Returns a stop function. No-op when muted. */
export function speakNatural(text: string, onEnd?: () => void): () => void {
  if (!canSpeak() || voiceMuted()) {
    onEnd?.()
    return () => undefined
  }
  const synth = window.speechSynthesis
  synth.cancel()
  const u = new SpeechSynthesisUtterance(text)
  const v = pickNaturalVoice()
  if (v) {
    u.voice = v
    u.lang = v.lang
  } else {
    u.lang = 'en-GB'
  }
  // Natural voices sound right at normal speed; robotic ones are clearer a little slower.
  u.rate = v && NATURAL.test(v.name) ? 1 : 0.92
  u.pitch = 1.05
  let ended = false
  const end = () => {
    if (ended) return
    ended = true
    onEnd?.()
  }
  u.onend = end
  u.onerror = end
  synth.speak(u)
  if (synth.paused) synth.resume()
  return () => {
    ended = true
    try {
      synth.cancel()
    } catch {
      /* ignore */
    }
  }
}

export function stopSpeaking(): void {
  if (canSpeak()) {
    try {
      window.speechSynthesis.cancel()
    } catch {
      /* ignore */
    }
  }
}

/** Voices load asynchronously in Chrome: call on mount; returns cleanup. */
export function warmNaturalVoices(): () => void {
  if (!canSpeak()) return () => undefined
  window.speechSynthesis.getVoices()
  const on = () => window.speechSynthesis.getVoices()
  window.speechSynthesis.addEventListener?.('voiceschanged', on)
  return () => window.speechSynthesis.removeEventListener?.('voiceschanged', on)
}
