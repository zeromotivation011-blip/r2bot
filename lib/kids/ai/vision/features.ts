// lib/kids/ai/vision/features.ts
// "What the robot sees." Turns a tiny 32×32 picture into the numbers the Vision
// Lab's classifiers learn from. Everything is computed on the device from
// pixels; nothing is uploaded and nothing here touches the network.
//
// Three feature groups, each one a different way of looking:
//   1. shape    — a 16×16 map of how much each spot stands out from the
//                 background colour (256 numbers, 0..1). Not normalised for
//                 light on purpose: it is why a dim room can fool the robot.
//   2. colour   — a hue histogram: how much of the picture is red, orange, …
//                 (12 hue bins for coloured pixels + 3 bins for grey/dark/light).
//   3. edges    — Sobel edges: 8 bins of edge DIRECTION (weighted by strength)
//                 plus edge strength in a 4×4 grid of regions (24 numbers).
//
// Plain module (no React, no DOM types beyond ImageData-like arrays), so it can
// be unit-tested and reused.

export const THUMB = 32
export const GRAY_SIZE = 16

export type FeatureGroup = 'shape' | 'colour' | 'edges'
export const FEATURE_GROUPS: FeatureGroup[] = ['shape', 'colour', 'edges']

export const GROUP_LABEL: Record<FeatureGroup, string> = {
  shape: 'Shape (what stands out)',
  colour: 'Colours',
  edges: 'Edges',
}

const GRAY_DIM = GRAY_SIZE * GRAY_SIZE // 256
const HUE_BINS = 12
const COLOUR_DIM = HUE_BINS + 3 // 15
const ORIENT_BINS = 8
const EDGE_GRID = 4
const EDGE_DIM = ORIENT_BINS + EDGE_GRID * EDGE_GRID // 24

export const FEATURE_DIM = GRAY_DIM + COLOUR_DIM + EDGE_DIM

/** Where each group lives inside the full feature vector. */
export const GROUP_RANGE: Record<FeatureGroup, [number, number]> = {
  shape: [0, GRAY_DIM],
  colour: [GRAY_DIM, GRAY_DIM + COLOUR_DIM],
  edges: [GRAY_DIM + COLOUR_DIM, FEATURE_DIM],
}

/**
 * How strongly each group counts in a distance. The raw groups have very
 * different sizes (256 vs 15 vs 24 numbers) and ranges, so each is scaled to
 * contribute a similar amount when it is switched on.
 */
const GROUP_SCALE: Record<FeatureGroup, number> = {
  shape: 0.4,
  colour: 1.6,
  edges: 2.6,
}

/** A 32×32 RGBA picture (exactly what canvas getImageData returns). */
export interface Thumb {
  data: Uint8ClampedArray
}

export interface Features {
  /** The full, unweighted vector (FEATURE_DIM numbers). */
  vec: Float32Array
  /** For drawing "what the robot sees": 16×16 grey values 0..1. */
  gray: Float32Array
  /** 32×32 edge strength 0..1 (for drawing). */
  edgeMap: Float32Array
  /** 15 colour bins (sum 1). */
  colour: Float32Array
  /** 8 edge-direction bins (sum 1). */
  orient: Float32Array
}

/** Hue (0..360), saturation and value (0..1) of one pixel. */
export function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const d = max - min
  let h = 0
  if (d > 1e-6) {
    if (max === rn) h = 60 * (((gn - bn) / d) % 6)
    else if (max === gn) h = 60 * ((bn - rn) / d + 2)
    else h = 60 * ((rn - gn) / d + 4)
  }
  if (h < 0) h += 360
  return [h, max === 0 ? 0 : d / max, max]
}

/** Colour of each hue bin, for drawing the histogram. */
export function hueBinColour(i: number): string {
  if (i < HUE_BINS) return `hsl(${Math.round((i + 0.5) * (360 / HUE_BINS))} 85% 55%)`
  return ['#1F2937', '#6B7280', '#E5E7EB'][i - HUE_BINS]
}

export const COLOUR_BIN_COUNT = COLOUR_DIM
export const ORIENT_BIN_COUNT = ORIENT_BINS

/** Extract features from a 32×32 RGBA thumbnail. */
export function extractFeatures(t: Thumb): Features {
  const px = t.data
  const n = THUMB * THUMB
  const lum = new Float32Array(n)
  const colour = new Float32Array(COLOUR_DIM)
  for (let i = 0; i < n; i++) {
    const r = px[i * 4]
    const g = px[i * 4 + 1]
    const b = px[i * 4 + 2]
    lum[i] = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    const [h, s, v] = rgbToHsv(r, g, b)
    if (s > 0.18 && v > 0.18) {
      // Soft-assign to the two nearest hue bins so a hue on a border is not jumpy.
      const pos = h / (360 / HUE_BINS) - 0.5
      const lo = Math.floor(pos)
      const f = pos - lo
      const w = s * v
      colour[(lo + HUE_BINS) % HUE_BINS] += w * (1 - f)
      colour[(lo + 1) % HUE_BINS] += w * f
    } else {
      colour[HUE_BINS + (v < 0.3 ? 0 : v < 0.7 ? 1 : 2)] += 0.6
    }
  }
  normalise(colour)

  // 16×16 "shape": how much each spot stands out from the background. The
  // background colour is estimated from the picture's border (median of each
  // channel), so it works on any wall and for every skin tone. A dim room
  // shrinks every difference — which is why lighting can still fool the robot.
  const border: number[][] = [[], [], []]
  for (let i = 0; i < THUMB; i++) {
    for (const [x, y] of [
      [i, 0],
      [i, THUMB - 1],
      [0, i],
      [THUMB - 1, i],
    ]) {
      const k = (y * THUMB + x) * 4
      border[0].push(px[k])
      border[1].push(px[k + 1])
      border[2].push(px[k + 2])
    }
  }
  const bg = border.map((c) => c.sort((a, b) => a - b)[c.length >> 1])
  const fg = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const d = Math.hypot(px[i * 4] - bg[0], px[i * 4 + 1] - bg[1], px[i * 4 + 2] - bg[2]) / 255
    fg[i] = Math.min(1, d * 2.2)
  }
  // Centre the map on the middle of what stands out, so an object a little to
  // the left looks the same as one in the middle (like a camera that follows it).
  let cx = 0
  let cy = 0
  let mass = 0
  for (let y = 0; y < THUMB; y++)
    for (let x = 0; x < THUMB; x++) {
      const m = fg[y * THUMB + x]
      if (m < 0.25) continue
      cx += x * m
      cy += y * m
      mass += m
    }
  const sx = mass > 4 ? Math.round(cx / mass - (THUMB - 1) / 2) : 0
  const sy = mass > 4 ? Math.round(cy / mass - (THUMB - 1) / 2) : 0
  const fgAt = (x: number, y: number) => {
    const xx = x + sx
    const yy = y + sy
    return xx < 0 || yy < 0 || xx >= THUMB || yy >= THUMB ? 0 : fg[yy * THUMB + xx]
  }
  const gray = new Float32Array(GRAY_DIM)
  const f = THUMB / GRAY_SIZE
  for (let y = 0; y < GRAY_SIZE; y++) {
    for (let x = 0; x < GRAY_SIZE; x++) {
      let s = 0
      for (let dy = 0; dy < f; dy++) for (let dx = 0; dx < f; dx++) s += fgAt(x * f + dx, y * f + dy)
      gray[y * GRAY_SIZE + x] = s / (f * f)
    }
  }

  // Sobel edges on the 32×32 luminance.
  const edgeMap = new Float32Array(n)
  const orient = new Float32Array(ORIENT_BINS)
  const grid = new Float32Array(EDGE_GRID * EDGE_GRID)
  const at = (x: number, y: number) => lum[Math.min(THUMB - 1, Math.max(0, y)) * THUMB + Math.min(THUMB - 1, Math.max(0, x))]
  let maxMag = 1e-6
  for (let y = 0; y < THUMB; y++) {
    for (let x = 0; x < THUMB; x++) {
      const gx = at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1)
      const gy = at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1)
      const mag = Math.hypot(gx, gy)
      edgeMap[y * THUMB + x] = mag
      if (mag > maxMag) maxMag = mag
      if (mag < 0.08) continue
      // Direction folded to 0..180° (an edge has no "front"), 8 bins.
      let ang = Math.atan2(gy, gx)
      if (ang < 0) ang += Math.PI
      const bin = Math.min(ORIENT_BINS - 1, Math.floor((ang / Math.PI) * ORIENT_BINS))
      orient[bin] += mag
      const cell = Math.floor((y / THUMB) * EDGE_GRID) * EDGE_GRID + Math.floor((x / THUMB) * EDGE_GRID)
      grid[cell] += mag
    }
  }
  for (let i = 0; i < n; i++) edgeMap[i] = Math.min(1, edgeMap[i] / maxMag)
  normalise(orient)
  // Edge density per region relative to the whole picture.
  const gridTotal = grid.reduce((a, b) => a + b, 0)
  for (let i = 0; i < grid.length; i++) grid[i] = gridTotal > 0 ? (grid[i] / gridTotal) * 2 : 0

  const vec = new Float32Array(FEATURE_DIM)
  vec.set(gray, 0)
  vec.set(colour, GRAY_DIM)
  vec.set(orient, GRAY_DIM + COLOUR_DIM)
  vec.set(grid, GRAY_DIM + COLOUR_DIM + ORIENT_BINS)
  return { vec, gray, edgeMap, colour, orient }
}

function normalise(a: Float32Array): void {
  let s = 0
  for (let i = 0; i < a.length; i++) s += a[i]
  if (s <= 0) return
  for (let i = 0; i < a.length; i++) a[i] /= s
}

/** Weights for each feature dimension given which groups are switched on. */
export function groupWeights(on: Record<FeatureGroup, boolean>): Float32Array {
  const w = new Float32Array(FEATURE_DIM)
  for (const g of FEATURE_GROUPS) {
    const [a, b] = GROUP_RANGE[g]
    const v = on[g] ? GROUP_SCALE[g] : 0
    for (let i = a; i < b; i++) w[i] = v
  }
  return w
}

/** Apply per-dimension weights (returns a new vector). */
export function weighted(vec: Float32Array, w: Float32Array): Float32Array {
  const out = new Float32Array(vec.length)
  for (let i = 0; i < vec.length; i++) out[i] = vec[i] * w[i]
  return out
}

/**
 * A copy of a thumbnail as if the room were darker or brighter. `light` 1 is
 * unchanged, 0.35 is a dim room, 1.5 is bright sun. Also adds a little sensor
 * noise in the dark, as a real camera does.
 */
export function relight(t: Thumb, light: number, seed = 1): Thumb {
  const out = new Uint8ClampedArray(t.data.length)
  let s = seed >>> 0 || 1
  const noiseAmp = light < 0.8 ? (0.8 - light) * 26 : 0
  for (let i = 0; i < t.data.length; i += 4) {
    s = (s * 1664525 + 1013904223) >>> 0
    const nz = (s / 4294967296 - 0.5) * noiseAmp
    out[i] = t.data[i] * light + nz
    out[i + 1] = t.data[i + 1] * light + nz
    out[i + 2] = t.data[i + 2] * light + nz
    out[i + 3] = 255
  }
  return { data: out }
}
