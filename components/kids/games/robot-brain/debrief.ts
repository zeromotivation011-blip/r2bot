// components/kids/games/robot-brain/debrief.ts
// Pure game rules for Train the Robot Brain: stars, the debrief a child reads
// after a run, and the dataset edits (numbering, augmentation). Kept free of
// React so robot-brain.verify.ts can prove that every message is TRUE for the
// data the child actually had — a child must never be told the opposite.

import { explainMistake, type Evaluation, type Example, type MistakeCause, type TrainedBrain } from './brain'
import { augmentDrawing, makeRng, VARIATION, type ClassId } from './symbols'
import { glyph, needed, newId, type TierConfig } from './tiers'

export interface RunResult {
  kind: 'test' | 'exam'
  ev: Evaluation
  brain: TrainedBrain
}

/** Wrong labels still hiding in a dataset. */
export const wrongLeft = (xs: Example[]): number => xs.filter((e) => e.truth && e.truth !== e.label).length

/** ✨ Sample drawings (or copies of them) in the data: the game drew them, not the child. */
export const usedSamples = (xs: Example[]): boolean => xs.some((e) => e.source === 'sample' || e.sampled === true)

export interface StarInfo {
  stars: number
  /** Why a finish was held at 2 stars, in words for the child (or null). */
  capped: null | 'samples' | 'dirty'
}

/**
 * Stars for one run, before Legend's bonus question.
 *  · Cadet–Ace: the three accuracy targets.
 *  · Ace: a perfect score with wrong labels still in the data was out-numbering, not a fix → 2.
 *  · Legend: 1–2 stars from the exam; the bonus question adds the 3rd (finishStars).
 *  · Any tier: ✨ Sample drawings are the game doing the drawing — the shared hint
 *    rule caps the finish at 2 stars (reportActivity applies the same cap from hintsUsed).
 */
export function runStars(run: RunResult, cfg: TierConfig): StarInfo {
  const { correct, total } = run.ev
  let stars = 0
  if (correct >= needed(cfg.stars[0], total)) stars = 1
  if (correct >= needed(cfg.stars[1], total)) stars = 2
  if (cfg.index < 3 && correct >= needed(cfg.stars[2], total)) stars = 3
  let capped: StarInfo['capped'] = null
  if (cfg.index === 2 && stars === 3 && wrongLeft(run.brain.examples) > 0) {
    stars = 2
    capped = 'dirty'
  }
  if (stars === 3 && usedSamples(run.brain.examples)) {
    stars = 2
    capped = 'samples'
  }
  return { stars, capped }
}

/** Final stars for the round, including Legend's bonus question (its 3rd star). */
export function finishStars(run: RunResult, cfg: TierConfig, quizRight: boolean | null): StarInfo {
  const base = runStars(run, cfg)
  if (cfg.index !== 3 || base.stars === 0 || !quizRight) return base
  const stars = Math.min(3, base.stars + 1)
  if (stars === 3 && usedSamples(run.brain.examples)) return { stars: 2, capped: 'samples' }
  return { stars, capped: base.capped }
}

export const CAP_NOTE: Record<NonNullable<StarInfo['capped']>, string> = {
  samples: 'Some of the training data came from the ✨ Sample button, so this finish is capped at 2 stars — teach Sorta with your own drawings for 3.',
  dirty: 'Wrong labels are still in the data, so this finish is capped at 2 stars.',
}

/** The perfect-score headline. Every clause is checked against the data the run used. */
export function perfectHeadline(run: RunResult, cfg: TierConfig): string {
  const xs = run.brain.examples
  const hurried = run.ev.graded.filter((g) => g.item.hurried).length
  switch (cfg.index) {
    case 0:
      return hurried
        ? `Every arrow went the right way, even the ${hurried} drawn in a hurry: your examples showed Sorta that the pointy end decides left or right.`
        : 'Every arrow went the right way: your examples showed Sorta that the pointy end decides left or right.'
    case 1:
      return hurried
        ? `Not one mistake, including ${hurried} hurried drawings by strangers: your examples covered how people really draw ○ and △, so the brain generalised.`
        : 'Not one mistake on strangers’ drawings: your examples covered how people really draw ○ and △, so the brain generalised.'
    case 2: {
      const bad = wrongLeft(xs)
      const right = xs.filter((e) => e.label === 'right').length
      return bad
        ? `Every parcel right — but ${bad} example${bad === 1 ? ' is' : 's are'} still labelled wrong. You won by out-numbering them with ${right} → examples; on harder parcels they would still mislead the robot. Fix the labels for the 3rd star.`
        : `You cleaned the data: no wrong labels left, and ${right} → examples so → isn’t out-voted any more. Every vote counted fairly.`
    }
    default: {
      const parts: string[] = []
      parts.push(run.brain.rep === 'features' ? 'features ignored where and how big each drawing was' : 'raw pixels still coped, because your data covered many positions and sizes')
      if (xs.some((e) => e.source === 'augment')) parts.push('augmented copies covered the turning')
      else parts.push('your own varied drawings covered the turning')
      const bad = wrongLeft(xs)
      if (bad) parts.push(`(${bad} wrong label${bad === 1 ? '' : 's'} still in the data were out-voted this time)`)
      return `Perfect on unseen, tilted, messy drawings: ${parts.join(', ')}.`
    }
  }
}

/** One lesson per kind of mistake. Each states only what the game really does. */
export const CAUSE_LESSON: Record<MistakeCause, string> = {
  mislabel:
    'Some training examples had the WRONG label, and the robot copied that mistake. Find them and relabel them. (Deleting them removes the bad lesson too — then check every label still has enough examples.)',
  outvoted: 'Your data was lopsided: one label had far fewer examples, so it kept getting out-voted. Add more examples of the rare label.',
  position: 'Raw pixels only compare which squares have ink, so a moved or resized drawing looks different. Engineered features undo position and size (not rotation).',
  tilt: 'Turned drawings fooled the robot. Engineered features undo position and size but not rotation — tilted examples or augmented copies teach it about turning.',
  hurried: 'Hurried drawings (open circles, rounded corners, one-sided arrow heads) fooled the robot. Teach it some quick, messy examples as well as neat ones.',
  unfamiliar: 'Some test drawings looked unlike anything in your data. Add more varied examples: bigger, smaller, tilted, messier.',
  lookalike: 'Some test drawings were closer to the wrong examples. Draw more examples of the labels that got mixed up, in different styles.',
}

/** The lesson for a cause, adjusted to what the data already has (never "augment" to a child who did). */
export function lessonFor(cause: MistakeCause, brain: TrainedBrain): string {
  if (cause === 'tilt' && brain.examples.some((e) => e.source === 'augment'))
    return 'Turned drawings still fooled the robot, even with augmented copies. Features undo position and size but not rotation, and copies are only as varied as the drawings they come from: add your own turned drawings of the labels that got mixed up.'
  return CAUSE_LESSON[cause]
}

export interface CauseRow {
  text: string
  cause: MistakeCause
  index: number
  exampleId: number | null
  also?: number[]
}

export interface Summary {
  headline: string
  /** The most common cause (null on a perfect run). */
  top: MistakeCause | null
  causes: CauseRow[]
}

export function summarize(run: RunResult, cfg: TierConfig): Summary {
  const wrong = run.ev.graded.map((g, index) => ({ g, index })).filter((x) => !x.g.correct)
  if (!wrong.length) return { headline: perfectHeadline(run, cfg), top: null, causes: [] }
  const causes = wrong.map(({ g, index }) => {
    const r = explainMistake(run.brain, g, glyph)
    const nb = g.pred.neighbours[0]
    return { ...r, index, exampleId: nb ? run.brain.examples[nb.index].id : null }
  })
  const tally = new Map<MistakeCause, number>()
  causes.forEach((c) => tally.set(c.cause, (tally.get(c.cause) ?? 0) + 1))
  const top = [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0]
  // Most common mix-up, e.g. "→ read as ←"
  const pairs = new Map<string, number>()
  wrong.forEach(({ g }) => {
    const key = `${glyph(g.item.truth)} read as ${g.pred.label ? glyph(g.pred.label) : '?'}`
    pairs.set(key, (pairs.get(key) ?? 0) + 1)
  })
  const [pair, pn] = [...pairs.entries()].sort((a, b) => b[1] - a[1])[0]
  // Same reason for several parcels → one row ("Parcels 1, 2, 7: …").
  const grouped: CauseRow[] = []
  const others = new Map<string, number[]>()
  for (const c of causes) {
    const key = c.text.replace(/\(.*?\)/g, '')
    const list = others.get(key)
    if (list) list.push(c.index)
    else {
      others.set(key, [c.index])
      grouped.push(c)
    }
  }
  return {
    headline: `Most mistakes: ${pair} (${pn}×). ${lessonFor(top, run.brain)}`,
    top,
    causes: grouped.map((c) => ({ ...c, also: (others.get(c.text.replace(/\(.*?\)/g, '')) ?? []).slice(1) })),
  }
}

// ── Dataset edits ───────────────────────────────────────────────────────────

/**
 * The number for a new or relabelled example: one more than the highest in the
 * same label AND source, so "the intern's 2nd →" counts only intern → drawings,
 * and deleting then adding never repeats a name.
 */
export function nextNumber(xs: Example[], label: ClassId, source: Example['source'], exceptId?: number): number {
  return Math.max(0, ...xs.filter((e) => e.label === label && e.source === source && e.id !== exceptId).map((e) => e.n)) + 1
}

/** Copies per drawing when augmenting. */
export const AUG_COPIES = 2

/**
 * Data augmentation over the WHOLE training set (factory, intern and the
 * child's own drawings), as real teams do: every copy keeps its label — and a
 * wrong label too, which is why you clean before you augment. Old copies are
 * replaced, so pressing it twice never stacks copies of copies.
 */
export function augmentDataset(xs: Example[], maxExamples: number): { examples: Example[]; added: number; wanted: number; wrongCopies: number } {
  const base = xs.filter((e) => e.source !== 'augment')
  const room = Math.max(0, maxExamples - base.length)
  const copies: Example[] = []
  const per: Record<ClassId, number> = { left: 0, right: 0, circle: 0, tri: 0, stop: 0 }
  let wrongCopies = 0
  for (const e of base) {
    const rng = makeRng(e.id * 131 + 17)
    for (let j = 0; j < AUG_COPIES && copies.length < room; j++) {
      per[e.label]++
      if (e.truth && e.truth !== e.label) wrongCopies++
      copies.push({ id: newId(), label: e.label, drawing: augmentDrawing(e.drawing, VARIATION.augment, rng), source: 'augment', n: per[e.label], parent: e.id, truth: e.truth, sampled: e.source === 'sample' || undefined })
    }
  }
  return { examples: [...base, ...copies], added: copies.length, wanted: base.length * AUG_COPIES, wrongCopies }
}

/**
 * Relabel one example. Its augmented copies follow it (a copy of a fixed
 * drawing is fixed too), so cleaning after augmenting still works.
 */
export function relabelExample(xs: Example[], id: number, to: ClassId): Example[] {
  const me = xs.find((e) => e.id === id)
  if (!me) return xs
  const fix = (e: Example): Example => ({ ...e, label: to, truth: e.truth && e.truth !== to ? e.truth : undefined })
  const n = nextNumber(xs, to, me.source, id)
  let copyN = nextNumber(xs, to, 'augment') - 1
  return xs.map((e) => (e.id === id ? { ...fix(e), n } : e.parent === id ? { ...fix(e), n: ++copyN } : e))
}

/** Delete one example and any augmented copies of it. */
export function deleteExample(xs: Example[], id: number): Example[] {
  return xs.filter((e) => e.id !== id && e.parent !== id)
}
