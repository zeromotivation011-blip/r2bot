// components/kids/games/robot-brain/robot-brain.verify.ts
// Guards for Train the Robot Brain (run: npx tsx components/kids/games/robot-brain/robot-brain.verify.ts).
// Pure: the real brain, tiers, generator and debrief code, no DOM.
//
// What it proves (Wave 3 QA):
//  · Legend is genuinely hard: a random brain design on the data as given
//    (factory labels uncleaned, ✨ samples, no augmentation) rarely passes the
//    exam, while cleaning + own drawings + augmentation usually does, and each
//    of cleaning and augmentation measurably matters.
//  · Every run (and every exam) uses new parcels; validation ≠ exam.
//  · The debrief never says something false: Ace's delete-only data is blamed
//    on imbalance (not on labels that are gone), perfect-score headlines only
//    claim what the data really had, no lesson claims features undo rotation.
//  · ✨ Sample data caps a finish at 2 stars (the shared hint rule), and Ace's
//    3rd star needs clean labels.
//  · Leave-one-out accuracy changes with k (training accuracy cannot show it).
//  · Example names never repeat; the page copy matches the Ace dataset.

import { evaluate, leaveOneOutAccuracy, train, trainingAccuracy, type Evaluation, type Example, type Representation } from './brain'
import {
  augmentDataset,
  CAUSE_LESSON,
  deleteExample,
  finishStars,
  nextNumber,
  perfectHeadline,
  relabelExample,
  runStars,
  summarize,
  usedSamples,
  wrongLeft,
  type RunResult,
} from './debrief'
import { QUIZZES } from './quiz'
import { generateDrawing, makeRng, VARIATION, type ClassId, type Variation } from './symbols'
import { needed, newId, starterData, tierTestSet, tierValidationSet, TIERS, type TierConfig } from './tiers'

let failures = 0
function check(ok: boolean, msg: string) {
  if (ok) console.log(`  ok  ${msg}`)
  else {
    failures++
    console.error(`  FAIL ${msg}`)
  }
}

const K_CHOICES = [1, 3, 5, 7, 9]
const [CADET, PILOT, ACE, LEGEND] = TIERS

/** n drawings per class made by the generator (a child's own = 'you', the ✨ button = 'sample'). */
function drawn(cfg: TierConfig, per: number, v: Variation, seed: number, source: Example['source']): Example[] {
  const rng = makeRng(seed)
  const out: Example[] = []
  for (const c of cfg.classes) for (let i = 0; i < per; i++) out.push({ id: newId(), label: c, drawing: generateDrawing(c, v, rng).drawing, source, n: i + 1 })
  return out
}
const clean = (xs: Example[]): Example[] => xs.map((e) => (e.truth ? relabelOne(e) : e))
function relabelOne(e: Example): Example {
  return { ...e, label: e.truth as ClassId, truth: undefined }
}
function runOf(cfg: TierConfig, xs: Example[], rep: Representation, k: number, run: number): RunResult {
  const brain = train(xs, cfg.classes, rep, k)
  return { kind: cfg.hasValidation ? 'exam' : 'test', ev: evaluate(brain, tierTestSet(cfg, run)), brain }
}
function winRate(cfg: TierConfig, build: (s: number) => Example[], rep: Representation, k: number, seeds = 3, runs = 20): { win: number; avg: number } {
  let w = 0
  let acc = 0
  let n = 0
  for (let s = 0; s < seeds; s++) {
    const xs = build(s)
    const brain = train(xs, cfg.classes, rep, k)
    for (let r = 0; r < runs; r++) {
      const ev = evaluate(brain, tierTestSet(cfg, 1000 + s * 97 + r))
      acc += ev.accuracy
      n++
      if (ev.correct >= needed(cfg.stars[0], ev.total)) w++
    }
  }
  return { win: w / n, avg: acc / n }
}
const pct = (x: number) => `${(100 * x).toFixed(1)}%`

// ── 1. Legend difficulty ────────────────────────────────────────────────────
console.log('Legend difficulty')
{
  const factory = starterData(LEGEND)
  check(wrongLeft(factory) >= 3, `factory data ships with wrong labels (${wrongLeft(factory)})`)
  const samples = (s: number) => drawn(LEGEND, LEGEND.minPerClass, VARIATION.neat, 300 + s, 'sample')
  const own = (s: number) => drawn(LEGEND, 4, VARIATION.strangers, 400 + s, 'you')

  // A random brain design on the data as given: any representation, any k, maybe augmented, never cleaned.
  const rng = makeRng(77)
  let wins = 0
  const N = 120
  for (let i = 0; i < N; i++) {
    const rep: Representation = rng() < 0.5 ? 'raw' : 'features'
    const k = K_CHOICES[Math.floor(rng() * K_CHOICES.length)]
    let xs = [...factory, ...samples(i % 5)]
    if (rng() < 0.5) xs = augmentDataset(xs, LEGEND.maxExamples).examples
    const ev = evaluate(train(xs, LEGEND.classes, rep, k), tierTestSet(LEGEND, 5000 + i))
    if (ev.correct >= needed(LEGEND.stars[0], ev.total)) wins++
  }
  console.log(`     random design, data as given: wins ${wins}/${N} (${pct(wins / N)})`)
  check(wins / N < 0.12, 'a random design on uncleaned data passes the Legend exam less than 12% of the time')

  // The QA repro: two ✨ samples per class, features, k = 5, nothing else.
  const lazy = winRate(LEGEND, (s) => [...factory, ...samples(s)], 'features', 5)
  console.log(`     QA repro (samples, features, k=5): avg ${pct(lazy.avg)}, wins ${pct(lazy.win)}`)
  check(lazy.win < 0.15, 'the QA "samples + features + k=5" shortcut rarely passes')

  const best = { win: 0, avg: 0, k: 0 }
  const cleanOnly = { win: 0, avg: 0 }
  const augDirty = { win: 0, avg: 0 }
  for (const k of [1, 3]) {
    const d = winRate(LEGEND, (s) => augmentDataset([...clean(factory), ...own(s)], LEGEND.maxExamples).examples, 'features', k)
    const c = winRate(LEGEND, (s) => [...clean(factory), ...own(s)], 'features', k)
    const a = winRate(LEGEND, (s) => augmentDataset([...factory, ...own(s)], LEGEND.maxExamples).examples, 'features', k)
    console.log(`     k=${k}: clean+own+augment avg ${pct(d.avg)} wins ${pct(d.win)} | clean only ${pct(c.avg)}/${pct(c.win)} | augment dirty ${pct(a.avg)}/${pct(a.win)}`)
    if (d.win > best.win) Object.assign(best, d, { k })
    if (c.win > cleanOnly.win) Object.assign(cleanOnly, c)
    if (a.win > augDirty.win) Object.assign(augDirty, a)
  }
  check(best.win >= 0.5, `doing the work (clean + own drawings + augment, k=${best.k}) passes at least half the exams (${pct(best.win)})`)
  check(best.win > cleanOnly.win + 0.25, 'augmentation matters: it beats cleaning alone by 25+ points of win rate')
  check(best.win > augDirty.win + 0.1, 'cleaning matters: augmenting dirty data (which copies the wrong labels) wins less')
  const dirtyAug = augmentDataset([...factory, ...own(0)], LEGEND.maxExamples)
  check(dirtyAug.wrongCopies === wrongLeft(factory) * 2, 'augmenting copies wrong labels too (the reason to clean first)')
}

// ── 2. Held-out parcels ─────────────────────────────────────────────────────
console.log('Held-out parcels')
{
  const key = (cfg: TierConfig, run: number) => JSON.stringify(tierTestSet(cfg, run).map((t) => t.drawing[0]?.[0]))
  for (const cfg of TIERS) check(key(cfg, 0) !== key(cfg, 1) && key(cfg, 1) !== key(cfg, 2), `${['Cadet', 'Pilot', 'Ace', 'Legend'][cfg.index]}: every run gets new parcels`)
  const val = JSON.stringify(tierValidationSet(LEGEND).map((t) => t.drawing[0]?.[0]))
  let clash = 0
  for (let r = 0; r < 200; r++) if (key(LEGEND, r) === val) clash++
  check(clash === 0, 'the Legend validation set is never an exam')
  check(needed(LEGEND.stars[0], 24) === 22 && needed(LEGEND.stars[1], 24) === 23, 'Legend thresholds are whole parcels: 22 to pass, 23 for ⭐⭐ (both shown in the UI)')
}

// ── 3. Ace: the debrief tells the truth ─────────────────────────────────────
console.log('Ace debriefs')
{
  const intern = starterData(ACE)
  const lefts = intern.filter((e) => e.label === 'left')
  check(lefts.length === 12 && wrongLeft(lefts) === 4, `page copy: the ← row has 12 drawings, 4 really → (${lefts.length}, ${wrongLeft(lefts)})`)
  check(intern.filter((e) => e.label === 'stop').length === 7 && intern.filter((e) => e.label === 'right').length === 1, 'page copy: seven ✕ and one tiny →')

  const asIs = runOf(ACE, intern, 'features', ACE.k, 0)
  const s0 = summarize(asIs, ACE)
  check(asIs.ev.correct < needed(ACE.stars[0], asIs.ev.total), `the intern's data fails (${asIs.ev.correct}/${asIs.ev.total})`)
  check(s0.top === 'mislabel' || s0.top === 'outvoted', `first debrief blames labels or imbalance (${s0.top})`)

  // Delete the wrong labels only: the wrong labels are gone, so the debrief must not blame them.
  const deleted = intern.filter((e) => !e.truth)
  let deleteWins = 0
  let blamedGhosts = 0
  for (let r = 0; r < 20; r++) {
    const run = runOf(ACE, deleted, 'features', ACE.k, r)
    if (run.ev.correct >= needed(ACE.stars[0], run.ev.total)) deleteWins++
    const sm = summarize(run, ACE)
    if (sm.top === 'mislabel' || sm.causes.some((c) => c.cause === 'mislabel')) blamedGhosts++
    if (r === 0) console.log(`     delete-only: ${run.ev.correct}/${run.ev.total}, top cause ${sm.top}`)
  }
  check(deleteWins === 0, 'deleting the wrong labels alone never wins (→ is still out-voted)')
  check(blamedGhosts === 0, 'after deleting them, no debrief blames wrong labels that are gone')
  const top = summarize(runOf(ACE, deleted, 'features', ACE.k, 0), ACE).top
  check(top === 'outvoted', `…it says the data is lopsided instead (${top})`)

  // Relabelling fixes both problems.
  let fixedWins = 0
  for (let r = 0; r < 20; r++) {
    const run = runOf(ACE, clean(intern), 'features', ACE.k, r)
    if (run.ev.correct >= needed(ACE.stars[0], run.ev.total)) fixedWins++
  }
  check(fixedWins >= 18, `relabelling the four wins (${fixedWins}/20)`)

  // Out-number the wrong labels without fixing them: never 3 stars, and the headline says so.
  const outnumber = [...intern, ...drawn({ ...ACE, classes: ['right'] }, 6, VARIATION.everyday, 9, 'you')]
  let perfectDirty = 0
  let honest = 0
  for (let r = 0; r < 40; r++) {
    const run = runOf(ACE, outnumber, 'features', ACE.k, r)
    if (run.ev.correct === run.ev.total) {
      perfectDirty++
      if (runStars(run, ACE).stars === 2 && /still labelled wrong/.test(perfectHeadline(run, ACE))) honest++
    }
  }
  console.log(`     out-numbering without fixing: ${perfectDirty}/40 perfect runs`)
  check(perfectDirty > 0 && honest === perfectDirty, 'a perfect run with wrong labels left gets 2 stars and a headline that says the labels are still wrong')
}

// ── 4. Lessons and headlines are true ───────────────────────────────────────
console.log('Lessons and headlines')
{
  for (const [cause, text] of Object.entries(CAUSE_LESSON)) {
    const claimsRotation = /features[^.]*(fix|undo|handle)[^.]*(tilt|rotat|turn)/i.test(text) && !/not rotation|NOT rotation|not tilt/i.test(text)
    check(!claimsRotation, `lesson "${cause}" never claims features undo rotation`)
  }
  // Raw pixels on the Legend exam: position mistakes are explained as position.
  const factory = clean(starterData(LEGEND))
  const own = drawn(LEGEND, 4, VARIATION.neat, 5, 'you')
  const raw = summarize(runOf(LEGEND, [...factory, ...own], 'raw', 3, 0), LEGEND)
  check(raw.causes.some((c) => c.cause === 'position'), 'raw pixels: the debrief names position/size')
  const feat = summarize(runOf(LEGEND, [...factory, ...own], 'features', 3, 0), LEGEND)
  check(feat.causes.some((c) => c.cause === 'tilt'), 'features without turned data: the debrief names rotation')
  check(!feat.causes.some((c) => c.cause === 'position'), 'features: never blamed on position (features undo it)')
  // Already augmented: the headline must not tell the child to augment.
  let augTilt = 0
  let wrongAdvice = 0
  for (let r = 0; r < 40; r++) {
    const run = runOf(LEGEND, augmentDataset([...factory, ...own], LEGEND.maxExamples).examples, 'features', 3, r)
    const sm = summarize(run, LEGEND)
    if (sm.top === 'tilt') {
      augTilt++
      if (/augmented copies teach/.test(sm.headline) || !/even with augmented copies/.test(sm.headline)) wrongAdvice++
    }
  }
  check(wrongAdvice === 0, 'augmented data is never told to "add augmented copies"; it gets the "copies are only as varied as the drawings" lesson')
  check(augTilt > 0, `some augmented runs still miss turned parcels (${augTilt}/40), and are told the right next step`)

  // Perfect headlines only claim what happened.
  const fake = (cfg: TierConfig, hurried: boolean, xs: Example[], rep: Representation): RunResult => {
    const items = tierTestSet(cfg, 0).map((t) => ({ ...t, hurried }))
    const brain = train(xs, cfg.classes, rep, 3)
    const ev: Evaluation = { graded: items.map((item) => ({ item, pred: { label: item.truth, votes: { left: 0, right: 0, circle: 0, tri: 0, stop: 0 }, neighbours: [], unfamiliar: false }, correct: true })), correct: items.length, total: items.length, accuracy: 1, matrix: [] }
    return { kind: 'test', ev, brain }
  }
  const cadetXs = drawn(CADET, 3, VARIATION.everyday, 3, 'you')
  check(!/hurr/i.test(perfectHeadline(fake(CADET, false, cadetXs, 'features'), CADET)), 'Cadet: no "hurried" praise when no parcel was hurried')
  check(/hurr/i.test(perfectHeadline(fake(CADET, true, cadetXs, 'features'), CADET)), 'Cadet: hurried parcels are named when there were some')
  const pilotXs = drawn(PILOT, 3, VARIATION.everyday, 3, 'you')
  check(!/hurr/i.test(perfectHeadline(fake(PILOT, false, pilotXs, 'features'), PILOT)), 'Pilot: no "hurried" praise when no parcel was hurried')
  const legRaw = perfectHeadline(fake(LEGEND, true, [...factory, ...own], 'raw'), LEGEND)
  check(!/features ignored/.test(legRaw), 'Legend: a raw-pixels win is not credited to features')
  check(!/augment/.test(legRaw), 'Legend: no augmentation praise without augmented data')
  const legAug = perfectHeadline(fake(LEGEND, true, augmentDataset([...factory, ...own], 100).examples, 'features'), LEGEND)
  check(/features ignored/.test(legAug) && /augmented/.test(legAug), 'Legend: features + augmentation credited when used')
}

// ── 5. Stars: ✨ samples (the shared 2-star rule), Legend bonus ─────────────
console.log('Stars')
{
  const samples = drawn(CADET, 3, VARIATION.neat, 11, 'sample')
  const own = drawn(CADET, 3, VARIATION.everyday, 12, 'you')
  let sampled3 = 0
  let own3 = 0
  for (let r = 0; r < 30; r++) {
    const a = runStars(runOf(CADET, samples, 'features', 3, r), CADET)
    const b = runStars(runOf(CADET, own, 'features', 3, r), CADET)
    if (a.stars === 3) sampled3++
    if (b.stars === 3) own3++
    if (a.stars === 2 && a.capped !== 'samples' && runOf(CADET, samples, 'features', 3, r).ev.accuracy === 1) sampled3 += 100
  }
  check(sampled3 === 0, 'Cadet: ✨ sample data never earns 3 stars (capped at 2)')
  check(own3 > 0, `Cadet: the child's own drawings can earn 3 stars (${own3}/30)`)
  const aug = augmentDataset(samples, 50).examples.filter((e) => e.source === 'augment')
  check(usedSamples(aug), 'copies of sample drawings still count as samples')

  const legend = [...clean(starterData(LEGEND)), ...drawn(LEGEND, 4, VARIATION.strangers, 13, 'you')]
  const data = augmentDataset(legend, LEGEND.maxExamples).examples
  let found = false
  for (let r = 0; r < 60 && !found; r++) {
    const run = runOf(LEGEND, data, 'features', 1, r)
    const base = runStars(run, LEGEND)
    if (base.stars === 2) {
      found = true
      check(finishStars(run, LEGEND, true).stars === 3, 'Legend: exam ⭐⭐ + right bonus answer = 3 stars')
      check(finishStars(run, LEGEND, false).stars === 2, 'Legend: a wrong bonus answer keeps 2')
      const withSample: RunResult = { ...run, brain: { ...run.brain, examples: [...run.brain.examples, { ...run.brain.examples[0], id: newId(), source: 'sample' }] } }
      check(finishStars(withSample, LEGEND, true).stars === 2, 'Legend: sample data caps the bonus star too')
    }
  }
  check(found, 'Legend: an honest design reaches ⭐⭐ on some exam')
}

// ── 6. k shows up in leave-one-out, not in training accuracy ────────────────
console.log('Training vs leave-one-out')
{
  const xs = [...starterData(LEGEND), ...drawn(LEGEND, 4, VARIATION.strangers, 21, 'you')]
  const at = (k: number) => {
    const b = train(xs, LEGEND.classes, 'features', k)
    return { train: trainingAccuracy(b), loo: leaveOneOutAccuracy(b) }
  }
  const k1 = at(1)
  const k5 = at(5)
  const k9 = at(9)
  console.log(`     k=1 train ${pct(k1.train)} LOO ${pct(k1.loo)} · k=5 train ${pct(k5.train)} LOO ${pct(k5.loo)} · k=9 train ${pct(k9.train)} LOO ${pct(k9.loo)}`)
  check(k1.train === 1, 'k = 1 training accuracy is always 100% (memory)')
  check(k1.loo < 0.95, 'leave-one-out at k = 1 is an honest number below 100%')
  check(Math.abs(k1.loo - k5.loo) > 0.01 || Math.abs(k5.loo - k9.loo) > 0.01, 'leave-one-out changes with k, so the experiment log can show k')
}

// ── 7. Names, relabel, delete ───────────────────────────────────────────────
console.log('Example names')
{
  let xs: Example[] = []
  const add = (label: ClassId, source: Example['source']) => {
    const e: Example = { id: newId(), label, drawing: [[[0.2, 0.5], [0.8, 0.5]]], source, n: nextNumber(xs, label, source) }
    xs = [...xs, e]
    return e
  }
  const a = add('left', 'you')
  add('left', 'you')
  const c = add('left', 'you')
  xs = deleteExample(xs, a.id)
  const d = add('left', 'you')
  check(d.n === c.n + 1, 'delete then add never repeats "your 3rd ← drawing"')
  const intern = starterData(ACE)
  add('right', 'you')
  add('right', 'you')
  add('right', 'you')
  let mixed = [...intern, ...xs]
  const wrong = mixed.find((e) => e.truth === 'right')
  if (!wrong) throw new Error('no wrong label in the Ace data')
  mixed = relabelExample(mixed, wrong.id, 'right')
  const fixed = mixed.find((e) => e.id === wrong.id)
  check(fixed?.n === 2 && fixed.source === 'intern', `a relabelled intern drawing is "the intern's 2nd →", whatever you drew (${fixed?.n})`)
  const augd = augmentDataset(starterData(LEGEND), 100).examples
  const bad = augd.find((e) => e.source === 'factory' && e.truth)
  if (bad) {
    const after = relabelExample(augd, bad.id, bad.truth as ClassId)
    check(wrongLeft(after) === wrongLeft(augd) - 1 - 2, 'relabelling a drawing fixes its augmented copies too')
    const names = after.filter((e) => e.source === 'augment').map((e) => `${e.label}#${e.n}`)
    check(new Set(names).size === names.length, 'augmented copy names stay unique after a relabel')
    check(deleteExample(augd, bad.id).length === augd.length - 3, 'deleting a drawing deletes its copies')
  }
}

// ── 8. The Legend bonus question is not a giveaway ──────────────────────────
console.log('Bonus questions')
for (const q of QUIZZES) {
  const lens = q.options.map((o) => o.length)
  check(Math.max(...lens) / Math.min(...lens) < 1.6, `options are of similar length: "${q.q.slice(0, 40)}…"`)
  check(!q.options.some((o) => /overfitting/i.test(o)), 'no option gives the answer away by naming it')
}

if (failures) {
  console.error(`\n${failures} check(s) failed`)
  process.exit(1)
}
console.log('\nrobot-brain: all checks passed')
