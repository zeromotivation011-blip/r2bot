// components/kids/games/robot-surgeon/assist.ts
// LEGEND — Remote Assist. The child runs a whole tele-operated session on a
// soft practice pad: a safety checklist that arms the robot (an interlock),
// then marking four targets with a gentle, controlled touch through a
// network delay, with a robot-side force limit and a head-at-viewer sensor.
//
// The model:
//   - Delay: commands take CMD_DELAY to reach the robot and its video takes
//     VIDEO_DELAY to come back, so what you see is 0.4 s old in total.
//   - Contact: the pad is a spring. Force = STIFFNESS × depth (N per mm).
//   - Force limit: enforced ON THE ROBOT, with no network delay — the robot
//     will not push deeper than limit ÷ stiffness. A limit above SAFE_MAX lets
//     the tool stress the pad; one below MARK_MIN cannot mark anything.
//   - Marking a target: tip within MARK_R of its centre with a force between
//     MARK_MIN and MARK_MAX, held for MARK_HOLD seconds.
//   - Head sensor: while the surgeon looks away from the viewer the robot
//     freezes. Switch it off and the instruments keep following a hand that
//     is no longer watching.
// Seeded: targets and the team's call come at the same time every round.

import { clamp, rng } from './shared'

export const PAD_W = 80
export const PAD_H = 50
export const CMD_DELAY = 0.2
export const VIDEO_DELAY = 0.2
export const STIFFNESS = 0.9 // N per mm
export const SAFE_MAX = 3.5 // N — above this the pad is stressed
export const MARK_MIN = 1.0
export const MARK_MAX = 2.5
export const MARK_R = 2.2 // mm
export const MARK_HOLD = 0.7 // s
export const PRESS_SPEED = 2.5 // mm/s commanded descent while pressing
export const LIFT_SPEED = 6
export const HOVER = -2 // mm above the surface when not pressing
export const TIME_LIMIT = 110
export const KEY_SPEED = 14 // mm/s
export const MM_PER_PX = 0.22

export type CheckId = 'drapes' | 'count' | 'estop' | 'camera' | 'latency' | 'team' | 'nolimit' | 'nohead'

export interface CheckItem {
  id: CheckId
  label: string
  detail: string
  required: boolean
}

export const CHECKLIST: CheckItem[] = [
  { id: 'drapes', label: 'Sterile drapes cover every robot arm', detail: 'Germ-free covers between the robot and the patient.', required: true },
  { id: 'count', label: 'Instruments counted — matches the list', detail: 'Every tool that goes in must come out.', required: true },
  { id: 'estop', label: 'Emergency stop tested today', detail: 'Press it, see everything stop, release.', required: true },
  { id: 'nolimit', label: 'Switch off the force limit so the tool can push harder', detail: 'Saves time if the tissue is tough.', required: false },
  { id: 'camera', label: '3D camera calibrated — both eyes line up', detail: 'Otherwise depth looks wrong.', required: true },
  { id: 'latency', label: 'Network delay measured: 0.4 s round trip — accepted', detail: 'You will see everything 0.4 s late.', required: true },
  { id: 'nohead', label: 'Switch off the head sensor so the tools never freeze', detail: 'Lets you look at the team while you keep working.', required: false },
  { id: 'team', label: 'Bedside team ready and able to reach the patient', detail: 'People beside the patient can take over at once.', required: true },
]

export interface Target {
  x: number
  y: number
  hold: number
  done: boolean
  err: number
}

export interface Snapshot {
  t: number
  x: number
  y: number
  d: number
  f: number
}

export interface AssistConfig {
  checks: Record<CheckId, boolean>
  forceLimit: number
}

export interface AssistState {
  t: number
  cfg: AssistConfig
  limitOn: boolean
  headOn: boolean
  /** The surgeon's hand (live). */
  hx: number
  hy: number
  press: boolean
  /** Commands sent (time-stamped), read by the robot after CMD_DELAY. */
  cmds: { t: number; x: number; y: number; press: boolean }[]
  /** The robot (true state). */
  x: number
  y: number
  d: number
  f: number
  /** Robot states for the delayed video. */
  video: Snapshot[]
  targets: Target[]
  /** Looking away from the viewer. */
  lookingAway: boolean
  alertAt: number
  alertOpen: boolean
  alertHandled: boolean
  lookAwayLeft: number
  /** Safety record. */
  tissueStress: number
  stressNow: boolean
  limitHits: number
  limitNow: boolean
  ignoredTeam: boolean
  movedBlind: number
  peakForce: number
  done: boolean
  timeUp: boolean
  rand: () => number
  driftX: number
  driftY: number
}

export function makeAssist(cfg: AssistConfig, seed = 13): AssistState {
  const r = rng(seed)
  const spots: [number, number][] = [
    [16, 14],
    [62, 12],
    [22, 38],
    [64, 36],
  ]
  const targets = spots.map(([x, y]) => ({ x: x + (r() - 0.5) * 6, y: y + (r() - 0.5) * 6, hold: 0, done: false, err: 0 }))
  return {
    t: 0,
    cfg,
    limitOn: !cfg.checks.nolimit,
    headOn: !cfg.checks.nohead,
    hx: PAD_W / 2,
    hy: PAD_H / 2,
    press: false,
    cmds: [],
    x: PAD_W / 2,
    y: PAD_H / 2,
    d: HOVER,
    f: 0,
    video: [],
    targets,
    lookingAway: false,
    alertAt: 14 + r() * 6,
    alertOpen: false,
    alertHandled: false,
    lookAwayLeft: 0,
    tissueStress: 0,
    stressNow: false,
    limitHits: 0,
    limitNow: false,
    ignoredTeam: false,
    movedBlind: 0,
    peakForce: 0,
    done: false,
    timeUp: false,
    rand: r,
    driftX: (r() - 0.5) * 4,
    driftY: 2 + r() * 2,
  }
}

export function checklistErrors(cfg: AssistConfig): CheckId[] {
  return CHECKLIST.filter((c) => !c.required && cfg.checks[c.id]).map((c) => c.id)
}

export function missingRequired(cfg: AssistConfig): CheckItem[] {
  return CHECKLIST.filter((c) => c.required && !cfg.checks[c.id])
}

/** Advance the session. hdx/hdy: hand movement this step (mm). */
export function stepAssist(s: AssistState, hdx: number, hdy: number, press: boolean, dt: number) {
  if (s.done || s.timeUp) return
  s.t += dt
  // The team calls: the surgeon has to look up at them.
  if (!s.alertHandled && !s.alertOpen && s.t >= s.alertAt) s.alertOpen = true
  if (s.alertOpen && !s.lookingAway && s.t - s.alertAt > 6) {
    s.alertOpen = false
    s.alertHandled = true
    s.ignoredTeam = true
  }
  if (s.lookingAway) {
    s.lookAwayLeft -= dt
    // With the head sensor on, the hand controls lock in place. Without it,
    // nobody is watching the hand: it drifts and sags a little.
    hdx = s.headOn ? 0 : s.driftX * dt
    hdy = s.headOn ? 0 : s.driftY * dt * 0.5
    press = s.headOn ? false : s.press
    if (s.lookAwayLeft <= 0) s.lookingAway = false
  }
  s.hx = clamp(s.hx + hdx, 0, PAD_W)
  s.hy = clamp(s.hy + hdy, 0, PAD_H)
  s.press = press
  // Head sensor interlock: while looking away the robot holds (commands are not sent).
  const frozen = s.lookingAway && s.headOn
  if (!frozen) s.cmds.push({ t: s.t, x: s.hx, y: s.hy, press: s.press })
  // The robot reads the newest command that has arrived.
  let cmd: (typeof s.cmds)[number] | undefined
  while (s.cmds.length && s.cmds[0].t <= s.t - CMD_DELAY) cmd = s.cmds.shift()
  if (cmd) {
    const px = s.x
    const py = s.y
    // Robot joints have a top speed: 40 mm/s.
    const dx = cmd.x - s.x
    const dy = cmd.y - s.y
    const dist = Math.hypot(dx, dy)
    const maxStep = 40 * dt
    if (dist > maxStep) {
      s.x += (dx / dist) * maxStep
      s.y += (dy / dist) * maxStep
    } else {
      s.x = cmd.x
      s.y = cmd.y
    }
    if (cmd.press) s.d += PRESS_SPEED * dt
    else s.d = Math.max(HOVER, s.d - LIFT_SPEED * dt)
    if (s.lookingAway && !s.headOn) s.movedBlind += Math.hypot(s.x - px, s.y - py)
    // Hand sagging while nobody watches presses the tool down too.
    if (s.lookingAway && !s.headOn) s.d += 1.2 * dt
  }
  // Robot-side force limit (no network delay).
  if (s.limitOn) {
    const maxD = s.cfg.forceLimit / STIFFNESS
    if (s.d > maxD) {
      s.d = maxD
      if (!s.limitNow) s.limitHits++
      s.limitNow = true
    } else if (s.d < maxD - 0.2) s.limitNow = false
  }
  s.d = Math.min(s.d, 8)
  s.f = Math.max(0, s.d) * STIFFNESS
  s.peakForce = Math.max(s.peakForce, s.f)
  if (s.f > SAFE_MAX) {
    if (!s.stressNow) s.tissueStress++
    s.stressNow = true
  } else if (s.f < SAFE_MAX - 0.5) s.stressNow = false
  // Marking.
  for (const tg of s.targets) {
    if (tg.done) continue
    const e = Math.hypot(s.x - tg.x, s.y - tg.y)
    if (e <= MARK_R && s.f >= MARK_MIN && s.f <= MARK_MAX) {
      tg.hold += dt
      if (tg.hold >= MARK_HOLD) {
        tg.done = true
        tg.err = e
      }
    } else tg.hold = Math.max(0, tg.hold - dt * 2)
  }
  s.video.push({ t: s.t, x: s.x, y: s.y, d: s.d, f: s.f })
  while (s.video.length > 2 && s.video[1].t <= s.t - VIDEO_DELAY - 0.05) s.video.shift()
  if (s.targets.every((tg) => tg.done) && s.d <= 0) s.done = true
  if (s.t >= TIME_LIMIT) s.timeUp = true
}

/** What the surgeon sees: the robot as it was VIDEO_DELAY ago. */
export function seen(s: AssistState): Snapshot {
  const want = s.t - VIDEO_DELAY
  let best = s.video[0] ?? { t: 0, x: s.x, y: s.y, d: HOVER, f: 0 }
  for (const v of s.video) if (v.t <= want) best = v
  return best
}

export function lookUp(s: AssistState) {
  if (!s.alertOpen) return
  s.alertOpen = false
  s.alertHandled = true
  s.lookingAway = true
  s.lookAwayLeft = 3
}

export function safetyErrors(s: AssistState): number {
  return checklistErrors(s.cfg).length + s.tissueStress + (s.ignoredTeam ? 1 : 0) + (s.movedBlind > 1 ? 1 : 0)
}

export function marked(s: AssistState): number {
  return s.targets.filter((t) => t.done).length
}

export function assistStars(s: AssistState): number {
  const m = marked(s)
  const e = safetyErrors(s)
  if (m === 4 && e === 0 && s.t <= 80) return 3
  if (m === 4 && e <= 1) return 2
  if (m >= 3 && e <= 2) return 1
  return 0
}

export function assistScore(s: AssistState): number {
  const m = marked(s)
  const acc = s.targets.filter((t) => t.done).reduce((a, t) => a + Math.max(0, 100 - 40 * t.err), 0)
  const time = s.done ? Math.max(0, Math.round((TIME_LIMIT - s.t) * 3)) : 0
  return Math.max(0, m * 200 + Math.round(acc) + time - 150 * safetyErrors(s))
}
