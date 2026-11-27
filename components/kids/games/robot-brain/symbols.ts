// components/kids/games/robot-brain/symbols.ts
// The symbols the robot learns, and a seeded "hand-drawing" generator used for
// the test parcels, the intern's dataset (Ace), the factory dataset (Legend),
// data augmentation and the "sample drawing" accessibility button.
//
// Pure TypeScript — no DOM. All coordinates are in pad units: (0,0) top-left,
// (1,1) bottom-right of the square drawing pad.

export type Pt = [number, number]
export type Stroke = Pt[]
export type Drawing = Stroke[]

export type ClassId = 'left' | 'right' | 'circle' | 'tri' | 'stop'

export interface SymbolClass {
  id: ClassId
  /** Short name a child says. */
  name: string
  /** One glyph for buttons and charts. */
  glyph: string
  /** What the sorter does with a parcel carrying this label. */
  action: string
  /** Tailwind text/bg tint and the matching canvas colour. */
  color: string
  tw: string
}

export const SYMBOLS: Record<ClassId, SymbolClass> = {
  left: { id: 'left', name: 'Left arrow', glyph: '←', action: 'West chute', color: '#22d3ee', tw: 'text-cyan-300 border-cyan-300/60 bg-cyan-400/15' },
  right: { id: 'right', name: 'Right arrow', glyph: '→', action: 'East chute', color: '#fb923c', tw: 'text-orange-300 border-orange-300/60 bg-orange-400/15' },
  circle: { id: 'circle', name: 'Circle', glyph: '○', action: 'Local delivery', color: '#4ade80', tw: 'text-green-300 border-green-300/60 bg-green-400/15' },
  tri: { id: 'tri', name: 'Triangle', glyph: '△', action: 'Fragile shelf', color: '#a78bfa', tw: 'text-violet-300 border-violet-300/60 bg-violet-400/15' },
  stop: { id: 'stop', name: 'Stop cross', glyph: '✕', action: 'Return to sender', color: '#f472b6', tw: 'text-pink-300 border-pink-300/60 bg-pink-400/15' },
}

// ── Seeded randomness ───────────────────────────────────────────────────────

export type Rng = () => number

/** mulberry32: tiny, fast, good enough for fair, repeatable games. */
export function makeRng(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function range(rng: Rng, lo: number, hi: number): number {
  return lo + (hi - lo) * rng()
}

/** Roughly normal (sum of uniforms), mean 0, sd ≈ 1. */
function gauss(rng: Rng): number {
  return (rng() + rng() + rng() + rng() - 2) * 1.73
}

// ── Variation recipes ───────────────────────────────────────────────────────

export interface Variation {
  /** Max rotation either way, degrees. */
  rot: number
  scale: [number, number]
  /** Max centre shift either way, pad units. */
  shift: number
  /** Per-point hand shake, in symbol units. */
  jitter: number
  /** Slow bend of each stroke, in symbol units. */
  wobble: number
  /** Max stretch of width vs height (0.2 = up to 20%). */
  stretch: number
  /** Chance of stray specks (0..1) and how many at most. */
  specks: number
  /** Chance of a hurried style: a circle left open, a one-sided or hooked
   *  arrow head, a cross with one short arm. Real handwriting does this. */
  sloppy?: number
}

export const VARIATION = {
  /** A careful copy of the textbook shape: the ✨ Sample button. */
  neat: { rot: 6, scale: [0.9, 1.05], shift: 0.03, jitter: 0.02, wobble: 0.05, stretch: 0.1, specks: 0 },
  gentle: { rot: 8, scale: [0.85, 1.05], shift: 0.04, jitter: 0.02, wobble: 0.05, stretch: 0.12, specks: 0 },
  everyday: { rot: 14, scale: [0.7, 1.05], shift: 0.08, jitter: 0.025, wobble: 0.07, stretch: 0.18, specks: 0 },
  /** Cadet and Pilot test parcels: strangers' handwriting, often hurried. */
  strangers: { rot: 20, scale: [0.55, 1.05], shift: 0.13, jitter: 0.03, wobble: 0.08, stretch: 0.22, specks: 0, sloppy: 0.4 },
  /** Legend's unseen exam: strongly tilted (parcels ride the belt at any angle), squashed, scaled, moved,
   *  smudged, sometimes hurried. 45° is past what engineered features tolerate, so the exam needs turned
   *  training data (augmentation), not just a good k. */
  wild: { rot: 45, scale: [0.45, 1.05], shift: 0.2, jitter: 0.035, wobble: 0.09, stretch: 0.32, specks: 0.7, sloppy: 0.25 },
  /** For augmentation of the training data: turned up to 45° either way, like the exam. */
  augment: { rot: 45, scale: [0.6, 1.0], shift: 0.15, jitter: 0, wobble: 0, stretch: 0.25, specks: 0 },
} satisfies Record<string, Variation>

/** What happened to a generated drawing — used to explain mistakes. */
export interface DrawMeta {
  rot: number
  scale: number
  dx: number
  dy: number
  specks: number
  /** Drawn in a hurry (open circle, one-sided head, short arm). */
  hurried?: boolean
}

// ── Templates (symbol units: centred at 0, about −1..1) ─────────────────────

function arrowTemplate(rng: Rng, dir: 1 | -1, hurried: boolean): Drawing {
  const style = hurried ? Math.floor(rng() * 3) : -1
  const head = style === 1 ? range(rng, 0.55, 0.8) : range(rng, 0.35, 0.6)
  const spread = range(rng, 0.32, 0.55)
  const tip = 0.9 * dir
  // A hurried arrow can have a stubby shaft (style 1).
  const tail = (style === 1 ? -0.35 : -0.9) * dir
  const shaft: Stroke = [
    [tail, range(rng, -0.04, 0.04)],
    [tip, 0],
  ]
  const back = tip - head * dir
  if (style === 0) {
    // One-sided head: the line ends in a single hook.
    const side = rng() < 0.5 ? -1 : 1
    return [[shaft[0], [tip, 0], [back, side * spread]]]
  }
  if (style === 2) {
    // Drawn in one go: tail → tip → one barb, then the other barb lifted.
    return [
      [shaft[0], [tip, 0], [back, -spread]],
      [
        [back, spread],
        [tip, 0],
      ],
    ]
  }
  const headStroke: Stroke = [
    [back, -spread],
    [tip, 0],
    [back, spread],
  ]
  // People draw the head first or the shaft first.
  return rng() < 0.5 ? [shaft, headStroke] : [headStroke, shaft]
}

function circleTemplate(rng: Rng, hurried: boolean): Drawing {
  const start = range(rng, 0, Math.PI * 2)
  // A hurried circle is left open, or overshoots into a loop.
  const sweep = Math.PI * 2 * (hurried ? (rng() < 0.6 ? range(rng, 0.68, 0.82) : range(rng, 1.2, 1.35)) : range(rng, 0.92, 1.08))
  const dir = rng() < 0.5 ? 1 : -1
  const drift = hurried ? range(rng, 0.1, 0.2) : 0
  const pts: Stroke = []
  const n = 40
  for (let i = 0; i <= n; i++) {
    const a = start + dir * sweep * (i / n)
    // Hand-drawn circles drift a little in radius.
    const r = 0.85 * (1 + 0.06 * Math.sin(a * 2 + start)) * (1 - drift * (i / n))
    pts.push([Math.cos(a) * r, Math.sin(a) * r])
  }
  return [pts]
}

/** Chaikin corner-cutting: what a quick hand does to sharp corners. */
function roundCorners(s: Stroke, passes: number, closed: boolean): Stroke {
  let pts = s
  for (let p = 0; p < passes; p++) {
    const out: Stroke = closed ? [] : [pts[0]]
    const n = closed ? pts.length : pts.length - 1
    for (let i = 0; i < n; i++) {
      const [x0, y0] = pts[i]
      const [x1, y1] = pts[(i + 1) % pts.length]
      out.push([0.75 * x0 + 0.25 * x1, 0.75 * y0 + 0.25 * y1], [0.25 * x0 + 0.75 * x1, 0.25 * y0 + 0.75 * y1])
    }
    if (closed) out.push(out[0])
    else out.push(pts[pts.length - 1])
    pts = out
  }
  return pts
}

function triangleTemplate(rng: Rng, hurried: boolean): Drawing {
  // Usually point-up, but people draw them a little turned.
  const turn = range(rng, -0.25, 0.25)
  const r = 0.9
  const v: Stroke = [0, 1, 2].map((i) => {
    const a = -Math.PI / 2 + turn + (i * 2 * Math.PI) / 3
    return [Math.cos(a) * r * range(rng, 0.9, 1.08), Math.sin(a) * r * 0.95 + 0.15] as Pt
  })
  const start = Math.floor(rng() * 3)
  const ring: Stroke = [v[start], v[(start + 1) % 3], v[(start + 2) % 3], v[start]]
  if (!hurried) return [ring]
  // Hurried: rounded corners, and the last side often stops short.
  const soft = roundCorners(ring.slice(0, 3), 2, true)
  const keep = Math.floor(soft.length * range(rng, 0.85, 1))
  return [soft.slice(0, Math.max(4, keep))]
}

function stopTemplate(rng: Rng, hurried: boolean): Drawing {
  const a = range(rng, 0.62, 0.8)
  const b = range(rng, 0.62, 0.8)
  // A hurried cross has one short arm that stops near the middle.
  const cut = hurried ? range(rng, 0.35, 0.6) : 1
  const s1: Stroke = [
    [-a, -b],
    [a, b],
  ]
  const s2: Stroke = [
    [a, -b],
    [a - 2 * a * cut, -b + 2 * b * cut],
  ]
  return rng() < 0.5 ? [s1, s2] : [s2, s1]
}

function template(cls: ClassId, rng: Rng, hurried: boolean): Drawing {
  switch (cls) {
    case 'left':
      return arrowTemplate(rng, -1, hurried)
    case 'right':
      return arrowTemplate(rng, 1, hurried)
    case 'circle':
      return circleTemplate(rng, hurried)
    case 'tri':
      return triangleTemplate(rng, hurried)
    case 'stop':
      return stopTemplate(rng, hurried)
  }
}

/** Insert points so every segment is at most `step` long. */
function densify(s: Stroke, step: number): Stroke {
  const out: Stroke = []
  for (let i = 0; i < s.length; i++) {
    if (i === 0) {
      out.push(s[0])
      continue
    }
    const [x0, y0] = s[i - 1]
    const [x1, y1] = s[i]
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / step))
    for (let j = 1; j <= n; j++) out.push([x0 + ((x1 - x0) * j) / n, y0 + ((y1 - y0) * j) / n])
  }
  return out
}

const clamp01 = (v: number) => Math.min(0.99, Math.max(0.01, v))

/** Apply a variation to a drawing already in symbol units, landing it on the pad. */
function place(d: Drawing, v: Variation, rng: Rng): { drawing: Drawing; meta: DrawMeta } {
  const rot = range(rng, -v.rot, v.rot)
  const scale = range(rng, v.scale[0], v.scale[1])
  const stretch = range(rng, -v.stretch, v.stretch)
  const dx = range(rng, -v.shift, v.shift)
  const dy = range(rng, -v.shift, v.shift)
  const sx = 0.36 * scale * (1 + stretch)
  const sy = 0.36 * scale * (1 - stretch)
  const c = Math.cos((rot * Math.PI) / 180)
  const s = Math.sin((rot * Math.PI) / 180)
  // Keep the whole symbol on the pad: shrink the shift if needed.
  const reach = 0.36 * scale * 1.15
  const cx = Math.min(1 - reach, Math.max(reach, 0.5 + dx))
  const cy = Math.min(1 - reach, Math.max(reach, 0.5 + dy))
  const strokes: Drawing = d.map((stroke) => {
    const dense = densify(stroke, 0.06)
    const ph1 = range(rng, 0, Math.PI * 2)
    const ph2 = range(rng, 0, Math.PI * 2)
    return dense.map(([x, y], i) => {
      const t = i / Math.max(1, dense.length - 1)
      const wx = v.wobble * Math.sin(t * Math.PI * 1.5 + ph1) + v.jitter * gauss(rng)
      const wy = v.wobble * Math.sin(t * Math.PI * 1.3 + ph2) + v.jitter * gauss(rng)
      const X = (x + wx) * sx
      const Y = (y + wy) * sy
      return [clamp01(cx + X * c - Y * s), clamp01(cy + X * s + Y * c)] as Pt
    })
  })
  let specks = 0
  if (v.specks > 0 && rng() < v.specks) {
    specks = 1 + Math.floor(rng() * 3)
    for (let i = 0; i < specks; i++) {
      const x = range(rng, 0.05, 0.95)
      const y = range(rng, 0.05, 0.95)
      strokes.push([
        [x, y],
        [clamp01(x + range(rng, -0.025, 0.025)), clamp01(y + range(rng, -0.025, 0.025))],
      ])
    }
  }
  return { drawing: strokes, meta: { rot, scale, dx: cx - 0.5, dy: cy - 0.5, specks } }
}

/** A fresh, hand-drawn-looking symbol. */
export function generateDrawing(cls: ClassId, v: Variation, rng: Rng): { drawing: Drawing; meta: DrawMeta } {
  const hurried = (v.sloppy ?? 0) > 0 && rng() < (v.sloppy ?? 0)
  const out = place(template(cls, rng, hurried), v, rng)
  return { drawing: out.drawing, meta: { ...out.meta, hurried } }
}

/**
 * Data augmentation: a moved / turned / resized copy of an existing drawing,
 * the way real ML teams stretch a small dataset.
 */
export function augmentDrawing(d: Drawing, v: Variation, rng: Rng): Drawing {
  // Convert pad units back to symbol units around the drawing's own centre.
  let minX = 1
  let minY = 1
  let maxX = 0
  let maxY = 0
  for (const s of d)
    for (const [x, y] of s) {
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const half = Math.max(0.05, Math.max(maxX - minX, maxY - minY) / 2)
  const sym: Drawing = d.map((s) => s.map(([x, y]) => [((x - cx) / half) * 0.9, ((y - cy) / half) * 0.9] as Pt))
  return place(sym, v, rng).drawing
}
