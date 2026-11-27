// lib/kids/robot-growth.ts
// A robot that grows with the child (roadmap #33), what is inside it (#36).
// Pure functions over the ONE robot (lib/kids/robot-design.ts) and the ONE
// progress store (lib/kids-progress.ts) — nothing here writes either.
//
//   * Upgrade unlocks: each upgrade part is earned by something the child has
//     DONE (a badge, a Code Lab mission, a round won in a World's game). Progress
//     never goes down, so an unlocked part never locks again: the robot never
//     decays and nothing here can make a child feel guilty for a missed day.
//   * Learned parts: a part the child has really used (the line sensor after
//     Line Rider) glows in the Workshop.
//   * The greeting: the robot says what it learned and offers the next mission.
//   * The spec sheet: mass, runtime, top speed and reach, from the same numbers
//     the simulator drives with (lib/kids/sim/robot-spec.ts) plus the upgrades.
//   * The wiring: battery, brain, motor driver, motors and every sensor/tool,
//     each wire colour-coded and carrying a signal a child can watch.

import type { KidsProgress } from '../kids-progress'
import type { BandId } from './bands'
import { MISSIONS } from './code-lab/missions'
import {
  getPart,
  getUpgrade,
  upgradesOf,
  type RobotDesign,
  type Slot,
  type UpgradeSlot,
} from './robot-design'
import type { WireSpec } from './robot-wiring'
import { robotSpec } from './sim/robot-spec'

/** A slot of either kind. */
export type AnySlot = Slot | UpgradeSlot

/** The progress fields the rules read (so tests and the parent hub can pass a partial store). */
export type GrowthProgress = Pick<KidsProgress, 'badges' | 'codeMissions' | 'personalBests' | 'xp' | 'band' | 'earnedParts'>

// ── What counts as "done" ────────────────────────────────────────────────────

/** A round of this game won at any tier (GameShellClient stores bests as `<game>:t<tier>`). */
export function gameWon(p: GrowthProgress, gameId: string): boolean {
  return Object.keys(p.personalBests ?? {}).some((k) => k.split(':')[0] === gameId)
}

function hasBadge(p: GrowthProgress, id: string): boolean {
  return Boolean(p.badges && p.badges[id])
}

function missionDone(p: GrowthProgress, id: string): boolean {
  return (p.codeMissions?.[id] ?? 0) > 0
}

function missionsDone(p: GrowthProgress): number {
  return Object.values(p.codeMissions ?? {}).filter((s) => s > 0).length
}

// ── Upgrade unlocks ──────────────────────────────────────────────────────────

export interface UnlockRule {
  /** Child words: "Win a round of Smart Farm". */
  how: string
  /** Where to go to earn it (always a /kids page). */
  href: string
  test: (p: GrowthProgress) => boolean
}

const ALWAYS: UnlockRule = { how: 'Ready from the start', href: '/kids/workshop', test: () => true }

/** `<slot>:<id>` → how it is earned. A part with no rule is a starter part. */
export const UPGRADE_UNLOCKS: Record<string, UnlockRule> = {
  'power:lipo': { how: 'Finish 3 Code Lab missions', href: '/kids/code-lab', test: (p) => missionsDone(p) >= 3 },
  'power:bigpack': { how: 'Win a round of Mars Rover (long drives need big batteries)', href: '/kids/play/mars-rover', test: (p) => gameWon(p, 'mars-rover') },
  'power:solar': { how: 'Win a round of Smart Farm', href: '/kids/play/smart-farm', test: (p) => gameWon(p, 'smart-farm') },
  'motor:speedy': { how: 'Earn the First Drive badge', href: '/kids/code-lab', test: (p) => hasBadge(p, 'first-drive') || missionsDone(p) >= 1 },
  'motor:torque': { how: 'Win a round of Sumo Arena', href: '/kids/play/sumo-arena', test: (p) => gameWon(p, 'sumo-arena') },
  'motor:brushless': { how: 'Win a round of Drone Hover', href: '/kids/play/drone-hover', test: (p) => gameWon(p, 'drone-hover') || hasBadge(p, 'hover-hero') },
  'sensor2:line': { how: 'Earn a sensing badge (Wall Whisperer, Line Rider or Colour Coder)', href: '/kids/code-lab', test: (p) => sensingBadge(p) },
  'sensor2:color': { how: 'Earn a sensing badge (Wall Whisperer, Line Rider or Colour Coder)', href: '/kids/code-lab', test: (p) => sensingBadge(p) },
  'sensor2:bumper': { how: 'Earn a sensing badge (Wall Whisperer, Line Rider or Colour Coder)', href: '/kids/code-lab', test: (p) => sensingBadge(p) },
  'arm:arm2': { how: 'Win a round of Arm Factory', href: '/kids/play/arm-factory', test: (p) => gameWon(p, 'arm-factory') || hasBadge(p, 'arm-artist') },
  'arm:arm3': { how: 'Win a round of Orbit Repair in the Space Station', href: '/kids/play/orbit-repair', test: (p) => gameWon(p, 'orbit-repair') },
  'chassis:drone': { how: 'Win a round of Smart Farm in the Smart Farm World', href: '/kids/worlds/farm', test: (p) => gameWon(p, 'smart-farm') },
  'chassis:sub': { how: 'Win a round of Deep Sea Rescue in the Ocean Lab', href: '/kids/worlds/ocean', test: (p) => gameWon(p, 'ocean-rescue') },
  'chassis:humanoid': { how: 'Win a round of Orbit Repair in the Space Station', href: '/kids/worlds/station', test: (p) => gameWon(p, 'orbit-repair') },
}

function sensingBadge(p: GrowthProgress): boolean {
  return hasBadge(p, 'wall-whisperer') || hasBadge(p, 'line-rider') || hasBadge(p, 'colour-coder')
}

export function unlockRule(slot: UpgradeSlot, id: string): UnlockRule {
  return UPGRADE_UNLOCKS[`${slot}:${id}`] ?? ALWAYS
}

export function isUpgradeUnlocked(p: GrowthProgress, slot: UpgradeSlot, id: string): boolean {
  return unlockRule(slot, id).test(p)
}

/** How many upgrade parts are unlocked, out of how many there are (starter parts not counted). */
export function upgradeCount(p: GrowthProgress): { unlocked: number; total: number } {
  const keys = Object.keys(UPGRADE_UNLOCKS)
  return { unlocked: keys.filter((k) => UPGRADE_UNLOCKS[k].test(p)).length, total: keys.length }
}

// ── Learned parts (they glow) ────────────────────────────────────────────────

interface LearnRule {
  slot: AnySlot
  /** Part ids in that slot this rule lights up. */
  parts: string[]
  badges?: string[]
  missions?: string[]
  /** "I learned to …" — said by the robot. */
  learned: string
}

export const LEARN_RULES: LearnRule[] = [
  { slot: 'sensor', parts: ['line'], badges: ['line-rider'], missions: ['line-follower', 'twisty-line'], learned: 'follow a line' },
  { slot: 'sensor2', parts: ['line'], badges: ['line-rider'], missions: ['line-follower', 'twisty-line'], learned: 'follow a line' },
  { slot: 'sensor', parts: ['color'], badges: ['colour-coder'], missions: ['colour-signals', 'colour-maze'], learned: 'read colours' },
  { slot: 'sensor2', parts: ['color'], badges: ['colour-coder'], missions: ['colour-signals', 'colour-maze'], learned: 'read colours' },
  { slot: 'head', parts: ['distance', 'camera'], badges: ['wall-whisperer'], missions: ['wall-sensor', 'right-hand-maze'], learned: 'stop before a wall' },
  { slot: 'head', parts: ['camera'], badges: ['colour-coder'], missions: ['colour-signals'], learned: 'read colours' },
  { slot: 'tool', parts: ['gripper', 'scoop'], badges: ['arm-artist'], missions: ['box-mover', 'tidy-up', 'parcel-picker'], learned: 'pick things up' },
  { slot: 'tool', parts: ['pen'], missions: ['square-dance', 'twin-windows'], learned: 'draw shapes' },
  { slot: 'tool', parts: ['light'], missions: ['cave-light', 'cave-rescue'], learned: 'light up the dark' },
  { slot: 'drive', parts: ['tracks', 'legs'], missions: ['desert-patrol'], learned: 'cross the sand' },
  { slot: 'drive', parts: ['wheels2', 'wheels4', 'tracks', 'legs'], badges: ['first-drive'], missions: ['first-steps'], learned: 'drive' },
  { slot: 'arm', parts: ['arm2', 'arm3'], badges: ['arm-artist'], learned: 'move an arm joint by joint' },
  { slot: 'motor', parts: ['torque'], badges: ['gear-head'], learned: 'trade speed for strength' },
]

function partIn(d: RobotDesign, slot: AnySlot): string {
  if (slot === 'body' || slot === 'drive' || slot === 'head' || slot === 'tool' || slot === 'sensor') return d[slot]
  return upgradesOf(d)[slot]
}

/** Slots whose fitted part the child has really used — the Workshop makes them glow. */
export function learnedSlots(p: GrowthProgress, d: RobotDesign): AnySlot[] {
  const out = new Set<AnySlot>()
  for (const r of LEARN_RULES) {
    if (!r.parts.includes(partIn(d, r.slot))) continue
    if (r.badges?.some((b) => hasBadge(p, b)) || r.missions?.some((m) => missionDone(p, m))) out.add(r.slot)
  }
  return [...out]
}

/** Is this part (fitted or not) one the child has learned to use? Used for the ✨ chip on part buttons. */
export function partLearned(p: GrowthProgress, slot: AnySlot, id: string): boolean {
  return LEARN_RULES.some((r) => r.slot === slot && r.parts.includes(id) && (r.badges?.some((b) => hasBadge(p, b)) || r.missions?.some((m) => missionDone(p, m))))
}

/** Things the robot learned with this child, newest rules first, deduplicated. */
export function learnedSkills(p: GrowthProgress, d: RobotDesign): string[] {
  const out: string[] = []
  for (const r of LEARN_RULES) {
    if (!r.parts.includes(partIn(d, r.slot))) continue
    if (!(r.badges?.some((b) => hasBadge(p, b)) || r.missions?.some((m) => missionDone(p, m)))) continue
    if (!out.includes(r.learned)) out.push(r.learned)
  }
  return out
}

// ── Next mission + greeting ──────────────────────────────────────────────────

const BAND_ORDER: BandId[] = ['explorers', 'builders', 'inventors', 'engineers']

export interface NextMission {
  id: string
  title: string
  emoji: string
  href: string
}

/** The first Code Lab mission not finished yet, starting in the child's band (Explorers when unknown). */
export function nextMission(p: GrowthProgress): NextMission | null {
  const start = Math.max(0, BAND_ORDER.indexOf(p.band ?? 'explorers'))
  for (const band of BAND_ORDER.slice(start)) {
    const list = MISSIONS.filter((m) => m.band === band).sort((a, b) => a.order - b.order)
    const m = list.find((x) => !missionDone(p, x.id))
    if (m) return { id: m.id, title: m.title, emoji: m.emoji, href: `/kids/code-lab/${m.id}` }
  }
  return null
}

export interface Greeting {
  text: string
  next: NextMission | null
}

/**
 * What the robot says when the child opens the Workshop. Only ever about what
 * they did and what they could do next — never about time away.
 */
export function robotGreeting(p: GrowthProgress, d: RobotDesign): Greeting {
  const skills = learnedSkills(p, d)
  const next = nextMission(p)
  const name = d.name || 'your robot'
  let text: string
  if (skills.length === 0) text = `Hi! I’m ${name}. Let’s learn something together.`
  else if (skills.length === 1) text = `Hi! I’m ${name}. With you I learned to ${skills[0]}.`
  else text = `Hi! I’m ${name}. With you I learned to ${skills.slice(0, -1).join(', ')} and ${skills[skills.length - 1]}.`
  return { text, next }
}

// ── Spark Trail parts in the Workshop ────────────────────────────────────────

/** Part keys (`<slot>:<id>`) that a Spark Trail part the child earned fits (TRAIL_PART_FITS). */
export function trailPartKeys(earnedParts: readonly string[], fits: Record<string, { slot: Slot | null; part: string | null }>): Set<string> {
  const out = new Set<string>()
  for (const id of earnedParts) {
    const f = fits[id]
    if (f && f.slot && f.part) out.add(`${f.slot}:${f.part}`)
  }
  return out
}

// ── Spec sheet ───────────────────────────────────────────────────────────────

interface PowerSpec {
  volts: number
  ampHours: number
  /** Extra mass over the AA box, kg (the sim's body mass already holds an AA box). */
  massDelta: number
  /** Power from a solar panel in sunshine, W. */
  solarW: number
}

export const POWER: Record<string, PowerSpec> = {
  aa: { volts: 4.8, ampHours: 2.0, massDelta: 0, solarW: 0 },
  lipo: { volts: 7.4, ampHours: 2.2, massDelta: -0.04, solarW: 0 },
  bigpack: { volts: 11.1, ampHours: 5.0, massDelta: 0.28, solarW: 0 },
  solar: { volts: 7.4, ampHours: 2.2, massDelta: 0.04, solarW: 1.5 },
}

interface MotorSpec {
  speed: number
  strength: number
  /** Drive power at cruise per motor relative to gear motors (heat losses included). */
  power: number
  massDelta: number
}

export const MOTORS: Record<string, MotorSpec> = {
  gear: { speed: 1, strength: 1, power: 1, massDelta: 0 },
  speedy: { speed: 1.4, strength: 0.7, power: 1.15, massDelta: 0 },
  torque: { speed: 0.7, strength: 1.6, power: 1.1, massDelta: 0.04 },
  brushless: { speed: 1.3, strength: 1.3, power: 0.8, massDelta: 0.02 },
}

/** Electrical draw of each fitted part, W (average while working). */
const HEAD_W: Record<string, number> = { distance: 0.08, camera: 1.0, antenna: 0.5, screen: 0.6 }
const TOOL_W: Record<string, number> = { none: 0, gripper: 0.3, scoop: 0.3, pen: 0.05, light: 0.6 }
const FLOOR_W: Record<string, number> = { none: 0, line: 0.1, color: 0.15, bumper: 0.01 }
const FLOOR_KG: Record<string, number> = { none: 0, line: 0.03, color: 0.03, bumper: 0.05 }
const ARM: Record<string, { kg: number; w: number; reachCm: number }> = {
  none: { kg: 0, w: 0, reachCm: 0 },
  arm2: { kg: 0.15, w: 0.8, reachCm: 20 },
  arm3: { kg: 0.22, w: 1.2, reachCm: 30 },
}
const BRAIN_W = 0.6
/** Drive power per kg at cruise on a smooth floor (both sides together), W/kg. */
const DRIVE_W_PER_KG: Record<RobotDesign['drive'], number> = { wheels2: 3, wheels4: 3.6, tracks: 4.5, legs: 6.5 }
/** World forms replace the drive. Speed in m/s, power in W/kg, extra mass in kg. */
const CHASSIS: Record<string, { speed: number; wPerKg: number; massDelta: number; motors: number } | null> = {
  ground: null,
  drone: { speed: 6, wPerKg: 120, massDelta: 0.1, motors: 4 },
  sub: { speed: 0.6, wPerKg: 8, massDelta: 0.5, motors: 1 },
  humanoid: { speed: 0.3, wPerKg: 12, massDelta: 0.8, motors: 12 },
}
/** Share of the battery that can really be used (lithium and NiMH are not run flat). */
const USABLE = 0.85

export interface PowerLine {
  part: string
  watts: number
  amps: number
}

export interface SpecSheet {
  massKg: number
  runtimeMin: number
  /** Top speed, m/s. */
  topSpeed: number
  /** How far in front of the body's centre the tool or arm can reach, cm (0 = nothing to reach with). */
  reachCm: number
  volts: number
  wattHours: number
  /** Average draw, W, and the current it pulls from the battery, A. */
  watts: number
  amps: number
  /** Motors in the robot (drive or rotors/thrusters/joints). */
  motors: number
  /** Per-part draw, biggest first (Engineers see it). */
  breakdown: PowerLine[]
  /** Solar contribution, W (0 without the panel). */
  solarW: number
}

const r1 = (x: number) => Math.round(x * 10) / 10
const r2 = (x: number) => Math.round(x * 100) / 100

export function specSheet(d: RobotDesign): SpecSheet {
  const up = upgradesOf(d)
  const base = robotSpec(d)
  const pw = POWER[up.power] ?? POWER.aa
  const mo = MOTORS[up.motor] ?? MOTORS.gear
  const arm = ARM[up.arm] ?? ARM.none
  const form = CHASSIS[up.chassis] ?? null
  const massKg = base.mass + pw.massDelta + mo.massDelta + (FLOOR_KG[up.sensor2] ?? 0) + arm.kg + (form ? form.massDelta - base.drive.mass * 0.5 : 0)

  // Top speed: the drive's real top speed (what the simulator uses) × the motor's gearing.
  // A weak motor slows when the robot is heavy: past 1.6 kg per unit of strength the speed falls.
  let topSpeed: number
  if (form) topSpeed = form.speed * (up.chassis === 'drone' ? 1 : mo.speed)
  else {
    const overload = Math.max(1, massKg / (1.6 * mo.strength))
    topSpeed = (base.drive.maxSpeed * mo.speed) / overload
  }

  const breakdown: PowerLine[] = []
  const add = (part: string, w: number) => {
    if (w > 0) breakdown.push({ part, watts: w, amps: 0 })
  }
  const driveW = (form ? form.wPerKg : DRIVE_W_PER_KG[d.drive]) * massKg * mo.power
  const motors = form ? form.motors : d.drive === 'legs' ? 8 : d.drive === 'wheels4' ? 4 : 2
  add(form ? `${getUpgrade('chassis', up.chassis)?.name ?? 'World form'} motors` : 'Drive motors', driveW)
  add('Brain', BRAIN_W)
  add(getPart('head', d.head)?.name ?? 'Head', HEAD_W[d.head] ?? 0)
  add(getPart('tool', d.tool)?.name ?? 'Tool', TOOL_W[d.tool] ?? 0)
  add(getPart('sensor', d.sensor)?.name ?? 'Floor sensor', FLOOR_W[d.sensor] ?? 0)
  add(getUpgrade('sensor2', up.sensor2)?.name ?? '2nd sensor', FLOOR_W[up.sensor2] ?? 0)
  add(getUpgrade('arm', up.arm)?.name ?? 'Arm', arm.w)
  breakdown.sort((a, b) => b.watts - a.watts)
  const watts = breakdown.reduce((s, l) => s + l.watts, 0)
  for (const l of breakdown) {
    l.amps = r2(l.watts / pw.volts)
    l.watts = r2(l.watts)
  }
  const wattHours = pw.volts * pw.ampHours
  const net = Math.max(watts * 0.2, watts - pw.solarW)
  const runtimeMin = Math.max(1, Math.round(((wattHours * USABLE) / net) * 60 / 5) * 5)

  // Reach: from the body's centre to the tool tip (the simulator's toolTip), plus the arm.
  const toolReach = d.tool === 'gripper' || d.tool === 'scoop' ? (base.toolTip[2] + base.toolReach) * 100 : 0
  const reachCm = d.tool === 'none' && up.arm === 'none' ? 0 : Math.round(Math.max(toolReach, base.body.front * 100) + arm.reachCm)

  return {
    massKg: r2(massKg),
    runtimeMin,
    topSpeed: r2(topSpeed),
    reachCm,
    volts: pw.volts,
    wattHours: r1(wattHours),
    watts: r1(watts),
    amps: r2(watts / pw.volts),
    motors,
    breakdown,
    solarW: pw.solarW,
  }
}

/** "1 h 25 min", "45 min". */
export function formatRuntime(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

// ── Wiring (X-ray) ───────────────────────────────────────────────────────────
// The wire list lives in ./robot-wiring.ts (no mission data, so robot3d stays light).
export { COMPONENT_LABEL, WIRE_COLOR, WIRE_KIND_LABEL, wiringOf, type ComponentId, type WireKind, type WireSpec } from './robot-wiring'

/** Live values the Workshop scene measures, for the signal text. */
export interface WireReadings {
  /** What the distance eyes / camera measure right now, cm (null = nothing in range). */
  distanceCm: number | null
  /** Motor command per side, percent (-100..100). */
  leftPct: number
  rightPct: number
  lightOn?: boolean
}

const LOGIC_V = 5

/**
 * What travels along a wire, in words for the child's band. Engineers (and
 * Inventors) also see the voltage and the current.
 */
export function wireSignal(wire: WireSpec, d: RobotDesign, band: BandId | null, r: WireReadings): string {
  const spec = specSheet(d)
  const up = upgradesOf(d)
  const teen = band === 'engineers' || band === 'inventors'
  const ei = (v: number, a: number) => (teen ? ` (${r1(v)} V, ${a >= 0.1 ? `${r2(a)} A` : `${Math.round(a * 1000)} mA`})` : '')
  const line = (part: string) => spec.breakdown.find((l) => l.part === part)
  const ampsOf = (part: string) => line(part)?.amps ?? 0.01
  const dist = r.distanceCm === null ? 'nothing within 200 cm' : `${Math.round(r.distanceCm)} cm`
  switch (`${wire.from}>${wire.to}`) {
    case 'solar>battery':
      return `Solar panel → battery: about ${spec.solarW} W of sunshine${teen ? ` (${r2(spec.solarW / spec.volts)} A at ${spec.volts} V)` : ''}.`
    case 'battery>brain':
      return `Battery → brain: power to think${ei(spec.volts, ampsOf('Brain'))}.`
    case 'battery>driver': {
      const driveLine = spec.breakdown[0]
      return `Battery → motor driver: power for the motors${ei(spec.volts, driveLine?.amps ?? 0)}.`
    }
    case 'brain>driver': {
      const what = r.leftPct === 0 && r.rightPct === 0 ? 'stop' : r.leftPct === r.rightPct ? `${r.leftPct > 0 ? 'forward' : 'back'} ${Math.abs(Math.round(r.leftPct))}%` : `left ${Math.round(r.leftPct)}%, right ${Math.round(r.rightPct)}%`
      return `Brain → motor driver: “${what}”${teen ? ` (a PWM signal at ${LOGIC_V} V)` : ''}.`
    }
    case 'driver>motorL':
    case 'driver>motorR': {
      const pct = wire.to === 'motorL' ? r.leftPct : r.rightPct
      const side = wire.to === 'motorL' ? 'left' : 'right'
      const share = spec.breakdown[0] ? spec.breakdown[0].amps / Math.max(2, spec.motors) : 0
      const amps = Math.abs(pct) / 100 * share * 2
      const volts = (Math.abs(pct) / 100) * spec.volts
      return `Motor driver → ${side} motor: ${pct === 0 ? 'resting' : `${Math.abs(Math.round(pct))}% power, ${pct > 0 ? 'forwards' : 'backwards'}`}${ei(volts, amps)}.`
    }
    case 'head>brain':
      if (d.head === 'distance') return `Distance sensor → brain: ${dist}${teen ? ` (an echo pulse; ${LOGIC_V} V logic, ${Math.round(ampsOf('Distance Eyes') * 1000)} mA)` : ''}.`
      if (d.head === 'camera') return `Camera → brain: a picture 30 times a second${r.distanceCm !== null ? `; the nearest thing looks ${Math.round(r.distanceCm)} cm away` : ''}${ei(3.3, ampsOf('Camera Eye'))}.`
      return `Radio antenna → brain: “new orders received”${ei(3.3, ampsOf('Radio Antenna'))}.`
    case 'brain>head':
      return `Brain → face screen: “show a happy face”${ei(3.3, ampsOf('Face Screen'))}.`
    case 'sensor>brain':
    case 'sensor2>brain': {
      const id = wire.from === 'sensor' ? d.sensor : up.sensor2
      const name = wire.from === 'sensor' ? getPart('sensor', id)?.name : getUpgrade('sensor2', id)?.name
      const a = ampsOf(name ?? '')
      if (id === 'line') return `Line sensor → brain: “0 0 0 0 0” — no line under me${ei(LOGIC_V, a)}.`
      if (id === 'color') return `Colour sensor → brain: “dark blue floor”${ei(LOGIC_V, a)}.`
      return `Bumper → brain: “not pressed”${teen ? ' (a switch: 0 V = open, 5 V = pressed)' : ''}.`
    }
    case 'brain>tool': {
      const verb: Record<string, string> = { gripper: '“open the claw”', scoop: '“hold the scoop level”', pen: '“pen up”', light: r.lightOn ? '“light on”' : '“light off”' }
      const tool = getPart('tool', d.tool)?.name ?? 'Tool'
      return `Brain → ${tool.toLowerCase()}: ${verb[d.tool] ?? '“ready”'}${ei(LOGIC_V, ampsOf(tool))}.`
    }
    case 'brain>arm':
      return `Brain → arm joints: “shoulder 30°, elbow 45°${up.arm === 'arm3' ? ', wrist 0°' : ''}”${ei(LOGIC_V, ampsOf(getUpgrade('arm', up.arm)?.name ?? ''))}.`
    default:
      return wire.label
  }
}
