// components/kids/net/link-sim.ts
// Link Lab (roadmap #88): the physics and the radio under the lab. Pure
// TypeScript: no React, no DOM, fixed time step, seeded randomness, so the same
// inputs on the same level always give the same run (a fair score).
//
// What is modelled:
//  • A teleoperated rover (unicycle model: drive speed + turn rate, a short
//    acceleration ramp, walls that block it, pits it can fall into).
//  • A radio link with one-way LATENCY, random JITTER (so messages can arrive
//    in a different order from the one they were sent in), random LOSS, and
//    weak-signal zones where most messages are lost. Commands go up, acks and
//    the video (telemetry, 10 per second) come down, all through the same link.
//  • The operator sees ONLY the telemetry: a picture of where the robot was,
//    as old as the link is slow. The true path is revealed after the run.
//  • The fixes engineers really use:
//      ack + retry       — every command has a number; the robot replies
//                          "got 7"; the operator resends until it hears that;
//      sequence numbers  — the robot ignores any command older than the newest
//                          one it has obeyed (a late FWD can't undo a STOP);
//      watchdog stop     — the operator streams the current command 10 times
//                          a second (a heartbeat); the robot stops itself if it
//                          hears nothing fresh for `watchdogMs`;
//      speed limit and a predicted-position display for long delays.
//  • Left out: bandwidth limits, radio range falling off with distance,
//    encryption (Robot Security Check covers who may send commands).

export const DT = 1 / 60
/** Personal-best id prefix of a level (`net-link-<level id>`); GuardiansWorldClient reads it too. */
export const LINK_BEST_PREFIX = 'net-link-'
export const ARENA = { w: 16, h: 10 }
export const ROBOT_R = 0.35
const V_MAX = 1.3 // m/s at 100 %
const W_MAX = 1.9 // rad/s
const ACCEL = 4 // m/s²
const TELEMETRY_EVERY = 0.1 // s
const HEARTBEAT_EVERY = 0.1 // s
const SETTLE_S = 0.8 // must sit still in the dock this long

export type Cmd = 'fwd' | 'back' | 'left' | 'right' | 'stop'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface Protections {
  /** Every command numbered and acknowledged; resent until acked. */
  ack: boolean
  /** The robot ignores commands older than the newest it has obeyed. */
  seq: boolean
  /** Heartbeat stream + the robot stops itself when the link goes quiet. */
  watchdog: boolean
  /** Draw where the robot probably is now (extrapolated from old video). */
  predict: boolean
  /** Top speed, 0.3–1 of V_MAX. */
  speed: number
  /** Resend a command after this long without its ack (ms). */
  retryMs: number
  /** Watchdog timeout (ms). */
  watchdogMs: number
}

export type FixId = 'ack' | 'seq' | 'watchdog' | 'predict' | 'speed' | 'retryMs' | 'watchdogMs'

export interface LinkSpec {
  latencyMs: number
  jitterMs: number
  /** 0–1 chance each message is lost. */
  loss: number
  /** Weak-signal zones: a message sent while the robot is inside is lost with `weakLoss`. */
  weak: Rect[]
  weakLoss: number
}

export interface LevelDef {
  id: string
  n: number
  name: string
  /** The band this level is written for. */
  band: 'inventors' | 'engineers'
  /** One-line story for the card. */
  story: string
  /** What goes wrong without the fix (shown before the run). */
  problem: string
  /** The engineering idea of the level (shown after). */
  lesson: string
  link: LinkSpec
  start: { x: number; y: number; h: number }
  dock: { x: number; y: number; r: number }
  pits: Rect[]
  walls: Rect[]
  /** Fixes the child can change on this level. */
  fixes: FixId[]
  /** The level's protections for the second star. */
  required: (p: Protections) => boolean
  requiredText: string
  /** Third star: no more than this many needless watchdog stops and bumps. */
  maxNeedless: number
  maxBumps: number
  seed: number
  /** Badge for a docked run (universe badge id), if any. */
  badge?: string
}

export const DEFAULT_PROTECTIONS: Protections = {
  ack: false,
  seq: false,
  watchdog: false,
  predict: false,
  speed: 1,
  retryMs: 300,
  watchdogMs: 500,
}

const R = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h })

export const LEVELS: LevelDef[] = [
  {
    id: 'clear',
    n: 1,
    name: 'Clear signal',
    band: 'inventors',
    story: 'Drive the inspection rover across the yard and park it on the charging dock. The radio is perfect.',
    problem: 'Nothing is wrong yet. Learn the controls: hold to drive, let go to stop.',
    lesson: 'With a fast, clean link, teleoperation feels like a remote-control car: what you see is (almost) what is happening now.',
    link: { latencyMs: 40, jitterMs: 0, loss: 0, weak: [], weakLoss: 0 },
    start: { x: 1.6, y: 5, h: 0 },
    dock: { x: 13.6, y: 5, r: 0.8 },
    pits: [R(15, 3.6, 1, 2.8)],
    walls: [R(6.5, 0, 0.6, 3.6), R(9.5, 6.4, 0.6, 3.6)],
    fixes: [],
    required: () => true,
    requiredText: 'No protections needed on a perfect link.',
    maxNeedless: 0,
    maxBumps: 2,
    seed: 11,
    badge: 'precise-parker',
  },
  {
    id: 'far',
    n: 2,
    name: 'Far-away robot',
    band: 'inventors',
    story: 'The rover is far away. Every command takes 0.7 s to arrive, and the video takes 0.7 s to come back.',
    problem: 'You see where the robot WAS 0.7 s ago, and it does what you said 0.7 s ago. Robots overshoot the dock, and the pit is right behind it.',
    lesson: 'Delay makes you late twice: late to see, late to act. Slow down, move in short nudges and wait for the video, or use a predicted position.',
    link: { latencyMs: 700, jitterMs: 0, loss: 0, weak: [], weakLoss: 0 },
    start: { x: 1.6, y: 5, h: 0 },
    dock: { x: 13.2, y: 5, r: 0.8 },
    pits: [R(14.3, 3.4, 1.7, 3.2)],
    walls: [R(6.5, 0, 0.6, 3.6), R(6.5, 6.4, 0.6, 3.6)],
    fixes: ['speed', 'predict'],
    required: (p) => p.speed <= 0.6 || p.predict,
    requiredText: 'Speed limit at 60 % or lower, or the predicted position on.',
    maxNeedless: 0,
    maxBumps: 2,
    seed: 23,
    badge: 'mars-planner',
  },
  {
    id: 'lossy',
    n: 3,
    name: 'Lossy radio',
    band: 'inventors',
    story: 'A busy radio channel loses about one message in three. Commands are sent once, when you press or let go.',
    problem: 'If your STOP message is lost, the robot never hears it and keeps driving — straight towards the pit.',
    lesson: 'Number every command and have the robot reply “got it” (an ACK). No ACK in time? Send it again. That makes a lossy link reliable.',
    link: { latencyMs: 120, jitterMs: 0, loss: 0.35, weak: [], weakLoss: 0 },
    start: { x: 1.6, y: 5, h: 0 },
    dock: { x: 12.6, y: 5, r: 0.8 },
    pits: [R(14, 2.8, 2, 4.4)],
    walls: [R(5.5, 0, 0.6, 3.4), R(8.8, 6.6, 0.6, 3.4)],
    fixes: ['ack', 'speed'],
    required: (p) => p.ack,
    requiredText: 'Ack + retry on.',
    maxNeedless: 0,
    maxBumps: 2,
    seed: 37,
  },
  {
    id: 'jumbled',
    n: 4,
    name: 'Jumbled messages',
    band: 'engineers',
    story: 'Messages take different routes through a mesh network, so some arrive up to 0.6 s late — after newer ones.',
    problem: 'An old FORWARD can arrive after your STOP. The robot obeys whatever arrived last, so it lurches forward again.',
    lesson: 'Sequence numbers let the robot throw away anything older than the newest command it obeyed. Acks make sure the newest one gets there.',
    link: { latencyMs: 150, jitterMs: 600, loss: 0.12, weak: [], weakLoss: 0 },
    start: { x: 1.6, y: 2.2, h: 0 },
    dock: { x: 12.8, y: 7.6, r: 0.8 },
    pits: [R(14.2, 5.8, 1.8, 4.2), R(10.6, 9, 3, 1)],
    walls: [R(4.5, 3.6, 7.5, 0.6)],
    fixes: ['ack', 'seq', 'speed', 'predict'],
    required: (p) => p.ack && p.seq,
    requiredText: 'Ack + retry AND sequence numbers on.',
    maxNeedless: 0,
    maxBumps: 3,
    seed: 41,
  },
  {
    id: 'tunnel',
    n: 5,
    name: 'Radio shadow',
    band: 'engineers',
    story: 'The charging dock is behind a steel shelf. In its radio shadow 9 messages in 10 are lost — commands, acks and video.',
    problem: 'In the shadow your STOP (and every resend) is almost always lost, and the video freezes. The pit is just past the dock.',
    lesson: 'When the link may die, the robot must protect itself: a watchdog stops it when it has heard nothing fresh for half a second. No link, no motion.',
    link: { latencyMs: 100, jitterMs: 40, loss: 0.05, weak: [R(7.8, 3.2, 3.8, 3.6)], weakLoss: 0.9 },
    start: { x: 1.6, y: 5, h: 0 },
    dock: { x: 10.2, y: 5, r: 0.8 },
    pits: [R(11.9, 2.6, 2.4, 4.8)],
    walls: [R(5.6, 2.6, 5.6, 0.6), R(5.6, 6.8, 5.6, 0.6)],
    fixes: ['ack', 'seq', 'watchdog', 'speed'],
    required: (p) => p.watchdog,
    requiredText: 'Watchdog stop on.',
    maxNeedless: 3,
    maxBumps: 3,
    seed: 53,
  },
  {
    id: 'storm',
    n: 6,
    name: 'Storm on the link',
    band: 'engineers',
    story: 'Everything at once: 0.25 s delay, jitter, one message in five lost, and a radio shadow on the way to the dock.',
    problem: 'Turn on every protection, then TUNE the timers. A watchdog that is too impatient stops the robot for nothing; one too relaxed lets it drive blind.',
    lesson: 'Real teleoperation stacks protections and tunes them to the link: retry a bit slower than a round trip, and set the watchdog a few heartbeats longer than the worst normal gap.',
    link: { latencyMs: 250, jitterMs: 300, loss: 0.2, weak: [R(7, 0, 3.2, 5.4)], weakLoss: 0.8 },
    start: { x: 1.6, y: 8, h: 0 },
    dock: { x: 13.4, y: 2, r: 0.8 },
    pits: [R(14.6, 0, 1.4, 4.6), R(10.8, 5.6, 2.4, 2)],
    walls: [R(4, 4.6, 3, 0.6), R(10.2, 0, 0.6, 3.6)],
    fixes: ['ack', 'seq', 'watchdog', 'speed', 'predict', 'retryMs', 'watchdogMs'],
    required: (p) => p.ack && p.seq && p.watchdog && p.watchdogMs <= 1200,
    requiredText: 'Ack + retry, sequence numbers AND a watchdog of 1.2 s or less.',
    maxNeedless: 4,
    maxBumps: 3,
    seed: 67,
  },
]

export function getLevel(id: string): LevelDef | undefined {
  return LEVELS.find((l) => l.id === id)
}

// ── Seeded randomness ───────────────────────────────────────────────────────

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ── State ───────────────────────────────────────────────────────────────────

export interface Pose {
  x: number
  y: number
  h: number
}

interface UpMsg {
  kind: 'cmd'
  seq: number
  cmd: Cmd
  sentAt: number
  /** A resend or heartbeat (for the log). */
  repeat: boolean
}
interface AckMsg {
  kind: 'ack'
  seq: number
}
interface TeleMsg {
  kind: 'tele'
  t: number
  pose: Pose
  v: number
  w: number
}
type DownMsg = AckMsg | TeleMsg

interface InFlight<M> {
  at: number
  order: number
  msg: M
}

export type EventKind = 'lost-stop' | 'lost-cmd' | 'stale-ignored' | 'stale-obeyed' | 'watchdog' | 'resend' | 'bump' | 'fell' | 'docked' | 'weak-enter' | 'timeout'

export interface SimEvent {
  t: number
  kind: EventKind
  text: string
}

export interface PacketMark {
  t: number
  dir: 'up' | 'down'
  ok: boolean
  /** A STOP command (drawn bigger). */
  stop: boolean
}

export interface Stats {
  sent: number
  lost: number
  resends: number
  acked: number
  staleIgnored: number
  staleObeyed: number
  watchdogStops: number
  needlessStops: number
  bumps: number
}

export type Outcome = 'running' | 'won' | 'fell' | 'timeout'

export interface LinkState {
  level: LevelDef
  prot: Protections
  t: number
  limit: number
  // robot (truth)
  pose: Pose
  v: number
  w: number
  robotCmd: Cmd
  robotSeq: number
  lastHeard: number
  watchdogTripped: boolean
  wasInWeak: boolean
  settle: number
  // operator
  control: Cmd
  opSeq: number
  pending: { seq: number; cmd: Cmd; lastSent: number } | null
  nextHeartbeat: number
  nextTele: number
  seen: TeleMsg | null
  // link
  up: InFlight<UpMsg>[]
  down: InFlight<DownMsg>[]
  order: number
  rngUp: () => number
  rngDown: () => number
  // record
  path: Pose[]
  seenPath: Pose[]
  events: SimEvent[]
  packets: PacketMark[]
  stats: Stats
  outcome: Outcome
  reason: string
  /** The latest robot command the operator wanted at each moment (for needless-stop counting). */
  lastSendT: number
}

export function createState(level: LevelDef, prot: Protections, limitS: number = Infinity): LinkState {
  const p: Protections = { ...prot }
  // A level only uses the fixes it offers; anything else stays at its default.
  ;(Object.keys(DEFAULT_PROTECTIONS) as FixId[]).forEach((k) => {
    if (!level.fixes.includes(k)) (p as unknown as Record<string, unknown>)[k] = DEFAULT_PROTECTIONS[k]
  })
  p.speed = Math.max(0.3, Math.min(1, p.speed))
  p.retryMs = Math.max(100, Math.min(1500, p.retryMs))
  p.watchdogMs = Math.max(150, Math.min(3000, p.watchdogMs))
  const pose = { ...level.start }
  return {
    level,
    prot: p,
    t: 0,
    limit: limitS,
    pose,
    v: 0,
    w: 0,
    robotCmd: 'stop',
    robotSeq: 0,
    lastHeard: 0,
    watchdogTripped: false,
    wasInWeak: false,
    settle: 0,
    control: 'stop',
    opSeq: 0,
    pending: null,
    nextHeartbeat: 0,
    nextTele: 0,
    seen: { kind: 'tele', t: 0, pose: { ...pose }, v: 0, w: 0 },
    up: [],
    down: [],
    order: 0,
    rngUp: mulberry32(level.seed * 7919 + 1),
    rngDown: mulberry32(level.seed * 104729 + 2),
    path: [{ ...pose }],
    seenPath: [{ ...pose }],
    events: [],
    packets: [],
    stats: { sent: 0, lost: 0, resends: 0, acked: 0, staleIgnored: 0, staleObeyed: 0, watchdogStops: 0, needlessStops: 0, bumps: 0 },
    outcome: 'running',
    reason: '',
    lastSendT: -1,
  }
}

const inRect = (x: number, y: number, r: Rect) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h

export function inWeak(s: LinkState, x = s.pose.x, y = s.pose.y): boolean {
  return s.level.link.weak.some((r) => inRect(x, y, r))
}

function event(s: LinkState, kind: EventKind, text: string) {
  s.events.push({ t: s.t, kind, text })
  if (s.events.length > 200) s.events.shift()
}

const CMD_WORD: Record<Cmd, string> = { fwd: 'FORWARD', back: 'BACK', left: 'LEFT', right: 'RIGHT', stop: 'STOP' }
export const cmdWord = (c: Cmd) => CMD_WORD[c]

/** Put a message on the radio: lost, or delivered at a (jittered) later time. */
function transmit(s: LinkState, dir: 'up' | 'down', msg: UpMsg | DownMsg): boolean {
  const L = s.level.link
  const rng = dir === 'up' ? s.rngUp : s.rngDown
  const roll = rng()
  const jit = rng()
  const weak = inWeak(s)
  const lossP = weak ? Math.max(L.loss, L.weakLoss) : L.loss
  const lost = roll < lossP
  const isStop = msg.kind === 'cmd' && msg.cmd === 'stop'
  if (msg.kind !== 'tele' || s.packets.length === 0 || s.t - s.packets[s.packets.length - 1].t > 0.05) {
    s.packets.push({ t: s.t, dir, ok: !lost, stop: isStop })
    if (s.packets.length > 400) s.packets.shift()
  }
  if (lost) return false
  const at = s.t + (L.latencyMs + L.jitterMs * jit) / 1000
  const item = { at, order: s.order++, msg }
  if (dir === 'up') s.up.push(item as InFlight<UpMsg>)
  else s.down.push(item as InFlight<DownMsg>)
  return true
}

function sendCmd(s: LinkState, seq: number, cmd: Cmd, repeat: boolean) {
  s.stats.sent++
  if (repeat) s.stats.resends++
  const ok = transmit(s, 'up', { kind: 'cmd', seq, cmd, sentAt: s.t, repeat })
  if (!ok) {
    s.stats.lost++
    if (!repeat || s.prot.ack) {
      if (cmd === 'stop') event(s, 'lost-stop', `STOP #${seq} was lost on the radio.`)
      else if (!repeat) event(s, 'lost-cmd', `${CMD_WORD[cmd]} #${seq} was lost.`)
    }
  }
}

/** The operator changes what they are holding. */
export function setControl(s: LinkState, cmd: Cmd) {
  if (s.outcome !== 'running' || cmd === s.control) return
  s.control = cmd
  s.opSeq++
  sendCmd(s, s.opSeq, cmd, false)
  if (s.prot.ack) s.pending = { seq: s.opSeq, cmd, lastSent: s.t }
  s.nextHeartbeat = s.t + HEARTBEAT_EVERY
}

function robotReceive(s: LinkState, m: UpMsg) {
  if (s.prot.ack) transmit(s, 'down', { kind: 'ack', seq: m.seq })
  s.lastHeard = s.t
  if (m.seq < s.robotSeq) {
    if (s.prot.seq) {
      s.stats.staleIgnored++
      if (!m.repeat || m.cmd !== s.robotCmd) event(s, 'stale-ignored', `Old ${CMD_WORD[m.cmd]} #${m.seq} arrived late and was ignored (newest is #${s.robotSeq}).`)
      return
    }
    if (m.cmd !== s.robotCmd) {
      s.stats.staleObeyed++
      event(s, 'stale-obeyed', `Old ${CMD_WORD[m.cmd]} #${m.seq} arrived AFTER #${s.robotSeq} and the robot obeyed it.`)
    }
  } else if (m.seq === s.robotSeq && s.prot.seq) {
    // duplicate of the current command: refresh only
    if (s.watchdogTripped) {
      s.watchdogTripped = false
    }
    return
  }
  s.robotSeq = Math.max(s.robotSeq, m.seq)
  s.robotCmd = m.cmd
  s.watchdogTripped = false
}

function collide(s: LinkState, x: number, y: number): boolean {
  if (x < ROBOT_R || y < ROBOT_R || x > ARENA.w - ROBOT_R || y > ARENA.h - ROBOT_R) return true
  return s.level.walls.some((r) => x > r.x - ROBOT_R && x < r.x + r.w + ROBOT_R && y > r.y - ROBOT_R && y < r.y + r.h + ROBOT_R)
}

/** One fixed step. `dt` defaults to DT. */
export function step(s: LinkState, dt: number = DT) {
  if (s.outcome !== 'running') return
  s.t += dt
  const P = s.prot

  // ── operator: retries and heartbeats ──
  if (P.ack && s.pending && (s.t - s.pending.lastSent) * 1000 >= P.retryMs) {
    s.pending.lastSent = s.t
    sendCmd(s, s.pending.seq, s.pending.cmd, true)
  }
  if (P.watchdog && s.t >= s.nextHeartbeat) {
    s.nextHeartbeat = s.t + HEARTBEAT_EVERY
    // Heartbeat: the current command again. With sequence numbers it carries a new number.
    if (P.seq) {
      s.opSeq++
      if (P.ack && s.pending) s.pending = { seq: s.opSeq, cmd: s.control, lastSent: s.t }
    }
    s.stats.sent++
    const ok = transmit(s, 'up', { kind: 'cmd', seq: s.opSeq, cmd: s.control, sentAt: s.t, repeat: true })
    if (!ok) s.stats.lost++
  }

  // ── deliveries ──
  const due = <M,>(q: InFlight<M>[]): InFlight<M>[] => {
    const out = q.filter((m) => m.at <= s.t).sort((a, b) => a.at - b.at || a.order - b.order)
    if (out.length) {
      const keep = q.filter((m) => m.at > s.t)
      q.length = 0
      q.push(...keep)
    }
    return out
  }
  for (const m of due(s.up)) robotReceive(s, m.msg)
  for (const m of due(s.down)) {
    const d = m.msg
    if (d.kind === 'ack') {
      if (s.pending && d.seq >= s.pending.seq) {
        s.pending = null
        s.stats.acked++
      }
    } else if (!s.seen || d.t > s.seen.t) {
      s.seen = d
      s.seenPath.push({ ...d.pose })
      if (s.seenPath.length > 2000) s.seenPath.shift()
    }
  }

  // ── robot: watchdog ──
  const weak = inWeak(s)
  if (weak && !s.wasInWeak) event(s, 'weak-enter', 'The robot drove into the radio shadow.')
  s.wasInWeak = weak
  if (P.watchdog && !s.watchdogTripped && s.robotCmd !== 'stop' && (s.t - s.lastHeard) * 1000 > P.watchdogMs) {
    s.watchdogTripped = true
    s.stats.watchdogStops++
    const needless = !weak && s.control !== 'stop'
    if (needless) s.stats.needlessStops++
    event(s, 'watchdog', needless ? `Watchdog stop: nothing fresh for ${P.watchdogMs} ms (just a slow patch — a needless stop).` : `Watchdog stop: the link went quiet, so the robot stopped itself.`)
  }
  const cmd: Cmd = s.watchdogTripped ? 'stop' : s.robotCmd

  // ── robot: motion ──
  const vMax = V_MAX * P.speed
  const vT = cmd === 'fwd' ? vMax : cmd === 'back' ? -0.6 * vMax : 0
  const wT = cmd === 'left' ? W_MAX : cmd === 'right' ? -W_MAX : 0
  const ramp = ACCEL * dt
  s.v += Math.max(-ramp, Math.min(ramp, vT - s.v))
  s.w += Math.max(-ramp * 2, Math.min(ramp * 2, wT - s.w))
  s.pose.h += s.w * dt
  const nx = s.pose.x + Math.cos(s.pose.h) * s.v * dt
  const ny = s.pose.y + Math.sin(s.pose.h) * s.v * dt
  if (collide(s, nx, ny)) {
    if (Math.abs(s.v) > 0.2) {
      s.stats.bumps++
      event(s, 'bump', 'Bump! The robot hit a wall.')
    }
    s.v = 0
  } else {
    s.pose.x = nx
    s.pose.y = ny
  }
  const last = s.path[s.path.length - 1]
  if (Math.hypot(last.x - s.pose.x, last.y - s.pose.y) > 0.08 || Math.abs(last.h - s.pose.h) > 0.1) {
    s.path.push({ ...s.pose })
    if (s.path.length > 3000) s.path.shift()
  }

  // ── robot: telemetry ──
  if (s.t >= s.nextTele) {
    s.nextTele = s.t + TELEMETRY_EVERY
    transmit(s, 'down', { kind: 'tele', t: s.t, pose: { ...s.pose }, v: s.v, w: s.w })
  }

  // ── outcome ──
  if (s.level.pits.some((r) => inRect(s.pose.x, s.pose.y, r))) {
    s.outcome = 'fell'
    const lostStop = [...s.events].reverse().find((e) => e.kind === 'lost-stop' || e.kind === 'stale-obeyed')
    s.reason = lostStop
      ? `The robot drove into the pit. ${lostStop.text}`
      : s.level.link.latencyMs >= 500
        ? 'The robot overshot into the pit: by the time you saw it reach the dock, it was already past it.'
        : 'The robot drove into the pit.'
    event(s, 'fell', 'The robot fell into the pit.')
    return
  }
  const d = s.level.dock
  if (Math.hypot(s.pose.x - d.x, s.pose.y - d.y) < d.r - 0.15 && Math.abs(s.v) < 0.05 && Math.abs(s.w) < 0.1) {
    s.settle += dt
    if (s.settle >= SETTLE_S) {
      s.outcome = 'won'
      s.reason = 'Docked and charging!'
      event(s, 'docked', 'Docked safely.')
      return
    }
  } else s.settle = 0
  if (s.t >= s.limit) {
    s.outcome = 'timeout'
    s.reason = 'Mission time is up. The robot did not reach the dock.'
    event(s, 'timeout', 'Out of time.')
  }
}

/** Where the robot probably is now, from the old video and the command the operator holds. */
export function predictedPose(s: LinkState): Pose | null {
  if (!s.seen) return null
  const age = Math.min(3, s.t - s.seen.t + s.level.link.latencyMs / 1000)
  let { x, y, h } = s.seen.pose
  const v = s.seen.v
  const w = s.seen.w
  const n = 12
  for (let i = 0; i < n; i++) {
    h += (w * age) / n
    x += (Math.cos(h) * v * age) / n
    y += (Math.sin(h) * v * age) / n
  }
  return { x, y, h }
}

export interface RunScore {
  stars: 0 | 1 | 2 | 3
  docked: boolean
  protectedRight: boolean
  clean: boolean
}

export function scoreRun(s: LinkState): RunScore {
  const docked = s.outcome === 'won'
  const protectedRight = s.level.required(s.prot)
  const clean = s.stats.needlessStops <= s.level.maxNeedless && s.stats.bumps <= s.level.maxBumps
  const stars = (docked ? 1 + (protectedRight ? 1 : 0) + (protectedRight && clean ? 1 : 0) : 0) as RunScore['stars']
  return { stars, docked, protectedRight, clean }
}

/** The video age the operator sees right now, seconds. */
export function videoAge(s: LinkState): number {
  return s.seen ? s.t - s.seen.t : s.t
}
