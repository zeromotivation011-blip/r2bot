// lib/kids/sim/engine.ts
// The physics world for one run: a Rapier world stepped at a FIXED 60 Hz, the
// arena's colliders, and the child's robot as a real rigid body.
//
// How the robot moves (no grid, no teleporting):
//   * The chassis is one dynamic rigid body with the robot's real mass and
//     inertia. It rests on frictionless skids, so Rapier handles gravity,
//     ramps, walls and pushing boxes, while the drive forces below are the
//     only thing that moves it across the floor.
//   * Each side (left/right) has a motor with a target wheel speed, a spin-up
//     limit and a torque limit. The force a side can put into the floor is
//     limited by BOTH the motor (torque limit) and the floor (grip × load).
//     When grip runs out the wheel spins faster than the robot moves — slip —
//     and the encoders count distance the robot never travelled.
//   * Rolling drag (worse when thin wheels sink in sand), sideways tyre grip
//     and, for skid-steer drives, the scrubbing that resists turning.
//   * Because forces are limited, the robot has momentum: it takes time to
//     speed up, it coasts on ice, and a fast turn overshoots.
//
// Deterministic: fixed timestep, fixed creation order, no randomness, no
// wall-clock time. Same arena + robot + program ⇒ the same numbers.

import type { Collider, ImpulseJoint, RigidBody, World } from '@dimforge/rapier3d-compat'
import type { RobotDesign } from '../robot-design'
import { capabilitiesOf } from '../robot-design'
import { floorAt, onLine, type Arena, type FloorColor, type Vec2 } from './arena'
import type { Rapier } from './rapier'
import { robotSpec, SURFACES, type RobotSpec } from './robot-spec'

export const DT = 1 / 60
const G = 9.81
const DISTANCE_MAX_CM = 200
const DISTANCE_CONE_DEG = [-12, -6, 0, 6, 12]
const LINE_SAMPLES = [-1, -0.5, 0, 0.5, 1]

type V3 = { x: number; y: number; z: number }
type Q = { x: number; y: number; z: number; w: number }

function rot(q: Q, v: V3): V3 {
  // v' = q v q*
  const ix = q.w * v.x + q.y * v.z - q.z * v.y
  const iy = q.w * v.y + q.z * v.x - q.x * v.z
  const iz = q.w * v.z + q.x * v.y - q.y * v.x
  const iw = -q.x * v.x - q.y * v.y - q.z * v.z
  return {
    x: ix * q.w + iw * -q.x + iy * -q.z - iz * -q.y,
    y: iy * q.w + iw * -q.y + iz * -q.x - ix * -q.z,
    z: iz * q.w + iw * -q.z + ix * -q.y - iy * -q.x,
  }
}
const dot = (a: V3, b: V3) => a.x * b.x + a.y * b.y + a.z * b.z
const cross = (a: V3, b: V3): V3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x })
const add = (a: V3, b: V3): V3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z })
const scale = (a: V3, s: number): V3 => ({ x: a.x * s, y: a.y * s, z: a.z * s })
const norm = (a: V3): V3 => {
  const l = Math.hypot(a.x, a.y, a.z) || 1
  return scale(a, 1 / l)
}
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)
function yawQuat(yaw: number): Q {
  return { x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) }
}
/** Compass heading (deg) → rotation about +y (rad). Right turns are clockwise from above = negative yaw. */
export function headingToYaw(deg: number): number {
  return (-deg * Math.PI) / 180
}

export interface SimEvent {
  t: number
  kind: 'say' | 'beep' | 'grab' | 'drop' | 'crash' | 'miss'
  text?: string
}

export interface BodyPose {
  id: string
  p: V3
  q: Q
}

export interface SensorReadings {
  distanceCm: number
  /** World-space beam for the renderer: from the eye to what it hit (or max range). */
  beam: { from: V3; to: V3; hit: boolean }
  lineSamples: boolean[]
  lineSeen: boolean
  lineOffset: number
  floorColor: FloorColor
  bumped: boolean
  headingDeg: number
  timerS: number
}

export interface SimSnapshot {
  t: number
  robot: { p: V3; q: Q }
  /** Wheel rotation angle (rad) per side, from the motor's real wheel speed. */
  wheelAngle: [number, number]
  /** Wheel surface speed per side, m/s. */
  wheelSpeed: [number, number]
  /** Robot speed over the ground, m/s. */
  groundSpeed: number
  bodies: BodyPose[]
  lightOn: boolean
  holding: string | null
  penDown: boolean
  crashed: boolean
}

export interface Sim {
  readonly arena: Arena
  readonly design: RobotDesign
  readonly spec: RobotSpec
  readonly time: number
  /** Advance exactly one fixed step (1/60 s). */
  step(): void
  /** Motor targets in percent (-100..100), per side. */
  setMotors(leftPct: number, rightPct: number): void
  /** Distance each side's wheel surface has turned, metres (the encoders). */
  encoders(): [number, number]
  /** Heading that keeps counting past 360 (for turn control). */
  headingUnwrapped(): number
  sensors(): SensorReadings
  snapshot(): SimSnapshot
  grip(close: boolean): boolean
  setPen(down: boolean): void
  setLight(on: boolean): void
  emit(e: Omit<SimEvent, 't'>): void
  readonly events: SimEvent[]
  /** Pen trail as flat x,z pairs; new strokes start after a NaN pair. */
  readonly trail: number[]
  /** Metres actually travelled by the robot centre. */
  readonly travelled: number
  /** Metres the wheels claim (encoder average). */
  readonly wheelTravel: number
  readonly crashed: boolean
  dispose(): void
}

interface DynBody {
  id: string
  body: RigidBody
}

export function createSim(R: Rapier, arena: Arena, design: RobotDesign): Sim {
  const spec = robotSpec(design)
  const caps = capabilitiesOf(design)
  const world: World = new R.World({ x: 0, y: -G, z: 0 })
  world.timestep = DT

  const floorHandles = new Set<number>()
  const wallHandles = new Set<number>()

  // ── Floor ──────────────────────────────────────────────────────────────
  const [cx, cz] = arena.center
  const [w, d] = arena.size
  const floor = world.createCollider(R.ColliderDesc.cuboid(w / 2 + 1, 0.5, d / 2 + 1).setTranslation(cx, -0.5, cz).setFriction(0.6))
  floorHandles.add(floor.handle)

  // ── Walls (arena boundary + authored) ───────────────────────────────────
  const addWall = (a: Vec2, b: Vec2, height: number, thickness: number) => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1])
    const yaw = Math.atan2(b[0] - a[0], b[1] - a[1])
    const c = world.createCollider(
      R.ColliderDesc.cuboid(thickness / 2, height / 2, len / 2 + thickness / 2)
        .setTranslation((a[0] + b[0]) / 2, height / 2, (a[1] + b[1]) / 2)
        .setRotation(yawQuat(yaw))
        .setFriction(0.4),
    )
    wallHandles.add(c.handle)
  }
  const x0 = cx - w / 2
  const x1 = cx + w / 2
  const z0 = cz - d / 2
  const z1 = cz + d / 2
  const BOUND_T = 0.06
  addWall([x0 - BOUND_T / 2, z0], [x0 - BOUND_T / 2, z1], 0.4, BOUND_T)
  addWall([x1 + BOUND_T / 2, z0], [x1 + BOUND_T / 2, z1], 0.4, BOUND_T)
  addWall([x0, z0 - BOUND_T / 2], [x1, z0 - BOUND_T / 2], 0.4, BOUND_T)
  addWall([x0, z1 + BOUND_T / 2], [x1, z1 + BOUND_T / 2], 0.4, BOUND_T)
  for (const wl of arena.walls) addWall(wl.from, wl.to, wl.height ?? 0.4, wl.thickness ?? 0.05)

  // ── Ramps (wedges) ─────────────────────────────────────────────────────
  for (const r of arena.ramps) {
    const hw = r.size[0] / 2
    const hl = r.size[1] / 2
    const pts = new Float32Array([-hw, 0, -hl, hw, 0, -hl, -hw, 0, hl, hw, 0, hl, -hw, r.height, hl, hw, r.height, hl])
    const desc = R.ColliderDesc.convexHull(pts)
    if (desc) {
      const c = world.createCollider(desc.setTranslation(r.center[0], 0, r.center[1]).setRotation(yawQuat(headingToYaw(r.riseHeadingDeg))).setFriction(0.7))
      floorHandles.add(c.handle)
    }
  }

  // ── Pushable boxes and pick-up objects ─────────────────────────────────
  const dyn: DynBody[] = []
  arena.boxes.forEach((b, i) => {
    const body = world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(b.pos[0], b.size / 2, b.pos[1]).setAngularDamping(0.5))
    world.createCollider(R.ColliderDesc.cuboid(b.size / 2, b.size / 2, b.size / 2).setDensity(b.mass / b.size ** 3).setFriction(0.5), body)
    dyn.push({ id: `box-${i}`, body })
  })
  const pickups = new Map<string, RigidBody>()
  for (const o of arena.objects) {
    const body = world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(o.pos[0], o.size, o.pos[1]).setAngularDamping(0.8).setLinearDamping(0.3))
    const desc = o.kind === 'ball' ? R.ColliderDesc.ball(o.size) : R.ColliderDesc.cuboid(o.size, o.size, o.size)
    const vol = o.kind === 'ball' ? (4 / 3) * Math.PI * o.size ** 3 : 8 * o.size ** 3
    world.createCollider(desc.setDensity(o.mass / vol).setFriction(0.6), body)
    dyn.push({ id: o.id, body })
    pickups.set(o.id, body)
  }

  // ── The robot ──────────────────────────────────────────────────────────
  const b = spec.body
  const halfX = spec.track + 0.015
  const length = b.front - b.back
  const iy = (spec.mass * ((2 * halfX) ** 2 + length ** 2)) / 12
  const ix = (spec.mass * ((b.top) ** 2 + length ** 2)) / 12
  const iz = (spec.mass * ((b.top) ** 2 + (2 * halfX) ** 2)) / 12
  const startYaw = headingToYaw(arena.start.headingDeg)
  const robot = world.createRigidBody(
    R.RigidBodyDesc.dynamic()
      .setTranslation(arena.start.pos[0], 0.002, arena.start.pos[1])
      .setRotation(yawQuat(startYaw))
      .setAdditionalMassProperties(spec.mass, { x: 0, y: spec.comY, z: 0 }, { x: ix, y: iy, z: iz }, { x: 0, y: 0, z: 0, w: 1 })
      .setAngularDamping(0.4)
      .setCanSleep(false),
  )
  const frictionless = (desc: ReturnType<typeof R.ColliderDesc.ball>) =>
    desc.setDensity(0).setFriction(0).setFrictionCombineRule(R.CoefficientCombineRule.Min).setRestitution(0)
  const chassis = world.createCollider(
    frictionless(R.ColliderDesc.cuboid(halfX, (b.top - b.bottom) / 2, length / 2)).setTranslation(0, (b.top + b.bottom) / 2, 0),
    robot,
  )
  const SKID_R = 0.025
  for (const sx of [-1, 1]) {
    for (const z of [b.front * 0.75, b.back * 0.75]) {
      world.createCollider(frictionless(R.ColliderDesc.ball(SKID_R)).setTranslation(sx * spec.track, SKID_R, z), robot)
    }
  }
  const mEffSide = 1 / (1 / spec.mass + (spec.track * spec.track) / iy)

  // ── State ──────────────────────────────────────────────────────────────
  let time = 0
  const target: [number, number] = [0, 0]
  const wheelSpeed: [number, number] = [0, 0]
  const wheelAngle: [number, number] = [0, 0]
  const enc: [number, number] = [0, 0]
  let headingUnwrapped = arena.start.headingDeg
  let lastHeadingWrapped = arena.start.headingDeg
  let lightOn = false
  let penDown = false
  let crashed = false
  let holding: { id: string; joint: ImpulseJoint } | null = null
  let travelled = 0
  let lastLineOffset = 0
  let sensorCache: SensorReadings | null = null
  const events: SimEvent[] = []
  const trail: number[] = []
  let prevPos = robot.translation()

  const local = (x: number, y: number, z: number): V3 => {
    const p = robot.translation()
    return add(p, rot(robot.rotation(), { x, y, z }))
  }
  // Robot "right" in its own frame is -x (it faces +z with y up).
  const RIGHT: V3 = { x: -1, y: 0, z: 0 }

  function wrapHeading(): number {
    const f = rot(robot.rotation(), { x: 0, y: 0, z: 1 })
    const yaw = Math.atan2(f.x, f.z)
    let h = (-yaw * 180) / Math.PI
    h = ((h % 360) + 360) % 360
    return h
  }

  const notRobot = (c: Collider) => {
    const parent = c.parent()
    return !(parent && parent.handle === robot.handle) && !c.isSensor()
  }

  function computeSensors(): SensorReadings {
    const q = robot.rotation()
    // Distance: a fan of rays from the head, like the cone of an ultrasonic echo.
    const eye = local(spec.eye[0], spec.eye[1], spec.eye[2])
    let best = DISTANCE_MAX_CM / 100
    let bestDir = rot(q, { x: 0, y: 0, z: 1 })
    let hit = false
    for (const deg of DISTANCE_CONE_DEG) {
      const a = (deg * Math.PI) / 180
      const dir = rot(q, { x: Math.sin(a), y: 0, z: Math.cos(a) })
      const ray = new R.Ray(eye, dir)
      const h = world.castRay(ray, DISTANCE_MAX_CM / 100, true, undefined, undefined, undefined, robot, (c) => notRobot(c) && (!floorHandles.has(c.handle) || isRampFace(c)))
      if (h && h.timeOfImpact < best) {
        best = h.timeOfImpact
        bestDir = dir
        hit = true
      }
    }
    // Floor sensors.
    const center = robot.translation()
    const fwd = rot(q, { x: 0, y: 0, z: 1 })
    const right = rot(q, RIGHT)
    const samples = LINE_SAMPLES.map((s) => {
      const p = add(add(center, scale(fwd, spec.floorSensorZ)), scale(right, s * spec.floorSensorHalfWidth))
      return onLine(arena, p.x, p.z)
    })
    let n = 0
    let sum = 0
    samples.forEach((on, i) => {
      if (on) {
        n++
        sum += LINE_SAMPLES[i]
      }
    })
    let lineOffset: number
    if (n > 0) {
      lineOffset = sum / n
      lastLineOffset = lineOffset
    } else {
      // Lost the line: report the side it was last seen on, like real line-sensor arrays.
      lineOffset = lastLineOffset === 0 ? 0 : Math.sign(lastLineOffset)
    }
    let floorColor: FloorColor
    if (design.sensor === 'color') {
      const p = add(center, scale(fwd, spec.floorSensorZ))
      floorColor = floorAt(arena, p.x, p.z).color // the colour sensor has its own little LEDs
    } else {
      // A camera sees the colour of the floor ahead as a whole (a thin tape line does not hide it).
      const p = add(center, scale(fwd, b.front + 0.05))
      const f = floorAt(arena, p.x, p.z, true)
      floorColor = f.dark && !lightOn ? 'black' : f.color // a camera needs light
    }
    // Bumper: is anything (not the floor) inside the strip just in front of the robot?
    let bumped = false
    if (caps.has('feel-bump')) {
      const bp = local(0, b.bottom + 0.03, b.front + 0.015)
      world.intersectionsWithShape(bp, q, new R.Cuboid(halfX + 0.01, 0.025, 0.015), () => {
        bumped = true
        return false
      }, undefined, undefined, undefined, robot, (c) => notRobot(c) && !floorHandles.has(c.handle))
    }
    return {
      distanceCm: Math.round(best * 1000) / 10,
      beam: { from: eye, to: add(eye, scale(bestDir, best)), hit },
      lineSamples: samples,
      lineSeen: n > 0,
      lineOffset: Math.round(lineOffset * 100) / 100,
      floorColor,
      bumped,
      headingDeg: Math.round(wrapHeading() * 10) / 10,
      timerS: Math.round(time * 100) / 100,
    }
  }

  // Ramps are "floor" for the support check but a distance sensor should still see their face.
  function isRampFace(c: Collider): boolean {
    return floorHandles.has(c.handle) && c.handle !== floor.handle
  }

  function applyDrive(): void {
    const q = robot.rotation()
    const up = rot(q, { x: 0, y: 1, z: 0 })
    const pos = robot.translation()
    // Is the robot standing on something? Cast down from just above its skids.
    const origin = add(pos, scale(up, 0.06))
    const hit = world.castRayAndGetNormal(new R.Ray(origin, scale(up, -1)), 0.06 + 0.03, true, undefined, undefined, undefined, robot, notRobot)
    // Motors spin the wheels toward their target (limited spin-up).
    for (let s = 0; s < 2; s++) {
      const dv = clamp(target[s] - wheelSpeed[s], -spec.drive.wheelAccel * DT, spec.drive.wheelAccel * DT)
      wheelSpeed[s] += dv
    }
    if (!hit) return
    const n = norm(hit.normal)
    if (n.y < 0.5) return // on its side: no grip
    const fwd0 = rot(q, { x: 0, y: 0, z: 1 })
    const f = norm(add(fwd0, scale(n, -dot(fwd0, n))))
    const r = cross(f, n) // robot's right along the ground
    const load = spec.mass * G * n.y
    const loadSide = load / 2
    const v = robot.linvel()
    const wv = robot.angvel()
    const vf = dot(v, f)
    const vr = dot(v, r)
    const wn = dot(wv, n)
    const com = add(pos, scale(up, spec.comY))
    let scrubMu = 0
    for (let s = 0; s < 2; s++) {
      // s = 0 left, s = 1 right. Left contact sits at -r·track.
      const side = s === 0 ? -1 : 1
      const cp = add(pos, scale(r, side * spec.track))
      const surf = SURFACES[floorAt(arena, cp.x, cp.z).surface]
      const isWheel = design.drive === 'wheels2' || design.drive === 'wheels4'
      const mu = surf.mu * spec.drive.grip
      scrubMu += mu / 2
      const drag = (surf.crr * spec.drive.sinkage + (isWheel ? surf.wheelOnlyDrag : 0)) * loadSide
      // Ground speed of this side's contact along f (a left turn speeds the right side up).
      const vSide = vf + side * spec.track * wn
      // Traction: the floor pushes the wheel toward "no slip" (also making up for the drag it
      // will meet), limited by grip (mu × load) and by the motor's torque limit.
      const slip = wheelSpeed[s] - vSide
      const want = ((slip * mEffSide) / DT + Math.sign(wheelSpeed[s]) * drag) * 0.8
      const gripLimit = mu * loadSide
      const motorLimit = spec.drive.maxForcePerSide
      const limit = Math.min(gripLimit, motorLimit)
      let F = clamp(want, -limit, limit)
      if (Math.abs(want) > motorLimit && motorLimit < gripLimit) {
        // The motor stalls under load: the wheel is dragged toward the ground speed.
        wheelSpeed[s] += (vSide - wheelSpeed[s]) * 0.25
      }
      // Rolling drag works like friction: it can hold the robot still against a weak push,
      // and it never reverses the robot's motion.
      F += clamp(-((vSide * mEffSide) / DT + F), -drag, drag)
      const point = add(com, scale(r, side * spec.track))
      robot.applyImpulseAtPoint(scale(f, F * DT), point, true)
    }
    // Tyres resist sliding sideways.
    const latLimit = scrubMu * load
    const lat = clamp((-vr * spec.mass) / DT / 2, -latLimit, latLimit)
    robot.applyImpulse(scale(r, lat * DT), true)
    // Skid-steer drives scrub when turning (the contacts must slide sideways).
    if (spec.drive.scrub > 0) {
      const tLimit = spec.drive.scrub * scrubMu * load * (length / 4)
      const tq = clamp((-wn * iy) / DT / 2, -tLimit, tLimit)
      robot.applyTorqueImpulse(scale(n, tq * DT), true)
    }
  }

  function checkCrash(): void {
    let touching = false
    world.contactPairsWith(chassis, (other) => {
      if (!wallHandles.has(other.handle)) return
      world.contactPair(chassis, other, (manifold) => {
        if (manifold.numContacts() > 0) touching = true
      })
    })
    if (touching && !crashed) {
      crashed = true
      events.push({ t: time, kind: 'crash' })
    }
  }

  const sim: Sim = {
    arena,
    design,
    spec,
    get time() {
      return time
    },
    events,
    trail,
    get travelled() {
      return travelled
    },
    get wheelTravel() {
      return (Math.abs(enc[0]) + Math.abs(enc[1])) / 2
    },
    get crashed() {
      return crashed
    },
    step() {
      applyDrive()
      world.step()
      time += DT
      for (let s = 0; s < 2; s++) {
        enc[s] += wheelSpeed[s] * DT
        wheelAngle[s] += (wheelSpeed[s] * DT) / spec.drive.wheelRadius
      }
      const h = wrapHeading()
      let dh = h - lastHeadingWrapped
      if (dh > 180) dh -= 360
      if (dh < -180) dh += 360
      headingUnwrapped += dh
      lastHeadingWrapped = h
      const p = robot.translation()
      travelled += Math.hypot(p.x - prevPos.x, p.z - prevPos.z)
      prevPos = p
      checkCrash()
      if (penDown) {
        const tip = local(spec.penTip[0], 0, spec.penTip[1])
        const n = trail.length
        const lx = trail[n - 2]
        const lz = trail[n - 1]
        if (n === 0 || Number.isNaN(lx) || Math.hypot(tip.x - lx, tip.z - lz) > 0.006) trail.push(tip.x, tip.z)
      }
      sensorCache = null
    },
    setMotors(l, r) {
      target[0] = (clamp(l, -100, 100) / 100) * spec.drive.maxSpeed
      target[1] = (clamp(r, -100, 100) / 100) * spec.drive.maxSpeed
    },
    encoders() {
      return [enc[0], enc[1]]
    },
    headingUnwrapped() {
      return headingUnwrapped
    },
    sensors() {
      if (!sensorCache) sensorCache = computeSensors()
      return sensorCache
    },
    snapshot() {
      const v = robot.linvel()
      return {
        t: time,
        robot: { p: robot.translation(), q: robot.rotation() },
        wheelAngle: [wheelAngle[0], wheelAngle[1]],
        wheelSpeed: [wheelSpeed[0], wheelSpeed[1]],
        groundSpeed: Math.hypot(v.x, v.z),
        bodies: dyn.map((x) => ({ id: x.id, p: x.body.translation(), q: x.body.rotation() })),
        lightOn,
        holding: holding?.id ?? null,
        penDown,
        crashed,
      }
    },
    grip(close) {
      if (!close) {
        if (holding) {
          world.removeImpulseJoint(holding.joint, true)
          events.push({ t: time, kind: 'drop', text: holding.id })
          holding = null
        }
        return true
      }
      if (holding) return true
      const tip = local(spec.toolTip[0], spec.toolTip[1], spec.toolTip[2])
      let best: { id: string; body: RigidBody; d: number } | null = null
      for (const o of arena.objects) {
        const body = pickups.get(o.id)
        if (!body) continue
        const p = body.translation()
        const dd = Math.hypot(p.x - tip.x, p.z - tip.z)
        if (dd <= o.size + 0.05 && (!best || dd < best.d)) best = { id: o.id, body, d: dd }
      }
      if (!best) {
        events.push({ t: time, kind: 'miss' })
        return false
      }
      // Hold it at the claw: snap to the tip, then weld with a fixed joint (its mass now rides on the robot).
      const o = arena.objects.find((x) => x.id === best.id)
      const lift = (o?.size ?? 0.03) + 0.01
      const anchorLocal = { x: spec.toolTip[0], y: Math.max(spec.toolTip[1], lift), z: spec.toolTip[2] + (o?.size ?? 0.03) * 0.6 }
      best.body.setTranslation(local(anchorLocal.x, anchorLocal.y, anchorLocal.z), true)
      best.body.setRotation(robot.rotation(), true)
      best.body.setLinvel(robot.linvel(), true)
      const joint = world.createImpulseJoint(
        R.JointData.fixed(anchorLocal, { x: 0, y: 0, z: 0, w: 1 }, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0, w: 1 }),
        robot,
        best.body,
        true,
      )
      joint.setContactsEnabled(false)
      holding = { id: best.id, joint }
      events.push({ t: time, kind: 'grab', text: best.id })
      return true
    },
    setPen(down) {
      if (down && !penDown && trail.length > 0) trail.push(NaN, NaN)
      penDown = down
    },
    setLight(on) {
      lightOn = on
    },
    emit(e) {
      events.push({ ...e, t: time })
    },
    dispose() {
      world.free()
    },
  }
  return sim
}
