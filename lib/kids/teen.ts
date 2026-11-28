// lib/kids/teen.ts — the teen "R2BOT Lab" look for the Engineers band (roadmap #83).
//
// A 15-year-old will not open something called "Kids" in front of friends. When
// the playing child is in the Engineers band (14–17), the shell shows the
// "R2BOT Lab" name, the main R2BOT typography, a telemetry-HUD theme and
// spec-sheet words; cartoon avatar defaults give way to the Lab badge.
//
//  - Decided per child: band 'engineers' → 'lab', anything else → 'kids', unless
//    the child chose otherwise (a younger child may opt into the Lab look, a teen
//    may keep the Kids look). The choice lives on the device, per child
//    (profileKey(KIDS_LOOK_KEY)).
//  - <html data-kids-look> is set before paint by KIDS_LOOK_BOOT_SCRIPT
//    (lib/kids/teen-boot.ts) and kept in step by KidsLookSyncClient.
//  - The installed PWA keeps one manifest (`short_name` cannot change per band),
//    so the "home-screen name" is done in the app: the wordmark, the app-bar
//    label and the document title prefix use LAB_BRAND.
//
// Client-safe; React only in the hook.

import { useEffect, useState } from 'react'
import type { BandId } from './bands'
import { profileKey, KIDS_PROFILE_EVENT } from './profiles'
import { getProgress, KIDS_PROGRESS_EVENT } from '../kids-progress'
import { KIDS_BAND_ATTR, KIDS_LOOK_ATTR, KIDS_LOOK_EVENT, KIDS_LOOK_KEY } from './teen-boot'

export { KIDS_LOOK_EVENT, KIDS_LOOK_KEY } from './teen-boot'

export type KidsLook = 'lab' | 'kids'
export type KidsLookPref = KidsLook | 'auto'

export const LAB_BRAND = {
  /** The in-app name for the Engineers band. */
  name: 'R2BOT Lab',
  /** The word after "R2BOT" in the wordmark. */
  word: 'Lab',
  /** Short line for the header link's accessible name. */
  homeLabel: 'R2BOT Lab home',
} as const

export const KIDS_BRAND = { name: 'R2BOT Kids', word: 'Kids', homeLabel: 'R2BOT Kids home' } as const

/**
 * Spec-sheet words for the Lab look (the same places, named the way the main
 * R2BOT platform names them). The shell may use these for its labels; routes
 * never change.
 */
export const LAB_LABELS: Record<string, string> = {
  Home: 'Console',
  Learn: 'Course',
  Course: 'Course',
  Worlds: 'Field sites',
  Games: 'Sims',
  Garage: 'Garage',
  Hangar: 'Garage',
  Galaxy: 'Missions',
}

/** The look a band gets when the child has not chosen. */
export function lookForBand(band: BandId | null | undefined): KidsLook {
  return band === 'engineers' ? 'lab' : 'kids'
}

export function resolveLook(band: BandId | null | undefined, pref: KidsLookPref): KidsLook {
  return pref === 'lab' || pref === 'kids' ? pref : lookForBand(band)
}

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

/** The playing child's own choice ('auto' when none). */
export function readLookPref(): KidsLookPref {
  const s = storage()
  if (!s) return 'auto'
  try {
    const v = s.getItem(profileKey(KIDS_LOOK_KEY))
    return v === 'lab' || v === 'kids' ? v : 'auto'
  } catch {
    return 'auto'
  }
}

export function setLookPref(pref: KidsLookPref): void {
  const s = storage()
  if (!s) return
  try {
    const k = profileKey(KIDS_LOOK_KEY)
    if (pref === 'auto') s.removeItem(k)
    else s.setItem(k, pref)
  } catch {
    // Storage full or blocked: the look still follows the band.
  }
  applyLookToDocument()
  window.dispatchEvent(new Event(KIDS_LOOK_EVENT))
}

export interface KidsLookState {
  look: KidsLook
  pref: KidsLookPref
  band: BandId | null
}

export function readKidsLook(): KidsLookState {
  const band = typeof window === 'undefined' ? null : getProgress().band
  const pref = readLookPref()
  return { look: resolveLook(band, pref), pref, band }
}

/** Write the two <html> attributes (same as the boot script). */
export function applyLookToDocument(): KidsLookState {
  const st = readKidsLook()
  if (typeof document !== 'undefined') {
    const h = document.documentElement
    h.setAttribute(KIDS_BAND_ATTR, st.band ?? 'none')
    h.setAttribute(KIDS_LOOK_ATTR, st.look)
  }
  return st
}

/** Remove them (leaving /kids). */
export function clearLookFromDocument(): void {
  if (typeof document === 'undefined') return
  document.documentElement.removeAttribute(KIDS_BAND_ATTR)
  document.documentElement.removeAttribute(KIDS_LOOK_ATTR)
}

/**
 * React: the current look. Starts as 'kids' on the server and the first client
 * render (no hydration mismatch); CSS already shows the right look from the
 * boot script, so only text that React renders (aria-labels) switches after mount.
 */
export function useKidsLook(): KidsLookState {
  const [st, setSt] = useState<KidsLookState>({ look: 'kids', pref: 'auto', band: null })
  useEffect(() => {
    const read = () => setSt(readKidsLook())
    read()
    const evs = [KIDS_PROGRESS_EVENT, KIDS_PROFILE_EVENT, KIDS_LOOK_EVENT, 'storage']
    evs.forEach((e) => window.addEventListener(e, read))
    return () => evs.forEach((e) => window.removeEventListener(e, read))
  }, [])
  return st
}

/** The brand for a look. */
export function brandFor(look: KidsLook): typeof LAB_BRAND | typeof KIDS_BRAND {
  return look === 'lab' ? LAB_BRAND : KIDS_BRAND
}
