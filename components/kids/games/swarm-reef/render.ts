// components/kids/games/swarm-reef/render.ts
// Swarm Reef — everything drawn on the canvas: the reef, the current, the
// robots, the robot's-eye view and the particle effects. Pure canvas 2D, all
// original art, no images.

import {
  CELL,
  GRID_H,
  GRID_W,
  PERSONAL_SPACE,
  ROBOT_R,
  WORLD_H,
  WORLD_W,
  activeShape,
  currentAt,
  mulberry32,
  type Mission,
  type Obstacle,
  type SimEvent,
  type SimState,
} from './sim'

export interface View {
  /** CSS pixels per world unit. */
  scale: number
  w: number
  h: number
  dpr: number
}

export function makeView(cssW: number, dpr: number): View {
  const scale = cssW / WORLD_W
  return { scale, w: cssW, h: WORLD_H * scale, dpr }
}

// ── Colours ────────────────────────────────────────────────────────────────

const COL = {
  scout: '#fbbf24',
  robot: '#22d3ee',
  home: '#4ade80',
  off: '#64748b',
  low: '#f87171',
  orange: '#ff8a4c',
  shape: '#67e8f9',
}

// ── Glow sprites (pre-rendered once: cheaper than shadowBlur for 60 robots) ──

const spriteCache = new Map<string, HTMLCanvasElement>()
function glowSprite(color: string, size = 64): HTMLCanvasElement {
  const key = `${color}-${size}`
  const hit = spriteCache.get(key)
  if (hit) return hit
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const g = c.getContext('2d')
  if (g) {
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    grad.addColorStop(0, color + 'cc')
    grad.addColorStop(0.35, color + '55')
    grad.addColorStop(1, color + '00')
    g.fillStyle = grad
    g.fillRect(0, 0, size, size)
  }
  spriteCache.set(key, c)
  return c
}

// ── Particles ──────────────────────────────────────────────────────────────

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  size: number
  color: string
  kind: 'spark' | 'bubble' | 'ring' | 'text'
  text?: string
}

export class Fx {
  parts: Particle[] = []
  shake = 0
  flash = 0
  private rng = mulberry32(77)
  constructor(public reduced: boolean) {}

  burst(x: number, y: number, color: string, n: number, speed: number, kind: Particle['kind'] = 'spark', size = 2) {
    const count = this.reduced ? Math.ceil(n / 3) : n
    for (let i = 0; i < count; i++) {
      const a = this.rng() * Math.PI * 2
      const s = speed * (0.3 + this.rng() * 0.7)
      const life = 0.4 + this.rng() * 0.5
      this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life, size: size * (0.6 + this.rng() * 0.8), color, kind })
    }
  }

  ring(x: number, y: number, color: string, size: number, life = 0.8) {
    this.parts.push({ x, y, vx: 0, vy: 0, life, max: life, size, color, kind: 'ring' })
  }

  text(x: number, y: number, text: string, color: string) {
    this.parts.push({ x, y, vx: 0, vy: -30, life: 1.2, max: 1.2, size: 16, color, kind: 'text', text })
  }

  bubble(x: number, y: number) {
    if (this.reduced) return
    this.parts.push({ x, y, vx: (this.rng() - 0.5) * 6, vy: -18 - this.rng() * 14, life: 1.6, max: 1.6, size: 1.2 + this.rng() * 2.2, color: '#e0f2fe', kind: 'bubble' })
  }

  /** Turn sim events into effects. Returns which sounds to play. */
  absorb(events: SimEvent[]): { bump: boolean; crash: boolean; arrive: boolean; beacon: boolean; lost: boolean } {
    const out = { bump: false, crash: false, arrive: false, beacon: false, lost: false }
    for (const e of events) {
      switch (e.type) {
        case 'bump':
          this.burst(e.x, e.y, '#ffffff', 5, 50)
          out.bump = true
          break
        case 'crash':
          this.burst(e.x, e.y, COL.orange, 10, 90)
          this.ring(e.x, e.y, COL.orange, 18, 0.5)
          if (!this.reduced) this.shake = Math.min(6, this.shake + 2)
          out.crash = true
          break
        case 'arrive':
          this.burst(e.x, e.y, COL.home, 8, 40, 'bubble', 2.5)
          this.ring(e.x, e.y, COL.home, 16, 0.6)
          out.arrive = true
          break
        case 'beacon':
          this.ring(e.x, e.y, COL.orange, 70, 1.4)
          this.ring(e.x, e.y, '#fde68a', 40, 1.0)
          this.burst(e.x, e.y, '#fde68a', 24, 120)
          this.text(e.x, e.y - 26, 'FOUND!', '#fde68a')
          this.flash = 0.35
          out.beacon = true
          break
        case 'lost':
          this.burst(e.x, e.y, '#94a3b8', 12, 60)
          this.ring(e.x, e.y, '#f87171', 22, 0.7)
          out.lost = true
          break
        case 'flat':
          this.burst(e.x, e.y, COL.low, 6, 30)
          break
        case 'phase':
          this.flash = 0.25
          break
      }
    }
    return out
  }

  update(dt: number) {
    for (const p of this.parts) {
      p.life -= dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      if (p.kind === 'spark') {
        p.vx *= 1 - 3 * dt
        p.vy *= 1 - 3 * dt
      }
    }
    this.parts = this.parts.filter((p) => p.life > 0)
    if (this.parts.length > 700) this.parts.splice(0, this.parts.length - 700)
    this.shake = Math.max(0, this.shake - dt * 14)
    this.flash = Math.max(0, this.flash - dt)
  }

  draw(g: CanvasRenderingContext2D) {
    for (const p of this.parts) {
      const a = Math.max(0, p.life / p.max)
      if (p.kind === 'ring') {
        g.strokeStyle = p.color
        g.globalAlpha = a
        g.lineWidth = 2.5
        g.beginPath()
        g.arc(p.x, p.y, p.size * (1.6 - a * 0.9), 0, Math.PI * 2)
        g.stroke()
      } else if (p.kind === 'text') {
        g.globalAlpha = a
        g.fillStyle = p.color
        g.font = `900 ${p.size}px "Space Grotesk", system-ui, sans-serif`
        g.textAlign = 'center'
        g.fillText(p.text ?? '', p.x, p.y)
      } else if (p.kind === 'bubble') {
        g.globalAlpha = a * 0.8
        g.strokeStyle = p.color
        g.lineWidth = 1
        g.beginPath()
        g.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        g.stroke()
      } else {
        g.globalAlpha = a
        g.fillStyle = p.color
        g.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)
      }
    }
    g.globalAlpha = 1
  }
}

// ── Static scenery (built once per mission) ────────────────────────────────

interface Weed {
  x: number
  h: number
  phase: number
  color: string
}

interface Mote {
  x: number
  y: number
}

export interface Scenery {
  rockPaths: (Path2D | null)[]
  polyps: { x: number; y: number; r: number; c: string }[]
  weeds: Weed[]
  motes: Mote[]
}

function blobPath(o: Obstacle): Path2D | null {
  if (o.kind !== 'circle') return null
  const rng = mulberry32(o.seed)
  const p = new Path2D()
  const N = 22
  const k1 = rng() * 6
  const k2 = rng() * 6
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2
    const wob = 1 + 0.08 * Math.sin(a * 3 + k1) + 0.05 * Math.sin(a * 5 + k2)
    const x = o.x + Math.cos(a) * o.r * wob
    const y = o.y + Math.sin(a) * o.r * wob
    if (i === 0) p.moveTo(x, y)
    else p.lineTo(x, y)
  }
  p.closePath()
  return p
}

export function buildScenery(m: Mission): Scenery {
  const rng = mulberry32(m.seed * 13 + 5)
  const polyps: Scenery['polyps'] = []
  const corals = ['#fb7185', '#f472b6', '#fb923c', '#facc15', '#a3e635']
  for (const o of m.obstacles) {
    if (o.kind === 'circle') {
      const n = Math.round(o.r / 4)
      for (let i = 0; i < n; i++) {
        const a = rng() * Math.PI * 2
        const d = o.r * (0.25 + rng() * 0.7)
        polyps.push({ x: o.x + Math.cos(a) * d, y: o.y + Math.sin(a) * d, r: 2 + rng() * 4, c: corals[Math.floor(rng() * corals.length)] })
      }
    } else {
      const n = Math.round((o.w * o.h) / 900)
      for (let i = 0; i < n; i++) {
        polyps.push({ x: o.x + 6 + rng() * (o.w - 12), y: o.y + 6 + rng() * (o.h - 12), r: 2 + rng() * 4, c: corals[Math.floor(rng() * corals.length)] })
      }
    }
  }
  const weeds: Weed[] = []
  for (let i = 0; i < 26; i++) {
    weeds.push({ x: rng() * WORLD_W, h: 25 + rng() * 55, phase: rng() * 6, color: rng() > 0.5 ? '#0f766e' : '#155e75' })
  }
  const motes: Mote[] = []
  for (let i = 0; i < 90; i++) motes.push({ x: rng() * WORLD_W, y: rng() * WORLD_H })
  return { rockPaths: m.obstacles.map(blobPath), polyps, weeds, motes }
}

// ── Main draw ──────────────────────────────────────────────────────────────

export interface DrawOpts {
  time: number
  selected: number
  reduced: boolean
  showAllBeacons: boolean
}

export function drawWorld(g: CanvasRenderingContext2D, v: View, s: SimState, sc: Scenery, fx: Fx, o: DrawOpts, dt: number) {
  const { m } = s
  g.setTransform(v.dpr, 0, 0, v.dpr, 0, 0)
  g.clearRect(0, 0, v.w, v.h)
  const sh = fx.shake
  const ox = sh ? (Math.sin(o.time * 90) * sh) / 2 : 0
  const oy = sh ? (Math.cos(o.time * 77) * sh) / 2 : 0
  g.setTransform(v.dpr * v.scale, 0, 0, v.dpr * v.scale, ox * v.dpr, oy * v.dpr)

  // Water
  const water = g.createLinearGradient(0, 0, 0, WORLD_H)
  water.addColorStop(0, '#0a2a4a')
  water.addColorStop(0.55, '#0a1c38')
  water.addColorStop(1, '#071226')
  g.fillStyle = water
  g.fillRect(0, 0, WORLD_W, WORLD_H)

  // Light shafts from the surface
  g.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 5; i++) {
    const sway = o.reduced ? 0 : Math.sin(o.time * 0.3 + i * 1.7) * 40
    const x = 120 + i * 190 + sway
    const grad = g.createLinearGradient(0, 0, 0, WORLD_H * 0.8)
    grad.addColorStop(0, 'rgba(125,211,252,0.10)')
    grad.addColorStop(1, 'rgba(125,211,252,0)')
    g.fillStyle = grad
    g.beginPath()
    g.moveTo(x - 30, 0)
    g.lineTo(x + 40, 0)
    g.lineTo(x + 120 + sway, WORLD_H * 0.8)
    g.lineTo(x - 10 + sway, WORLD_H * 0.8)
    g.closePath()
    g.fill()
  }
  g.globalCompositeOperation = 'source-over'

  // Sand and weed
  g.fillStyle = '#122039'
  g.beginPath()
  g.moveTo(0, WORLD_H)
  for (let x = 0; x <= WORLD_W; x += 50) g.lineTo(x, WORLD_H - 14 - 6 * Math.sin(x / 90))
  g.lineTo(WORLD_W, WORLD_H)
  g.fill()
  g.lineCap = 'round'
  for (const w of sc.weeds) {
    const sway = o.reduced ? 0 : Math.sin(o.time * 1.2 + w.phase) * 8
    g.strokeStyle = w.color
    g.lineWidth = 4
    g.beginPath()
    g.moveTo(w.x, WORLD_H)
    g.quadraticCurveTo(w.x + sway * 0.5, WORLD_H - w.h / 2, w.x + sway, WORLD_H - w.h)
    g.stroke()
  }

  // Current motes (show which way the water flows)
  if (m.current > 0) {
    g.fillStyle = 'rgba(186,230,253,0.35)'
    for (const p of sc.motes) {
      if (!o.reduced) {
        const c = currentAt(m, p.x, p.y, s.t)
        p.x += c.cx * dt * 1.4
        p.y += c.cy * dt * 1.4
        if (p.x < 0) p.x += WORLD_W
        if (p.x > WORLD_W) p.x -= WORLD_W
        if (p.y < 0) p.y += WORLD_H
        if (p.y > WORLD_H) p.y -= WORLD_H
      }
      g.fillRect(p.x, p.y, 2, 2)
    }
  }

  // Legend: fog of the unsearched reef + the shared trail
  if (m.battery) {
    for (let gy = 0; gy < GRID_H; gy++) {
      for (let gx = 0; gx < GRID_W; gx++) {
        const c = gy * GRID_W + gx
        if (!s.coverable[c]) continue
        const tr = s.trail[c]
        if (tr > 0.02) {
          g.fillStyle = `rgba(255,138,76,${Math.min(0.2, tr * 0.07)})`
          g.fillRect(gx * CELL, gy * CELL, CELL, CELL)
        }
        if (!s.covered[c]) {
          g.fillStyle = 'rgba(3,7,18,0.55)'
          g.fillRect(gx * CELL, gy * CELL, CELL, CELL)
        }
      }
    }
    // dock
    g.strokeStyle = 'rgba(74,222,128,0.6)'
    g.setLineDash([6, 6])
    g.lineWidth = 2
    g.strokeRect(m.start.x - 10, m.start.y - 10, m.start.w + 20, m.start.h + 20)
    g.setLineDash([])
  }

  // Rocks and walls
  m.obstacles.forEach((ob, i) => {
    if (ob.kind === 'circle') {
      const path = sc.rockPaths[i]
      if (!path) return
      const grad = g.createRadialGradient(ob.x - ob.r * 0.3, ob.y - ob.r * 0.4, ob.r * 0.1, ob.x, ob.y, ob.r * 1.1)
      grad.addColorStop(0, '#4b3f63')
      grad.addColorStop(1, '#1f1a33')
      g.fillStyle = grad
      g.fill(path)
      g.strokeStyle = 'rgba(255,255,255,0.12)'
      g.lineWidth = 2
      g.stroke(path)
    } else {
      const grad = g.createLinearGradient(ob.x, 0, ob.x + ob.w, 0)
      grad.addColorStop(0, '#2a2342')
      grad.addColorStop(0.5, '#3d3358')
      grad.addColorStop(1, '#2a2342')
      g.fillStyle = grad
      g.fillRect(ob.x, ob.y, ob.w, ob.h)
      // the edges near the gap glow, so the child sees the danger
      g.strokeStyle = 'rgba(255,138,76,0.55)'
      g.lineWidth = 2
      g.strokeRect(ob.x + 1, ob.y + 1, ob.w - 2, ob.h - 2)
    }
  })
  for (const p of sc.polyps) {
    g.fillStyle = p.c
    g.globalAlpha = 0.75
    g.beginPath()
    g.arc(p.x, p.y, p.r, 0, Math.PI * 2)
    g.fill()
  }
  g.globalAlpha = 1

  // Food bloom
  if (m.food) {
    const f = m.food
    const pulse = o.reduced ? 0 : Math.sin(o.time * 2.4) * 4
    const grad = g.createRadialGradient(f.x, f.y, 4, f.x, f.y, f.r + 20)
    grad.addColorStop(0, 'rgba(190,242,100,0.55)')
    grad.addColorStop(0.6, 'rgba(74,222,128,0.18)')
    grad.addColorStop(1, 'rgba(74,222,128,0)')
    g.fillStyle = grad
    g.beginPath()
    g.arc(f.x, f.y, f.r + 20, 0, Math.PI * 2)
    g.fill()
    g.strokeStyle = 'rgba(190,242,100,0.7)'
    g.setLineDash([8, 8])
    g.lineWidth = 2
    g.beginPath()
    g.arc(f.x, f.y, f.r + pulse, 0, Math.PI * 2)
    g.stroke()
    g.setLineDash([])
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + (o.reduced ? 0 : o.time * 0.5)
      const d = 18 + ((i * 37) % 45)
      g.fillStyle = i % 2 ? '#d9f99d' : '#fef08a'
      g.beginPath()
      g.arc(f.x + Math.cos(a) * d, f.y + Math.sin(a * 1.3) * d * 0.8, 2.5, 0, Math.PI * 2)
      g.fill()
    }
    g.fillStyle = 'rgba(217,249,157,0.9)'
    g.font = '900 18px "Space Grotesk", system-ui, sans-serif'
    g.textAlign = 'center'
    g.fillText('FOOD', f.x, f.y - f.r - 10)
  }

  // Ace: the target shape (every robot knows it; nobody has a slot)
  const shape = activeShape(s)
  if (shape) {
    g.strokeStyle = COL.shape
    g.globalAlpha = 0.45
    g.lineWidth = 3
    g.setLineDash([10, 10])
    g.lineDashOffset = o.reduced ? 0 : -o.time * 20
    g.beginPath()
    if (shape.kind === 'ring') g.arc(shape.x, shape.y, shape.r, 0, Math.PI * 2)
    else {
      g.moveTo(shape.x1, shape.y1)
      g.lineTo(shape.x2, shape.y2)
    }
    g.stroke()
    g.setLineDash([])
    g.globalAlpha = 1
  }

  // Beacons (Legend): hidden until found
  if (m.beacons) {
    m.beacons.forEach((b, i) => {
      if (!s.found[i] && !o.showAllBeacons) return
      const found = s.found[i]
      const pulse = o.reduced ? 0 : (o.time * 1.5 + i) % 1
      g.strokeStyle = found ? COL.orange : 'rgba(248,113,113,0.7)'
      g.lineWidth = 2
      if (found) {
        g.globalAlpha = 1 - pulse
        g.beginPath()
        g.arc(b.x, b.y, 10 + pulse * 30, 0, Math.PI * 2)
        g.stroke()
        g.globalAlpha = 1
      }
      g.fillStyle = found ? COL.orange : 'rgba(248,113,113,0.5)'
      g.beginPath()
      g.arc(b.x, b.y, 9, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = '#1a1103'
      g.font = '900 10px system-ui, sans-serif'
      g.textAlign = 'center'
      g.fillText(found ? 'SOS' : '?', b.x, b.y + 3.5)
    })
  }

  // Robot's-eye view for the selected robot
  const sel = s.robots[o.selected]
  if (sel && sel.alive) {
    const R = s.w.radius
    g.fillStyle = 'rgba(34,211,238,0.07)'
    g.strokeStyle = 'rgba(34,211,238,0.8)'
    g.lineWidth = 1.5
    g.setLineDash([5, 5])
    g.beginPath()
    g.arc(sel.x, sel.y, R, 0, Math.PI * 2)
    g.fill()
    g.stroke()
    g.setLineDash([])
    const ps = Math.min(R, PERSONAL_SPACE)
    if (ps < R - 2) {
      g.strokeStyle = 'rgba(248,113,113,0.6)'
      g.beginPath()
      g.arc(sel.x, sel.y, ps, 0, Math.PI * 2)
      g.stroke()
    }
    g.strokeStyle = 'rgba(165,243,252,0.55)'
    g.lineWidth = 1
    for (const r of s.robots) {
      if (r === sel || !r.alive) continue
      if (Math.hypot(r.x - sel.x, r.y - sel.y) <= R) {
        g.beginPath()
        g.moveTo(sel.x, sel.y)
        g.lineTo(r.x, r.y)
        g.stroke()
      }
    }
  }

  // Robots (drawn a little larger on small screens so a phone still shows them clearly)
  const k = v.scale < 0.55 ? Math.min(1.6, 0.55 / v.scale) : 1
  for (let i = 0; i < s.robots.length; i++) {
    const r = s.robots[i]
    const color = !r.alive ? COL.off : m.battery && r.battery < 20 ? COL.low : r.arrived ? COL.home : r.scout && m.scoutEvery > 1 ? COL.scout : COL.robot
    const sp = Math.hypot(r.vx, r.vy)
    const ang = sp > 2 ? Math.atan2(r.vy, r.vx) : 0
    if (r.alive) {
      const glow = glowSprite(color)
      const gs = 34 * k
      g.drawImage(glow, r.x - gs / 2, r.y - gs / 2, gs, gs)
      // wake
      if (sp > 5) {
        g.strokeStyle = color
        g.globalAlpha = 0.35
        g.lineWidth = 2
        g.beginPath()
        g.moveTo(r.x, r.y)
        g.lineTo(r.x - (r.vx / sp) * Math.min(22, sp * 0.3), r.y - (r.vy / sp) * Math.min(22, sp * 0.3))
        g.stroke()
        g.globalAlpha = 1
      }
    }
    g.save()
    g.translate(r.x, r.y)
    g.rotate(ang)
    g.scale(k, k)
    g.globalAlpha = r.alive ? 1 : 0.5
    // hull
    g.fillStyle = '#0b1324'
    g.strokeStyle = color
    g.lineWidth = 1.6
    g.beginPath()
    g.moveTo(ROBOT_R * 1.9, 0)
    g.quadraticCurveTo(ROBOT_R * 0.6, -ROBOT_R * 1.25, -ROBOT_R * 1.3, -ROBOT_R * 0.95)
    g.lineTo(-ROBOT_R * 1.0, 0)
    g.lineTo(-ROBOT_R * 1.3, ROBOT_R * 0.95)
    g.quadraticCurveTo(ROBOT_R * 0.6, ROBOT_R * 1.25, ROBOT_R * 1.9, 0)
    g.closePath()
    g.fill()
    g.stroke()
    // eye LED
    g.fillStyle = color
    g.beginPath()
    g.arc(ROBOT_R * 0.7, 0, 1.6, 0, Math.PI * 2)
    g.fill()
    g.restore()
    g.globalAlpha = 1
    if (i === o.selected && r.alive) {
      g.strokeStyle = '#ffffff'
      g.lineWidth = 2
      g.beginPath()
      g.arc(r.x, r.y, ROBOT_R * 2.6, 0, Math.PI * 2)
      g.stroke()
    }
    if (r.alive && !o.reduced && ((i * 7 + Math.floor(o.time * 10)) % 97 === 0)) fx.bubble(r.x, r.y - 4)
  }

  fx.draw(g)

  if (fx.flash > 0) {
    g.fillStyle = `rgba(253,230,138,${fx.flash * 0.35})`
    g.fillRect(0, 0, WORLD_W, WORLD_H)
  }
  g.setTransform(1, 0, 0, 1, 0, 0)
}

/** Nearest live robot to a world point, or -1. */
export function pickRobot(s: SimState, x: number, y: number, maxDist: number): number {
  let best = -1
  let bd = maxDist
  s.robots.forEach((r, i) => {
    if (!r.alive) return
    const d = Math.hypot(r.x - x, r.y - y)
    if (d < bd) {
      bd = d
      best = i
    }
  })
  return best
}
