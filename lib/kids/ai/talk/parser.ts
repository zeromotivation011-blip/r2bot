// lib/kids/ai/talk/parser.ts
// TALK TO YOUR ROBOT — the free, on-device language parser.
//
// Turns what a child says ("drive forward, turn left at the wall, then pick up
// the red box") into the shared block program (lib/kids/sim/program.ts) that
// the physics lab runs. No network, no model: a small, honest rule system that
// shows its working, because the point is to learn HOW a robot turns words
// into actions and WHERE words are too vague for a machine:
//
//   words  →  tokens (each word tagged: action, direction, amount, unit, condition…)
//          →  intents (MOVE forward 30 cm, TURN left 90°, UNTIL wall < 20 cm)
//          →  blocks (drive_distance, turn_degrees, repeat_until…)
//
// Where a phrase can mean two different things the parser does not guess
// silently: it asks a clarifying QUESTION ("turn — left or right?") or writes
// down the ASSUMPTION it made ("how far? I guessed a quarter turn, 90°").
// Answers come back in `answers`, keyed by question id, and the same text is
// parsed again.
//
// Pure TypeScript, deterministic: the same words and answers always give the
// same program with the same block ids. Tested by lib/kids/ai/talk/test-parser.ts.

import type { Expr, Program, Stmt } from '../../sim/program'
import { countStmts } from '../../sim/program'
import { stmtText } from './describe'
import { kidSafeSay } from './privacy'

// ── Public shapes ─────────────────────────────────────────────────────────

export type Role = 'action' | 'direction' | 'amount' | 'unit' | 'condition' | 'loop' | 'object' | 'speed' | 'words' | 'filler'

export interface Tok {
  t: string
  role: Role
}

export interface QuestionOption {
  value: string
  label: string
}

export interface Question {
  /** Stable for the same words: "dir|turn". */
  id: string
  ask: string
  /** Why a robot needs to know (said to the child). */
  why: string
  options: QuestionOption[]
}

export interface Step {
  /** The words of this piece, after numbers were turned into digits. */
  words: string
  tokens: Tok[]
  /** "MOVE forward · 30 cm" — what the robot thinks you want. */
  intent: string
  /** Block ids this piece produced (top-level ones; loop bodies are their own steps). */
  stmtIds: string[]
  /** One line per block, in the order they run. */
  blocks: string[]
  notes: string[]
  understood: boolean
  /** Nesting depth (inside a repeat = 1…). */
  depth: number
}

export interface ParseResult {
  program: Program
  steps: Step[]
  /** Questions still waiting for an answer. While any is open the program uses a provisional guess. */
  questions: Question[]
  /** Pieces the parser could not understand at all. */
  unknown: string[]
  /** True when there is a program, nothing unknown and no open question. */
  ok: boolean
  blockCount: number
}

export interface ParseOptions {
  /** Answers to earlier questions, by question id. */
  answers?: Record<string, string>
}

// ── Limits (also the AI route's validation limits) ────────────────────────

export const LIMITS = {
  maxChars: 400,
  cm: 300,
  deg: 720,
  seconds: 30,
  times: 50,
  speedMin: 10,
  speedMax: 100,
  sayChars: 40,
} as const

export const DEFAULT_SPEED = 50
export const TURN_SPEED = 40
/** What "close to the wall" means when the child gives no number. */
export const CLOSE_CM = 20
/**
 * A small thing ahead (a parcel) drops below the distance eyes' beam when it is very close — the
 * sensor's blind spot. So "drive to the box" drives until it is this close, then creeps the rest blind.
 */
export const OBJECT_CLOSE_CM = 35
export const OBJECT_CREEP_CM = 25
export const DEFAULT_CM = 30

const COLORS = ['red', 'green', 'blue', 'yellow', 'black', 'white'] as const
type Color = (typeof COLORS)[number]

// ── Small builders ────────────────────────────────────────────────────────

const N = (v: number): Expr => ({ k: 'number', v })
const sensor = (s: Extract<Expr, { k: 'sensor' }>['s']): Expr => ({ k: 'sensor', s })
const round = (v: number, d = 1) => Math.round(v * 10 ** d) / 10 ** d
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

interface Cond {
  expr: Expr
  /** "the wall is closer than 20 cm" */
  text: string
  notes: string[]
  /** After stopping, creep this many cm without looking (small things vanish under the sensor up close). */
  creepCm?: number
}

interface Unbounded {
  list: Stmt[]
  stmt: Stmt
  stepIdx: number
  speed: number
  dir: 1 | -1
}

class Ctx {
  private n = 0
  steps: Step[] = []
  questions: Question[] = []
  unknown: string[] = []
  answers: Record<string, string>
  /** The last open-ended drive ("drive forward" with no distance), which a later "at the wall" turns into drive-until. */
  unbounded: Unbounded | null = null
  /** Statements of the previous step, for "do it again". */
  lastStepStmts: Stmt[] = []
  /** Where the first piece the parser could not understand would have gone. */
  unknownSlot: { list: Stmt[]; index: number } | null = null

  markUnknown(words: string, list: Stmt[]): void {
    this.unknown.push(words)
    if (!this.unknownSlot) this.unknownSlot = { list, index: list.length }
  }

  constructor(answers: Record<string, string>) {
    this.answers = answers
  }

  id(): string {
    return `w${++this.n}`
  }

  /** Ask once; return the child's answer or the provisional guess. */
  ask(kind: string, words: string, ask: string, why: string, options: QuestionOption[], guess: string): string {
    const id = `${kind}|${words}`
    const a = this.answers[id]
    if (a !== undefined && options.some((o) => o.value === a)) return a
    if (!this.questions.some((q) => q.id === id)) this.questions.push({ id, ask, why, options })
    return guess
  }
}

// ── 1. Normalising: digits for number words, quotes kept safe ─────────────

const UNITS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
}
const TENS: Record<string, number> = { twenty: 20, thirty: 30, forty: 40, fourty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 }

function isNumWord(w: string): boolean {
  return w in UNITS || w in TENS || w === 'hundred'
}

/** "twenty five" → 25, "a hundred and twenty" → 120, "three and a half" → 3.5. */
function wordsToDigits(text: string): string {
  const words = text.split(/\s+/)
  const out: string[] = []
  for (let i = 0; i < words.length; i++) {
    const w = words[i]
    const startsNumber = isNumWord(w) || (w === 'a' && words[i + 1] === 'hundred')
    if (!startsNumber) {
      out.push(w)
      continue
    }
    let total = 0
    let cur = 0
    let j = i
    if (w === 'a') {
      cur = 1
      j++
    }
    for (; j < words.length; j++) {
      const x = words[j]
      if (x in UNITS) cur += UNITS[x]
      else if (x in TENS) cur += TENS[x]
      else if (x === 'hundred') cur = (cur || 1) * 100
      else if (x === 'and' && (words[j + 1] in UNITS || words[j + 1] in TENS) && cur >= 100) continue
      else break
    }
    total += cur
    // "three and a half"
    if (words[j] === 'and' && words[j + 1] === 'a' && words[j + 2] === 'half') {
      total += 0.5
      j += 3
    }
    out.push(String(total))
    i = j - 1
  }
  return out.join(' ')
}

/** Quote placeholders use letters only, so number handling never touches them: 0 → "a", 12 → "bc". */
function qkey(i: number): string {
  return String(i)
    .split('')
    .map((d) => String.fromCharCode(97 + Number(d)))
    .join('')
}
function unkey(k: string): number {
  return Number(
    k
      .split('')
      .map((c) => String(c.charCodeAt(0) - 97))
      .join(''),
  )
}

export interface Normalised {
  text: string
  quotes: string[]
}

export function normalise(input: string): Normalised {
  const quotes: string[] = []
  let s = input.slice(0, LIMITS.maxChars)
  s = s.replace(/[‘’`´]/g, "'").replace(/[“”]/g, '"')
  // Keep what is in quotes exactly (it is what the robot should SAY).
  s = s.replace(/"([^"]{1,80})"/g, (_m, q: string) => {
    quotes.push(q.trim())
    return ` zq${qkey(quotes.length - 1)}zq `
  })
  s = s.replace(/(^|\s)'([^']{1,80})'(?=[\s.,!?;:]|$)/g, (_m, pre: string, q: string) => {
    quotes.push(q.trim())
    return `${pre} zq${qkey(quotes.length - 1)}zq `
  })
  s = s.toLowerCase()
  s = s
    .replace(/°/g, ' degrees ')
    .replace(/%/g, ' percent ')
    .replace(/\bu-?turn\b/g, 'uturn')
    .replace(/\banti-?clockwise\b|\bcounter-?\s?clockwise\b/g, 'anticlockwise')
    .replace(/(\d)\s*(cm|mm|m|s|sec|secs|deg)\b/g, '$1 $2')
    .replace(/(\d)([a-z])/g, '$1 $2')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  s = s
    .replace(/\bhalf a (metre|meter)\b/g, '50 cm')
    .replace(/\bhalf a (second|sec)\b/g, '0.5 seconds')
    .replace(/\ba (metre|meter|second|centimetre|centimeter)\b/g, '1 $1')
    .replace(/\ba (few|couple of)\b/g, '3')
    .replace(/\bonce\b(?! (you|it|the|we|i|robot|there))/g, '1 times')
    .replace(/\btwice\b/g, '2 times')
    .replace(/\bthrice\b/g, '3 times')
  s = wordsToDigits(s)
  s = s.replace(/\b1 times\b/g, '1 time')
  return { text: s, quotes }
}

function restoreQuotes(s: string, quotes: string[]): string {
  return s.replace(/zq([a-j]+)zq/g, (_m, k: string) => quotes[unkey(k)] ?? '')
}

// ── 2. Tagging words (for the "how I understood you" view) ────────────────

const ROLE_WORDS: [Role, RegExp][] = [
  ['loop', /^(repeat|times?|forever|again|keep|loop|over|until|till|while|whenever)$/],
  ['condition', /^(if|when|at|once|close|near|wall|line|bump|bumped|hit|touch|see|sees|reach|reaches|otherwise|else|seconds?pass|lose|find|away|from)$/],
  ['action', /^(drive|go|move|roll|walk|head|travel|turn|rotate|spin|face|pivot|stop|halt|wait|pause|say|shout|beep|honk|pick|grab|grip|take|collect|lift|drop|release|open|close|put|place|draw|pen|light|lights|follow|dance|reverse|back|backwards?|forwards?|ahead|straight|zoom|creep|race|advance|park|wiggle|celebrate|switch)$/],
  ['direction', /^(left|right|clockwise|anticlockwise|around|uturn|forward|forwards|backward|backwards|up|down|on|off)$/],
  ['unit', /^(cm|centimetres?|centimeters?|mm|m|metres?|meters?|inch|inches|in|ft|feet|foot|seconds?|secs?|s|minutes?|degrees?|deg|percent|steps?|squares?|tiles?)$/],
  ['speed', /^(fast|faster|quickly|quick|slow|slowly|slower|carefully|gently|speed|full)$/],
  ['object', /^(box|ball|cube|block|thing|object|red|green|blue|yellow|black|white|square|triangle|circle|star|hexagon|pentagon|octagon|rectangle|claw|gripper|lamp|headlight)$/],
]

export function tagWords(words: string): Tok[] {
  return words
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => {
      if (/^-?\d+(\.\d+)?$/.test(t)) return { t, role: 'amount' as Role }
      if (/^zq[a-j]+zq$/.test(t)) return { t, role: 'words' as Role }
      for (const [role, re] of ROLE_WORDS) if (re.test(t)) return { t, role }
      return { t, role: 'filler' as Role }
    })
}

// ── 3. Conditions ("until the wall is close", "when you see red") ─────────

function toCm(v: number, unit: string): number {
  if (/^(mm|millimet)/.test(unit)) return v / 10
  if (/^(m|met)/.test(unit) && !/^mm/.test(unit)) return v * 100
  if (/^(in|inch)/.test(unit)) return v * 2.54
  if (/^(ft|feet|foot)/.test(unit)) return v * 30.48
  return v
}

const DIST_UNIT = '(cm|centimet(?:re|er)s?|mm|millimet(?:re|er)s?|metres?|meters?|m|inch(?:es)?|in|ft|feet|foot)'
const OBJECT_RE = /\b(box|boxes|ball|balls|cube|cubes|block|blocks|parcel|toy|thing|object|crate)\b/
const WALL_RE = /\b(wall|walls|obstacle|something|anything|end|fence|barrier|edge|way)\b/

export function parseCond(raw: string): Cond | null {
  let s = raw
    .replace(/^(?:the robot|robot|it|you|we|i)\s+/, '')
    .replace(/\b(?:is|are|gets?|getting|come|comes|be)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!s) return null
  const notes: string[] = []

  // Losing the line.
  if (/\bline\b/.test(s) && /\b(lose|loses|lost|off|no longer|can'?t see|cannot see|don'?t see|no)\b/.test(s)) {
    return { expr: { k: 'not', a: sensor('line_seen') }, text: 'the line is lost', notes }
  }
  // Time: "until 5 seconds pass".
  let m = /(\d+(?:\.\d+)?)\s*(seconds?|secs?|s)\b/.exec(s)
  if (m && !/\b(from|away|before)\b/.test(s)) {
    const v = clamp(Number(m[1]), 0, LIMITS.seconds)
    return { expr: { k: 'compare', op: '>', a: sensor('timer_s'), b: N(v) }, text: `the timer passes ${v} s`, notes }
  }
  // Touch: "until you bump into something".
  if (/\b(bump|bumps|bumped|bumping|hit|hits|touch|touches|crash|crashes|knock|knocks|press|presses)\b/.test(s)) {
    return { expr: sensor('bumped'), text: 'the bumper is pressed', notes }
  }
  // Exact distance: "20 cm from the wall", "until the wall is 10 cm away".
  m = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${DIST_UNIT}?\\s*(?:away|from|before|of|to|in front)`).exec(s) ?? new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${DIST_UNIT}\\b`).exec(s)
  if (m && (WALL_RE.test(s) || OBJECT_RE.test(s) || /\b(away|close|near|from)\b/.test(s))) {
    const cm = clamp(round(toCm(Number(m[1]), m[2] ?? 'cm')), 2, 200)
    if (!m[2]) notes.push(`You said ${m[1]} without a unit, so I used centimetres.`)
    return { expr: { k: 'compare', op: '<', a: sensor('distance_cm'), b: N(cm) }, text: `something is closer than ${cm} cm`, notes }
  }
  const color = COLORS.find((c) => new RegExp(`\\b${c}\\b`).test(s))
  // A coloured THING ahead (the red box) is seen by the distance eyes, not the floor sensor.
  if (OBJECT_RE.test(s)) {
    if (color) notes.push(`Your distance eyes can’t see colours — they only feel how far the nearest thing is. I read “the ${color} …” as “something right in front”.`)
    notes.push(`Up close, a small thing drops below the distance eyes’ beam (a blind spot). So the robot drives until it is ${OBJECT_CLOSE_CM} cm away, then creeps ${OBJECT_CREEP_CM} cm more without looking.`)
    return { expr: { k: 'compare', op: '<', a: sensor('distance_cm'), b: N(OBJECT_CLOSE_CM) }, text: `the thing ahead is closer than ${OBJECT_CLOSE_CM} cm`, notes, creepCm: OBJECT_CREEP_CM }
  }
  if (color && !/\bline\b/.test(s)) {
    return { expr: { k: 'compare', op: '=', a: sensor('floor_color'), b: { k: 'text', v: color } }, text: `the floor is ${color}`, notes }
  }
  if (/\bline\b/.test(s)) return { expr: sensor('line_seen'), text: 'the line is seen', notes }
  if (WALL_RE.test(s) || /\b(close|near|nearby|ahead|in front|blocked|closer)\b/.test(s)) {
    const cm = /\b(very|really|super) (close|near)\b/.test(s) ? 10 : CLOSE_CM
    notes.push(`“Close” is not a number, and robots need numbers. I used ${cm} cm. Say “until the wall is 10 cm away” to change it.`)
    return { expr: { k: 'compare', op: '<', a: sensor('distance_cm'), b: N(cm) }, text: `the wall is closer than ${cm} cm`, notes }
  }
  return null
}

/** "at the wall", "when you reach the red mat", "once you see the line" — anywhere in a clause. */
function extractPrefixCond(clause: string): { cond: Cond; rest: string; word: string; words: string } | null {
  const pats: RegExp[] = [
    /\b(?:when(?:ever)?|once|as soon as|after)\s+(?:you|it|the robot|we)\s+(?:get|gets|reach|reaches|come|comes|arrive|arrives|see|sees|find|finds|hit|hits|touch|touches|bump|bumps|are|is)\b(?:\s+(?:to|at|near|into|on))?\s+(.+?)(?=\s*$|\s+(?:turn|drive|go|move|stop|say|beep|pick|grab|drop|put|open|close|wait|reverse|back)\b)/,
    /\bwhen\s+(?:the\s+)?(.+?)\s+(?:is|gets|are)\s+(close|near|closer|ahead|in front)\b/,
    /\b(?:at|by|on)\s+(?:the\s+)?((?:wall|end|line|edge|fence|barrier|(?:red|green|blue|yellow|black|white)(?:\s+(?:square|spot|tile|mat|zone|area|patch|floor|bit|part|stripe|line))?))\b/,
  ]
  for (const re of pats) {
    const m = re.exec(clause)
    if (!m) continue
    const target = m[2] ? `${m[1]} ${m[2]}` : m[1]
    const cond = parseCond(/\b(see|sees)\b/.test(m[0]) && /\b(wall|something|obstacle)\b/.test(target) ? `${target} close` : target)
    if (!cond) continue
    const rest = (clause.slice(0, m.index) + ' ' + clause.slice(m.index + m[0].length)).replace(/\s+/g, ' ').replace(/^[,\s]+|[,\s]+$/g, '')
    return { cond, rest, word: m[0].split(' ')[0], words: m[0].trim() }
  }
  return null
}

// ── 4. Clause patterns ────────────────────────────────────────────────────

const FILLER_START =
  /^(?:please|pls|now|first(?: of all)?|firstly|then|and|also|next|finally|lastly|ok(?:ay)?|so|hey|hi|robot|r2|spark|you|i want you to|i want it to|i'd like you to|can you|could you|go ahead and|the robot (?:should|will|must|has to)|it should|you should|you need to|you have to|let'?s|start by|start with|begin by|after that|to|just|quickly go and)\b[\s,:]*/
const FILLER_END = /[\s,]*\b(please|pls|thanks|thank you|ok|okay|now)$/

export function stripFillers(s: string): string {
  let prev = ''
  let out = s.trim()
  while (prev !== out) {
    prev = out
    out = out.replace(FILLER_START, '').replace(FILLER_END, '').trim()
  }
  return out
}

const ACTION_START =
  /\b(turn|rotate|spin|pivot|face|drive|go|move|roll|walk|head|travel|forward|forwards|back|backwards|backward|reverse|stop|halt|say|shout|beep|honk|pick|grab|grip|take|collect|drop|release|put|place|open|close|wait|pause|draw|pen|light|lights|switch|follow|dance|zoom|creep|race|advance|park)\b/

type Dir = 'left' | 'right'

function readDir(s: string): Dir | null {
  if (/\b(left|anticlockwise)\b/.test(s)) return 'left'
  if (/\b(right|clockwise)\b/.test(s)) return 'right'
  return null
}

function readSpeed(s: string): { speed: number | null; rest: string; word: string | null } {
  let m = /(?:at\s+)?(\d+(?:\.\d+)?)\s*percent(?:\s+(?:speed|power))?/.exec(s) ?? /\b(?:at\s+)?(?:speed|power)\s+(?:of\s+)?(\d+(?:\.\d+)?)/.exec(s)
  if (m) return { speed: clamp(Number(m[1]), LIMITS.speedMin, LIMITS.speedMax), rest: s.replace(m[0], ' '), word: `${m[1]}%` }
  m = /\b(really fast|very fast|super fast|full speed|top speed|as fast as you can|fast|faster|quickly|quick|zoom|race)\b/.exec(s)
  if (m) return { speed: 80, rest: s.replace(/\b(really|very|super)\s+fast\b|\b(full|top) speed\b|\bas fast as you can\b|\b(fast|faster|quickly|quick)\b/, ' '), word: m[1] }
  m = /\b(really slowly|very slowly|super slowly|slowly|slow|slower|carefully|gently|creep)\b/.exec(s)
  if (m) return { speed: 30, rest: s.replace(/\b(really|very|super)\s+slowly\b|\b(slowly|slow|slower|carefully|gently)\b/, ' '), word: m[1] }
  return { speed: null, rest: s, word: null }
}

interface Emitted {
  stmts: Stmt[]
  intent: string
  notes: string[]
  /** An open-ended drive ("drive forward" with no amount). */
  unbounded?: { speed: number; dir: 1 | -1 }
}

/** Drive until a condition, then stop. Real robots do it this way: motors on, check the sensor every tick, motors off. */
function driveUntil(ctx: Ctx, cond: Cond, speed: number, dir: 1 | -1): Stmt[] {
  const sp = speed * dir
  const out: Stmt[] = [
    { op: 'set_motors', id: ctx.id(), leftPct: N(sp), rightPct: N(sp) },
    { op: 'repeat_until', id: ctx.id(), cond: cond.expr, body: [] },
    { op: 'stop', id: ctx.id() },
  ]
  if (cond.creepCm && dir === 1) out.push({ op: 'drive_distance', id: ctx.id(), cm: N(cond.creepCm), speedPct: N(30) })
  return out
}

function parseMove(ctx: Ctx, clause: string, until: Cond | null): Emitted | null {
  if (!/\b(drive|drives|driving|go|goes|going|move|moves|moving|roll|rolls|rolling|walk|walks|walking|head|heads|travel|forwards?|ahead|straight|backwards?|back|reverse|reversing|advance|zoom|creep|race|run|step forward|keep going|carry on|continue)\b/.test(clause)) return null
  const notes: string[] = []
  let back = /\b(backwards?|reverse|reversing|back up|backing up)\b/.test(clause)
  if (!back && /\bback\b/.test(clause)) {
    const a = ctx.ask(
      'back',
      clause,
      '“Back” — reverse, or go back the way you came?',
      'In English “back” means two things. Reversing spins the wheels backwards; going back after a U-turn drives forwards.',
      [
        { value: 'reverse', label: '⏪ Reverse (wheels backwards)' },
        { value: 'forward', label: '⏩ Forwards (I already turned round)' },
      ],
      'reverse',
    )
    back = a === 'reverse'
  }
  const dir: 1 | -1 = back ? -1 : 1
  const { speed: sp0, rest } = readSpeed(clause)
  const speed = sp0 ?? DEFAULT_SPEED
  const way = back ? 'backward' : 'forward'
  const sideways = !/\b(turn|rotate)\b/.test(rest) ? readDir(rest) : null
  const label = sideways ? `TURN ${sideways}, then MOVE ${way}` : `MOVE ${way}`

  // "to the wall", "up to the red mat"
  if (!until) {
    const m = /\b(?:to|towards|toward|up to|right up to|all the way to|till|until you reach|into)\s+(?:the\s+|a\s+)?(.+)$/.exec(rest)
    if (m && !/^\d/.test(m[1])) {
      const c = parseCond(m[1])
      if (c) until = c
    }
  }

  const prefix: Stmt[] = []
  if (sideways) {
    const deg = sideways === 'left' ? 90 : -90
    prefix.push({ op: 'turn_degrees', id: ctx.id(), deg: N(deg), speedPct: N(TURN_SPEED) })
    notes.push(`Robots on wheels can’t slide sideways, so “go ${sideways}” means: turn ${sideways}, then drive.`)
  }

  if (until) {
    notes.push(...until.notes)
    return {
      stmts: [...prefix, ...driveUntil(ctx, until, speed, dir)],
      intent: `${label} · until ${until.text}`,
      notes: [...notes, 'The robot switches its motors on and checks its sensor about 60 times a second until it is true — then stops.'],
    }
  }

  // Time: "for 3 seconds"
  let m = /(?:for\s+)?(\d+(?:\.\d+)?)\s*(seconds?|secs?|s|minutes?|mins?)\b/.exec(rest)
  if (m) {
    let secs = Number(m[1]) * (/^min/.test(m[2]) ? 60 : 1)
    if (secs > LIMITS.seconds) {
      notes.push(`${secs} seconds is longer than this arena allows, so I used ${LIMITS.seconds}.`)
      secs = LIMITS.seconds
    }
    return {
      stmts: [...prefix, { op: 'drive_for', id: ctx.id(), speedPct: N(speed * dir), seconds: N(round(secs, 2)) }],
      intent: `${label} · for ${round(secs, 2)} s at ${speed}%`,
      notes,
    }
  }
  // Distance: "30 cm", "1.5 metres", "3 steps"
  m = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(${DIST_UNIT.slice(1, -1)}|steps?|squares?|tiles?)\\b`).exec(rest)
  let cm: number | null = null
  if (m) {
    if (/^(step|square|tile)/.test(m[2])) {
      cm = Number(m[1]) * 20
      notes.push(`A “${m[2].replace(/s$/, '')}” isn’t a real measurement. I counted each one as 20 cm.`)
    } else cm = toCm(Number(m[1]), m[2])
  } else {
    const bare = /(?:^|\s)(\d+(?:\.\d+)?)(?:\s|$)/.exec(rest)
    if (bare) {
      const v = Number(bare[1])
      const a = ctx.ask(
        'unit',
        clause,
        `“${v}” what? Centimetres or seconds?`,
        'A number on its own is not enough for a robot: it needs to know what to count.',
        [
          { value: 'cm', label: `${v} cm` },
          { value: 's', label: `${v} seconds` },
        ],
        'cm',
      )
      if (a === 's') {
        const secs = clamp(v, 0, LIMITS.seconds)
        return { stmts: [...prefix, { op: 'drive_for', id: ctx.id(), speedPct: N(speed * dir), seconds: N(secs) }], intent: `${label} · for ${secs} s`, notes }
      }
      cm = v
    }
  }
  if (cm !== null) {
    if (cm > LIMITS.cm) {
      notes.push(`${round(cm)} cm is further than this arena is wide, so I used ${LIMITS.cm} cm.`)
      cm = LIMITS.cm
    }
    cm = round(cm)
    return {
      stmts: [...prefix, { op: 'drive_distance', id: ctx.id(), cm: N(cm * dir), speedPct: N(speed) }],
      intent: `${label} · ${cm} cm at ${speed}%`,
      notes,
    }
  }
  return {
    stmts: [...prefix, { op: 'drive_distance', id: ctx.id(), cm: N(DEFAULT_CM * dir), speedPct: N(speed) }],
    intent: `${label} · how far? (guessed ${DEFAULT_CM} cm)`,
    notes: [...notes, `How far? You didn’t say, so I guessed ${DEFAULT_CM} cm. Add a distance (“50 cm”), a time (“for 2 seconds”) or a sensor (“until the wall is close”).`],
    unbounded: prefix.length === 0 ? { speed, dir } : undefined,
  }
}

function parseTurn(ctx: Ctx, clause: string, until: Cond | null): Emitted | null {
  const isTurn = /\b(turn|turns|turning|rotate|rotates|spin|spins|spinning|pivot|face|swing|veer|uturn)\b/.test(clause) || /^(left|right)\b/.test(clause)
  if (!isTurn) return null
  const notes: string[] = []
  const { speed: sp0 } = readSpeed(clause)
  const speed = sp0 ?? TURN_SPEED
  let dir = readDir(clause)
  const around = /\b(around|round|uturn|back)\b/.test(clause) && !/\bspin\b/.test(clause)
  const spin = /\bspin|spins|spinning\b/.test(clause)

  if (!dir && !around && !spin) {
    dir = ctx.ask(
      'dir',
      clause,
      'Turn which way — left or right?',
      '“Turn” has two meanings. A robot can’t read your mind, so it has to ask (or guess).',
      [
        { value: 'left', label: '↺ Left' },
        { value: 'right', label: '↻ Right' },
      ],
      'left',
    ) as Dir
  }
  const d: Dir = dir ?? 'left'

  if (until) {
    const v = speed * 0.75
    notes.push(...until.notes)
    return {
      stmts: [
        { op: 'set_motors', id: ctx.id(), leftPct: N(d === 'left' ? -v : v), rightPct: N(d === 'left' ? v : -v) },
        { op: 'repeat_until', id: ctx.id(), cond: until.expr, body: [] },
        { op: 'stop', id: ctx.id() },
      ],
      intent: `TURN ${d} · until ${until.text}`,
      notes: [...notes, 'One wheel forward and one backward spins the robot on the spot while it keeps checking its sensor.'],
    }
  }

  let deg: number | null = null
  let m = /(-?\d+(?:\.\d+)?)\s*(?:degrees?|degs?|deg)\b/.exec(clause)
  if (m) deg = Number(m[1])
  else if (/\b(quarter|right angle|90)\b/.test(clause)) deg = 90
  else if (/\b(half turn|half way round|halfway round|half a turn|uturn)\b/.test(clause) || around) deg = 180
  else if (/\b(full|whole|all the way|360|complete)\b/.test(clause) || spin) deg = /\b(\d+(?:\.\d+)?)\s*(?:full|whole|complete)?\s*(?:turns|spins|circles)\b/.test(clause) ? null : 360
  if (deg === null) {
    m = /(\d+(?:\.\d+)?)\s*(?:full|whole|complete)?\s*(?:turns|spins|circles)\b/.exec(clause)
    if (m) deg = Number(m[1]) * 360
  }
  if (deg === null && /\b(a bit|a little|slightly|a tiny bit|a little bit|bit)\b/.test(clause)) {
    const a = ctx.ask(
      'howfar',
      clause,
      '“A bit” — how much is a bit?',
      'People understand “a bit” from the situation. A robot needs an exact angle.',
      [
        { value: '15', label: '15° (a nudge)' },
        { value: '30', label: '30°' },
        { value: '45', label: '45° (half a corner)' },
      ],
      '30',
    )
    deg = Number(a)
  }
  if (deg === null) {
    m = /(?:^|\s)(\d+(?:\.\d+)?)(?:\s|$)/.exec(clause.replace(/\b\d+\s*times?\b/, ' '))
    if (m) {
      const v = Number(m[1])
      if (v >= 10) {
        deg = v
        notes.push(`You said ${v} without “degrees”. I used ${v}°.`)
      } else {
        const a = ctx.ask(
          'turnunit',
          clause,
          `Turn ${v} what?`,
          'Without a unit the number could mean tiny degrees or whole quarter turns.',
          [
            { value: 'quarter', label: `${v} quarter turn${v === 1 ? '' : 's'} (${v * 90}°)` },
            { value: 'deg', label: `${v}° (tiny)` },
          ],
          'quarter',
        )
        deg = a === 'quarter' ? v * 90 : v
      }
    }
  }
  if (deg === null) {
    deg = 90
    notes.push('How far? You didn’t say, so I guessed a quarter turn (90°) — a corner. Say “turn left 45 degrees” to change it.')
  }
  if (Math.abs(deg) > LIMITS.deg) {
    notes.push(`I kept the turn to ${LIMITS.deg}° (two full spins).`)
    deg = Math.sign(deg) * LIMITS.deg
  }
  deg = round(deg)
  if (around && !dir) notes.push('For a U-turn either way works. I turned left.')
  if (speed >= 70) notes.push('Fast turns overshoot: the robot’s momentum carries it past the angle. Slower is more exact.')
  const signed = d === 'left' ? deg : -deg
  return {
    stmts: [{ op: 'turn_degrees', id: ctx.id(), deg: N(signed), speedPct: N(speed) }],
    intent: `TURN ${d} · ${Math.abs(deg)}°`,
    notes,
  }
}

const SHAPES: Record<string, { sides: number; turn: number; name: string }> = {
  triangle: { sides: 3, turn: 120, name: 'triangle' },
  square: { sides: 4, turn: 90, name: 'square' },
  pentagon: { sides: 5, turn: 72, name: 'pentagon' },
  hexagon: { sides: 6, turn: 60, name: 'hexagon' },
  octagon: { sides: 8, turn: 45, name: 'octagon' },
  star: { sides: 5, turn: 144, name: 'star' },
}

function parseDraw(ctx: Ctx, clause: string): Emitted | null {
  if (/\b(pen|marker)\s+down\b|\b(put|lower|drop)\s+(?:the\s+)?(pen|marker)\s+down\b|\bstart drawing\b|\blower (?:the )?pen\b/.test(clause))
    return { stmts: [{ op: 'pen_down', id: ctx.id() }], intent: 'PEN down', notes: [] }
  if (/\b(pen|marker)\s+up\b|\b(lift|raise)\s+(?:the\s+)?(pen|marker)\b|\bstop drawing\b/.test(clause))
    return { stmts: [{ op: 'pen_up', id: ctx.id() }], intent: 'PEN up', notes: [] }
  const m = /\bdraw\b(?:\s+(?:a|an|me a|me an))?\s*(?:big|small|little|nice)?\s*(square|triangle|pentagon|hexagon|octagon|star|circle|line|rectangle)\b(.*)$/.exec(clause)
  if (!m) return null
  const shape = m[1]
  const tail = m[2] ?? ''
  const notes: string[] = []
  const size = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${DIST_UNIT}?`).exec(tail)
  let side = size ? toCm(Number(size[1]), size[2] ?? 'cm') : shape === 'line' ? 50 : shape === 'circle' ? 40 : 30
  side = clamp(round(side), 5, 150)
  if (!size) notes.push(`How big? I guessed ${side} cm${shape === 'circle' ? ' across' : shape === 'line' ? '' : ' per side'}.`)
  const turnDir = readDir(tail) === 'right' ? -1 : 1
  const stmts: Stmt[] = [{ op: 'pen_down', id: ctx.id() }]
  if (shape === 'line') {
    stmts.push({ op: 'drive_distance', id: ctx.id(), cm: N(side), speedPct: N(DEFAULT_SPEED) })
  } else if (shape === 'circle') {
    // A circle is a polygon with many tiny sides: 36 steps of 10° each.
    const step = round((Math.PI * side) / 36, 1)
    stmts.push({
      op: 'repeat',
      id: ctx.id(),
      times: N(36),
      body: [
        { op: 'drive_distance', id: ctx.id(), cm: N(step), speedPct: N(30) },
        { op: 'turn_degrees', id: ctx.id(), deg: N(10 * turnDir), speedPct: N(30) },
      ],
    })
    notes.push('A robot can’t draw a perfect circle in one go — it draws 36 tiny lines, turning 10° each time (36 × 10° = 360°).')
  } else if (shape === 'rectangle') {
    const short = round(side / 2)
    stmts.push({
      op: 'repeat',
      id: ctx.id(),
      times: N(2),
      body: [
        { op: 'drive_distance', id: ctx.id(), cm: N(side), speedPct: N(DEFAULT_SPEED) },
        { op: 'turn_degrees', id: ctx.id(), deg: N(90 * turnDir), speedPct: N(TURN_SPEED) },
        { op: 'drive_distance', id: ctx.id(), cm: N(short), speedPct: N(DEFAULT_SPEED) },
        { op: 'turn_degrees', id: ctx.id(), deg: N(90 * turnDir), speedPct: N(TURN_SPEED) },
      ],
    })
    notes.push(`A rectangle has two lengths. I used ${side} cm and ${short} cm.`)
  } else {
    const sh = SHAPES[shape]
    stmts.push({
      op: 'repeat',
      id: ctx.id(),
      times: N(sh.sides),
      body: [
        { op: 'drive_distance', id: ctx.id(), cm: N(side), speedPct: N(DEFAULT_SPEED) },
        { op: 'turn_degrees', id: ctx.id(), deg: N(sh.turn * turnDir), speedPct: N(TURN_SPEED) },
      ],
    })
    notes.push(
      shape === 'star'
        ? 'A star is 5 lines with a sharp 144° turn after each (5 × 144° = 720°, two full turns).'
        : `A ${sh.name} has ${sh.sides} sides. The robot turns ${sh.turn}° at each corner, because ${sh.sides} × ${sh.turn}° = 360°.`,
    )
  }
  stmts.push({ op: 'pen_up', id: ctx.id() })
  return { stmts, intent: `DRAW ${shape} · ${side} cm`, notes: [...notes, 'Drawing needs a Drawing Pen on your robot.'] }
}

function parseSimple(ctx: Ctx, clause: string, quotes: string[]): Emitted | null {
  // Say — first, because what is said can contain any word ("say turn left!").
  let m = /^(?:say|says|shout|yell|whisper|announce|sing|tell (?:me|us|everyone|everybody))\b\s*(?:that\s+|out\s+)?(.*)$/.exec(clause)
  if (m) {
    let text = restoreQuotes(m[1], quotes).replace(/\s+/g, ' ').trim()
    if (!text) text = 'Hello!'
    if (text.length > LIMITS.sayChars) text = text.slice(0, LIMITS.sayChars).trim()
    const safe = kidSafeSay(text)
    text = safe.text
    return {
      stmts: [{ op: 'say', id: ctx.id(), text: { k: 'text', v: text } }],
      intent: `SAY “${text}”`,
      notes: safe.masked ? ['R2BOT robots only say kind words, so I hid one. Try something friendly!'] : [],
    }
  }
  // Lights before turns: "turn ON the light" is not a turn.
  m = /\b(?:turn|switch|put|flick)\s+(on|off)\s+(?:the\s+|your\s+)?(?:head\s*)?(?:lights?|lamp|torch|headlights?)\b|\b(?:turn|switch|put)\s+(?:the\s+|your\s+)?(?:head\s*)?(?:lights?|lamp|torch|headlights?)\s+(on|off)\b|\b(?:lights?|lamp|torch|headlights?)\s+(on|off)\b/.exec(clause)
  if (m) {
    const on = (m[1] ?? m[2] ?? m[3]) === 'on'
    return { stmts: [{ op: on ? 'light_on' : 'light_off', id: ctx.id() }], intent: `LIGHT ${on ? 'on' : 'off'}`, notes: [] }
  }
  if (/\b(shine|light up)\b/.test(clause)) return { stmts: [{ op: 'light_on', id: ctx.id() }], intent: 'LIGHT on', notes: [] }
  // Claw
  if (/\b(put|set)\b.*\bdown\b|\b(drop|drops|release|releases|let go|let it go|open (?:the |your )?(?:claw|gripper|hand|scoop)|place|deliver|tip out|unload)\b/.test(clause))
    return { stmts: [{ op: 'grip_open', id: ctx.id() }], intent: 'CLAW open (let go)', notes: [] }
  if (/\b(pick|picks)\b.*\bup\b|\b(grab|grabs|grip|grips|take|takes|collect|collects|catch|hold|lift|scoop|close (?:the |your )?(?:claw|gripper|hand))\b/.test(clause)) {
    const notes: string[] = []
    const obj = /\b(?:the|a|an|that)\s+((?:red|green|blue|yellow|black|white|big|small|little)\s+)?(box|ball|cube|block|parcel|toy|thing|crate)\b/.exec(clause)
    if (obj) notes.push(`Your claw grabs whatever is right in front of it — it can’t go and find “${obj[0].replace(/^(the|a|an|that)\s+/, 'the ')}” by itself. Drive up to it first.`)
    return { stmts: [{ op: 'grip_close', id: ctx.id() }], intent: 'CLAW close (grab)', notes }
  }
  if (/\b(beep|beeps|honk|honks|buzz|toot|bleep|ring|ding|horn)\b/.test(clause)) return { stmts: [{ op: 'beep', id: ctx.id() }], intent: 'BEEP', notes: [] }
  // Dance — a made-up routine, said so.
  if (/\b(dance|wiggle|celebrate|party|happy dance)\b/.test(clause)) {
    return {
      stmts: [
        {
          op: 'repeat',
          id: ctx.id(),
          times: N(2),
          body: [
            { op: 'turn_degrees', id: ctx.id(), deg: N(45), speedPct: N(60) },
            { op: 'turn_degrees', id: ctx.id(), deg: N(-45), speedPct: N(60) },
          ],
        },
        { op: 'beep', id: ctx.id() },
      ],
      intent: 'DANCE (wiggle twice + beep)',
      notes: ['“Dance” isn’t one robot action, so I made up a little wiggle. Describe your own moves to make it yours!'],
    }
  }
  // Wait
  m = /^(?:wait|pause|hold on|hold still|sleep|stay still|stay|rest|chill)\b(?:\s+for)?\s*(?:(\d+(?:\.\d+)?)\s*(seconds?|secs?|s|minutes?|mins?)?)?/.exec(clause)
  if (m && !/\buntil\b/.test(clause)) {
    const notes: string[] = []
    let secs = m[1] ? Number(m[1]) * (m[2] && /^min/.test(m[2]) ? 60 : 1) : 1
    if (!m[1]) notes.push('How long? I guessed 1 second.')
    else if (!m[2]) notes.push(`You said ${m[1]} without a unit, so I used seconds.`)
    secs = clamp(round(secs, 2), 0, LIMITS.seconds)
    return { stmts: [{ op: 'wait', id: ctx.id(), seconds: N(secs) }], intent: `WAIT ${secs} s`, notes }
  }
  // Stop (optionally "for N seconds")
  m = /^(?:stop|halt|brake|freeze|park)\b(?:.*?(?:for\s+)?(\d+(?:\.\d+)?)\s*(seconds?|secs?|s)\b)?/.exec(clause)
  if (m) {
    const stmts: Stmt[] = [{ op: 'stop', id: ctx.id() }]
    if (m[1]) stmts.push({ op: 'wait', id: ctx.id(), seconds: N(clamp(Number(m[1]), 0, LIMITS.seconds)) })
    return { stmts, intent: m[1] ? `STOP · for ${m[1]} s` : 'STOP', notes: [] }
  }
  return null
}

function parseFollowLine(ctx: Ctx, clause: string, until: Cond | null): Emitted | null {
  if (!/\b(follow|track|ride|stay on)\b.*\bline\b/.test(clause)) return null
  // Proportional steering, the same rule as the physics lab's line challenge.
  const steer = (sign: '+' | '-'): Expr => ({ k: 'math', op: sign, a: N(40), b: { k: 'math', op: '*', a: N(35), b: sensor('line_offset') } })
  const body: Stmt[] = [{ op: 'set_motors', id: ctx.id(), leftPct: steer('+'), rightPct: steer('-') }]
  const notes = ['To follow a line the robot steers MORE the further the line is from its middle: left motor = 40 + 35 × offset, right motor = 40 − 35 × offset. That is proportional control.']
  if (until) {
    return {
      stmts: [{ op: 'repeat_until', id: ctx.id(), cond: until.expr, body }, { op: 'stop', id: ctx.id() }],
      intent: `FOLLOW the line · until ${until.text}`,
      notes: [...until.notes, ...notes, 'Needs a Line Sensor.'],
    }
  }
  return {
    stmts: [{ op: 'forever', id: ctx.id(), body }],
    intent: 'FOLLOW the line · forever',
    notes: [...notes, 'You didn’t say when to stop, so it follows the line forever (the run ends when the robot reaches the goal). Add “until you see green” to make it stop by itself.', 'Needs a Line Sensor.'],
  }
}

// ── 5. Clauses, steps, sentences ──────────────────────────────────────────

function cloneWithIds(ctx: Ctx, list: Stmt[]): Stmt[] {
  return list.map((s) => {
    const c = { ...s, id: ctx.id() } as Stmt
    if ('body' in c) (c as { body: Stmt[] }).body = cloneWithIds(ctx, (s as { body: Stmt[] }).body)
    if (c.op === 'if' && s.op === 'if') {
      c.then = cloneWithIds(ctx, s.then)
      if (s.else) c.else = cloneWithIds(ctx, s.else)
    }
    return c
  })
}

function pushStep(ctx: Ctx, words: string, intent: string, stmts: Stmt[], notes: string[], depth: number, understood = true): number {
  ctx.steps.push({
    words,
    tokens: tagWords(words),
    intent,
    stmtIds: stmts.map((s) => s.id),
    blocks: stmts.map(stmtText),
    notes,
    understood,
    depth,
  })
  return ctx.steps.length - 1
}

/** Make sure the robot drives until `cond` before the next action: reuse an open-ended "drive forward" if there is one. */
/** Returns true when it added a step of its own (false when it reused an earlier open-ended drive). */
function ensureDriveUntil(ctx: Ctx, cond: Cond, list: Stmt[], word: string, depth: number, words: string): boolean {
  const u = ctx.unbounded
  const lastIsUnbounded = u && u.list === list && list[list.length - 1] === u.stmt
  if (u && lastIsUnbounded) {
    const repl = driveUntil(ctx, cond, u.speed, u.dir)
    list.splice(list.length - 1, 1, ...repl)
    const st = ctx.steps[u.stepIdx]
    st.intent = `MOVE ${u.dir === 1 ? 'forward' : 'backward'} · until ${cond.text}`
    st.stmtIds = repl.map((s) => s.id)
    st.blocks = repl.map(stmtText)
    st.notes = [`You said “${word} …” later, so instead of guessing how far, the robot drives until ${cond.text}.`, ...cond.notes]
    ctx.unbounded = null
    return false
  }
  const repl = driveUntil(ctx, cond, DEFAULT_SPEED, 1)
  list.push(...repl)
  pushStep(ctx, words, `MOVE forward · until ${cond.text}`, repl, [`“${word} …” means the robot has to get there first, so I added: drive until ${cond.text}.`, ...cond.notes], depth)
  ctx.unbounded = null
  return true
}

function parseClause(ctx: Ctx, raw: string, quotes: string[], list: Stmt[], depth: number, pendingCond: { cond: Cond; word: string; words?: string } | null): void {
  let clause = stripFillers(raw)
  if (!clause) return
  let words = clause

  // "do it again" / "repeat that": copy the previous step.
  if (/^(?:do (?:it|that|this|the same)(?: thing)? again|again|repeat (?:that|it|this)|same again|one more time)$/.test(clause)) {
    if (ctx.lastStepStmts.length === 0) {
      pushStep(ctx, words, '???', [], ['“Again” — but there is nothing before it to do again.'], depth, false)
      ctx.markUnknown(words, list)
      return
    }
    const copy = cloneWithIds(ctx, ctx.lastStepStmts)
    list.push(...copy)
    pushStep(ctx, words, 'AGAIN · copy the last step', copy, ['Robots have no memory of “that” unless the program has it, so I copied the blocks of the step before.'], depth)
    ctx.lastStepStmts = copy
    ctx.unbounded = null
    return
  }

  // A condition word anywhere in the clause: "turn left at the wall".
  let prefix = pendingCond
  const isSay = /^(?:say|says|shout|yell|whisper|announce|sing|tell)\b/.test(clause)
  if (!prefix && !isSay && !/\b(until|till|while|if)\b/.test(clause)) {
    const p = extractPrefixCond(clause)
    if (p && p.rest && ACTION_START.test(p.rest)) {
      prefix = { cond: p.cond, word: p.word, words: p.words }
      clause = stripFillers(p.rest)
    }
  }

  // "if …" inside a clause: "turn left if the wall is close".
  if (!isSay) {
    const mi = /^(.*?)\s*\bif\b\s+(.+)$/.exec(clause)
    if (mi && mi[1] && ACTION_START.test(mi[1])) {
      const cond = parseCond(mi[2])
      if (cond) {
        if (prefix && ensureDriveUntil(ctx, prefix.cond, list, prefix.word, depth, prefix.words ?? prefix.word)) words = clause
        const then: Stmt[] = []
        const ifStmt: Stmt = { op: 'if', id: ctx.id(), cond: cond.expr, then }
        list.push(ifStmt)
        pushStep(ctx, words, `IF ${cond.text}`, [ifStmt], ['An IF checks the sensor ONCE, right now. To keep checking, put it inside “forever” or “repeat”.', ...cond.notes], depth)
        parseClause(ctx, mi[1], quotes, then, depth + 1, null)
        ctx.lastStepStmts = [ifStmt]
        ctx.unbounded = null
        return
      }
    }
  }

  // "until …" / "while …" for moves, turns, waits and line following.
  let until: Cond | null = null
  if (!isSay) {
    const mu = /\b(until|till|til|untill|while|as long as)\b\s+(.+)$/.exec(clause)
    if (mu) {
      const c = parseCond(mu[2])
      if (c) {
        until = mu[1] === 'while' || mu[1] === 'as long as' ? { expr: { k: 'not', a: c.expr }, text: `NOT (${c.text})`, notes: [...c.notes, '“While” is the opposite of “until”: keep going while it is true = stop when it is not.'] } : c
        clause = clause.slice(0, mu.index).trim()
      }
    }
  }

  if (prefix) {
    const isMove = /^(?:drive|go|move|roll|walk|head|travel|forwards?|ahead|straight)\b/.test(clause) && !/\b(back|backwards?|reverse|left|right)\b/.test(clause)
    if (isMove && !until) {
      // "when you see red, drive" is really "drive until red" — handled as a move with that condition.
      until = prefix.cond
    } else {
      if (ensureDriveUntil(ctx, prefix.cond, list, prefix.word, depth, prefix.words ?? prefix.word)) words = clause
      // "stop at the wall": drive-until already stops.
      if (/^(?:stop|halt|brake|freeze|park)$/.test(clause)) return
    }
  }

  const em: Emitted | null =
    parseSimple(ctx, clause, quotes) ??
    parseDraw(ctx, clause) ??
    parseFollowLine(ctx, clause, until) ??
    parseTurn(ctx, clause, until) ??
    parseMove(ctx, clause, until) ??
    (until && /^(?:wait|keep|stay|do nothing)\b/.test(clause)
      ? { stmts: [{ op: 'repeat_until', id: ctx.id(), cond: until.expr, body: [] }], intent: `WAIT · until ${until.text}`, notes: until.notes }
      : null)

  if (!em) {
    const why = isSay ? '' : suggestFor(clause)
    pushStep(ctx, words, '???', [], [`I don’t know how to do “${restoreQuotes(clause, quotes)}” yet.${why ? ` ${why}` : ''}`], depth, false)
    ctx.markUnknown(restoreQuotes(clause, quotes), list)
    return
  }
  // "drive until the wall is close, then stop": the drive-until already ends with a stop block.
  if (em.stmts.length === 1 && em.stmts[0].op === 'stop' && list[list.length - 1]?.op === 'stop') {
    pushStep(ctx, restoreQuotes(words, quotes), 'STOP (already stopped)', [], ['The step before already ends with a STOP block, so I didn’t add a second one. Robots don’t need telling twice!'], depth)
    ctx.unbounded = null
    return
  }
  if (until && !/until|NOT/.test(em.intent) && em.intent !== '???') em.notes.push(`I couldn’t use “until” with this action, so I ignored it.`)
  list.push(...em.stmts)
  const idx = pushStep(ctx, restoreQuotes(words, quotes), em.intent, em.stmts, em.notes, depth)
  ctx.lastStepStmts = em.stmts
  ctx.unbounded = em.unbounded ? { list, stmt: em.stmts[em.stmts.length - 1], stepIdx: idx, speed: em.unbounded.speed, dir: em.unbounded.dir } : null
}

function suggestFor(clause: string): string {
  if (/\b(fly|jump|swim|climb|teleport|float)\b/.test(clause)) return 'This robot drives on the floor — it can drive, turn, grab, draw, light up, beep and talk.'
  if (/\b(kill|hurt|attack|destroy|smash)\b/.test(clause)) return 'R2BOT robots are helpers. Try a mission instead!'
  if (/\b(find|search|look for|go to)\b/.test(clause)) return 'Robots can’t “find” things by name. Tell it HOW: drive until something is close, or until the floor is a colour.'
  return 'Try words like: drive, turn, until, repeat, pick up, drop, say, beep, light, draw.'
}

/** A step that is only a condition ("at the wall", "when you see red"): it belongs to the next action. */
function condOnly(step: string): { cond: Cond; word: string; words: string } | null {
  const s = stripFillers(step)
  if (!/^(?:at|by|on|when(?:ever)?|once|as soon as|after)\b/.test(s)) return null
  const p = extractPrefixCond(s)
  // Anything left over is an action ("at the wall turn left"), handled as a clause.
  if (!p || p.rest) return null
  return { cond: p.cond, word: p.word, words: s }
}

const STEP_SPLIT = /\s*(?:,|\band then\b|\bthen\b|\bafter that\b|\bafterwards\b|\bafter this\b|\bnext\b|\bfinally\b|\band finally\b|\band lastly\b|\blastly\b|:)\s*/

function parseSteps(ctx: Ctx, text: string, quotes: string[], list: Stmt[], depth: number): void {
  const parts = text.split(STEP_SPLIT).filter((p) => p && p.trim())
  let pending: { cond: Cond; word: string; words?: string } | null = null
  for (const part0 of parts) {
    let part = stripFillers(part0)
    if (!part) continue
    const co = condOnly(part)
    if (co) {
      pending = co
      continue
    }
    // Trailing loops: "drive 20 cm and turn left 4 times", "… forever".
    let times: number | null = null
    let forever = false
    let m = /\s*\b(\d+(?:\.\d+)?)\s+(?:more\s+)?times?$/.exec(part)
    if (m && part.slice(0, m.index).trim()) {
      times = Math.max(1, Math.min(LIMITS.times, Math.round(Number(m[1]))))
      part = part.slice(0, m.index).trim()
    } else {
      m = /\s*\b(forever|over and over(?: again)?|again and again|all the time|non ?stop|for ever)$/.exec(part)
      if (m && part.slice(0, m.index).trim()) {
        forever = true
        part = part.slice(0, m.index).trim()
      }
    }
    const clauses = part.split(/\s+\band\b\s+/).filter(Boolean)
    if (times !== null || forever) {
      const body: Stmt[] = []
      const loop: Stmt = forever ? { op: 'forever', id: ctx.id(), body } : { op: 'repeat', id: ctx.id(), times: N(times ?? 1), body }
      list.push(loop)
      const notes: string[] = []
      if (clauses.length > 1)
        notes.push(`I repeated ALL of “${clauses.join(' and ')}”. If you meant only the last part, say “${clauses.slice(0, -1).join(' and ')}, then ${clauses[clauses.length - 1]} ${forever ? 'forever' : `${times} times`}”.`)
      if (forever) notes.push('“Forever” never ends by itself. The run stops when the robot reaches the goal or time runs out.')
      pushStep(ctx, `${part} ${forever ? 'forever' : `${times} times`}`, forever ? 'REPEAT forever' : `REPEAT ${times}×`, [loop], notes, depth)
      ctx.unbounded = null
      for (const c of clauses) {
        parseClause(ctx, c, quotes, body, depth + 1, pending)
        pending = null
      }
      ctx.lastStepStmts = [loop]
      ctx.unbounded = null
      continue
    }
    for (const c of clauses) {
      parseClause(ctx, c, quotes, list, depth, pending)
      pending = null
    }
  }
  if (pending) {
    // "… until you reach the wall" with nothing after it: just drive there.
    ensureDriveUntil(ctx, pending.cond, list, pending.word, depth, pending.words ?? pending.word)
  }
}

/** Leading loop headers and if/otherwise sentences, then the steps. */
function parseSentence(ctx: Ctx, sentence: string, quotes: string[], list: Stmt[], depth: number): void {
  let s = stripFillers(sentence)
  if (!s) return

  // "repeat 4 times: …", "4 times: …", "do this 3 times …"
  let m = /^(?:repeat|do (?:this|that|it|the following)|loop)?\s*(\d+(?:\.\d+)?)\s+times?\b[\s:,]*(?:do\s+)?(.+)$/.exec(s)
  if (m && /^(repeat|do|loop|\d)/.test(s)) {
    const times = Math.max(1, Math.min(LIMITS.times, Math.round(Number(m[1]))))
    const body: Stmt[] = []
    const loop: Stmt = { op: 'repeat', id: ctx.id(), times: N(times), body }
    list.push(loop)
    pushStep(ctx, `repeat ${times} times`, `REPEAT ${times}×`, [loop], [], depth)
    parseSentence(ctx, m[2], quotes, body, depth + 1)
    ctx.lastStepStmts = [loop]
    ctx.unbounded = null
    return
  }
  // "forever: …", "keep doing this forever: …", "repeat forever …"
  m = /^(?:repeat|keep (?:doing (?:this|that))?|loop|do (?:this|that))?\s*(?:forever|over and over|for ever)\b[\s:,]*(.+)$/.exec(s)
  if (m) {
    const body: Stmt[] = []
    const loop: Stmt = { op: 'forever', id: ctx.id(), body }
    list.push(loop)
    pushStep(ctx, 'forever', 'REPEAT forever', [loop], ['“Forever” never ends by itself. The run stops when the robot reaches the goal or time runs out.'], depth)
    parseSentence(ctx, m[1], quotes, body, depth + 1)
    ctx.lastStepStmts = [loop]
    ctx.unbounded = null
    return
  }
  // "repeat until the wall is close: drive 10 cm"
  m = /^(?:repeat|keep (?:doing (?:this|that)|going)?|loop|do (?:this|that))\s+(?:until|till)\s+(.+?)\s*[:,]\s*(.+)$/.exec(s)
  if (m) {
    const cond = parseCond(m[1])
    if (cond) {
      const body: Stmt[] = []
      const loop: Stmt = { op: 'repeat_until', id: ctx.id(), cond: cond.expr, body }
      list.push(loop)
      pushStep(ctx, `repeat until ${m[1]}`, `REPEAT until ${cond.text}`, [loop], cond.notes, depth)
      parseSentence(ctx, m[2], quotes, body, depth + 1)
      ctx.lastStepStmts = [loop]
      ctx.unbounded = null
      return
    }
  }
  // "repeat: drive and turn" — how many times?
  m = /^(?:repeat|loop)\b[\s:,]+(?!\d|forever|until|that|it|this)(.+)$/.exec(s)
  if (m) {
    const a = ctx.ask(
      'repeat',
      s,
      'Repeat — how many times?',
      'A loop needs to know when to stop: a number of times, a sensor (“until …”), or never (“forever”).',
      [
        { value: '2', label: '2 times' },
        { value: '4', label: '4 times' },
        { value: 'forever', label: 'Forever' },
      ],
      '2',
    )
    const body: Stmt[] = []
    const loop: Stmt = a === 'forever' ? { op: 'forever', id: ctx.id(), body } : { op: 'repeat', id: ctx.id(), times: N(Number(a)), body }
    list.push(loop)
    pushStep(ctx, 'repeat', a === 'forever' ? 'REPEAT forever' : `REPEAT ${a}×`, [loop], [], depth)
    parseSentence(ctx, m[1], quotes, body, depth + 1)
    ctx.lastStepStmts = [loop]
    ctx.unbounded = null
    return
  }
  // "if the wall is close, turn left, otherwise drive forward"
  m = /^(?:if|whenever)\s+(.+)$/.exec(s)
  if (m) {
    const body = m[1]
    let condText: string
    let thenText: string
    let elseText = ''
    const parts = body.split(/\s*,?\s*\b(?:otherwise|else|if not)\b\s*,?\s*/)
    const head = parts[0]
    elseText = parts.slice(1).join(' and ')
    const sep = /\s*(?:,|\bthen\b)\s*/.exec(head)
    if (sep) {
      condText = head.slice(0, sep.index)
      thenText = head.slice(sep.index + sep[0].length)
    } else {
      const a = ACTION_START.exec(head.replace(/\b(close|near|see|sees|reach|reaches|hit|hits|touch|touches|bump|bumps)\b/g, (w) => '_'.repeat(w.length)))
      condText = a ? head.slice(0, a.index) : head
      thenText = a ? head.slice(a.index) : ''
    }
    const cond = parseCond(condText)
    if (cond && thenText) {
      const then: Stmt[] = []
      const els: Stmt[] = []
      const st: Stmt = elseText ? { op: 'if', id: ctx.id(), cond: cond.expr, then, else: els } : { op: 'if', id: ctx.id(), cond: cond.expr, then }
      list.push(st)
      pushStep(
        ctx,
        `if ${condText.trim()}`,
        elseText ? `IF ${cond.text} … OTHERWISE …` : `IF ${cond.text}`,
        [st],
        [
          ...cond.notes,
          depth === 0 ? 'An IF checks the sensor ONCE, right now. To keep checking, start with “forever:” or “repeat until …:”.' : 'Inside a loop, the IF checks the sensor again every time round.',
        ],
        depth,
      )
      parseSteps(ctx, thenText, quotes, then, depth + 1)
      if (elseText) {
        pushStep(ctx, 'otherwise', 'OTHERWISE', [], [], depth)
        parseSteps(ctx, elseText, quotes, els, depth + 1)
      }
      ctx.lastStepStmts = [st]
      ctx.unbounded = null
      return
    }
  }
  parseSteps(ctx, s, quotes, list, depth)
}

// ── 6. The entry point ────────────────────────────────────────────────────

/** Where the first not-understood piece of each parsed program would have gone (kept off the JSON shape). */
const UNKNOWN_SLOTS = new WeakMap<Program, { list: Stmt[]; index: number }>()

/**
 * A copy of `result.program` with `insert` placed where the first piece the parser did not understand
 * was said — how the AI helper's blocks (made from ONLY the not-understood words) join the child's own.
 * Falls back to the end of the program.
 */
export function withBlocksAtUnknown(result: ParseResult, insert: Stmt[]): Program {
  const slot = UNKNOWN_SLOTS.get(result.program)
  let placed = false
  const copyList = (list: Stmt[]): Stmt[] => {
    const out = list.map(copyStmt)
    if (slot && slot.list === list && !placed) {
      out.splice(Math.min(slot.index, out.length), 0, ...insert)
      placed = true
    }
    return out
  }
  const copyStmt = (s: Stmt): Stmt => {
    switch (s.op) {
      case 'repeat':
      case 'repeat_until':
      case 'forever':
        return { ...s, body: copyList(s.body) }
      case 'if':
        return s.else ? { ...s, then: copyList(s.then), else: copyList(s.else) } : { ...s, then: copyList(s.then) }
      default:
        return { ...s }
    }
  }
  const body = copyList(result.program.body)
  return { body: placed ? body : [...body, ...insert] }
}

export function parsePlan(input: string, opts: ParseOptions = {}): ParseResult {
  const ctx = new Ctx(opts.answers ?? {})
  const { text, quotes } = normalise(input)
  const body: Stmt[] = []
  const sentences = text.split(/(?<!\d)\.(?!\d)|[!?;\n]+/).map((x) => x.trim()).filter(Boolean)
  for (const s of sentences) parseSentence(ctx, s, quotes, body, 0)
  const program: Program = { body }
  if (ctx.unknownSlot) UNKNOWN_SLOTS.set(program, ctx.unknownSlot)
  const blockCount = countStmts(body)
  return {
    program,
    steps: ctx.steps,
    questions: ctx.questions,
    unknown: ctx.unknown,
    ok: blockCount > 0 && ctx.unknown.length === 0 && ctx.questions.length === 0,
    blockCount,
  }
}

/** Example phrases for the "try saying…" chips and the tests. */
export const EXAMPLE_PHRASES: string[] = [
  'Drive forward 50 cm, then turn left',
  'Drive until the wall is close, then turn right',
  'Repeat 4 times: drive 30 cm and turn left 90 degrees',
  'Drive to the red mat and beep',
  'Draw a square',
  'Turn on the light, drive for 3 seconds, then say “I can see!”',
]
