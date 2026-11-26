// components/kids/games/mars-rover/render.ts
// Canvas drawing for Mars Rover Command: a baked, hill-shaded Mars map (sand,
// dunes, slopes, craters, rocks), the rover as Earth last saw it, the planned
// route, pictures that have arrived, and the Earth↔Mars radio strip. Original
// art from primitives; no React here.

import { DIRS, heightAt, idx, mulberry32, valueNoise, type MarsMap } from './terrain'
import { CELL_M, clockAt, earthSnap, fmtClock, solarW, type Preview, type Sim, type Snap } from './sim'

export interface View {
  w: number
  h: number
  dpr: number
  cs: number
  ox: number
  oy: number
  band: number
}

export const BAND_PX = 54

export function makeView(w: number, h: number, dpr: number, m: MarsMap): View {
  const band = BAND_PX
  const cs = Math.min(w / m.W, (h - band) / m.H)
  const ox = (w - cs * m.W) / 2
  const oy = band + (h - band - cs * m.H) / 2
  return { w, h, dpr, cs, ox, oy, band }
}

const cx = (v: View, x: number) => v.ox + (x + 0.5) * v.cs
const cy = (v: View, y: number) => v.oy + (y + 0.5) * v.cs

// ── terrain bake ───────────────────────────────────────────────────────────

const PX = 22

function mix(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

export function bakeTerrain(m: MarsMap): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = m.W * PX
  c.height = m.H * PX
  const ctx = c.getContext('2d')
  if (!ctx) return c
  const img = ctx.createImageData(c.width, c.height)
  const low: [number, number, number] = [128, 52, 26]
  const mid: [number, number, number] = [186, 92, 46]
  const high: [number, number, number] = [222, 140, 86]
  const sand: [number, number, number] = [226, 168, 106]
  const duneC: [number, number, number] = [104, 58, 34]
  const hasSlip = m.slip.some((v) => v > 0)
  // Height once per pixel (plus one extra row/column), so the hill-shade can
  // use neighbouring pixels instead of sampling the noise three times.
  const HW = c.width + 1
  const hts = new Float32Array(HW * (c.height + 1))
  for (let py = 0; py <= c.height; py++) for (let px = 0; px <= c.width; px++) hts[py * HW + px] = heightAt(px / PX, py / PX, m.seed)
  const gScale = 0.06 * PX
  for (let py = 0; py < c.height; py++) {
    for (let px = 0; px < c.width; px++) {
      const x = px / PX
      const y = py / PX
      const hgt = hts[py * HW + px]
      const gx = (hts[py * HW + px + 1] - hgt) * gScale
      const gy = (hts[(py + 1) * HW + px] - hgt) * gScale
      // Light from the upper left (north-west), like a real hill-shade map.
      const shade = Math.max(0.62, Math.min(1.28, 1 - (gx + gy) * 9))
      let col = hgt < 0.5 ? mix(low, mid, hgt / 0.5) : mix(mid, high, Math.min(1, (hgt - 0.5) / 0.4))
      const ci = idx(m, Math.min(m.W - 1, Math.floor(x)), Math.min(m.H - 1, Math.floor(y)))
      // Sand follows the same noise field the simulation samples per square,
      // blended softly so its edges look natural.
      const sn = hasSlip ? valueNoise((x - 0.5) / 3.2, (y - 0.5) / 3.2, m.seed + 101) : 0
      const sandT = Math.max(0, Math.min(1, (sn - 0.47) / 0.08))
      const s = sandT * Math.max(0.3, m.slip[ci])
      if (s > 0) {
        const rip = 0.5 + 0.5 * Math.sin((x * 0.8 + y * 0.45) * 9 + Math.sin(y * 2.3) * 1.4)
        col = mix(col, sand, (0.42 + s * 0.3) * sandT)
        col = mix(col, [150, 92, 52], rip * 0.16 * sandT)
      }
      if (m.dune[ci]) {
        const rip = 0.5 + 0.5 * Math.sin((x * 0.5 + y * 0.9) * 11 + Math.sin(x * 3.1) * 1.2)
        col = mix(col, duneC, 0.78)
        col = mix(col, [70, 36, 20], rip * 0.35)
      }
      // Fine grain.
      const grain = (Math.sin(px * 12.9898 + py * 78.233) * 43758.5453) % 1
      const g = 1 + (grain - 0.5) * 0.06
      const k = (py * c.width + px) * 4
      img.data[k] = Math.max(0, Math.min(255, col[0] * shade * g))
      img.data[k + 1] = Math.max(0, Math.min(255, col[1] * shade * g))
      img.data[k + 2] = Math.max(0, Math.min(255, col[2] * shade * g))
      img.data[k + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)

  // Craters.
  for (const cr of m.craters) {
    const x = cr.x * PX
    const y = cr.y * PX
    const r = cr.r * PX
    const g = ctx.createRadialGradient(x - r * 0.25, y - r * 0.25, r * 0.1, x, y, r)
    g.addColorStop(0, 'rgba(70,25,10,0.28)')
    g.addColorStop(0.75, 'rgba(70,25,10,0.12)')
    g.addColorStop(0.92, 'rgba(255,200,150,0.22)')
    g.addColorStop(1, 'rgba(255,200,150,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  // Steep slopes: subtle hatching (the orbital slope map).
  ctx.save()
  ctx.strokeStyle = 'rgba(60,10,10,0.38)'
  ctx.lineWidth = 1.4
  for (let y = 0; y < m.H; y++)
    for (let x = 0; x < m.W; x++) {
      if (!m.steep[idx(m, x, y)]) continue
      ctx.save()
      ctx.beginPath()
      ctx.rect(x * PX, y * PX, PX, PX)
      ctx.clip()
      for (let k = -PX; k < PX * 2; k += 5) {
        ctx.beginPath()
        ctx.moveTo(x * PX + k, y * PX)
        ctx.lineTo(x * PX + k - PX, y * PX + PX)
        ctx.stroke()
      }
      ctx.restore()
    }
  ctx.restore()

  // Mapped rocks (big enough for the orbiter's camera).
  const rnd = mulberry32(m.seed + 999)
  for (let y = 0; y < m.H; y++)
    for (let x = 0; x < m.W; x++) if (m.rock[idx(m, x, y)]) drawRock(ctx, (x + 0.5) * PX, (y + 0.5) * PX, PX * 0.42, rnd)
  return c
}

export function drawRock(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rnd: () => number, tint = false) {
  const n = 7
  const pts: [number, number][] = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd() * 0.4
    const rr = r * (0.7 + rnd() * 0.35)
    pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.85])
  }
  ctx.fillStyle = 'rgba(30,10,5,0.4)'
  ctx.beginPath()
  pts.forEach(([px, py], i) => (i ? ctx.lineTo(px + r * 0.25, py + r * 0.3) : ctx.moveTo(px + r * 0.25, py + r * 0.3)))
  ctx.closePath()
  ctx.fill()
  const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r)
  g.addColorStop(0, tint ? '#b8a294' : '#a08070')
  g.addColorStop(1, tint ? '#4a3a34' : '#3c2a22')
  ctx.fillStyle = g
  ctx.beginPath()
  pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)))
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,230,210,0.25)'
  ctx.lineWidth = 1
  ctx.stroke()
}

// ── particles ──────────────────────────────────────────────────────────────

interface P {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  size: number
  color: string
  ring?: boolean
}

export class Fx {
  parts: P[] = []
  flash = 0
  constructor(public reduced: boolean) {}
  dust(x: number, y: number) {
    if (this.reduced || this.parts.length > 260) return
    for (let i = 0; i < 2; i++)
      this.parts.push({ x: x + (Math.random() - 0.5) * 8, y: y + (Math.random() - 0.5) * 8, vx: (Math.random() - 0.5) * 18, vy: (Math.random() - 0.5) * 18 - 4, life: 0, max: 0.9 + Math.random() * 0.6, size: 2 + Math.random() * 3, color: '210,140,90' })
  }
  burst(x: number, y: number, color: string, n = 22) {
    this.parts.push({ x, y, vx: 0, vy: 0, life: 0, max: 0.9, size: 6, color, ring: true })
    if (this.reduced) return
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2
      const s = 40 + Math.random() * 90
      this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: 0.6 + Math.random() * 0.6, size: 1.5 + Math.random() * 2.5, color })
    }
  }
  alarm() {
    this.flash = 1
  }
  update(dt: number) {
    for (const p of this.parts) {
      p.life += dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vx *= 0.96
      p.vy *= 0.96
    }
    this.parts = this.parts.filter((p) => p.life < p.max)
    this.flash = Math.max(0, this.flash - dt * 1.6)
  }
  draw(ctx: CanvasRenderingContext2D) {
    for (const p of this.parts) {
      const a = 1 - p.life / p.max
      if (p.ring) {
        ctx.strokeStyle = `rgba(${p.color},${a})`
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size + (p.life / p.max) * 40, 0, Math.PI * 2)
        ctx.stroke()
      } else {
        ctx.fillStyle = `rgba(${p.color},${a * 0.8})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }
}

// ── the rover ─────────────────────────────────────────────────────────────

export function drawRover(ctx: CanvasRenderingContext2D, x: number, y: number, heading: number, cs: number, solar: boolean, ghost = false, t = 0, driving = false) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate((heading * Math.PI) / 4)
  const s = cs / 26
  ctx.scale(s, s)
  ctx.globalAlpha = ghost ? 0.55 : 1
  // shadow
  ctx.fillStyle = 'rgba(20,5,0,0.35)'
  ctx.beginPath()
  ctx.ellipse(3, 4, 13, 15, 0, 0, Math.PI * 2)
  ctx.fill()
  if (solar) {
    ctx.fillStyle = '#1e3a8a'
    ctx.strokeStyle = '#93c5fd'
    ctx.lineWidth = 0.8
    for (const sx of [-1, 1]) {
      ctx.beginPath()
      ctx.rect(sx > 0 ? 7 : -21, -8, 14, 18)
      ctx.fill()
      ctx.stroke()
      for (let k = 1; k < 3; k++) {
        ctx.beginPath()
        ctx.moveTo((sx > 0 ? 7 : -21) + k * 4.7, -8)
        ctx.lineTo((sx > 0 ? 7 : -21) + k * 4.7, 10)
        ctx.stroke()
      }
    }
  }
  // wheels (rocker-bogie: three per side)
  const spin = driving ? Math.sin(t * 20) * 1.2 : 0
  ctx.fillStyle = '#1f2937'
  for (const sx of [-1, 1])
    for (const wy of [-9, 0, 9]) {
      ctx.beginPath()
      ctx.roundRect(sx * 10 - 3, wy - 3.5 + spin * 0.3, 6, 7, 1.5)
      ctx.fill()
    }
  ctx.strokeStyle = '#9ca3af'
  ctx.lineWidth = 1.2
  for (const sx of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(sx * 10, -9)
    ctx.lineTo(sx * 7, -2)
    ctx.lineTo(sx * 10, 9)
    ctx.stroke()
  }
  // body
  const g = ctx.createLinearGradient(-7, -10, 7, 10)
  g.addColorStop(0, ghost ? '#e5e7eb' : '#f8fafc')
  g.addColorStop(1, '#cbd5e1')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.roundRect(-7, -10, 14, 20, 3)
  ctx.fill()
  ctx.fillStyle = '#d4a017'
  ctx.fillRect(-5, -2, 10, 7)
  if (!solar) {
    // power source at the back (Perseverance-style)
    ctx.fillStyle = '#6b7280'
    ctx.fillRect(-4, 10, 8, 5)
    ctx.fillStyle = '#9ca3af'
    for (let k = -3; k <= 3; k += 2) ctx.fillRect(k - 0.5, 9, 1, 7)
  }
  // mast + camera head (front)
  ctx.fillStyle = '#334155'
  ctx.beginPath()
  ctx.arc(0, -7, 3.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#38bdf8'
  ctx.beginPath()
  ctx.arc(-1.2, -8.4, 1, 0, Math.PI * 2)
  ctx.arc(1.2, -8.4, 1, 0, Math.PI * 2)
  ctx.fill()
  // arm
  ctx.strokeStyle = '#94a3b8'
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.moveTo(5, -9)
  ctx.lineTo(6, -14)
  ctx.lineTo(2, -15)
  ctx.stroke()
  ctx.restore()
}

// ── the whole frame ───────────────────────────────────────────────────────

export interface DrawOpts {
  preview: Preview | null
  reveal: boolean
  time: number
  frac: number
  reduced: boolean
  selectedTarget: number | null
}

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, bg: string, fg = '#0b1220') {
  ctx.font = '700 11px Inter, system-ui, sans-serif'
  const w = ctx.measureText(text).width + 10
  ctx.fillStyle = bg
  ctx.beginPath()
  ctx.roundRect(x - w / 2, y - 9, w, 18, 9)
  ctx.fill()
  ctx.fillStyle = fg
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x, y + 0.5)
}

export function drawFrame(ctx: CanvasRenderingContext2D, v: View, sim: Sim, terrain: HTMLCanvasElement, fx: Fx, o: DrawOpts) {
  const m = sim.map
  ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0)
  ctx.fillStyle = '#0a1120'
  ctx.fillRect(0, 0, v.w, v.h)

  // Map.
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(terrain, v.ox, v.oy, v.cs * m.W, v.cs * m.H)

  // Grid (helps planning in squares).
  ctx.strokeStyle = 'rgba(20,6,0,0.16)'
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let x = 0; x <= m.W; x++) {
    ctx.moveTo(v.ox + x * v.cs + 0.5, v.oy)
    ctx.lineTo(v.ox + x * v.cs + 0.5, v.oy + m.H * v.cs)
  }
  for (let y = 0; y <= m.H; y++) {
    ctx.moveTo(v.ox, v.oy + y * v.cs + 0.5)
    ctx.lineTo(v.ox + m.W * v.cs, v.oy + y * v.cs + 0.5)
  }
  ctx.stroke()

  // Day/night tint (Legend).
  if (sim.tier.legend) {
    const sun = solarW(clockAt(sim, sim.t)) / 110
    const a = Math.max(0, 0.42 - sun * 0.5)
    if (a > 0.01) {
      ctx.fillStyle = `rgba(10,17,40,${a})`
      ctx.fillRect(v.ox, v.oy, v.cs * m.W, v.cs * m.H)
    }
  }

  // Rocks found in pictures (and, after the round, every hidden rock).
  for (let i = 0; i < m.W * m.H; i++) {
    if (!m.hidden[i]) continue
    const known = sim.knownRocks.has(i)
    if (!known && !o.reveal) continue
    const x = i % m.W
    const y = Math.floor(i / m.W)
    ctx.save()
    ctx.globalAlpha = known ? 1 : 0.75
    drawRock(ctx, cx(v, x), cy(v, y), v.cs * 0.3, mulberry32(m.seed + i), true)
    ctx.restore()
    ctx.strokeStyle = known ? 'rgba(0,229,255,0.9)' : 'rgba(255,255,255,0.7)'
    ctx.setLineDash([3, 3])
    ctx.lineWidth = 1.5
    ctx.strokeRect(v.ox + x * v.cs + 2, v.oy + y * v.cs + 2, v.cs - 4, v.cs - 4)
    ctx.setLineDash([])
  }

  // Bonus rocks (AEGIS) once found, or revealed at the end.
  for (const b of m.bonus) {
    const found = sim.aegisAtEarth.has(b.id)
    if (!found && !o.reveal) continue
    const x = cx(v, b.x)
    const y = cy(v, b.y)
    ctx.fillStyle = found ? '#a7f3d0' : 'rgba(167,243,208,0.5)'
    ctx.beginPath()
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2
      const r = k % 2 ? v.cs * 0.12 : v.cs * 0.28
      ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r)
    }
    ctx.closePath()
    ctx.fill()
  }

  // Science targets.
  const pulse = o.reduced ? 0.5 : 0.5 + 0.5 * Math.sin(o.time * 3)
  for (const t of m.targets) {
    const x = cx(v, t.x)
    const y = cy(v, t.y)
    const got = sim.scienceAtEarth.has(t.id)
    ctx.strokeStyle = t.color
    ctx.lineWidth = o.selectedTarget === t.id ? 4 : 2.5
    ctx.beginPath()
    ctx.arc(x, y, v.cs * (0.36 + pulse * 0.08), 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = got ? t.color : `${t.color}55`
    ctx.beginPath()
    ctx.arc(x, y, v.cs * 0.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#0b1220'
    ctx.font = `900 ${Math.round(v.cs * 0.28)}px Inter, system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(got ? '✓' : String(t.id + 1), x, y + 1)
  }

  // Landing site.
  {
    const x = cx(v, m.start.x)
    const y = cy(v, m.start.y)
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'
    ctx.lineWidth = 1.5
    ctx.setLineDash([2, 3])
    ctx.beginPath()
    ctx.arc(x, y, v.cs * 0.48, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
  }

  // What Earth has seen: telemetry track (believed positions).
  const es = earthSnap(sim, o.frac)
  const knownTo = Math.max(0, Math.floor((sim.t - sim.tier.delay) / 0.25))
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'
  ctx.lineWidth = 2
  ctx.setLineDash([1, 5])
  ctx.lineCap = 'round'
  ctx.beginPath()
  for (let i = 0; i <= Math.min(knownTo, sim.snaps.length - 1); i += 2) {
    const s = sim.snaps[i]
    if (i === 0) ctx.moveTo(cx(v, s.ex), cy(v, s.ey))
    else ctx.lineTo(cx(v, s.ex), cy(v, s.ey))
  }
  ctx.lineTo(cx(v, es.ex), cy(v, es.ey))
  ctx.stroke()
  ctx.setLineDash([])

  // Plan preview.
  if (o.preview && o.preview.cells.length > 1) {
    const pc = o.preview.cells
    ctx.strokeStyle = '#ffa878'
    ctx.lineWidth = 3
    ctx.setLineDash([7, 6])
    ctx.lineDashOffset = o.reduced ? 0 : -o.time * 18
    ctx.beginPath()
    pc.forEach((c, i) => (i ? ctx.lineTo(cx(v, c.x), cy(v, c.y)) : ctx.moveTo(cx(v, c.x), cy(v, c.y))))
    ctx.stroke()
    ctx.setLineDash([])
    ctx.lineDashOffset = 0
    for (const c of pc) {
      if (!c.bad) continue
      const x = cx(v, c.x)
      const y = cy(v, c.y)
      ctx.strokeStyle = '#ef4444'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo(x - v.cs * 0.25, y - v.cs * 0.25)
      ctx.lineTo(x + v.cs * 0.25, y + v.cs * 0.25)
      ctx.moveTo(x + v.cs * 0.25, y - v.cs * 0.25)
      ctx.lineTo(x - v.cs * 0.25, y + v.cs * 0.25)
      ctx.stroke()
    }
    const e = o.preview.end
    const ex = cx(v, e.x)
    const ey = cy(v, e.y)
    ctx.fillStyle = 'rgba(255,168,120,0.85)'
    ctx.save()
    ctx.translate(ex, ey)
    ctx.rotate((e.h * Math.PI) / 4)
    ctx.beginPath()
    ctx.moveTo(0, -v.cs * 0.42)
    ctx.lineTo(v.cs * 0.2, -v.cs * 0.12)
    ctx.lineTo(-v.cs * 0.2, -v.cs * 0.12)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  // Newest picture: where the rover REALLY was when it was taken.
  const ph = sim.earthPhoto
  if (ph && (ph.x !== ph.ex || ph.y !== ph.ey)) {
    ctx.strokeStyle = '#00e5ff'
    ctx.lineWidth = 2
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(cx(v, ph.ex), cy(v, ph.ey))
    ctx.lineTo(cx(v, ph.x), cy(v, ph.y))
    ctx.stroke()
    ctx.setLineDash([])
    drawRover(ctx, cx(v, ph.x), cy(v, ph.y), ph.h, v.cs, sim.tier.legend, true)
    label(ctx, `📷 real spot ${fmtClock(clockAt(sim, ph.t))}`, cx(v, ph.x), cy(v, ph.y) + v.cs * 0.75, '#00e5ff')
  }

  // The truth, after the round: where the rover really went.
  if (o.reveal) {
    ctx.strokeStyle = 'rgba(34,197,94,0.95)'
    ctx.lineWidth = 3
    ctx.beginPath()
    sim.trail.forEach((c, i) => (i ? ctx.lineTo(cx(v, c.x), cy(v, c.y)) : ctx.moveTo(cx(v, c.x), cy(v, c.y))))
    ctx.stroke()
    const r = sim.rover
    drawRover(ctx, cx(v, r.x), cy(v, r.y), r.h, v.cs, sim.tier.legend)
    label(ctx, 'really here', cx(v, r.x), cy(v, r.y) - v.cs * 0.75, '#22c55e')
  }

  // The rover as Earth last saw it (believed position, `delay` minutes old).
  if (!o.reveal || es.ex !== sim.rover.x || es.ey !== sim.rover.y) {
    const rx = cx(v, es.ex)
    const ry = cy(v, es.ey)
    const driving = es.status === 'driving'
    if (driving && !o.reveal) fx.dust(rx - DIRS[Math.round(es.h + 8) % 8][0] * v.cs * 0.3, ry - DIRS[Math.round(es.h + 8) % 8][1] * v.cs * 0.3)
    drawRover(ctx, rx, ry, es.h, v.cs, sim.tier.legend, o.reveal, o.time, driving)
    if (!o.reveal && sim.t > 0) label(ctx, `seen ${Math.round(sim.tier.delay)} min ago`, rx, ry - v.cs * 0.78, 'rgba(255,255,255,0.92)')
    if (es.status === 'fault' || es.status === 'stuck' || es.status === 'dead') {
      ctx.strokeStyle = '#ef4444'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(rx, ry, v.cs * 0.62, 0, Math.PI * 2)
      ctx.stroke()
    }
  }

  fx.draw(ctx)

  if (fx.flash > 0) {
    ctx.fillStyle = `rgba(239,68,68,${fx.flash * 0.25})`
    ctx.fillRect(v.ox, v.oy, v.cs * m.W, v.cs * m.H)
  }

  // Scale bar.
  {
    const x0 = v.ox + 8
    const y0 = v.oy + m.H * v.cs - 10
    ctx.fillStyle = 'rgba(10,17,32,0.7)'
    ctx.fillRect(x0 - 4, y0 - 14, v.cs * 2 + 52, 20)
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x0 + v.cs * 2, y0)
    ctx.moveTo(x0, y0 - 4)
    ctx.lineTo(x0, y0)
    ctx.moveTo(x0 + v.cs * 2, y0 - 4)
    ctx.lineTo(x0 + v.cs * 2, y0)
    ctx.stroke()
    ctx.fillStyle = '#fff'
    ctx.font = '700 10px Inter, system-ui, sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${CELL_M * 2} m`, x0 + v.cs * 2 + 6, y0 - 3)
  }

  drawBand(ctx, v, sim, o)
}

function drawBand(ctx: CanvasRenderingContext2D, v: View, sim: Sim, o: DrawOpts) {
  const b = v.band
  ctx.fillStyle = '#060b16'
  ctx.fillRect(0, 0, v.w, b)
  const ex = 30
  const mx = v.w - 30
  const y = b / 2 + 2
  // stars
  const r = mulberry32(7)
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  for (let i = 0; i < 40; i++) ctx.fillRect(r() * v.w, r() * b, 1, 1)
  // link line
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'
  ctx.setLineDash([2, 6])
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(ex + 16, y)
  ctx.lineTo(mx - 14, y)
  ctx.stroke()
  ctx.setLineDash([])
  // Earth
  const eg = ctx.createRadialGradient(ex - 4, y - 4, 2, ex, y, 15)
  eg.addColorStop(0, '#7dd3fc')
  eg.addColorStop(0.6, '#2563eb')
  eg.addColorStop(1, '#1e3a8a')
  ctx.fillStyle = eg
  ctx.beginPath()
  ctx.arc(ex, y, 14, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#22c55e'
  ctx.beginPath()
  ctx.ellipse(ex - 3, y - 2, 5, 3.5, 0.6, 0, Math.PI * 2)
  ctx.ellipse(ex + 5, y + 5, 3, 2, 0.2, 0, Math.PI * 2)
  ctx.fill()
  // Mars
  const mg = ctx.createRadialGradient(mx - 3, y - 3, 2, mx, y, 12)
  mg.addColorStop(0, '#fdba74')
  mg.addColorStop(0.6, '#c2410c')
  mg.addColorStop(1, '#7c2d12')
  ctx.fillStyle = mg
  ctx.beginPath()
  ctx.arc(mx, y, 12, 0, Math.PI * 2)
  ctx.fill()

  ctx.font = '800 10px Inter, system-ui, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText(`Radio at light speed: ${sim.tier.delay} min each way`, v.w / 2, 4)

  // pulses
  const d = sim.tier.delay
  for (const s of sim.signals) {
    const tt = sim.t + o.frac * 0.25
    if (tt < s.sentAt || tt > s.arriveAt) continue
    const f = (tt - s.sentAt) / d
    const px = s.dir === 'up' ? ex + 16 + (mx - ex - 30) * f : mx - 14 - (mx - ex - 30) * f
    const col = s.dir === 'up' ? '255,138,76' : '0,229,255'
    const g = ctx.createRadialGradient(px, y, 0, px, y, 12)
    g.addColorStop(0, `rgba(${col},1)`)
    g.addColorStop(1, `rgba(${col},0)`)
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(px, y, 12, 0, Math.PI * 2)
    ctx.fill()
    if (!o.reduced) {
      ctx.strokeStyle = `rgba(${col},0.5)`
      ctx.lineWidth = 1.5
      for (let k = 1; k <= 2; k++) {
        ctx.beginPath()
        const rr = 6 + k * 5 + ((o.time * 14) % 5)
        ctx.arc(px, y, rr, s.dir === 'up' ? -0.6 : Math.PI - 0.6, s.dir === 'up' ? 0.6 : Math.PI + 0.6)
        ctx.stroke()
      }
    }
    ctx.fillStyle = '#fff'
    ctx.font = '700 9px Inter, system-ui, sans-serif'
    ctx.textBaseline = 'top'
    ctx.fillText(s.dir === 'up' ? 'commands' : s.kind === 'image' ? 'picture' : s.kind === 'relay' ? 'data' : 'news', px, y + 12)
  }
}

export function snapToPixel(v: View, s: Snap): { x: number; y: number } {
  return { x: cx(v, s.ex), y: cy(v, s.ey) }
}

export function cellToPixel(v: View, x: number, y: number): { x: number; y: number } {
  return { x: cx(v, x), y: cy(v, y) }
}
