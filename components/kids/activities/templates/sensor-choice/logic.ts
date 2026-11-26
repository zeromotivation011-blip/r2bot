// components/kids/activities/templates/sensor-choice/logic.ts
// SENSOR CHOICE — the child picks the sensors a robot needs for a mission.
// A simulated run then shows, checkpoint by checkpoint, what works and what
// fails without the right sensor ("the camera saw nothing: it was dark").
//
// The catalogue below is real robotics, simplified honestly:
//   - Ultrasonic sensors time an echo of sound. They work in the dark and see
//     glass, but soft things (curtains, fur, foam) swallow the sound and smoke
//     does not bother them.
//   - IR / time-of-flight distance sensors time or angle infrared light. Short
//     range, work in the dark; strong sunlight swamps them and light passes
//     straight through glass.
//   - 2-D LiDAR spins a laser: long range + a whole map. Glass fools it, smoke
//     scatters the beam.
//   - Cameras see colour, lines and shapes, but only with light, and not through smoke.
//   - A colour sensor shines its own LED on a surface a few mm away: works in
//     the dark, but only for what is right under it.
//   - A line sensor (IR reflectance array) sees dark/light on the floor; bright
//     sunlight's infrared confuses it.
//   - A bump switch only knows after it has touched something.
//   - An IMU (gyro + accelerometer) gives heading and tilt, from inside the robot.
//   - Wheel encoders count wheel turns: distance travelled — unless the wheels slip.
//   - GPS needs open sky: it does not work indoors.
//   - A thermal camera sees heat: people and fire, even in darkness and smoke.
//
// Pure logic: no React, no DOM.

import type { CheckResult, TemplateLogic } from '@/lib/kids/activities/types'

/** What a mission needs to know. */
export type Capability =
  | 'distance-far' // an obstacle 1–4 m away (plan ahead)
  | 'distance-near' // an obstacle 2–80 cm away (stop in time)
  | 'touch' // knows it has touched something
  | 'line' // a dark/light line on the floor
  | 'colour-floor' // colour of the surface right under the robot
  | 'colour-far' // colour of an object across the room
  | 'heading' // which way the robot is pointing / turning
  | 'tilt' // is the robot tipping, on a slope, falling?
  | 'distance-travelled' // how far the wheels have carried it
  | 'position' // where on Earth (outdoor latitude/longitude)
  | 'map' // the shape of the room around it
  | 'light-level' // is it bright or dark?
  | 'sound' // hears claps, voices, alarms
  | 'heat' // body heat or fire

/** Where the mission happens. Each condition can break some sensors. */
export type Condition =
  | 'dark' // no light (night, cave, inside a pipe)
  | 'sunlight' // bright outdoor sun
  | 'indoor' // under a roof: no sky
  | 'smoke' // smoke or thick dust
  | 'glass' // glass doors or windows to detect
  | 'soft' // soft obstacles: curtains, sofas, animals
  | 'slippery' // ice, sand, wet floor: wheels slip

export type SensorId =
  | 'ultrasonic'
  | 'ir-distance'
  | 'lidar'
  | 'camera'
  | 'colour'
  | 'line'
  | 'bump'
  | 'imu'
  | 'encoder'
  | 'gps'
  | 'light'
  | 'microphone'
  | 'thermal'

export interface SensorInfo {
  id: SensorId
  name: string
  icon: string
  /** Cost in robot credits (relative price of a real hobby/pro part). */
  cost: number
  provides: Capability[]
  /** Conditions that stop it working, with the child-friendly reason. */
  failsIn: Partial<Record<Condition, string>>
  /** One honest line on how it works. */
  how: string
}

export const SENSORS: Record<SensorId, SensorInfo> = {
  ultrasonic: {
    id: 'ultrasonic', name: 'Ultrasonic', icon: '🦇', cost: 3,
    provides: ['distance-far', 'distance-near'],
    failsIn: { soft: 'soft things like curtains swallow the sound, so no echo comes back' },
    how: 'Sends a click of sound too high to hear and times the echo, like a bat.',
  },
  'ir-distance': {
    id: 'ir-distance', name: 'IR distance', icon: '🔦', cost: 4,
    provides: ['distance-near'],
    failsIn: {
      sunlight: 'sunlight is full of infrared, so the sensor is dazzled',
      glass: 'infrared light goes straight through glass, so the glass is invisible to it',
      smoke: 'smoke scatters the infrared beam',
    },
    how: 'Shines invisible infrared light and measures how it bounces back. Short range.',
  },
  lidar: {
    id: 'lidar', name: 'LiDAR', icon: '🌀', cost: 15,
    provides: ['distance-far', 'distance-near', 'map'],
    failsIn: {
      glass: 'the laser passes through glass, so glass doors look like open space',
      smoke: 'smoke scatters the laser, so it sees a fog of false walls',
    },
    how: 'A spinning laser measures thousands of distances a second and draws a map.',
  },
  camera: {
    id: 'camera', name: 'Camera', icon: '📷', cost: 6,
    provides: ['colour-far', 'colour-floor', 'line'],
    failsIn: {
      dark: 'a camera needs light — in the dark it sees only black',
      smoke: 'a camera cannot see through smoke',
    },
    how: 'Millions of tiny light sensors make a picture; software finds colours and shapes.',
  },
  colour: {
    id: 'colour', name: 'Colour sensor', icon: '🎨', cost: 3,
    provides: ['colour-floor'],
    failsIn: {},
    how: 'Shines its own white LED on the surface just below it and measures red, green and blue.',
  },
  line: {
    id: 'line', name: 'Line sensor', icon: '〰️', cost: 3,
    provides: ['line'],
    failsIn: { sunlight: 'bright sun floods the floor with infrared, so dark and light look the same' },
    how: 'A row of infrared LEDs and detectors: dark lines reflect less light than the floor.',
  },
  bump: {
    id: 'bump', name: 'Bump switch', icon: '🔘', cost: 1,
    provides: ['touch'],
    failsIn: {},
    how: 'A switch that clicks when the bumper is pushed. It only knows after the crash.',
  },
  imu: {
    id: 'imu', name: 'IMU (gyro)', icon: '🧭', cost: 4,
    provides: ['heading', 'tilt'],
    failsIn: {},
    how: 'A gyroscope measures turning and an accelerometer feels gravity, from inside the robot.',
  },
  encoder: {
    id: 'encoder', name: 'Wheel encoder', icon: '🛞', cost: 2,
    provides: ['distance-travelled'],
    failsIn: { slippery: 'the wheels spin without moving the robot, so the count lies' },
    how: 'Counts how many times the wheel turns; turns × wheel size = distance.',
  },
  gps: {
    id: 'gps', name: 'GPS', icon: '🛰️', cost: 6,
    provides: ['position'],
    failsIn: { indoor: 'GPS listens to satellites and needs open sky — a roof blocks it' },
    how: 'Listens to timing signals from satellites and works out where on Earth it is (to a few metres).',
  },
  light: {
    id: 'light', name: 'Light sensor', icon: '💡', cost: 1,
    provides: ['light-level'],
    failsIn: {},
    how: 'A light-dependent resistor or photodiode: more light, bigger signal.',
  },
  microphone: {
    id: 'microphone', name: 'Microphone', icon: '🎤', cost: 2,
    provides: ['sound'],
    failsIn: {},
    how: 'A tiny membrane wobbles with sound; the robot measures how loud and what pitch.',
  },
  thermal: {
    id: 'thermal', name: 'Thermal camera', icon: '🌡️', cost: 12,
    provides: ['heat'],
    failsIn: {},
    how: 'Sees the infrared heat that warm things glow with — works in darkness and smoke.',
  },
}

export const CAPABILITY_LABEL: Record<Capability, string> = {
  'distance-far': 'see obstacles far ahead',
  'distance-near': 'stop before an obstacle',
  touch: 'know when it bumps something',
  line: 'follow a line on the floor',
  'colour-floor': 'tell the colour of the floor',
  'colour-far': 'spot a coloured object across the room',
  heading: 'know which way it is facing',
  tilt: 'know if it is tipping over',
  'distance-travelled': 'measure how far it has driven',
  position: 'know where it is on Earth',
  map: 'make a map of the room',
  'light-level': 'tell bright from dark',
  sound: 'hear a sound',
  heat: 'find something warm',
}

export const CONDITION_LABEL: Record<Condition, { label: string; icon: string }> = {
  dark: { label: 'Dark', icon: '🌑' },
  sunlight: { label: 'Bright sun', icon: '☀️' },
  indoor: { label: 'Indoors', icon: '🏠' },
  smoke: { label: 'Smoke', icon: '🌫️' },
  glass: { label: 'Glass doors', icon: '🚪' },
  soft: { label: 'Soft things', icon: '🛋️' },
  slippery: { label: 'Slippery', icon: '🧊' },
}

export interface Need {
  /** What the robot must sense at this checkpoint. */
  capability: Capability
  /** The story moment, shown on the checkpoint (≤ 60 chars), e.g. "Stop before the curtain". */
  label: string
  /**
   * Extra conditions that apply only at this checkpoint (on top of the
   * mission-wide ones), e.g. a single glass door in an otherwise ordinary hall.
   */
  conditions?: Condition[]
}

export interface Params {
  /** Mission name shown at the top, e.g. "Night patrol". */
  mission: string
  /** Mission-wide conditions (empty = an ordinary bright room). */
  conditions: Condition[]
  /** 1–6 checkpoints the robot must pass, in order. Each needs one capability. */
  needs: Need[]
  /** Sensors offered on the shelf (2–13, no repeats). Include tempting wrong ones. */
  available: SensorId[]
  /** Most sensors the robot can carry (1–6). Small robots ⇒ choose carefully. */
  maxSensors: number
  /**
   * Optional budget in credits (see SENSORS[x].cost). With a budget the child
   * must find the CHEAPEST working set, not just "take everything" — ages 11+.
   */
  budget?: number
  /**
   * Show what each sensor senses on its card. Default: on for Explorers and
   * Builders, off for older bands (they must know or read the "how" text).
   */
  showCapabilities?: boolean
  /** Penalise carrying sensors no checkpoint needs (weight, power, cost). Default false. */
  noExtras?: boolean
}

export interface Answer {
  /** The sensors fitted to the robot, in any order, no repeats. */
  sensors: SensorId[]
}

export interface CheckpointOutcome {
  need: Need
  ok: boolean
  /** The sensor that handled it (when ok). */
  by?: SensorId
  /** Why it failed — the most useful explanation. */
  why?: string
}

/** Every condition in force at checkpoint `n`. */
export function conditionsAt(p: Params, n: Need): Condition[] {
  return [...new Set([...p.conditions, ...(n.conditions ?? [])])]
}

/** Can sensor `s` deliver `cap` under `conds`? Returns null if yes, else the reason. */
export function sensorFailure(s: SensorId, cap: Capability, conds: Condition[]): string | null {
  const info = SENSORS[s]
  if (!info.provides.includes(cap)) return `${info.name} cannot ${CAPABILITY_LABEL[cap]}`
  for (const c of conds) {
    const why = info.failsIn[c]
    if (why) return `${info.name}: ${why}`
  }
  return null
}

/** Run the mission with a set of sensors. Pure. */
export function runMission(p: Params, sensors: SensorId[]): CheckpointOutcome[] {
  return p.needs.map((need) => {
    const conds = conditionsAt(p, need)
    const fitted = sensors.filter((s) => SENSORS[s])
    for (const s of fitted) if (sensorFailure(s, need.capability, conds) === null) return { need, ok: true, by: s }
    // Prefer explaining a fitted sensor that COULD do the job but is broken by the conditions.
    const capable = fitted.find((s) => SENSORS[s].provides.includes(need.capability))
    if (capable) return { need, ok: false, why: sensorFailure(capable, need.capability, conds) ?? undefined }
    return { need, ok: false, why: `No sensor on the robot can ${CAPABILITY_LABEL[need.capability]}.` }
  })
}

export function costOf(sensors: SensorId[]): number {
  return sensors.reduce((t, s) => t + (SENSORS[s]?.cost ?? 0), 0)
}

/** Sensors that no checkpoint used. */
export function extrasIn(p: Params, sensors: SensorId[]): SensorId[] {
  const used = new Set(runMission(p, sensors).map((o) => o.by).filter(Boolean))
  return sensors.filter((s) => !used.has(s))
}

function legal(p: Params, sensors: SensorId[]): boolean {
  if (sensors.length > p.maxSensors) return false
  if (p.budget !== undefined && costOf(sensors) > p.budget) return false
  return sensors.every((s) => p.available.includes(s)) && new Set(sensors).size === sensors.length
}

/** Smallest-cost working set (exhaustive; the shelf is at most 13 sensors). */
export function cheapestSolution(p: Params): SensorId[] | null {
  const av = [...new Set(p.available)].filter((s) => SENSORS[s])
  let best: SensorId[] | null = null
  let bestCost = Infinity
  const n = av.length
  for (let mask = 1; mask < 1 << n; mask++) {
    const set: SensorId[] = []
    for (let i = 0; i < n; i++) if (mask & (1 << i)) set.push(av[i])
    if (set.length > p.maxSensors) continue
    const c = costOf(set)
    if (c >= bestCost) continue
    if (p.budget !== undefined && c > p.budget) continue
    if (runMission(p, set).every((o) => o.ok)) {
      best = set
      bestCost = c
    }
  }
  return best
}

function validate(p: Params): string[] {
  const out: string[] = []
  if (!p.mission?.trim()) out.push('mission name is required')
  if (!Array.isArray(p.needs) || p.needs.length < 1 || p.needs.length > 6) out.push('needs: 1–6 checkpoints')
  if (!Array.isArray(p.available) || p.available.length < 2 || p.available.length > 13) out.push('available: 2–13 sensors')
  else {
    for (const s of p.available) if (!SENSORS[s]) out.push(`unknown sensor "${s}"`)
    if (new Set(p.available).size !== p.available.length) out.push('available has repeats')
  }
  if (!Number.isInteger(p.maxSensors) || p.maxSensors < 1 || p.maxSensors > 6) out.push('maxSensors: integer 1–6')
  if (p.budget !== undefined && (!(p.budget > 0) || !Number.isFinite(p.budget))) out.push('budget must be a positive number')
  for (const c of p.conditions ?? []) if (!CONDITION_LABEL[c]) out.push(`unknown condition "${c}"`)
  for (const n of p.needs ?? []) {
    if (!CAPABILITY_LABEL[n.capability]) out.push(`unknown capability "${n.capability}"`)
    if (!n.label?.trim()) out.push('every need needs a label')
    for (const c of n.conditions ?? []) if (!CONDITION_LABEL[c]) out.push(`unknown condition "${c}"`)
  }
  if (out.length) return out
  // Each checkpoint must be possible with SOME offered sensor, and all together within limits.
  p.needs.forEach((n, i) => {
    const conds = conditionsAt(p, n)
    if (!p.available.some((s) => sensorFailure(s, n.capability, conds) === null))
      out.push(`checkpoint ${i + 1} ("${n.label}") cannot be solved by any offered sensor under ${conds.join(', ') || 'normal conditions'}`)
  })
  if (out.length) return out
  if (!cheapestSolution(p)) out.push('no set of offered sensors meets every checkpoint within maxSensors/budget')
  // A puzzle where everything on the shelf works is not a choice.
  const all = runMission(p, p.available)
  if (p.available.every((s) => all.some((o) => o.by === s)) && p.budget === undefined && p.maxSensors >= p.available.length)
    out.push('every offered sensor is needed and fits — add at least one tempting wrong sensor or lower maxSensors')
  return out
}

function check(p: Params, a: Answer): CheckResult {
  const sensors = Array.isArray(a?.sensors) ? a.sensors : []
  if (sensors.length === 0) return { correct: false, score: 0, feedback: 'The robot has no sensors yet — it would drive blind. Tap a sensor to fit it.' }
  if (new Set(sensors).size !== sensors.length) return { correct: false, score: 0, feedback: 'You fitted the same sensor twice. One of each is enough.' }
  if (sensors.some((s) => !p.available.includes(s))) return { correct: false, score: 0, feedback: 'Use only the sensors on the shelf.' }
  if (sensors.length > p.maxSensors)
    return { correct: false, score: 0, feedback: `This robot only has room for ${p.maxSensors} sensor${p.maxSensors === 1 ? '' : 's'}. Which ones does the mission really need?` }
  const cost = costOf(sensors)
  if (p.budget !== undefined && cost > p.budget)
    return {
      correct: false,
      score: 0,
      feedback: `Those sensors cost ${cost} credits but the budget is ${p.budget}. Real engineers face this every day: find the cheapest set that still does every job.`,
    }
  const run = runMission(p, sensors)
  const passed = run.filter((o) => o.ok).length
  const score = passed / run.length
  const firstFail = run.find((o) => !o.ok)
  if (firstFail) {
    const idx = run.indexOf(firstFail) + 1
    return {
      correct: false,
      score,
      feedback: `${passed} of ${run.length} checkpoints passed. At checkpoint ${idx} ("${firstFail.need.label}") the robot failed: ${firstFail.why} Which sensor works there?`,
    }
  }
  const extras = extrasIn(p, sensors)
  if (p.noExtras && extras.length > 0)
    return {
      correct: false,
      score: 0.8,
      feedback: `The mission works, but ${extras.map((s) => SENSORS[s].name).join(' and ')} never helped. Every extra sensor adds weight, uses battery and costs money — take it off.`,
    }
  const cheapest = cheapestSolution(p)
  const cheapestCost = cheapest ? costOf(cheapest) : cost
  if (p.budget !== undefined && cost > cheapestCost)
    return {
      correct: true,
      score: 0.9,
      feedback: `Mission complete, inside the budget (${cost} of ${p.budget} credits). A set costing only ${cheapestCost} credits would also work — can you spot it?`,
    }
  const used = run.map((o) => `${SENSORS[o.by as SensorId].name} → ${o.need.label.toLowerCase()}`)
  return { correct: true, score: 1, feedback: `Every checkpoint passed! ${used.join('; ')}.` }
}

export const logic: TemplateLogic<Params, Answer> = {
  id: 'sensor-choice',
  name: 'Sensor choice',
  validate,
  check,
}
