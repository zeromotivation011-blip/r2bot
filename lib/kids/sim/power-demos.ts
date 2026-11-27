// lib/kids/sim/power-demos.ts
// The Power Lab's simulator challenges (roadmap #39). Same Demo shape as the
// physics lab (lib/kids/sim/demos.ts) so the same workbench runs them, but each
// arena carries a battery: the robot sags, slows and can run flat, and a
// charging pad fills it when the robot stops on it.
//
// Battery clock: drainScale 60 means one simulated second drains a minute of
// real driving, so a whole battery story fits in a short run. The UI says so.
// Calibrated in lib/kids/sim/flight.verify.ts: the reference program succeeds
// with the good parts and the same program runs flat with the wrong ones.

import type { Demo } from './demos'
import type { Expr, Stmt } from './program'

let seq = 0
const id = (p: string) => `pw-${p}-${++seq}`
const N = (v: number): Expr => ({ k: 'number', v })
const T = (v: string): Expr => ({ k: 'text', v })
const driveDistance = (cm: number, speed: number): Stmt => ({ op: 'drive_distance', id: id('drive_distance'), cm: N(cm), speedPct: N(speed) })
const turn = (deg: number, speed: number): Stmt => ({ op: 'turn_degrees', id: id('turn_degrees'), deg: N(deg), speedPct: N(speed) })
const stop = (): Stmt => ({ op: 'stop', id: id('stop') })
const wait = (s: number): Stmt => ({ op: 'wait', id: id('wait'), seconds: N(s) })
const say = (text: string): Stmt => ({ op: 'say', id: id('say'), text: T(text) })

const MOTION = ['drive_for', 'drive_distance', 'turn_degrees', 'set_motors', 'stop', 'wait']
const POWER_TOOLBOX = [...MOTION, 'repeat', 'repeat_until', 'if', 'if_else', 'compare', 'battery_pct', 'timer_s', 'number', 'say', 'beep']

/** Where the robot starts and charges in "Home before flat". */
export const HOME_PAD: [number, number] = [0, -1.15]
export const FLAG: [number, number] = [0, 0.95]

export const POWER_DEMOS: Demo[] = [
  {
    id: 'power-home-before-flat',
    title: 'Home before flat',
    task: 'Only a little charge is left. Drive to the flag, come back, and stop on the charger before the battery runs flat.',
    lesson: 'Every second costs charge: the computer drains it even when the robot waits, and the motors drain it fastest. A slow robot can run out on a route a quick one finishes.',
    ageHint: 'Ages 8–13',
    arena: {
      id: 'power-home-before-flat',
      title: 'Home before flat',
      size: [2.4, 3.2],
      center: [0, 0],
      floor: 'tile',
      regions: [
        { shape: { kind: 'circle', center: FLAG, radius: 0.22 }, color: 'yellow', label: 'Flag' },
        { shape: { kind: 'circle', center: HOME_PAD, radius: 0.2 }, color: 'green', label: 'Charger' },
      ],
      lines: [],
      walls: [],
      ramps: [],
      boxes: [],
      objects: [],
      start: { pos: HOME_PAD, headingDeg: 0 },
      goal: { kind: 'visit-and-return', visit: { kind: 'circle', center: FLAG, radius: 0.22 }, zone: { kind: 'circle', center: HOME_PAD, radius: 0.2 }, noCrash: true },
      battery: { pack: { cell: 'nimh', series: 4, parallel: 1 }, startSoc: 0.12, drainScale: 60, ratedV: 4.8 },
      chargers: [{ center: HOME_PAD, radius: 0.2, amps: 2 }],
      timeLimit: 60,
    },
    reference: { body: [driveDistance(205, 80), turn(180, 50), driveDistance(205, 80), stop(), say('Home! Charging…')] },
    toolbox: POWER_TOOLBOX,
    goodParts: { drive: 'wheels2' },
    wrongParts: { drive: 'legs' },
    wrongFails: 'flat',
    mistakes: [{ name: 'a slow crawl', program: { body: [driveDistance(205, 30), turn(180, 30), driveDistance(205, 30), stop()] }, fails: 'flat' }],
  },
  {
    id: 'power-pit-stop',
    title: 'Pit stop',
    task: 'The battery is almost empty. Stop on the charger in the middle, wait while it fills, then drive on to the yellow circle.',
    lesson: 'A robot that plans a charging stop can go further than its battery alone. Watch the battery graph climb while it waits.',
    ageHint: 'Ages 8–13',
    arena: {
      id: 'power-pit-stop',
      title: 'Pit stop',
      size: [2.4, 3.6],
      center: [0, 0],
      floor: 'carpet',
      regions: [
        { shape: { kind: 'circle', center: [0, -0.35], radius: 0.2 }, color: 'green', label: 'Charger' },
        { shape: { kind: 'circle', center: [0, 1.4], radius: 0.25 }, color: 'yellow', label: 'Goal' },
      ],
      lines: [],
      walls: [],
      ramps: [],
      boxes: [],
      objects: [],
      start: { pos: [0, -1.5], headingDeg: 0 },
      goal: { kind: 'reach', zone: { kind: 'circle', center: [0, 1.4], radius: 0.25 } },
      battery: { pack: { cell: 'nimh', series: 4, parallel: 1 }, startSoc: 0.05, drainScale: 60, ratedV: 4.8 },
      chargers: [{ center: [0, -0.35], radius: 0.2, amps: 4 }],
      timeLimit: 60,
    },
    reference: { body: [driveDistance(115, 70), stop(), wait(6), say('Charged up!'), driveDistance(175, 70), stop()] },
    toolbox: POWER_TOOLBOX,
    goodParts: { drive: 'wheels2' },
    // Here the lesson is the plan, not a part: see `mistakes`.
    wrongParts: {},
    wrongFails: 'flat',
    mistakes: [{ name: 'no charging stop', program: { body: [driveDistance(290, 70), stop()] }, fails: 'flat' }],
  },
]

/** Starter programs for the Power Lab editor: a first block, never the answer. */
export const POWER_STARTERS: Record<string, { body: Stmt[] }> = {
  'power-home-before-flat': { body: [driveDistance(100, 50)] },
  'power-pit-stop': { body: [driveDistance(50, 50)] },
}
