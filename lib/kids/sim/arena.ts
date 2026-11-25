// lib/kids/sim/arena.ts
// The shape of a physics arena, in metres. Framework-free data: the engine
// builds Rapier colliders from it and the renderer builds three.js meshes from
// the same object, so what the child sees is exactly what the physics uses.
//
// Coordinates: x across, z forward, y up. The floor is the plane y = 0.
// Heading 0 faces +z; heading grows when the robot turns RIGHT (clockwise seen
// from above), like a compass.

export type Vec2 = [number, number]

/** What the floor is made of. Changes how much grip and drag each drive gets. */
export type Surface = 'tile' | 'carpet' | 'sand' | 'ice' | 'rocks'

/** Colours a colour sensor (or a lit camera) can report. */
export type FloorColor = 'white' | 'black' | 'red' | 'green' | 'blue' | 'yellow'

export type Shape2D =
  | { kind: 'rect'; center: Vec2; size: Vec2 }
  | { kind: 'circle'; center: Vec2; radius: number }

export interface FloorRegion {
  shape: Shape2D
  /** Overrides the arena floor's surface inside the shape. */
  surface?: Surface
  /** A painted colour zone. */
  color?: FloorColor
  /** No light here: a camera cannot see colours unless the robot's light is on. */
  dark?: boolean
  label?: string
}

export interface LinePath {
  points: Vec2[]
  /** Line width in metres (tape is about 2 cm). */
  width: number
}

export interface Wall {
  from: Vec2
  to: Vec2
  height?: number
  thickness?: number
}

export interface Ramp {
  /** Centre of the ramp's footprint. */
  center: Vec2
  /** [width across, length along the slope]. */
  size: Vec2
  height: number
  /** Direction the slope rises toward, in compass degrees (0 = +z). */
  riseHeadingDeg: number
}

export interface PushBox {
  pos: Vec2
  /** Edge length in metres. */
  size: number
  mass: number
  color?: string
}

export interface PickupObject {
  id: string
  kind: 'ball' | 'cube'
  pos: Vec2
  /** Radius (ball) or half edge (cube), metres. */
  size: number
  mass: number
  color?: string
}

export type Goal =
  /** Finish with the robot's centre inside the zone. */
  | { kind: 'reach'; zone: Shape2D; noCrash?: boolean }
  /** Finish stopped inside the zone without ever touching a wall. */
  | { kind: 'stop-in-zone'; zone: Shape2D; noCrash: true }
  /** Finish inside the zone having stayed near the line for most of the run. */
  | { kind: 'follow-line'; zone: Shape2D; minOnLine: number }

export interface Arena {
  id: string
  title: string
  /** Width (x) and depth (z) of the floor; boundary walls are added around it. */
  size: Vec2
  /** Centre of the floor (so arenas can be authored around the start). */
  center: Vec2
  floor: Surface
  regions: FloorRegion[]
  lines: LinePath[]
  walls: Wall[]
  ramps: Ramp[]
  boxes: PushBox[]
  objects: PickupObject[]
  start: { pos: Vec2; headingDeg: number }
  goal: Goal
  /** Hard stop for any program (forever loops end here). */
  timeLimit: number
}

// ── Geometry helpers shared by the engine, the renderer and the checks ────
export function inShape(s: Shape2D, x: number, z: number): boolean {
  if (s.kind === 'circle') {
    const dx = x - s.center[0]
    const dz = z - s.center[1]
    return dx * dx + dz * dz <= s.radius * s.radius
  }
  return Math.abs(x - s.center[0]) <= s.size[0] / 2 && Math.abs(z - s.center[1]) <= s.size[1] / 2
}

/** Distance from point to segment, metres. */
export function distToSegment(px: number, pz: number, a: Vec2, b: Vec2): number {
  const vx = b[0] - a[0]
  const vz = b[1] - a[1]
  const len2 = vx * vx + vz * vz
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - a[0]) * vx + (pz - a[1]) * vz) / len2))
  const cx = a[0] + vx * t
  const cz = a[1] + vz * t
  return Math.hypot(px - cx, pz - cz)
}

export function onLine(arena: Arena, x: number, z: number): boolean {
  for (const l of arena.lines) {
    for (let i = 0; i + 1 < l.points.length; i++) {
      if (distToSegment(x, z, l.points[i], l.points[i + 1]) <= l.width / 2) return true
    }
  }
  return false
}

export interface FloorSample {
  surface: Surface
  color: FloorColor
  dark: boolean
}

/** What the floor is at (x, z). Later regions paint over earlier ones; lines paint black on top. */
export function floorAt(arena: Arena, x: number, z: number, ignoreLines = false): FloorSample {
  let surface = arena.floor
  let color: FloorColor = 'white'
  let dark = false
  for (const r of arena.regions) {
    if (!inShape(r.shape, x, z)) continue
    if (r.surface) surface = r.surface
    if (r.color) color = r.color
    if (r.dark) dark = true
  }
  if (!ignoreLines && onLine(arena, x, z)) color = 'black'
  return { surface, color, dark }
}
