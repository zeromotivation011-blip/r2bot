// lib/kids/teach/present-bridge.ts
//
// BROWSER ONLY. The contract between Present mode (/kids/present, roadmap #42)
// and the page it shows inside its frame (an episode, a simulator, a replay).
//
// Present mode and the embedded page share an origin. When the teacher picks
// slow motion or freezes the screen to draw on it, Present mode:
//   1. slows/pauses <video>/<audio> and CSS/Web animations in the frame itself
//      (works for any page, no code needed there), and
//   2. stores the signal on the frame's window and fires PRESENT_EVENT there,
//      so a page whose motion runs on requestAnimationFrame (three.js episodes,
//      the physics simulator) can follow it with one hook:
//
//        const present = usePresentSignal()
//        const effectiveSpeed = userSpeed * present.speed      // ½× or ¼× slow motion
//        if (present.frozen) { /* skip stepping this frame */ }
//
// Outside Present mode the hook returns { speed: 1, frozen: false, active: false }
// and never re-renders.

import { useSyncExternalStore } from 'react'

export const PRESENT_EVENT = 'r2bot:present'
/** Query parameter Present mode adds to the framed page's URL. */
export const PRESENT_PARAM = 'present'

export interface PresentSignal {
  /** 1 = normal, 0.5 = half speed, 0.25 = quarter speed. */
  speed: number
  /** The teacher froze the screen (to draw on it). */
  frozen: boolean
  /** The page is being shown inside Present mode. */
  active: boolean
}

const NONE: PresentSignal = { speed: 1, frozen: false, active: false }

type PresentWindow = Window & { __r2botPresent?: PresentSignal; CustomEvent?: typeof CustomEvent }

/** Present mode side: send a signal to the framed page's window. */
export function sendPresentSignal(target: Window, signal: Omit<PresentSignal, 'active'>): void {
  const w = target as PresentWindow
  w.__r2botPresent = { ...signal, active: true }
  try {
    // The frame's own CustomEvent, so listeners in the frame receive a native event of their realm.
    const Ctor = w.CustomEvent ?? CustomEvent
    w.dispatchEvent(new Ctor(PRESENT_EVENT, { detail: w.__r2botPresent }))
  } catch {
    // The frame navigated away or is not same-origin: nothing to tell.
  }
}

/** The current signal for this window (pages inside the frame). */
export function readPresentSignal(): PresentSignal {
  if (typeof window === 'undefined') return NONE
  return (window as PresentWindow).__r2botPresent ?? NONE
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(PRESENT_EVENT, onChange)
  return () => window.removeEventListener(PRESENT_EVENT, onChange)
}

/** React hook for framed pages: slow motion and freeze from Present mode. */
export function usePresentSignal(): PresentSignal {
  return useSyncExternalStore(subscribe, readPresentSignal, () => NONE)
}

/** True when this page was opened by Present mode (its URL carries ?present=1). */
export function isPresented(): boolean {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).has(PRESENT_PARAM)
}
