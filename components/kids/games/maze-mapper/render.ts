// components/kids/games/maze-mapper/render.ts
// Canvas drawing for Maze Mapper: the robot's occupancy map over a fog of the
// unknown, sensor beams, frontiers, the planner's wavefront, the robot, and the
// end-of-round "map vs truth" reveal. Pure drawing — no game rules here.

import { BELIEF_FREE, BELIEF_UNKNOWN, BELIEF_WALL, DIR8, type World } from './sim'

export type RevealMode = 'off' | 'map' | 'truth' | 'compare'

export interface Wave {
  order: number[]
  dist: Int32Array
  /** Seconds since the wave started. */
  age: number
  /** Seconds for the whole wave to unfold. */
  dur: number
  path: number[]
  escape: boolean
}

export interface SceneState {
  t: number
  /** Robot position in squares (fractional while it glides). */
  rx: number
  ry: number
  angle: number
  beamAge: number
  wave: Wave | null
  path: number[]
  target: number
  frontiers: number[] | null
  selected: number
  hint: number[] | null
  island: Set<number> | null
  reveal: RevealMode
  optimal: number[] | null
  showProb: boolean
  shake: number
  bumpAge: number
  reduced: boolean
}

export interface View {
  w: number
  h: number
  s: number
  ox: number
  oy: number
}

export function makeView(cssW: number, cssH: number, W: number, H: number): View {
  const pad = 6
  const s = Math.max(4, Math.min((cssW - pad * 2) / W, (cssH - pad * 2) / H))
  return { w: cssW, h: cssH, s, ox: (cssW - s * W) / 2, oy: (cssH - s * H) / 2 }
}

export function cellAt(v: View, W: number, H: number, px: number, py: number): { x: number; y: number } | null {
  const x = Math.floor((px - v.ox) / v.s)
  const y = Math.floor((py - v.oy) / v.s)
  if (x < 0 || y < 0 || x >= W || y >= H) return null
  return { x, y }
}

// ── Particles ────────────────────────────────────────────────────────────────

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  color: string
  size: number
}

interface Ring {
  x: number
  y: number
  age: number
  max: number
  color: string
}

export class Fx {
  private ps: Particle[] = []
  private rings: Ring[] = []
  constructor(private reduced: boolean) {}

  /** Reduced motion or calm mode (kids Settings): no sparkles, rings or bursts. */
  setQuiet(q: boolean): void {
    this.reduced = q
    if (q) {
      this.ps = []
      this.rings = []
    }
  }

  /** Little sparkles where squares become known (in square units). */
  sparkle(cx: number, cy: number, color: string, n = 3): void {
    if (this.reduced || this.ps.length > 260) return
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2
      const sp = 0.6 + Math.random() * 1.4
      this.ps.push({ x: cx + 0.5, y: cy + 0.5, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.6, life: 0, max: 0.45 + Math.random() * 0.35, color, size: 0.08 + Math.random() * 0.08 })
    }
  }

  ring(cx: number, cy: number, color: string, max = 0.9): void {
    if (this.reduced) return
    this.rings.push({ x: cx + 0.5, y: cy + 0.5, age: 0, max, color })
  }

  burst(cx: number, cy: number, color: string, n = 24): void {
    if (this.reduced) return
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.3
      const sp = 2 + Math.random() * 3
      this.ps.push({ x: cx + 0.5, y: cy + 0.5, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: 0.7 + Math.random() * 0.5, color, size: 0.1 + Math.random() * 0.12 })
    }
  }

  update(dt: number): void {
    for (const p of this.ps) {
      p.life += dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vx *= 0.92
      p.vy *= 0.92
    }
    this.ps = this.ps.filter((p) => p.life < p.max)
    for (const r of this.rings) r.age += dt
    this.rings = this.rings.filter((r) => r.age < r.max)
  }

  draw(ctx: CanvasRenderingContext2D, v: View): void {
    for (const r of this.rings) {
      const k = r.age / r.max
      ctx.strokeStyle = r.color
      ctx.globalAlpha = 1 - k
      ctx.lineWidth = Math.max(1.5, v.s * 0.12)
      ctx.beginPath()
      ctx.arc(v.ox + r.x * v.s, v.oy + r.y * v.s, v.s * (0.4 + k * 2.2), 0, Math.PI * 2)
      ctx.stroke()
    }
    for (const p of this.ps) {
      ctx.globalAlpha = 1 - p.life / p.max
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(v.ox + p.x * v.s, v.oy + p.y * v.s, Math.max(1, p.size * v.s), 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }
}

// ── Palette ──────────────────────────────────────────────────────────────────

const C = {
  bg: '#0A1120',
  fogA: '#0d1628',
  fogB: '#111d33',
  floor: '#123a3f',
  floorHi: '#16494d',
  wall: '#2dd4bf',
  wallHi: '#99f6e4',
  wallLo: '#0f766e',
  beam: 'rgba(0,229,255,',
  hit: '#fb7185',
  frontier: '#00E5FF',
  path: '#FF8A4C',
  robot: '#FC6818',
  exit: '#22C55E',
  island: '#fbbf24',
  wrong: '#ef4444',
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const k = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + k, y)
  ctx.arcTo(x + w, y, x + w, y + h, k)
  ctx.arcTo(x + w, y + h, x, y + h, k)
  ctx.arcTo(x, y + h, x, y, k)
  ctx.arcTo(x, y, x + w, y, k)
  ctx.closePath()
}

function hash(i: number): number {
  let h = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

function drawWallBlock(ctx: CanvasRenderingContext2D, px: number, py: number, s: number, alpha: number, tint?: string): void {
  ctx.globalAlpha = alpha
  ctx.fillStyle = tint ?? C.wallLo
  rr(ctx, px + 0.5, py + 0.5, s - 1, s - 1, s * 0.18)
  ctx.fill()
  ctx.fillStyle = tint ?? C.wall
  rr(ctx, px + 0.5, py + 0.5, s - 1, s - 1 - s * 0.16, s * 0.18)
  ctx.fill()
  if (s >= 10) {
    ctx.fillStyle = C.wallHi
    ctx.globalAlpha = alpha * 0.55
    ctx.fillRect(px + s * 0.2, py + s * 0.14, s * 0.6, Math.max(1, s * 0.08))
  }
  ctx.globalAlpha = 1
}

function cellCenter(v: View, W: number, i: number): [number, number] {
  return [v.ox + ((i % W) + 0.5) * v.s, v.oy + (Math.floor(i / W) + 0.5) * v.s]
}

function strokePath(ctx: CanvasRenderingContext2D, v: View, W: number, from: [number, number] | null, cells: number[], color: string, width: number, dash: number[] = []): void {
  if (!cells.length) return
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.setLineDash(dash)
  ctx.beginPath()
  if (from) ctx.moveTo(from[0], from[1])
  cells.forEach((c, k) => {
    const [x, y] = cellCenter(v, W, c)
    if (k === 0 && !from) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.stroke()
  ctx.restore()
}

// ── The scene ────────────────────────────────────────────────────────────────

export function drawScene(ctx: CanvasRenderingContext2D, v: View, w: World, st: SceneState, fx: Fx): void {
  const { W, H } = w
  const s = v.s
  ctx.save()
  ctx.fillStyle = C.bg
  ctx.fillRect(0, 0, v.w, v.h)
  if (st.shake > 0 && !st.reduced) ctx.translate((Math.random() - 0.5) * st.shake * s * 0.3, (Math.random() - 0.5) * st.shake * s * 0.3)

  const reveal = st.reveal
  const truth = reveal === 'truth'
  const compare = reveal === 'compare'

  // Squares.
  for (let i = 0; i < W * H; i++) {
    const x = i % W
    const y = Math.floor(i / W)
    const px = v.ox + x * s
    const py = v.oy + y * s
    const b = w.belief(i)
    const isWall = w.maze.wall[i] === 1

    if (truth) {
      if (isWall) drawWallBlock(ctx, px, py, s, 1)
      else {
        ctx.fillStyle = C.floor
        ctx.fillRect(px, py, s, s)
      }
      continue
    }

    if (compare) {
      if (b === BELIEF_UNKNOWN) {
        // Never mapped: show the truth faintly.
        ctx.fillStyle = C.fogA
        ctx.fillRect(px, py, s, s)
        if (isWall) drawWallBlock(ctx, px, py, s, 0.18)
        continue
      }
      const right = (b === BELIEF_WALL) === isWall
      if (isWall) drawWallBlock(ctx, px, py, s, 1)
      else {
        ctx.fillStyle = C.floor
        ctx.fillRect(px, py, s, s)
      }
      if (!right) {
        ctx.strokeStyle = C.wrong
        ctx.lineWidth = Math.max(1.5, s * 0.12)
        ctx.strokeRect(px + 1.5, py + 1.5, s - 3, s - 3)
        ctx.beginPath()
        ctx.moveTo(px + s * 0.25, py + s * 0.25)
        ctx.lineTo(px + s * 0.75, py + s * 0.75)
        ctx.moveTo(px + s * 0.75, py + s * 0.25)
        ctx.lineTo(px + s * 0.25, py + s * 0.75)
        ctx.stroke()
      }
      continue
    }

    // The robot's own map.
    if (st.showProb) {
      const p = w.pWall(i)
      if (!w.touched[i]) {
        ctx.fillStyle = (x + y) % 2 ? C.fogA : C.fogB
        ctx.fillRect(px, py, s, s)
        continue
      }
      ctx.fillStyle = C.floor
      ctx.fillRect(px, py, s, s)
      if (b === BELIEF_WALL) drawWallBlock(ctx, px, py, s, 0.35 + 0.65 * p)
      else if (b === BELIEF_UNKNOWN) {
        // Uncertain: a hatched square whose strength is the wall probability.
        ctx.fillStyle = `rgba(45,212,191,${(0.12 + p * 0.45).toFixed(3)})`
        ctx.fillRect(px + 1, py + 1, s - 2, s - 2)
        ctx.strokeStyle = 'rgba(253,230,138,0.7)'
        ctx.lineWidth = 1
        ctx.beginPath()
        for (let k = -1; k <= 1; k++) {
          ctx.moveTo(px + s * (0.5 + k * 0.4) - s * 0.3, py + s * 0.85)
          ctx.lineTo(px + s * (0.5 + k * 0.4) + s * 0.3, py + s * 0.15)
        }
        ctx.stroke()
      } else {
        ctx.fillStyle = `rgba(22,73,77,${(1 - p).toFixed(3)})`
        ctx.fillRect(px, py, s, s)
      }
      continue
    }

    if (b === BELIEF_UNKNOWN) {
      const n = st.reduced ? hash(i) : hash(i + Math.floor(st.t * 1.5) * 977)
      ctx.fillStyle = (x + y) % 2 ? C.fogA : C.fogB
      ctx.fillRect(px, py, s, s)
      if (n > 0.86 && s >= 8) {
        ctx.fillStyle = 'rgba(148,163,184,0.12)'
        ctx.fillRect(px + s * 0.4, py + s * 0.4, s * 0.2, s * 0.2)
      }
    } else if (b === BELIEF_FREE) {
      ctx.fillStyle = (x + y) % 2 ? C.floor : C.floorHi
      ctx.fillRect(px, py, s, s)
    } else {
      ctx.fillStyle = C.floor
      ctx.fillRect(px, py, s, s)
      drawWallBlock(ctx, px, py, s, 1, st.island?.has(i) ? C.island : undefined)
    }
  }

  // Trail (where the robot has been).
  if (!truth && w.trail.length > 1) {
    ctx.fillStyle = 'rgba(255,138,76,0.28)'
    const seen = new Set<number>()
    for (const c of w.trail) {
      if (seen.has(c)) continue
      seen.add(c)
      const [cx, cy] = cellCenter(v, W, c)
      ctx.beginPath()
      ctx.arc(cx, cy, Math.max(1.2, s * 0.12), 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // Planner wavefront.
  if (st.wave && !truth) {
    const wv = st.wave
    const k = Math.min(1, wv.age / wv.dur)
    const n = Math.floor(wv.order.length * k)
    let maxD = 1
    for (const c of wv.order) maxD = Math.max(maxD, wv.dist[c])
    const fade = wv.age > wv.dur ? Math.max(0, 1 - (wv.age - wv.dur) / 1.2) : 1
    for (let j = 0; j < n; j++) {
      const c = wv.order[j]
      const d = wv.dist[c]
      const hue = 185 + (d / maxD) * 110
      const fresh = j > n - 12 ? 0.85 : 0.42
      ctx.fillStyle = `hsla(${hue.toFixed(0)},90%,58%,${(fresh * fade).toFixed(3)})`
      const [cx, cy] = cellCenter(v, W, c)
      ctx.fillRect(cx - s * 0.42, cy - s * 0.42, s * 0.84, s * 0.84)
      if (s >= 22 && d >= 0) {
        ctx.fillStyle = `rgba(10,17,32,${(0.9 * fade).toFixed(3)})`
        ctx.font = `700 ${Math.floor(s * 0.38)}px ui-sans-serif, system-ui`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(String(d), cx, cy + 1)
      }
    }
    if (k >= 1 && wv.path.length) strokePath(ctx, v, W, null, wv.path, `rgba(255,255,255,${(0.9 * fade).toFixed(3)})`, Math.max(2, s * 0.18))
  }

  // Optimal route (reveal).
  if (st.optimal && reveal !== 'off') strokePath(ctx, v, W, cellCenter(v, W, w.maze.start), st.optimal, 'rgba(34,197,94,0.95)', Math.max(2, s * 0.16), [s * 0.4, s * 0.3])

  // Robot's actual route (reveal).
  if (reveal !== 'off' && w.trail.length > 1) strokePath(ctx, v, W, null, w.trail, 'rgba(255,138,76,0.75)', Math.max(1.5, s * 0.1))

  // Planned path.
  if (reveal === 'off' && st.path.length) {
    const from: [number, number] = [v.ox + (st.rx + 0.5) * s, v.oy + (st.ry + 0.5) * s]
    strokePath(ctx, v, W, from, st.path, 'rgba(255,138,76,0.35)', Math.max(4, s * 0.42))
    strokePath(ctx, v, W, from, st.path, C.path, Math.max(2, s * 0.14), [s * 0.3, s * 0.22])
  }

  // Cadet hint path.
  if (st.hint && st.hint.length && reveal === 'off') {
    const from: [number, number] = [v.ox + (st.rx + 0.5) * s, v.oy + (st.ry + 0.5) * s]
    strokePath(ctx, v, W, from, st.hint, 'rgba(253,224,71,0.9)', Math.max(2, s * 0.14), [s * 0.2, s * 0.25])
  }

  // Frontiers.
  if (st.frontiers && reveal === 'off') {
    const pulse = st.reduced ? 0.7 : 0.55 + 0.45 * Math.sin(st.t * 5)
    for (const f of st.frontiers) {
      const [cx, cy] = cellCenter(v, W, f)
      ctx.strokeStyle = C.frontier
      ctx.globalAlpha = 0.35 + 0.5 * pulse
      ctx.lineWidth = Math.max(1.5, s * 0.1)
      rr(ctx, cx - s * 0.36, cy - s * 0.36, s * 0.72, s * 0.72, s * 0.15)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    if (st.selected >= 0) {
      const [cx, cy] = cellCenter(v, W, st.selected)
      ctx.fillStyle = 'rgba(0,229,255,0.35)'
      ctx.beginPath()
      ctx.arc(cx, cy, s * 0.75, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.stroke()
    }
  }

  // Target marker.
  if (st.target >= 0 && reveal === 'off') {
    const [cx, cy] = cellCenter(v, W, st.target)
    ctx.strokeStyle = C.path
    ctx.lineWidth = 2
    const r = s * (0.32 + (st.reduced ? 0 : 0.06 * Math.sin(st.t * 6)))
    ctx.beginPath()
    ctx.moveTo(cx - r, cy)
    ctx.lineTo(cx + r, cy)
    ctx.moveTo(cx, cy - r)
    ctx.lineTo(cx, cy + r)
    ctx.stroke()
  }

  // Exit gate.
  const exitKnown = w.exitSeen() || reveal !== 'off'
  if (exitKnown) {
    const [cx, cy] = cellCenter(v, W, w.maze.exit)
    const p = st.reduced ? 0.5 : 0.5 + 0.5 * Math.sin(st.t * 3)
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 1.4)
    g.addColorStop(0, `rgba(34,197,94,${(0.55 + 0.3 * p).toFixed(3)})`)
    g.addColorStop(1, 'rgba(34,197,94,0)')
    ctx.fillStyle = g
    ctx.fillRect(cx - s * 1.4, cy - s * 1.4, s * 2.8, s * 2.8)
    ctx.fillStyle = C.exit
    rr(ctx, cx - s * 0.32, cy - s * 0.4, s * 0.64, s * 0.8, s * 0.12)
    ctx.fill()
    ctx.fillStyle = '#052e16'
    ctx.beginPath()
    ctx.moveTo(cx - s * 0.14, cy - s * 0.2)
    ctx.lineTo(cx + s * 0.18, cy)
    ctx.lineTo(cx - s * 0.14, cy + s * 0.2)
    ctx.closePath()
    ctx.fill()
  }

  // Sensor beams.
  if (reveal === 'off' && w.beams.length && st.beamAge < 1.4) {
    const a = Math.max(0, 1 - st.beamAge / 1.4)
    const ox = v.ox + (st.rx + 0.5) * s
    const oy = v.oy + (st.ry + 0.5) * s
    for (const bm of w.beams) {
      if (bm.dropped) continue
      const [dx, dy] = DIR8[bm.dir]
      const len = bm.hit ? bm.len - 0.5 : bm.len
      const ex = ox + dx * len * s
      const ey = oy + dy * len * s
      const g = ctx.createLinearGradient(ox, oy, ex, ey)
      g.addColorStop(0, `${C.beam}${(0.75 * a).toFixed(3)})`)
      g.addColorStop(1, `${C.beam}${(0.2 * a).toFixed(3)})`)
      ctx.strokeStyle = g
      ctx.lineWidth = Math.max(1.5, s * 0.1)
      ctx.beginPath()
      ctx.moveTo(ox, oy)
      ctx.lineTo(ex, ey)
      ctx.stroke()
      if (bm.hit) {
        ctx.fillStyle = C.hit
        ctx.globalAlpha = a
        ctx.beginPath()
        ctx.arc(ex, ey, Math.max(2, s * 0.13), 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
      }
    }
  }

  // The robot.
  {
    const cx = v.ox + (st.rx + 0.5) * s
    const cy = v.oy + (st.ry + 0.5) * s
    const r = s * 0.4
    if (st.bumpAge < 0.4 && !st.reduced) {
      ctx.fillStyle = `rgba(239,68,68,${(0.5 * (1 - st.bumpAge / 0.4)).toFixed(3)})`
      ctx.beginPath()
      ctx.arc(cx, cy, r * 1.8, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(st.angle)
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    ctx.beginPath()
    ctx.ellipse(0, r * 0.25, r * 1.05, r * 0.95, 0, 0, Math.PI * 2)
    ctx.fill()
    // wheels
    ctx.fillStyle = '#1e293b'
    rr(ctx, -r * 0.75, -r * 1.05, r * 1.5, r * 0.36, r * 0.12)
    ctx.fill()
    rr(ctx, -r * 0.75, r * 0.69, r * 1.5, r * 0.36, r * 0.12)
    ctx.fill()
    // body
    const bg = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r)
    bg.addColorStop(0, '#FFB98F')
    bg.addColorStop(0.5, C.robot)
    bg.addColorStop(1, '#B9450C')
    ctx.fillStyle = bg
    ctx.beginPath()
    ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2)
    ctx.fill()
    // sensor dome
    ctx.fillStyle = '#0A1120'
    ctx.beginPath()
    ctx.arc(0, 0, r * 0.38, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#00E5FF'
    ctx.beginPath()
    ctx.arc(r * 0.12, 0, r * 0.18, 0, Math.PI * 2)
    ctx.fill()
    // nose (heading)
    ctx.fillStyle = '#FFE4D2'
    ctx.beginPath()
    ctx.moveTo(r * 0.95, 0)
    ctx.lineTo(r * 0.6, -r * 0.22)
    ctx.lineTo(r * 0.6, r * 0.22)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  fx.draw(ctx, v)
  ctx.restore()
}
