// components/kids/activities/templates/control-tuner/logic.ts
// CONTROL TUNER — tune a feedback controller on a simulated robot and watch
// the response: does it creep, overshoot, wobble, or settle neatly?
//
// The real control engineering (same maths as in industry, simplified plants):
//   - Feedback: error = target − measurement; the controller turns error into
//     motor effort, every 20 ms (50 Hz), like a real microcontroller loop.
//   - P (proportional): push harder the further away you are. Too little =
//     slow; too much = overshoot and wobble.
//   - I (integral): add up past error. Removes the "steady-state error" a
//     P-only controller leaves when something constantly pushes back (drag on
//     a moving robot, gravity on a drone).
//   - D (derivative): push back against fast change, like a brake/damper.
//     Cuts overshoot, but amplifies sensor noise.
//   - Bang-bang (full on / full off) is simple but never settles: it chatters.
//   - Motors have a maximum effort (saturation) — gains cannot make a robot
//     faster than its motors allow, and the integral is clamped (anti-windup).
//
// Plants (all with drag/damping b, mass m, effort limit uMax):
//   speed    — m·v' = u − b·v                 (a wheeled robot's cruise control)
//   position — m·x'' = u − b·x'               (drive to a stop line / a joint angle)
//   altitude — m·h'' = u − m·g − b·h', u ≥ 0  (a drone holding height)
//
// Pure logic: deterministic fixed-step simulation (dt = 5 ms). No React/DOM.

import type { CheckResult, TemplateLogic } from '@/lib/kids/activities/types'
import { gaussian, mulberry32 } from '../signal-graph/trace'

export type Plant = 'speed' | 'position' | 'altitude'
export type ControllerKind = 'bang-bang' | 'p' | 'pi' | 'pd' | 'pid'

export interface GainRange {
  min: number
  max: number
  step: number
}

export interface Params {
  plant: Plant
  /**
   * The controller. One kind = fixed. A list = the child also picks the kind
   * (e.g. ['bang-bang', 'p'] for ages 8–10 to discover why bang-bang chatters).
   */
  controller: ControllerKind | ControllerKind[]
  /** Slider ranges for the gains the child tunes. A gain the controller uses but that is not listed here is fixed at `fixed[...]` (or 0). */
  gains: { kp?: GainRange; ki?: GainRange; kd?: GainRange }
  /** Fixed gains for the ones without a slider. */
  fixed?: { kp?: number; ki?: number; kd?: number }
  /** Setpoint: m/s for speed, m for position and altitude. Start value is 0. */
  target: number
  /** Simulated seconds (3–30). */
  durationS: number
  /** Override physics. Defaults: speed m=2 b=1 uMax=10 · position m=1 b=0.5 uMax=5 · altitude m=1 b=0.3 uMax=20 (N). */
  physics?: { mass?: number; drag?: number; uMax?: number }
  /** A shove/gust: extra force (N) from t for durationS seconds. Teaches disturbance rejection (I term). */
  disturbance?: { t: number; force: number; durationS: number }
  /** Sensor noise std-dev (target units). Makes big Kd jittery. With `seed`. */
  sensorNoise?: number
  seed?: number
  /** altitude only: add hover thrust (m·g) automatically, as real flight controllers do. Default false. */
  feedForward?: boolean
  /** Pass criteria. At least one. */
  spec: {
    /** Max overshoot past the target, % of the step. */
    maxOvershootPct?: number
    /** Must be inside the band (and stay there) by this time, s. */
    settleS?: number
    /** Band half-width as % of the step. Default 5. */
    bandPct?: number
    /** Max |error| averaged over the last 10 % of the run (target units). */
    maxSteadyErr?: number
  }
  /** Show the Python-style control loop with live numbers. Default on for ages 14+. */
  showCode?: boolean
  /** Short story label for the scene, e.g. "Delivery bot cruise control". */
  label?: string
}

export interface Answer {
  /** Chosen kind (only when Params.controller is a list). */
  controller?: ControllerKind
  kp?: number
  ki?: number
  kd?: number
}

export interface SimResult {
  t: number[]
  y: number[]
  u: number[]
  overshootPct: number
  /** Time it entered the band for good (Infinity if never). */
  settleS: number
  steadyErr: number
  /** Number of times the error changed sign after the first crossing. */
  wobbles: number
  saturatedPct: number
}

export const PLANT_INFO: Record<Plant, { unit: string; quantity: string; mass: number; drag: number; uMax: number }> = {
  speed: { unit: 'm/s', quantity: 'speed', mass: 2, drag: 1, uMax: 10 },
  position: { unit: 'm', quantity: 'position', mass: 1, drag: 0.5, uMax: 5 },
  altitude: { unit: 'm', quantity: 'height', mass: 1, drag: 0.3, uMax: 20 },
}

const G = 9.81
const DT = 0.005
const CTRL_EVERY = 4 // 4 × 5 ms = 20 ms control period (50 Hz)
export const SAMPLE_EVERY = 4 // record every 20 ms

export function kindsOf(p: Params): ControllerKind[] {
  return Array.isArray(p.controller) ? p.controller : [p.controller]
}

export function usesGain(kind: ControllerKind, g: 'kp' | 'ki' | 'kd'): boolean {
  if (kind === 'bang-bang') return false
  if (g === 'kp') return true
  if (g === 'ki') return kind === 'pi' || kind === 'pid'
  return kind === 'pd' || kind === 'pid'
}

/** Resolve the effective controller and gains for an answer. */
export function resolve(p: Params, a: Answer): { kind: ControllerKind; kp: number; ki: number; kd: number } {
  const kinds = kindsOf(p)
  const kind = kinds.length > 1 && a.controller && kinds.includes(a.controller) ? a.controller : kinds[0]
  const pick = (g: 'kp' | 'ki' | 'kd') => (!usesGain(kind, g) ? 0 : p.gains[g] ? (a[g] ?? p.gains[g]!.min) : (p.fixed?.[g] ?? 0))
  return { kind, kp: pick('kp'), ki: pick('ki'), kd: pick('kd') }
}

export function simulate(p: Params, a: Answer): SimResult {
  const info = PLANT_INFO[p.plant]
  const m = p.physics?.mass ?? info.mass
  const b = p.physics?.drag ?? info.drag
  const uMax = p.physics?.uMax ?? info.uMax
  const uMin = p.plant === 'altitude' ? 0 : -uMax
  const { kind, kp, ki, kd } = resolve(p, a)
  const rng = mulberry32(p.seed ?? 1)
  const noise = p.sensorNoise ?? 0
  const ff = p.plant === 'altitude' && p.feedForward ? m * G : 0
  const steps = Math.round(p.durationS / DT)
  let pos = 0
  let vel = 0
  let integ = 0
  let prevMeas = 0
  let u = 0
  let sat = 0
  let ctrlTicks = 0
  const T: number[] = []
  const Y: number[] = []
  const U: number[] = []
  for (let k = 0; k <= steps; k++) {
    const t = k * DT
    const y = p.plant === 'speed' ? vel : pos
    if (k % CTRL_EVERY === 0) {
      const meas = y + (noise > 0 ? noise * gaussian(rng) : 0)
      const e = p.target - meas
      const dMeas = k === 0 ? 0 : (meas - prevMeas) / (DT * CTRL_EVERY)
      prevMeas = meas
      if (kind === 'bang-bang') u = e > 0 ? uMax : uMin
      else {
        if (ki > 0) {
          integ += e * DT * CTRL_EVERY
          const lim = uMax / ki
          integ = Math.max(-lim, Math.min(lim, integ)) // anti-windup
        }
        // Derivative on measurement (no "kick" when the target steps).
        u = kp * e + ki * integ - kd * dMeas + ff
      }
      if (u > uMax || u < uMin) sat++
      u = Math.max(uMin, Math.min(uMax, u))
      ctrlTicks++
    }
    if (k % SAMPLE_EVERY === 0) {
      T.push(Math.round(t * 1000) / 1000)
      Y.push(y)
      U.push(u)
    }
    const dist = p.disturbance && t >= p.disturbance.t && t < p.disturbance.t + p.disturbance.durationS ? p.disturbance.force : 0
    if (p.plant === 'speed') {
      vel += ((u + dist - b * vel) / m) * DT
    } else {
      const grav = p.plant === 'altitude' ? m * G : 0
      vel += ((u + dist - b * vel - grav) / m) * DT
      pos += vel * DT
      if (p.plant === 'altitude' && pos <= 0) {
        pos = 0
        if (vel < 0) vel = 0
      }
    }
  }
  const step = Math.abs(p.target) || 1
  const sign = p.target >= 0 ? 1 : -1
  const peak = Math.max(...Y.map((v) => v * sign))
  const overshootPct = Math.max(0, ((peak - Math.abs(p.target)) / step) * 100)
  const band = ((p.spec.bandPct ?? 5) / 100) * step
  let lastOut = -1
  for (let i = 0; i < Y.length; i++) if (Math.abs(Y[i] - p.target) > band) lastOut = i
  const settleS = lastOut === Y.length - 1 ? Infinity : lastOut < 0 ? 0 : T[lastOut + 1]
  const tail = Y.slice(Math.floor(Y.length * 0.9))
  const steadyErr = Math.abs(tail.reduce((s, v) => s + v, 0) / tail.length - p.target)
  let wobbles = 0
  let crossed = false
  let prevSign = Math.sign(p.target - Y[0])
  for (const v of Y) {
    const s = Math.sign(p.target - v)
    if (s !== 0 && prevSign !== 0 && s !== prevSign) {
      if (crossed) wobbles++
      crossed = true
    }
    if (s !== 0) prevSign = s
  }
  return { t: T, y: Y, u: U, overshootPct, settleS, steadyErr, wobbles, saturatedPct: ctrlTicks ? (100 * sat) / ctrlTicks : 0 }
}

export function passes(p: Params, r: SimResult): boolean {
  const s = p.spec
  if (s.maxOvershootPct !== undefined && r.overshootPct > s.maxOvershootPct + 1e-9) return false
  if (s.settleS !== undefined && !(r.settleS <= s.settleS + 1e-9)) return false
  if (s.maxSteadyErr !== undefined && r.steadyErr > s.maxSteadyErr + 1e-9) return false
  return true
}

function grid(r: GainRange | undefined, n: number): (number | undefined)[] {
  if (!r) return [undefined]
  const out: number[] = []
  const count = Math.round((r.max - r.min) / r.step)
  const every = Math.max(1, Math.round(count / n))
  for (let i = 0; i <= count; i += every) out.push(Math.round((r.min + i * r.step) * 1e6) / 1e6)
  return out
}

/** Coarse search for a passing answer (validate + teacher hints). */
export function findSolution(p: Params): Answer | null {
  for (const kind of kindsOf(p))
    for (const kp of usesGain(kind, 'kp') ? grid(p.gains.kp, 16) : [undefined])
      for (const ki of usesGain(kind, 'ki') ? grid(p.gains.ki, 8) : [undefined])
        for (const kd of usesGain(kind, 'kd') ? grid(p.gains.kd, 8) : [undefined]) {
          const a: Answer = { controller: kind, kp, ki, kd }
          if (passes(p, simulate(p, a))) return a
        }
  return null
}

function validRange(r: GainRange | undefined, name: string, out: string[]) {
  if (!r) return
  if (!(r.min >= 0 && r.max > r.min && r.step > 0)) out.push(`gains.${name}: need 0 ≤ min < max and step > 0`)
  else if ((r.max - r.min) / r.step > 1000) out.push(`gains.${name}: too many steps (≤ 1000)`)
}

function validate(p: Params): string[] {
  const out: string[] = []
  if (!PLANT_INFO[p.plant]) out.push('plant must be speed, position or altitude')
  const kinds = kindsOf(p)
  const all: ControllerKind[] = ['bang-bang', 'p', 'pi', 'pd', 'pid']
  if (kinds.length === 0 || kinds.some((k) => !all.includes(k))) out.push('controller must be one or more of bang-bang, p, pi, pd, pid')
  validRange(p.gains?.kp, 'kp', out)
  validRange(p.gains?.ki, 'ki', out)
  validRange(p.gains?.kd, 'kd', out)
  if (!Number.isFinite(p.target) || p.target === 0) out.push('target must be a non-zero number')
  if (p.plant === 'altitude' && p.target < 0) out.push('altitude target must be above the ground')
  if (!(p.durationS >= 3 && p.durationS <= 30)) out.push('durationS: 3–30')
  const ph = p.physics
  if (ph && ((ph.mass !== undefined && !(ph.mass > 0)) || (ph.drag !== undefined && !(ph.drag >= 0)) || (ph.uMax !== undefined && !(ph.uMax > 0))))
    out.push('physics values must be positive')
  if (p.plant === 'altitude' && (ph?.uMax ?? PLANT_INFO.altitude.uMax) <= (ph?.mass ?? PLANT_INFO.altitude.mass) * G)
    out.push('altitude: uMax must exceed m·g or the drone can never lift off')
  if (p.disturbance && !(p.disturbance.t >= 0 && p.disturbance.t < p.durationS && p.disturbance.durationS > 0)) out.push('disturbance must start inside the run')
  if (p.sensorNoise !== undefined && !(p.sensorNoise >= 0 && p.sensorNoise <= Math.abs(p.target) * 0.2)) out.push('sensorNoise: 0–20 % of the target')
  if (p.sensorNoise && !Number.isInteger(p.seed)) out.push('sensorNoise needs an integer seed')
  const s = p.spec
  if (!s || (s.maxOvershootPct === undefined && s.settleS === undefined && s.maxSteadyErr === undefined)) out.push('spec needs at least one criterion')
  if (s?.settleS !== undefined && !(s.settleS > 0 && s.settleS <= p.durationS)) out.push('spec.settleS must be within the run')
  if (s?.bandPct !== undefined && !(s.bandPct > 0 && s.bandPct <= 50)) out.push('spec.bandPct: (0, 50]')
  const tunable = kinds.some((k) => (['kp', 'ki', 'kd'] as const).some((g) => usesGain(k, g) && p.gains[g]))
  if (!tunable && kinds.length === 1) out.push('nothing to tune: give a gain range or a choice of controllers')
  if (out.length) return out
  if (!findSolution(p)) out.push('no gains in the allowed ranges meet the spec — widen the ranges or relax the spec')
  return out
}

const r1 = (n: number) => Math.round(n * 10) / 10
const r2 = (n: number) => Math.round(n * 100) / 100

function check(p: Params, a: Answer): CheckResult {
  const r = simulate(p, a ?? {})
  const { kind, ki, kd } = resolve(p, a ?? {})
  const info = PLANT_INFO[p.plant]
  const s = p.spec
  if (passes(p, r)) {
    const bits = [`overshoot ${r1(r.overshootPct)} %`]
    if (Number.isFinite(r.settleS)) bits.push(`settled in ${r1(r.settleS)} s`)
    bits.push(`final error ${r2(r.steadyErr)} ${info.unit}`)
    return {
      correct: true,
      score: 1,
      feedback: `Smooth! ${bits.join(', ')}. ${
        kind === 'pid' || kind === 'pd' ? 'The D term braked it as it got close. ' : ''
      }${kind === 'pid' || kind === 'pi' ? 'The I term cleaned up the last bit of error. ' : ''}This is exactly how engineers tune robot motors and drones.`,
    }
  }
  const score = Math.max(0.1, Math.min(0.9, 1 / (1 + r.overshootPct / 30 + (Number.isFinite(r.settleS) ? 0 : 0.5) + r.steadyErr / Math.max(0.01, Math.abs(p.target)))))
  if (kind === 'bang-bang')
    return {
      correct: false,
      score: 0.2,
      feedback: `Bang-bang is either full power or none, so it overshoots, turns round, overshoots again — ${r.wobbles} wobbles and it never settles. A P controller pushes gently when it is close.`,
    }
  if (s.maxOvershootPct !== undefined && r.overshootPct > s.maxOvershootPct)
    return {
      correct: false,
      score,
      feedback: `It shot past the target by ${r1(r.overshootPct)} % (allowed ${s.maxOvershootPct} %). Too much push near the end: lower Kp${
        p.gains.kd && (kind === 'pd' || kind === 'pid') ? ', or add more Kd — a brake that grows with speed' : ''
      }${ki > 0 ? ', or use a smaller Ki (the I term keeps pushing after it arrives)' : ''}.`,
    }
  const stoppedShort = r.steadyErr > (s.maxSteadyErr ?? ((s.bandPct ?? 5) / 100) * Math.abs(p.target))
  if (stoppedShort && r.wobbles <= 2) {
    const why =
      p.plant === 'speed'
        ? 'drag keeps slowing the robot, and P only pushes while there is an error'
        : p.plant === 'altitude' && !p.feedForward
          ? 'gravity pulls the drone down all the time, and P only pushes while there is an error'
          : 'the controller is too gentle to finish the job'
    const fix = p.gains.ki && (kind === 'pi' || kind === 'pid') ? 'Raise Ki: the I term adds up the leftover error until it is gone.' : 'Raise Kp to push harder.'
    return { correct: false, score, feedback: `It stopped ${r2(r.steadyErr)} ${info.unit} short of the target: ${why}. ${fix}` }
  }
  if (r.wobbles > 3)
    return {
      correct: false,
      score,
      feedback: `It keeps wobbling around the target (${r.wobbles} times). The gains are fighting each other — lower Kp${ki > 0 ? ' or Ki' : ''}${
        p.gains.kd && (kind === 'pd' || kind === 'pid') ? `, or add damping with Kd${kd > 0 && p.sensorNoise ? ' (but too much Kd also amplifies sensor noise)' : ''}` : ''
      }.`,
    }
  if (s.settleS !== undefined && !(r.settleS <= s.settleS))
    return {
      correct: false,
      score,
      feedback: Number.isFinite(r.settleS)
        ? `It got there in ${r1(r.settleS)} s, but the job needs ${s.settleS} s. Push harder: raise Kp${r.saturatedPct > 60 ? ' — though the motor is already at full power most of the time' : ''}.`
        : `It never settled inside the target band in ${p.durationS} s. ${p.disturbance ? 'The push knocked it off and it never came back: an I term fixes that. ' : ''}Try a bit more Kp${p.gains.ki ? ' or Ki' : ''}.`,
    }
  return { correct: false, score, feedback: 'Close! Look at the graph and nudge one gain at a time.' }
}

export const logic: TemplateLogic<Params, Answer> = {
  id: 'control-tuner',
  name: 'Control tuner',
  validate,
  check,
}
