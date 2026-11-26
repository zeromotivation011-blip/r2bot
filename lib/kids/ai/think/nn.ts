// lib/kids/ai/think/nn.ts
// A tiny, honest neural network for the Neural Playground: fully connected
// layers, tanh or ReLU hidden units, one sigmoid output, binary cross-entropy
// loss, full-batch gradients and the Adam optimiser. Written from scratch so
// a curious 15-year-old can read it, and small enough to train 60 times a
// second on a low-end phone. Also: the hand-drawn line (a perceptron) and the
// 2-D datasets children train on. No browser APIs.

import { gauss, makeRng } from './common'

export type Activation = 'tanh' | 'relu'
export type Label = 0 | 1

export interface Pt {
  x: number
  y: number
  label: Label
}

export type FeatureSet = 'xy' | 'xy+squares'

/** Input features for a point. 'xy+squares' adds x², y² and x·y (feature engineering). */
export function features(x: number, y: number, fs: FeatureSet): number[] {
  return fs === 'xy' ? [x, y] : [x, y, x * x, y * y, x * y]
}

export function featureCount(fs: FeatureSet): number {
  return fs === 'xy' ? 2 : 5
}

export interface Net {
  sizes: number[]
  act: Activation
  /** W[l] is sizes[l+1] × sizes[l], row-major (out × in). */
  W: Float64Array[]
  b: Float64Array[]
  mW: Float64Array[]
  vW: Float64Array[]
  mb: Float64Array[]
  vb: Float64Array[]
  t: number
}

export function createNet(inputs: number, hidden: number[], act: Activation, seed = 1): Net {
  const rng = makeRng(seed)
  const sizes = [inputs, ...hidden, 1]
  const W: Float64Array[] = []
  const b: Float64Array[] = []
  for (let l = 0; l < sizes.length - 1; l++) {
    const nIn = sizes[l]
    const nOut = sizes[l + 1]
    // Xavier for tanh, He for ReLU.
    const scale = act === 'relu' && l < sizes.length - 2 ? Math.sqrt(2 / nIn) : Math.sqrt(1 / nIn)
    const w = new Float64Array(nIn * nOut)
    for (let i = 0; i < w.length; i++) w[i] = gauss(rng) * scale
    W.push(w)
    const bias = new Float64Array(nOut)
    if (act === 'relu') bias.fill(0.1)
    b.push(bias)
  }
  const zeros = (a: Float64Array[]) => a.map((x) => new Float64Array(x.length))
  return { sizes, act, W, b, mW: zeros(W), vW: zeros(W), mb: zeros(b), vb: zeros(b), t: 0 }
}

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z))

/** Activations of every layer: acts[0] = inputs, last = [probability of class 1]. */
export function forward(net: Net, input: number[]): Float64Array[] {
  const acts: Float64Array[] = [Float64Array.from(input)]
  const L = net.sizes.length - 1
  for (let l = 0; l < L; l++) {
    const nIn = net.sizes[l]
    const nOut = net.sizes[l + 1]
    const a = acts[l]
    const out = new Float64Array(nOut)
    const w = net.W[l]
    for (let j = 0; j < nOut; j++) {
      let z = net.b[l][j]
      const row = j * nIn
      for (let i = 0; i < nIn; i++) z += w[row + i] * a[i]
      if (l === L - 1) out[j] = sigmoid(z)
      else out[j] = net.act === 'tanh' ? Math.tanh(z) : z > 0 ? z : 0
    }
    acts.push(out)
  }
  return acts
}

export function predict(net: Net, input: number[]): number {
  const acts = forward(net, input)
  return acts[acts.length - 1][0]
}

export interface StepStats {
  loss: number
  accuracy: number
}

/** One full-batch Adam step on all points. Returns loss/accuracy BEFORE the step. */
export function trainStep(net: Net, pts: Pt[], fs: FeatureSet, lr: number): StepStats {
  if (pts.length === 0) return { loss: 0, accuracy: 1 }
  const L = net.sizes.length - 1
  const gW = net.W.map((w) => new Float64Array(w.length))
  const gb = net.b.map((x) => new Float64Array(x.length))
  let loss = 0
  let correct = 0
  for (const p of pts) {
    const acts = forward(net, features(p.x, p.y, fs))
    const yhat = acts[L][0]
    const eps = 1e-7
    loss += -(p.label * Math.log(yhat + eps) + (1 - p.label) * Math.log(1 - yhat + eps))
    if ((yhat >= 0.5 ? 1 : 0) === p.label) correct++
    // Backprop. For sigmoid + cross-entropy, dL/dz_out = yhat − y.
    let delta = new Float64Array([yhat - p.label])
    for (let l = L - 1; l >= 0; l--) {
      const nIn = net.sizes[l]
      const nOut = net.sizes[l + 1]
      const a = acts[l]
      const w = net.W[l]
      for (let j = 0; j < nOut; j++) {
        gb[l][j] += delta[j]
        const row = j * nIn
        for (let i = 0; i < nIn; i++) gW[l][row + i] += delta[j] * a[i]
      }
      if (l > 0) {
        const prev = new Float64Array(nIn)
        for (let i = 0; i < nIn; i++) {
          let s = 0
          for (let j = 0; j < nOut; j++) s += w[j * nIn + i] * delta[j]
          const ai = a[i]
          prev[i] = net.act === 'tanh' ? s * (1 - ai * ai) : ai > 0 ? s : 0
        }
        delta = prev
      }
    }
  }
  const n = pts.length
  net.t++
  const b1 = 0.9
  const b2 = 0.999
  const c1 = 1 - Math.pow(b1, net.t)
  const c2 = 1 - Math.pow(b2, net.t)
  const upd = (p: Float64Array, g: Float64Array, m: Float64Array, v: Float64Array) => {
    for (let i = 0; i < p.length; i++) {
      const gi = g[i] / n
      m[i] = b1 * m[i] + (1 - b1) * gi
      v[i] = b2 * v[i] + (1 - b2) * gi * gi
      p[i] -= (lr * (m[i] / c1)) / (Math.sqrt(v[i] / c2) + 1e-8)
    }
  }
  for (let l = 0; l < L; l++) {
    upd(net.W[l], gW[l], net.mW[l], net.vW[l])
    upd(net.b[l], gb[l], net.mb[l], net.vb[l])
  }
  return { loss: loss / n, accuracy: correct / n }
}

export function evaluate(net: Net, pts: Pt[], fs: FeatureSet): StepStats {
  if (pts.length === 0) return { loss: 0, accuracy: 1 }
  let loss = 0
  let correct = 0
  for (const p of pts) {
    const y = predict(net, features(p.x, p.y, fs))
    loss += -(p.label * Math.log(y + 1e-7) + (1 - p.label) * Math.log(1 - y + 1e-7))
    if ((y >= 0.5 ? 1 : 0) === p.label) correct++
  }
  return { loss: loss / pts.length, accuracy: correct / pts.length }
}

// ── The hand-drawn line (a perceptron) ─────────────────────────────────────

/** A line w1·x + w2·y + b = 0; points with a positive value are class 1 (orange). */
export interface Line {
  w1: number
  w2: number
  b: number
}

export function lineFromAngle(angleDeg: number, offset: number): Line {
  const a = (angleDeg * Math.PI) / 180
  return { w1: Math.cos(a), w2: Math.sin(a), b: -offset }
}

export function angleFromLine(l: Line): { angleDeg: number; offset: number } {
  const n = Math.hypot(l.w1, l.w2) || 1
  let deg = (Math.atan2(l.w2, l.w1) * 180) / Math.PI
  if (deg < 0) deg += 360
  return { angleDeg: deg, offset: -l.b / n }
}

export function lineClass(l: Line, x: number, y: number): Label {
  return l.w1 * x + l.w2 * y + l.b > 0 ? 1 : 0
}

export function lineAccuracy(l: Line, pts: Pt[]): number {
  if (!pts.length) return 1
  let c = 0
  for (const p of pts) if (lineClass(l, p.x, p.y) === p.label) c++
  return c / pts.length
}

/**
 * The perceptron learning rule (Rosenblatt, 1958): find one mistake and nudge
 * the line toward fixing it. Returns the new line and the point it learned
 * from, or null when every point is already right.
 */
export function perceptronStep(l: Line, pts: Pt[], lr: number, rng: () => number): { line: Line; fixed: Pt } | null {
  const wrong = pts.filter((p) => lineClass(l, p.x, p.y) !== p.label)
  if (!wrong.length) return null
  const p = wrong[Math.floor(rng() * wrong.length)]
  const t = p.label === 1 ? 1 : -1
  return { line: { w1: l.w1 + lr * t * p.x, w2: l.w2 + lr * t * p.y, b: l.b + lr * t }, fixed: p }
}

// ── Datasets ──────────────────────────────────────────────────────────────

export type DatasetId = 'blobs' | 'line' | 'xor' | 'circle' | 'spiral'

export const DATASETS: { id: DatasetId; name: string; hint: string }[] = [
  { id: 'blobs', name: 'Two groups', hint: 'Two clumps — one straight line splits them.' },
  { id: 'line', name: 'Slanted split', hint: 'A tilted border. Still one straight line.' },
  { id: 'xor', name: 'Checkerboard (XOR)', hint: 'Opposite corners match. No single straight line can do it.' },
  { id: 'circle', name: 'Circle', hint: 'One colour inside, one outside. Needs a curved border.' },
  { id: 'spiral', name: 'Spirals', hint: 'Two arms that wind round each other. The hardest one.' },
]

export function makeDataset(id: DatasetId, n: number, seed: number): Pt[] {
  const rng = makeRng(seed)
  const pts: Pt[] = []
  const u = () => rng() * 2 - 1
  const clampPt = (v: number) => Math.max(-0.97, Math.min(0.97, v))
  if (id === 'blobs') {
    for (let i = 0; i < n; i++) {
      const label: Label = i % 2 === 0 ? 1 : 0
      const cx = label ? 0.45 : -0.45
      const cy = label ? 0.35 : -0.35
      pts.push({ x: clampPt(cx + gauss(rng) * 0.18), y: clampPt(cy + gauss(rng) * 0.18), label })
    }
  } else if (id === 'line') {
    while (pts.length < n) {
      const x = u()
      const y = u()
      const v = x * 0.8 - y + 0.15
      if (Math.abs(v) < 0.12) continue
      pts.push({ x, y, label: v > 0 ? 1 : 0 })
    }
  } else if (id === 'xor') {
    while (pts.length < n) {
      const x = u()
      const y = u()
      if (Math.abs(x) < 0.1 || Math.abs(y) < 0.1) continue
      pts.push({ x, y, label: x * y > 0 ? 1 : 0 })
    }
  } else if (id === 'circle') {
    for (let i = 0; i < n; i++) {
      const label: Label = i % 2 === 0 ? 1 : 0
      const r = label ? rng() * 0.42 : 0.62 + rng() * 0.33
      const a = rng() * Math.PI * 2
      pts.push({ x: r * Math.cos(a), y: r * Math.sin(a), label })
    }
  } else {
    const half = Math.floor(n / 2)
    for (let i = 0; i < half; i++) {
      const r = (i / half) * 0.9 + 0.05
      const t = (1.75 * i * 2 * Math.PI) / half
      for (const label of [1, 0] as Label[]) {
        const ang = t + (label ? 0 : Math.PI)
        pts.push({
          x: clampPt(r * Math.sin(ang) + gauss(rng) * 0.02),
          y: clampPt(r * Math.cos(ang) + gauss(rng) * 0.02),
          label,
        })
      }
    }
  }
  return pts
}
