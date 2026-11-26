// components/kids/games/robot-brain/scene.ts
// The sorting depot, drawn on a 2D canvas. Parcels with hand-drawn labels ride
// the belt to Sorta (the sorter robot), get scanned, and are flung into the
// chute the robot's brain chose. Original art, no assets.
//
// Imperative and framework-free: SorterSceneClient owns the canvas and calls
// frame(dt) from requestAnimationFrame.

import { SYMBOLS, type ClassId, type Drawing } from './symbols'

export interface RunParcel {
  drawing: Drawing
  truth: ClassId
  pred: ClassId | null
  confidence: number
}

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

type ParcelPhase = 'arrive' | 'scan' | 'fly' | 'land'

const ARRIVE = 0.9
const SCAN = 0.75
const FLY = 0.6
const LAND = 0.45

export interface SceneCallbacks {
  onParcel?: (index: number, correct: boolean) => void
  onDone?: () => void
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

export function paintDrawing(ctx: CanvasRenderingContext2D, d: Drawing, x: number, y: number, size: number, color: string, width: number) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const s of d) {
    if (s.length === 1) {
      ctx.beginPath()
      ctx.arc(x + s[0][0] * size, y + s[0][1] * size, width / 2, 0, Math.PI * 2)
      ctx.fill()
      continue
    }
    ctx.beginPath()
    s.forEach(([px, py], i) => (i ? ctx.lineTo(x + px * size, y + py * size) : ctx.moveTo(x + px * size, y + py * size)))
    ctx.stroke()
  }
  ctx.restore()
}

export class SorterScene {
  private ctx: CanvasRenderingContext2D
  private w = 600
  private h = 300
  private dpr = 1
  private t = 0
  private belt = 0
  private classes: ClassId[] = []
  private counts: number[] = []
  private particles: Particle[] = []
  private reduced = false
  // Idle (training) view
  private idleDrawing: Drawing = []
  private idlePred: ClassId | null = null
  private idleConf = 0
  // Run
  private parcels: RunParcel[] = []
  private idx = -1
  private phase: ParcelPhase = 'arrive'
  private pt = 0
  private speed = 1
  private cb: SceneCallbacks = {}
  private flash: { chute: number; good: boolean; t: number } | null = null
  private shake = 0
  private mood: 'idle' | 'happy' | 'oops' = 'idle'
  private moodT = 0
  private landed: { chute: number; good: boolean; drawing: Drawing }[] = []

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx
  }

  resize(w: number, h: number, dpr: number) {
    this.w = w
    this.h = h
    this.dpr = dpr
  }

  setReducedMotion(r: boolean) {
    this.reduced = r
  }

  setClasses(c: ClassId[]) {
    this.classes = c
    this.counts = c.map(() => 0)
  }

  setIdle(d: Drawing, pred: ClassId | null, conf: number) {
    this.idleDrawing = d
    this.idlePred = pred
    this.idleConf = conf
  }

  setSpeed(s: number) {
    this.speed = s
  }

  get running(): boolean {
    return this.idx >= 0 && this.idx < this.parcels.length
  }

  startRun(parcels: RunParcel[], cb: SceneCallbacks) {
    this.parcels = parcels
    this.cb = cb
    this.idx = 0
    this.phase = 'arrive'
    this.pt = 0
    this.counts = this.classes.map(() => 0)
    this.landed = []
  }

  stopRun() {
    this.idx = -1
    this.parcels = []
    this.landed = []
    this.counts = this.classes.map(() => 0)
  }

  // ── layout ──
  /** Robot scale: the whole rig shrinks on short canvases so nothing is clipped. */
  private get rs() {
    return Math.max(0.6, Math.min(1, this.h / 300))
  }
  private get robotTop() {
    return 26 * this.rs
  }
  private get beltY() {
    return this.robotTop + 84 * this.rs + this.parcelSize + 4
  }
  private get scanX() {
    return Math.min(this.w * 0.56, this.w - 150)
  }
  private chuteX(i: number) {
    const n = this.classes.length
    const pad = this.w * 0.1
    return pad + ((this.w - pad * 2) * (i + 0.5)) / n
  }
  private get chuteY() {
    return Math.max(this.beltY + 34, this.h - Math.max(52, this.h * 0.24))
  }
  private get parcelSize() {
    return Math.max(40, Math.min(58, this.w * 0.085))
  }

  private burst(x: number, y: number, color: string, n: number) {
    if (this.reduced) return
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2
      const sp = 60 + Math.random() * 160
      this.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80, life: 0, max: 0.6 + Math.random() * 0.5, color, size: 2 + Math.random() * 3 })
    }
  }

  frame(dtRaw: number) {
    const dt = Math.min(0.05, dtRaw)
    this.t += dt
    const sp = this.reduced ? Math.max(this.speed, 3) : this.speed
    if (this.running) {
      this.belt += dt * 70 * sp
      this.pt += dt * sp
      const p = this.parcels[this.idx]
      const ci = p.pred ? this.classes.indexOf(p.pred) : -1
      if (this.phase === 'arrive' && this.pt >= ARRIVE) {
        this.phase = 'scan'
        this.pt = 0
      } else if (this.phase === 'scan' && this.pt >= SCAN) {
        this.phase = 'fly'
        this.pt = 0
      } else if (this.phase === 'fly' && this.pt >= FLY) {
        this.phase = 'land'
        this.pt = 0
        const good = p.pred === p.truth
        if (ci >= 0) this.counts[ci]++
        this.landed.push({ chute: ci, good, drawing: p.drawing })
        this.flash = { chute: ci, good, t: 0 }
        this.mood = good ? 'happy' : 'oops'
        this.moodT = 0
        if (good) this.burst(this.chuteX(Math.max(0, ci)), this.chuteY - 10, SYMBOLS[p.truth].color, 26)
        else {
          this.burst(this.chuteX(Math.max(0, ci)), this.chuteY - 10, '#ef4444', 14)
          if (!this.reduced) this.shake = 0.35
        }
        this.cb.onParcel?.(this.idx, good)
      } else if (this.phase === 'land' && this.pt >= LAND) {
        this.idx++
        this.phase = 'arrive'
        this.pt = 0
        if (this.idx >= this.parcels.length) {
          this.idx = this.parcels.length
          this.cb.onDone?.()
        }
      }
    } else {
      this.belt += dt * 12
    }
    if (this.flash) this.flash.t += dt
    this.moodT += dt
    if (this.moodT > 1.2) this.mood = 'idle'
    this.shake = Math.max(0, this.shake - dt)
    for (const q of this.particles) {
      q.life += dt
      q.x += q.vx * dt
      q.y += q.vy * dt
      q.vy += 420 * dt
    }
    this.particles = this.particles.filter((q) => q.life < q.max)
    this.draw()
  }

  // ── drawing ──
  private draw() {
    const { ctx, w, h } = this
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    if (this.shake > 0) ctx.translate(Math.sin(this.t * 70) * this.shake * 10, 0)

    // backdrop
    const bg = ctx.createLinearGradient(0, 0, 0, h)
    bg.addColorStop(0, '#111c32')
    bg.addColorStop(1, '#0a1120')
    ctx.fillStyle = bg
    ctx.fillRect(-20, 0, w + 40, h)
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'
    ctx.lineWidth = 1
    for (let x = 0; x < w; x += 28) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
      ctx.stroke()
    }
    for (let y = 0; y < h; y += 28) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }

    this.drawChutes()
    this.drawBelt()
    this.drawRobot()
    if (this.running) this.drawRunParcel()
    else this.drawIdle()

    for (const q of this.particles) {
      ctx.globalAlpha = Math.max(0, 1 - q.life / q.max)
      ctx.fillStyle = q.color
      ctx.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size)
    }
    ctx.globalAlpha = 1
  }

  private drawBelt() {
    const { ctx } = this
    const y = this.beltY
    const x1 = this.scanX + this.parcelSize * 0.8
    rr(ctx, -10, y, x1 + 10, 18, 9)
    ctx.fillStyle = '#334155'
    ctx.fill()
    ctx.save()
    ctx.clip()
    ctx.strokeStyle = 'rgba(148,163,184,0.45)'
    ctx.lineWidth = 3
    const off = this.belt % 22
    for (let x = -22 + off; x < x1; x += 22) {
      ctx.beginPath()
      ctx.moveTo(x, y + 2)
      ctx.lineTo(x - 8, y + 16)
      ctx.stroke()
    }
    ctx.restore()
    // rollers / legs
    ctx.fillStyle = '#1e293b'
    for (let x = 30; x < x1 - 10; x += 90) ctx.fillRect(x, y + 18, 6, 14)
  }

  private drawParcel(x: number, y: number, d: Drawing, rot: number, tint?: string) {
    const { ctx } = this
    const s = this.parcelSize
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(rot)
    // box
    ctx.fillStyle = '#c68642'
    rr(ctx, -s / 2, -s, s, s, 6)
    ctx.fill()
    ctx.fillStyle = '#a86b32'
    ctx.fillRect(-s / 2, -s, s, 6)
    ctx.fillStyle = '#e0a868'
    ctx.fillRect(-3, -s, 6, s)
    // label
    const L = s * 0.72
    ctx.fillStyle = '#f8fafc'
    rr(ctx, -L / 2, -s + (s - L) / 2 + 2, L, L, 4)
    ctx.fill()
    if (tint) {
      ctx.strokeStyle = tint
      ctx.lineWidth = 3
      ctx.stroke()
    }
    paintDrawing(ctx, d, -L / 2, -s + (s - L) / 2 + 2, L, '#0f172a', Math.max(1.6, L * 0.06))
    ctx.restore()
  }

  private drawRobot() {
    const { ctx } = this
    const x = this.scanX
    const rs = this.rs
    const top = this.robotTop
    const bob = this.reduced ? 0 : Math.sin(this.t * 2.2) * 2
    const scanning = this.running && this.phase === 'scan'
    const pred = this.running ? this.parcels[this.idx]?.pred : this.idlePred
    const glow = pred ? SYMBOLS[pred].color : '#94a3b8'
    // gantry the robot hangs from
    ctx.fillStyle = '#475569'
    ctx.fillRect(x + 34 * rs, top + 26 * rs, this.w - x - 34 * rs, 8 * rs)
    ctx.fillRect(this.w - 18, top + 26 * rs, 10, this.beltY - top)
    ctx.save()
    ctx.translate(x, top + bob)
    ctx.scale(rs, rs)
    // antenna
    ctx.strokeStyle = '#cbd5e1'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(0, 2)
    ctx.lineTo(0, -14)
    ctx.stroke()
    ctx.fillStyle = glow
    ctx.shadowColor = glow
    ctx.shadowBlur = 14
    ctx.beginPath()
    ctx.arc(0, -17, 6 + (scanning && !this.reduced ? Math.sin(this.t * 20) * 1.5 : 0), 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
    // head
    const hg = ctx.createLinearGradient(0, 0, 0, 60)
    hg.addColorStop(0, '#ff8a4c')
    hg.addColorStop(1, '#fc6818')
    ctx.fillStyle = hg
    rr(ctx, -40, 0, 80, 58, 18)
    ctx.fill()
    // visor
    ctx.fillStyle = '#0b1324'
    rr(ctx, -31, 12, 62, 30, 12)
    ctx.fill()
    ctx.strokeStyle = glow
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    if (this.mood === 'happy') {
      for (const ex of [-13, 13]) {
        ctx.beginPath()
        ctx.arc(ex, 30, 6, Math.PI * 1.1, Math.PI * 1.9)
        ctx.stroke()
      }
    } else if (this.mood === 'oops') {
      for (const ex of [-13, 13]) {
        ctx.beginPath()
        ctx.moveTo(ex - 5, 22)
        ctx.lineTo(ex + 5, 32)
        ctx.moveTo(ex + 5, 22)
        ctx.lineTo(ex - 5, 32)
        ctx.stroke()
      }
    } else {
      const blink = !this.reduced && this.t % 3.4 < 0.12
      ctx.fillStyle = glow
      for (const ex of [-13, 13]) {
        if (blink) ctx.fillRect(ex - 6, 27, 12, 2)
        else {
          ctx.beginPath()
          ctx.arc(ex, 27, 5, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }
    // neck to scanner
    ctx.fillStyle = '#64748b'
    ctx.fillRect(-8, 58, 16, 14)
    ctx.fillStyle = '#1e293b'
    rr(ctx, -26, 70, 52, 12, 6)
    ctx.fill()
    ctx.restore()

    // scan beam
    if (scanning) {
      const by = top + bob + 82 * rs
      const bottom = this.beltY
      const sweep = this.reduced ? 0.5 : (Math.sin(this.pt * 14) + 1) / 2
      const grad = ctx.createLinearGradient(0, by, 0, bottom)
      grad.addColorStop(0, 'rgba(34,211,238,0.55)')
      grad.addColorStop(1, 'rgba(34,211,238,0.05)')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.moveTo(x - 18, by)
      ctx.lineTo(x + 18, by)
      ctx.lineTo(x + this.parcelSize * 0.6, bottom)
      ctx.lineTo(x - this.parcelSize * 0.6, bottom)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = '#67e8f9'
      ctx.lineWidth = 2
      const ly = bottom - this.parcelSize + sweep * this.parcelSize
      ctx.beginPath()
      ctx.moveTo(x - this.parcelSize * 0.55, ly)
      ctx.lineTo(x + this.parcelSize * 0.55, ly)
      ctx.stroke()
    }

    // thought bubble
    const conf = this.running ? this.parcels[this.idx]?.confidence ?? 0 : this.idleConf
    const show = this.running ? this.phase !== 'arrive' : !!this.idlePred && this.idleDrawing.length > 0
    if (show && pred) {
      const bx = x + 50 * rs + 10
      const byy = Math.max(4, top - 8)
      ctx.fillStyle = 'rgba(248,250,252,0.96)'
      rr(ctx, bx, byy, 92, 46, 14)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(bx - 4, byy + 40, 5, 0, Math.PI * 2)
      ctx.arc(bx - 12, byy + 50, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = SYMBOLS[pred].color
      ctx.font = '900 26px "Space Grotesk", system-ui, sans-serif'
      ctx.textBaseline = 'middle'
      ctx.textAlign = 'left'
      ctx.fillStyle = '#0f172a'
      ctx.fillText(SYMBOLS[pred].glyph, bx + 10, byy + 24)
      ctx.font = '800 15px "Space Grotesk", system-ui, sans-serif'
      ctx.fillText(`${Math.round(conf * 100)}%`, bx + 42, byy + 24)
    }
  }

  private drawChutes() {
    const { ctx } = this
    const n = this.classes.length
    if (!n) return
    const cw = Math.min(110, ((this.w * 0.8) / n) * 0.8)
    const y = this.chuteY
    this.classes.forEach((c, i) => {
      const x = this.chuteX(i)
      const sym = SYMBOLS[c]
      let edge = sym.color
      if (this.flash && this.flash.chute === i && this.flash.t < 0.8) edge = this.flash.good ? '#22c55e' : '#ef4444'
      // bin
      ctx.fillStyle = '#19263f'
      ctx.beginPath()
      ctx.moveTo(x - cw / 2, y)
      ctx.lineTo(x + cw / 2, y)
      ctx.lineTo(x + cw * 0.38, this.h - 4)
      ctx.lineTo(x - cw * 0.38, this.h - 4)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = edge
      ctx.lineWidth = this.flash && this.flash.chute === i && this.flash.t < 0.8 ? 4 : 2
      ctx.stroke()
      // sign
      ctx.fillStyle = sym.color
      rr(ctx, x - 22, y + 5, 44, 24, 8)
      ctx.fill()
      ctx.fillStyle = '#0a1120'
      ctx.font = '900 18px "Space Grotesk", system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(sym.glyph, x, y + 18)
      // tally of landed parcels (green = right, red = wrong)
      const mine = this.landed.filter((l) => l.chute === i)
      mine.forEach((l, j) => {
        const col = j % 5
        const row = Math.floor(j / 5)
        ctx.fillStyle = l.good ? '#22c55e' : '#ef4444'
        rr(ctx, x - 25 + col * 10, this.h - 14 - row * 10, 8, 8, 2)
        ctx.fill()
      })
    })
    // idle: dashed route from scanner to the chute the brain would choose
    if (!this.running && this.idlePred && this.idleDrawing.length) {
      const ci = this.classes.indexOf(this.idlePred)
      if (ci >= 0) {
        ctx.save()
        ctx.setLineDash([6, 6])
        ctx.lineDashOffset = this.reduced ? 0 : -this.t * 30
        ctx.strokeStyle = SYMBOLS[this.idlePred].color
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(this.scanX, this.beltY + 4)
        ctx.quadraticCurveTo((this.scanX + this.chuteX(ci)) / 2, this.beltY - 10, this.chuteX(ci), y - 4)
        ctx.stroke()
        ctx.restore()
      }
    }
  }

  private drawIdle() {
    if (!this.idleDrawing.length) {
      this.drawParcel(this.scanX, this.beltY, [], 0)
      const { ctx } = this
      ctx.fillStyle = 'rgba(15,23,42,0.6)'
      ctx.font = '700 11px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('draw ↓', this.scanX, this.beltY - this.parcelSize / 2 + 2)
      return
    }
    this.drawParcel(this.scanX, this.beltY, this.idleDrawing, 0, this.idlePred ? SYMBOLS[this.idlePred].color : undefined)
  }

  private drawRunParcel() {
    const p = this.parcels[this.idx]
    if (!p) return
    const ease = (u: number) => 1 - Math.pow(1 - Math.min(1, u), 3)
    // Next parcel waiting on the belt behind
    const next = this.parcels[this.idx + 1]
    if (next && this.phase !== 'arrive') {
      const u = this.phase === 'scan' ? this.pt / SCAN : 1
      this.drawParcel(-this.parcelSize + u * this.parcelSize * 1.4, this.beltY, next.drawing, 0)
    }
    if (this.phase === 'arrive') {
      const u = ease(this.pt / ARRIVE)
      this.drawParcel(-this.parcelSize + u * (this.scanX + this.parcelSize), this.beltY, p.drawing, 0)
    } else if (this.phase === 'scan') {
      this.drawParcel(this.scanX, this.beltY, p.drawing, 0, p.pred ? SYMBOLS[p.pred].color : undefined)
    } else {
      const ci = p.pred ? this.classes.indexOf(p.pred) : 0
      const tx = this.chuteX(Math.max(0, ci))
      const ty = this.chuteY + 6
      const u = this.phase === 'fly' ? this.pt / FLY : 1
      const x = this.scanX + (tx - this.scanX) * u
      const arc = Math.sin(u * Math.PI) * 50
      const y = this.beltY + (ty - this.beltY) * u * u - arc
      const good = p.pred === p.truth
      const alpha = this.phase === 'land' ? Math.max(0, 1 - this.pt / LAND) : 1
      this.ctx.globalAlpha = alpha
      this.drawParcel(x, y, p.drawing, this.reduced ? 0 : u * (tx > this.scanX ? 0.5 : -0.5), this.phase === 'land' ? (good ? '#22c55e' : '#ef4444') : undefined)
      this.ctx.globalAlpha = 1
      if (this.phase === 'land') {
        const { ctx } = this
        ctx.font = '900 30px "Space Grotesk", system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = good ? '#22c55e' : '#ef4444'
        ctx.fillText(good ? '✓' : '✗', tx + 34, ty - this.parcelSize - 6 - this.pt * 24)
      }
    }
  }
}
