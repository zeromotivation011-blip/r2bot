// lib/kids/stories/sfx.ts
// Cartoon sound effects made with the Web Audio API (no files, no packages).
// Browser-only. Quiet by design: master volume 0.22.

import type { Sfx } from './types'
import { readKidsSettings } from '@/lib/kids/settings'

let ctx: AudioContext | null = null
let master: GainNode | null = null

function audio(): { ctx: AudioContext; out: GainNode } | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    try {
      ctx = new Ctor()
      master = ctx.createGain()
      master.gain.value = 0.22
      master.connect(ctx.destination)
    } catch {
      return null
    }
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx && master ? { ctx, out: master } : null
}

/** Call from a click handler so iOS unlocks audio. */
export function primeSfx(): void {
  audio()
}

function osc(type: OscillatorType, f0: number, f1: number, dur: number, at = 0, peak = 0.6) {
  const a = audio()
  if (!a) return
  const t = a.ctx.currentTime + at
  const o = a.ctx.createOscillator()
  const g = a.ctx.createGain()
  o.type = type
  o.frequency.setValueAtTime(f0, t)
  o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(peak, t + 0.015)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(a.out)
  o.start(t)
  o.stop(t + dur + 0.05)
}

function noise(dur: number, at = 0, peak = 0.5, lowpass = 1200) {
  const a = audio()
  if (!a) return
  const t = a.ctx.currentTime + at
  const len = Math.floor(a.ctx.sampleRate * dur)
  const buf = a.ctx.createBuffer(1, len, a.ctx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len)
  const src = a.ctx.createBufferSource()
  src.buffer = buf
  const f = a.ctx.createBiquadFilter()
  f.type = 'lowpass'
  f.frequency.value = lowpass
  const g = a.ctx.createGain()
  g.gain.setValueAtTime(peak, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(f).connect(g).connect(a.out)
  src.start(t)
}

export function playSfx(s: Sfx): void {
  if (typeof document !== 'undefined' && document.hidden) return
  if (!readKidsSettings().sound) return
  switch (s) {
    case 'boing': osc('sine', 180, 520, 0.18); osc('sine', 520, 220, 0.25, 0.16); break
    case 'whoosh': noise(0.45, 0, 0.5, 2600); break
    case 'beep': osc('square', 880, 880, 0.09, 0, 0.25); osc('square', 1320, 1320, 0.09, 0.12, 0.25); break
    case 'bonk': osc('triangle', 260, 90, 0.16, 0, 0.8); noise(0.08, 0, 0.4, 900); break
    case 'pop': osc('sine', 600, 1400, 0.08, 0, 0.6); break
    case 'splash': noise(0.6, 0, 0.6, 3200); osc('sine', 900, 300, 0.2, 0.02, 0.2); break
    case 'zap': osc('sawtooth', 1400, 120, 0.3, 0, 0.3); break
    case 'woof': osc('square', 420, 180, 0.12, 0, 0.3); osc('square', 460, 200, 0.14, 0.18, 0.3); break
    case 'ding': osc('sine', 1318, 1318, 0.5, 0, 0.5); osc('sine', 1976, 1976, 0.6, 0.12, 0.35); break
    case 'crash': noise(0.7, 0, 0.8, 1800); osc('triangle', 160, 50, 0.4, 0, 0.6); break
    case 'rumble': noise(1.4, 0, 0.7, 220); break
  }
}
