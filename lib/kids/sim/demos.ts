// lib/kids/sim/demos.ts
// The four prototype arenas for /kids/lab/sim, each with a reference program
// (the "show me" answer), the blocks in its toolbox, the robot it is meant for,
// and the "wrong part" that makes the same program fail — the lesson that the
// robot's parts change what happens.

import { DEFAULT_DESIGN, type RobotDesign } from '../robot-design'
import type { Arena } from './arena'
import type { Expr, Program, Stmt } from './program'
import type { FailReason } from './run'

export interface Demo {
  id: string
  title: string
  /** One line for the child: what to do. */
  task: string
  /** What the demo teaches about parts. */
  lesson: string
  ageHint: string
  arena: Arena
  reference: Program
  /** Block ids offered in the toolbox. */
  toolbox: string[]
  /** Parts the reference is designed for (merged over the child's robot). */
  goodParts: Partial<RobotDesign>
  /** A part swap that makes the same program fail, and how it fails. */
  wrongParts: Partial<RobotDesign>
  wrongFails: FailReason
}

// ── Tiny builders so programs read like the blocks ────────────────────────
let seq = 0
const id = (p: string) => `${p}-${++seq}`
const N = (v: number): Expr => ({ k: 'number', v })
const T = (v: string): Expr => ({ k: 'text', v })
const S = (s: Extract<Expr, { k: 'sensor' }>['s']): Expr => ({ k: 'sensor', s })
const driveFor = (speed: number, seconds: number): Stmt => ({ op: 'drive_for', id: id('drive_for'), speedPct: N(speed), seconds: N(seconds) })
const driveDistance = (cm: number, speed: number): Stmt => ({ op: 'drive_distance', id: id('drive_distance'), cm: N(cm), speedPct: N(speed) })
const stop = (): Stmt => ({ op: 'stop', id: id('stop') })
const say = (text: string): Stmt => ({ op: 'say', id: id('say'), text: T(text) })

const MOTION = ['drive_for', 'drive_distance', 'turn_degrees', 'set_motors', 'stop', 'wait']

export const DEMOS: Demo[] = [
  {
    id: 'first-drive',
    title: 'First drive',
    task: 'Drive your robot into the yellow circle.',
    lesson: 'Speed × time = distance. Slow legs go less far in the same time than wheels.',
    ageHint: 'Ages 5–7',
    arena: {
      id: 'first-drive',
      title: 'First drive',
      size: [2.4, 3],
      center: [0, 0],
      floor: 'tile',
      regions: [{ shape: { kind: 'circle', center: [0, 0.45], radius: 0.25 }, color: 'yellow', label: 'Goal' }],
      lines: [],
      walls: [],
      ramps: [],
      boxes: [{ pos: [0.75, 0.2], size: 0.14, mass: 0.3, color: '#38BDF8' }],
      objects: [],
      start: { pos: [0, -1.1], headingDeg: 0 },
      goal: { kind: 'reach', zone: { kind: 'circle', center: [0, 0.45], radius: 0.25 } },
      timeLimit: 30,
    },
    reference: { body: [driveFor(50, 7), say('I made it!')] },
    toolbox: [...MOTION, 'say', 'beep', 'repeat', 'number'],
    goodParts: { drive: 'wheels2' },
    wrongParts: { drive: 'legs' },
    wrongFails: 'short',
  },
  {
    id: 'sand-trap',
    title: 'Sand trap',
    task: 'Cross the sand and reach the yellow circle.',
    lesson: 'Thin wheels sink and spin in sand. Tracks spread the weight and grip.',
    ageHint: 'Ages 8–10',
    arena: {
      id: 'sand-trap',
      title: 'Sand trap',
      size: [2.4, 3.2],
      center: [0, 0],
      floor: 'tile',
      regions: [
        { shape: { kind: 'rect', center: [0, -0.1], size: [2.4, 0.9] }, surface: 'sand', label: 'Sand' },
        { shape: { kind: 'circle', center: [0, 0.95], radius: 0.25 }, color: 'yellow', label: 'Goal' },
      ],
      lines: [],
      walls: [],
      ramps: [],
      boxes: [],
      objects: [],
      start: { pos: [0, -1.25], headingDeg: 0 },
      goal: { kind: 'reach', zone: { kind: 'circle', center: [0, 0.95], radius: 0.25 } },
      timeLimit: 40,
    },
    reference: { body: [driveDistance(220, 80), stop()] },
    toolbox: [...MOTION, 'repeat', 'say', 'number'],
    goodParts: { drive: 'tracks' },
    wrongParts: { drive: 'wheels2' },
    wrongFails: 'stuck',
  },
  {
    id: 'stop-before-wall',
    title: 'Stop before the wall',
    task: 'Drive until the wall is close, then stop in the green zone — without touching the wall.',
    lesson: 'A distance sensor lets the robot decide WHEN to stop, wherever it starts.',
    ageHint: 'Ages 8–10',
    arena: {
      id: 'stop-before-wall',
      title: 'Stop before the wall',
      size: [2.4, 3],
      center: [0, 0],
      floor: 'carpet',
      regions: [{ shape: { kind: 'rect', center: [0, 0.6], size: [2.4, 0.2] }, color: 'green', label: 'Stop here' }],
      lines: [],
      walls: [{ from: [-1.2, 0.85], to: [1.2, 0.85], height: 0.4, thickness: 0.06 }],
      ramps: [],
      boxes: [],
      objects: [],
      start: { pos: [0, -1.1], headingDeg: 0 },
      goal: { kind: 'stop-in-zone', zone: { kind: 'rect', center: [0, 0.6], size: [2.4, 0.2] }, noCrash: true },
      timeLimit: 30,
    },
    reference: {
      body: [
        {
          op: 'repeat_until',
          id: id('repeat_until'),
          cond: { k: 'compare', op: '<', a: S('distance_cm'), b: N(15) },
          body: [{ op: 'set_motors', id: id('set_motors'), leftPct: N(60), rightPct: N(60) }],
        },
        stop(),
        say('Wall ahead — stopped!'),
      ],
    },
    toolbox: [...MOTION, 'repeat_until', 'forever', 'if', 'if_else', 'compare', 'distance_cm', 'bumped', 'number', 'say', 'beep'],
    goodParts: { head: 'distance' },
    wrongParts: { head: 'antenna' },
    wrongFails: 'missing-part',
  },
  {
    id: 'follow-line',
    title: 'Follow the line',
    task: 'Follow the black line to the green zone. Steer more the further you are from the line.',
    lesson: 'Proportional steering: turn a little when a little off, a lot when far off.',
    ageHint: 'Ages 11–17',
    arena: {
      id: 'follow-line',
      title: 'Follow the line',
      size: [2.6, 3.2],
      center: [0, 0],
      floor: 'tile',
      regions: [{ shape: { kind: 'circle', center: [-0.35, 1.2], radius: 0.22 }, color: 'green', label: 'Finish' }],
      lines: [
        {
          width: 0.025,
          points: [
            [0, -1.4],
            [0, -0.9],
            [0.12, -0.6],
            [0.35, -0.35],
            [0.45, -0.05],
            [0.38, 0.25],
            [0.15, 0.5],
            [-0.1, 0.7],
            [-0.28, 0.95],
            [-0.35, 1.2],
          ],
        },
      ],
      walls: [],
      ramps: [],
      boxes: [],
      objects: [],
      start: { pos: [0, -1.3], headingDeg: 0 },
      goal: { kind: 'follow-line', zone: { kind: 'circle', center: [-0.35, 1.2], radius: 0.22 }, minOnLine: 0.85 },
      timeLimit: 45,
    },
    reference: {
      body: [
        {
          op: 'repeat_until',
          id: id('repeat_until'),
          cond: { k: 'compare', op: '=', a: S('floor_color'), b: T('green') },
          body: [
            {
              op: 'set_motors',
              id: id('set_motors'),
              leftPct: { k: 'math', op: '+', a: N(40), b: { k: 'math', op: '*', a: N(35), b: S('line_offset') } },
              rightPct: { k: 'math', op: '-', a: N(40), b: { k: 'math', op: '*', a: N(35), b: S('line_offset') } },
            },
          ],
        },
        // The camera sees green a little ahead of the robot: roll on into the zone.
        driveDistance(25, 40),
        say('Finished the line!'),
      ],
    },
    toolbox: [...MOTION, 'repeat_until', 'forever', 'if', 'if_else', 'compare', 'and', 'or', 'not', 'math', 'number', 'text', 'line_seen', 'line_offset', 'floor_color', 'heading_deg', 'timer_s', 'set_var', 'change_var', 'get_var', 'say'],
    goodParts: { head: 'camera', sensor: 'line', drive: 'wheels2' },
    wrongParts: { sensor: 'none' },
    wrongFails: 'missing-part',
  },
]

export function designFor(base: RobotDesign, parts: Partial<RobotDesign>): RobotDesign {
  return { ...base, ...parts }
}

export const DEMO_BASE: RobotDesign = { ...DEFAULT_DESIGN }
