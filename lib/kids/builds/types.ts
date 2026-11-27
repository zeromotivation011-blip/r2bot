// lib/kids/builds/types.ts
// Types for Make It at Home (roadmap #44, safety rules #79): kitchen-table
// robotics builds for homes and classrooms. Pure types — safe on the server,
// the client and in the verify script.

import type { BandId } from '../bands'
import type { TrackId } from '../activities/types'
import type { WorldId } from '../universe/worlds'

/**
 * What can hurt someone in a build (#79). Every build lists at least one tag;
 * a build with nothing risky says so with `none` (and nothing else).
 * Mains power is not a tag: no build ever uses it (verify.ts refuses the words).
 */
export type Hazard =
  | 'none'
  | 'small-parts' // choking: beads, coins, caps, LEDs, paper clips, pen caps
  | 'button-cell' // button or coin cell: serious injury if swallowed; never in an Explorers build
  | 'aa-battery' // AA/AAA cells in a holder: never cut, short or heat them
  | 'lithium-pack' // rechargeable lithium packs: no build uses one at the moment; listed so verify can refuse them for under-11s
  | 'blade' // scissors, a craft knife or snips
  | 'hot-glue' // a hot-glue gun: burns
  | 'sharp-point' // nails, skewers, pins
  | 'balloon' // latex balloons and gloves: choking when burst, latex allergy
  | 'water' // water near paper, floors and devices: spills, slips
  | 'moving-body' // running, spinning or blindfolded play: clear the space

export interface HazardInfo {
  label: string
  icon: string
  /** What a grown-up does about it, one sentence. */
  rule: string
}

export interface FairTest {
  /** The ONE thing the child changes. */
  change: string
  /** What stays the same so the test is fair. */
  keep: string
  /** What they measure or count. */
  measure: string
  /** Possible outcomes the child can pick from (no wrong answer: it is their result). */
  outcomes: [string, string, string]
}

export interface CheckQuestion {
  /** Asked after the build. Answerable only by someone who built and tried it (or understood it). */
  q: string
  options: [string, string, string]
  /** Index of the right option. */
  answer: 0 | 1 | 2
  /** Said after a right answer, and as the hint after a wrong one. */
  why: string
}

export interface HomeBuild {
  /** Stable forever: the check-in, the portfolio and the URL /kids/printables/<id> are keyed by it. */
  id: string
  title: string
  emoji: string
  /** One line for cards (≤ 110 characters). */
  line: string
  /** Youngest band that can do it (with the adult rules below). */
  minBand: BandId
  /** Ages, e.g. "5–9". */
  ages: string
  minutes: number
  track: TrackId
  world?: WorldId
  /** Robodex card id (lib/kids/robodex/cards.ts) of the real robot that does the same thing. */
  robodex: string
  /** One sentence: how the real robot uses the same idea. */
  realRobot: string
  materials: string[]
  hazards: Hazard[]
  /** A grown-up must be there for the whole build (#79). */
  adultRequired: boolean
  /** The adult-safety note, specific to this build. */
  safety: string
  steps: string[]
  /** The robotics idea, in plain words. */
  idea: string
  fairTest: FairTest
  check: CheckQuestion
  /** A question a grown-up can ask. */
  ask: string
  /** Inventors and Engineers: the same build, taken further (numbers, a graph, a model). */
  deeper: string
}
