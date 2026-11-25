// components/kids/games/drone-hover/plot.ts
// The live flight graph: what engineers actually look at when they tune.
// Top lane: height (and, in Legend, sideways position) against the target.
// Bottom lane: Cadet — thrust against weight; Pilot/Ace — the P, I and D
// pushes in newtons; Legend — tilt angle and the wind.

import type { Sample, TierIndex } from './sim'

export const PLOT_COLORS = {
  target: '#fbbf24',
  height: '#22d3ee',
  x: '#f472b6',
  thrust: '#38bdf8',
  weight: '#f87171',
  p: '#fb7185',
  i: '#a3e635',
  d: '#a78bfa',
  tilt: '#f472b6',
  wind: 'rgba(255,255,255,0.55)',
  predicted: 'rgba(34,211,238,0.35)',
}

interface PlotOpts {
  tier: TierIndex
  duration: number
  worldH: number
  worldW: number
  /** Show the last N seconds (Cadet) instead of the whole mission. */
  window?: number
  predicted?: Sample[]
}

type Getter = (s: Sample) => number

function lane(
  ctx: CanvasRenderingContext2D,
  rows: Sample[],
  t0: number,
  t1: number,
  x: number,
  y: number,
  w: number,
  h: number,
  lo: number,
  hi: number,
  series: { get: Getter; color: string; dash?: number[]; width?: number; step?: boolean; rows?: Sample[] }[],
  label: string,
): void {
  ctx.fillStyle = 'rgba(15,23,42,0.6)'
  ctx.fillRect(x, y, w, h)
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  ctx.lineWidth = 1
  for (let k = 1; k < 4; k++) {
    const gy = y + (h * k) / 4
    ctx.beginPath()
    ctx.moveTo(x, gy)
    ctx.lineTo(x + w, gy)
    ctx.stroke()
  }
  if (lo < 0 && hi > 0) {
    const zy = y + h - ((0 - lo) / (hi - lo)) * h
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'
    ctx.beginPath()
    ctx.moveTo(x, zy)
    ctx.lineTo(x + w, zy)
    ctx.stroke()
  }
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.font = '10px ui-sans-serif, system-ui'
  ctx.textAlign = 'left'
  ctx.fillText(label, x + 6, y + 12)
  ctx.textAlign = 'right'
  ctx.fillText(String(Math.round(hi * 10) / 10), x + w - 4, y + 11)
  ctx.fillText(String(Math.round(lo * 10) / 10), x + w - 4, y + h - 3)

  const tx = (t: number) => x + ((t - t0) / (t1 - t0)) * w
  const vy = (v: number) => y + h - ((Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)) * h
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  for (const s of series) {
    const data = s.rows ?? rows
    ctx.strokeStyle = s.color
    ctx.lineWidth = s.width ?? 1.8
    ctx.setLineDash(s.dash ?? [])
    ctx.beginPath()
    let started = false
    let prevY = 0
    for (const r of data) {
      if (r.t < t0) continue
      const X = tx(r.t)
      const Y = vy(s.get(r))
      if (!started) {
        ctx.moveTo(X, Y)
        started = true
      } else {
        if (s.step) ctx.lineTo(X, prevY)
        ctx.lineTo(X, Y)
      }
      prevY = Y
    }
    ctx.stroke()
  }
  ctx.restore()
}

export function drawPlot(ctx: CanvasRenderingContext2D, w: number, h: number, dpr: number, rows: Sample[], o: PlotOpts): void {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)
  const last = rows.length ? rows[rows.length - 1].t : 0
  const t1 = o.window ? Math.max(o.window, last) : o.duration
  const t0 = o.window ? Math.max(0, t1 - o.window) : 0
  const gap = 6
  const topH = Math.round((h - gap) * 0.58)
  const botH = h - gap - topH

  if (o.tier === 3) {
    lane(ctx, rows, t0, t1, 0, 0, w, topH, 0, Math.max(o.worldH, o.worldW), [
      { get: (r) => r.xt, color: PLOT_COLORS.target, dash: [5, 4], step: true },
      { get: (r) => r.zt, color: PLOT_COLORS.target, dash: [2, 3], step: true },
      { get: (r) => r.x, color: PLOT_COLORS.x },
      { get: (r) => r.z, color: PLOT_COLORS.height },
    ], 'position x (pink) · height (cyan) · targets (gold), m')
    lane(ctx, rows, t0, t1, 0, topH + gap, w, botH, -30, 30, [
      { get: (r) => r.wind * 3, color: PLOT_COLORS.wind, width: 1 },
      { get: (r) => r.tilt, color: PLOT_COLORS.tilt },
    ], 'tilt (deg) · wind (white)')
    return
  }

  const zSeries: { get: Getter; color: string; dash?: number[]; width?: number; step?: boolean; rows?: Sample[] }[] = []
  if (o.predicted?.length) zSeries.push({ get: (r) => r.z, color: PLOT_COLORS.predicted, dash: [3, 3], width: 2.5, rows: o.predicted })
  zSeries.push({ get: (r) => r.zt, color: PLOT_COLORS.target, dash: [6, 4], step: true })
  zSeries.push({ get: (r) => r.z, color: PLOT_COLORS.height, width: 2.2 })
  lane(ctx, rows, t0, t1, 0, 0, w, topH, 0, o.worldH - 0.5, zSeries, o.predicted?.length ? 'height · target · predicted (dotted), m' : 'height (cyan) vs target (gold), m')

  if (o.tier === 0) {
    lane(ctx, rows, t0, t1, 0, topH + gap, w, botH, 0, 22, [
      { get: (r) => r.weight, color: PLOT_COLORS.weight, dash: [4, 3] },
      { get: (r) => r.thrust, color: PLOT_COLORS.thrust },
    ], 'thrust (blue) vs weight (red), N')
    return
  }
  const series: { get: Getter; color: string; width?: number }[] = [{ get: (r) => r.p, color: PLOT_COLORS.p }]
  if (o.tier === 2) series.push({ get: (r) => r.i, color: PLOT_COLORS.i })
  series.push({ get: (r) => r.d, color: PLOT_COLORS.d })
  lane(ctx, rows, t0, t1, 0, topH + gap, w, botH, -15, 15, series, o.tier === 2 ? 'extra push from P (pink) · I (green) · D (purple), N' : 'extra push from P (pink) · damper (purple), N')
}
