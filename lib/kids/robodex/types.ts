// lib/kids/robodex/types.ts
// Types for the Robodex (roadmap #32): a collection of REAL robots, one card
// each, discovered only by doing (activities, games, stories). Pure types: safe
// on the server, the client and in the verify script.

import type { ConceptId } from '../curriculum/types'
import type { WorldId } from '../universe/worlds'

/**
 * How a card is discovered. A card is found when ANY of its triggers is met,
 * so every band has a way in (lib/kids/robodex/verify.ts checks that).
 */
export type RobodexTrigger =
  /** Finish any one of these Skill Galaxy activities. */
  | { kind: 'activity'; ids: readonly string[] }
  /** Finish `count` Skill Galaxy activities in this world (any band). */
  | { kind: 'world'; world: WorldId; count: number }
  /** Finish a round of a Universe game at `tier` (0 Cadet … 3 Legend) or higher. */
  | { kind: 'game'; game: string; tier?: number }
  /** Finish a Story Theatre episode. */
  | { kind: 'story'; slug: string }
  /** Secure a concept (lib/kids/universe/mastery.ts). */
  | { kind: 'concept'; concept: ConceptId }

/** Who is in charge while the robot works. */
export type RobodexAutonomy = 'remote' | 'supervised' | 'autonomous'

export const AUTONOMY_LABEL: Record<RobodexAutonomy, { short: string; long: string }> = {
  remote: { short: 'Driven by a person', long: 'A person controls every move (teleoperation).' },
  supervised: { short: 'Works alone, a person watches', long: 'It carries out tasks by itself while a person sets goals and can take over.' },
  autonomous: { short: 'Works on its own', long: 'It senses, decides and acts by itself for a whole mission.' },
}

export interface RobodexSpecs {
  /** Degrees of freedom / how it moves, in plain words. */
  dof: string
  sensors: readonly string[]
  autonomy: RobodexAutonomy
  power: string
}

export interface RobodexCard {
  /** Stable forever (the collection is keyed by it). */
  id: string
  /** Stable 1-based number: the card's place in the backup bitmask. Never reuse a number. */
  n: number
  world: WorldId
  /** A generic name for the KIND of robot (no product name as branding). */
  name: string
  emoji: string
  /** What sort of robot it is, e.g. "Underwater robot". */
  type: string
  /** One line on the front of the card (≤ 90 characters). */
  front: string
  /** Explorers (5–7): a short first-person story, read aloud. */
  story: string
  /** Builders and Inventors (8–13): two or three facts. */
  facts: readonly string[]
  /** Inventors and Engineers (11–17): how it works, one or two sentences. */
  howItWorks: string
  specs: RobodexSpecs
  /** Real machines of this kind, named factually (never as branding). */
  realExamples: string
  /** A page under /robots/<slug> on the main site about one real example (checked by verify). */
  robotSlug?: string
  /** "Who builds this?" — the jobs behind it. */
  builders: string
  /** Makers (lib/kids/makers) who work with robots like this. */
  makers?: readonly string[]
  find: readonly RobodexTrigger[]
}
