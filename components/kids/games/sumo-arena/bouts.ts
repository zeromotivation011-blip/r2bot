// components/kids/games/sumo-arena/bouts.ts
// Who fights whom, and where they start. One rival per tier, each with its own
// body (so mass, grip and speed really differ) and its own strategy.
// Start poses come from a seed, so a bout is the same every time it is fought.

import type { RobotDesign } from '@/lib/kids/robot-design'
import { RIVAL_BUMBLES, RIVAL_DODGER, RIVAL_TWISTER, SENSEI_TACTICS, fsmController, type FsmProgram, type SenseiTactic } from './brain'
import { RING_R, botStats, seeded, type BotSetup, type Controller } from './sim'
import { robotSpec } from '@/lib/kids/sim/robot-spec'

export interface Rival {
  name: string
  blurb: string
  design: RobotDesign
  ballastKg: number
}

const rivalDesign = (name: string, body: RobotDesign['body'], drive: RobotDesign['drive'], tool: RobotDesign['tool'], primary: string, accent: string): RobotDesign => ({
  v: 1,
  name,
  body,
  drive,
  head: 'distance',
  tool,
  sensor: 'line',
  primary,
  accent,
})

export const RIVALS: Rival[] = [
  { name: 'Bumbles', blurb: 'A light dome bot. Slow, gentle and a bit sleepy.', design: rivalDesign('Bumbles', 'dome', 'wheels2', 'none', '#14B8A6', '#FACC15'), ballastKg: 0 },
  { name: 'Twister', blurb: 'Four-wheel spinner. Finds you fast and charges hard.', design: rivalDesign('Twister', 'box', 'wheels4', 'none', '#3B82F6', '#F8FAFC'), ballastKg: 0 },
  { name: 'Dodger', blurb: 'Circles the ring and side-steps a charge, then hits your side.', design: rivalDesign('Dodger', 'box', 'wheels4', 'none', '#EC4899', '#22D3EE'), ballastKg: 0.5 },
  { name: 'Sensei', blurb: 'Heavy four-wheeler with a steel wedge. It learns from every round.', design: rivalDesign('Sensei', 'box', 'wheels4', 'scoop', '#DC2626', '#0F172A'), ballastKg: 0.15 },
]

export const RIVAL_FSM: FsmProgram[] = [RIVAL_BUMBLES, RIVAL_TWISTER, RIVAL_DODGER, SENSEI_TACTICS['wedge-rush'].fsm]

/** The fixed seed of each tier's bout; Legend rounds add the round index. */
export function boutSeed(tier: number, round = 0): number {
  return 1000 + tier * 97 + round * 13
}

/** Start poses on the shikiri lines: you at the south line facing north; the rival's facing comes from the seed. */
export function startPoses(tier: number, seed: number, youDesign?: RobotDesign): { you: { x: number; z: number; yaw: number }; rival: { x: number; z: number; yaw: number } } {
  const rnd = seeded(seed)
  const jitter = () => (rnd() - 0.5) * 0.3 // ±8.6°
  // Cadet starts face to face; higher tiers may start turned away, so the robot must search.
  // Pilot starts back to back: both robots must search.
  const facings = tier === 0 || tier === 2 ? [Math.PI] : tier === 1 ? [0] : [Math.PI, Math.PI / 2, -Math.PI / 2, Math.PI * 0.75, -Math.PI * 0.75]
  const rivalYaw = facings[Math.floor(rnd() * facings.length)] + jitter()
  // Cadet faces the rival; Pilot starts facing AWAY (it must search, and must not drive off);
  // Ace and Legend start half-turned.
  const youYaw = tier === 0 ? jitter() : tier === 1 ? Math.PI + jitter() : (rnd() < 0.5 ? 1 : -1) * (Math.PI / 4) + jitter()
  if (tier === 1) {
    // Pilot: back to back, and you start near the edge facing it. Twister spins round, finds you
    // and charges your back: only a line card that backs up keeps you on the ring.
    const front = youDesign ? robotSpec(youDesign).body.front : 0.078
    return { you: { x: 0, z: -(RING_R - front - 0.03), yaw: Math.PI + jitter() }, rival: { x: 0, z: 0.2, yaw: rivalYaw } }
  }
  if (tier === 2) {
    // Ace: Dodger starts BEHIND you, facing your back, and shoves you toward the edge at the bell.
    // Your edge sensors are the only warning you get; backing up is the only defence.
    // You start facing the edge with your edge sensors just over the white line (2.5 cm inside the rim).
    const front = youDesign ? robotSpec(youDesign).body.front : 0.078
    const zY = -(RING_R - front - 0.03)
    const gap = 0.2
    return { you: { x: 0, z: zY, yaw: Math.PI + jitter() }, rival: { x: 0, z: zY + gap, yaw: Math.PI + jitter() * 0.5 } }
  }
  return {
    you: { x: 0, z: -0.3, yaw: youYaw },
    rival: { x: 0, z: 0.3, yaw: rivalYaw },
  }
}

/**
 * Weight-class matching for Ace. Dodger's motors are set so its push is DODGER_PUSH_SHARE of yours,
 * whatever robot you built: the bout tests your program, not your parts (parts are Legend's job).
 */
export const DODGER_PUSH_SHARE = 0.78
export function rivalMotorMul(tier: number, youDesign: RobotDesign, youBallast: number): number {
  if (tier !== 2) return 1
  const you = botStats(youDesign, youBallast)
  const r = RIVALS[2]
  const rs = botStats(r.design, r.ballastKg)
  const target = DODGER_PUSH_SHARE * you.pushN
  if (rs.gripN <= target) return 1
  return Math.max(0.25, Math.min(1, target / rs.motorN))
}

export function buildSetups(opts: {
  tier: number
  seed: number
  youDesign: RobotDesign
  youBallast: number
  youController: Controller
  youThreshold: number
  tactic?: SenseiTactic
}): [BotSetup, BotSetup] {
  const rival = RIVALS[opts.tier]
  const fsm = opts.tier === 3 && opts.tactic ? SENSEI_TACTICS[opts.tactic].fsm : RIVAL_FSM[opts.tier]
  const poses = startPoses(opts.tier, opts.seed, opts.youDesign)
  const motorMul = rivalMotorMul(opts.tier, opts.youDesign, opts.youBallast)
  return [
    { id: 'you', name: opts.youDesign.name || 'You', design: opts.youDesign, ballastKg: opts.youBallast, ...poses.you, edgeThreshold: opts.youThreshold, controller: opts.youController },
    { id: 'rival', name: rival.name, design: rival.design, ballastKg: rival.ballastKg, ...poses.rival, edgeThreshold: fsm.edgeThreshold, controller: fsmController(fsm), motorMul },
  ]
}
