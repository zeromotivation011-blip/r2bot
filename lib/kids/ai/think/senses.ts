// lib/kids/ai/think/senses.ts
// The world model of Robot Senses: a small room seen top-down (metres, x to
// the right, y down the page), objects with a height and a material, and the
// maths each sensor uses. One ray-caster drives every view, so the camera,
// the depth camera, the lidar and the ultrasonic sensor always agree about
// the same room — and disagree exactly where real sensors do:
//   - camera: needs light; sees colour; glass looks faint
//   - depth camera (active infrared): works in the dark; glass is invisible
//     to it; noise grows with distance
//   - 2-D lidar: one laser plane 20 cm above the floor; misses anything lower;
//     light passes through glass
//   - ultrasonic: a wide cone of sound; hears glass; soft things swallow it
//   - line sensor: five infrared eyes pointing at the floor
// No browser APIs.

import { gauss } from './common'

export type Material = 'solid' | 'glass' | 'soft'

export interface RoomObject {
  id: string
  name: string
  kind: 'box' | 'cyl'
  /** Centre, metres. */
  x: number
  y: number
  /** Box half-sizes (or radius in hx for a cylinder). */
  hx: number
  hy: number
  /** Height, metres. */
  h: number
  color: string
  material: Material
}

export const ROOM_W = 6
export const ROOM_H = 5
export const WALL_H = 2.4

export const CAM_HEIGHT = 0.3
export const CAM_FOV = (62 * Math.PI) / 180
export const LIDAR_HEIGHT = 0.2
export const LIDAR_RANGE = 8
export const SONAR_HEIGHT = 0.12
export const SONAR_HALF_ANGLE = (15 * Math.PI) / 180
export const SONAR_RANGE = 4
export const DEPTH_RANGE = 5

export interface Pose {
  x: number
  y: number
  /** Heading in radians; 0 = +x (right), π/2 = +y (down the map). */
  a: number
}

export interface Hit {
  dist: number
  obj: RoomObject | null // null = room wall
  /** 0..1 shade from the face direction (simple lighting). */
  shade: number
}

/** Ray against an axis-aligned box (slab method). Returns the entry distance and face. */
function rayBox(ox: number, oy: number, dx: number, dy: number, o: RoomObject): { t: number; nx: number; ny: number } | null {
  const minX = o.x - o.hx
  const maxX = o.x + o.hx
  const minY = o.y - o.hy
  const maxY = o.y + o.hy
  let tmin = -Infinity
  let tmax = Infinity
  let nx = 0
  let ny = 0
  if (Math.abs(dx) < 1e-12) {
    if (ox < minX || ox > maxX) return null
  } else {
    const t1 = (minX - ox) / dx
    const t2 = (maxX - ox) / dx
    const tn = Math.min(t1, t2)
    if (tn > tmin) {
      tmin = tn
      nx = dx > 0 ? -1 : 1
      ny = 0
    }
    tmax = Math.min(tmax, Math.max(t1, t2))
  }
  if (Math.abs(dy) < 1e-12) {
    if (oy < minY || oy > maxY) return null
  } else {
    const t1 = (minY - oy) / dy
    const t2 = (maxY - oy) / dy
    const tn = Math.min(t1, t2)
    if (tn > tmin) {
      tmin = tn
      nx = 0
      ny = dy > 0 ? -1 : 1
    }
    tmax = Math.min(tmax, Math.max(t1, t2))
  }
  if (tmax < Math.max(tmin, 0)) return null
  if (tmin < 0) return null // inside the box
  return { t: tmin, nx, ny }
}

function rayCyl(ox: number, oy: number, dx: number, dy: number, o: RoomObject): { t: number; nx: number; ny: number } | null {
  const fx = ox - o.x
  const fy = oy - o.y
  const b = fx * dx + fy * dy
  const c = fx * fx + fy * fy - o.hx * o.hx
  const disc = b * b - c
  if (disc < 0) return null
  const t = -b - Math.sqrt(disc)
  if (t < 0) return null
  const px = fx + dx * t
  const py = fy + dy * t
  const n = Math.hypot(px, py) || 1
  return { t, nx: px / n, ny: py / n }
}

const LIGHT = { x: -0.45, y: -0.8 }
function faceShade(nx: number, ny: number): number {
  return 0.55 + 0.45 * Math.max(0, -(nx * LIGHT.x + ny * LIGHT.y))
}

/** Distance to the room walls along a ray from inside the room. */
function rayRoom(ox: number, oy: number, dx: number, dy: number): Hit {
  let t = Infinity
  let nx = 0
  let ny = 0
  if (dx > 1e-12 && (ROOM_W - ox) / dx < t) {
    t = (ROOM_W - ox) / dx
    nx = -1
    ny = 0
  }
  if (dx < -1e-12 && -ox / dx < t) {
    t = -ox / dx
    nx = 1
    ny = 0
  }
  if (dy > 1e-12 && (ROOM_H - oy) / dy < t) {
    t = (ROOM_H - oy) / dy
    nx = 0
    ny = -1
  }
  if (dy < -1e-12 && -oy / dy < t) {
    t = -oy / dy
    nx = 0
    ny = 1
  }
  return { dist: t, obj: null, shade: faceShade(nx, ny) * 0.9 }
}

/** Every surface a ray meets, nearest first, ending with the room wall. */
export function castAll(objects: RoomObject[], ox: number, oy: number, angle: number): Hit[] {
  const dx = Math.cos(angle)
  const dy = Math.sin(angle)
  const wall = rayRoom(ox, oy, dx, dy)
  const hits: Hit[] = []
  for (const o of objects) {
    const r = o.kind === 'box' ? rayBox(ox, oy, dx, dy, o) : rayCyl(ox, oy, dx, dy, o)
    if (r && r.t < wall.dist) hits.push({ dist: r.t, obj: o, shade: faceShade(r.nx, r.ny) })
  }
  hits.sort((p, q) => p.dist - q.dist)
  hits.push(wall)
  return hits
}

/**
 * The first surface a sensor mounted at `height` would detect. `seesGlass`
 * and `seesSoft` say which materials reflect this sensor's signal.
 */
export function firstHit(hits: Hit[], height: number, seesGlass: boolean, seesSoft: boolean): Hit {
  for (const h of hits) {
    if (!h.obj) return h
    if (h.obj.h < height) continue
    if (h.obj.material === 'glass' && !seesGlass) continue
    if (h.obj.material === 'soft' && !seesSoft) continue
    return h
  }
  return hits[hits.length - 1]
}

export interface LidarPoint {
  angle: number
  range: number
  /** World position of the return, metres. */
  x: number
  y: number
}

export function lidarScan(objects: RoomObject[], pose: Pose, rays: number, noise: number, rng: () => number): LidarPoint[] {
  const out: LidarPoint[] = []
  for (let i = 0; i < rays; i++) {
    const rel = (i / rays) * Math.PI * 2
    const ang = pose.a + rel
    const hit = firstHit(castAll(objects, pose.x, pose.y, ang), LIDAR_HEIGHT, false, true)
    if (hit.dist > LIDAR_RANGE) continue
    // Real 2-D lidars are accurate to about ±3 cm; the slider adds more.
    const range = Math.max(0.05, hit.dist + gauss(rng) * (0.015 + noise * 0.25))
    out.push({ angle: rel, range, x: pose.x + Math.cos(ang) * range, y: pose.y + Math.sin(ang) * range })
  }
  return out
}

/** Ultrasonic: the nearest echo anywhere inside the cone. */
export function sonarRead(objects: RoomObject[], pose: Pose, noise: number, rng: () => number): { range: number | null; angle: number } {
  let best = Infinity
  let bestA = 0
  const N = 13
  for (let i = 0; i < N; i++) {
    const rel = -SONAR_HALF_ANGLE + (2 * SONAR_HALF_ANGLE * i) / (N - 1)
    const hit = firstHit(castAll(objects, pose.x, pose.y, pose.a + rel), SONAR_HEIGHT, true, false)
    if (hit.dist < best) {
      best = hit.dist
      bestA = rel
    }
  }
  if (best > SONAR_RANGE) return { range: null, angle: 0 }
  return { range: Math.max(0.02, best + gauss(rng) * (0.01 + noise * 0.3)), angle: bestA }
}

// ── The line on the floor ─────────────────────────────────────────────────

export type Seg = [number, number, number, number]

/** A loop of black tape on the floor (polyline, metres). */
export const TAPE: Seg[] = (() => {
  const pts: [number, number][] = [
    [0.8, 4.3],
    [0.8, 1.6],
    [1.6, 0.8],
    [3.0, 0.8],
    [3.0, 2.2],
    [5.2, 2.2],
    [5.2, 4.3],
    [0.8, 4.3],
  ]
  const s: Seg[] = []
  for (let i = 0; i < pts.length - 1; i++) s.push([pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]])
  return s
})()
export const TAPE_HALF = 0.025

function distToSeg(px: number, py: number, s: Seg): number {
  const [x1, y1, x2, y2] = s
  const vx = x2 - x1
  const vy = y2 - y1
  const l2 = vx * vx + vy * vy
  const t = l2 ? Math.max(0, Math.min(1, ((px - x1) * vx + (py - y1) * vy) / l2)) : 0
  return Math.hypot(px - (x1 + vx * t), py - (y1 + vy * t))
}

export const LINE_SENSORS = 5
export const LINE_SPACING = 0.025
export const LINE_AHEAD = 0.12

/**
 * Infrared reflectance under each of the five sensors (0 = black tape,
 * 1 = light floor), left to right as the robot sees it.
 */
export function lineRead(pose: Pose, noise: number, rng: () => number): number[] {
  const fx = pose.x + Math.cos(pose.a) * LINE_AHEAD
  const fy = pose.y + Math.sin(pose.a) * LINE_AHEAD
  // Left of the robot is heading − 90°.
  const lx = Math.cos(pose.a - Math.PI / 2)
  const ly = Math.sin(pose.a - Math.PI / 2)
  const out: number[] = []
  for (let i = 0; i < LINE_SENSORS; i++) {
    const off = (2 - i) * LINE_SPACING
    const sx = fx + lx * off
    const sy = fy + ly * off
    const d = Math.min(...TAPE.map((s) => distToSeg(sx, sy, s)))
    // The sensor sees a small spot, so the edge of the tape reads grey.
    const cover = Math.max(0, Math.min(1, (TAPE_HALF + 0.008 - d) / 0.016))
    const v = 0.88 - 0.78 * cover + gauss(rng) * (0.02 + noise * 0.25)
    out.push(Math.max(0, Math.min(1, v)))
  }
  return out
}

export function lineSensorPoints(pose: Pose): { x: number; y: number }[] {
  const fx = pose.x + Math.cos(pose.a) * LINE_AHEAD
  const fy = pose.y + Math.sin(pose.a) * LINE_AHEAD
  const lx = Math.cos(pose.a - Math.PI / 2)
  const ly = Math.sin(pose.a - Math.PI / 2)
  return Array.from({ length: LINE_SENSORS }, (_, i) => ({ x: fx + lx * (2 - i) * LINE_SPACING, y: fy + ly * (2 - i) * LINE_SPACING }))
}

// ── Moving the robot ─────────────────────────────────────────────────────

export const ROBOT_R = 0.18

export function blocked(objects: RoomObject[], x: number, y: number): boolean {
  if (x < ROBOT_R || y < ROBOT_R || x > ROOM_W - ROBOT_R || y > ROOM_H - ROBOT_R) return true
  for (const o of objects) {
    if (o.h < 0.05) continue
    if (o.kind === 'cyl') {
      if (Math.hypot(x - o.x, y - o.y) < o.hx + ROBOT_R) return true
    } else {
      const cx = Math.max(o.x - o.hx, Math.min(x, o.x + o.hx))
      const cy = Math.max(o.y - o.hy, Math.min(y, o.y + o.hy))
      if (Math.hypot(x - cx, y - cy) < ROBOT_R) return true
    }
  }
  return false
}
