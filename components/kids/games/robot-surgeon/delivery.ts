// components/kids/games/robot-surgeon/delivery.ts
// CADET — Medicine Run. A top-down hospital floor. The child drives a delivery
// robot from the pharmacy to three ward doors and back to its charger while
// people walk the corridors.
//
// The model (real, simplified):
//   - 1 map cell = 2 m. The robot is a 0.7 m wide box with a top speed of
//     1.4 m/s ("fast") or 0.5 m/s ("careful") and a braking deceleration of
//     1.6 m/s², so its stopping distance is v²/(2a) — 0.61 m when fast.
//   - Like real mobile robots it carries a laser scanner with two safety
//     fields: a SLOW field (1.6 m) and a STOP field.
//     Entering the slow field while fast is the driver's mistake (a warning).
//     The STOP field is a box in front of the robot, in the direction it is
//     driving: as wide as the robot plus 0.1 m each side, and as long as
//     0.15 m plus the braking distance at the current speed (so it grows with
//     speed, as on real robots). If someone is inside it, the robot makes an
//     automatic protective stop and waits — safe, but slow. One person met
//     once counts as one stop, however long the meeting lasts.
//   - People keep to their right and step further aside (or round the other
//     side) when the robot comes near, so a robot that keeps to its own right
//     and goes slowly can always pass.
//   - Hitting a wall at speed is a bump (bumper switch).
// Deterministic: people walk seeded patrols, so the same driving gives the
// same result.

import { clamp, rng } from './shared'
import { kidsTimeLimit } from '@/lib/kids/settings'

export const CELL_M = 2
export const ROBOT_R = 0.35
export const PERSON_R = 0.25
export const FAST = 1.4
export const CAREFUL = 0.5
export const ACCEL = 2.2
export const BRAKE = 1.6
export const SLOW_FIELD = 1.6
/** Protective stop field grows with speed, as on real mobile robots: margin + braking distance. */
export const stopField = (v: number) => 0.15 + (v * v) / (2 * BRAKE)
/** Long enough to finish in careful speed all the way (about 185 s); 3 stars need 110 s or less. */
export const TIME_LIMIT = 240
/** Half-width of the stop field box. */
export const STOP_HALF_W = ROBOT_R + 0.1
/** Seconds the robot holds still after a protective stop. */
export const STOP_HOLD = 1.2
/** How far people keep from the corridor centre line: normally, and when stepping aside. */
const SIDE_WALK = 0.45
const SIDE_ASIDE = 0.75

// # wall · . floor · P pharmacy + charger · A/B/C ward doors
export const MAP = [
  '#############',
  '#P....#.....#',
  '#.###.#.###A#',
  '#.#.........#',
  '#.#.###.#.#.#',
  '#...#B..#...#',
  '###.#####.###',
  '#C..........#',
  '#############',
]
export const COLS = MAP[0].length
export const ROWS = MAP.length

export interface Ward {
  id: 'A' | 'B' | 'C'
  name: string
  icon: string
  colour: string
  x: number
  y: number
}

function find(ch: string): { x: number; y: number } {
  for (let y = 0; y < ROWS; y++) {
    const x = MAP[y].indexOf(ch)
    if (x >= 0) return { x: (x + 0.5) * CELL_M, y: (y + 0.5) * CELL_M }
  }
  return { x: CELL_M, y: CELL_M }
}

export const WARDS: Ward[] = [
  { id: 'A', name: 'Children’s ward', icon: '🧸', colour: '#38BDF8', ...find('A') },
  { id: 'B', name: 'Heart ward', icon: '💗', colour: '#FB7185', ...find('B') },
  { id: 'C', name: 'Eye clinic', icon: '👁️', colour: '#34D399', ...find('C') },
]
export const HOME = find('P')

export function isWall(cx: number, cy: number): boolean {
  if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return true
  return MAP[cy][cx] === '#'
}

interface Person {
  /** Patrol points (metres). */
  path: { x: number; y: number }[]
  seg: number
  dir: 1 | -1
  /** Position on the corridor centre line… */
  bx: number
  by: number
  /** …and where the person really is: keeping to their right. */
  x: number
  y: number
  speed: number
  pause: number
  icon: string
  /** Signed distance from the centre line (+ = the person's right). */
  side: number
}

export interface DeliveryState {
  t: number
  x: number
  y: number
  vx: number
  vy: number
  heading: number
  fast: boolean
  delivered: Record<string, boolean>
  done: boolean
  timeUp: boolean
  /** This round's limit in seconds after the kids "more time" setting (Infinity when untimed). */
  timeLimit: number
  people: Person[]
  /** Counted mistakes. */
  fastNearPerson: number
  bumps: number
  autoStops: number
  /** Seconds left of an automatic protective stop. */
  stopHold: number
  /** Index set of people currently inside the slow field (so one pass = one warning). */
  nearFlags: boolean[]
  /** People who already caused a protective stop on this meeting (one meeting = one counted stop). */
  stopFlags: boolean[]
  bumpCooldown: number
  distance: number
  /** Short-lived messages for the screen. */
  flash: { text: string; ttl: number; kind: 'good' | 'warn' | 'bad' } | null
  /** Highest speed seen inside a slow field. */
  worstNearSpeed: number
}

const c = (x: number, y: number) => ({ x: (x + 0.5) * CELL_M, y: (y + 0.5) * CELL_M })

export function makeDelivery(seed = 7): DeliveryState {
  const r = rng(seed)
  // Walk on the right-hand side of each corridor (offset 0.45 m).
  const people: Person[] = [
    { path: [c(3, 3), c(11, 3)], icon: '🧑‍⚕️', speed: 0.75 },
    { path: [c(2, 7), c(11, 7)], icon: '🧓', speed: 0.45 },
    { path: [c(7, 1), c(11, 1)], icon: '👩‍⚕️', speed: 0.7 },
    // Kept clear of the charger, so nobody is beside the robot when the shift starts.
    { path: [c(3, 5), c(1, 5), c(1, 3)], icon: '🧑‍🦽', speed: 0.55 },
  ].map((p, i) => {
    const seg = 0
    const f = r()
    const a = p.path[0]
    const b = p.path[1]
    const bx = a.x + (b.x - a.x) * f * 0.6
    const by = a.y + (b.y - a.y) * f * 0.6
    return { ...p, seg, dir: (i % 2 ? -1 : 1) as 1 | -1, bx, by, x: bx, y: by, pause: r() * 2, side: SIDE_WALK }
  })
  for (const p of people) placeOnRight(p)
  return {
    t: 0,
    x: HOME.x,
    y: HOME.y,
    vx: 0,
    vy: 0,
    heading: 0,
    // Start careful: the child chooses when it is safe to go fast.
    fast: false,
    delivered: { A: false, B: false, C: false },
    done: false,
    timeUp: false,
    timeLimit: kidsTimeLimit(TIME_LIMIT),
    people,
    fastNearPerson: 0,
    bumps: 0,
    autoStops: 0,
    stopHold: 0,
    nearFlags: people.map(() => false),
    stopFlags: people.map(() => false),
    bumpCooldown: 0,
    distance: 0,
    flash: null,
    worstNearSpeed: 0,
  }
}

/** Unit direction of a person's travel, and their right-hand side (screen y points down). */
function frame(p: Person) {
  const a = p.path[p.seg]
  const b = p.path[Math.min(p.seg + 1, p.path.length - 1)]
  let dx = (b.x - a.x) * p.dir
  let dy = (b.y - a.y) * p.dir
  const d = Math.hypot(dx, dy) || 1
  dx /= d
  dy /= d
  return { fx: dx, fy: dy, rx: -dy, ry: dx }
}

function movePeople(s: DeliveryState, dt: number) {
  for (const p of s.people) {
    // Step aside: when the robot is near, move over to whichever side of the
    // corridor it is NOT on (normally your own right), close to the wall.
    const dRobot = Math.hypot(s.x - p.x, s.y - p.y)
    const fr = frame(p)
    const robotLat = (s.x - p.bx) * fr.rx + (s.y - p.by) * fr.ry
    const want = dRobot < 2.5 ? (robotLat > 0.1 ? -SIDE_ASIDE : SIDE_ASIDE) : SIDE_WALK
    const ds = want - p.side
    const sideStep = 1.0 * dt
    p.side += Math.abs(ds) <= sideStep ? ds : Math.sign(ds) * sideStep
    if (p.pause > 0) {
      p.pause -= dt
      placeOnRight(p)
      continue
    }
    const target = p.path[p.dir === 1 ? p.seg + 1 : p.seg]
    const dx = target.x - p.bx
    const dy = target.y - p.by
    const d = Math.hypot(dx, dy)
    const step = p.speed * dt
    // Wait (and keep stepping aside) rather than walk into the robot.
    if (d > 1e-6) {
      const nx = p.x + (dx / d) * step
      const ny = p.y + (dy / d) * step
      const dNext = Math.hypot(s.x - nx, s.y - ny)
      if (dNext < ROBOT_R + PERSON_R + 0.08 && dNext < dRobot) {
        placeOnRight(p)
        continue
      }
    }
    if (d <= step) {
      p.bx = target.x
      p.by = target.y
      if (p.dir === 1) {
        if (p.seg + 2 < p.path.length) p.seg++
        else {
          p.dir = -1
          p.pause = 1.2
        }
      } else {
        if (p.seg > 0) p.seg--
        else {
          p.dir = 1
          p.pause = 1.2
        }
      }
    } else {
      p.bx += (dx / d) * step
      p.by += (dy / d) * step
    }
    placeOnRight(p)
  }
}

/** People keep to the right-hand side of the corridor (p.side metres off the centre line). */
function placeOnRight(p: Person) {
  const fr = frame(p)
  p.x = p.bx + fr.rx * p.side
  p.y = p.by + fr.ry * p.side
}

/** Push a circle out of wall cells; returns true if it touched one. */
function collideWalls(s: DeliveryState): boolean {
  let hit = false
  const cx = Math.floor(s.x / CELL_M)
  const cy = Math.floor(s.y / CELL_M)
  for (let gy = cy - 1; gy <= cy + 1; gy++)
    for (let gx = cx - 1; gx <= cx + 1; gx++) {
      if (!isWall(gx, gy)) continue
      const nx = clamp(s.x, gx * CELL_M, (gx + 1) * CELL_M)
      const ny = clamp(s.y, gy * CELL_M, (gy + 1) * CELL_M)
      const dx = s.x - nx
      const dy = s.y - ny
      const d = Math.hypot(dx, dy)
      if (d < ROBOT_R && d > 1e-6) {
        const push = ROBOT_R - d
        s.x += (dx / d) * push
        s.y += (dy / d) * push
        // remove velocity into the wall
        const vn = (s.vx * dx + s.vy * dy) / d
        if (vn < 0) {
          s.vx -= (vn * dx) / d
          s.vy -= (vn * dy) / d
        }
        hit = true
      }
    }
  return hit
}

export function stepDelivery(s: DeliveryState, input: { x: number; y: number }, dt: number) {
  if (s.done || s.timeUp) return
  s.t += dt
  if (s.flash) {
    s.flash.ttl -= dt
    if (s.flash.ttl <= 0) s.flash = null
  }
  if (s.bumpCooldown > 0) s.bumpCooldown -= dt
  movePeople(s, dt)

  const vmax = s.fast ? FAST : CAREFUL
  const speed0 = Math.hypot(s.vx, s.vy)
  let ix = input.x
  let iy = input.y
  const im = Math.hypot(ix, iy)
  if (im > 1) {
    ix /= im
    iy /= im
  }
  if (s.stopHold > 0) {
    s.stopHold -= dt
    ix = 0
    iy = 0
  }
  // Desired velocity; accelerate toward it, brake at BRAKE.
  const tvx = ix * vmax
  const tvy = iy * vmax
  const dvx = tvx - s.vx
  const dvy = tvy - s.vy
  const dv = Math.hypot(dvx, dvy)
  const speeding = Math.hypot(tvx, tvy) >= speed0
  const lim = (speeding ? ACCEL : BRAKE) * dt
  if (dv > lim) {
    s.vx += (dvx / dv) * lim
    s.vy += (dvy / dv) * lim
  } else {
    s.vx = tvx
    s.vy = tvy
  }
  const px = s.x
  const py = s.y
  s.x += s.vx * dt
  s.y += s.vy * dt
  const speed = Math.hypot(s.vx, s.vy)
  if (speed > 0.05) s.heading = Math.atan2(s.vy, s.vx)

  if (collideWalls(s) && speed > 0.6 && s.bumpCooldown <= 0) {
    s.bumps++
    s.bumpCooldown = 1
    s.flash = { text: 'Bump! The bumper hit a wall.', ttl: 1.6, kind: 'bad' }
  }

  // People: no overlap, slow field and stop field.
  s.people.forEach((p, i) => {
    const dx = s.x - p.x
    const dy = s.y - p.y
    const d = Math.hypot(dx, dy)
    if (d < ROBOT_R + PERSON_R && d > 1e-6) {
      const push = ROBOT_R + PERSON_R - d
      s.x += (dx / d) * push
      s.y += (dy / d) * push
    }
    // Protective stop: someone inside the stop box in front of the robot.
    if (speed > 0.15 && s.stopHold <= 0) {
      const ux = s.vx / speed
      const uy = s.vy / speed
      const ahead = -(dx * ux + dy * uy)
      const lateral = Math.abs(-dx * uy + dy * ux)
      if (ahead > 0 && lateral < STOP_HALF_W + PERSON_R && ahead - ROBOT_R - PERSON_R < stopField(speed)) {
        if (!s.stopFlags[i]) {
          s.autoStops++
          s.stopFlags[i] = true
        }
        s.vx = 0
        s.vy = 0
        s.stopHold = STOP_HOLD
        s.flash = { text: 'Safety stop! Keep right and go slowly to pass.', ttl: 1.8, kind: 'bad' }
      }
    }
    const inSlow = d < SLOW_FIELD
    if (inSlow) {
      s.worstNearSpeed = Math.max(s.worstNearSpeed, speed)
      if (!s.nearFlags[i] && speed > CAREFUL + 0.15) {
        s.fastNearPerson++
        s.nearFlags[i] = true
        s.flash = { text: 'Too fast near a person — slow down!', ttl: 1.6, kind: 'warn' }
      }
    } else if (d > SLOW_FIELD + 0.4) {
      s.nearFlags[i] = false
      s.stopFlags[i] = false
    }
  })

  s.distance += Math.hypot(s.x - px, s.y - py)

  for (const w of WARDS) {
    if (!s.delivered[w.id] && Math.hypot(s.x - w.x, s.y - w.y) < 0.8) {
      s.delivered[w.id] = true
      s.flash = { text: `Medicine delivered to the ${w.name}!`, ttl: 1.8, kind: 'good' }
    }
  }
  const all = WARDS.every((w) => s.delivered[w.id])
  if (all && Math.hypot(s.x - HOME.x, s.y - HOME.y) < 0.8) s.done = true
  if (s.t >= s.timeLimit) s.timeUp = true
}

export function safetyEvents(s: DeliveryState): number {
  return s.fastNearPerson + s.bumps + s.autoStops
}

export function deliveryStars(s: DeliveryState): number {
  if (!s.done) return 0
  const ev = safetyEvents(s)
  if (ev === 0 && s.t <= 110) return 3
  if (ev <= 2) return 2
  return 1
}

export function deliveryScore(s: DeliveryState): number {
  const n = WARDS.filter((w) => s.delivered[w.id]).length
  // No time bonus in untimed play.
  const timeBonus = s.done && Number.isFinite(s.timeLimit) ? Math.max(0, Math.round((TIME_LIMIT - s.t) * 4)) : 0
  return Math.max(0, n * 150 + (s.done ? 150 : 0) + timeBonus - 60 * safetyEvents(s))
}

/** Stopping distance (m) at speed v with the robot's brakes. */
export const stopDist = (v: number) => (v * v) / (2 * BRAKE)
