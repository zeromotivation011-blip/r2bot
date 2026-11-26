// components/kids/games/robot-brain/brain.ts
// The robot's brain: turn a drawing into numbers (features), then classify it
// with k-nearest-neighbours — written from scratch, no ML library.
//
//   raw pixels   → ink on a 16×16 grid laid over the whole pad. Where you drew
//                  matters, how big you drew matters.
//   features     → engineered: find the drawing (ignoring stray specks), centre
//                  it, scale it to fit a 10×10 grid, blur it a little, then add
//                  a 4-bin line-direction histogram and the width/height shape.
//
// k-NN: measure the distance from the new drawing to every training example,
// take the k closest, and let them vote (closer = louder vote).

import type { ClassId, Drawing, Pt } from './symbols'

export type Representation = 'features' | 'raw'

export const RAW_N = 16
export const FEAT_N = 10

export interface Example {
  id: number
  label: ClassId
  drawing: Drawing
  /** Who made it. 'intern' / 'factory' examples are given at Ace / Legend. */
  source: 'you' | 'sample' | 'augment' | 'intern' | 'factory'
  /** 1-based number within its label and source, for "your 3rd ← drawing". */
  n: number
  /** The shape actually drawn, when it differs from the label (bad data). */
  truth?: ClassId
}

export interface FeatureVec {
  v: Float32Array
  /** The grid part only, 0..1, for "what the robot sees". */
  grid: Float32Array
  gridN: number
}

// ── Ink sampling ────────────────────────────────────────────────────────────

/** Points spaced evenly along the ink, so every bit of line counts equally. */
export function inkPoints(d: Drawing, step = 0.008): Pt[] {
  const out: Pt[] = []
  for (const s of d) {
    if (s.length === 1) {
      out.push(s[0])
      continue
    }
    for (let i = 1; i < s.length; i++) {
      const [x0, y0] = s[i - 1]
      const [x1, y1] = s[i]
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / step))
      for (let j = 0; j < n; j++) out.push([x0 + ((x1 - x0) * j) / n, y0 + ((y1 - y0) * j) / n])
    }
    out.push(s[s.length - 1])
  }
  return out
}

export function inkLength(d: Drawing): number {
  let L = 0
  for (const s of d) for (let i = 1; i < s.length; i++) L += Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1])
  return L
}

function splat(grid: Float32Array, n: number, gx: number, gy: number) {
  // Bilinear splat so a line between cells shares its ink fairly.
  const x = gx - 0.5
  const y = gy - 0.5
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const fx = x - x0
  const fy = y - y0
  const add = (cx: number, cy: number, w: number) => {
    if (cx >= 0 && cy >= 0 && cx < n && cy < n) grid[cy * n + cx] += w
  }
  add(x0, y0, (1 - fx) * (1 - fy))
  add(x0 + 1, y0, fx * (1 - fy))
  add(x0, y0 + 1, (1 - fx) * fy)
  add(x0 + 1, y0 + 1, fx * fy)
}

function blur(grid: Float32Array, n: number): Float32Array {
  const out = new Float32Array(n * n)
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      let s = 0
      let w = 0
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const X = x + dx
          const Y = y + dy
          if (X < 0 || Y < 0 || X >= n || Y >= n) continue
          const k = dx === 0 && dy === 0 ? 4 : dx === 0 || dy === 0 ? 2 : 1
          s += grid[Y * n + X] * k
          w += k
        }
      out[y * n + x] = s / w
    }
  return out
}

function normalizeMax(g: Float32Array): Float32Array {
  let m = 0
  for (const v of g) m = Math.max(m, v)
  if (m > 0) for (let i = 0; i < g.length; i++) g[i] = Math.min(1, g[i] / m)
  return g
}

function l2(g: Float32Array): number {
  let s = 0
  for (const v of g) s += v * v
  return Math.sqrt(s)
}

function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return 0.5
  const i = Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))
  return sorted[i]
}

// ── Representations ─────────────────────────────────────────────────────────

export function rawFeatures(d: Drawing): FeatureVec {
  const n = RAW_N
  const grid = new Float32Array(n * n)
  for (const [x, y] of inkPoints(d)) splat(grid, n, x * n, y * n)
  // Raw = what landed in each square, capped. No centring, no scaling.
  for (let i = 0; i < grid.length; i++) grid[i] = Math.min(1, grid[i] / 3)
  const v = new Float32Array(grid)
  const len = l2(v) || 1
  for (let i = 0; i < v.length; i++) v[i] /= len
  return { v, grid, gridN: n }
}

const ORIENT_W = 0.7
const SHAPE_W = 0.6

export function engineeredFeatures(d: Drawing): FeatureVec {
  const n = FEAT_N
  const pts = inkPoints(d)
  // Robust box: ignore the outer 3% of ink, so a stray speck can't stretch it.
  const xs = pts.map((p) => p[0]).sort((a, b) => a - b)
  const ys = pts.map((p) => p[1]).sort((a, b) => a - b)
  const x0 = quantile(xs, 0.03)
  const x1 = quantile(xs, 0.97)
  const y0 = quantile(ys, 0.03)
  const y1 = quantile(ys, 0.97)
  const w = Math.max(0.01, x1 - x0)
  const h = Math.max(0.01, y1 - y0)
  const size = Math.max(w, h)
  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2
  const grid0 = new Float32Array(n * n)
  for (const [x, y] of pts) {
    const u = 0.5 + ((x - cx) / size) * 0.86
    const v = 0.5 + ((y - cy) / size) * 0.86
    if (u < -0.05 || u > 1.05 || v < -0.05 || v > 1.05) continue // a speck far outside the box
    splat(grid0, n, u * n, v * n)
  }
  const grid = normalizeMax(blur(grid0, n))
  // Line directions, undirected (a line drawn left→right equals right→left),
  // soft-binned into 0°, 45°, 90°, 135°.
  const orient = new Float32Array(4)
  for (const s of d)
    for (let i = 1; i < s.length; i++) {
      const dx = s[i][0] - s[i - 1][0]
      const dy = s[i][1] - s[i - 1][1]
      const len = Math.hypot(dx, dy)
      if (len < 1e-6) continue
      let a = Math.atan2(dy, dx)
      if (a < 0) a += Math.PI
      const b = (a / (Math.PI / 4)) % 4
      const b0 = Math.floor(b) % 4
      const f = b - Math.floor(b)
      orient[b0] += len * (1 - f)
      orient[(b0 + 1) % 4] += len * f
    }
  const osum = orient.reduce((p, q) => p + q, 0) || 1
  const gl = l2(grid) || 1
  const v = new Float32Array(n * n + 5)
  for (let i = 0; i < n * n; i++) v[i] = grid[i] / gl
  for (let i = 0; i < 4; i++) v[n * n + i] = (orient[i] / osum) * ORIENT_W
  v[n * n + 4] = ((w - h) / (w + h)) * SHAPE_W
  return { v, grid, gridN: n }
}

export function featurize(d: Drawing, rep: Representation): FeatureVec {
  return rep === 'raw' ? rawFeatures(d) : engineeredFeatures(d)
}

export function distance(a: Float32Array, b: Float32Array): number {
  let s = 0
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i]
    s += d * d
  }
  return Math.sqrt(s)
}

/** 0..100% "looks alike" score shown to children (distance ≤ 2 for unit vectors). */
export function similarity(dist: number): number {
  return Math.max(0, Math.round(100 * (1 - dist / 1.4)))
}

// ── k-nearest-neighbours ────────────────────────────────────────────────────

export interface Neighbour {
  index: number
  dist: number
}

export interface Prediction {
  label: ClassId | null
  /** Share of the vote per class, 0..1, in the order of `classes`. */
  votes: Record<ClassId, number>
  neighbours: Neighbour[]
  /** True when even the closest example is far away. */
  unfamiliar: boolean
}

export interface TrainedBrain {
  rep: Representation
  k: number
  classes: ClassId[]
  examples: Example[]
  vecs: Float32Array[]
}

export function train(examples: Example[], classes: ClassId[], rep: Representation, k: number): TrainedBrain {
  return { rep, k, classes, examples, vecs: examples.map((e) => featurize(e.drawing, rep).v) }
}

function emptyVotes(): Record<ClassId, number> {
  return { left: 0, right: 0, circle: 0, stop: 0 }
}

export function predictVec(brain: TrainedBrain, q: Float32Array, skip = -1): Prediction {
  const votes = emptyVotes()
  if (!brain.examples.length) return { label: null, votes, neighbours: [], unfamiliar: true }
  const all: Neighbour[] = []
  for (let i = 0; i < brain.vecs.length; i++) {
    if (i === skip) continue
    all.push({ index: i, dist: distance(q, brain.vecs[i]) })
  }
  all.sort((a, b) => a.dist - b.dist || a.index - b.index)
  const near = all.slice(0, Math.max(1, Math.min(brain.k, all.length)))
  let total = 0
  for (const nb of near) {
    const w = 1 / (nb.dist + 0.08)
    votes[brain.examples[nb.index].label] += w
    total += w
  }
  let best: ClassId | null = null
  for (const c of brain.classes) {
    votes[c] = total > 0 ? votes[c] / total : 0
    if (best === null || votes[c] > votes[best] + 1e-9) best = c
  }
  return { label: best, votes, neighbours: near, unfamiliar: near[0].dist > 0.95 }
}

export function predict(brain: TrainedBrain, d: Drawing): Prediction {
  return predictVec(brain, featurize(d, brain.rep).v)
}

// ── Evaluation ──────────────────────────────────────────────────────────────

export interface TestItem {
  drawing: Drawing
  truth: ClassId
  /** Plain-language note on how it was drawn ("tilted 20°, small, moved left"). */
  note: string
}

export interface Graded {
  item: TestItem
  pred: Prediction
  correct: boolean
}

export interface Evaluation {
  graded: Graded[]
  correct: number
  total: number
  accuracy: number
  /** matrix[trueIndex][predIndex] */
  matrix: number[][]
}

export function evaluate(brain: TrainedBrain, items: TestItem[]): Evaluation {
  const C = brain.classes
  const matrix = C.map(() => C.map(() => 0))
  const graded = items.map((item) => {
    const pred = predict(brain, item.drawing)
    const ti = C.indexOf(item.truth)
    const pi = pred.label ? C.indexOf(pred.label) : -1
    if (ti >= 0 && pi >= 0) matrix[ti][pi]++
    return { item, pred, correct: pred.label === item.truth }
  })
  const correct = graded.filter((g) => g.correct).length
  return { graded, correct, total: items.length, accuracy: items.length ? correct / items.length : 0, matrix }
}

/**
 * Accuracy on the training data itself, the way most libraries report it: the
 * example is allowed to find itself. With k = 1 that is always 100% — the
 * classic sign that "training accuracy" says nothing about new drawings.
 */
export function trainingAccuracy(brain: TrainedBrain): number {
  if (!brain.examples.length) return 0
  let ok = 0
  brain.vecs.forEach((v, i) => {
    if (predictVec(brain, v).label === brain.examples[i].label) ok++
  })
  return ok / brain.examples.length
}

// ── Explaining mistakes ─────────────────────────────────────────────────────

export function exampleName(e: Example, glyph: string): string {
  const ord = ordinal(e.n)
  switch (e.source) {
    case 'you':
      return `your ${ord} ${glyph} drawing`
    case 'sample':
      return `the ${ord} ${glyph} sample you added`
    case 'augment':
      return `augmented ${glyph} copy #${e.n}`
    case 'intern':
      return `the intern's ${ord} ${glyph} example`
    case 'factory':
      return `factory ${glyph} example #${e.n}`
  }
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export type MistakeCause = 'mislabel' | 'outvoted' | 'position' | 'unfamiliar' | 'lookalike'

export interface MistakeReason {
  cause: MistakeCause
  text: string
}

/** Why did the robot get this one wrong? Looks at the evidence, like a data scientist would. */
export function explainMistake(brain: TrainedBrain, g: Graded, glyph: (c: ClassId) => string): MistakeReason {
  const top = g.pred.neighbours[0]
  const ex = top ? brain.examples[top.index] : null
  const said = g.pred.label ? glyph(g.pred.label) : '?'
  const was = glyph(g.item.truth)
  if (ex && ex.truth && ex.truth !== ex.label) {
    return {
      cause: 'mislabel',
      text: `It was a ${was}, but its closest match was ${exampleName(ex, glyph(ex.label))} — which is really a ${glyph(ex.truth)} with the wrong label. Bad labels teach bad lessons.`,
    }
  }
  const count = brain.examples.filter((e) => e.label === g.item.truth).length
  const biggest = Math.max(...brain.classes.map((c) => brain.examples.filter((e) => e.label === c).length))
  const sameInK = g.pred.neighbours.filter((nb) => brain.examples[nb.index].label === g.item.truth).length
  if (sameInK > 0 && count * 2 < biggest && brain.k > 1) {
    return {
      cause: 'outvoted',
      text: `A ${was} example was among its closest matches, but there are only ${count} ${was} examples against ${biggest} of another kind, so the ${said} examples out-voted it.`,
    }
  }
  if (brain.rep === 'raw' && /moved|small|big/.test(g.item.note)) {
    return {
      cause: 'position',
      text: `This ${was} was ${g.item.note}. Raw pixels compare which squares have ink, so a moved or resized drawing lands on different squares and looks like a ${said}.`,
    }
  }
  if (g.pred.unfamiliar) {
    return {
      cause: 'unfamiliar',
      text: `This ${was} (${g.item.note}) didn't look much like ANY of your examples, so the robot had to guess. More varied ${was} drawings would help.`,
    }
  }
  return {
    cause: 'lookalike',
    text: `This ${was} (${g.item.note}) looked more like ${ex ? exampleName(ex, glyph(ex.label)) : 'another example'} than like your ${was} drawings. Add ${was} examples drawn more like this one.`,
  }
}
