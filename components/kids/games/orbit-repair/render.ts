// components/kids/games/orbit-repair/render.ts
// Canvas drawing for Orbit Repair Crew: stars, the curve of the Earth below,
// the station module, the robot arm, the cargo ship, the servicer and the
// tumbling satellite. Original art from primitives; light enough for phones.
// No React in here.

import {
  ACE,
  ACE_PLACES,
  CADET,
  LEGEND,
  armIK,
  pinPos,
  predict,
  rot,
  seen,
  type AceState,
  type Arm,
  type CadetState,
  type Dir,
  type GameState,
  type LegendState,
  type PilotState,
  type Vec,
} from './sim'

export interface View {
  w: number
  h: number
  /** Pixels per metre. */
  scale: number
  /** World point at the centre of the canvas. */
  cx: number
  cy: number
}

const X = (v: View, x: number) => v.w / 2 + (x - v.cx) * v.scale
const Y = (v: View, y: number) => v.h / 2 - (y - v.cy) * v.scale

function fit(w: number, h: number, x0: number, x1: number, y0: number, y1: number): View {
  const scale = Math.min(w / (x1 - x0), h / (y1 - y0))
  return { w, h, scale, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 }
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  r: number
  color: string
}

function mulberry32(a: number): () => number {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Visual effects and the per-size background layout. Purely cosmetic. */
export class Fx {
  reduced: boolean
  particles: Particle[] = []
  stars: { x: number; y: number; r: number; p: number }[] = []
  flash = 0
  /** Legend: smoothed camera. */
  cam: { x: number; y: number; half: number } | null = null
  private sized = ''
  private rng = mulberry32(5)

  constructor(reduced: boolean) {
    this.reduced = reduced
  }

  layout(w: number, h: number): void {
    const key = `${Math.round(w)}x${Math.round(h)}`
    if (key === this.sized) return
    this.sized = key
    const r = mulberry32(11)
    this.stars = Array.from({ length: 90 }, () => ({ x: r() * 2 - 1, y: r() * 2 - 1, r: 0.4 + r() * 1.3, p: r() * 6 }))
  }

  /** Thruster plume: gas leaves opposite to the push. `at` in pixels. */
  plume(at: { x: number; y: number }, push: Dir, sizePx: number): void {
    const d = push === 'up' ? [0, 1] : push === 'down' ? [0, -1] : push === 'left' ? [1, 0] : [-1, 0]
    // screen y is down: a push "up" means gas goes down the screen.
    const gx = d[0]
    const gy = d[1]
    const n = this.reduced ? 3 : 14
    for (let i = 0; i < n; i++) {
      const spread = (this.rng() - 0.5) * 0.7
      const sp = (this.reduced ? 20 : 60 + this.rng() * 80) * (sizePx / 20)
      this.particles.push({
        x: at.x + gx * sizePx * 0.6,
        y: at.y + gy * sizePx * 0.6,
        vx: (gx + (gy !== 0 ? spread : 0)) * sp,
        vy: (gy + (gx !== 0 ? spread : 0)) * sp,
        life: 0,
        max: this.reduced ? 0.25 : 0.45 + this.rng() * 0.3,
        r: 1.5 + this.rng() * 2.5,
        color: this.rng() < 0.5 ? '#e0f2fe' : '#7dd3fc',
      })
    }
  }

  burst(at: { x: number; y: number }, color: string, n = 30): void {
    const count = this.reduced ? 6 : n
    for (let i = 0; i < count; i++) {
      const a = this.rng() * Math.PI * 2
      const sp = this.reduced ? 15 : 40 + this.rng() * 120
      this.particles.push({ x: at.x, y: at.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: 0.6 + this.rng() * 0.6, r: 1.5 + this.rng() * 2.5, color })
    }
  }

  update(dt: number): void {
    for (const p of this.particles) {
      p.life += dt
      p.x += p.vx * dt
      p.y += p.vy * dt
    }
    this.particles = this.particles.filter((p) => p.life < p.max)
    this.flash = Math.max(0, this.flash - dt * 2)
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const k = 1 - p.life / p.max
      ctx.globalAlpha = Math.max(0, k)
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r * (0.6 + k * 0.6), 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }
}

// ── Backgrounds ─────────────────────────────────────────────────────────────

function space(ctx: CanvasRenderingContext2D, w: number, h: number, fx: Fx, t: number, spin = 0): void {
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, '#03060d')
  g.addColorStop(1, '#0A1120')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  ctx.save()
  ctx.translate(w / 2, h / 2)
  ctx.rotate(spin)
  const R = Math.hypot(w, h) / 2
  for (const s of fx.stars) {
    const tw = fx.reduced ? 0.8 : 0.55 + 0.45 * Math.sin(t * 1.3 + s.p)
    ctx.globalAlpha = tw
    ctx.fillStyle = '#e2e8f0'
    ctx.fillRect(s.x * R, s.y * R, s.r, s.r)
  }
  ctx.restore()
  ctx.globalAlpha = 1
}

/** The curve of the Earth across the bottom, with clouds drifting by (we orbit fast!). */
function earth(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, reduced: boolean, topFrac = 0.8, spin = 0): void {
  ctx.save()
  ctx.translate(w / 2, h / 2)
  ctx.rotate(spin)
  ctx.translate(-w / 2, -h / 2)
  const R = Math.max(w, h) * 2.2
  const cx = w / 2
  const cy = h * topFrac + R
  // atmosphere glow
  const glow = ctx.createRadialGradient(cx, cy, R * 0.995, cx, cy, R * 1.03)
  glow.addColorStop(0, 'rgba(56,189,248,0.55)')
  glow.addColorStop(1, 'rgba(56,189,248,0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(cx, cy, R * 1.03, 0, Math.PI * 2)
  ctx.fill()
  const sea = ctx.createLinearGradient(0, h * topFrac, 0, h * topFrac + h * 0.4)
  sea.addColorStop(0, '#1d6fb8')
  sea.addColorStop(1, '#0b2d5c')
  ctx.fillStyle = sea
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, Math.PI * 2)
  ctx.fill()
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, Math.PI * 2)
  ctx.clip()
  // land and clouds slide past: the station circles the Earth in about 90 minutes
  const drift = reduced ? 0 : (t * 6) % (w * 1.6)
  ctx.fillStyle = 'rgba(74,140,80,0.75)'
  for (let i = 0; i < 3; i++) {
    const x = ((i * w * 0.62 - drift) % (w * 1.6)) + w * 0.2
    ctx.beginPath()
    ctx.ellipse(x, h * topFrac + 26 + i * 9, w * 0.16, 16, -0.08, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  for (let i = 0; i < 6; i++) {
    const x = ((i * w * 0.31 - drift * 1.25) % (w * 1.6)) + w * 0.3
    ctx.beginPath()
    ctx.ellipse(x, h * topFrac + 12 + (i % 3) * 14, w * 0.09, 5, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
  ctx.restore()
}

// ── Small parts ─────────────────────────────────────────────────────────────

function glyph(ctx: CanvasRenderingContext2D, txt: string, x: number, y: number, size: number): void {
  ctx.font = `${Math.round(size)}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(txt, x, y)
}

function label(ctx: CanvasRenderingContext2D, txt: string, x: number, y: number, color = '#EEF2F8', size = 12): void {
  ctx.font = `700 ${size}px "Space Grotesk", system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const w = ctx.measureText(txt).width + 10
  ctx.fillStyle = 'rgba(10,17,32,0.78)'
  ctx.beginPath()
  ctx.roundRect(x - w / 2, y - size * 0.8, w, size * 1.6, 6)
  ctx.fill()
  ctx.fillStyle = color
  ctx.fillText(txt, x, y + 0.5)
}

function arrow(ctx: CanvasRenderingContext2D, x: number, y: number, dx: number, dy: number, color: string, width = 3): void {
  const l = Math.hypot(dx, dy)
  if (l < 3) return
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + dx, y + dy)
  ctx.stroke()
  const a = Math.atan2(dy, dx)
  const hs = 5 + width * 1.5
  ctx.beginPath()
  ctx.moveTo(x + dx, y + dy)
  ctx.lineTo(x + dx - Math.cos(a - 0.5) * hs, y + dy - Math.sin(a - 0.5) * hs)
  ctx.lineTo(x + dx - Math.cos(a + 0.5) * hs, y + dy - Math.sin(a + 0.5) * hs)
  ctx.closePath()
  ctx.fill()
}

function ring(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, dash = true, t = 0): void {
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  if (dash) {
    ctx.setLineDash([6, 5])
    ctx.lineDashOffset = -t * 12
  }
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])
}

/** The helper robot: a cube with a face, lights and fan grilles (an original design). */
function freeFlyer(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number, color = '#FC6818'): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.beginPath()
  ctx.roundRect(-s / 2 + 2, -s / 2 + 3, s, s, s * 0.18)
  ctx.fill()
  const g = ctx.createLinearGradient(0, -s / 2, 0, s / 2)
  g.addColorStop(0, '#FFA878')
  g.addColorStop(1, color)
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.roundRect(-s / 2, -s / 2, s, s, s * 0.18)
  ctx.fill()
  ctx.fillStyle = '#1A1103'
  ctx.beginPath()
  ctx.roundRect(-s * 0.32, -s * 0.26, s * 0.64, s * 0.34, s * 0.1)
  ctx.fill()
  ctx.fillStyle = '#00E5FF'
  const blink = Math.sin(t * 2.1) > 0.96 ? 0.15 : 1
  ctx.beginPath()
  ctx.ellipse(-s * 0.13, -s * 0.09, s * 0.06, s * 0.07 * blink, 0, 0, Math.PI * 2)
  ctx.ellipse(s * 0.13, -s * 0.09, s * 0.06, s * 0.07 * blink, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(26,17,3,0.55)'
  ctx.lineWidth = Math.max(1, s * 0.04)
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath()
    ctx.moveTo(-s * 0.25, s * 0.24 + i * s * 0.06)
    ctx.lineTo(s * 0.25, s * 0.24 + i * s * 0.06)
    ctx.stroke()
  }
  ctx.restore()
}

function drawArm(ctx: CanvasRenderingContext2D, v: View, a: Arm, holding: boolean, t: number): { hand: { x: number; y: number } } {
  const ik = armIK(a)
  const b = { x: X(v, a.base.x), y: Y(v, a.base.y) }
  const e = { x: X(v, ik.elbow.x), y: Y(v, ik.elbow.y) }
  const h = { x: X(v, a.hand.x), y: Y(v, a.hand.y) }
  const wB = Math.max(6, v.scale * 0.55)
  ctx.lineCap = 'round'
  for (const [p, q] of [
    [b, e],
    [e, h],
  ] as const) {
    ctx.strokeStyle = '#cbd5e1'
    ctx.lineWidth = wB
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
    ctx.lineTo(q.x, q.y)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'
    ctx.lineWidth = wB * 0.25
    ctx.beginPath()
    ctx.moveTo(p.x, p.y - wB * 0.18)
    ctx.lineTo(q.x, q.y - wB * 0.18)
    ctx.stroke()
  }
  for (const j of [b, e]) {
    ctx.fillStyle = '#334155'
    ctx.beginPath()
    ctx.arc(j.x, j.y, wB * 0.8, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#FC6818'
    ctx.beginPath()
    ctx.arc(j.x, j.y, wB * 0.35, 0, Math.PI * 2)
    ctx.fill()
  }
  // End effector: a short drum with a glowing snare ring
  ctx.fillStyle = '#e2e8f0'
  ctx.beginPath()
  ctx.arc(h.x, h.y, wB * 0.95, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = holding ? '#22C55E' : '#00E5FF'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(h.x, h.y, wB * 0.95 + 3 + (holding ? 0 : Math.sin(t * 4) * 1.2), 0, Math.PI * 2)
  ctx.stroke()
  return { hand: h }
}

function solarWing(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  const g = ctx.createLinearGradient(x, y, x + w, y + h)
  g.addColorStop(0, '#1e3a8a')
  g.addColorStop(1, '#1d4ed8')
  ctx.fillStyle = g
  ctx.fillRect(x, y, w, h)
  ctx.strokeStyle = 'rgba(147,197,253,0.45)'
  ctx.lineWidth = 1
  const cells = Math.max(2, Math.round(w / 9))
  for (let i = 1; i < cells; i++) {
    ctx.beginPath()
    ctx.moveTo(x + (w * i) / cells, y)
    ctx.lineTo(x + (w * i) / cells, y + h)
    ctx.stroke()
  }
  ctx.strokeStyle = 'rgba(203,213,225,0.8)'
  ctx.strokeRect(x, y, w, h)
}

// ── Cadet ───────────────────────────────────────────────────────────────────

export function cadetView(w: number, h: number): View {
  return fit(w, h, -0.35, CADET.w + 0.35, -0.35, CADET.h + 0.55)
}

function drawCadet(ctx: CanvasRenderingContext2D, v: View, s: CadetState, fx: Fx): void {
  space(ctx, v.w, v.h, fx, s.t)
  const x0 = X(v, 0)
  const y0 = Y(v, CADET.h)
  const mw = CADET.w * v.scale
  const mh = CADET.h * v.scale
  // module wall
  ctx.fillStyle = '#19263F'
  ctx.beginPath()
  ctx.roundRect(x0 - 8, y0 - 8, mw + 16, mh + 16, 18)
  ctx.fill()
  const g = ctx.createLinearGradient(0, y0, 0, y0 + mh)
  g.addColorStop(0, '#dfe6ee')
  g.addColorStop(1, '#b8c4d2')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.roundRect(x0, y0, mw, mh, 12)
  ctx.fill()
  // wall panels
  ctx.strokeStyle = 'rgba(71,85,105,0.35)'
  ctx.lineWidth = 1
  for (let i = 1; i < 8; i++) {
    ctx.beginPath()
    ctx.moveTo(X(v, i), y0)
    ctx.lineTo(X(v, i), y0 + mh)
    ctx.stroke()
  }
  // window with the Earth
  const wx = X(v, 3.9)
  const wy = Y(v, 2.2)
  const wr = Math.min(mh * 0.3, mw * 0.11)
  ctx.save()
  ctx.beginPath()
  ctx.arc(wx, wy, wr, 0, Math.PI * 2)
  ctx.clip()
  ctx.translate(wx - wr, wy - wr)
  space(ctx, wr * 2, wr * 2, fx, s.t)
  earth(ctx, wr * 2, wr * 2, s.t * 3, fx.reduced, 0.55)
  ctx.restore()
  ctx.strokeStyle = '#64748b'
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.arc(wx, wy, wr, 0, Math.PI * 2)
  ctx.stroke()
  ctx.strokeStyle = '#FC6818'
  ctx.lineWidth = 3
  for (const hx of [2, 6]) {
    ctx.beginPath()
    ctx.moveTo(X(v, hx - 0.5), Y(v, 0.18))
    ctx.lineTo(X(v, hx + 0.5), Y(v, 0.18))
    ctx.stroke()
  }
  label(ctx, 'No up, no down — everything floats', X(v, CADET.w / 2), Y(v, CADET.h) - 0.25 * v.scale - 4, '#A7B0C0', 11)

  // dock
  const allGot = s.pickups.every((k) => k.got)
  const dx = X(v, s.dock.x)
  const dy = Y(v, s.dock.y)
  ctx.fillStyle = allGot ? 'rgba(34,197,94,0.25)' : 'rgba(100,116,139,0.25)'
  ctx.beginPath()
  ctx.arc(dx, dy, CADET.dockR * v.scale, 0, Math.PI * 2)
  ctx.fill()
  ring(ctx, dx, dy, CADET.dockR * v.scale, allGot ? '#22C55E' : '#64748b', true, s.t)
  ctx.fillStyle = '#0A1120'
  glyph(ctx, '⚡', dx, dy, v.scale * 0.26)
  label(ctx, allGot ? 'Charger: stop here!' : 'Charger', dx, dy + CADET.dockR * v.scale + 12, allGot ? '#86efac' : '#A7B0C0', 11)

  // pickups
  const next = s.pickups.find((k) => !k.got)
  for (const k of s.pickups) {
    if (k.got) continue
    const px = X(v, k.p.x)
    const py = Y(v, k.p.y) + (fx.reduced ? 0 : Math.sin(s.t * 1.4 + k.p.x) * 2)
    if (k === next) ring(ctx, px, py, CADET.pickR * v.scale, '#FFA878', true, s.t)
    ctx.fillStyle = '#000'
    glyph(ctx, k.icon, px, py, v.scale * 0.36)
  }

  // robot + velocity arrow
  const rx = X(v, s.p.x)
  const ry = Y(v, s.p.y)
  fx.draw(ctx)
  freeFlyer(ctx, rx, ry, CADET.size * v.scale, s.t)
  // carried items ride along
  let i = 0
  for (const k of s.pickups) {
    if (!k.got) continue
    glyph(ctx, k.icon, rx + (i === 0 ? -1 : 1) * CADET.size * v.scale * 0.55, ry - CADET.size * v.scale * 0.55, v.scale * 0.2)
    i++
  }
  arrow(ctx, rx, ry, s.v.x * v.scale * 3, -s.v.y * v.scale * 3, '#00E5FF', 3)
}

// ── Pilot ───────────────────────────────────────────────────────────────────

export function pilotView(w: number, h: number): View {
  return fit(w, h, -13, 15, -2.5, 15.5)
}

function drawStationTruss(ctx: CanvasRenderingContext2D, v: View, y: number, x0: number, x1: number): void {
  const top = Y(v, y + 0.6)
  const bot = Y(v, y - 0.6)
  ctx.fillStyle = '#94a3b8'
  ctx.fillRect(X(v, x0), top, (x1 - x0) * v.scale, bot - top)
  ctx.strokeStyle = '#475569'
  ctx.lineWidth = 1.5
  for (let x = x0; x < x1; x += 1.2) {
    ctx.beginPath()
    ctx.moveTo(X(v, x), top)
    ctx.lineTo(X(v, x + 1.2), bot)
    ctx.moveTo(X(v, x), bot)
    ctx.lineTo(X(v, x + 1.2), top)
    ctx.stroke()
  }
  solarWing(ctx, X(v, x0 - 5.3), Y(v, y + 0.85), 4.8 * v.scale, 1.7 * v.scale)
  solarWing(ctx, X(v, x1 + 0.5), Y(v, y + 0.85), 4.8 * v.scale, 1.7 * v.scale)
}

function drawPilot(ctx: CanvasRenderingContext2D, v: View, s: PilotState, fx: Fx): void {
  space(ctx, v.w, v.h, fx, s.t)
  earth(ctx, v.w, v.h, s.t, fx.reduced, 0.9)
  // Reach envelope
  ctx.strokeStyle = 'rgba(0,229,255,0.18)'
  ctx.setLineDash([4, 6])
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(X(v, 0), Y(v, 0), (s.arm.l1 + s.arm.l2 - 0.2) * v.scale, Math.PI, 2 * Math.PI)
  ctx.stroke()
  ctx.setLineDash([])
  drawStationTruss(ctx, v, -0.9, -9, 9)

  // Cargo ship
  const sh = s.ship
  ctx.save()
  ctx.translate(X(v, sh.p.x), Y(v, sh.p.y))
  ctx.rotate(-sh.ang)
  const L = 5.2 * v.scale
  const H = 2.8 * v.scale
  solarWing(ctx, -L / 2 - 3.2 * v.scale, -H * 0.18, 3 * v.scale, H * 0.36)
  solarWing(ctx, L / 2 + 0.2 * v.scale, -H * 0.18, 3 * v.scale, H * 0.36)
  const g = ctx.createLinearGradient(0, -H / 2, 0, H / 2)
  g.addColorStop(0, '#f8fafc')
  g.addColorStop(1, '#cbd5e1')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.roundRect(-L / 2, -H / 2, L, H, H * 0.35)
  ctx.fill()
  ctx.fillStyle = '#FC6818'
  ctx.fillRect(-L / 2 + 6, -H * 0.08, L - 12, H * 0.16)
  ctx.fillStyle = '#334155'
  glyph(ctx, '📦', 0, -H * 0.22, H * 0.32)
  // grapple pin (in ship frame, y down on screen)
  const pin = { x: sh.pin.x * v.scale, y: -sh.pin.y * v.scale }
  ctx.fillStyle = '#e2e8f0'
  ctx.fillRect(pin.x - 4, -H / 2 + H, 8, pin.y - H / 2)
  ctx.fillStyle = '#facc15'
  ctx.beginPath()
  ctx.arc(pin.x, pin.y, Math.max(4, v.scale * 0.22), 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  const pp = pinPos(sh)
  const ppx = X(v, pp.x)
  const ppy = Y(v, pp.y)
  if (!s.captured) ring(ctx, ppx, ppy, 0.6 * v.scale, 'rgba(250,204,21,0.8)', true, s.t)
  arrow(ctx, X(v, sh.p.x), Y(v, sh.p.y) + H * 0.8, sh.v.x * v.scale * 12, -sh.v.y * v.scale * 12, 'rgba(250,204,21,0.9)', 2)

  const { hand } = drawArm(ctx, v, s.arm, s.captured, s.t)
  arrow(ctx, hand.x, hand.y, s.arm.hv.x * v.scale * 12, -s.arm.hv.y * v.scale * 12, '#00E5FF', 2.5)
  fx.draw(ctx)
}

// ── Ace ─────────────────────────────────────────────────────────────────────

export function aceView(w: number, h: number): View {
  return fit(w, h, -9.5, 9.5, -5.5, 11.5)
}

function moduleBox(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, kind: 'old' | 'new', t: number): void {
  ctx.fillStyle = kind === 'old' ? '#7f1d1d' : '#065f46'
  ctx.beginPath()
  ctx.roundRect(x - s / 2, y - s / 2, s, s, s * 0.15)
  ctx.fill()
  ctx.strokeStyle = kind === 'old' ? '#fca5a5' : '#86efac'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.fillStyle = '#fff'
  glyph(ctx, kind === 'old' ? '⚠️' : '✨', x, y, s * 0.5)
  if (kind === 'old' && Math.sin(t * 5) > 0) {
    ctx.fillStyle = '#ef4444'
    ctx.beginPath()
    ctx.arc(x + s * 0.32, y - s * 0.32, s * 0.08, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawAce(ctx: CanvasRenderingContext2D, v: View, s: AceState, fx: Fx): void {
  space(ctx, v.w, v.h, fx, s.t)
  earth(ctx, v.w, v.h, s.t, fx.reduced, 0.93)
  // antenna lock cone (fixed, pointing at Earth) for reference
  const ox = X(v, 0)
  const oy = Y(v, 0)
  const lim = (ACE.limitDeg * Math.PI) / 180
  ctx.fillStyle = 'rgba(34,197,94,0.10)'
  ctx.beginPath()
  ctx.moveTo(ox, oy)
  ctx.arc(ox, oy, v.h, Math.PI / 2 - lim, Math.PI / 2 + lim)
  ctx.closePath()
  ctx.fill()

  ctx.save()
  ctx.translate(ox, oy)
  ctx.rotate(-s.theta)
  ctx.translate(-ox, -oy)
  // beam from the antenna toward where the spacecraft points
  const deg = Math.abs((s.theta * 180) / Math.PI)
  const beamCol = deg > ACE.warnDeg ? 'rgba(239,68,68,0.55)' : 'rgba(0,229,255,0.45)'
  ctx.strokeStyle = beamCol
  ctx.lineWidth = 3
  ctx.setLineDash([3, 7])
  ctx.lineDashOffset = fx.reduced ? 0 : -s.t * 30
  ctx.beginPath()
  ctx.moveTo(ox, Y(v, -2.2))
  ctx.lineTo(ox, v.h + 400)
  ctx.stroke()
  ctx.setLineDash([])

  // servicer bus
  solarWing(ctx, X(v, -9.2), Y(v, 0.6), 5.4 * v.scale, 1.2 * v.scale)
  solarWing(ctx, X(v, 3.8), Y(v, 0.6), 5.4 * v.scale, 1.2 * v.scale)
  const g = ctx.createLinearGradient(0, Y(v, 2.5), 0, Y(v, -2.2))
  g.addColorStop(0, '#facc15')
  g.addColorStop(1, '#a16207')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.roundRect(X(v, -2.5), Y(v, 2.5), 5 * v.scale, 4.7 * v.scale, 10)
  ctx.fill()
  ctx.fillStyle = '#e2e8f0'
  ctx.beginPath()
  ctx.ellipse(ox, Y(v, -2.4), 0.9 * v.scale, 0.35 * v.scale, 0, 0, Math.PI * 2)
  ctx.fill()
  // reaction wheel indicator
  ctx.strokeStyle = '#334155'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(ox, oy, 0.8 * v.scale, 0, Math.PI * 2)
  ctx.stroke()
  ctx.strokeStyle = '#FC6818'
  ctx.beginPath()
  ctx.arc(ox, oy, 0.8 * v.scale, -Math.PI / 2, -Math.PI / 2 + s.wheel * Math.PI, s.wheel < 0)
  ctx.stroke()
  // client satellite attached on the left, bays on the right
  ctx.fillStyle = '#475569'
  ctx.beginPath()
  ctx.roundRect(X(v, -7.6), Y(v, 8.6), 3.6 * v.scale, 6.2 * v.scale, 10)
  ctx.fill()
  ctx.strokeStyle = '#94a3b8'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(X(v, -4), Y(v, 3.6))
  ctx.lineTo(X(v, -2.5), Y(v, 2.0))
  ctx.stroke()
  solarWing(ctx, X(v, -9.4), Y(v, 10.8), 2 * v.scale, 1.6 * v.scale)
  label(ctx, 'Client satellite', X(v, -5.8), Y(v, 9.4), '#A7B0C0', 11)
  ctx.fillStyle = '#334155'
  ctx.beginPath()
  ctx.roundRect(X(v, 3.4), Y(v, 9.8), 2.1 * v.scale, 6.1 * v.scale, 8)
  ctx.fill()
  ctx.strokeStyle = '#64748b'
  ctx.beginPath()
  ctx.moveTo(X(v, 3.4), Y(v, 3.7))
  ctx.lineTo(X(v, 2.5), Y(v, 2.4))
  ctx.stroke()

  const ms = 1.05 * v.scale
  for (const pl of ACE_PLACES) {
    const px = X(v, pl.p.x)
    const py = Y(v, pl.p.y)
    ctx.strokeStyle = 'rgba(226,232,240,0.6)'
    ctx.lineWidth = 2
    ctx.setLineDash([4, 4])
    ctx.strokeRect(px - ms / 2 - 3, py - ms / 2 - 3, ms + 6, ms + 6)
    ctx.setLineDash([])
    const m = s.at[pl.id]
    if (m) moduleBox(ctx, px, py, ms, m, s.t)
  }
  const { hand } = drawArm(ctx, v, s.arm, !!s.held, s.t)
  // Place outlines and labels go on top of the arm, so the hand never hides
  // where a module belongs (the labels carry their own dark backing).
  for (const pl of ACE_PLACES) {
    const px = X(v, pl.p.x)
    const py = Y(v, pl.p.y)
    ctx.strokeStyle = 'rgba(226,232,240,0.75)'
    ctx.lineWidth = 2
    ctx.setLineDash([4, 4])
    ctx.strokeRect(px - ms / 2 - 3, py - ms / 2 - 3, ms + 6, ms + 6)
    ctx.setLineDash([])
    label(ctx, pl.label, px, py + ms / 2 + 14, '#EEF2F8', 11)
  }
  if (s.held) moduleBox(ctx, hand.x, hand.y - ms * 0.15, ms * 0.95, s.held, s.t)
  arrow(ctx, hand.x, hand.y, s.arm.hv.x * v.scale * 10, -s.arm.hv.y * v.scale * 10, '#00E5FF', 2.5)
  ctx.restore()
  fx.draw(ctx)
}

// ── Legend ──────────────────────────────────────────────────────────────────

export function legendView(w: number, h: number, s: LegendState, fx: Fx): View {
  const sn = seen(s)
  const p = sn.synced ? sn.pr : sn.p
  const tx = (p.x + 0) / 2
  const ty = (p.y + 0) / 2
  const half = Math.max(7, len2(p) * 0.62 + 3)
  const c = fx.cam ?? { x: tx, y: ty, half }
  const k = fx.reduced ? 1 : 0.06
  c.x += (tx - c.x) * k
  c.y += (ty - c.y) * k
  c.half += (half - c.half) * k
  fx.cam = c
  const scale = Math.min(w, h) / (2 * c.half)
  return { w, h, scale, cx: c.x, cy: c.y }
}
const len2 = (p: Vec) => Math.hypot(p.x, p.y)

function satellite(ctx: CanvasRenderingContext2D, v: View, ang: number, showCapture: boolean, t: number): void {
  ctx.save()
  ctx.translate(X(v, 0), Y(v, 0))
  ctx.rotate(-ang)
  const s = v.scale
  solarWing(ctx, -1.1 * s, -5.6 * s, 2.2 * s, 4.2 * s)
  solarWing(ctx, -1.1 * s, 1.4 * s, 2.2 * s, 4.2 * s)
  ctx.fillStyle = '#d4a017'
  ctx.beginPath()
  ctx.roundRect(-1.4 * s, -1.4 * s, 2.8 * s, 2.8 * s, 0.3 * s)
  ctx.fill()
  ctx.strokeStyle = '#7c5a06'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.fillStyle = '#e2e8f0'
  ctx.beginPath()
  ctx.ellipse(1.6 * s, 0, 0.3 * s, 0.9 * s, 0, 0, Math.PI * 2)
  ctx.fill()
  // Capture fixture on the −x face (engine ring), and the capture point
  ctx.strokeStyle = '#facc15'
  ctx.lineWidth = Math.max(2, 0.18 * s)
  ctx.beginPath()
  ctx.arc(-1.6 * s, 0, 0.45 * s, 0, Math.PI * 2)
  ctx.stroke()
  if (showCapture) {
    const c = LEGEND.capture
    ring(ctx, c.x * s, -c.y * s, LEGEND.captureR * s, '#22C55E', true, t)
  }
  ctx.restore()
}

function servicer(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, ghost = false): void {
  ctx.save()
  ctx.globalAlpha = ghost ? 0.45 : 1
  ctx.translate(x, y)
  if (ghost) {
    ctx.strokeStyle = '#00E5FF'
    ctx.setLineDash([4, 3])
    ctx.lineWidth = 2
    ctx.strokeRect(-0.8 * s, -0.8 * s, 1.6 * s, 1.6 * s)
    ctx.setLineDash([])
    ctx.restore()
    return
  }
  solarWing(ctx, -2.6 * s, -0.25 * s, 1.6 * s, 0.5 * s)
  solarWing(ctx, 1.0 * s, -0.25 * s, 1.6 * s, 0.5 * s)
  ctx.fillStyle = '#FC6818'
  ctx.beginPath()
  ctx.roundRect(-0.8 * s, -0.8 * s, 1.6 * s, 1.6 * s, 0.25 * s)
  ctx.fill()
  ctx.strokeStyle = '#e2e8f0'
  ctx.lineWidth = Math.max(2, 0.14 * s)
  ctx.beginPath()
  ctx.moveTo(0.8 * s, 0)
  ctx.lineTo(1.25 * s, 0)
  ctx.stroke()
  ctx.fillStyle = '#1A1103'
  ctx.fillRect(-0.45 * s, -0.3 * s, 0.9 * s, 0.35 * s)
  ctx.restore()
}

function drawLegend(ctx: CanvasRenderingContext2D, v: View, s: LegendState, fx: Fx, showPredictor: boolean): void {
  const sn = seen(s)
  const spin = sn.synced ? sn.ang : 0
  space(ctx, v.w, v.h, fx, s.t, spin)
  earth(ctx, v.w, v.h, s.t, fx.reduced, 0.9, spin)
  // range rings around the target
  for (const r of [LEGEND.syncRange, 5]) {
    ctx.strokeStyle = r === LEGEND.syncRange ? 'rgba(0,229,255,0.22)' : 'rgba(255,255,255,0.08)'
    ctx.setLineDash([5, 7])
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(X(v, 0), Y(v, 0), r * v.scale, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.setLineDash([])
  if (!sn.synced) label(ctx, `Sync zone ${LEGEND.syncRange} m`, X(v, 0), Y(v, LEGEND.syncRange) - 2, '#67e8f9', 11)
  satellite(ctx, v, sn.synced ? 0 : sn.ang, true, s.t)
  const p = sn.synced ? sn.pr : sn.p
  const vel = sn.synced ? sn.vr : sn.v
  const px = X(v, p.x)
  const py = Y(v, p.y)
  if (showPredictor && s.phase !== 'captured' && s.phase !== 'detumble' && s.phase !== 'done') {
    const g = predict(s)
    // When sync status is about to change the frames differ; only draw in the shown frame.
    if (s.synced === sn.synced) {
      const gx = X(v, g.x)
      const gy = Y(v, g.y)
      ctx.strokeStyle = 'rgba(0,229,255,0.5)'
      ctx.setLineDash([2, 4])
      ctx.beginPath()
      ctx.moveTo(px, py)
      ctx.lineTo(gx, gy)
      ctx.stroke()
      ctx.setLineDash([])
      servicer(ctx, gx, gy, v.scale, true)
    }
  }
  servicer(ctx, px, py, v.scale)
  fx.draw(ctx)
  arrow(ctx, px, py, vel.x * v.scale * 15, -vel.y * v.scale * 15, '#00E5FF', 2.5)
  if (s.phase === 'detumble' || s.phase === 'done') {
    label(ctx, s.phase === 'detumble' ? 'Stopping the tumble…' : 'Refuelling ⛽', X(v, 0), Y(v, 0) - 3.2 * v.scale, '#86efac', 13)
  }
}

// ── Entry point ─────────────────────────────────────────────────────────────

export function viewFor(s: GameState, w: number, h: number, fx: Fx): View {
  if (s.kind === 'cadet') return cadetView(w, h)
  if (s.kind === 'pilot') return pilotView(w, h)
  if (s.kind === 'ace') return aceView(w, h)
  return legendView(w, h, s, fx)
}

/** Pixel position of the thing that puffs (for plumes). */
export function actorPixel(s: GameState, v: View): { x: number; y: number } {
  if (s.kind === 'cadet') return { x: X(v, s.p.x), y: Y(v, s.p.y) }
  if (s.kind === 'pilot' || s.kind === 'ace') {
    const p = s.kind === 'ace' ? rot(s.arm.hand, s.theta) : s.arm.hand
    return { x: X(v, p.x), y: Y(v, p.y) }
  }
  const sn = seen(s)
  const p = sn.synced ? sn.pr : sn.p
  return { x: X(v, p.x), y: Y(v, p.y) }
}

export function drawGame(ctx: CanvasRenderingContext2D, v: View, s: GameState, fx: Fx, opts: { predictor: boolean }): void {
  fx.layout(v.w, v.h)
  if (s.kind === 'cadet') drawCadet(ctx, v, s, fx)
  else if (s.kind === 'pilot') drawPilot(ctx, v, s, fx)
  else if (s.kind === 'ace') drawAce(ctx, v, s, fx)
  else drawLegend(ctx, v, s, fx, opts.predictor)
  if (fx.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${fx.flash * 0.35})`
    ctx.fillRect(0, 0, v.w, v.h)
  }
}
