// lib/calculators/motor-torque.ts
//
// The physics behind /tools/motor-torque-calculator, kept apart from the UI so
// it can be read, checked and reused (the gear-ratio and battery-runtime
// calculators planned next will start from these numbers).
//
// Two cases:
//   1. Drive motors of a wheeled robot: rolling resistance + slope + acceleration.
//   2. One joint of an arm held horizontal (the worst case for gravity), plus an
//      optional angular-acceleration term.
//
// Everything is SI inside (kg, m, s, N·m). Unit conversion happens at the edges.

/** Standard acceleration of gravity, m/s². Defined value (3rd CGPM, 1901). */
export const G = 9.80665

/** 1 N·m in kgf·cm: 100 cm/m ÷ 9.80665 N/kgf. */
export const KGFCM_PER_NM = 100 / G
/** 1 N·m in ozf·in: 1 ozf·in = 0.27801385 N × 0.0254 m = 0.0070615518 N·m. */
export const OZIN_PER_NM = 1 / 0.0070615518

export const torqueUnits = {
  nm: { label: 'N·m', fromNm: 1 },
  kgcm: { label: 'kg·cm', fromNm: KGFCM_PER_NM },
  ozin: { label: 'oz·in', fromNm: OZIN_PER_NM },
} as const
export type TorqueUnit = keyof typeof torqueUnits

/**
 * Rolling-resistance presets. The published tables are for car tyres (and
 * railway wheels), not 60 mm robot wheels, so each preset names the row it comes from and
 * the page tells people to measure their own when it matters.
 * Sources: Engineering ToolBox "Rolling Resistance"; Wikipedia "Rolling resistance".
 */
export const SURFACES = [
  { id: 'rail', label: 'Steel wheel on steel rail', crr: 0.002, note: 'railway wheel on rail: 0.001–0.0024' },
  { id: 'smooth', label: 'Hard smooth floor (concrete, tile)', crr: 0.015, note: 'ordinary car tyres on concrete: 0.010–0.015' },
  { id: 'asphalt', label: 'Asphalt / rough paving', crr: 0.02, note: 'car tyres on tar or asphalt: 0.02' },
  { id: 'gravel', label: 'Solid sand, loose gravel, medium-hard soil', crr: 0.06, note: 'car tyre on solid sand, loose worn gravel, medium-hard soil: 0.04–0.08' },
  { id: 'sand', label: 'Loose sand', crr: 0.3, note: 'car tyre on loose sand: 0.2–0.4' },
] as const

export type DriveInput = {
  /** Total robot mass including battery and payload, kg. */
  massKg: number
  /** Wheel diameter, m. */
  wheelDiameterM: number
  /** Number of driven wheels, each with its own motor sharing the load equally. */
  motors: number
  /** Steepest slope it must climb, degrees. */
  slopeDeg: number
  /** Top speed, m/s. */
  speedMs: number
  /** Acceleration wanted, m/s². */
  accelMs2: number
  /** Rolling-resistance coefficient, dimensionless. */
  crr: number
  /** Efficiency between the motor's output shaft and the wheel, 0–1. */
  efficiency: number
}

export type DriveResult = {
  forces: { rolling: number; grade: number; accel: number }
  /** Force to hold top speed on the steepest slope (no acceleration), N. */
  steadyForceN: number
  /** Force while also accelerating up that slope (the worst case), N. */
  peakForceN: number
  /** Torque per motor, N·m. */
  steadyTorqueNm: number
  peakTorqueNm: number
  /** Wheel speed at top speed, rev/min. */
  wheelRpm: number
  /** Mechanical output power per motor at top speed, W. */
  steadyPowerW: number
  peakPowerW: number
  /**
   * Stall torque to look for: at least 4× continuous (Pololu's 25%-of-stall
   * recommendation for brushed DC motors) and at least 2× peak (our own margin,
   * so a sagging battery or a warm motor still accelerates).
   */
  minStallTorqueNm: number
}

const clamp = (x: number, lo: number, hi: number) => (Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : lo)

export function driveTorque(input: DriveInput): DriveResult {
  // Negative or absurd typed values would give negative torques with no warning.
  const i: DriveInput = {
    massKg: clamp(input.massKg, 0, 1e5),
    wheelDiameterM: clamp(input.wheelDiameterM, 0, 10),
    motors: clamp(Math.round(input.motors), 1, 64),
    slopeDeg: clamp(input.slopeDeg, 0, 60),
    speedMs: clamp(input.speedMs, 0, 100),
    accelMs2: clamp(input.accelMs2, 0, 100),
    crr: clamp(input.crr, 0, 1),
    efficiency: clamp(input.efficiency, 0.01, 1),
  }
  const theta = (i.slopeDeg * Math.PI) / 180
  const weight = i.massKg * G
  const rolling = i.crr * weight * Math.cos(theta)
  const grade = weight * Math.sin(theta)
  const accel = i.massKg * i.accelMs2
  const steadyForceN = rolling + grade
  const peakForceN = steadyForceN + accel

  const r = i.wheelDiameterM / 2
  const perMotor = (f: number) => (f * r) / (i.motors * i.efficiency)
  const steadyTorqueNm = perMotor(steadyForceN)
  const peakTorqueNm = perMotor(peakForceN)

  const omega = r > 0 ? i.speedMs / r : 0 // rad/s at the wheel
  const wheelRpm = (omega * 60) / (2 * Math.PI)

  return {
    forces: { rolling, grade, accel },
    steadyForceN,
    peakForceN,
    steadyTorqueNm,
    peakTorqueNm,
    wheelRpm,
    steadyPowerW: steadyTorqueNm * omega,
    peakPowerW: peakTorqueNm * omega,
    minStallTorqueNm: Math.max(steadyTorqueNm * 4, peakTorqueNm * 2),
  }
}

export type ArmLink = {
  /** Link length from this joint to the next, m. */
  lengthM: number
  /** Link mass, kg. Treated as a uniform bar, so its centre of mass is at the middle. */
  massKg: number
  /** Mass sitting at the far end of the link (the next joint's motor), kg. 0 for the last link. */
  endMassKg: number
}

export type ArmInput = {
  links: ArmLink[]
  /** Payload held at the tip, kg. */
  payloadKg: number
  /** Angular acceleration wanted at the joint, rad/s². 0 for holding only. */
  alphaRad: number
}

export type JointResult = {
  /** Which joint: 0 = base/shoulder, 1 = elbow, ... */
  joint: number
  /** Torque to hold the arm horizontal, N·m. */
  holdNm: number
  /** Extra torque to accelerate everything beyond the joint at alpha, N·m. */
  accelNm: number
  totalNm: number
  /** Moment of inertia of everything beyond the joint about the joint, kg·m². */
  inertia: number
}

/**
 * Torque at every pitch joint (horizontal axis) of a serial arm stretched out
 * horizontally, with every other joint held still and the base fixed. Horizontal is the worst case for
 * gravity: every mass is at its full lever arm. At that instant the centripetal
 * forces point along the arm and add no torque about the joint, so
 *   τ = g·Σ m·d  +  α·Σ I
 * is exact for this pose, consistent with the open-chain statics and dynamics
 * in Lynch & Park, Modern Robotics.
 */
export function armTorques(input: ArmInput): JointResult[] {
  const a: ArmInput = {
    links: input.links.map((l) => ({
      lengthM: clamp(l.lengthM, 0, 100),
      massKg: clamp(l.massKg, 0, 1e4),
      endMassKg: clamp(l.endMassKg, 0, 1e4),
    })),
    payloadKg: clamp(input.payloadKg, 0, 1e4),
    alphaRad: clamp(input.alphaRad, 0, 1e4),
  }
  const n = a.links.length
  const out: JointResult[] = []
  for (let j = 0; j < n; j++) {
    let moment = 0 // Σ m·d, kg·m
    let inertia = 0 // Σ I about joint j, kg·m²
    let reach = 0 // distance from joint j to the start of link k
    for (let k = j; k < n; k++) {
      const l = a.links[k]
      const dMid = reach + l.lengthM / 2
      moment += l.massKg * dMid
      inertia += (l.massKg * l.lengthM * l.lengthM) / 12 + l.massKg * dMid * dMid
      reach += l.lengthM
      if (k < n - 1) {
        moment += l.endMassKg * reach
        inertia += l.endMassKg * reach * reach
      }
    }
    moment += a.payloadKg * reach
    inertia += a.payloadKg * reach * reach
    const holdNm = G * moment
    const accelNm = inertia * a.alphaRad
    out.push({ joint: j, holdNm, accelNm, totalNm: holdNm + accelNm, inertia })
  }
  return out
}

export function convertTorque(nm: number, unit: TorqueUnit): number {
  return nm * torqueUnits[unit].fromNm
}
