// lib/kids/ai/vision/missions.ts
// The Vision Lab's tiers, missions and robot actions. Plain data + pure checks
// (no React) so a teacher view or a test can read them.
//
// Tiers follow the Universe tier names (lib/kids/universe/tiers.ts) and map
// one-to-one onto the age bands (lib/kids/bands.ts):
//   Cadet  → Explorers 5–7    two signs, drive and stop
//   Pilot  → Builders 8–10    more data, a "nothing" class, lighting
//   Ace    → Inventors 11–13  a neural network, bias, confidence thresholds
//   Legend → Engineers 14–17  feature engineering, hidden layers, held-out tests

import type { BandId } from '../../bands'
import type { TierName } from '../../universe/tiers'
import type { SampleKind } from './samples'
import { profileKey } from '../../profiles'

export type RobotAction = 'forward' | 'stop' | 'left' | 'right' | 'spin' | 'follow' | 'idle'

export const ACTIONS: {
  id: RobotAction
  label: string
  icon: string
  says: string
}[] = [
  {
    id: 'forward',
    label: 'Drive forward',
    icon: '⬆️',
    says: 'Driving forward!',
  },
  { id: 'stop', label: 'Stop', icon: '✋', says: 'Stopping.' },
  { id: 'left', label: 'Turn left', icon: '↩️', says: 'Turning left.' },
  { id: 'right', label: 'Turn right', icon: '↪️', says: 'Turning right.' },
  { id: 'spin', label: 'Happy spin', icon: '🔄', says: 'Wheee!' },
  {
    id: 'follow',
    label: 'Follow the ball',
    icon: '🎯',
    says: 'Following the ball!',
  },
  {
    id: 'idle',
    label: 'Do nothing (wait)',
    icon: '💤',
    says: 'Nothing to see. Waiting.',
  },
]

export function actionInfo(id: RobotAction) {
  return ACTIONS.find((a) => a.id === id) ?? ACTIONS[1]
}

export interface TierInfo {
  id: TierName
  band: BandId
  ages: string
  /** Max classes this tier works with. */
  maxClasses: number
  /** Neural network available. */
  net: boolean
  /** Hidden-layer + feature switches available. */
  advanced: boolean
  intro: string
}

export const VISION_TIERS: TierInfo[] = [
  {
    id: 'Cadet',
    band: 'explorers',
    ages: '5–7',
    maxClasses: 2,
    net: false,
    advanced: false,
    intro: 'Show your robot two signs. It learns them and obeys!',
  },
  {
    id: 'Pilot',
    band: 'builders',
    ages: '8–10',
    maxClasses: 3,
    net: false,
    advanced: false,
    intro: 'Add a “nothing” class, collect better examples and beat the dark.',
  },
  {
    id: 'Ace',
    band: 'inventors',
    ages: '11–13',
    maxClasses: 4,
    net: true,
    advanced: false,
    intro: 'Train a real neural network, find bias, and set a confidence threshold.',
  },
  {
    id: 'Legend',
    band: 'engineers',
    ages: '14–17',
    maxClasses: 4,
    net: true,
    advanced: true,
    intro: 'Engineer the features, add a hidden layer, and prove it on held-out data.',
  },
]

export function tierInfo(id: TierName): TierInfo {
  return VISION_TIERS.find((t) => t.id === id) ?? VISION_TIERS[0]
}

export function tierForBand(b: BandId | null | undefined): TierName {
  return VISION_TIERS.find((t) => t.band === b)?.id ?? 'Cadet'
}

export interface ClassPreset {
  name: string
  sample: SampleKind
  action: RobotAction
}

/** The starting classes for each tier (the child can rename and change them). */
export const PRESETS: Record<TierName, ClassPreset[]> = {
  Cadet: [
    { name: 'Thumbs up', sample: 'thumbs', action: 'forward' },
    { name: 'Open hand', sample: 'hand', action: 'stop' },
  ],
  Pilot: [
    { name: 'Thumbs up', sample: 'thumbs', action: 'forward' },
    { name: 'Open hand', sample: 'hand', action: 'stop' },
    { name: 'Nothing', sample: 'nothing', action: 'idle' },
  ],
  Ace: [
    { name: 'Thumbs up', sample: 'thumbs', action: 'forward' },
    { name: 'Open hand', sample: 'hand', action: 'stop' },
    { name: 'Red ball', sample: 'ball', action: 'follow' },
    { name: 'Nothing', sample: 'nothing', action: 'idle' },
  ],
  Legend: [
    { name: 'Thumbs up', sample: 'thumbs', action: 'forward' },
    { name: 'Fist', sample: 'fist', action: 'spin' },
    { name: 'Red ball', sample: 'ball', action: 'follow' },
    { name: 'Nothing', sample: 'nothing', action: 'idle' },
  ],
}

// ── What the lab has observed (fed to mission checks) ──────────────────────

export interface ClassStat {
  count: number
  /** Examples captured with the room light below normal. */
  dimCount: number
  action: RobotAction
}

export interface EvalStat {
  model: 'knn' | 'net'
  accuracy: number
  dimAccuracy: number | null
  recall: number[]
  classes: number
  counts: number[]
  /** Feature groups switched off when this test ran. */
  groupsOff: number
  hidden: number
}

export interface LabStats {
  classes: ClassStat[]
  /** Every evaluation run this visit, oldest first. */
  evals: EvalStat[]
  /** Actions the robot performed because of a confident prediction. */
  actionsDone: RobotAction[]
  /** The robot stopped because it was not sure (below threshold). */
  stoppedUnsure: boolean
  threshold: number
  /** Seconds spent following the ball. */
  followSeconds: number
  netTrained: boolean
}

export interface Mission {
  id: string
  tier: TierName
  title: string
  goal: string
  /** The lesson in one or two sentences, shown when the mission is done. */
  lesson: string
  check: (s: LabStats) => boolean
}

const minCount = (s: LabStats) => (s.classes.length ? Math.min(...s.classes.map((c) => c.count)) : 0)
const maxCount = (s: LabStats) => (s.classes.length ? Math.max(...s.classes.map((c) => c.count)) : 0)
const evalsWith = (s: LabStats, f: (e: EvalStat) => boolean) => s.evals.filter(f)

export const MISSIONS: Mission[] = [
  // Cadet — Explorers 5–7
  {
    id: 'cadet-two-signs',
    tier: 'Cadet',
    title: 'Teach two signs',
    goal: 'Give each sign at least 5 examples. Then make your robot drive AND stop by showing the signs.',
    lesson: 'Your robot learned from examples, not from rules you typed. That is machine learning!',
    check: (s) => s.classes.length >= 2 && minCount(s) >= 5 && s.actionsDone.includes('forward') && s.actionsDone.includes('stop'),
  },
  {
    id: 'cadet-more-examples',
    tier: 'Cadet',
    title: 'More pictures, smarter robot',
    goal: 'Give every sign 20 examples, then press “Test my robot” and score 85% or more.',
    lesson: 'More examples — from different places and angles — help the robot get it right more often.',
    check: (s) => minCount(s) >= 20 && evalsWith(s, (e) => e.accuracy >= 0.85 && Math.min(...e.counts) >= 20).length > 0,
  },
  // Pilot — Builders 8–10
  {
    id: 'pilot-nothing',
    tier: 'Pilot',
    title: 'The “nothing” class',
    goal: 'Make a class whose action is “Do nothing”, give it 8+ examples, and score 85%+ with 3 classes.',
    lesson: 'Without a “nothing” class the robot must pick a sign even when you show nothing — so it would guess.',
    check: (s) => s.classes.some((c) => c.action === 'idle' && c.count >= 8) && evalsWith(s, (e) => e.classes >= 3 && e.accuracy >= 0.85).length > 0,
  },
  {
    id: 'pilot-lights-out',
    tier: 'Pilot',
    title: 'Lights out!',
    goal: 'Run “Test in the dark”. Then add examples taken in dim light until the dark score is 80% or more.',
    lesson: 'A robot only knows the light it learned in. Teach it in bright AND dim rooms so it works in both.',
    check: (s) =>
      s.classes.some((c) => c.dimCount > 0) && evalsWith(s, (e) => (e.dimAccuracy ?? 0) >= 0.8).length > 0 && s.evals.some((e) => e.dimAccuracy !== null),
  },
  // Ace — Inventors 11–13
  {
    id: 'ace-neural-net',
    tier: 'Ace',
    title: 'Train a neural network',
    goal: 'Switch the brain to “Neural network”, train it, and score 85%+ on held-out examples with 3+ classes.',
    lesson: 'The network adjusted its weights a little at a time to make the loss go down — that is gradient descent.',
    check: (s) => s.netTrained && evalsWith(s, (e) => e.model === 'net' && e.classes >= 3 && e.accuracy >= 0.85).length > 0,
  },
  {
    id: 'ace-bias',
    tier: 'Ace',
    title: 'Bias detective',
    goal: 'Test with one class that has far fewer examples (a third or less). Then balance the classes and get every class to 80%+.',
    lesson: 'When one class has too few examples, the robot is biased against it. Fair data makes a fair robot.',
    check: (s) => {
      const unbalanced = s.evals.findIndex((e) => e.counts.length >= 2 && Math.min(...e.counts) * 3 <= Math.max(...e.counts))
      if (unbalanced < 0) return false
      return s.evals
        .slice(unbalanced + 1)
        .some((e) => Math.min(...e.counts) >= 0.6 * Math.max(...e.counts) && e.recall.every((r) => Number.isNaN(r) || r >= 0.8))
    },
  },
  {
    id: 'ace-threshold',
    tier: 'Ace',
    title: 'Not sure? Stop!',
    goal: 'Set the confidence threshold to 70% or higher, then show something confusing until the robot stops because it is not sure.',
    lesson: 'Real robots act only when they are confident enough. When unsure, the safe choice is to stop.',
    check: (s) => s.threshold >= 0.7 && s.stoppedUnsure,
  },
  // Legend — Engineers 14–17
  {
    id: 'legend-features',
    tier: 'Legend',
    title: 'Feature engineer',
    goal: 'Run a test with a feature group switched off and one with all on. Reach 90%+ with 4 classes.',
    lesson: 'Which numbers you give a model (its features) matters as much as the model itself.',
    check: (s) => evalsWith(s, (e) => e.groupsOff > 0).length > 0 && evalsWith(s, (e) => e.groupsOff === 0 && e.classes >= 4 && e.accuracy >= 0.9).length > 0,
  },
  {
    id: 'legend-hidden-layer',
    tier: 'Legend',
    title: 'Go deeper',
    goal: 'Train a network with a hidden layer (8+ units) and score 90%+ on held-out examples with 4 classes.',
    lesson:
      'A hidden layer lets the network combine simple features into new ones. Watch the test loss: if it rises while training loss falls, it is memorising (overfitting).',
    check: (s) => evalsWith(s, (e) => e.model === 'net' && e.hidden >= 8 && e.classes >= 4 && e.accuracy >= 0.9).length > 0,
  },
  {
    id: 'legend-follow',
    tier: 'Legend',
    title: 'Follow the red ball',
    goal: 'Give a class the “Follow the ball” action and keep your robot following for 5 seconds in total.',
    lesson: 'Perception (seeing) drives control (moving). That loop — sense, think, act — is every autonomous robot.',
    check: (s) => s.classes.some((c) => c.action === 'follow') && s.followSeconds >= 5,
  },
]

export function missionsForTier(t: TierName): Mission[] {
  return MISSIONS.filter((m) => m.tier === t)
}

/** Stars for a finished mission: more for a stronger best score. */
export function starsFor(s: LabStats): number {
  const best = s.evals.reduce((a, e) => Math.max(a, e.accuracy), 0)
  return best >= 0.95 ? 3 : best >= 0.85 ? 2 : 1
}

// ── Local memory of finished missions (ids only — never pictures) ──────────

const DONE_KEY = 'r2bot_kids_vision_v1'

export function loadDoneMissions(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(profileKey(DONE_KEY)) ?? '[]')
    return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function saveDoneMissions(ids: string[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(profileKey(DONE_KEY), JSON.stringify(ids))
  } catch {
    /* storage blocked — progress simply is not remembered */
  }
}
