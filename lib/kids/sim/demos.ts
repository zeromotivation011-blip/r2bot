// lib/kids/sim/demos.ts
// The Physics Lab arenas (the four prototypes + "Find the faded line", Level 3 Session 4) for /kids/lab/sim, each with a reference program
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
  /** Program mistakes that fail for a taught reason with the good parts (Power Lab: forgetting the charging stop). */
  mistakes?: { name: string; program: Program; fails: FailReason }[]
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
const V = (name: string): Expr => ({ k: 'get_var', name })
const setVar = (name: string, value: Expr): Stmt => ({ op: 'set_var', id: id('set_var'), name, value })
const sayExpr = (text: Expr): Stmt => ({ op: 'say', id: id('say'), text })
/** Creep forward 2 cm at a time until the line sensor reads darker than `below`. */
const creepUntilDarker = (below: Expr): Stmt => ({
  op: 'repeat_until',
  id: id('repeat_until'),
  cond: { k: 'compare', op: '<', a: S('reflectance'), b: below },
  body: [driveDistance(2, 20)],
})

// "Find the faded line" (Level 3 Session 4, The Faded Line). The floor is dirty snow (reads 70);
// the white pad reads 88, the black pad 10 and the sun-bleached guide line 40. Calibrated,
// the threshold is (88 + 10) / 2 = 49: the snow (70) is above it and the faded line (40) below.
// A threshold of 30 copied from a lab with fresh black tape never sees the line (40 is not
// below 30) and the robot creeps on into the far wall.
const SNOW = 70
const PAD_WHITE = 88
const PAD_BLACK = 10
const FADED = 40
const LINE_Z = 0.45
/** Where the robot's centre stops when its sensor (6–10 cm ahead, by body) is over the line. */
const FADED_ZONE: Extract<Arena['goal'], { kind: 'stop-in-zone' }>['zone'] = { kind: 'rect', center: [0, LINE_Z - 0.075], size: [0.5, 0.15] }

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

DEMOS.push({
  id: 'faded-line',
  title: 'Find the faded line',
  task: 'Read the white pad and the black pad, set the threshold halfway, drive off the pad, then creep forward and stop on the faded line.',
  lesson: 'A sensor reading only means “dark” compared with the light and dark measured here, today: calibrate, then set the threshold halfway.',
  ageHint: 'Ages 11–17',
  arena: {
    id: 'faded-line',
    title: 'Find the faded line',
    size: [2, 2.6],
    center: [0, -0.2],
    floor: 'tile',
    regions: [
      { shape: { kind: 'rect', center: [0, -0.2], size: [2, 2.6] }, shade: SNOW, label: 'Snow' },
      { shape: { kind: 'rect', center: [0, -0.63], size: [0.34, 0.2] }, color: 'white', shade: PAD_WHITE, label: 'White pad' },
      { shape: { kind: 'rect', center: [0, -0.13], size: [0.34, 0.2] }, color: 'black', shade: PAD_BLACK, label: 'Black pad' },
    ],
    lines: [{ width: 0.03, shade: FADED, points: [[-0.9, LINE_Z], [0.9, LINE_Z]] }],
    walls: [],
    ramps: [],
    boxes: [],
    objects: [],
    start: { pos: [0, -1.2], headingDeg: 0 },
    goal: { kind: 'stop-in-zone', zone: FADED_ZONE, noCrash: true },
    timeLimit: 60,
  },
  reference: {
    body: [
      driveDistance(50, 30),
      setVar('light', S('reflectance')),
      driveDistance(50, 30),
      setVar('dark', S('reflectance')),
      setVar('threshold', { k: 'math', op: '/', a: { k: 'math', op: '+', a: V('light'), b: V('dark') }, b: N(2) }),
      // Off the black pad first, or the search "finds" the pad it is standing on.
      driveDistance(20, 30),
      creepUntilDarker(V('threshold')),
      stop(),
      sayExpr(V('threshold')),
    ],
  },
  toolbox: [...MOTION, 'repeat_until', 'if', 'if_else', 'compare', 'math', 'number', 'text', 'line_seen', 'reflectance', 'set_var', 'change_var', 'get_var', 'say'],
  goodParts: { sensor: 'line' },
  wrongParts: { sensor: 'none' },
  wrongFails: 'missing-part',
  mistakes: [
    {
      name: 'a threshold of 30 copied from the lab',
      program: { body: [driveDistance(50, 30), driveDistance(50, 30), driveDistance(20, 30), creepUntilDarker(N(30)), stop()] },
      // It creeps past the line into the far wall and never stops: a crash, or the clock runs out
      // pushing against the wall (sim/verify accepts either and checks it went past the line).
      fails: 'timeout',
    },
  ],
})

export function designFor(base: RobotDesign, parts: Partial<RobotDesign>): RobotDesign {
  return { ...base, ...parts }
}

export const DEMO_BASE: RobotDesign = { ...DEFAULT_DESIGN }

// ── Wave 4 (build log #23): the motor dead zone, carry positions, and an own arena per Level 2 session ──

const SM = (l: Expr, r: Expr): Stmt => ({ op: 'set_motors', id: id('set_motors'), leftPct: l, rightPct: r })
const wait = (s: number): Stmt => ({ op: 'wait', id: id('wait'), seconds: N(s) })
const grip = (close: boolean): Stmt => ({ op: close ? 'grip_close' : 'grip_open', id: id(close ? 'grip_close' : 'grip_open') })
const carry = (pos: 'high' | 'low'): Stmt => ({ op: 'set_carry', id: id('set_carry'), pos })
const changeVar = (name: string, by: number): Stmt => ({ op: 'change_var', id: id('change_var'), name, by: N(by) })
const repeatUntil = (cond: Expr, body: Stmt[]): Stmt => ({ op: 'repeat_until', id: id('repeat_until'), cond, body })
const lt = (a: Expr, b: Expr): Expr => ({ k: 'compare', op: '<', a, b })
const minus = (a: Expr, b: Expr): Expr => ({ k: 'math', op: '-', a, b })
const plus = (a: Expr, b: Expr): Expr => ({ k: 'math', op: '+', a, b })
const times = (a: Expr, b: Expr): Expr => ({ k: 'math', op: '*', a, b })

// "Find the dead zone" (Level 4 Session 2, Circles in the Sand). The robot faces a wall far away and
// raises its motor power 2 % at a time until the distance reading drops — the first power that
// moves it. Below the dead zone (MOTOR_DEAD_ZONE_PCT, robot-spec.ts) the motors hum and the
// wheels stay still, so a careful "creep at 8 %" never arrives.
export const DEAD_ZONE_PARK: Extract<Arena['goal'], { kind: 'stop-in-zone' }>['zone'] = { kind: 'rect', center: [0, -0.45], size: [1.2, 0.2] }
DEMOS.push({
  id: 'dead-zone',
  title: 'Find the dead zone',
  task: 'Raise the motor power a little at a time until your robot starts to move, say that power, then park in the green zone.',
  lesson: 'Below a certain power a motor cannot beat its own friction: it hums but the wheels do not turn. That is the dead zone — measure it, then always command more than it.',
  ageHint: 'Ages 14–17',
  arena: {
    id: 'dead-zone',
    title: 'Find the dead zone',
    size: [1.2, 3],
    center: [0, 0],
    floor: 'tile',
    regions: [{ shape: DEAD_ZONE_PARK, color: 'green', label: 'Park here' }],
    lines: [],
    // The wall the distance sensor watches (inside its 2 m range from the start).
    walls: [{ from: [-0.6, 0.35], to: [0.6, 0.35], height: 0.4, thickness: 0.06 }],
    ramps: [],
    boxes: [],
    objects: [],
    start: { pos: [0, -1.25], headingDeg: 0 },
    goal: { kind: 'stop-in-zone', zone: DEAD_ZONE_PARK, noCrash: true },
    timeLimit: 60,
  },
  reference: {
    body: [
      setVar('power', N(0)),
      setVar('start', S('distance_cm')),
      // Moved at least 1 cm closer to the far wall = the wheels are turning.
      repeatUntil(lt(S('distance_cm'), minus(V('start'), N(1))), [changeVar('power', 2), SM(V('power'), V('power')), wait(0.5)]),
      stop(),
      sayExpr(V('power')),
      driveDistance(78, 30),
      stop(),
    ],
  },
  toolbox: [...MOTION, 'repeat', 'repeat_until', 'if', 'if_else', 'compare', 'math', 'number', 'distance_cm', 'timer_s', 'set_var', 'change_var', 'get_var', 'say'],
  goodParts: { head: 'distance' },
  wrongParts: { head: 'antenna' },
  wrongFails: 'missing-part',
  mistakes: [{ name: 'creep at 8 % (inside the dead zone)', program: { body: [SM(N(8), N(8)), wait(20), stop()] }, fails: 'short' }],
})

// "Low and slow" (Level 3 Session 14, The Core Store Ramp). Scoop up the 0.3 kg core box, climb the
// 20° ramp to the store and tip the box out on the marked spot. Carried HIGH (up and back) the
// balance point passes behind the rear wheels on the slope and the robot flips; carried LOW (down
// and forward) it climbs. The numbers: sim/verify measures the tipping angle for both.
export const CORE_RAMP_DEG = 20
const RAMP_LEN = 0.9
const RAMP_H = Math.round(RAMP_LEN * Math.tan((CORE_RAMP_DEG * Math.PI) / 180) * 1000) / 1000
export const CORE_STORE_SPOT: Extract<Arena['goal'], { kind: 'deliver' }>['zone'] = { kind: 'rect', center: [0, 0.75], size: [0.5, 0.3] }
DEMOS.push({
  id: 'core-store-ramp',
  title: 'Low and slow',
  task: 'Scoop up the core box, carry it up the ramp without tipping, and tip it out on the marked spot in the store.',
  lesson: 'Where a load sits moves the robot’s balance point. Carried high and back on a slope, the balance point passes behind the wheels and the robot flips; carried low and forward, it climbs.',
  ageHint: 'Ages 11–13',
  arena: {
    id: 'core-store-ramp',
    title: 'Low and slow',
    size: [1.2, 3],
    center: [0, -0.2],
    floor: 'tile',
    regions: [{ shape: CORE_STORE_SPOT, color: 'yellow', label: 'Store' }],
    lines: [],
    walls: [],
    ramps: [{ center: [0, -0.35], size: [1.2, RAMP_LEN], height: RAMP_H, riseHeadingDeg: 0 }],
    decks: [{ center: [0, 0.6], size: [1.2, 1.0], height: RAMP_H }],
    boxes: [],
    objects: [{ id: 'core-box', kind: 'cube', pos: [0, -1.05], size: 0.04, mass: 0.3, color: '#38BDF8' }],
    start: { pos: [0, -1.3], headingDeg: 0 },
    goal: { kind: 'deliver', object: 'core-box', zone: CORE_STORE_SPOT, label: 'core box' },
    timeLimit: 60,
  },
  reference: { body: [grip(true), carry('low'), driveDistance(155, 40), stop(), grip(false), say('Core box stored!')] },
  toolbox: [...MOTION, 'repeat', 'repeat_until', 'if', 'compare', 'math', 'number', 'set_var', 'change_var', 'get_var', 'grip_close', 'grip_open', 'set_carry', 'say'],
  goodParts: { tool: 'scoop' },
  wrongParts: { tool: 'none' },
  wrongFails: 'missing-part',
  mistakes: [
    { name: 'carry it high', program: { body: [grip(true), carry('high'), driveDistance(155, 40), stop(), grip(false)] }, fails: 'tipped' },
    { name: 'forget to let go', program: { body: [grip(true), carry('low'), driveDistance(155, 40), stop()] }, fails: 'not-delivered' },
  ],
})

// "Curve to the dock" (Level 2 Session 5, Smooth Steerer). The dock is ahead and well over to the
// right, and there is no turn block: only two motors at different speeds make the curve.
/** Left 52 %, right 44 % for 10 s: a gentle right-hand curve that docks with every body (sim/verify). */
const CURVE_L = 52
const CURVE_R = 44
const CURVE_S = 10
const DOCK: Extract<Arena['goal'], { kind: 'reach' }>['zone'] = { kind: 'circle', center: [-0.45, 0.45], radius: 0.25 }
DEMOS.push({
  id: 'curve-dock',
  title: 'Curve to the dock',
  task: 'Reach the yellow dock, ahead and over to the right, without a single turn block: run the two motors at different speeds to curve.',
  lesson: 'A robot with two drive motors steers by running its sides at different speeds: the slower side is on the inside of the curve, and the bigger the difference, the tighter the curve.',
  ageHint: 'Ages 8–10',
  arena: {
    id: 'curve-dock',
    title: 'Curve to the dock',
    size: [2.4, 3],
    center: [0, 0],
    floor: 'tile',
    regions: [{ shape: DOCK, color: 'yellow', label: 'Dock' }],
    lines: [],
    walls: [],
    ramps: [],
    boxes: [],
    objects: [],
    start: { pos: [0.6, -1.1], headingDeg: 0 },
    goal: { kind: 'reach', zone: DOCK, noCrash: true },
    timeLimit: 30,
  },
  reference: { body: [SM(N(CURVE_L), N(CURVE_R)), wait(CURVE_S), stop(), say('Docked!')] },
  toolbox: ['drive_for', 'drive_distance', 'set_motors', 'stop', 'wait', 'repeat', 'number', 'say', 'beep'],
  goodParts: { drive: 'wheels2' },
  wrongParts: { drive: 'legs' },
  wrongFails: 'short',
})

// "Lighthouse route" (Level 2 Session 12, Lighthouse Courier). Three legs, three skills: follow the
// painted line until it ends, drive a measured 40 cm across the gap, then creep on until the
// lighthouse wall is close and stop in the green zone.
const LH_STOP: Extract<Arena['goal'], { kind: 'stop-in-zone' }>['zone'] = { kind: 'rect', center: [0, 1.0], size: [2.4, 0.2] }
DEMOS.push({
  id: 'lighthouse-route',
  title: 'Lighthouse route',
  task: 'Follow the line until it ends, drive 40 cm across the gap, then stop in the green zone before the lighthouse wall.',
  lesson: 'A route has legs, and each leg needs its own skill: the line sensor where there is a line, the encoders across the gap, the distance sensor for the stop.',
  ageHint: 'Ages 8–10',
  arena: {
    id: 'lighthouse-route',
    title: 'Lighthouse route',
    size: [2.4, 3.2],
    center: [0, 0],
    floor: 'tile',
    regions: [{ shape: LH_STOP, color: 'green', label: 'Stop here' }],
    lines: [
      {
        width: 0.025,
        points: [
          [0, -1.45],
          [0, -1.1],
          [0.18, -0.8],
          [0.22, -0.5],
          [0.05, -0.25],
          [0, -0.05],
          [0, 0.15],
        ],
      },
    ],
    walls: [{ from: [-1.2, 1.25], to: [1.2, 1.25], height: 0.4, thickness: 0.06 }],
    ramps: [],
    boxes: [],
    objects: [],
    start: { pos: [0, -1.35], headingDeg: 0 },
    goal: { kind: 'stop-in-zone', zone: LH_STOP, noCrash: true },
    timeLimit: 60,
  },
  reference: {
    body: [
      repeatUntil({ k: 'not', a: S('line_seen') }, [SM(plus(N(40), times(N(35), S('line_offset'))), minus(N(40), times(N(35), S('line_offset'))))]),
      driveDistance(40, 50),
      repeatUntil(lt(S('distance_cm'), N(20)), [SM(N(50), N(50))]),
      stop(),
      say('Message delivered!'),
    ],
  },
  toolbox: [...MOTION, 'repeat_until', 'if', 'if_else', 'compare', 'not', 'math', 'number', 'line_seen', 'line_offset', 'distance_cm', 'say'],
  goodParts: { head: 'distance', sensor: 'line', drive: 'wheels2' },
  wrongParts: { sensor: 'none' },
  wrongFails: 'missing-part',
})
