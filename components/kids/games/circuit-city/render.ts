// components/kids/games/circuit-city/render.ts
// Canvas drawing for the Circuit City breadboard: pads, parts (original art,
// drawn in code), voltage-coloured wires, current dots whose speed is
// proportional to the current, glows and spark particles. No React here.

import {
  COLS,
  ROWS,
  batteryEmf,
  buzzerOn,
  ledGlow,
  motorSpeed,
  nodeXY,
  partCurrent,
  resistorBands,
  formatOhms,
  TINY_A,
  type Part,
  type PartKind,
  type Solution,
} from './circuit'

export interface View {
  cell: number
  w: number
  h: number
}

/** Size the board to fit both the available width and (optionally) height. */
export function makeView(width: number, height = Infinity): View {
  const cell = Math.max(24, Math.min(84, width / COLS, height / ROWS))
  return { cell, w: cell * COLS, h: cell * ROWS }
}

export function nodePx(view: View, n: number): { x: number; y: number } {
  const p = nodeXY(n)
  return { x: (p.x + 0.5) * view.cell, y: (p.y + 0.5) * view.cell }
}

export interface Edge {
  a: number
  b: number
}

/** Nearest node to a point, if within `radius` cells. */
export function pickNode(view: View, x: number, y: number, radius = 0.32): number | null {
  const gx = Math.round(x / view.cell - 0.5)
  const gy = Math.round(y / view.cell - 0.5)
  if (gx < 0 || gy < 0 || gx >= COLS || gy >= ROWS) return null
  const cx = (gx + 0.5) * view.cell
  const cy = (gy + 0.5) * view.cell
  if (Math.hypot(x - cx, y - cy) > radius * view.cell) return null
  return gy * COLS + gx
}

/** Nearest edge (by its midpoint). a = left/top node. */
export function pickEdge(view: View, x: number, y: number): Edge | null {
  const fx = x / view.cell - 0.5
  const fy = y / view.cell - 0.5
  let best: Edge | null = null
  let bestD = 0.62
  const x0 = Math.floor(fx)
  const y0 = Math.floor(fy)
  for (let gy = y0 - 1; gy <= y0 + 1; gy++) {
    for (let gx = x0 - 1; gx <= x0 + 1; gx++) {
      if (gx < 0 || gy < 0 || gx >= COLS || gy >= ROWS) continue
      if (gx + 1 < COLS) {
        const d = Math.hypot(fx - (gx + 0.5), (fy - gy) * 1.25)
        if (d < bestD) {
          bestD = d
          best = { a: gy * COLS + gx, b: gy * COLS + gx + 1 }
        }
      }
      if (gy + 1 < ROWS) {
        const d = Math.hypot((fx - gx) * 1.25, fy - (gy + 0.5))
        if (d < bestD) {
          bestD = d
          best = { a: gy * COLS + gx, b: (gy + 1) * COLS + gx }
        }
      }
    }
  }
  return best
}

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  color: string
  size: number
  smoke?: boolean
}

export function burst(list: Particle[], x: number, y: number, n: number, colors: string[], speed = 160) {
  for (let k = 0; k < n; k++) {
    const ang = (k / n) * Math.PI * 2 + (k % 3) * 0.37
    const sp = speed * (0.4 + ((k * 37) % 10) / 12)
    list.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 40, life: 0, max: 0.5 + ((k * 13) % 7) / 14, color: colors[k % colors.length], size: 2 + (k % 3) })
  }
}

export function smokePuff(list: Particle[], x: number, y: number) {
  for (let k = 0; k < 6; k++) {
    list.push({ x: x + (k - 3) * 2, y, vx: (k - 3) * 4, vy: -30 - k * 4, life: 0, max: 1.4, color: 'rgba(160,170,185,', size: 5 + k, smoke: true })
  }
}

export function stepParticles(list: Particle[], dt: number): Particle[] {
  for (const p of list) {
    p.life += dt
    p.x += p.vx * dt
    p.y += p.vy * dt
    if (!p.smoke) p.vy += 420 * dt
    p.vx *= 0.98
  }
  return list.filter((p) => p.life < p.max)
}

export interface DrawState {
  parts: Part[]
  sol: Solution
  selected: string | null
  hover: Edge | null
  ghost: PartKind | null
  ghostOk: boolean
  cursor: Edge | null
  showCursor: boolean
  probe: { kind: 'node'; n: number } | { kind: 'part'; id: string } | null
  sensePick: boolean
  phase: Map<string, number>
  spin: Map<string, number>
  particles: Particle[]
  time: number
  reduced: boolean
  vmax: number
}

const BOARD_BG = '#0c1628'

/** Wire colour by voltage: 0 V blue → mid violet-free teal → max red-orange. */
function voltColor(v: number, vmax: number): string {
  const t = Math.max(0, Math.min(1, vmax > 0 ? v / vmax : 0))
  const r = Math.round(56 + (248 - 56) * t)
  const g = Math.round(132 + (113 - 132) * t)
  const b = Math.round(255 + (60 - 255) * t)
  return `rgb(${r},${g},${b})`
}

export function draw(ctx: CanvasRenderingContext2D, view: View, s: DrawState) {
  const { cell } = view
  ctx.clearRect(0, 0, view.w, view.h)

  // Board
  const bg = ctx.createLinearGradient(0, 0, 0, view.h)
  bg.addColorStop(0, '#0f1d35')
  bg.addColorStop(1, BOARD_BG)
  ctx.fillStyle = bg
  roundRect(ctx, 0, 0, view.w, view.h, 18)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.035)'
  ctx.lineWidth = 1
  for (let x = 0; x <= COLS; x++) {
    ctx.beginPath()
    ctx.moveTo(x * cell, 0)
    ctx.lineTo(x * cell, view.h)
    ctx.stroke()
  }
  for (let y = 0; y <= ROWS; y++) {
    ctx.beginPath()
    ctx.moveTo(0, y * cell)
    ctx.lineTo(view.w, y * cell)
    ctx.stroke()
  }

  // Pads
  const used = new Set<number>()
  for (const p of s.parts) {
    used.add(p.a)
    used.add(p.b)
  }
  for (let n = 0; n < COLS * ROWS; n++) {
    const c = nodePx(view, n)
    ctx.beginPath()
    ctx.arc(c.x, c.y, used.has(n) ? cell * 0.085 : cell * 0.06, 0, Math.PI * 2)
    ctx.fillStyle = used.has(n) ? '#d6a75a' : 'rgba(214,167,90,0.35)'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(c.x, c.y, cell * 0.03, 0, Math.PI * 2)
    ctx.fillStyle = '#0a1120'
    ctx.fill()
  }

  // Hover edge / ghost
  if (s.hover) {
    const a = nodePx(view, s.hover.a)
    const b = nodePx(view, s.hover.b)
    ctx.save()
    ctx.setLineDash([6, 6])
    ctx.lineWidth = 3
    ctx.strokeStyle = s.ghostOk ? 'rgba(255,168,120,0.9)' : 'rgba(248,113,113,0.8)'
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()
    ctx.restore()
    if (s.ghost && s.ghostOk) {
      ctx.save()
      ctx.globalAlpha = 0.55
      drawPart(ctx, view, { id: '__ghost', kind: s.ghost, a: s.hover.a, b: s.hover.b, ohms: 1000, cells: 2, color: 'red', on: false }, s, true)
      ctx.restore()
    }
  }

  // Parts (wires first so components sit on top)
  const order = [...s.parts].sort((p, q) => (p.kind === 'wire' ? 0 : 1) - (q.kind === 'wire' ? 0 : 1))
  for (const p of order) drawPart(ctx, view, p, s, false)

  // Comparator sense leads
  for (const p of s.parts) {
    if (p.kind !== 'comparator' || p.sense == null) continue
    const a = nodePx(view, p.a)
    const b = nodePx(view, p.b)
    const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    const t = nodePx(view, p.sense)
    ctx.save()
    ctx.setLineDash([5, 5])
    ctx.lineDashOffset = s.reduced ? 0 : -s.time * 20
    ctx.strokeStyle = '#22d3ee'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(m.x, m.y)
    ctx.quadraticCurveTo((m.x + t.x) / 2, Math.min(m.y, t.y) - cell * 0.4, t.x, t.y)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.beginPath()
    ctx.arc(t.x, t.y, cell * 0.11, 0, Math.PI * 2)
    ctx.fillStyle = '#22d3ee'
    ctx.fill()
    ctx.restore()
  }

  // Current dots — speed proportional to current
  for (const p of s.parts) {
    const i = partCurrent(s.sol, p.id)
    if (Math.abs(i) < TINY_A || p.burnt) continue
    const a = nodePx(view, p.a)
    const b = nodePx(view, p.b)
    const len = Math.hypot(b.x - a.x, b.y - a.y)
    const spacing = cell / 4
    const ph = s.phase.get(p.id) ?? 0
    const off = ((ph % spacing) + spacing) % spacing
    const big = Math.abs(i) > 0.3
    ctx.fillStyle = big ? '#fde68a' : '#fef08a'
    ctx.shadowColor = '#facc15'
    ctx.shadowBlur = 6
    for (let d = off; d < len; d += spacing) {
      const t = d / len
      ctx.beginPath()
      ctx.arc(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, big ? cell * 0.045 : cell * 0.036, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.shadowBlur = 0
  }

  // Selection
  if (s.selected) {
    const p = s.parts.find((q) => q.id === s.selected)
    if (p) {
      const a = nodePx(view, p.a)
      const b = nodePx(view, p.b)
      ctx.save()
      ctx.strokeStyle = '#ffa878'
      ctx.lineWidth = 2.5
      ctx.setLineDash([4, 4])
      ctx.lineDashOffset = s.reduced ? 0 : -s.time * 16
      const cx = (a.x + b.x) / 2
      const cy = (a.y + b.y) / 2
      const horiz = Math.abs(b.x - a.x) > Math.abs(b.y - a.y)
      const w = horiz ? cell * 1.08 : cell * 0.6
      const h = horiz ? cell * 0.6 : cell * 1.08
      roundRect(ctx, cx - w / 2, cy - h / 2, w, h, 10)
      ctx.stroke()
      ctx.restore()
    }
  }

  // Keyboard cursor
  if (s.showCursor && s.cursor) {
    const a = nodePx(view, s.cursor.a)
    const b = nodePx(view, s.cursor.b)
    ctx.save()
    ctx.strokeStyle = '#22d3ee'
    ctx.lineWidth = 4
    ctx.globalAlpha = 0.85
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()
    ctx.restore()
  }

  // Probe marker
  if (s.probe) {
    let px: { x: number; y: number } | null = null
    if (s.probe.kind === 'node') px = nodePx(view, s.probe.n)
    else {
      const id = s.probe.id
      const p = s.parts.find((q) => q.id === id)
      if (p) {
        const a = nodePx(view, p.a)
        const b = nodePx(view, p.b)
        px = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      }
    }
    if (px) {
      ctx.save()
      ctx.translate(px.x, px.y)
      ctx.strokeStyle = '#ef4444'
      ctx.fillStyle = '#ef4444'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(cell * 0.28, -cell * 0.42)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(0, 0, 4, 0, Math.PI * 2)
      ctx.fill()
      roundRect(ctx, cell * 0.22, -cell * 0.62, cell * 0.14, cell * 0.24, 4)
      ctx.fill()
      ctx.restore()
    }
  }

  // Particles
  for (const p of s.particles) {
    const k = 1 - p.life / p.max
    if (p.smoke) {
      ctx.fillStyle = `${p.color}${(0.35 * k).toFixed(3)})`
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * (1.6 - k), 0, Math.PI * 2)
      ctx.fill()
    } else {
      ctx.globalAlpha = k
      ctx.fillStyle = p.color
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)
      ctx.globalAlpha = 1
    }
  }

  if (s.sensePick) {
    ctx.save()
    ctx.strokeStyle = 'rgba(34,211,238,0.6)'
    ctx.lineWidth = 2
    for (let n = 0; n < COLS * ROWS; n++) {
      if (!used.has(n)) continue
      const c = nodePx(view, n)
      const r = cell * (0.16 + (s.reduced ? 0 : 0.03 * Math.sin(s.time * 5)))
      ctx.beginPath()
      ctx.arc(c.x, c.y, r, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.restore()
  }
}

function drawPart(ctx: CanvasRenderingContext2D, view: View, p: Part, s: DrawState, ghost: boolean) {
  const { cell } = view
  const a = nodePx(view, p.a)
  const b = nodePx(view, p.b)
  const L = Math.hypot(b.x - a.x, b.y - a.y)
  const ang = Math.atan2(b.y - a.y, b.x - a.x)
  const va = s.sol.v.get(p.a) ?? 0
  const vb = s.sol.v.get(p.b) ?? 0
  ctx.save()
  ctx.translate((a.x + b.x) / 2, (a.y + b.y) / 2)
  ctx.rotate(ang)
  const h = L / 2
  // Upright text helper: undo rotation for labels.
  const label = (text: string, x: number, y: number, color = '#EEF2F8', size = 0.17) => {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(-ang)
    ctx.fillStyle = color
    ctx.font = `800 ${Math.max(9, cell * size)}px ui-sans-serif, system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 0, 0)
    ctx.restore()
  }
  const leads = (inner: number, ca = voltColor(va, s.vmax), cb = voltColor(vb, s.vmax)) => {
    ctx.lineCap = 'round'
    ctx.lineWidth = cell * 0.07
    ctx.strokeStyle = ghost ? '#ffa878' : ca
    ctx.beginPath()
    ctx.moveTo(-h, 0)
    ctx.lineTo(-inner, 0)
    ctx.stroke()
    ctx.strokeStyle = ghost ? '#ffa878' : cb
    ctx.beginPath()
    ctx.moveTo(inner, 0)
    ctx.lineTo(h, 0)
    ctx.stroke()
  }

  switch (p.kind) {
    case 'wire': {
      const grad = ctx.createLinearGradient(-h, 0, h, 0)
      grad.addColorStop(0, ghost ? '#ffa878' : voltColor(va, s.vmax))
      grad.addColorStop(1, ghost ? '#ffa878' : voltColor(vb, s.vmax))
      ctx.lineCap = 'round'
      ctx.strokeStyle = 'rgba(0,0,0,0.45)'
      ctx.lineWidth = cell * 0.13
      ctx.beginPath()
      ctx.moveTo(-h, 2)
      ctx.lineTo(h, 2)
      ctx.stroke()
      ctx.strokeStyle = grad
      ctx.lineWidth = cell * 0.1
      ctx.beginPath()
      ctx.moveTo(-h, 0)
      ctx.lineTo(h, 0)
      ctx.stroke()
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'
      ctx.lineWidth = cell * 0.025
      ctx.beginPath()
      ctx.moveTo(-h, -cell * 0.02)
      ctx.lineTo(h, -cell * 0.02)
      ctx.stroke()
      break
    }
    case 'battery': {
      leads(h * 0.7)
      const bw = L * 0.74
      const bh = cell * 0.4
      const charge = p.charge ?? 1
      const body = ctx.createLinearGradient(0, -bh / 2, 0, bh / 2)
      body.addColorStop(0, '#2b3a55')
      body.addColorStop(0.5, '#1c2840')
      body.addColorStop(1, '#101828')
      ctx.fillStyle = body
      roundRect(ctx, -bw / 2, -bh / 2, bw, bh, 8)
      ctx.fill()
      // + cap (orange) on the a side (negative x)
      ctx.fillStyle = '#FC6818'
      roundRect(ctx, -bw / 2 - cell * 0.06, -bh * 0.25, cell * 0.1, bh * 0.5, 3)
      ctx.fill()
      roundRect(ctx, -bw / 2, -bh / 2, bw * 0.22, bh, 8)
      ctx.fill()
      // cells dividers
      const cells = p.cells ?? 2
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'
      ctx.lineWidth = 1.5
      for (let k = 1; k < cells; k++) {
        const x = -bw / 2 + bw * 0.22 + ((bw * 0.78) / cells) * k
        ctx.beginPath()
        ctx.moveTo(x, -bh / 2 + 3)
        ctx.lineTo(x, bh / 2 - 3)
        ctx.stroke()
      }
      // charge bar
      ctx.fillStyle = 'rgba(255,255,255,0.12)'
      roundRect(ctx, -bw / 2 + bw * 0.27, bh / 2 - cell * 0.09, bw * 0.66, cell * 0.05, 2)
      ctx.fill()
      ctx.fillStyle = charge > 0.5 ? '#22c55e' : charge > 0.2 ? '#facc15' : '#ef4444'
      roundRect(ctx, -bw / 2 + bw * 0.27, bh / 2 - cell * 0.09, bw * 0.66 * charge, cell * 0.05, 2)
      ctx.fill()
      if (s.sol.shorted && !ghost) {
        ctx.strokeStyle = `rgba(248,113,113,${0.5 + 0.5 * Math.sin(s.time * 12)})`
        ctx.lineWidth = 3
        roundRect(ctx, -bw / 2 - 3, -bh / 2 - 3, bw + 6, bh + 6, 10)
        ctx.stroke()
      }
      label('+', -bw / 2 + bw * 0.11, 0, '#1A1103', 0.22)
      label(`${(batteryEmf(p) || 0).toFixed(1)}V`, bw * 0.1, -cell * 0.02, '#EEF2F8', 0.15)
      break
    }
    case 'switch':
    case 'button': {
      leads(h * 0.42)
      ctx.fillStyle = '#1e293b'
      roundRect(ctx, -h * 0.55, -cell * 0.12, h * 1.1, cell * 0.24, 6)
      ctx.fill()
      ctx.fillStyle = '#cbd5e1'
      for (const x of [-h * 0.42, h * 0.42]) {
        ctx.beginPath()
        ctx.arc(x, 0, cell * 0.05, 0, Math.PI * 2)
        ctx.fill()
      }
      if (p.kind === 'switch') {
        ctx.save()
        ctx.translate(-h * 0.42, 0)
        ctx.rotate(p.on ? 0 : -0.55)
        ctx.strokeStyle = p.on ? '#22c55e' : '#f87171'
        ctx.lineWidth = cell * 0.07
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(h * 0.86, 0)
        ctx.stroke()
        ctx.restore()
        label(p.on ? 'ON' : 'OFF', 0, cell * 0.26, p.on ? '#86efac' : '#fca5a5', 0.14)
      } else {
        ctx.fillStyle = p.on ? '#FC6818' : '#ef4444'
        ctx.beginPath()
        ctx.arc(0, p.on ? 0 : -cell * 0.04, cell * 0.14, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'
        ctx.lineWidth = 2
        ctx.stroke()
      }
      break
    }
    case 'resistor': {
      leads(h * 0.48)
      const rw = h * 0.98
      const rh = cell * 0.2
      const body = ctx.createLinearGradient(0, -rh / 2, 0, rh / 2)
      body.addColorStop(0, '#f1dcb0')
      body.addColorStop(1, '#c9a66b')
      ctx.fillStyle = body
      roundRect(ctx, -rw / 2, -rh / 2, rw, rh, rh / 2)
      ctx.fill()
      const bands = resistorBands(p.ohms ?? 1000)
      bands.forEach((c, k) => {
        ctx.fillStyle = c
        const x = -rw / 2 + rw * (0.2 + k * 0.17) + (k === 3 ? rw * 0.06 : 0)
        ctx.fillRect(x, -rh / 2, rw * 0.075, rh)
      })
      if (!ghost) label(formatOhms(p.ohms ?? 1000), 0, -cell * 0.24, '#ffd3b8', 0.15)
      // heat glow if hot
      const pw = Math.abs(partCurrent(s.sol, p.id) * (s.sol.vd.get(p.id) ?? 0))
      if (pw > 0.25) {
        ctx.fillStyle = `rgba(248,113,113,${Math.min(0.5, pw / 2)})`
        roundRect(ctx, -rw / 2, -rh / 2, rw, rh, rh / 2)
        ctx.fill()
      }
      break
    }
    case 'led':
    case 'lamp': {
      const glow = ghost ? 0 : ledGlow(s.sol, p)
      const col = p.color === 'white' ? [255, 250, 235] : p.color === 'yellow' ? [255, 210, 80] : p.color === 'green' ? [80, 240, 120] : [255, 70, 60]
      const rgb = (al: number) => `rgba(${col[0]},${col[1]},${col[2]},${al})`
      if (p.kind === 'lamp') {
        leads(h * 0.5)
        ctx.fillStyle = '#1f2a44'
        roundRect(ctx, -h * 0.62, -cell * 0.2, h * 1.24, cell * 0.4, 8)
        ctx.fill()
        // built-in resistor stripe
        ctx.fillStyle = '#c9a66b'
        roundRect(ctx, h * 0.12, -cell * 0.05, h * 0.38, cell * 0.1, 4)
        ctx.fill()
      } else {
        leads(cell * 0.12)
      }
      const cx = p.kind === 'lamp' ? -h * 0.22 : 0
      if (glow > 0) {
        const g = ctx.createRadialGradient(cx, 0, 0, cx, 0, cell * (0.3 + 0.55 * glow))
        g.addColorStop(0, rgb(0.85 * glow))
        g.addColorStop(1, rgb(0))
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(cx, 0, cell * (0.3 + 0.55 * glow), 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.beginPath()
      ctx.arc(cx, 0, cell * 0.15, 0, Math.PI * 2)
      ctx.fillStyle = p.burnt ? '#2a2a2a' : glow > 0 ? rgb(0.6 + 0.4 * glow) : rgb(0.35)
      ctx.fill()
      ctx.strokeStyle = p.burnt ? '#555' : 'rgba(255,255,255,0.45)'
      ctx.lineWidth = 1.5
      ctx.stroke()
      if (p.burnt) {
        ctx.strokeStyle = '#111'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(cx - cell * 0.08, -cell * 0.08)
        ctx.lineTo(cx + cell * 0.02, 0)
        ctx.lineTo(cx - cell * 0.03, cell * 0.04)
        ctx.lineTo(cx + cell * 0.08, cell * 0.1)
        ctx.stroke()
      }
      // polarity marks: + on the a side, flat (−) on b
      label('+', -h * 0.72, -cell * 0.17, '#ffa878', 0.17)
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'
      ctx.lineWidth = 2
      // direction arrow (triangle) = diode symbol
      ctx.save()
      ctx.translate(p.kind === 'lamp' ? -h * 0.22 : 0, cell * 0.25)
      ctx.fillStyle = 'rgba(255,255,255,0.75)'
      ctx.beginPath()
      ctx.moveTo(-cell * 0.06, -cell * 0.05)
      ctx.lineTo(cell * 0.04, 0)
      ctx.lineTo(-cell * 0.06, cell * 0.05)
      ctx.closePath()
      ctx.fill()
      ctx.fillRect(cell * 0.045, -cell * 0.05, 2, cell * 0.1)
      ctx.restore()
      if (p.loadId && !ghost) label(p.loadId, p.kind === 'lamp' ? h * 0.3 : h * 0.55, cell * 0.24, '#a7b0c0', 0.13)
      break
    }
    case 'motor': {
      leads(cell * 0.24)
      const sp = ghost ? 0 : motorSpeed(s.sol, p)
      ctx.beginPath()
      ctx.arc(0, 0, cell * 0.25, 0, Math.PI * 2)
      const g = ctx.createRadialGradient(-cell * 0.08, -cell * 0.08, 2, 0, 0, cell * 0.25)
      g.addColorStop(0, '#cbd5e1')
      g.addColorStop(1, '#475569')
      ctx.fillStyle = g
      ctx.fill()
      ctx.save()
      ctx.rotate(-ang + (s.spin.get(p.id) ?? 0))
      ctx.fillStyle = sp > 0 ? '#FC6818' : '#94a3b8'
      for (let k = 0; k < 3; k++) {
        ctx.rotate((Math.PI * 2) / 3)
        ctx.beginPath()
        ctx.ellipse(0, -cell * 0.11, cell * 0.05, cell * 0.11, 0, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
      ctx.beginPath()
      ctx.arc(0, 0, cell * 0.04, 0, Math.PI * 2)
      ctx.fillStyle = '#0f172a'
      ctx.fill()
      label('M', 0, cell * 0.36, '#a7b0c0', 0.14)
      break
    }
    case 'buzzer': {
      leads(cell * 0.2)
      ctx.beginPath()
      ctx.arc(0, 0, cell * 0.21, 0, Math.PI * 2)
      ctx.fillStyle = '#111827'
      ctx.fill()
      ctx.strokeStyle = '#475569'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(0, 0, cell * 0.04, 0, Math.PI * 2)
      ctx.fillStyle = '#475569'
      ctx.fill()
      if (!ghost && buzzerOn(s.sol, p)) {
        ctx.save()
        ctx.rotate(-ang)
        ctx.strokeStyle = '#22d3ee'
        ctx.lineWidth = 2
        for (let k = 1; k <= 3; k++) {
          const r = cell * 0.22 + ((s.reduced ? 0.5 : (s.time * 2 + k / 3) % 1) * cell * 0.2)
          ctx.globalAlpha = 0.7
          ctx.beginPath()
          ctx.arc(0, 0, r, -0.6, 0.6)
          ctx.stroke()
        }
        ctx.restore()
      }
      break
    }
    case 'ldr': {
      leads(cell * 0.2)
      ctx.beginPath()
      ctx.arc(0, 0, cell * 0.22, 0, Math.PI * 2)
      ctx.fillStyle = '#f8fafc'
      ctx.fill()
      ctx.strokeStyle = '#c2410c'
      ctx.lineWidth = 2
      ctx.beginPath()
      for (let k = 0; k <= 5; k++) {
        const y = -cell * 0.12 + (k * cell * 0.24) / 5
        const x = k % 2 === 0 ? -cell * 0.13 : cell * 0.13
        if (k === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
      label('LDR', 0, cell * 0.34, '#a7b0c0', 0.12)
      break
    }
    case 'comparator': {
      leads(h * 0.4)
      const closed = s.sol.conducting.has(p.id)
      ctx.fillStyle = '#0b1220'
      roundRect(ctx, -h * 0.55, -cell * 0.2, h * 1.1, cell * 0.4, 6)
      ctx.fill()
      ctx.strokeStyle = '#22d3ee'
      ctx.lineWidth = 1.5
      ctx.stroke()
      // chip legs
      ctx.fillStyle = '#94a3b8'
      for (let k = -2; k <= 2; k++) {
        ctx.fillRect(k * h * 0.18 - 1.5, -cell * 0.25, 3, cell * 0.05)
        ctx.fillRect(k * h * 0.18 - 1.5, cell * 0.2, 3, cell * 0.05)
      }
      ctx.beginPath()
      ctx.arc(h * 0.32, 0, cell * 0.06, 0, Math.PI * 2)
      ctx.fillStyle = closed ? '#22c55e' : '#334155'
      ctx.fill()
      label('▷', -h * 0.15, 0, '#67e8f9', 0.2)
      if (!ghost && p.sense == null) label('sense?', 0, -cell * 0.36, '#67e8f9', 0.13)
      break
    }
  }
  ctx.restore()
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2))
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}
