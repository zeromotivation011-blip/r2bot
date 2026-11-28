// lib/kids/sim/arena.ts
// The shape of a physics arena, in metres. Framework-free data: the engine
// builds Rapier colliders from it and the renderer builds three.js meshes from
// the same object, so what the child sees is exactly what the physics uses.
//
// Coordinates: x across, z forward, y up. The floor is the plane y = 0.
// Heading 0 faces +z; heading grows when the robot turns RIGHT (clockwise seen
// from above), like a compass. (The turn_degrees BLOCK is the other way round:
// positive = LEFT, the curriculum's ROS/maths convention — see interpreter.ts.)

import type { ArenaBattery, Charger } from './battery'

export type Vec2 = [number, number]

/**
 * What the floor is made of. Changes how much grip and drag each drive gets.
 * 'soft-sand' is the Level 1 beach: it halves a two-wheeler's speed but never
 * stops it ('sand' is the deep Level 2 fair-test sand that bogs wheels down).
 */
export type Surface = 'tile' | 'carpet' | 'sand' | 'soft-sand' | 'ice' | 'rocks'

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
  /** Reflectance the line sensor reads here, 0–100 (calibration pads, worn paint). Default: from the colour. */
  shade?: number
  label?: string
}

export interface LinePath {
  points: Vec2[]
  /** Line width in metres (tape is about 2 cm). */
  width: number
  /**
   * Reflectance of this line, 0–100 (default 8: fresh black tape). A faded, sun-bleached line
   * is grey (say 40): line_seen still sees it, but a threshold copied from a fresh line misses it.
   */
  shade?: number
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
  /** Raised: the wedge sits on top of this height (a ramp between two landings). Default 0. */
  base?: number
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
  /** Resting on something raised (a shelf, a ramp), metres above the floor. Default 0. */
  base?: number
}

/**
 * A named thing in the world (a flowerpot, a stall, a hedge, a person). Static
 * and solid. The engine records every touch by id, so a challenge can say
 * "don't knock the flowerpot" about one thing and allow touching another.
 */
export interface Prop {
  id: string
  /** Look and label for the renderer ('crate', 'flowers', 'person', 'hedge'…). */
  kind: string
  label?: string
  shape: Shape2D
  height: number
  color?: string
  /** Raised off the floor (a deck, a cog on a wall), metres. Default 0. */
  base?: number
}

export interface Deck {
  center: Vec2
  size: Vec2
  height: number
  base?: number
}

/** One keyframe of a moving thing: where it is at time t (linear in between) and whether it is there at all. */
export interface MoverKey {
  t: number
  pos: Vec2
  /** false = lowered out of the way (a bridge barrier that is down, a visitor who has left). Holds until the next key. */
  present?: boolean
}

/** Something that moves on a fixed timetable: a bread cart, a bridge barrier, a visitor. Same every run. */
export interface Mover {
  id: string
  kind: string
  label?: string
  /** Footprint [x, z], metres. */
  size: Vec2
  height: number
  color?: string
  keys: MoverKey[]
}

/** A faint dotted guide painted on the floor for drawing tasks. Not a tape line: sensors do not see it. */
export interface GuidePath {
  points: Vec2[]
}

/** The tile grid a Level 1 arena is authored on: (col, row) from the top-left. */
export interface ArenaGrid {
  cols: number
  rows: number
  /** Tile size, metres. */
  tile: number
}

export type Goal =
  /** Finish with the robot's centre inside the zone. */
  | { kind: 'reach'; zone: Shape2D; noCrash?: boolean }
  /** Finish stopped inside the zone without ever touching a wall. */
  | { kind: 'stop-in-zone'; zone: Shape2D; noCrash: true }
  /** Finish inside the zone having stayed near the line for most of the run. */
  | { kind: 'follow-line'; zone: Shape2D; minOnLine: number }
  /** Visit a spot (`visit`), then come back and stop in the zone (a charger): roadmap #39 return-to-charger. */
  | { kind: 'visit-and-return'; visit: Shape2D; zone: Shape2D; noCrash?: boolean }
  /**
   * Carry a pick-up object (`object`, an id in `objects`) to a marked drop position and let go of it
   * there: the object must end inside `zone`, released (not still in the claw or scoop). The robot
   * must never tip over on the way (tilt past TIP_DEG, engine.ts).
   */
  | { kind: 'deliver'; object: string; zone: Shape2D; label: string }

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
  props?: Prop[]
  movers?: Mover[]
  /** Raised flat floors: a platform, a landing. Top at `height`, solid down to `base` (default 0). */
  decks?: Deck[]
  guides?: GuidePath[]
  grid?: ArenaGrid
  /** Hard stop for any program (forever loops end here). */
  timeLimit: number
  /** Power (roadmap #39): with a battery the robot can sag, slow and run flat. Without one it is only metered. */
  battery?: ArenaBattery
  /** Charging pads: stopped on one, the battery fills. */
  chargers?: Charger[]
  /**
   * The motors' dead zone for this arena, % of full power, instead of the robot's own
   * (RobotSpec.deadZonePct, normally MOTOR_DEAD_ZONE_PCT): a worn gearbox or a cold motor
   * needs more power before the wheels turn at all. A fault-injection arena sets it.
   */
  motorDeadZonePct?: number
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

/**
 * How much infrared light a floor colour sends back to a reflectance sensor (an IR LED and a
 * phototransistor looking down), as 0–100. White paper and paint reflect most of it, black tape
 * very little; coloured paints sit in between (red and yellow pigments reflect near-infrared
 * well, green and blue absorb more). Typical TCRT5000-style readings, rounded. The sensor has its
 * own light, so a dark room does not change it.
 */
export const REFLECTANCE: Record<FloorColor, number> = { white: 90, yellow: 82, red: 70, green: 35, blue: 30, black: 8 }

/** Reflectance at one floor point, 0–100: lines on top, then the last region that sets a shade or colour. */
export function reflectanceAt(arena: Arena, x: number, z: number): number {
  for (const l of arena.lines) {
    for (let i = 0; i + 1 < l.points.length; i++) {
      if (distToSegment(x, z, l.points[i], l.points[i + 1]) <= l.width / 2) return l.shade ?? REFLECTANCE.black
    }
  }
  let v = REFLECTANCE.white
  for (const r of arena.regions) {
    if (!inShape(r.shape, x, z)) continue
    if (typeof r.shade === 'number') v = r.shade
    else if (r.color) v = REFLECTANCE[r.color]
  }
  return v
}

/** Where a mover is at time t: its position and whether it is present. */
export function moverAt(m: Mover, t: number): { pos: Vec2; present: boolean } {
  const k = m.keys
  if (k.length === 0) return { pos: [0, 0], present: false }
  if (t <= k[0].t) return { pos: k[0].pos, present: k[0].present !== false }
  for (let i = 0; i + 1 < k.length; i++) {
    const a = k[i]
    const b = k[i + 1]
    if (t < b.t) {
      const u = b.t === a.t ? 1 : (t - a.t) / (b.t - a.t)
      return { pos: [a.pos[0] + (b.pos[0] - a.pos[0]) * u, a.pos[1] + (b.pos[1] - a.pos[1]) * u], present: a.present !== false }
    }
  }
  const last = k[k.length - 1]
  return { pos: last.pos, present: last.present !== false }
}
