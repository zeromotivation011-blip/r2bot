// components/kids/games/sumo-arena/brain.ts
// The robots' brains. Every sumo strategy here is a STATE MACHINE: the robot is
// always in one state (SEARCH, CHARGE, RECOVER …), does that state's action,
// and switches state when a sensor condition comes true. That is how real
// competition sumo robots are programmed.
//
//   Cadet  — pick a ready-made behaviour and tune its speed (compiled to an FSM).
//   Pilot  — rule cards: "if line seen → back up and turn", checked top to bottom.
//   Ace    — the full state machine: thresholds for the distance and edge
//            sensors, and the timings of every move.
//   Legend — the Ace machine plus the robot's design, vs an adaptive rival.
//
// Pure and deterministic: no randomness, no clock — only the sensors and dtMs.

import type { Controller, DriveCmd, SumoSensors } from './sim'

// ── The full state machine (Ace, Legend, the rivals, and Cadet presets) ─────
export type SearchMode = 'spin' | 'arc' | 'straight' | 'wait'

export interface FsmProgram {
  search: { mode: SearchMode; /** 1 = turn right, −1 = left */ dir: 1 | -1; speed: number }
  /** SEARCH → CHARGE when the rival is closer than this (cm). */
  seeCm: number
  charge: { speed: number }
  /** CHARGE → SEARCH when the rival has been out of sight this long (ms). */
  lostMs: number
  /** Edge sensor reading (0–100) that counts as "line seen". Ring ≈ 8, white line ≈ 92. */
  edgeThreshold: number
  /** While charging with the rival closer than 12 cm, ignore the line and keep pushing. */
  pushThroughEdge: boolean
  recover: { backMs: number; turnMs: number; speed: number; dir: 1 | -1 }
  /** Rival-only extras. */
  /** While searching, turn to keep facing the rival whenever the sensor has it (or had it in the last 1.2 s). */
  track?: boolean
  /** Opening move at the bell: curve right (1), left (−1) or drive straight (0) for `ms`. */
  opening?: { ms: number; dir: 1 | -1 | 0; speed: number; /** then reverse away for this long before searching */ backOffMs?: number }
  dodge?: { cm: number; ms: number; dir: 1 | -1; speed: number; /** ms of hard pivot before the dash */ turnMs: number; /** only side-step a rival closing faster than this, cm/s */ minClosing: number }
}

type FsmState = 'OPEN' | 'BACKOFF' | 'SEARCH' | 'CHARGE' | 'RECOVER' | 'DODGE'

const steer = (speed: number, bearing: number): [number, number] => {
  // Turn toward the echo: a target to the right speeds up the left wheel.
  const k = Math.max(-0.6, Math.min(0.6, bearing / 25))
  return [speed * (1 + k), speed * (1 - k)]
}

export function fsmController(p: FsmProgram): Controller {
  let state: FsmState = p.opening ? 'OPEN' : 'SEARCH'
  let tIn = 0
  let sinceSeen = Infinity
  let sinceAny = Infinity
  let anyBearing = 0
  let lastBearing = 0
  let prevDist: number | null = null
  let closing = 0
  let dodgeCooldown = 0
  const go = (s: FsmState) => {
    state = s
    tIn = 0
  }
  return {
    tick(s: SumoSensors, dtMs: number): DriveCmd {
      tIn += dtMs
      const seen = s.distCm !== null && s.distCm <= p.seeCm
      if (seen) {
        sinceSeen = 0
        lastBearing = s.bearingDeg
      } else sinceSeen += dtMs
      if (s.distCm !== null) {
        sinceAny = 0
        anyBearing = s.bearingDeg
      } else sinceAny += dtMs
      const edge = Math.max(s.edgeL, s.edgeR) >= p.edgeThreshold
      const close = s.distCm !== null && s.distCm < 12
      // How fast the rival is coming at us (cm/s), smoothed: a dodger only side-steps a CHARGE.
      const rate = s.distCm !== null && prevDist !== null ? ((prevDist - s.distCm) / dtMs) * 1000 : 0
      closing = closing * 0.8 + rate * 0.2
      prevDist = s.distCm
      dodgeCooldown = Math.max(0, dodgeCooldown - dtMs)
      const dodgeNow = !!p.dodge && dodgeCooldown === 0 && s.distCm !== null && s.distCm < p.dodge.cm && s.distCm > 6 && closing > p.dodge.minClosing

      // Transitions, checked in order.
      switch (state) {
        case 'OPEN':
          if (edge) go('RECOVER')
          else if (p.opening && tIn >= p.opening.ms) go(p.opening.backOffMs ? 'BACKOFF' : 'SEARCH')
          break
        case 'BACKOFF':
          if (tIn >= (p.opening?.backOffMs ?? 0)) go('SEARCH')
          break
        case 'SEARCH':
          if (edge) go('RECOVER')
          else if (dodgeNow) go('DODGE')
          else if (seen) go('CHARGE')
          break
        case 'CHARGE':
          // (No side-step while charging: then the closing speed is our own.)
          if (edge && !(p.pushThroughEdge && close)) go('RECOVER')
          else if (sinceSeen > p.lostMs) go('SEARCH')
          break
        case 'RECOVER':
          if (tIn >= p.recover.backMs + p.recover.turnMs) go(seen ? 'CHARGE' : 'SEARCH')
          break
        case 'DODGE':
          // No RECOVER mid-step: the dash itself curves away from the line (see the action below).
          if (p.dodge && tIn >= p.dodge.ms) {
            dodgeCooldown = 1500
            go('SEARCH')
          }
          break
      }

      // The state's action.
      switch (state) {
        case 'OPEN': {
          const o = p.opening!
          // dir 0: a straight shove that keeps the rival in the middle of its sensor fan.
          const turn = o.dir === 0 ? steer(o.speed, s.distCm !== null ? s.bearingDeg : 0) : o.dir === 1 ? [o.speed, o.speed * 0.3] : [o.speed * 0.3, o.speed]
          return { l: turn[0], r: turn[1], state: 'OPENING' }
        }
        case 'BACKOFF':
          return { l: -70, r: -70, state: 'BACK OFF' }
        case 'SEARCH': {
          const { mode, dir, speed } = p.search
          if (p.track && sinceAny < 1200) {
            // Turn on the spot to keep the rival dead ahead (or toward where it was last seen).
            const k = s.distCm !== null ? Math.max(-1, Math.min(1, s.bearingDeg / 10)) : anyBearing >= 0 ? 1 : -1
            return { l: speed * k, r: -speed * k, state: 'SEARCH' }
          }
          if (mode === 'wait') return { l: 0, r: 0, state: 'SEARCH' }
          if (mode === 'spin') return { l: dir * speed * 0.7, r: -dir * speed * 0.7, state: 'SEARCH' }
          if (mode === 'straight') return { l: speed, r: speed, state: 'SEARCH' }
          // arc: drive forward while curving
          return dir === 1 ? { l: speed, r: speed * 0.45, state: 'SEARCH' } : { l: speed * 0.45, r: speed, state: 'SEARCH' }
        }
        case 'CHARGE': {
          const [l, r] = steer(p.charge.speed, seen ? s.bearingDeg : lastBearing * 0.5)
          return { l, r, state: 'CHARGE' }
        }
        case 'RECOVER': {
          const { backMs, speed, dir } = p.recover
          if (tIn < backMs) return { l: -speed, r: -speed, state: 'RECOVER' }
          return { l: dir * speed * 0.8, r: -dir * speed * 0.8, state: 'RECOVER' }
        }
        case 'DODGE': {
          // A real side-step: pivot hard out of the charge's line, then dash forward to clear it.
          const d = p.dodge!
          if (tIn < d.turnMs) return { l: d.dir * d.speed, r: -d.dir * d.speed, state: 'DODGE' }
          // Dash, curving back toward the middle of the ring (harder while a front sensor is on the line).
          const c = edge ? 0.2 : 0.75
          return d.dir === 1 ? { l: d.speed * c, r: d.speed, state: 'DODGE' } : { l: d.speed, r: d.speed * c, state: 'DODGE' }
        }
      }
    },
  }
}

// ── Cadet: ready-made behaviours ───────────────────────────────────────────
export type CadetPreset = 'hunter' | 'bulldozer' | 'statue'

export const CADET_PRESETS: { id: CadetPreset; name: string; icon: string; what: string }[] = [
  { id: 'hunter', name: 'Hunter', icon: '🔍', what: 'Spins to look for the rival, charges when it sees it, and backs away from the white edge.' },
  { id: 'bulldozer', name: 'Bulldozer', icon: '🚜', what: 'Drives straight ahead and never looks. Backs away from the edge, then drives straight again.' },
  { id: 'statue', name: 'Statue', icon: '🗿', what: 'Stands still and waits. Charges only when the rival comes very close.' },
]

export interface CadetProgram {
  preset: CadetPreset
  speed: number
}

export function cadetToFsm(c: CadetProgram): FsmProgram {
  const base: FsmProgram = {
    search: { mode: 'spin', dir: 1, speed: c.speed },
    seeCm: 70,
    charge: { speed: c.speed },
    lostMs: 500,
    edgeThreshold: 50,
    pushThroughEdge: true,
    recover: { backMs: 450, turnMs: 500, speed: Math.max(50, c.speed), dir: 1 },
  }
  if (c.preset === 'bulldozer') return { ...base, search: { mode: 'straight', dir: 1, speed: c.speed }, seeCm: 0, recover: { ...base.recover, turnMs: 700 } }
  if (c.preset === 'statue') return { ...base, search: { mode: 'wait', dir: 1, speed: 0 }, seeCm: 18 }
  return base
}

// ── Pilot: rule cards ──────────────────────────────────────────────────────
export type RuleCond = 'line' | 'see' | 'always'
export type RuleAction = 'backturn' | 'charge' | 'spin' | 'creep' | 'forward' | 'stop'

export interface RuleCard {
  cond: RuleCond
  action: RuleAction
}

export interface PilotProgram {
  /** Checked top to bottom; the first card whose IF is true wins. The last card is always "otherwise". */
  rules: RuleCard[]
  speed: number
}

export const COND_TEXT: Record<RuleCond, string> = {
  line: 'my edge sensor sees the white line',
  see: 'the rival is ahead (closer than 60 cm)',
  always: 'nothing else is true (otherwise)',
}

export const ACTION_TEXT: Record<RuleAction, string> = {
  backturn: 'back up and turn',
  charge: 'charge at full power',
  spin: 'spin on the spot to look',
  creep: 'creep forward slowly',
  forward: 'keep driving forward',
  stop: 'stop and wait',
}

export const PILOT_SEE_CM = 60

export function ruleController(p: PilotProgram): Controller {
  let macroMs = -1 // > = 0 while backing up and turning
  const BACK = 450
  const TURN = 500
  return {
    tick(s: SumoSensors, dtMs: number): DriveCmd {
      const sp = p.speed
      if (macroMs >= 0) {
        macroMs += dtMs
        if (macroMs < BACK) return { l: -sp, r: -sp, state: 'BACK UP' }
        if (macroMs < BACK + TURN) return { l: sp * 0.8, r: -sp * 0.8, state: 'BACK UP' }
        macroMs = -1
      }
      const holds = (c: RuleCond) => (c === 'line' ? Math.max(s.edgeL, s.edgeR) >= 50 : c === 'see' ? s.distCm !== null && s.distCm <= PILOT_SEE_CM : true)
      const rule = p.rules.find((r) => holds(r.cond)) ?? { cond: 'always', action: 'stop' }
      switch (rule.action) {
        case 'backturn':
          macroMs = 0
          return { l: -sp, r: -sp, state: 'BACK UP' }
        case 'charge': {
          const [l, r] = steer(100, s.distCm !== null ? s.bearingDeg : 0)
          return { l, r, state: 'CHARGE' }
        }
        case 'spin':
          return { l: sp * 0.6, r: -sp * 0.6, state: 'SPIN' }
        case 'creep':
          return { l: sp * 0.35, r: sp * 0.35, state: 'CREEP' }
        case 'forward':
          return { l: sp, r: sp, state: 'FORWARD' }
        case 'stop':
          return { l: 0, r: 0, state: 'STOP' }
      }
    },
  }
}

// ── Starting programs a child edits ────────────────────────────────────────
export const DEFAULT_CADET: CadetProgram = { preset: 'bulldozer', speed: 50 }

/** Pilot starts with a bug to find: the line card keeps driving forward. */
export const DEFAULT_PILOT: PilotProgram = {
  rules: [
    { cond: 'see', action: 'charge' },
    { cond: 'line', action: 'forward' },
    { cond: 'always', action: 'creep' },
  ],
  speed: 60,
}

/** Ace starts as a working but naive machine: short sight, no patience, gives up pushes at the line. */
export const DEFAULT_ACE: FsmProgram = {
  search: { mode: 'spin', dir: 1, speed: 50 },
  seeCm: 20,
  charge: { speed: 70 },
  lostMs: 0,
  edgeThreshold: 50,
  pushThroughEdge: false,
  recover: { backMs: 150, turnMs: 300, speed: 60, dir: 1 },
}

// ── The rivals ─────────────────────────────────────────────────────────────
/** Cadet rival: slow and gentle. */
export const RIVAL_BUMBLES: FsmProgram = {
  search: { mode: 'spin', dir: -1, speed: 35 },
  seeCm: 45,
  charge: { speed: 45 },
  lostMs: 300,
  edgeThreshold: 50,
  pushThroughEdge: false,
  recover: { backMs: 400, turnMs: 500, speed: 50, dir: -1 },
}

/** Pilot rival: a quick spinner that charges hard. */
export const RIVAL_TWISTER: FsmProgram = {
  search: { mode: 'spin', dir: 1, speed: 45 },
  seeCm: 50,
  charge: { speed: 60 },
  lostMs: 300,
  edgeThreshold: 50,
  pushThroughEdge: true,
  recover: { backMs: 400, turnMs: 450, speed: 60, dir: 1 },
}

/** Ace rival: circles the ring and side-steps a charge, then comes back at your side. */
export const RIVAL_DODGER: FsmProgram = {
  search: { mode: 'spin', dir: -1, speed: 50 },
  seeCm: 12,
  charge: { speed: 100 },
  lostMs: 400,
  edgeThreshold: 50,
  pushThroughEdge: true,
  recover: { backMs: 400, turnMs: 450, speed: 70, dir: -1 },
  opening: { ms: 1500, dir: 0, speed: 100, backOffMs: 900 },
  dodge: { cm: 40, ms: 600, dir: 1, speed: 100, turnMs: 150, minClosing: 30 },
  track: true,
}

/** Legend rival tactics; the adaptive bot picks one per round from what it saw you do. */
export type SenseiTactic = 'wedge-rush' | 'flank' | 'counter'

export const SENSEI_TACTICS: Record<SenseiTactic, { name: string; what: string; fsm: FsmProgram }> = {
  'wedge-rush': {
    name: 'Wedge rush',
    what: 'charges straight at you from the start, wedge first',
    fsm: {
      search: { mode: 'spin', dir: 1, speed: 55 },
      seeCm: 80,
      charge: { speed: 90 },
      lostMs: 500,
      edgeThreshold: 50,
      pushThroughEdge: true,
      recover: { backMs: 400, turnMs: 400, speed: 70, dir: 1 },
    },
  },
  flank: {
    name: 'Flank attack',
    what: 'swerves round to hit you from the side, where you are weakest',
    fsm: {
      search: { mode: 'spin', dir: -1, speed: 55 },
      seeCm: 80,
      charge: { speed: 90 },
      lostMs: 500,
      edgeThreshold: 50,
      pushThroughEdge: true,
      recover: { backMs: 400, turnMs: 400, speed: 70, dir: -1 },
      opening: { ms: 900, dir: 1, speed: 80 },
    },
  },
  counter: {
    name: 'Counter-punch',
    what: 'waits for your charge, side-steps it and pushes you from behind',
    fsm: {
      search: { mode: 'wait', dir: 1, speed: 0 },
      seeCm: 80,
      charge: { speed: 90 },
      lostMs: 600,
      edgeThreshold: 50,
      pushThroughEdge: true,
      recover: { backMs: 400, turnMs: 400, speed: 70, dir: 1 },
      dodge: { cm: 30, ms: 500, dir: -1, speed: 90, turnMs: 175, minClosing: 25 },
    },
  },
}

/** What the adaptive bot remembers about a finished round. */
export interface RoundMemory {
  youWon: boolean
  /** You reached it fast (first contact within 2.5 s) — a rusher. */
  youRushed: boolean
  /** It got hit on the side or back. */
  itWasFlanked: boolean
}

/**
 * The adaptive bot. Round 1: wedge rush. Then it adapts like a human player would:
 * if your rush beat it, it counter-punches (rushers fall for a side-step); if you
 * waited or searched, it flanks; if its last tactic won, it repeats it.
 */
export function senseiTactic(history: { tactic: SenseiTactic; memory: RoundMemory }[]): SenseiTactic {
  if (history.length === 0) return 'wedge-rush'
  const last = history[history.length - 1]
  if (!last.memory.youWon) return last.tactic
  if (last.memory.youRushed) return last.tactic === 'counter' ? 'flank' : 'counter'
  return last.tactic === 'flank' ? 'wedge-rush' : 'flank'
}

/** What the adaptive bot takes away from a finished round (see senseiTactic). */
export function roundMemory(r: { winner: string; hitSide: string | null; logs: { you: { firstSeenS: number | null; lastContactT: number; stateTime: Record<string, number> } } }): RoundMemory {
  const y = r.logs.you
  return {
    youWon: r.winner === 'you',
    youRushed: y.lastContactT >= 0 && (y.firstSeenS ?? 99) < 1.5 && (y.stateTime.CHARGE ?? 0) > 0.5,
    itWasFlanked: r.hitSide === 'side' || r.hitSide === 'back',
  }
}
