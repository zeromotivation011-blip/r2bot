// components/kids/net/link-render.ts
// Draws the Link Lab arena on a 2D canvas: the yard, walls, pits, the radio
// shadow, the dock, and the robot AS THE OPERATOR SEES IT (the last video
// frame that arrived). After a run, `reveal` adds the true path and where the
// robot really was. Browser-only (CanvasRenderingContext2D); no React.

import { ARENA, ROBOT_R, inWeak, predictedPose, videoAge, type LinkState, type Pose } from './link-sim'

export interface DrawOpts {
  /** CSS pixel width of the canvas. */
  width: number
  dpr: number
  /** Show the truth (after the run). */
  reveal: boolean
  highContrast?: boolean
}

const NAVY = '#0A1120'
const FLOOR = '#111C32'
const GRID = 'rgba(255,255,255,0.05)'
const WALL = '#3A4C6E'
const ORANGE = '#FC6818'
const AMBER = '#FBBF24'
const CYAN = '#22D3EE'
const GREEN = '#34D399'

function robotShape(ctx: CanvasRenderingContext2D, p: Pose, k: number, fill: string, stroke: string, dashed = false) {
  ctx.save()
  ctx.translate(p.x * k, p.y * k)
  ctx.rotate(p.h)
  const r = ROBOT_R * k
  ctx.beginPath()
  ctx.roundRect(-r, -r * 0.85, r * 2, r * 1.7, r * 0.35)
  if (dashed) {
    ctx.setLineDash([4, 4])
    ctx.lineWidth = 2
    ctx.strokeStyle = stroke
    ctx.stroke()
    ctx.setLineDash([])
  } else {
    ctx.fillStyle = fill
    ctx.fill()
    ctx.lineWidth = 2
    ctx.strokeStyle = stroke
    ctx.stroke()
    // wheels
    ctx.fillStyle = '#0B1222'
    ctx.fillRect(-r * 0.7, -r * 1.05, r * 1.4, r * 0.28)
    ctx.fillRect(-r * 0.7, r * 0.77, r * 1.4, r * 0.28)
  }
  // nose (which way it faces)
  ctx.beginPath()
  ctx.moveTo(r * 1.05, 0)
  ctx.lineTo(r * 0.45, -r * 0.4)
  ctx.lineTo(r * 0.45, r * 0.4)
  ctx.closePath()
  ctx.fillStyle = dashed ? stroke : NAVY
  ctx.fill()
  ctx.restore()
}

function pathLine(ctx: CanvasRenderingContext2D, pts: Pose[], k: number, color: string, dash: number[]) {
  if (pts.length < 2) return
  ctx.save()
  ctx.setLineDash(dash)
  ctx.lineWidth = 2.5
  ctx.strokeStyle = color
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(pts[0].x * k, pts[0].y * k)
  for (const p of pts) ctx.lineTo(p.x * k, p.y * k)
  ctx.stroke()
  ctx.restore()
}

export function drawLink(ctx: CanvasRenderingContext2D, s: LinkState, o: DrawOpts) {
  const k = o.width / ARENA.w
  const H = ARENA.h * k
  ctx.setTransform(o.dpr, 0, 0, o.dpr, 0, 0)
  ctx.clearRect(0, 0, o.width, H)

  // floor + grid (1 m squares)
  ctx.fillStyle = FLOOR
  ctx.fillRect(0, 0, o.width, H)
  ctx.strokeStyle = GRID
  ctx.lineWidth = 1
  for (let x = 1; x < ARENA.w; x++) {
    ctx.beginPath()
    ctx.moveTo(x * k, 0)
    ctx.lineTo(x * k, H)
    ctx.stroke()
  }
  for (let y = 1; y < ARENA.h; y++) {
    ctx.beginPath()
    ctx.moveTo(0, y * k)
    ctx.lineTo(o.width, y * k)
    ctx.stroke()
  }

  const font = Math.max(10, Math.round(k * 0.32))
  ctx.font = `700 ${font}px Inter, system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // radio shadow: diagonal hatching
  for (const r of s.level.link.weak) {
    ctx.save()
    ctx.fillStyle = 'rgba(34,211,238,0.07)'
    ctx.fillRect(r.x * k, r.y * k, r.w * k, r.h * k)
    ctx.beginPath()
    ctx.rect(r.x * k, r.y * k, r.w * k, r.h * k)
    ctx.clip()
    ctx.strokeStyle = 'rgba(34,211,238,0.22)'
    ctx.lineWidth = 1.5
    for (let d = -r.h * k; d < r.w * k; d += 12) {
      ctx.beginPath()
      ctx.moveTo(r.x * k + d, r.y * k + r.h * k)
      ctx.lineTo(r.x * k + d + r.h * k, r.y * k)
      ctx.stroke()
    }
    ctx.restore()
    ctx.fillStyle = 'rgba(165,243,252,0.9)'
    ctx.fillText('Radio shadow', (r.x + r.w / 2) * k, (r.y + 0.4) * k)
  }

  // pits: dark with warning stripes on the edge
  for (const r of s.level.pits) {
    ctx.fillStyle = '#05080F'
    ctx.fillRect(r.x * k, r.y * k, r.w * k, r.h * k)
    ctx.save()
    ctx.beginPath()
    ctx.rect(r.x * k, r.y * k, r.w * k, r.h * k)
    ctx.clip()
    ctx.strokeStyle = o.highContrast ? '#FFFFFF' : AMBER
    ctx.lineWidth = 5
    ctx.setLineDash([8, 8])
    ctx.strokeRect(r.x * k + 2, r.y * k + 2, r.w * k - 4, r.h * k - 4)
    ctx.restore()
    ctx.fillStyle = AMBER
    ctx.fillText('PIT', (r.x + r.w / 2) * k, (r.y + r.h / 2) * k)
  }

  // walls
  for (const r of s.level.walls) {
    ctx.fillStyle = WALL
    ctx.fillRect(r.x * k, r.y * k, r.w * k, r.h * k)
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'
    ctx.lineWidth = 1
    ctx.strokeRect(r.x * k + 0.5, r.y * k + 0.5, r.w * k - 1, r.h * k - 1)
  }

  // dock
  const d = s.level.dock
  ctx.beginPath()
  ctx.arc(d.x * k, d.y * k, d.r * k, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(52,211,153,0.16)'
  ctx.fill()
  ctx.setLineDash([6, 5])
  ctx.lineWidth = 2.5
  ctx.strokeStyle = GREEN
  ctx.stroke()
  ctx.setLineDash([])
  ctx.fillStyle = GREEN
  ctx.fillText('DOCK', d.x * k, (d.y + d.r + 0.3) * k)

  // start marker
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.fillText('START', s.level.start.x * k, (s.level.start.y - 0.75) * k)

  if (o.reveal) {
    pathLine(ctx, s.seenPath, k, CYAN, [5, 6])
    pathLine(ctx, s.path, k, ORANGE, [])
    if (s.seen) robotShape(ctx, s.seen.pose, k, 'rgba(34,211,238,0.35)', CYAN)
    robotShape(ctx, s.pose, k, ORANGE, '#FFFFFF')
    return
  }

  // the operator's view: the last video frame, plus the predicted position
  if (s.prot.predict && s.outcome === 'running') {
    const pp = predictedPose(s)
    if (pp) robotShape(ctx, pp, k, 'transparent', ORANGE, true)
  }
  if (s.seen) {
    robotShape(ctx, s.seen.pose, k, CYAN, '#E0FBFF')
    const age = videoAge(s)
    if (age > 0.25) {
      ctx.fillStyle = age > 1 ? AMBER : 'rgba(224,251,255,0.9)'
      ctx.fillText(`video ${age.toFixed(1)} s old`, s.seen.pose.x * k, (s.seen.pose.y - 0.75) * k)
    }
  }
  if (inWeak(s, s.seen?.pose.x, s.seen?.pose.y) && videoAge(s) > 0.6) {
    ctx.fillStyle = 'rgba(10,17,32,0.55)'
    ctx.fillRect(0, H - k * 0.9, o.width, k * 0.9)
    ctx.fillStyle = '#A5F3FC'
    ctx.fillText('No video: the robot is in the radio shadow', o.width / 2, H - k * 0.45)
  }
}
