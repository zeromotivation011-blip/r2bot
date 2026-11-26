// components/kids/games/ocean-rescue/surveyRender.ts
// Canvas drawing for the AUV missions (Ace, Legend): a sea chart seen from
// above. Two tracks tell the story of navigation without GPS — the ORANGE line
// is where the robot really went, the dashed CYAN line is where it believed it
// was. A strip underneath shows the dive from the side.

import { clamp } from './physics'
import {
  CELL,
  DVL_MAX_ALT,
  USBL_RANGE,
  currentAt,
  seabedDepth,
  swathWidth,
  type SurveyLevel,
  type SurveyState,
} from './survey'

export interface MapView {
  w: number
  h: number
  dpr: number
  scale: number
  ox: number
  oy: number
}

export function makeMapView(L: SurveyLevel, w: number, h: number, dpr: number): MapView {
  const pad = 10
  const scale = Math.min((w - pad * 2) / L.width, (h - pad * 2) / L.height)
  const ox = (w - L.width * scale) / 2
  const oy = (h - L.height * scale) / 2
  return { w, h, dpr, scale, ox, oy }
}

export function toScreen(v: MapView, L: SurveyLevel, x: number, y: number): [number, number] {
  return [v.ox + x * v.scale, v.oy + (L.height - y) * v.scale]
}

export function toWorld(v: MapView, L: SurveyLevel, sx: number, sy: number): [number, number] {
  return [(sx - v.ox) / v.scale, L.height - (sy - v.oy) / v.scale]
}

/** Bathymetry image, made once per level: lighter = shallower, with 5 m contours. */
export function bathymetry(L: SurveyLevel): HTMLCanvasElement {
  const res = 4 // metres per pixel
  const cw = Math.ceil(L.width / res)
  const ch = Math.ceil(L.height / res)
  const c = document.createElement('canvas')
  c.width = cw
  c.height = ch
  const ctx = c.getContext('2d')
  if (!ctx) return c
  const img = ctx.createImageData(cw, ch)
  let dMin = Infinity
  let dMax = -Infinity
  const depths = new Float32Array(cw * ch)
  for (let j = 0; j < ch; j++)
    for (let i = 0; i < cw; i++) {
      const d = seabedDepth(L, i * res, L.height - j * res)
      depths[j * cw + i] = d
      dMin = Math.min(dMin, d)
      dMax = Math.max(dMax, d)
    }
  for (let j = 0; j < ch; j++)
    for (let i = 0; i < cw; i++) {
      const d = depths[j * cw + i]
      const k = (d - dMin) / Math.max(1, dMax - dMin) // 0 shallow … 1 deep
      const contour = Math.abs((d % 5) - 2.5) > 2.3
      const o = (j * cw + i) * 4
      img.data[o] = Math.round(18 + (1 - k) * 40 + (contour ? 30 : 0))
      img.data[o + 1] = Math.round(48 + (1 - k) * 110 + (contour ? 30 : 0))
      img.data[o + 2] = Math.round(78 + (1 - k) * 110 + (contour ? 30 : 0))
      img.data[o + 3] = 255
    }
  ctx.putImageData(img, 0, 0)
  return c
}

export interface PlanOverlay {
  route: [number, number][]
  altitude: number
  /** Ace: show the hearing corridor (transponder range) around the route. */
  hearing?: number
  /** Legend: show the swath. */
  swath?: boolean
  cursor?: [number, number] | null
}

function drawShip(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = '#e2e8f0'
  ctx.beginPath()
  ctx.moveTo(x - 9, y - 4)
  ctx.lineTo(x + 7, y - 4)
  ctx.lineTo(x + 12, y)
  ctx.lineTo(x + 7, y + 4)
  ctx.lineTo(x - 9, y + 4)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#FC6818'
  ctx.fillRect(x - 6, y - 2, 7, 4)
}

function drawAuv(ctx: CanvasRenderingContext2D, x: number, y: number, heading: number, ghost: boolean) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(-heading)
  if (ghost) {
    ctx.strokeStyle = '#00e5ff'
    ctx.lineWidth = 2
    ctx.setLineDash([3, 3])
    ctx.beginPath()
    ctx.ellipse(0, 0, 10, 3.5, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
  } else {
    ctx.fillStyle = '#FC6818'
    ctx.beginPath()
    ctx.ellipse(0, 0, 10, 3.5, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fde68a'
    ctx.fillRect(-12, -3, 2, 6)
  }
  ctx.restore()
}

export function drawMap(
  ctx: CanvasRenderingContext2D,
  v: MapView,
  L: SurveyLevel,
  bathy: HTMLCanvasElement | null,
  s: SurveyState | null,
  plan: PlanOverlay,
  opts: { showTruth: boolean; now: number; reduced: boolean },
) {
  const { w, h, dpr, scale } = v
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.fillStyle = '#0A1120'
  ctx.fillRect(0, 0, w, h)
  const P = (x: number, y: number) => toScreen(v, L, x, y)
  const [x0, y0] = P(0, L.height)
  if (bathy) {
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(bathy, x0, y0, L.width * scale, L.height * scale)
  }

  // Pinnacle labels
  ctx.font = '600 10px Inter, system-ui, sans-serif'
  for (const p of L.pinnacles) {
    const [px, py] = P(p.x, p.y)
    ctx.fillStyle = 'rgba(253,230,138,0.85)'
    ctx.beginPath()
    ctx.moveTo(px, py - 5)
    ctx.lineTo(px + 5, py + 4)
    ctx.lineTo(px - 5, py + 4)
    ctx.closePath()
    ctx.fill()
    if (scale > 0.55) {
      ctx.fillStyle = 'rgba(253,230,138,0.8)'
      ctx.fillText(`${(seabedDepth(L, p.x, p.y)).toFixed(0)} m`, px + 7, py + 4)
    }
  }

  // Current arrows (at cruising height)
  const cur = currentAt(L, plan.altitude)
  const cm = Math.hypot(cur.x, cur.y)
  if (cm > 0.01) {
    ctx.strokeStyle = 'rgba(165,243,252,0.28)'
    ctx.lineWidth = 1.5
    const step = 110
    const drift = opts.reduced ? 0 : ((opts.now * 12) % step) - step / 2
    for (let gx = step / 2; gx < L.width; gx += step)
      for (let gy = step / 2; gy < L.height; gy += step) {
        const ax = gx + (cur.x / cm) * drift * 0.3
        const ay = gy + (cur.y / cm) * drift * 0.3
        const [sx, sy] = P(ax, ay)
        const len = 14 + cm * 30
        const ex = sx + (cur.x / cm) * len
        const ey = sy - (cur.y / cm) * len
        ctx.beginPath()
        ctx.moveTo(sx, sy)
        ctx.lineTo(ex, ey)
        const a = Math.atan2(ey - sy, ex - sx)
        ctx.lineTo(ex - Math.cos(a - 0.5) * 6, ey - Math.sin(a - 0.5) * 6)
        ctx.moveTo(ex, ey)
        ctx.lineTo(ex - Math.cos(a + 0.5) * 6, ey - Math.sin(a + 0.5) * 6)
        ctx.stroke()
      }
  }

  // Ship tracker range
  const [shx, shy] = P(L.ship.x, L.ship.y)
  ctx.setLineDash([2, 5])
  ctx.strokeStyle = 'rgba(252,104,24,0.35)'
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.arc(shx, shy, USBL_RANGE * scale, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])

  // Search area / survey box
  if (L.searchArea) {
    const [cx, cy] = P(L.searchArea.x, L.searchArea.y)
    ctx.fillStyle = 'rgba(0,229,255,0.06)'
    ctx.strokeStyle = 'rgba(0,229,255,0.6)'
    ctx.setLineDash([7, 6])
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(cx, cy, L.searchArea.r * scale, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = 'rgba(165,243,252,0.9)'
    ctx.font = '700 11px Inter, system-ui, sans-serif'
    ctx.fillText('Lander lost somewhere here', cx - L.searchArea.r * scale + 6, cy - L.searchArea.r * scale - 6)
  }
  if (L.box) {
    const [bx0, by1] = P(L.box.x0, L.box.y1)
    const [bx1, by0] = P(L.box.x1, L.box.y0)
    // Coverage
    if (s && s.cover.length) {
      const cs = CELL * scale
      for (let r = 0; r < s.coverRows; r++)
        for (let c = 0; c < s.coverCols; c++) {
          const val = s.cover[r * s.coverCols + c]
          if (!val) continue
          ctx.fillStyle = val === 1 ? 'rgba(45,212,191,0.55)' : val === 2 ? 'rgba(251,146,60,0.55)' : 'rgba(148,163,184,0.5)'
          const [sx, sy] = P(L.box.x0 + c * CELL, L.box.y0 + (r + 1) * CELL)
          ctx.fillRect(sx, sy, cs + 0.5, cs + 0.5)
        }
    }
    ctx.strokeStyle = 'rgba(0,229,255,0.75)'
    ctx.setLineDash([7, 6])
    ctx.lineWidth = 2
    ctx.strokeRect(bx0, by1, bx1 - bx0, by0 - by1)
    ctx.setLineDash([])
    ctx.fillStyle = 'rgba(165,243,252,0.9)'
    ctx.font = '700 11px Inter, system-ui, sans-serif'
    ctx.fillText('Reef to map', bx0 + 4, by1 - 6)
  }

  // Planned route
  const route = plan.route
  if (route.length) {
    const pts: [number, number][] = [[L.ship.x, L.ship.y], ...route, [L.ship.x, L.ship.y]]
    if (plan.swath && !s) {
      const sw = swathWidth(plan.altitude) * scale
      ctx.strokeStyle = 'rgba(45,212,191,0.22)'
      ctx.lineWidth = sw
      ctx.lineCap = 'butt'
      ctx.beginPath()
      route.forEach(([x, y], i) => {
        const [sx, sy] = P(x, y)
        if (i === 0) ctx.moveTo(sx, sy)
        else ctx.lineTo(sx, sy)
      })
      ctx.stroke()
    }
    if (plan.hearing && !s) {
      ctx.strokeStyle = 'rgba(0,229,255,0.13)'
      ctx.lineWidth = plan.hearing * 2 * scale
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      route.forEach(([x, y], i) => {
        const [sx, sy] = P(x, y)
        if (i === 0) ctx.moveTo(sx, sy)
        else ctx.lineTo(sx, sy)
      })
      ctx.stroke()
      ctx.lineCap = 'butt'
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'
    ctx.lineWidth = 1.5
    ctx.setLineDash([5, 5])
    ctx.beginPath()
    pts.forEach(([x, y], i) => {
      const [sx, sy] = P(x, y)
      if (i === 0) ctx.moveTo(sx, sy)
      else ctx.lineTo(sx, sy)
    })
    ctx.stroke()
    ctx.setLineDash([])
    if (plan.hearing) {
      ctx.font = '800 11px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      route.forEach(([x, y], i) => {
        const [sx, sy] = P(x, y)
        ctx.fillStyle = '#FC6818'
        ctx.beginPath()
        ctx.arc(sx, sy, 10, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#1A1103'
        ctx.fillText(String(i + 1), sx, sy + 4)
      })
      ctx.textAlign = 'start'
    }
  }

  if (s) {
    // Pings
    for (const p of s.pings) {
      const [px, py] = P(p.x, p.y)
      ctx.strokeStyle = p.heard ? 'rgba(253,224,71,0.9)' : 'rgba(0,229,255,0.25)'
      ctx.lineWidth = p.heard ? 2 : 1
      ctx.beginPath()
      ctx.arc(px, py, p.heard ? 6 : 3, 0, Math.PI * 2)
      ctx.stroke()
    }
    // Estimated track (what the robot believes)
    ctx.strokeStyle = '#00e5ff'
    ctx.lineWidth = 2
    ctx.setLineDash([6, 4])
    ctx.beginPath()
    s.track.forEach((t, i) => {
      const [sx, sy] = P(t.ex, t.ey)
      if (i === 0) ctx.moveTo(sx, sy)
      else ctx.lineTo(sx, sy)
    })
    ctx.lineTo(...P(s.ex, s.ey))
    ctx.stroke()
    ctx.setLineDash([])
    // True track
    ctx.strokeStyle = '#FC6818'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    s.track.forEach((t, i) => {
      const [sx, sy] = P(t.x, t.y)
      if (i === 0) ctx.moveTo(sx, sy)
      else ctx.lineTo(sx, sy)
    })
    ctx.lineTo(...P(s.x, s.y))
    ctx.stroke()
    // Mark
    if (s.mark) {
      const [mx, my] = P(s.mark.x, s.mark.y)
      ctx.strokeStyle = '#fde047'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(mx - 7, my - 7)
      ctx.lineTo(mx + 7, my + 7)
      ctx.moveTo(mx + 7, my - 7)
      ctx.lineTo(mx - 7, my + 7)
      ctx.stroke()
    }
    if (opts.showTruth && L.buoy) {
      const [bx, by] = P(L.buoy.x, L.buoy.y)
      ctx.fillStyle = '#ff5a1f'
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(bx, by, 6, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }
    const [ex, ey] = P(s.ex, s.ey)
    drawAuv(ctx, ex, ey, s.heading, true)
    const [tx, ty] = P(s.x, s.y)
    drawAuv(ctx, tx, ty, s.heading, false)
  }

  drawShip(ctx, shx, shy)

  if (plan.cursor) {
    const [cx, cy] = P(plan.cursor[0], plan.cursor[1])
    ctx.strokeStyle = '#FFA878'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(cx - 12, cy)
    ctx.lineTo(cx + 12, cy)
    ctx.moveTo(cx, cy - 12)
    ctx.lineTo(cx, cy + 12)
    ctx.stroke()
  }

  // Scale bar + north
  const bar = 100 * scale
  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  ctx.fillRect(12, h - 18, bar, 3)
  ctx.font = '600 11px Inter, system-ui, sans-serif'
  ctx.fillText('100 m', 12, h - 24)
  ctx.fillText('N ↑', w - 34, h - 14)
}

/** The side view: seabed and robot depth along time (or along the planned route). */
export function drawProfile(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  dpr: number,
  L: SurveyLevel,
  s: SurveyState | null,
  planRoute: [number, number][],
  altitude: number,
) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.fillStyle = '#0d1a2e'
  ctx.fillRect(0, 0, w, h)
  // Sample either the flown track or the planned route
  const samples: { bed: number; z: number; lock: boolean }[] = []
  if (s && s.track.length > 1) {
    for (const t of s.track) samples.push({ bed: t.bed, z: t.z, lock: t.lock })
  } else {
    const pts: [number, number][] = [[L.ship.x, L.ship.y], ...planRoute, [L.ship.x, L.ship.y]]
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1]
      const [bx, by] = pts[i]
      const n = Math.max(2, Math.ceil(Math.hypot(bx - ax, by - ay) / 10))
      for (let k = 0; k < n; k++) {
        const x = ax + ((bx - ax) * k) / n
        const y = ay + ((by - ay) * k) / n
        const bed = seabedDepth(L, x, y)
        samples.push({ bed, z: Math.max(0, bed - altitude), lock: altitude <= DVL_MAX_ALT })
      }
    }
  }
  if (samples.length < 2) return
  const maxD = Math.max(...samples.map((p) => p.bed)) + 5
  const X = (i: number) => (i / (samples.length - 1)) * (w - 8) + 4
  const Y = (d: number) => 6 + (clamp(d, 0, maxD) / maxD) * (h - 16)
  // DVL band: within 30 m of the seabed
  ctx.fillStyle = 'rgba(45,212,191,0.12)'
  ctx.beginPath()
  samples.forEach((p, i) => (i === 0 ? ctx.moveTo(X(i), Y(p.bed - DVL_MAX_ALT)) : ctx.lineTo(X(i), Y(p.bed - DVL_MAX_ALT))))
  for (let i = samples.length - 1; i >= 0; i--) ctx.lineTo(X(i), Y(samples[i].bed))
  ctx.closePath()
  ctx.fill()
  // Seabed
  ctx.fillStyle = '#6b5a3e'
  ctx.beginPath()
  ctx.moveTo(X(0), h)
  samples.forEach((p, i) => ctx.lineTo(X(i), Y(p.bed)))
  ctx.lineTo(X(samples.length - 1), h)
  ctx.closePath()
  ctx.fill()
  // Robot depth
  ctx.lineWidth = 2.5
  for (let i = 1; i < samples.length; i++) {
    ctx.strokeStyle = samples[i].lock ? '#2dd4bf' : '#FC6818'
    ctx.beginPath()
    ctx.moveTo(X(i - 1), Y(samples[i - 1].z))
    ctx.lineTo(X(i), Y(samples[i].z))
    ctx.stroke()
  }
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.font = '600 10px Inter, system-ui, sans-serif'
  ctx.fillText(`Side view · seabed to ${maxD.toFixed(0)} m · green band = DVL can lock (≤ ${DVL_MAX_ALT} m above seabed)`, 6, h - 4)
}
