// components/kids/games/robot-brain/tiers.ts
// What each tier asks, and the seeded data it uses. Every run gets its own
// seed (tierTestSet), so a test is never re-taken on parcels already seen.

import type { Example, Representation, TestItem } from './brain'
import { generateDrawing, makeRng, SYMBOLS, VARIATION, type ClassId, type DrawMeta, type Variation } from './symbols'

export interface TierConfig {
  index: number
  classes: ClassId[]
  /** Own drawings needed per class before the robot can be tested. */
  minPerClass: number
  /** Memory limit of the robot brain. */
  maxExamples: number
  /** k used when the child can't choose it. */
  k: number
  chooseK: boolean
  chooseRep: boolean
  canAugment: boolean
  showMatrix: boolean
  /** Legend: a validation set to iterate on, and ONE final unseen test. */
  hasValidation: boolean
  /** Accuracy for 1, 2, 3 stars (Legend's 3rd star is the overfitting check). */
  stars: [number, number, number]
  testSeed: number
  testPerClass: number
  testVariation: Variation
  goal: string
  /** Robot speech when the tier opens. */
  intro: string
}

export const TIERS: TierConfig[] = [
  {
    index: 0,
    classes: ['left', 'right'],
    minPerClass: 3,
    maxExamples: 24,
    k: 3,
    chooseK: false,
    chooseRep: false,
    canAugment: false,
    showMatrix: false,
    hasValidation: false,
    stars: [0.8, 0.9, 1],
    testSeed: 1101,
    testPerClass: 5,
    testVariation: VARIATION.strangers,
    goal: 'Teach the sorter ← and →. Draw 3 of each, then sort 10 parcels drawn by other people. Get 8 right to win.',
    intro: 'Hi! I am Sorta. I can’t read arrows yet. Draw some for me and tell me which is which!',
  },
  {
    index: 1,
    classes: ['left', 'right', 'circle', 'tri'],
    minPerClass: 3,
    maxExamples: 48,
    k: 3,
    chooseK: false,
    chooseRep: false,
    canAugment: false,
    showMatrix: false,
    hasValidation: false,
    stars: [13 / 16, 15 / 16, 1],
    testSeed: 2207,
    testPerClass: 4,
    testVariation: VARIATION.strangers,
    goal: 'Four labels, and ○ and △ are easy to mix up. 16 parcels drawn in a hurry by strangers, new ones every run. Sort 13 right to win.',
    intro: 'New labels! ○ means local delivery, △ means fragile. Strangers draw fast: open circles, rounded triangles. Teach me what each one looks like in general.',
  },
  {
    index: 2,
    classes: ['left', 'right', 'stop'],
    minPerClass: 0,
    maxExamples: 40,
    k: 5,
    chooseK: false,
    chooseRep: false,
    canAugment: false,
    showMatrix: true,
    hasValidation: false,
    stars: [0.85, 0.93, 1],
    testSeed: 3313,
    testPerClass: 5,
    testVariation: VARIATION.everyday,
    goal: 'An intern trained me in a hurry. Run me, read the confusion matrix, then FIX THE DATA until I score 85%. The 3rd star needs clean data: no wrong labels left.',
    intro: 'The intern says I’m trained. Run the test and see what happens… then look hard at my data.',
  },
  {
    index: 3,
    classes: ['left', 'right', 'circle', 'stop'],
    minPerClass: 2,
    maxExamples: 100,
    k: 1,
    chooseK: true,
    chooseRep: true,
    canAugment: true,
    showMatrix: true,
    hasValidation: true,
    stars: [0.9, 0.95, 0.95],
    testSeed: 4421,
    testPerClass: 6,
    testVariation: VARIATION.wild,
    goal: 'Design the brain: pick k and raw pixels or features, clean the factory data, add and augment drawings, then pass the final exam: 22 of 24 brand-new parcels, tilted up to 45°, squashed, smudged and hurried.',
    intro: 'Legend lab. Validation is free; every exam is 24 parcels nobody has seen, and you get one go per round. Don’t trust training accuracy.',
  },
]

export const DEFAULT_REP: Representation[] = ['features', 'features', 'features', 'raw']

function describe(meta: DrawMeta): string {
  const bits: string[] = []
  if (Math.abs(meta.rot) >= 12) bits.push(`tilted ${Math.round(Math.abs(meta.rot))}°`)
  if (meta.scale < 0.7) bits.push('drawn small')
  else if (meta.scale > 1.02) bits.push('drawn big')
  const ax = Math.abs(meta.dx)
  const ay = Math.abs(meta.dy)
  if (Math.max(ax, ay) > 0.09) bits.push(ax >= ay ? `moved ${meta.dx < 0 ? 'left' : 'right'}` : `moved ${meta.dy < 0 ? 'up' : 'down'}`)
  if (meta.hurried) bits.push('drawn in a hurry')
  if (meta.specks) bits.push(meta.specks === 1 ? 'with a smudge' : `with ${meta.specks} smudges`)
  return bits.length ? bits.join(', ') : 'neatly drawn'
}

/** A deterministic, shuffled set of drawings, n per class. */
export function makeTestSet(classes: ClassId[], perClass: number, v: Variation, seed: number): TestItem[] {
  const rng = makeRng(seed)
  const items: TestItem[] = []
  for (let i = 0; i < perClass; i++)
    for (const c of classes) {
      const { drawing, meta } = generateDrawing(c, v, rng)
      items.push({ drawing, truth: c, note: describe(meta), rot: meta.rot, hurried: !!meta.hurried })
    }
  // Fisher–Yates with the same rng: fair and repeatable.
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[items[i], items[j]] = [items[j], items[i]]
  }
  return items
}

/**
 * The test parcels for one run. Every run gets a NEW seed, so a child can
 * never tune their data to parcels they have already seen: a held-out test
 * stays held out.
 */
export function tierTestSet(t: TierConfig, run: number): TestItem[] {
  return makeTestSet(t.classes, t.testPerClass, t.testVariation, t.testSeed + run * 7919)
}

/** Legend's validation set: same kind of drawings as the exam, fixed, reusable. */
export function tierValidationSet(t: TierConfig): TestItem[] {
  return makeTestSet(t.classes, 5, t.testVariation, t.testSeed + 77)
}

/** Parcels needed for a fraction of `total` (13/16 of 16 → 13). */
export function needed(frac: number, total: number): number {
  return Math.ceil(frac * total - 1e-9)
}

let nextId = 1
export function newId(): number {
  return nextId++
}

/** The data each tier starts with (the child's own drawings are added on top). */
export function starterData(t: TierConfig): Example[] {
  if (t.index === 2) {
    // The intern's dataset has TWO problems, and both matter:
    //  · lopsided: 8 ←, 7 ✕ and ONE tiny, off-centre →;
    //  · four ordinary → drawings carelessly labelled ←. They sit right where
    //    real → parcels land, so they out-vote any → the child adds.
    // Relabelling them fixes most of it; deleting them alone leaves one →.
    const rng = makeRng(9091)
    const out: Example[] = []
    const add = (label: ClassId, truth: ClassId, v: Variation, n: number) => {
      const { drawing } = generateDrawing(truth, v, rng)
      out.push({ id: newId(), label, drawing, source: 'intern', n, truth: truth !== label ? truth : undefined })
    }
    let nl = 0
    let ns = 0
    for (let i = 0; i < 8; i++) {
      add('left', 'left', VARIATION.gentle, ++nl)
      if (i < 7) add('stop', 'stop', VARIATION.gentle, ++ns)
      if (i % 2 === 1) add('left', 'right', VARIATION.everyday, ++nl)
    }
    add('right', 'right', { ...VARIATION.gentle, scale: [0.42, 0.45], shift: 0.2 }, 1)
    return out
  }
  if (t.index === 3) {
    // Factory dataset: neat and centred (not like the wild exam), with 3 wrong labels.
    const rng = makeRng(7310)
    const out: Example[] = []
    const wrong: Record<string, ClassId> = { 'circle-2': 'stop', 'right-4': 'left', 'stop-3': 'circle' }
    const counts: Record<ClassId, number> = { left: 0, right: 0, circle: 0, tri: 0, stop: 0 }
    for (let i = 1; i <= 4; i++)
      for (const c of t.classes) {
        const { drawing } = generateDrawing(c, VARIATION.gentle, rng)
        const label = wrong[`${c}-${i}`] ?? c
        counts[label]++
        out.push({ id: newId(), label, drawing, source: 'factory', n: counts[label], truth: label !== c ? c : undefined })
      }
    return out
  }
  return []
}

export function glyph(c: ClassId): string {
  return SYMBOLS[c].glyph
}
