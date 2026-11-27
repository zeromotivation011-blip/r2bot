// components/kids/games/drone-hover/render.ts
// Canvas drawing for Sky Port: the dusk sky, the city, the wind you can see,
// the drone with spinning rotors and downwash, the parcel, targets and
// waypoints. Original art, drawn from primitives. No React in here.

import { mulberry32, type SimState, type Mission } from './sim'

export interface View {
  w: number
  h: number
  dpr: number
  /** Pixels per metre. */
  scale: number
  ox: number
  oy: number
}

export function makeView(w: number, h: number, dpr: number, m: Mission): View {
  const groundPx = 34
  const scale = Math.min(w / m.worldW, (h - groundPx - 8) / m.worldH)
  const ox = (w - m.worldW * scale) / 2
  const oy = h - groundPx
  return { w, h, dpr, scale, ox, oy }
}

const px = (v: View, x: number) => v.ox + x * v.scale
const pz = (v: View, z: number) => v.oy - z * v.scale

/** x position (m) the drone is drawn at — the 1-D tiers fly at the centre. */
export function droneX(s: SimState): number {
  return s.mission.twoD ? s.x : s.mission.worldW / 2
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  size: number
  color: string
  kind: 'wash' | 'wind' | 'spark' | 'dust'
}

interface FallingBox {
  x: number
  y: number
  vy: number
  rot: number
  landed: boolean
}

interface Building {
  x: number
  w: number
  h: number
  windows: { x: number; y: number; on: boolean }[]
}

export class Fx {
  particles: Particle[] = []
  shake = 0
  flash = 0
  propPhase = 0
  clouds: { x: number; y: number; r: number; s: number }[] = []
  stars: { x: number; y: number; r: number; p: number }[] = []
  buildings: Building[] = []
  box: FallingBox | null = null
  reduced: boolean
  private rng = mulberry32(77)
  private sizedFor = ''

  constructor(reduced: boolean) {
    this.reduced = reduced
  }

  layout(v: View): void {
    const key = `${Math.round(v.w)}x${Math.round(v.h)}`
    if (key === this.sizedFor) return
    this.sizedFor = key
    const r = mulberry32(9)
    this.stars = Array.from({ length: 60 }, () => ({ x: r() * v.w, y: r() * v.h * 0.55, r: 0.4 + r() * 1.2, p: r() * 6 }))
    this.clouds = Array.from({ length: 6 }, () => ({ x: r() * v.w, y: 20 + r() * v.h * 0.5, r: 18 + r() * 34, s: 0.4 + r() * 0.8 }))
    this.buildings = []
    let x = -10
    while (x < v.w + 10) {
      const w = 22 + r() * 46
      const h = 40 + r() * v.h * 0.33
      const windows: Building['windows'] = []
      for (let wy = 8; wy < h - 6; wy += 11) for (let wx = 5; wx < w - 6; wx += 9) windows.push({ x: wx, y: wy, on: r() < 0.35 })
      this.buildings.push({ x, w, h, windows })
      x += w + 2 + r() * 8
    }
  }

  emit(p: Particle): void {
    if (this.particles.length > (this.reduced ? 80 : 420)) return
    this.particles.push(p)
  }

  burst(x: number, y: number, n: number, color: string): void {
    for (let i = 0; i < n; i++) {
      const a = this.rng() * Math.PI * 2
      const sp = 60 + this.rng() * 220
      this.emit({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80, life: 0, max: 0.6 + this.rng() * 0.6, size: 1.5 + this.rng() * 2.5, color, kind: 'spark' })
    }
  }

  update(dt: number, s: SimState, v: View): void {
    const rng = this.rng
    this.propPhase += dt * (8 + (s.tL + s.tR) * 2)
    this.shake = Math.max(0, this.shake - dt * 30)
    this.flash = Math.max(0, this.flash - dt * 2)

    // Clouds drift with the wind (and slowly anyway).
    for (const c of this.clouds) {
      c.x += (6 + s.windX * 10) * c.s * dt
      if (c.x > v.w + 80) c.x = -80
      if (c.x < -80) c.x = v.w + 80
    }

    const dx = droneX(s)
    const cx = px(v, dx)
    const cy = pz(v, s.z)
    const thrust = s.tL + s.tR
    const k = this.reduced ? 0.25 : 1

    // Downwash: air pushed down by the rotors, faster with more thrust.
    if (thrust > 1) {
      const n = Math.min(6, thrust / 4) * k
      const arm = Math.max(18, 0.42 * v.scale)
      for (let i = 0; i < n; i++) {
        if (rng() > 0.7) continue
        const side = rng() < 0.5 ? -1 : 1
        const ax = side * arm * Math.cos(s.th)
        const ay = side * arm * Math.sin(s.th)
        const sp = 90 + Math.sqrt(thrust) * 30
        this.emit({
          x: cx + ax + (rng() - 0.5) * 10,
          y: cy + ay + 4,
          vx: -Math.sin(s.th) * sp + (rng() - 0.5) * 30 + s.windX * 12,
          vy: Math.cos(s.th) * sp,
          life: 0,
          max: 0.35 + rng() * 0.25,
          size: 1 + rng() * 1.8,
          color: 'rgba(186,230,253,',
          kind: 'wash',
        })
      }
      // Ground effect: dust kicked out sideways near the pad.
      if (s.z < 1.2 && rng() < 0.6 * k) {
        const dir = rng() < 0.5 ? -1 : 1
        this.emit({ x: cx + dir * 10, y: v.oy - 2, vx: dir * (80 + rng() * 90), vy: -10 - rng() * 30, life: 0, max: 0.7, size: 2 + rng() * 2, color: 'rgba(253,230,138,', kind: 'dust' })
      }
    }

    // Wind you can see: streaks that move with the air.
    const wind = Math.hypot(s.windX, s.windZ)
    const rate = (0.6 + wind * 0.9) * k
    for (let i = 0; i < rate; i++) {
      if (rng() > 0.55) continue
      const vx = s.windX * v.scale * 0.9
      const vy = -s.windZ * v.scale * 0.9
      let x = rng() * v.w
      let y = rng() * v.oy
      if (Math.abs(vx) > Math.abs(vy) && Math.abs(vx) > 5) x = vx > 0 ? -20 : v.w + 20
      else if (Math.abs(vy) > 5) y = vy > 0 ? -10 : v.oy
      this.emit({ x, y, vx, vy, life: 0, max: 1.4 + rng(), size: 10 + wind * 6, color: 'rgba(255,255,255,', kind: 'wind' })
    }

    for (const p of this.particles) {
      p.life += dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      if (p.kind === 'spark') p.vy += 400 * dt
      if (p.kind === 'wash' && p.y > v.oy) {
        p.y = v.oy
        p.vy = 0
        p.vx = (p.vx >= 0 ? 1 : -1) * 120
      }
    }
    this.particles = this.particles.filter((p) => p.life < p.max)

    if (this.box && !this.box.landed) {
      this.box.vy += 9.81 * v.scale * dt
      this.box.y += this.box.vy * dt
      this.box.rot += dt * 2
      if (this.box.y >= v.oy - 8) {
        this.box.y = v.oy - 8
        this.box.landed = true
        for (let i = 0; i < 12 * k; i++) {
          const dir = rng() < 0.5 ? -1 : 1
          this.emit({ x: this.box.x, y: v.oy - 2, vx: dir * (40 + rng() * 80), vy: -20 - rng() * 40, life: 0, max: 0.6, size: 2 + rng() * 2, color: 'rgba(253,230,138,', kind: 'dust' })
        }
      }
    }
  }
}

// ── drawing ──────────────────────────────────────────────────────────────────

function drawSky(ctx: CanvasRenderingContext2D, v: View, fx: Fx, time: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, v.h)
  // Brand dusk (docs/kids-design.md): R2BOT navy overhead, slate-blue, a rust
  // glow and an orange horizon. No purple: the green band must read over it.
  g.addColorStop(0, '#0A1120')
  g.addColorStop(0.45, '#19263F')
  g.addColorStop(0.8, '#5a2f24')
  g.addColorStop(1, '#f97316')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, v.w, v.h)
  for (const s of fx.stars) {
    const tw = fx.reduced ? 0.7 : 0.45 + 0.4 * Math.sin(time * 1.6 + s.p)
    ctx.fillStyle = `rgba(255,255,255,${tw})`
    ctx.beginPath()
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
    ctx.fill()
  }
  // A ringed planet on the horizon — this is the R2BOT Universe after all.
  const prx = v.w * 0.86
  const pry = v.h * 0.3
  const pr = Math.min(v.w, v.h) * 0.05
  const pg = ctx.createRadialGradient(prx - pr * 0.4, pry - pr * 0.4, pr * 0.1, prx, pry, pr)
  pg.addColorStop(0, '#fde68a')
  pg.addColorStop(1, '#c2410c')
  ctx.fillStyle = pg
  ctx.beginPath()
  ctx.arc(prx, pry, pr, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(253,230,138,0.55)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.ellipse(prx, pry, pr * 1.8, pr * 0.45, -0.3, 0, Math.PI * 2)
  ctx.stroke()

  for (const c of fx.clouds) {
    ctx.fillStyle = 'rgba(148,163,184,0.10)'
    ctx.beginPath()
    ctx.ellipse(c.x, c.y, c.r * 1.8, c.r * 0.55, 0, 0, Math.PI * 2)
    ctx.ellipse(c.x + c.r * 0.8, c.y - c.r * 0.25, c.r, c.r * 0.5, 0, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawCity(ctx: CanvasRenderingContext2D, v: View, fx: Fx): void {
  for (const b of fx.buildings) {
    const top = v.oy - b.h
    ctx.fillStyle = '#111C32'
    ctx.fillRect(b.x, top, b.w, b.h)
    ctx.fillStyle = 'rgba(251,191,36,0.55)'
    for (const w of b.windows) if (w.on) ctx.fillRect(b.x + w.x, top + w.y, 4, 5)
  }
  // ground deck
  const g = ctx.createLinearGradient(0, v.oy, 0, v.h)
  g.addColorStop(0, '#334155')
  g.addColorStop(1, '#0f172a')
  ctx.fillStyle = g
  ctx.fillRect(0, v.oy, v.w, v.h - v.oy)
  ctx.fillStyle = 'rgba(245,158,11,0.8)'
  for (let x = 6; x < v.w; x += 28) ctx.fillRect(x, v.oy + 3, 14, 2)
}

function drawPad(ctx: CanvasRenderingContext2D, v: View, x: number, time: number, reduced: boolean): void {
  const cx = px(v, x)
  const w = Math.max(60, 1.4 * v.scale)
  ctx.fillStyle = '#475569'
  ctx.fillRect(cx - w / 2, v.oy - 5, w, 6)
  ctx.fillStyle = '#f59e0b'
  ctx.font = 'bold 11px ui-sans-serif, system-ui'
  ctx.textAlign = 'center'
  ctx.fillText('SKY PORT', cx, v.oy + 20)
  const blink = reduced || Math.sin(time * 4) > 0
  ctx.fillStyle = blink ? '#34d399' : '#065f46'
  ctx.beginPath()
  ctx.arc(cx - w / 2 + 4, v.oy - 7, 3, 0, Math.PI * 2)
  ctx.arc(cx + w / 2 - 4, v.oy - 7, 3, 0, Math.PI * 2)
  ctx.fill()
}

function drawRuler(ctx: CanvasRenderingContext2D, v: View, m: Mission): void {
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.lineWidth = 1
  ctx.font = '10px ui-monospace, monospace'
  ctx.textAlign = 'left'
  for (let z = 1; z <= Math.floor(m.worldH); z++) {
    const y = pz(v, z)
    ctx.beginPath()
    ctx.moveTo(4, y)
    ctx.lineTo(14, y)
    ctx.stroke()
    ctx.fillText(`${z} m`, 17, y + 3)
  }
}

function drawTargetBand(ctx: CanvasRenderingContext2D, v: View, s: SimState, time: number): void {
  const m = s.mission
  const top = pz(v, s.target.z + m.band)
  const bot = pz(v, s.target.z - m.band)
  // A solid, clearly bounded band: "hover in the green band" must be visible over the dusk sky.
  const g = ctx.createLinearGradient(0, top, 0, bot)
  const a = s.inBand ? 0.42 : 0.3
  g.addColorStop(0, `rgba(52,211,153,${a * 0.7})`)
  g.addColorStop(0.5, `rgba(52,211,153,${a})`)
  g.addColorStop(1, `rgba(52,211,153,${a * 0.7})`)
  ctx.fillStyle = g
  ctx.fillRect(0, top, v.w, bot - top)
  ctx.strokeStyle = s.inBand ? 'rgba(167,243,208,0.95)' : 'rgba(110,231,183,0.7)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(0, top)
  ctx.lineTo(v.w, top)
  ctx.moveTo(0, bot)
  ctx.lineTo(v.w, bot)
  ctx.stroke()
  const y = pz(v, s.target.z)
  ctx.save()
  ctx.setLineDash([10, 8])
  ctx.lineDashOffset = -time * 20
  ctx.strokeStyle = s.inBand ? '#6ee7b7' : '#fbbf24'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, y)
  ctx.lineTo(v.w, y)
  ctx.stroke()
  ctx.restore()
  ctx.fillStyle = s.inBand ? '#6ee7b7' : '#fbbf24'
  ctx.font = 'bold 12px ui-sans-serif, system-ui'
  ctx.textAlign = 'left'
  ctx.fillText(`TARGET ${s.target.z.toFixed(1)} m`, 52, y - 6)
}

function drawWaypoints(ctx: CanvasRenderingContext2D, v: View, s: SimState, time: number): void {
  const m = s.mission
  // course line
  ctx.save()
  ctx.setLineDash([4, 6])
  ctx.strokeStyle = 'rgba(253,230,138,0.35)'
  ctx.lineWidth = 2
  ctx.beginPath()
  m.waypoints.forEach((w, i) => {
    if (i === 0) ctx.moveTo(px(v, w.x), pz(v, w.z))
    else ctx.lineTo(px(v, w.x), pz(v, w.z))
  })
  ctx.stroke()
  ctx.restore()
  m.waypoints.forEach((w, i) => {
    const x = px(v, w.x)
    const y = pz(v, w.z)
    const r = Math.max(10, m.wpRadius * v.scale)
    const done = i < s.wpIndex
    const active = i === s.wpIndex
    ctx.lineWidth = active ? 3 : 2
    ctx.strokeStyle = done ? 'rgba(52,211,153,0.6)' : active ? '#fbbf24' : 'rgba(255,255,255,0.35)'
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.stroke()
    if (active) {
      const pulse = 1 + 0.15 * Math.sin(time * 5)
      ctx.strokeStyle = 'rgba(251,191,36,0.35)'
      ctx.beginPath()
      ctx.arc(x, y, r * 1.5 * pulse, 0, Math.PI * 2)
      ctx.stroke()
      // hold progress ring
      if (s.hold > 0) {
        ctx.strokeStyle = '#34d399'
        ctx.lineWidth = 4
        ctx.beginPath()
        ctx.arc(x, y, r + 5, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * s.hold) / m.wpHold)
        ctx.stroke()
      }
    }
    ctx.fillStyle = done ? '#6ee7b7' : '#fff'
    ctx.font = 'bold 11px ui-sans-serif, system-ui'
    ctx.textAlign = 'center'
    ctx.fillText(w.drop ? `${i + 1} 📦` : `${i + 1}`, x, y - r - 6)
  })
}

function drawBox(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rot: number): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  ctx.fillStyle = '#b45309'
  ctx.fillRect(-size / 2, -size / 2, size, size)
  ctx.strokeStyle = '#fde68a'
  ctx.lineWidth = 1.5
  ctx.strokeRect(-size / 2, -size / 2, size, size)
  ctx.beginPath()
  ctx.moveTo(-size / 2, 0)
  ctx.lineTo(size / 2, 0)
  ctx.moveTo(0, -size / 2)
  ctx.lineTo(0, size / 2)
  ctx.stroke()
  ctx.restore()
}

function drawDrone(ctx: CanvasRenderingContext2D, v: View, s: SimState, fx: Fx): void {
  const cx = px(v, droneX(s))
  const cy = pz(v, s.z) - 6
  const span = Math.max(v.w < 500 ? 44 : 60, 0.95 * v.scale)
  const k = span / 60

  // payload on a short cable, swinging a little with motion
  if (s.payload > 0) {
    const swing = Math.max(-0.5, Math.min(0.5, -s.vx * 0.08 - s.th * 0.4))
    const len = 18 * k + 8
    const bx = cx + Math.sin(swing) * len
    const by = cy + 8 * k + Math.cos(swing) * len
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(cx, cy + 6 * k)
    ctx.lineTo(bx, by - 6 * k)
    ctx.stroke()
    drawBox(ctx, bx, by, 14 * k + 4, swing)
  }

  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(s.th)

  // glow under the drone
  const thrust = s.tL + s.tR
  if (thrust > 1) {
    const gg = ctx.createRadialGradient(0, 10 * k, 2, 0, 10 * k, 40 * k)
    gg.addColorStop(0, `rgba(56,189,248,${Math.min(0.45, thrust / 50)})`)
    gg.addColorStop(1, 'rgba(56,189,248,0)')
    ctx.fillStyle = gg
    ctx.fillRect(-50 * k, -20 * k, 100 * k, 70 * k)
  }

  // arms
  ctx.strokeStyle = '#94a3b8'
  ctx.lineWidth = 4 * k
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-span / 2, -2 * k)
  ctx.lineTo(span / 2, -2 * k)
  ctx.stroke()

  // motors and props
  for (const side of [-1, 1]) {
    const mx = (side * span) / 2
    const t = side < 0 ? s.tL : s.tR
    ctx.fillStyle = '#1e293b'
    ctx.fillRect(mx - 4 * k, -9 * k, 8 * k, 9 * k)
    const blur = Math.min(1, t / 6)
    const ph = fx.reduced ? 1 : Math.abs(Math.sin(fx.propPhase + side))
    const pw = 15 * k * (0.35 + 0.65 * (blur > 0.2 ? 1 : ph))
    ctx.fillStyle = `rgba(226,232,240,${0.25 + 0.45 * blur})`
    ctx.beginPath()
    ctx.ellipse(mx, -11 * k, pw, 2.2 * k, 0, 0, Math.PI * 2)
    ctx.fill()
    if (blur < 0.2) {
      ctx.strokeStyle = '#e2e8f0'
      ctx.lineWidth = 2 * k
      ctx.beginPath()
      ctx.moveTo(mx - pw, -11 * k)
      ctx.lineTo(mx + pw, -11 * k)
      ctx.stroke()
    }
  }

  // body
  const bw = 26 * k
  const bh = 12 * k
  const bg = ctx.createLinearGradient(0, -bh, 0, bh)
  bg.addColorStop(0, '#fbbf24')
  bg.addColorStop(1, '#d97706')
  ctx.fillStyle = bg
  ctx.beginPath()
  ctx.roundRect(-bw / 2, -bh / 2 - 2 * k, bw, bh, 5 * k)
  ctx.fill()
  // visor
  ctx.fillStyle = '#0f172a'
  ctx.beginPath()
  ctx.roundRect(-bw / 2 + 4 * k, -bh / 2, bw - 8 * k, 5 * k, 2.5 * k)
  ctx.fill()
  // status LED
  const led = s.outcome === 'crash' ? '#ef4444' : s.inBand ? '#34d399' : '#38bdf8'
  ctx.fillStyle = led
  ctx.shadowColor = led
  ctx.shadowBlur = 8
  ctx.beginPath()
  ctx.arc(0, -bh / 2 + 2.5 * k, 1.8 * k, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0
  // skids
  ctx.strokeStyle = '#cbd5e1'
  ctx.lineWidth = 2 * k
  ctx.beginPath()
  ctx.moveTo(-9 * k, 4 * k)
  ctx.lineTo(-11 * k, 8 * k)
  ctx.moveTo(9 * k, 4 * k)
  ctx.lineTo(11 * k, 8 * k)
  ctx.moveTo(-15 * k, 8 * k)
  ctx.lineTo(-5 * k, 8 * k)
  ctx.moveTo(5 * k, 8 * k)
  ctx.lineTo(15 * k, 8 * k)
  ctx.stroke()
  ctx.restore()
}

function drawParticles(ctx: CanvasRenderingContext2D, fx: Fx): void {
  for (const p of fx.particles) {
    const a = 1 - p.life / p.max
    if (p.kind === 'wind') {
      const len = Math.hypot(p.vx, p.vy) || 1
      const ux = p.vx / len
      const uy = p.vy / len
      ctx.strokeStyle = `${p.color}${(a * 0.28).toFixed(3)})`
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.moveTo(p.x, p.y)
      ctx.lineTo(p.x - ux * p.size, p.y - uy * p.size)
      ctx.stroke()
    } else {
      ctx.fillStyle = p.kind === 'spark' ? p.color : `${p.color}${(a * 0.6).toFixed(3)})`
      ctx.globalAlpha = p.kind === 'spark' ? a : 1
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }
  }
}

export function drawWorld(ctx: CanvasRenderingContext2D, v: View, s: SimState, fx: Fx, time: number): void {
  ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0)
  ctx.save()
  if (fx.shake > 0 && !fx.reduced) ctx.translate((Math.random() - 0.5) * fx.shake, (Math.random() - 0.5) * fx.shake)
  drawSky(ctx, v, fx, time)
  drawCity(ctx, v, fx)
  drawRuler(ctx, v, s.mission)
  drawPad(ctx, v, s.mission.twoD ? s.mission.startX : s.mission.worldW / 2, time, fx.reduced)
  if (s.mission.twoD) drawWaypoints(ctx, v, s, time)
  else drawTargetBand(ctx, v, s, time)
  drawParticles(ctx, fx)
  if (fx.box) drawBox(ctx, fx.box.x, fx.box.y, Math.max(16, 0.25 * v.scale), fx.box.rot)
  drawDrone(ctx, v, s, fx)
  ctx.restore()
  if (fx.flash > 0) {
    ctx.fillStyle = `rgba(239,68,68,${fx.flash * 0.35})`
    ctx.fillRect(0, 0, v.w, v.h)
  }
}

export function dronePixel(v: View, s: SimState): { x: number; y: number } {
  return { x: px(v, droneX(s)), y: pz(v, s.z) }
}
