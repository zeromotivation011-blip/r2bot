// lib/kids/activities/types.ts
// The R2BOT Universe activity system: hundreds of short, genuinely interactive
// activities built from a set of TEMPLATES. A template is an interactive
// engine (a gear simulator, a circuit puzzle, a code tracer…); an activity is
// data that configures a template for one learning goal at one age band.
//
//   template  = how it plays         (components/kids/activities/templates/<id>/)
//   activity  = what it teaches      (lib/kids/activities/content/<track>.ts)
//
// Every activity is validated by lib/kids/activities/verify.ts: its params must
// pass the template's validate(), and when the template can check answers
// automatically, the activity's `solution` must be accepted by check().
//
// Pure types + light helpers. Safe on server and client.

import type { ComponentType } from 'react'
import type { BandId } from '../bands'

/** The ten skill tracks of the Skill Galaxy. */
export type TrackId =
  | 'motion' // how robots move: wheels, legs, speed, turning
  | 'sensors' // how robots sense: distance, light, colour, touch, IMU, cameras
  | 'code' // sequences, loops, conditions, variables, functions, debugging
  | 'electronics' // circuits, Ohm's law, LEDs, motors, logic gates
  | 'mechanics' // gears, levers, pulleys, balance, centre of mass, materials
  | 'control' // feedback, thresholds, P/PID, stability
  | 'ai' // data, classification, learning, maps, planning
  | 'design' // engineering design process, constraints, testing, prototyping
  | 'space' // exploration robots, Mars, oceans, latency, autonomy
  | 'world' // robots in society: jobs, safety, ethics, history, careers

export interface Track {
  id: TrackId
  name: string
  icon: string
  /** Tailwind gradient for the constellation. */
  gradient: string
  blurb: string
}

export const TRACKS: Track[] = [
  { id: 'motion', name: 'Motion', icon: '🛞', gradient: 'from-orange-400 to-red-600', blurb: 'Wheels, legs, speed and turning.' },
  { id: 'sensors', name: 'Sensors', icon: '📡', gradient: 'from-cyan-400 to-sky-600', blurb: 'How robots see, hear and feel.' },
  { id: 'code', name: 'Code', icon: '🧩', gradient: 'from-amber-300 to-orange-500', blurb: 'Telling robots exactly what to do.' },
  { id: 'electronics', name: 'Electronics', icon: '⚡', gradient: 'from-lime-400 to-emerald-600', blurb: 'Circuits, power and logic.' },
  { id: 'mechanics', name: 'Mechanics', icon: '⚙️', gradient: 'from-stone-300 to-zinc-500', blurb: 'Gears, levers and balance.' },
  { id: 'control', name: 'Control', icon: '🎚️', gradient: 'from-teal-300 to-cyan-600', blurb: 'Feedback that keeps robots steady.' },
  { id: 'ai', name: 'AI & Maps', icon: '🧠', gradient: 'from-fuchsia-400 to-pink-600', blurb: 'Learning from data, finding the way.' },
  { id: 'design', name: 'Design', icon: '🛠️', gradient: 'from-yellow-300 to-amber-600', blurb: 'Plan, build, test, improve.' },
  { id: 'space', name: 'Explore', icon: '🚀', gradient: 'from-indigo-400 to-blue-700', blurb: 'Robots on Mars, in oceans and beyond.' },
  { id: 'world', name: 'Robots & Us', icon: '🌍', gradient: 'from-green-300 to-teal-600', blurb: 'Jobs, safety, ethics and careers.' },
]

/**
 * Every template id. Builders implement one folder per id under
 * components/kids/activities/templates/<id>/ exporting a TemplateDef.
 */
export type TemplateId =
  // Logic & code
  | 'sequence-path' // program a robot across a grid (commands, loops at higher difficulty)
  | 'debug-program' // find and fix the bug in a block/text program, then run it
  | 'predict-output' // trace a program (loops, ifs, variables; Python view for older kids)
  | 'flowchart-builder' // arrange decisions/actions into a flowchart that solves a scenario
  | 'logic-gates' // wire AND/OR/NOT/XOR to match a truth table or behaviour
  | 'binary-encoder' // bits: numbers, pixels, messages, parity
  // Physics & mechanics
  | 'gear-train' // choose gears to hit a speed or torque target (animated)
  | 'lever-balance' // place loads/fulcrum to balance; mechanical advantage
  | 'simple-machines' // pick and configure lever/pulley/ramp/wheel for a job, simulated force
  | 'wheel-terrain' // choose wheels/tracks/legs for terrains, simulated run
  | 'centre-of-mass' // place battery/payload so the robot doesn't tip on slopes
  | 'motor-math' // rpm, wheel size, speed, distance, time — slider calculations
  // Sensors, electronics, control
  | 'sensor-choice' // pick sensors for a mission; simulated outcome shows what fails without them
  | 'signal-graph' // read a real sensor trace: mark events, pick thresholds
  | 'circuit-snap' // small circuit puzzle on a real solver (complete, series/parallel, resistors)
  | 'ohms-law' // calculate/choose V, I, R to meet a spec, with a live result
  | 'threshold-tuner' // tune a threshold on noisy sensor data so a robot behaves
  | 'control-tuner' // tune gain(s) on a simulated system; see overshoot/settling
  // AI, design, world
  | 'classify-sort' // sort examples by features; then the robot sorts new ones
  | 'train-mini' // place 2-D training points; k-NN boundary appears; test points
  | 'path-planner' // plan the shortest/cheapest route on a grid; compare with BFS/A*
  | 'robot-designer' // meet a job's constraints (budget, weight, terrain) by choosing parts
  | 'ethics-dilemma' // a robot-in-society scenario with choices, consequences, discussion
  | 'robot-match' // match real robots to jobs/environments, with facts revealed
  | 'estimate' // Fermi-style estimate with a slider, reveal and reasoning
  | 'spot-in-scene' // find robots/sensors/hazards in an illustrated scene

export interface CheckResult {
  correct: boolean
  /** 0..1 partial credit when the template supports it. */
  score?: number
  /** Kind, specific feedback ("Your gear made it slower, because…"). */
  feedback: string
}

/** Props every template component receives. */
export interface TemplateProps<P, A> {
  params: P
  band: BandId
  /** Called when the child submits; the shell shows feedback and rewards. */
  onSubmit: (answer: A) => CheckResult
  /** Called when the child finishes (after a correct submission or giving up). */
  onDone: (result: { correct: boolean; attempts: number; score: number }) => void
}

/**
 * Pure logic of a template — no React, no DOM, so lib/kids/activities/verify.ts
 * can run it in Node. Lives in components/kids/activities/templates/<id>/logic.ts
 * together with the template's exported Params and Answer types.
 */
export interface TemplateLogic<P, A> {
  id: TemplateId
  name: string
  /** Problems with the params (empty when valid). */
  validate: (params: P) => string[]
  /** Check an answer. Must be pure and deterministic. */
  check: (params: P, answer: A) => CheckResult
}

/** Logic + the interactive component (components/kids/activities/templates/<id>/index.tsx). */
export interface TemplateDef<P, A> extends TemplateLogic<P, A> {
  Component: ComponentType<TemplateProps<P, A>>
}

/** An activity: one configured template. `params`/`solution` are typed by the template module. */
export interface Activity<P = unknown, A = unknown> {
  /** Globally unique, kebab-case, stable forever (progress is keyed by it). */
  id: string
  title: string
  track: TrackId
  band: BandId
  template: TemplateId
  /** 1 (easiest in its band) … 5 (hardest in its band). */
  difficulty: 1 | 2 | 3 | 4 | 5
  /** Spoken + shown before starting: the mission, in story form (≤ 40 words). */
  intro: string
  /** The one idea this teaches (shown after, ≤ 30 words). */
  takeaway: string
  /** Optional real-world link: where this happens for real (≤ 30 words). */
  realWorld?: string
  params: P
  /** A correct answer, for templates that can check automatically (verify.ts runs it). */
  solution?: A
  /** Universe badge ids this activity contributes to (see rewards.ts). */
  badges?: string[]
  /** Universe world this activity belongs to (lib/kids/universe/worlds.ts WORLDS), if any. */
  world?: import('../universe/worlds').WorldId
  /** Activity ids that should be done first (same track). */
  after?: string[]
}

export function activityXp(a: Pick<Activity, 'difficulty'>): number {
  return 10 + a.difficulty * 5
}
