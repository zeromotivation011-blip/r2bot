// components/kids/games/ocean-rescue/diveRender.ts
// Canvas drawing for the side-view dive (Cadet, Pilot). Colours are lit the
// way the sea lights them: each object's red, green and blue are multiplied by
// the sunlight left at its depth (red fades first), plus the robot's own lamps
// close by — so the orange buoy looks grey-green in the gloom and turns orange
// again when the lights reach it.

import { WATER_COASTAL, lightAt, pressureAtm, clamp, type Rgb } from './physics'
import { buoyPos, currentAt, seabedAt, type DiveState } from './dive'

export interface DiveView {
  w: number
  h: number
  dpr: number
  ppm: number
  camX: number
  camZ: number
  reduced: boolean
}

interface Mote {
  x: number
  z: number
  s: number
}

export class DiveFx {
  motes: Mote[] = []
  bubbles: { x: number; z: number; vz: number; life: number }[] = []
  flash = 0
  shake = 0
  pingAnim: { t0: number; x: number; z: number; range: number | null; bx: number; bz: number } | null = null
  reduced: boolean
  constructor(reduced: boolean) {
    this.reduced = reduced
  }
  seed(v: DiveView) {
    const spanX = v.w / v.ppm + 4
    const spanZ = v.h / v.ppm + 4
    this.motes = []
    let a = 12345
    const r = () => {
      a = (a * 16807) % 2147483647
      return a / 2147483647
    }
    for (let i = 0; i < 70; i++) this.motes.push({ x: v.camX + (r() - 0.5) * spanX, z: v.camZ + (r() - 0.5) * spanZ, s: 0.5 + r() * 1.5 })
  }
  update(dt: number, s: DiveState, v: DiveView, thrusting: boolean) {
    const spanX = v.w / v.ppm + 4
    const spanZ = v.h / v.ppm + 4
    for (const m of this.motes) {
      if (!this.reduced) {
        m.x += currentAt(s.level, m.z) * dt
        m.z += 0.02 * dt
      }
      if (m.x < v.camX - spanX / 2) m.x += spanX
      if (m.x > v.camX + spanX / 2) m.x -= spanX
      if (m.z < v.camZ - spanZ / 2) m.z += spanZ
      if (m.z > v.camZ + spanZ / 2) m.z -= spanZ
    }
    if (thrusting && !this.reduced && this.bubbles.length < 60 && Math.random() < 0.5)
      this.bubbles.push({ x: s.x + (Math.random() - 0.5) * 0.8, z: s.z - 0.1, vz: -0.4 - Math.random() * 0.4, life: 1.6 })
    for (const b of this.bubbles) {
      b.z += b.vz * dt
      b.x += (Math.random() - 0.5) * 0.05
      b.life -= dt
    }
    this.bubbles = this.bubbles.filter((b) => b.life > 0 && b.z > 0)
    this.flash = Math.max(0, this.flash - dt * 2.5)
    this.shake = Math.max(0, this.shake - dt * 30)
  }
}

export function makeDiveView(w: number, h: number, dpr: number, reduced: boolean): DiveView {
  const ppm = clamp(Math.min(w / 30, h / 16), 11, 26)
  return { w, h, dpr, ppm, camX: 0, camZ: 0, reduced }
}

/** Follow the robot, kept inside the map. */
export function followCamera(v: DiveView, s: DiveState, snap: boolean) {
  const L = s.level
  const halfW = v.w / v.ppm / 2
  const halfH = v.h / v.ppm / 2
  const maxBed = Math.max(...L.seabed.map((p) => p[1]))
  const tx = clamp(s.x, halfW, Math.max(halfW, L.width - halfW))
  const tz = clamp(s.z, -2.5 + halfH, Math.max(-2.5 + halfH, maxBed + 2 - halfH))
  if (snap || v.reduced) {
    v.camX = tx
    v.camZ = tz
  } else {
    v.camX += (tx - v.camX) * 0.12
    v.camZ += (tz - v.camZ) * 0.12
  }
}

const SUN: Rgb = { r: 1, g: 0.97, b: 0.9 }

function ambient(z: number): Rgb {
  const l = lightAt(z, WATER_COASTAL)
  return { r: SUN.r * l.r, g: SUN.g * l.g, b: SUN.b * l.b }
}

function waterRgb(z: number): string {
  const a = ambient(z)
  return `rgb(${Math.round(6 + 70 * a.r)},${Math.round(16 + 150 * a.g)},${Math.round(30 + 175 * a.b)})`
}

/** An object's colour under ambient light + the robot's lamps (lamp = 0..1). */
function lit(base: Rgb, z: number, lamp: number, floor = 0.06): string {
  const a = ambient(z)
  const f = (c: number, amb: number) => Math.round(255 * clamp(c * (amb + lamp * 0.95) + floor * c, 0, 1))
  return `rgb(${f(base.r, a.r)},${f(base.g, a.g)},${f(base.b, a.b)})`
}

/** Lamp strength at distance d metres (lights fade with distance and are scattered by the water). */
function lampAt(d: number): number {
  return clamp(1.15 * Math.exp(-d / 3.2), 0, 1)
}

const SAND: Rgb = { r: 0.86, g: 0.74, b: 0.52 }
const ROCK: Rgb = { r: 0.5, g: 0.45, b: 0.42 }
const BUOY: Rgb = { r: 1, g: 0.33, b: 0.1 }
const ROV_BODY: Rgb = { r: 1, g: 0.78, b: 0.15 }

export function drawDive(ctx: CanvasRenderingContext2D, v: DiveView, s: DiveState, fx: DiveFx, now: number) {
  const L = s.level
  const { w, h, ppm, dpr } = v
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  const shx = fx.shake > 0 ? (Math.random() - 0.5) * fx.shake : 0
  const shy = fx.shake > 0 ? (Math.random() - 0.5) * fx.shake : 0
  ctx.save()
  ctx.translate(shx, shy)
  const X = (x: number) => (x - v.camX) * ppm + w / 2
  const Z = (z: number) => (z - v.camZ) * ppm + h / 2
  const zTop = v.camZ - h / 2 / ppm
  const zBot = v.camZ + h / 2 / ppm

  // ── Water column, coloured by depth ──
  const g = ctx.createLinearGradient(0, Z(Math.max(0, zTop)), 0, Z(zBot))
  for (let i = 0; i <= 8; i++) {
    const z = Math.max(0, zTop) + ((zBot - Math.max(0, zTop)) * i) / 8
    g.addColorStop(i / 8, waterRgb(z))
  }
  ctx.fillStyle = g
  ctx.fillRect(0, Math.max(0, Z(0)), w, h)
  // Sky + surface
  if (zTop < 0) {
    const sy = Z(0)
    const sky = ctx.createLinearGradient(0, 0, 0, sy)
    sky.addColorStop(0, '#7cc7f2')
    sky.addColorStop(1, '#cdeefe')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, w, sy)
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'
    ctx.lineWidth = 2
    ctx.beginPath()
    for (let x = 0; x <= w; x += 8) {
      const wave = v.reduced ? 0 : Math.sin(x * 0.05 + now * 1.6) * 2
      if (x === 0) ctx.moveTo(x, sy + wave)
      else ctx.lineTo(x, sy + wave)
    }
    ctx.stroke()
    // Sun rays (shallow water only)
    if (!v.reduced) {
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      for (let i = 0; i < 5; i++) {
        const x0 = ((i * 0.23 + 0.1) * w + Math.sin(now * 0.3 + i) * 20) % w
        const rg = ctx.createLinearGradient(0, sy, 0, sy + 12 * ppm)
        rg.addColorStop(0, 'rgba(200,255,240,0.10)')
        rg.addColorStop(1, 'rgba(200,255,240,0)')
        ctx.fillStyle = rg
        ctx.beginPath()
        ctx.moveTo(x0, sy)
        ctx.lineTo(x0 + 30, sy)
        ctx.lineTo(x0 + 90, sy + 12 * ppm)
        ctx.lineTo(x0 + 40, sy + 12 * ppm)
        ctx.fill()
      }
      ctx.restore()
    }
    drawShip(ctx, X(L.shipX), sy, ppm, s.attached)
  }

  // ── Search zone (Pilot) ──
  if (L.searchZone) {
    const zx0 = X(L.searchZone.x0)
    const zx1 = X(L.searchZone.x1)
    if (zx1 > 0 && zx0 < w) {
      ctx.fillStyle = 'rgba(0,229,255,0.05)'
      ctx.fillRect(zx0, Z(Math.max(0, zTop)), zx1 - zx0, h)
      ctx.setLineDash([6, 6])
      ctx.strokeStyle = 'rgba(0,229,255,0.35)'
      ctx.lineWidth = 1.5
      ctx.strokeRect(zx0, Z(Math.max(0, zTop)) + 1, zx1 - zx0, h)
      ctx.setLineDash([])
      ctx.fillStyle = 'rgba(165,243,252,0.85)'
      ctx.font = '600 12px Inter, system-ui, sans-serif'
      ctx.fillText('Buoy last heard here', Math.max(6, zx0 + 6), Math.max(16, Z(Math.max(0, zTop)) + 18))
    }
  }

  // ── Marine snow (drifts with the current — watch it to see the water move) ──
  for (const m of fx.motes) {
    const d = Math.hypot(m.x - s.x, m.z - s.z)
    const a = clamp(0.12 + lampAt(d) * 0.8, 0, 0.9)
    ctx.fillStyle = `rgba(220,240,235,${a})`
    ctx.fillRect(X(m.x), Z(m.z), m.s, m.s)
  }

  // ── Tether ──
  if (s.z > 0.2) {
    const sx = X(L.shipX)
    const sy = Z(0)
    let bow = 0
    for (const c of L.currents) bow += c.u * Math.max(0, Math.min(s.z, c.bottom) - c.top)
    const mx = (L.shipX + s.x) / 2 + bow * 0.25
    const mz = s.z / 2 + 1.5
    ctx.strokeStyle = s.taut ? '#f87171' : '#fbbf24'
    ctx.globalAlpha = 0.8
    ctx.lineWidth = s.taut ? 2.5 : 1.6
    ctx.beginPath()
    ctx.moveTo(sx, sy)
    ctx.quadraticCurveTo(X(mx), Z(mz), X(s.x - 0.3), Z(s.z - 0.25))
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  // ── Seabed ──
  const bedPath = new Path2D()
  const xa = v.camX - w / 2 / ppm - 1
  const xb = v.camX + w / 2 / ppm + 1
  bedPath.moveTo(X(xa), h + 10)
  for (let x = xa; x <= xb; x += 0.5) bedPath.lineTo(X(x), Z(seabedAt(L, x)))
  bedPath.lineTo(X(xb), h + 10)
  bedPath.closePath()
  const bedZ = seabedAt(L, v.camX)
  ctx.fillStyle = lit(SAND, bedZ, 0, 0.05)
  ctx.fill(bedPath)
  for (const r of L.rocks) {
    const d = Math.hypot(r.x - s.x, r.z - s.z) - r.r
    ctx.fillStyle = lit(ROCK, r.z, lampAt(Math.max(0, d)), 0.05)
    ctx.beginPath()
    ctx.ellipse(X(r.x), Z(r.z), r.r * ppm * 1.05, r.r * ppm, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  // The lamps' pool of light on the seabed
  ctx.save()
  ctx.clip(bedPath)
  const pool = ctx.createRadialGradient(X(s.x + 1), Z(s.z + 1), 0, X(s.x + 1), Z(s.z + 1), 7 * ppm)
  pool.addColorStop(0, 'rgba(240,215,160,0.85)')
  pool.addColorStop(1, 'rgba(240,215,160,0)')
  ctx.fillStyle = pool
  ctx.fillRect(0, 0, w, h)
  ctx.restore()

  // ── Range circles (pings) ──
  for (const p of s.pings) {
    const age = s.t - p.t
    if (p.range !== null) {
      if (L.sonarBearing && age > 8) continue
      ctx.setLineDash([8, 6])
      ctx.strokeStyle = 'rgba(0,229,255,0.7)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(X(p.x), Z(p.z), p.range * ppm, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = '#00e5ff'
      ctx.beginPath()
      ctx.arc(X(p.x), Z(p.z), 3, 0, Math.PI * 2)
      ctx.fill()
    } else if (!L.sonarBearing) {
      ctx.setLineDash([2, 6])
      ctx.strokeStyle = 'rgba(148,163,184,0.45)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(X(p.x), Z(p.z), L.sonarRange * ppm, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])
    }
  }

  // ── Buoy ──
  const bp = buoyPos(s)
  const dB = Math.hypot(bp.x - s.x, bp.z - s.z)
  const lamp = lampAt(dB)
  const bx = X(bp.x)
  const bz = Z(bp.z)
  ctx.strokeStyle = lit({ r: 0.7, g: 0.7, b: 0.7 }, bp.z, lamp)
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(bx, bz - 0.45 * ppm)
  ctx.lineTo(bx, bz - 1.1 * ppm)
  ctx.stroke()
  ctx.fillStyle = lit(BUOY, bp.z, lamp)
  ctx.beginPath()
  ctx.arc(bx, bz, 0.45 * ppm, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = lit({ r: 1, g: 1, b: 1 }, bp.z, lamp)
  ctx.fillRect(bx - 0.45 * ppm, bz - 0.06 * ppm, 0.9 * ppm, 0.12 * ppm)
  if (s.seenBuoy && !s.attached) {
    // Blinking strobe the buoy carries
    const on = v.reduced ? true : Math.sin(now * 5) > 0.6
    if (on) {
      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      ctx.beginPath()
      ctx.arc(bx, bz - 1.1 * ppm, 3, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // ── Bubbles ──
  ctx.strokeStyle = 'rgba(220,250,255,0.55)'
  ctx.lineWidth = 1
  for (const b of fx.bubbles) {
    ctx.beginPath()
    ctx.arc(X(b.x), Z(b.z), 2 + (1.6 - b.life), 0, Math.PI * 2)
    ctx.stroke()
  }

  // ── The ROV ──
  drawRov(ctx, X(s.x), Z(s.z), ppm, s, now, v.reduced)

  // Latch progress
  if (!s.attached && s.holdS > 0) {
    ctx.strokeStyle = '#22c55e'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.arc(X(s.x), Z(s.z), 1.3 * ppm, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * s.holdS) / L.latchHold)
    ctx.stroke()
  }

  // ── Ping animation (drawn slowed down: real sound would cross this screen in a few hundredths of a second) ──
  const pa = fx.pingAnim
  if (pa) {
    const age = now - pa.t0
    const dur = v.reduced ? 0.01 : 0.9
    const reach = pa.range ?? L.sonarRange
    const k = clamp(age / dur, 0, 1)
    if (age < dur + 1.2) {
      ctx.strokeStyle = `rgba(0,229,255,${0.9 * (1 - k * 0.6)})`
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(X(pa.x), Z(pa.z), Math.max(2, k * reach * ppm), 0, Math.PI * 2)
      ctx.stroke()
      if (pa.range !== null && age > dur) {
        const k2 = clamp((age - dur) / (v.reduced ? 0.01 : 0.9), 0, 1)
        ctx.strokeStyle = `rgba(253,224,71,${0.9 * (1 - k2 * 0.5)})`
        ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.arc(X(pa.bx), Z(pa.bz), Math.max(2, k2 * pa.range * ppm), 0, Math.PI * 2)
        ctx.stroke()
      }
    }
  }

  // Cadet: direction arrow from the last ping
  const last = s.pings[s.pings.length - 1]
  if (L.sonarBearing && last && last.bearing !== null && !s.attached && s.t - last.t < 6) {
    const ang = Math.atan2(L.buoy.z - s.z, L.buoy.x - s.x)
    const cx = X(s.x)
    const cz = Z(s.z)
    const r0 = 1.6 * ppm
    const r1 = 3.4 * ppm
    ctx.strokeStyle = '#00e5ff'
    ctx.fillStyle = '#00e5ff'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(cx + Math.cos(ang) * r0, cz + Math.sin(ang) * r0)
    ctx.lineTo(cx + Math.cos(ang) * r1, cz + Math.sin(ang) * r1)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(cx + Math.cos(ang) * (r1 + 10), cz + Math.sin(ang) * (r1 + 10))
    ctx.lineTo(cx + Math.cos(ang + 2.6) * 10 + Math.cos(ang) * r1, cz + Math.sin(ang + 2.6) * 10 + Math.sin(ang) * r1)
    ctx.lineTo(cx + Math.cos(ang - 2.6) * 10 + Math.cos(ang) * r1, cz + Math.sin(ang - 2.6) * 10 + Math.sin(ang) * r1)
    ctx.fill()
  }

  // ── Depth ruler ──
  ctx.font = '600 11px Inter, system-ui, sans-serif'
  for (let z = Math.ceil(Math.max(0, zTop) / 5) * 5; z <= zBot; z += 5) {
    const y = Z(z)
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.fillRect(0, y, 10, 1.5)
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.fillText(`${z} m · ${pressureAtm(z).toFixed(1)} atm`, 14, y + 4)
  }

  // Off-screen pointer to the ship when the buoy is on board
  if (s.attached) {
    const sx = X(L.shipX)
    if (sx < 0 || sx > w || Z(0) < 0) {
      const ang = Math.atan2(Z(0) - Z(s.z), sx - X(s.x))
      const ex = clamp(X(s.x) + Math.cos(ang) * 1000, 40, w - 40)
      const ey = clamp(Z(s.z) + Math.sin(ang) * 1000, 40, h - 40)
      ctx.fillStyle = 'rgba(252,104,24,0.95)'
      ctx.beginPath()
      ctx.arc(ex, ey, 16, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#1A1103'
      ctx.font = '800 12px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('🚢', ex, ey + 4)
      ctx.textAlign = 'start'
    }
  }

  drawMiniMap(ctx, v, s)

  if (fx.flash > 0) {
    ctx.fillStyle = `rgba(248,113,113,${fx.flash * 0.35})`
    ctx.fillRect(0, 0, w, h)
  }
  ctx.restore()
}

function drawShip(ctx: CanvasRenderingContext2D, x: number, y: number, ppm: number, attached: boolean) {
  const L = 7 * ppm
  ctx.fillStyle = '#e2e8f0'
  ctx.beginPath()
  ctx.moveTo(x - L / 2, y - 0.9 * ppm)
  ctx.lineTo(x + L / 2, y - 0.9 * ppm)
  ctx.lineTo(x + L / 2 - 0.8 * ppm, y + 0.6 * ppm)
  ctx.lineTo(x - L / 2 + 0.6 * ppm, y + 0.6 * ppm)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#FC6818'
  ctx.fillRect(x - L / 2, y - 0.3 * ppm, L, 0.25 * ppm)
  ctx.fillStyle = '#cbd5e1'
  ctx.fillRect(x - 1.4 * ppm, y - 2.2 * ppm, 2.4 * ppm, 1.3 * ppm)
  // A-frame crane
  ctx.strokeStyle = '#FC6818'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(x + L / 2 - 0.6 * ppm, y - 0.9 * ppm)
  ctx.lineTo(x + L / 2 + 0.4 * ppm, y - 2.6 * ppm)
  ctx.stroke()
  if (attached) {
    ctx.fillStyle = '#22c55e'
    ctx.beginPath()
    ctx.arc(x, y - 2.8 * ppm, 4, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawRov(ctx: CanvasRenderingContext2D, x: number, y: number, ppm: number, s: DiveState, now: number, reduced: boolean) {
  const bw = 1.3 * ppm
  const bh = 0.8 * ppm
  const z = s.z
  // Lamp beam into the water (scattered light)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const dir = s.vx < -0.05 || s.th < -2 ? -1 : 1
  const beam = ctx.createRadialGradient(x, y, 0, x + dir * 4 * ppm, y + 1 * ppm, 7 * ppm)
  beam.addColorStop(0, 'rgba(255,245,210,0.30)')
  beam.addColorStop(1, 'rgba(255,245,210,0)')
  ctx.fillStyle = beam
  ctx.beginPath()
  ctx.moveTo(x + dir * bw * 0.5, y - bh * 0.2)
  ctx.lineTo(x + dir * 8 * ppm, y - 2.5 * ppm)
  ctx.lineTo(x + dir * 8 * ppm, y + 4 * ppm)
  ctx.closePath()
  ctx.fill()
  ctx.restore()

  ctx.fillStyle = lit(ROV_BODY, z, 0.4, 0.25)
  ctx.beginPath()
  ctx.roundRect(x - bw / 2, y - bh / 2, bw, bh, 5)
  ctx.fill()
  // frame + buoyancy foam stripe
  ctx.fillStyle = 'rgba(15,23,42,0.75)'
  ctx.fillRect(x - bw / 2, y + bh * 0.15, bw, bh * 0.12)
  // thrusters
  ctx.fillStyle = '#334155'
  ctx.fillRect(x - bw / 2 - 0.22 * ppm, y - 0.15 * ppm, 0.22 * ppm, 0.3 * ppm)
  ctx.fillRect(x + bw / 2, y - 0.15 * ppm, 0.22 * ppm, 0.3 * ppm)
  // lamps
  ctx.fillStyle = '#fffbe6'
  ctx.beginPath()
  ctx.arc(x + dir * bw * 0.45, y - bh * 0.15, 0.1 * ppm + 1, 0, Math.PI * 2)
  ctx.fill()
  // gripper
  ctx.strokeStyle = '#94a3b8'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x + 0.2 * ppm, y + bh / 2)
  ctx.lineTo(x + 0.2 * ppm, y + bh / 2 + 0.25 * ppm)
  ctx.stroke()
  // status LED
  const blink = reduced ? true : Math.sin(now * 4) > 0
  ctx.fillStyle = blink ? '#22c55e' : '#14532d'
  ctx.beginPath()
  ctx.arc(x - bw * 0.3, y - bh * 0.25, 2.5, 0, Math.PI * 2)
  ctx.fill()
}

function drawMiniMap(ctx: CanvasRenderingContext2D, v: DiveView, s: DiveState) {
  const L = s.level
  const mw = Math.min(190, v.w * 0.34)
  const maxBed = Math.max(...L.seabed.map((p) => p[1])) + 3
  const mh = Math.max(56, (mw * maxBed) / L.width * 1.6)
  const mx = v.w - mw - 8
  const my = 8
  const sx = (x: number) => mx + (x / L.width) * mw
  const sz = (z: number) => my + (Math.max(0, z) / maxBed) * mh
  ctx.fillStyle = 'rgba(10,17,32,0.78)'
  ctx.strokeStyle = 'rgba(255,255,255,0.16)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.roundRect(mx - 4, my - 4, mw + 8, mh + 8, 8)
  ctx.fill()
  ctx.stroke()
  ctx.save()
  ctx.beginPath()
  ctx.rect(mx - 4, my - 4, mw + 8, mh + 8)
  ctx.clip()
  ctx.fillStyle = 'rgba(120,100,70,0.8)'
  ctx.beginPath()
  ctx.moveTo(sx(0), my + mh + 4)
  for (const [x, z] of L.seabed) ctx.lineTo(sx(x), sz(z))
  ctx.lineTo(sx(L.width), my + mh + 4)
  ctx.fill()
  if (L.searchZone) {
    ctx.fillStyle = 'rgba(0,229,255,0.12)'
    ctx.fillRect(sx(L.searchZone.x0), my, sx(L.searchZone.x1) - sx(L.searchZone.x0), mh)
  }
  const scale = mw / L.width
  for (const p of s.pings) {
    if (p.range === null) continue
    ctx.strokeStyle = 'rgba(0,229,255,0.75)'
    ctx.beginPath()
    ctx.ellipse(sx(p.x), sz(p.z), p.range * scale, (p.range * mh) / maxBed, 0, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.fillStyle = '#FC6818'
  ctx.fillRect(sx(L.shipX) - 5, my - 1, 10, 3)
  if (s.seenBuoy || s.attached) {
    const b = buoyPos(s)
    ctx.fillStyle = '#ff5a1f'
    ctx.beginPath()
    ctx.arc(sx(b.x), sz(b.z), 3, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = '#fde047'
  ctx.beginPath()
  ctx.arc(sx(s.x), sz(s.z), 3.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.font = '600 10px Inter, system-ui, sans-serif'
  ctx.fillText('SONAR CHART', mx, my + mh + 16)
}
