// components/kids/games/bio-bots/model.ts
// Bio-Bot Lab — the simulation underneath every tier. Pure TypeScript: no
// React, no DOM, deterministic (seeded randomness only), so a result is fair
// and the same design always gives the same answer.
//
// What is modelled (simplified, but with real physics in every rule):
//   • Locomotion modules copied from animals, each with a mass, a speed and a
//     COST OF TRANSPORT (CoT = energy ÷ (mass × g × distance), the number
//     biologists and roboticists use to compare a mouse, a horse and a robot).
//   • Terrain rules: a wheel climbs a step only up to about its radius; a body
//     only fits a pipe narrower than itself; gecko pads hold by adhesion
//     (pad area × shear stress) and need a safety factor of 2; flapping wings
//     must make more lift than the robot weighs; a gait needs a minimum
//     friction coefficient, and a fast trot needs more than a slow crawl.
//   • Pilot stations: a four-legged crawl whose support polygon is computed
//     from the real foot positions every instant; a snake pressing on pipe
//     walls (friction = μ × wall push); flapping lift ∝ f² and power ∝ f³.

export const G = 9.81

// ── Seeded randomness ────────────────────────────────────────────────────────
export function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffled<T>(list: readonly T[], seed: number): T[] {
  const r = rng(seed)
  const out = list.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

// ── Modules (the animal tricks) ─────────────────────────────────────────────
export type ModuleId = 'wheels' | 'legs' | 'gecko' | 'snake' | 'wings' | 'fins'
/** Cadet-only tools for grabbing and perching. */
export type ToolId = 'octopus' | 'crab' | 'claws'
export type TrickId = ModuleId | ToolId

export interface TrickDef {
  id: TrickId
  name: string
  animal: string
  emoji: string
  /** kg, for the six locomotion modules. */
  mass: number
  /** What it does, in one line a 7-year-old understands. */
  blurb: string
  /** A real robot that uses this idea. */
  real: string
}

export const TRICKS: Record<TrickId, TrickDef> = {
  wheels: { id: 'wheels', name: 'Wheels', animal: 'no animal — a human invention', emoji: '🛞', mass: 0.6, blurb: 'Rolls fast and cheaply on smooth, flat ground.', real: 'Delivery robots and Mars rovers roll on wheels.' },
  legs: { id: 'legs', name: 'Four legs', animal: 'dog / mountain goat', emoji: '🐐', mass: 1.2, blurb: 'Steps over rocks and holes, one foot at a time.', real: 'Four-legged robots like Spot and ANYmal walk through factories, mines and rubble.' },
  gecko: { id: 'gecko', name: 'Gecko feet', animal: 'gecko', emoji: '🦎', mass: 0.3, blurb: 'Millions of tiny hairs stick to smooth walls — no glue.', real: 'Stanford’s Stickybot climbed glass in 2006 with gecko-inspired dry adhesive feet.' },
  snake: { id: 'snake', name: 'Snake body', animal: 'snake', emoji: '🐍', mass: 1.4, blurb: 'A long thin body that slithers into pipes and through rubble.', real: 'Snake robots inspect pipes, and swimming ones like Eelume check underwater equipment.' },
  wings: { id: 'wings', name: 'Flapping wings', animal: 'bird / insect', emoji: '🐦', mass: 0.7, blurb: 'Flaps to make lift and hop over gaps.', real: 'Harvard’s insect-sized RoboBee first flew under control in 2013, flapping about 120 times a second.' },
  fins: { id: 'fins', name: 'Fish tail', animal: 'fish', emoji: '🐟', mass: 0.5, blurb: 'Swishes a tail to swim smoothly and cheaply.', real: 'MIT’s soft robot fish SoFi swam among real fish on a reef in Fiji in 2018.' },
  octopus: { id: 'octopus', name: 'Octopus arm', animal: 'octopus', emoji: '🐙', mass: 0.3, blurb: 'A soft arm that wraps gently round things.', real: 'Soft grippers inspired by octopus arms pick fruit and fragile food in factories.' },
  crab: { id: 'crab', name: 'Crab pincer', animal: 'crab', emoji: '🦀', mass: 0.3, blurb: 'A hard, strong pincer that squeezes tight.', real: 'Hard metal grippers lift car parts in factories — strong, but not gentle.' },
  claws: { id: 'claws', name: 'Bird feet', animal: 'parrot / falcon', emoji: '🦜', mass: 0.2, blurb: 'Grasping toes that wrap round a branch and lock.', real: 'Stanford’s SNAG robot (2021) perches on branches with bird-like legs and feet.' },
}

export const MODULE_IDS: ModuleId[] = ['wheels', 'legs', 'gecko', 'snake', 'wings', 'fins']

/** Brain, sensors and frame — every robot has this. */
export const BODY_KG = 1.0

// ── Terrains ────────────────────────────────────────────────────────────────
export type Terrain = 'flat' | 'rubble' | 'pipe' | 'glass' | 'water' | 'gap' | 'ice'

export interface TerrainDef {
  id: Terrain
  name: string
  emoji: string
  /** What makes it hard. */
  challenge: string
}

export const TERRAINS: Record<Terrain, TerrainDef> = {
  flat: { id: 'flat', name: 'Flat ground', emoji: '🟫', challenge: 'Easy — but long. Energy per metre matters most here.' },
  rubble: { id: 'rubble', name: 'Rubble', emoji: '🪨', challenge: 'Rocks 20 cm high: taller than a wheel can climb.' },
  pipe: { id: 'pipe', name: 'Narrow pipe', emoji: '🕳️', challenge: 'Only 15 cm wide: a wide body will not fit.' },
  glass: { id: 'glass', name: 'Glass wall', emoji: '🪟', challenge: 'Vertical and smooth: something must hold the robot on.' },
  water: { id: 'water', name: 'Lake', emoji: '🌊', challenge: 'Deep water: you need to swim.' },
  gap: { id: 'gap', name: 'River gap', emoji: '🏞️', challenge: 'No bridge: the robot must fly, so lift must beat weight.' },
  ice: { id: 'ice', name: 'Icy slope', emoji: '🧊', challenge: 'Friction only μ = 0.15: fast feet slip.' },
}

// Physics constants of the modules.
export const WING_LIFT_N = 40 // most lift the flapping wings can make
export const GECKO_HOLD_N = 100 // pad area 125 cm² × 0.8 N/cm² shear stress
export const GECKO_SAFETY = 2
export const ICE_MU = 0.15
/** Friction needed: tan(5° slope) ≈ 0.09 plus what the gait’s push and braking need. */
export const MU_NEEDED = { wheels: 0.11, crawl: 0.12, trot: 0.29, snake: 0.3 } as const
export const WHEEL_RADIUS_CM = 8
export const RUBBLE_STEP_CM = 20
export const PIPE_CM = 15

export type Gait = 'trot' | 'crawl' | 'auto'
export const AUTO_SENSOR_KG = 0.15

export type BatteryId = 'small' | 'medium' | 'large'
export const BATTERIES: Record<BatteryId, { id: BatteryId; label: string; wh: number; kg: number }> = {
  small: { id: 'small', label: '25 Wh', wh: 25, kg: 0.15 },
  medium: { id: 'medium', label: '50 Wh', wh: 50, kg: 0.3 },
  large: { id: 'large', label: '100 Wh', wh: 100, kg: 0.6 },
}

export interface Design {
  modules: ModuleId[]
  gait: Gait
  battery: BatteryId
}

export function designMass(d: Design): number {
  let m = BODY_KG + BATTERIES[d.battery].kg + (d.gait === 'auto' && d.modules.includes('legs') ? AUTO_SENSOR_KG : 0)
  for (const id of d.modules) m += TRICKS[id].mass
  return Math.round(m * 100) / 100
}

/** One way to cross one terrain: which module, at what speed and cost. */
interface Way {
  module: ModuleId
  /** m/s */
  speed: number
  cot: number
  label: string
}

export interface SegmentResult {
  terrain: Terrain
  length: number
  ok: boolean
  module: ModuleId | null
  label: string
  energyJ: number
  timeS: number
  /** Why it failed, or why this module was chosen. */
  why: string
}

function legWay(terrain: Terrain, gait: 'trot' | 'crawl'): Way | null {
  if (terrain === 'flat') return gait === 'trot' ? { module: 'legs', speed: 0.9, cot: 0.7, label: 'trots' } : { module: 'legs', speed: 0.25, cot: 1.2, label: 'crawls' }
  if (terrain === 'rubble') return gait === 'trot' ? { module: 'legs', speed: 0.5, cot: 1.1, label: 'trots over the rocks' } : { module: 'legs', speed: 0.15, cot: 1.8, label: 'picks its way over the rocks' }
  if (terrain === 'ice') return gait === 'crawl' ? { module: 'legs', speed: 0.2, cot: 1.3, label: 'crawls with three feet down' } : null
  return null
}

/** Evaluate one terrain segment for a design (the robot picks its cheapest working way). */
export function crossSegment(d: Design, terrain: Terrain, length: number): SegmentResult {
  const m = designMass(d)
  const w = m * G
  const has = (id: ModuleId) => d.modules.includes(id)
  const ways: Way[] = []
  const blocked: string[] = []
  const gaitHere: 'trot' | 'crawl' = d.gait === 'crawl' ? 'crawl' : d.gait === 'auto' && terrain === 'ice' ? 'crawl' : 'trot'

  switch (terrain) {
    case 'flat':
      if (has('wheels')) ways.push({ module: 'wheels', speed: 1.2, cot: 0.1, label: 'rolls' })
      if (has('legs')) ways.push(legWay('flat', gaitHere)!)
      if (has('snake')) ways.push({ module: 'snake', speed: 0.2, cot: 2.0, label: 'slithers' })
      if (!ways.length) blocked.push('Nothing to move with on the ground.')
      break
    case 'rubble':
      if (has('legs')) ways.push(legWay('rubble', gaitHere)!)
      if (has('snake')) ways.push({ module: 'snake', speed: 0.15, cot: 2.4, label: 'slithers through the gaps' })
      if (has('wheels')) blocked.push(`The ${RUBBLE_STEP_CM} cm rocks are taller than the ${WHEEL_RADIUS_CM} cm wheel radius — a wheel can only climb a step about as high as its radius.`)
      if (!ways.length && !blocked.length) blocked.push('It needs legs or a snake body to cross rocks.')
      break
    case 'pipe':
      if (has('snake')) ways.push({ module: 'snake', speed: 0.1, cot: 2.2, label: 'slithers along the pipe' })
      else blocked.push(`The pipe is only ${PIPE_CM} cm wide. Only a long, thin snake body fits.`)
      break
    case 'glass':
      if (has('gecko') && has('legs')) {
        const need = GECKO_SAFETY * w
        if (GECKO_HOLD_N >= need) ways.push({ module: 'gecko', speed: 0.08, cot: 5.0, label: 'climbs on gecko feet' })
        else blocked.push(`Gecko pads hold ${GECKO_HOLD_N} N, but a ${m.toFixed(2)} kg robot needs ${need.toFixed(0)} N (2 × its weight, for safety). Too heavy to climb.`)
      } else if (has('gecko')) blocked.push('Gecko pads are feet — they need legs to walk up the wall.')
      else blocked.push('Glass is smooth and vertical. Without gecko feet, gravity pulls the robot off.')
      break
    case 'water':
      if (has('fins')) ways.push({ module: 'fins', speed: 0.8, cot: 0.4, label: 'swims with its tail' })
      if (has('snake')) ways.push({ module: 'snake', speed: 0.3, cot: 1.2, label: 'swims like a sea snake' })
      if (!ways.length) blocked.push('Deep water: legs and wheels cannot push on anything. It needs a tail or a snake body.')
      break
    case 'gap':
      if (has('wings')) {
        if (WING_LIFT_N >= w) ways.push({ module: 'wings', speed: 5, cot: 3.0, label: 'flaps across' })
        else blocked.push(`The wings make ${WING_LIFT_N} N of lift but the robot weighs ${w.toFixed(1)} N (${m.toFixed(2)} kg × 9.81). Weight beats lift — it cannot take off.`)
      } else blocked.push('No bridge. Only flapping wings can carry the robot over.')
      break
    case 'ice':
      if (has('wheels')) ways.push({ module: 'wheels', speed: 0.6, cot: 0.1, label: 'rolls slowly and smoothly' })
      if (has('legs')) {
        const lw = legWay('ice', gaitHere)
        if (lw) ways.push(lw)
        else blocked.push(`Trotting feet push and brake hard: they need friction μ ≈ ${MU_NEEDED.trot}, but ice gives only ${ICE_MU}. The feet slip.`)
      }
      if (has('snake')) blocked.push(`A snake pushes sideways on the ground and needs μ ≈ ${MU_NEEDED.snake}. On ice (μ = ${ICE_MU}) it just wriggles in place.`)
      if (!has('wheels') && !has('legs') && !has('snake')) blocked.push('Nothing to move with on the ice.')
      break
  }

  if (!ways.length) return { terrain, length, ok: false, module: null, label: '', energyJ: 0, timeS: 0, why: blocked[0] ?? 'It cannot cross.' }
  let best = ways[0]
  for (const wy of ways) if (wy.cot < best.cot) best = wy
  const energyJ = best.cot * w * length
  const timeS = length / best.speed
  const alt = ways.length > 1 ? ` (cheapest of ${ways.length} ways it could cross)` : ''
  return {
    terrain,
    length,
    ok: true,
    module: best.module,
    label: best.label,
    energyJ,
    timeS,
    why: `${TRICKS[best.module].name}: cost of transport ${best.cot} × ${w.toFixed(1)} N × ${length} m = ${(energyJ / 1000).toFixed(1)} kJ${alt}.`,
  }
}

export interface CourseSegment {
  terrain: Terrain
  length: number
}

export interface CourseResult {
  ok: boolean
  segments: SegmentResult[]
  /** Index of the segment where it stopped (-1 when it finished). */
  stopAt: number
  /** Fraction (0–1) of the stop segment completed before stopping. */
  stopFrac: number
  energyJ: number
  timeS: number
  batteryJ: number
  timeLimitS: number | null
  massKg: number
  why: string
}

export function runCourse(d: Design, course: CourseSegment[], batteryJ: number, timeLimitS: number | null): CourseResult {
  const massKg = designMass(d)
  const segments = course.map((s) => crossSegment(d, s.terrain, s.length))
  let e = 0
  let t = 0
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i]
    if (!s.ok) return { ok: false, segments, stopAt: i, stopFrac: 0, energyJ: e, timeS: t, batteryJ, timeLimitS, massKg, why: `${TERRAINS[s.terrain].name}: ${s.why}` }
    if (e + s.energyJ > batteryJ) {
      const frac = (batteryJ - e) / s.energyJ
      return {
        ok: false,
        segments,
        stopAt: i,
        stopFrac: frac,
        energyJ: batteryJ,
        timeS: t + s.timeS * frac,
        batteryJ,
        timeLimitS,
        massKg,
        why: `The battery ran flat on the ${TERRAINS[s.terrain].name.toLowerCase()}. Every kilogram costs energy on every metre: this robot is ${massKg} kg.`,
      }
    }
    if (timeLimitS !== null && t + s.timeS > timeLimitS) {
      const frac = (timeLimitS - t) / s.timeS
      return {
        ok: false,
        segments,
        stopAt: i,
        stopFrac: frac,
        energyJ: e + s.energyJ * frac,
        timeS: timeLimitS,
        batteryJ,
        timeLimitS,
        massKg,
        why: `Out of time on the ${TERRAINS[s.terrain].name.toLowerCase()}. A slow, careful gait is safe but takes ages on long ground.`,
      }
    }
    e += s.energyJ
    t += s.timeS
  }
  return { ok: true, segments, stopAt: -1, stopFrac: 1, energyJ: e, timeS: t, batteryJ, timeLimitS, massKg, why: 'Made it all the way!' }
}

// ── Cadet: match the trick to the challenge ─────────────────────────────────
export type CadetTask = Terrain | 'grab' | 'perch'

export interface CadetChallenge {
  id: string
  task: CadetTask
  title: string
  story: string
  options: TrickId[]
  answer: TrickId
}

export const CADET_CHALLENGES: CadetChallenge[] = [
  { id: 'window', task: 'glass', title: 'Clean the skyscraper window', story: 'A robot must climb a tall glass window to clean it. Glass is smooth and goes straight up!', options: ['wheels', 'gecko', 'fins'], answer: 'gecko' },
  { id: 'pipe', task: 'pipe', title: 'Find the leak in the pipe', story: 'Water is leaking somewhere inside a long, narrow pipe. Which trick gets the robot inside?', options: ['legs', 'wings', 'snake'], answer: 'snake' },
  { id: 'pond', task: 'water', title: 'Test the lake water', story: 'Scientists want to check if the lake is clean. The robot must cross deep water.', options: ['fins', 'wheels', 'gecko'], answer: 'fins' },
  { id: 'river', task: 'gap', title: 'Cross the river', story: 'The bridge is broken! The robot has to get to the other side of the river.', options: ['wheels', 'snake', 'wings'], answer: 'wings' },
  { id: 'rubble', task: 'rubble', title: 'Climb the rubble', story: 'After an earthquake, rescuers need a robot to cross big broken rocks to look for people.', options: ['wheels', 'legs', 'fins'], answer: 'legs' },
  { id: 'tomato', task: 'grab', title: 'Pick a ripe tomato', story: 'A farm robot must pick a soft, ripe tomato — without squashing it!', options: ['crab', 'octopus', 'wheels'], answer: 'octopus' },
  { id: 'branch', task: 'perch', title: 'Land on a branch', story: 'A drone is tired. It wants to land on a tree branch to rest and save battery. Which feet?', options: ['wheels', 'claws', 'fins'], answer: 'claws' },
]

export type FailMode = 'slide' | 'stuck' | 'sink' | 'fall' | 'squash' | 'drop' | 'none'

export interface CadetOutcome {
  ok: boolean
  mode: FailMode
  /** Why it happened, in words a 7-year-old understands. */
  why: string
}

const CADET_MASS = 1.5 // kg — a small robot

export function cadetTry(task: CadetTask, trick: TrickId): CadetOutcome {
  if (task === 'grab') {
    // Grip pressure on a ripe tomato: it bruises above about 40 kPa.
    if (trick === 'octopus') return { ok: true, mode: 'none', why: 'The soft arm wraps all the way round, so the squeeze is spread out gently. The tomato stays whole!' }
    if (trick === 'crab') return { ok: false, mode: 'squash', why: 'The hard pincer presses on two tiny spots. All the squeeze lands there, and the tomato bursts. Soft things need a soft grip.' }
    return { ok: false, mode: 'drop', why: 'Wheels roll — they cannot hold anything. The robot needs a gripper.' }
  }
  if (task === 'perch') {
    if (trick === 'claws') return { ok: true, mode: 'none', why: 'The toes wrap round the branch and lock, like a bird’s. The drone can switch its motors off and rest.' }
    if (trick === 'wheels') return { ok: false, mode: 'fall', why: 'Round wheels on a round branch roll off. Nothing wraps round to hold on.' }
    return { ok: false, mode: 'fall', why: 'A fish tail is for pushing water. It cannot hold a branch, so the drone slips off.' }
  }
  if (!MODULE_IDS.includes(trick as ModuleId)) return { ok: false, mode: 'stuck', why: 'That tool is for grabbing, not moving.' }
  // Locomotion: use the real terrain model. Gecko feet come with legs.
  const mods: ModuleId[] = trick === 'gecko' ? ['legs', 'gecko'] : [trick as ModuleId]
  const r = crossSegment({ modules: mods, gait: 'crawl', battery: 'small' }, task, 10)
  void CADET_MASS
  if (r.ok) {
    const yes: Record<Terrain, string> = {
      glass: 'Millions of tiny hairs on each foot touch the glass so closely that tiny attraction forces hold on. Up it goes!',
      pipe: 'A snake body is long and thin, so it fits in the pipe. It pushes against the walls to slide along.',
      water: 'The tail swishes side to side and pushes water backwards — so the robot goes forwards, like a fish.',
      gap: 'Flapping pushes air down, so the air pushes the robot up. The lift is bigger than its weight, so it flies over!',
      rubble: 'Legs lift each foot over the rocks and put it down on a safe spot, like a mountain goat.',
      flat: 'Off it goes!',
      ice: 'Slow, careful steps keep it from slipping.',
    }
    return { ok: true, mode: 'none', why: yes[task] }
  }
  const mode: FailMode = task === 'glass' ? 'slide' : task === 'water' ? 'sink' : task === 'gap' ? 'fall' : 'stuck'
  const no: Record<string, string> = {
    'glass:wheels': 'Wheels have nothing to hold on to glass. Gravity pulls the robot straight back down.',
    'glass:fins': 'A fish tail cannot hold on to anything. The robot slides down the glass.',
    'pipe:legs': 'The legs stick out sideways — the body is too wide to fit in the pipe.',
    'pipe:wings': 'Wings are much too wide for a pipe, and there is no room to flap.',
    'water:wheels': 'Wheels cannot push on water. The robot sinks.',
    'water:gecko': 'Sticky feet need a wall to stick to. In deep water there is nothing to grip, so it sinks.',
    'gap:wheels': 'Wheels roll right off the edge. There is no bridge to roll on!',
    'gap:snake': 'A snake is long, but not long enough to reach across a whole river. It falls in.',
    'rubble:wheels': 'The rocks are taller than the wheels can climb. The robot gets stuck at the first rock.',
    'rubble:fins': 'A fish tail cannot push on rocks. The robot flops about and stays put.',
  }
  return { ok: false, mode, why: no[`${task}:${trick}`] ?? r.why }
}

// ── Pilot station 1: four-legged crawl over a swaying bridge ────────────────
// Hips at (±0.20 m, ±0.10 m). Lateral-sequence walk: left-hind, left-fore,
// right-hind, right-fore, a quarter cycle apart. Each foot is on the ground for
// a fraction β (the DUTY FACTOR) of the cycle, sweeping 16 cm backwards.

export const QUAD = {
  hipX: 0.2,
  hipY: 0.1,
  stride: 0.16,
  swingS: 0.5,
  bridgeM: 2.4,
  timeLimitS: 45,
  /** The bridge sways the body by up to 2 mm: the centre of mass must stay at least this far inside. */
  swayM: 0.002,
} as const

export const QUAD_LEGS = [
  { id: 'LH', x: -QUAD.hipX, y: QUAD.hipY, offset: 0 },
  { id: 'LF', x: QUAD.hipX, y: QUAD.hipY, offset: 0.25 },
  { id: 'RH', x: -QUAD.hipX, y: -QUAD.hipY, offset: 0.5 },
  { id: 'RF', x: QUAD.hipX, y: -QUAD.hipY, offset: 0.75 },
] as const

export interface Pt {
  x: number
  y: number
}

export interface FootState {
  id: string
  x: number
  y: number
  down: boolean
  /** 0–1 lift height for drawing a swinging foot. */
  lift: number
}

/** Foot positions (body frame, metres) at cycle phase ph ∈ [0,1). */
export function quadFeet(beta: number, ph: number): FootState[] {
  const L = QUAD.stride
  return QUAD_LEGS.map((l) => {
    const s = (((ph - l.offset) % 1) + 1) % 1
    if (s < beta) return { id: l.id, x: l.x + L / 2 - (L * s) / beta, y: l.y, down: true, lift: 0 }
    const u = (s - beta) / (1 - beta) // swing progress 0→1, foot moves forward
    return { id: l.id, x: l.x - L / 2 + L * u, y: l.y, down: false, lift: Math.sin(Math.PI * u) }
  })
}

export function convexHull(pts: Pt[]): Pt[] {
  if (pts.length < 3) return pts.slice()
  const p = pts.slice().sort((a, b) => a.x - b.x || a.y - b.y)
  const cross = (o: Pt, a: Pt, b: Pt) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
  const lo: Pt[] = []
  for (const q of p) {
    while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop()
    lo.push(q)
  }
  const up: Pt[] = []
  for (const q of p.slice().reverse()) {
    while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop()
    up.push(q)
  }
  return lo.slice(0, -1).concat(up.slice(0, -1))
}

/** Signed distance (m) from point c to the edge of the support polygon: + inside, − outside. */
export function stabilityMargin(feet: Pt[], c: Pt = { x: 0, y: 0 }): number {
  const poly = convexHull(feet)
  if (poly.length < 3) {
    // Two feet: a line. The CoM can at best sit exactly on it.
    if (poly.length === 2) {
      const [a, b] = poly
      const dx = b.x - a.x
      const dy = b.y - a.y
      return -Math.abs(dx * (c.y - a.y) - dy * (c.x - a.x)) / Math.hypot(dx, dy) - 0.001
    }
    return -0.05
  }
  let m = Infinity
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    const dx = b.x - a.x
    const dy = b.y - a.y
    m = Math.min(m, (dx * (c.y - a.y) - dy * (c.x - a.x)) / Math.hypot(dx, dy))
  }
  return m
}

export interface QuadResult {
  beta: number
  speed: number
  timeS: number
  minMarginM: number
  minFeetDown: number
  /** Cycle phase where the margin is smallest. */
  worstPhase: number
  stable: boolean
  inTime: boolean
  ok: boolean
  /** Distance travelled (0–1 of the bridge) before tipping, or 1. */
  tipAt: number
  why: string
}

export function quadSpeed(beta: number): number {
  return (QUAD.stride * (1 - beta)) / (beta * QUAD.swingS)
}

export function runQuad(beta: number): QuadResult {
  const speed = quadSpeed(beta)
  const timeS = QUAD.bridgeM / speed
  const cycleS = QUAD.swingS / (1 - beta)
  let minM = Infinity
  let minFeet = 4
  let worst = 0
  for (let i = 0; i < 2000; i++) {
    const ph = i / 2000
    const feet = quadFeet(beta, ph).filter((f) => f.down)
    minFeet = Math.min(minFeet, feet.length)
    const m = stabilityMargin(feet)
    if (m < minM) {
      minM = m
      worst = ph
    }
  }
  const stable = minM >= QUAD.swayM
  const inTime = timeS <= QUAD.timeLimitS
  // Where it tips: the first moment in the first cycle with too little margin.
  const tipAt = stable ? 1 : Math.min(1, ((worst * cycleS) * speed) / QUAD.bridgeM + 0.02)
  let why: string
  if (minFeet < 3)
    why = `With β = ${beta.toFixed(2)} each foot is in the air ${(100 * (1 - beta)).toFixed(0)}% of the time, so sometimes only ${minFeet} feet touch the bridge. Two feet make a line, not an area — the centre of mass cannot stay inside it, and the robot tips. You need β ≥ 0.75 so three feet are always down.`
  else if (!stable)
    why = `Three feet are always down, but the centre of mass gets as close as ${(minM * 1000).toFixed(1)} mm to the edge of the support triangle. The bridge sways 2 mm, so it tips. A slightly higher duty factor keeps the triangle wider.`
  else if (!inTime)
    why = `Rock steady (centre of mass always ≥ ${(minM * 1000).toFixed(1)} mm inside), but each foot spends so long on the ground that the robot creeps at ${(speed * 100).toFixed(1)} cm/s. It took ${timeS.toFixed(0)} s — over the ${QUAD.timeLimitS} s limit. Lower β a little.`
  else
    why = `Stable AND fast enough: three or four feet always down, centre of mass at least ${(minM * 1000).toFixed(1)} mm inside the support polygon, across in ${timeS.toFixed(0)} s. That is a statically stable crawl.`
  return { beta, speed, timeS, minMarginM: minM, minFeetDown: minFeet, worstPhase: worst, stable, inTime, ok: stable && inTime, tipAt, why }
}

// ── Pilot station 2: snake up a sloping pipe ─────────────────────────────────
export const SNAKE = {
  pipeCm: 12,
  bodyCm: 4,
  /** Wall push per cm of squeeze, per contact (N/cm). */
  kNPerCm: 6,
  contacts: 4,
  mu: 0.5,
  massKg: 1.2,
  slopeDeg: 30,
  /** Motors can bend the body against the walls by at most this much squeeze (cm). */
  maxSqueezeCm: 1.5,
} as const

export interface SnakeResult {
  amplitudeCm: number
  fitCm: number
  squeezeCm: number
  gripN: number
  needN: number
  motorPct: number
  ok: boolean
  mode: 'slide' | 'jam' | 'go'
  why: string
}

export function runSnake(amplitudeCm: number): SnakeResult {
  const fit = (SNAKE.pipeCm - SNAKE.bodyCm) / 2
  const squeeze = Math.max(0, amplitudeCm - fit)
  const grip = SNAKE.mu * SNAKE.contacts * SNAKE.kNPerCm * squeeze
  const need = SNAKE.massKg * G * Math.sin((SNAKE.slopeDeg * Math.PI) / 180)
  const motorPct = Math.round((squeeze / SNAKE.maxSqueezeCm) * 100)
  if (squeeze <= 0)
    return { amplitudeCm, fitCm: fit, squeezeCm: 0, gripN: 0, needN: need, motorPct: 0, ok: false, mode: 'slide', why: `A wave ${amplitudeCm.toFixed(1)} cm wide never touches the walls (it would need more than ${fit} cm). With nothing to push on, friction is zero and the snake slides back down the 30° pipe.` }
  if (squeeze > SNAKE.maxSqueezeCm)
    return { amplitudeCm, fitCm: fit, squeezeCm: squeeze, gripN: grip, needN: need, motorPct, ok: false, mode: 'jam', why: `The wave is ${squeeze.toFixed(1)} cm too wide for the pipe. The motors must bend the body that much against the walls (${motorPct}% of their strength) — they stall, and the snake jams.` }
  if (grip < need)
    return { amplitudeCm, fitCm: fit, squeezeCm: squeeze, gripN: grip, needN: need, motorPct, ok: false, mode: 'slide', why: `It touches the walls, but only lightly: friction = μ × push = ${grip.toFixed(1)} N, and gravity pulls it down the slope with ${need.toFixed(1)} N. Squeeze a little harder.` }
  return { amplitudeCm, fitCm: fit, squeezeCm: squeeze, gripN: grip, needN: need, motorPct, ok: true, mode: 'go', why: `The wave presses on the walls at 4 points. Friction (${grip.toFixed(1)} N) beats the pull of gravity down the slope (${need.toFixed(1)} N), and the motors are at ${motorPct}% — so it climbs.` }
}

// ── Pilot station 3: flapping-wing hop over a river ─────────────────────────
export const FLAP = {
  massKg: 0.2,
  /** Lift = k × f² (N, f in Hz): fixed wings and stroke angle. */
  liftK: 0.03,
  /** Aerodynamic power = p × f³ (W) plus 1 W for the electronics. */
  powerK: 0.012,
  baseW: 1,
  /** Lift must be 10% above weight to climb over the far bank. */
  climb: 1.1,
  distanceM: 40,
  speedMs: 4,
  batteryJ: 120,
} as const

export interface FlapResult {
  freqHz: number
  liftN: number
  weightN: number
  powerW: number
  energyJ: number
  ok: boolean
  mode: 'ground' | 'flat-battery' | 'go'
  /** 0–1 of the crossing done when the battery runs out. */
  reach: number
  why: string
}

export function runFlap(f: number): FlapResult {
  const lift = FLAP.liftK * f * f
  const weight = FLAP.massKg * G
  const power = FLAP.powerK * f * f * f + FLAP.baseW
  const flightS = FLAP.distanceM / FLAP.speedMs
  const energy = power * flightS
  if (lift < weight * FLAP.climb)
    return { freqHz: f, liftN: lift, weightN: weight, powerW: power, energyJ: energy, ok: false, mode: 'ground', reach: 0.15, why: `At ${f} flaps a second the wings make ${lift.toFixed(2)} N of lift. The robot weighs ${weight.toFixed(2)} N and needs 10% extra to climb, ${(weight * FLAP.climb).toFixed(2)} N. Lift grows with the flap rate squared — flap faster.` }
  if (energy > FLAP.batteryJ) {
    const reach = FLAP.batteryJ / energy
    return { freqHz: f, liftN: lift, weightN: weight, powerW: power, energyJ: energy, ok: false, mode: 'flat-battery', reach, why: `Plenty of lift (${lift.toFixed(2)} N), but power grows with the flap rate CUBED: ${power.toFixed(1)} W for ${flightS} s needs ${energy.toFixed(0)} J. The battery has ${FLAP.batteryJ} J, so it runs flat ${(reach * 100).toFixed(0)}% of the way across.` }
  }
  return { freqHz: f, liftN: lift, weightN: weight, powerW: power, energyJ: energy, ok: true, mode: 'go', reach: 1, why: `Lift ${lift.toFixed(2)} N beats the ${(weight * FLAP.climb).toFixed(2)} N needed, and the hop uses ${energy.toFixed(0)} of the ${FLAP.batteryJ} J in the battery. Just fast enough, and no faster — that is how real flyers save energy.` }
}

// ── Ace: three fixed missions ───────────────────────────────────────────────
export interface Mission {
  id: string
  name: string
  story: string
  course: CourseSegment[]
  battery: BatteryId
}

export const ACE_MISSIONS: Mission[] = [
  {
    id: 'quake',
    name: 'Earthquake search',
    story: 'Drive 400 m to a collapsed building, cross the rubble, then go down a narrow pipe to reach a trapped space. Battery: 7 Wh.',
    course: [
      { terrain: 'flat', length: 400 },
      { terrain: 'rubble', length: 150 },
      { terrain: 'pipe', length: 40 },
    ],
    battery: 'small',
  },
  {
    id: 'bridge',
    name: 'Bridge inspector',
    story: 'Travel 300 m along the riverbank, climb a 20 m glass tower to check its sensors, then hop the 30 m river.',
    course: [
      { terrain: 'flat', length: 300 },
      { terrain: 'glass', length: 20 },
      { terrain: 'gap', length: 30 },
    ],
    battery: 'small',
  },
  {
    id: 'cave',
    name: 'Flooded cave',
    story: 'Swim across a 300 m lake, slip through a 30 m drain pipe, cross 100 m of rocks and roll 200 m home. Battery: 7 Wh.',
    course: [
      { terrain: 'water', length: 300 },
      { terrain: 'pipe', length: 30 },
      { terrain: 'rubble', length: 100 },
      { terrain: 'flat', length: 200 },
    ],
    battery: 'small',
  },
]

/** Ace missions run on a fixed 7 Wh pack (its mass is the small battery’s). */
export const ACE_BATTERY_J = 7 * 3600

// ── Legend: design for an unknown mix ───────────────────────────────────────
export const LEGEND_MIX: { terrain: Terrain; weight: number; min: number; max: number }[] = [
  { terrain: 'flat', weight: 34, min: 150, max: 500 },
  { terrain: 'rubble', weight: 22, min: 60, max: 200 },
  { terrain: 'ice', weight: 14, min: 40, max: 120 },
  { terrain: 'water', weight: 14, min: 80, max: 250 },
  { terrain: 'glass', weight: 8, min: 8, max: 25 },
  { terrain: 'gap', weight: 8, min: 15, max: 40 },
]
export const LEGEND_COURSES = 8
export const LEGEND_SEGMENTS = 5
export const LEGEND_TIME_S = 45 * 60

export function legendCourses(seed: number): CourseSegment[][] {
  const r = rng(seed)
  const total = LEGEND_MIX.reduce((t, m) => t + m.weight, 0)
  const courses: CourseSegment[][] = []
  for (let c = 0; c < LEGEND_COURSES; c++) {
    const course: CourseSegment[] = []
    for (let s = 0; s < LEGEND_SEGMENTS; s++) {
      let x = r() * total
      let pick = LEGEND_MIX[0]
      for (const m of LEGEND_MIX) {
        if (x < m.weight) {
          pick = m
          break
        }
        x -= m.weight
      }
      const len = Math.round((pick.min + r() * (pick.max - pick.min)) / 5) * 5
      course.push({ terrain: pick.terrain, length: len })
    }
    courses.push(course)
  }
  return courses
}

export function runLegend(d: Design, seed: number): CourseResult[] {
  const batteryJ = BATTERIES[d.battery].wh * 3600
  return legendCourses(seed).map((c) => runCourse(d, c, batteryJ, LEGEND_TIME_S))
}

export interface ExplainQ {
  id: string
  q: string
  options: { text: string; correct: boolean }[]
}

export const LEGEND_QUESTIONS: ExplainQ[] = [
  {
    id: 'static',
    q: 'Static or dynamic stability — which is true?',
    options: [
      { text: 'Static: the centre of mass always stays over the polygon made by the feet on the ground, so the robot would not fall if it froze. Dynamic: it would fall if frozen, but stays up by moving its feet in time.', correct: true },
      { text: 'Static robots stand still; dynamic robots move. A walking robot is always dynamically stable.', correct: false },
      { text: 'Dynamic stability means more feet on the ground, so it is always safer than static stability.', correct: false },
    ],
  },
  {
    id: 'cot',
    q: 'Why can adding wheels SAVE energy, even though they add weight?',
    options: [
      { text: 'Wheels are lighter than every other module.', correct: false },
      { text: 'Rolling has a much lower cost of transport (about 0.1) than walking (0.7–1.2) or slithering (2+), so on long flat ground the saving beats the cost of carrying 0.6 kg more.', correct: true },
      { text: 'Wheels make the robot faster, and faster always uses less energy.', correct: false },
    ],
  },
  {
    id: 'ice',
    q: 'Why does a trot slip on ice when a crawl does not?',
    options: [
      { text: 'Ice is colder for the trotting feet.', correct: false },
      { text: 'A trot has only two feet down and pushes and brakes hard each step, so each foot needs more friction (μ ≈ 0.29) than ice gives (0.15). A slow crawl needs only about 0.12.', correct: true },
      { text: 'Crawling robots are heavier, and weight always stops slipping.', correct: false },
    ],
  },
]

export function fmtKj(j: number): string {
  return `${(j / 1000).toFixed(1)} kJ`
}

export function fmtTime(s: number): string {
  const m = Math.floor(s / 60)
  const r = Math.round(s - m * 60)
  return m > 0 ? `${m} min ${r.toString().padStart(2, '0')} s` : `${r} s`
}
