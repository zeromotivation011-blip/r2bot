// lib/kids/ai/vision/classifiers.ts
// The two robot brains of the Vision Lab, written from scratch (no ML library):
//
//   k-NN  — "which examples does this look most like?" Keeps every example and
//           lets the k nearest ones vote. No training step at all.
//   Net   — a tiny neural network. With 0 hidden units it is softmax (logistic)
//           regression; with hidden units it is a one-hidden-layer network with
//           ReLU. Trained by gradient descent (Adam) so the child can watch the
//           loss curve fall.
//
// Both return a probability for every class, so the lab can show confidence
// bars and apply a confidence threshold. Pure TypeScript; runs on the device.

export interface Sample {
  /** Feature vector (already weighted by the feature groups that are on). */
  x: Float32Array
  /** Class index 0..K-1. */
  y: number
}

/** Deterministic random numbers so a retrain with the same data behaves the same. */
export function rng(seed: number): () => number {
  let s = seed >>> 0 || 1
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

function dist2(a: Float32Array, b: Float32Array): number {
  let s = 0
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i]
    s += d * d
  }
  return s
}

// ── k-nearest neighbours ────────────────────────────────────────────────────

export interface KnnResult {
  probs: number[]
  /** Indices (into the training samples) of the neighbours that voted. */
  neighbours: number[]
}

/**
 * k-NN vote with distance weighting. `skip` leaves one sample out (used for
 * leave-one-out testing).
 */
export function knnPredict(train: Sample[], x: Float32Array, k: number, classes: number, skip = -1): KnnResult {
  const best: { i: number; d: number }[] = []
  for (let i = 0; i < train.length; i++) {
    if (i === skip) continue
    const d = dist2(train[i].x, x)
    if (best.length < k) {
      best.push({ i, d })
      best.sort((a, b) => a.d - b.d)
    } else if (d < best[best.length - 1].d) {
      best[best.length - 1] = { i, d }
      best.sort((a, b) => a.d - b.d)
    }
  }
  const votes = new Array<number>(classes).fill(0)
  let total = 0
  for (const b of best) {
    const w = 1 / (Math.sqrt(b.d) + 0.05)
    votes[train[b.i].y] += w
    total += w
  }
  // A little smoothing so confidence is never a hard 100% from 3 votes.
  const smooth = total * 0.04
  const probs = votes.map((v) => (v + smooth / classes) / (total + smooth || 1))
  return { probs, neighbours: best.map((b) => b.i) }
}

// ── Tiny neural network ─────────────────────────────────────────────────────

export interface NetConfig {
  /** 0 = softmax/logistic regression; >0 = one hidden ReLU layer. */
  hidden: number
  learningRate: number
  /** L2 weight decay. */
  l2: number
  seed: number
}

export interface Net {
  cfg: NetConfig
  inDim: number
  classes: number
  mean: Float32Array
  std: Float32Array
  /** Hidden layer (hidden × inDim) and bias; empty when hidden = 0. */
  w1: Float32Array
  b1: Float32Array
  /** Output layer (classes × (hidden || inDim)) and bias. */
  w2: Float32Array
  b2: Float32Array
  // Adam moment buffers
  m: Float32Array[]
  v: Float32Array[]
  step: number
}

export function createNet(train: Sample[], classes: number, cfg: NetConfig): Net {
  const inDim = train[0]?.x.length ?? 1
  const mean = new Float32Array(inDim)
  const std = new Float32Array(inDim)
  for (const s of train) for (let i = 0; i < inDim; i++) mean[i] += s.x[i]
  for (let i = 0; i < inDim; i++) mean[i] /= Math.max(1, train.length)
  for (const s of train) for (let i = 0; i < inDim; i++) std[i] += (s.x[i] - mean[i]) ** 2
  for (let i = 0; i < inDim; i++) {
    const sd = Math.sqrt(std[i] / Math.max(1, train.length))
    // A dimension that never changes (or is switched off) carries no information.
    std[i] = sd < 1e-4 ? 0 : sd
  }
  const r = rng(cfg.seed)
  const gauss = () => {
    const u = Math.max(1e-9, r())
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r())
  }
  const h = cfg.hidden
  const mid = h > 0 ? h : inDim
  const w1 = new Float32Array(h * inDim)
  const b1 = new Float32Array(h)
  for (let i = 0; i < w1.length; i++) w1[i] = gauss() * Math.sqrt(2 / inDim)
  const w2 = new Float32Array(classes * mid)
  const b2 = new Float32Array(classes)
  for (let i = 0; i < w2.length; i++) w2[i] = gauss() * Math.sqrt(1 / mid) * 0.5
  const params = [w1, b1, w2, b2]
  return {
    cfg,
    inDim,
    classes,
    mean,
    std,
    w1,
    b1,
    w2,
    b2,
    m: params.map((p) => new Float32Array(p.length)),
    v: params.map((p) => new Float32Array(p.length)),
    step: 0,
  }
}

function standardise(net: Net, x: Float32Array): Float32Array {
  const z = new Float32Array(net.inDim)
  for (let i = 0; i < net.inDim; i++) z[i] = net.std[i] === 0 ? 0 : (x[i] - net.mean[i]) / net.std[i]
  return z
}

interface Forward {
  z: Float32Array
  hid: Float32Array
  probs: Float32Array
}

function forward(net: Net, x: Float32Array): Forward {
  const z = standardise(net, x)
  const h = net.cfg.hidden
  let hid = z
  if (h > 0) {
    hid = new Float32Array(h)
    for (let j = 0; j < h; j++) {
      let s = net.b1[j]
      const off = j * net.inDim
      for (let i = 0; i < net.inDim; i++) s += net.w1[off + i] * z[i]
      hid[j] = s > 0 ? s : 0
    }
  }
  const mid = hid.length
  const logits = new Float32Array(net.classes)
  let max = -Infinity
  for (let c = 0; c < net.classes; c++) {
    let s = net.b2[c]
    const off = c * mid
    for (let i = 0; i < mid; i++) s += net.w2[off + i] * hid[i]
    logits[c] = s
    if (s > max) max = s
  }
  let sum = 0
  for (let c = 0; c < net.classes; c++) {
    logits[c] = Math.exp(logits[c] - max)
    sum += logits[c]
  }
  for (let c = 0; c < net.classes; c++) logits[c] /= sum
  return { z, hid, probs: logits }
}

export function netPredict(net: Net, x: Float32Array): number[] {
  return Array.from(forward(net, x).probs)
}

/** Average cross-entropy loss over a set (no training). */
export function netLoss(net: Net, set: Sample[]): number {
  if (!set.length) return 0
  let l = 0
  for (const s of set) l -= Math.log(Math.max(1e-7, forward(net, s.x).probs[s.y]))
  return l / set.length
}

/**
 * One pass over the training set in shuffled mini-batches. Returns the average
 * training loss of the epoch.
 */
export function trainEpoch(net: Net, train: Sample[], epoch: number, batch = 16): number {
  const r = rng(net.cfg.seed * 7919 + epoch)
  const order = train.map((_, i) => i)
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  const h = net.cfg.hidden
  const mid = h > 0 ? h : net.inDim
  const g = [new Float32Array(net.w1.length), new Float32Array(net.b1.length), new Float32Array(net.w2.length), new Float32Array(net.b2.length)]
  let lossSum = 0
  for (let start = 0; start < order.length; start += batch) {
    for (const a of g) a.fill(0)
    const idx = order.slice(start, start + batch)
    for (const k of idx) {
      const s = train[k]
      const f = forward(net, s.x)
      lossSum -= Math.log(Math.max(1e-7, f.probs[s.y]))
      // dL/dlogit = p - onehot
      const dl = new Float32Array(net.classes)
      for (let c = 0; c < net.classes; c++) dl[c] = f.probs[c] - (c === s.y ? 1 : 0)
      const dh = h > 0 ? new Float32Array(h) : null
      for (let c = 0; c < net.classes; c++) {
        g[3][c] += dl[c]
        const off = c * mid
        for (let i = 0; i < mid; i++) {
          g[2][off + i] += dl[c] * f.hid[i]
          if (dh) dh[i] += dl[c] * net.w2[off + i]
        }
      }
      if (dh) {
        for (let j = 0; j < h; j++) {
          if (f.hid[j] <= 0) continue
          g[1][j] += dh[j]
          const off = j * net.inDim
          for (let i = 0; i < net.inDim; i++) g[0][off + i] += dh[j] * f.z[i]
        }
      }
    }
    adam(net, g, idx.length)
  }
  return lossSum / Math.max(1, train.length)
}

function adam(net: Net, grads: Float32Array[], n: number): void {
  const params = [net.w1, net.b1, net.w2, net.b2]
  const lr = net.cfg.learningRate
  const b1 = 0.9
  const b2 = 0.999
  net.step++
  const c1 = 1 - Math.pow(b1, net.step)
  const c2 = 1 - Math.pow(b2, net.step)
  for (let p = 0; p < params.length; p++) {
    const w = params[p]
    const g = grads[p]
    const m = net.m[p]
    const v = net.v[p]
    const decay = p === 0 || p === 2 ? net.cfg.l2 : 0
    for (let i = 0; i < w.length; i++) {
      const gi = g[i] / n + decay * w[i]
      m[i] = b1 * m[i] + (1 - b1) * gi
      v[i] = b2 * v[i] + (1 - b2) * gi * gi
      w[i] -= (lr * (m[i] / c1)) / (Math.sqrt(v[i] / c2) + 1e-8)
    }
  }
}

// ── Splits and scoring ──────────────────────────────────────────────────────

/** Stratified split: about `frac` of every class goes to the test set (at least 1 when a class has 3+). */
export function stratifiedSplit(all: Sample[], frac: number, seed: number): { train: Sample[]; test: Sample[] } {
  const r = rng(seed)
  const byClass = new Map<number, Sample[]>()
  for (const s of all) byClass.set(s.y, [...(byClass.get(s.y) ?? []), s])
  const train: Sample[] = []
  const test: Sample[] = []
  for (const list of byClass.values()) {
    const shuffled = [...list]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    const nTest = shuffled.length >= 3 ? Math.max(1, Math.round(shuffled.length * frac)) : 0
    test.push(...shuffled.slice(0, nTest))
    train.push(...shuffled.slice(nTest))
  }
  return { train, test }
}

export interface Score {
  accuracy: number
  /** confusion[actual][predicted] counts. */
  confusion: number[][]
  /** Recall per class (share of that class's tests it got right); NaN when the class had no tests. */
  recall: number[]
  tested: number
}

export function scoreFrom(pairs: { y: number; p: number }[], classes: number): Score {
  const confusion = Array.from({ length: classes }, () => new Array<number>(classes).fill(0))
  let right = 0
  for (const { y, p } of pairs) {
    confusion[y][p]++
    if (y === p) right++
  }
  const recall = confusion.map((row, i) => {
    const n = row.reduce((a, b) => a + b, 0)
    return n ? row[i] / n : NaN
  })
  return {
    accuracy: pairs.length ? right / pairs.length : 0,
    confusion,
    recall,
    tested: pairs.length,
  }
}

export function argmax(a: ArrayLike<number>): number {
  let best = 0
  for (let i = 1; i < a.length; i++) if (a[i] > a[best]) best = i
  return best
}
