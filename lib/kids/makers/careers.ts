// lib/kids/makers/careers.ts
// The Career Constellation (roadmap #34): every Maker's job is a constellation
// of the big ideas it uses (lib/kids/universe/mastery.ts concepts). A star
// lights up when the child has that idea: bright when SECURE, half when they are
// LEARNING it, dim when it is FADING. Nothing here ranks children, and careers
// are never sorted by "best match": every job stays in the same place, and the
// copy says what the child already has, never what they lack.
//
// Pure: safe on server and client.

import type { ConceptId } from '../curriculum/types'
import type { ConceptStatus } from '../universe/mastery'
import { MAKERS, makerFirstName, type Maker } from './makers'
import { CAREER_BADGE_LIST } from '../universe/rewards'

export type StarLight = 'bright' | 'half' | 'dim' | 'off'

export function starLight(status: ConceptStatus | undefined): StarLight {
  switch (status) {
    case 'secure':
      return 'bright'
    case 'fading':
      return 'dim'
    case 'learning':
      return 'half'
    default:
      return 'off'
  }
}

export interface CareerLight {
  maker: Maker
  stars: { concept: ConceptId; light: StarLight }[]
  /** Stars that are bright or dim (the child has secured the idea at some point). */
  have: number
  /** Stars being learnt. */
  learning: number
}

/** One career's constellation from a concept → status map. */
export function careerLight(maker: Maker, statuses: Readonly<Partial<Record<ConceptId, ConceptStatus>>>): CareerLight {
  const stars = maker.skills.map((concept) => ({ concept, light: starLight(statuses[concept]) }))
  return {
    maker,
    stars,
    have: stars.filter((s) => s.light === 'bright' || s.light === 'dim').length,
    learning: stars.filter((s) => s.light === 'half').length,
  }
}

/** Every career, in the fixed MAKERS order (never sorted by match). */
export function careerLights(statuses: Readonly<Partial<Record<ConceptId, ConceptStatus>>>, makers: readonly Maker[] = MAKERS): CareerLight[] {
  return makers.map((m) => careerLight(m, statuses))
}

/** A kind sentence about one career, never about what is missing. */
export function careerLine(c: CareerLight): string {
  const n = c.stars.length
  const first = makerFirstName(c.maker)
  if (c.have === n) return `You already have every skill ${first} uses most.`
  if (c.have > 0) return `You already have ${c.have} of the ${n} skills ${first} uses most.`
  if (c.learning > 0) return `You are learning skills ${first} uses every day.`
  return `Play to light up the skills ${first} uses.`
}

// ── Careers badge track ────────────────────────────────────────────────────────
// Badges for the `careers` track (INTEGRATOR: add 'careers' to BadgeTrack in
// lib/kids/universe/rewards.ts and append these to UNIVERSE_BADGES). Each one is
// earned by doing, worked out from device state by careerBadgesDue().

export interface CareerBadge {
  id: string
  name: string
  icon: string
  track: 'careers'
  earnedFor: string
}

/** The badges live in rewards.ts (UNIVERSE_BADGES) so the rewards engine never loads the makers' stories. */
export const CAREER_BADGES: readonly CareerBadge[] = CAREER_BADGE_LIST

export interface CareerBadgeState {
  /** Robodex cards found. */
  cardsFound: number
  /** Worlds whose cards are all found. */
  worldsComplete: number
  /** Maker stories heard (lib/kids/makers/heard.ts). */
  storiesHeard: number
  /** Careers whose skills are all secured (bright or dim). */
  fullCareers: number
}

/** Badge ids the state has earned (the caller skips ones already owned). */
export function careerBadgesDue(s: CareerBadgeState): string[] {
  const out: string[] = []
  if (s.cardsFound >= 1) out.push('robodex-first')
  if (s.worldsComplete >= 1) out.push('robodex-world')
  if (s.storiesHeard >= 3) out.push('maker-listener')
  if (s.fullCareers >= 1) out.push('career-constellation')
  return out
}
