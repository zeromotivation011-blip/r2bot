// components/kids/games/arm-factory/kinematics.ts
// The real maths under Arm Factory. Pure functions, no three.js, no React, so
// the simulation is testable headless and deterministic.
//
// The robot is a 3-joint "palletising" arm: a base that turns (yaw), a
// shoulder and an elbow that pitch in one vertical plane, and a wrist that is
// mechanically kept level so the gripper always points straight down (real
// palletising robots do this with a parallel linkage). Units: metres, radians,
// kilograms, seconds, newtons. World frame matches three.js: +y is up, the arm
// base sits at the origin on the table top (y = 0).

export const DEG = Math.PI / 180

/** Upper arm (shoulder → elbow) length, m. */
export const L1 = 0.45
/** Forearm (elbow → wrist) length, m. */
export const L2 = 0.4
/** Wrist → gripper fingertip centre, m (the tool hangs straight down). */
export const TOOL = 0.15
/** Height of the shoulder axis above the table, m. */
export const SHOULDER_H = 0.35

export type Joints = [number, number, number]

export interface V3 {
  x: number
  y: number
  z: number
}

export const JOINT_NAMES = ['Base', 'Shoulder', 'Elbow'] as const

/** Joint limits in radians. The base cannot spin all the way round: its cables would twist. */
export const LIMITS: readonly [number, number][] = [
  [-165 * DEG, 165 * DEG],
  [-30 * DEG, 150 * DEG],
  [-160 * DEG, 160 * DEG],
]

/** A safe "tucked" pose: the arm folded close to its own body. */
export const HOME: Joints = [0, 90 * DEG, -150 * DEG]

export function clampJoint(i: number, v: number): number {
  const [lo, hi] = LIMITS[i]
  return Math.min(hi, Math.max(lo, v))
}

export function violatedLimits(j: Joints): number[] {
  const out: number[] = []
  for (let i = 0; i < 3; i++) {
    if (j[i] < LIMITS[i][0] - 1e-9 || j[i] > LIMITS[i][1] + 1e-9) out.push(i)
  }
  return out
}

export interface ArmPoints {
  shoulder: V3
  elbow: V3
  wrist: V3
  tip: V3
  /** Horizontal distances from the base axis (for torque). */
  rElbow: number
  rWrist: number
}

function polar(r: number, y: number, yaw: number): V3 {
  return { x: r * Math.cos(yaw), y, z: -r * Math.sin(yaw) }
}

/** Forward kinematics: joint angles → where every part of the arm is. */
export function fk(j: Joints): ArmPoints {
  const [a, b, c] = j
  const rE = L1 * Math.cos(b)
  const yE = SHOULDER_H + L1 * Math.sin(b)
  const rW = rE + L2 * Math.cos(b + c)
  const yW = yE + L2 * Math.sin(b + c)
  return {
    shoulder: { x: 0, y: SHOULDER_H, z: 0 },
    elbow: polar(rE, yE, a),
    wrist: polar(rW, yW, a),
    tip: polar(rW, yW - TOOL, a),
    rElbow: rE,
    rWrist: rW,
  }
}

export interface IkSolution {
  joints: Joints
  elbow: 'up' | 'down'
  /** Indices of joints outside their limits (empty = legal). */
  violated: number[]
}

export interface IkResult {
  reachable: boolean
  /** 'far' = beyond the arm's reach, 'near' = too close to the base. */
  reason?: 'far' | 'near'
  solutions: IkSolution[]
}

/**
 * Analytic inverse kinematics for the fingertip target. Two answers in the
 * arm's plane: elbow-up and elbow-down (law of cosines). The base angle comes
 * straight from atan2 of the target's top-down position.
 */
export function ik(tip: V3, baseHint = 0): IkResult {
  const r = Math.hypot(tip.x, tip.z)
  const yaw = r < 1e-6 ? baseHint : Math.atan2(-tip.z, tip.x)
  const px = r
  const py = tip.y + TOOL - SHOULDER_H
  const d2 = px * px + py * py
  const D = (d2 - L1 * L1 - L2 * L2) / (2 * L1 * L2)
  if (D > 1 + 1e-9) return { reachable: false, reason: 'far', solutions: [] }
  if (D < -1 - 1e-9) return { reachable: false, reason: 'near', solutions: [] }
  const cosE = Math.max(-1, Math.min(1, D))
  const sols: IkSolution[] = []
  for (const elbow of ['up', 'down'] as const) {
    // A negative elbow angle folds the forearm downward from an upper arm that
    // points above the target line: the elbow sits on top ("elbow up").
    const c = (elbow === 'up' ? -1 : 1) * Math.acos(cosE)
    const b = Math.atan2(py, px) - Math.atan2(L2 * Math.sin(c), L1 + L2 * Math.cos(c))
    const joints: Joints = [yaw, b, c]
    sols.push({ joints, elbow, violated: violatedLimits(joints) })
  }
  return { reachable: true, solutions: sols }
}

/** Reachable ring (top view) for a fingertip at height h, ignoring obstacles and limits. */
export function reachRing(h: number): { rMin: number; rMax: number } | null {
  const py = h + TOOL - SHOULDER_H
  const outer = (L1 + L2) * (L1 + L2) - py * py
  if (outer <= 0) return null
  const inner = (L1 - L2) * (L1 - L2) - py * py
  return { rMin: Math.sqrt(Math.max(0, inner)), rMax: Math.sqrt(outer) }
}

// ── Motion profile ──────────────────────────────────────────────────────────

export interface Profile {
  /** Total time, s. */
  T: number
  /** Distance covered at time t (0 … dist). */
  at: (t: number) => number
}

/**
 * Trapezoidal velocity profile: speed up at amax, cruise at vmax, slow down at
 * amax. Short moves never reach vmax and become a triangle. This is how real
 * robot controllers move a joint smoothly from rest to rest.
 */
export function trapezoid(dist: number, vmax: number, amax: number): Profile {
  if (dist <= 1e-9) return { T: 0, at: () => dist }
  if (dist <= (vmax * vmax) / amax) {
    const tp = Math.sqrt(dist / amax)
    return {
      T: 2 * tp,
      at: (t) => {
        if (t <= 0) return 0
        if (t >= 2 * tp) return dist
        if (t < tp) return 0.5 * amax * t * t
        const u = 2 * tp - t
        return dist - 0.5 * amax * u * u
      },
    }
  }
  const ta = vmax / amax
  const da = 0.5 * amax * ta * ta
  const tc = (dist - 2 * da) / vmax
  const T = 2 * ta + tc
  return {
    T,
    at: (t) => {
      if (t <= 0) return 0
      if (t >= T) return dist
      if (t < ta) return 0.5 * amax * t * t
      if (t < ta + tc) return da + vmax * (t - ta)
      const u = T - t
      return dist - 0.5 * amax * u * u
    },
  }
}

/** Joint speed and acceleration at 100 % for program moves. */
export const VMAX = 2.4 // rad/s (about 140°/s)
export const AMAX = 9 // rad/s²

/** Synchronised joint move: every joint starts and stops together. */
export function planMove(from: Joints, to: Joints, speed: number): { T: number; at: (t: number) => Joints } {
  const s = Math.max(0.05, Math.min(1, speed))
  const deltas = [to[0] - from[0], to[1] - from[1], to[2] - from[2]]
  const lead = Math.max(Math.abs(deltas[0]), Math.abs(deltas[1]), Math.abs(deltas[2]))
  const prof = trapezoid(lead, VMAX * s, AMAX * s)
  return {
    T: prof.T,
    at: (t) => {
      const k = lead < 1e-9 ? 1 : prof.at(t) / lead
      return [from[0] + deltas[0] * k, from[1] + deltas[1] * k, from[2] + deltas[2] * k]
    },
  }
}

// ── Collision ───────────────────────────────────────────────────────────────

export interface Box {
  name: string
  min: V3
  max: V3
}

function distPointBox(p: V3, b: Box): number {
  const dx = Math.max(b.min.x - p.x, 0, p.x - b.max.x)
  const dy = Math.max(b.min.y - p.y, 0, p.y - b.max.y)
  const dz = Math.max(b.min.z - p.z, 0, p.z - b.max.z)
  return Math.hypot(dx, dy, dz)
}

function lerp3(a: V3, b: V3, t: number): V3 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t }
}

const SEGMENTS: { from: keyof ArmPoints; to: keyof ArmPoints; radius: number; label: string }[] = [
  { from: 'shoulder', to: 'elbow', radius: 0.04, label: 'upper arm' },
  { from: 'elbow', to: 'wrist', radius: 0.035, label: 'forearm' },
  { from: 'wrist', to: 'tip', radius: 0.022, label: 'gripper' },
]

export interface Hit {
  obstacle: string
  armPart: string
}

/**
 * Does the arm (or the part it is holding) touch the table or an obstacle?
 * The links are treated as capsules sampled every 3 cm; a held part is a cube.
 */
export function collide(j: Joints, obstacles: Box[], heldHalf: number | null): Hit | null {
  const P = fk(j)
  for (const s of SEGMENTS) {
    const a = P[s.from] as V3
    const b = P[s.to] as V3
    const len = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)
    const n = Math.max(2, Math.ceil(len / 0.03))
    for (let i = 0; i <= n; i++) {
      const p = lerp3(a, b, i / n)
      if (p.y - s.radius < -0.002) return { obstacle: 'table', armPart: s.label }
      for (const o of obstacles) {
        if (distPointBox(p, o) < s.radius) return { obstacle: o.name, armPart: s.label }
      }
    }
  }
  if (heldHalf !== null) {
    const t = P.tip
    if (t.y - heldHalf < -0.002) return { obstacle: 'table', armPart: 'part you are holding' }
    for (const o of obstacles) {
      const pad = heldHalf - 0.004
      if (
        t.x + pad > o.min.x &&
        t.x - pad < o.max.x &&
        t.y + pad > o.min.y &&
        t.y - pad < o.max.y &&
        t.z + pad > o.min.z &&
        t.z - pad < o.max.z
      ) {
        return { obstacle: o.name, armPart: 'part you are holding' }
      }
    }
  }
  return null
}

// ── Dynamics (simplified, for payload and torque limits) ────────────────────

export const G = 9.81
export const LINK1_MASS = 1.0
export const LINK2_MASS = 0.7
export const TOOL_MASS = 0.5
/** Two fingers × friction coefficient × squeeze force. */
export const GRIP_FRICTION = 0.6
export const GRIP_SQUEEZE = 15.5
export const GRIP_MAX_FORCE = 2 * GRIP_FRICTION * GRIP_SQUEEZE // 18.6 N
/** Shoulder motor peak torque, N·m. */
export const SHOULDER_MAX_TORQUE = 22

/**
 * Torque the shoulder motor must make: hold the arm up against gravity plus
 * spin it up or down (I·α). Masses are lumped at link centres and at the tool.
 */
export function shoulderTorque(j: Joints, alpha1: number, payload: number): number {
  const b = j[1]
  const c = j[2]
  // Positions in the arm's plane relative to the shoulder.
  const e = { r: L1 * Math.cos(b), y: L1 * Math.sin(b) }
  const w = { r: e.r + L2 * Math.cos(b + c), y: e.y + L2 * Math.sin(b + c) }
  const c1 = { r: e.r / 2, y: e.y / 2 }
  const c2 = { r: (e.r + w.r) / 2, y: (e.y + w.y) / 2 }
  const tipM = TOOL_MASS + payload
  const gravity = G * (LINK1_MASS * c1.r + LINK2_MASS * c2.r + tipM * w.r)
  const inertia =
    LINK1_MASS * (c1.r * c1.r + c1.y * c1.y + (L1 * L1) / 12) +
    LINK2_MASS * (c2.r * c2.r + c2.y * c2.y + (L2 * L2) / 12) +
    tipM * (w.r * w.r + w.y * w.y)
  return Math.abs(gravity + inertia * alpha1)
}

/** Friction force the fingers must supply to hold mass m while the tool accelerates by a. */
export function gripNeeded(m: number, a: V3): number {
  return m * Math.hypot(a.x, a.y + G, a.z)
}

export function toDeg(r: number): number {
  return Math.round(r / DEG)
}
