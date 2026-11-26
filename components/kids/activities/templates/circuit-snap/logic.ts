// components/kids/activities/templates/circuit-snap/logic.ts
// CIRCUIT SNAP — a small circuit with gaps ("slots"). The child snaps parts
// from a tray into the gaps (and flips LEDs/batteries) until the circuit does
// the job: light this bulb but not that one, run the motor, make both bulbs
// equally bright, keep the LED safe…
//
// Underneath is a REAL circuit solver (modified nodal analysis, the method
// SPICE uses): every node voltage and every branch current is computed, so
// series/parallel, short circuits, LED polarity and brightness all behave
// like the real thing.
//   - Battery: ideal voltage V with a small internal resistance (0.5 Ω), so a
//     wire straight across it draws a huge current → "short circuit".
//   - Bulb/motor/resistor: a resistance. A bulb is lit above 30 % of its rated
//     current; a motor turns above its start current.
//   - LED: conducts only from anode (+) to cathode (−), only once the voltage
//     across it exceeds its forward voltage Vf; damaged above ~30 mA.
//   - Two bulbs in SERIES share the voltage (dimmer); in PARALLEL each gets the
//     full voltage (brighter, more battery current).
//
// Pure logic: no React, no DOM.

import type { CheckResult, TemplateLogic } from '@/lib/kids/activities/types'

/** 'wire' = any conductor (a wire, a metal key, a paperclip); 'insulator' = anything that does not conduct (plastic, rubber, wood). */
export type PartKind = 'battery' | 'bulb' | 'led' | 'resistor' | 'motor' | 'wire' | 'insulator'
export type LedColour = 'red' | 'yellow' | 'green' | 'blue' | 'white'
export const LED_VF: Record<LedColour, number> = { red: 2.0, yellow: 2.1, green: 2.2, blue: 3.1, white: 3.1 }

export interface PartSpec {
  kind: PartKind
  /** battery: volts (1.5–12). */
  volts?: number
  /** resistor (required), bulb (default 15 Ω), motor (default 10 Ω). */
  ohms?: number
  /** led: colour (sets Vf). */
  colour?: LedColour
  /** bulb: rated current in mA (default 200). motor: start current in mA (default 100). */
  ratedMa?: number
  /** Optional name shown on the diagram ("A", "Lamp 2"). */
  label?: string
}

export interface NodeDef {
  id: string
  /** Grid position (columns 0–8, rows 0–5). Lay edges out horizontally/vertically like a schematic. */
  x: number
  y: number
}

/**
 * A branch between two nodes. Either a fixed part, or a SLOT the child fills.
 * Polarity: a battery's + terminal and an LED's anode are at `a` (unless the
 * child flips a placed part).
 */
export interface EdgeDef {
  id: string
  a: string
  b: string
  part?: PartSpec
  slot?: boolean
}

export interface InventoryItem {
  id: string
  part: PartSpec
  /** How many the child may place (1–4). */
  count: number
}

/**
 * What a goal is about — give exactly ONE of:
 *   edge: a FIXED part's edge id (never a slot: the same tray part could sit
 *         in another gap of the same series branch and work just as well);
 *   item: a tray item id (count must be 1) — the goal follows that part into
 *         whichever gap the child put it in. Use this for placed parts.
 */
export interface GoalRef {
  edge?: string
  item?: string
}

export type Goal =
  /** A bulb/LED/motor must be lit/running ('on') or dark/stopped ('off'). */
  | (GoalRef & { want: 'on' | 'off' })
  /** The current through a part (mA, absolute) must fall in a range. Ages 11+. */
  | (GoalRef & { currentMa: { min?: number; max?: number } })
  /** These bulbs/LEDs (fixed edge ids or count-1 tray item ids) must be equally bright (currents within 5 %) and on. */
  | { equal: string[] }

export interface Params {
  nodes: NodeDef[]
  /** 2–14 edges; 1–5 of them slots. */
  edges: EdgeDef[]
  /** 1–5 kinds of part in the tray. Offer tempting wrong ones (a wire that shorts, a too-small resistor). */
  inventory: InventoryItem[]
  /**
   * 1–4 goals. Short circuits (the battery sees less than 1 Ω outside itself)
   * and burnt LEDs always fail, without being listed.
   */
  goals: Goal[]
  /** One-line job shown above the circuit ("Light bulb A but not bulb B"). */
  job: string
  /** Show the live current (mA) on every part. Default on for ages 11+. */
  showMeters?: boolean
  /**
   * Live simulation while building (default true). false = the circuit only
   * powers on when the child presses "Switch on" — predict first (ages 11+).
   */
  liveSim?: boolean
}

export interface Placement {
  /** Inventory item id. */
  item: string
  /** Reverse the part's polarity (LEDs and batteries only). */
  flipped?: boolean
}

export interface Answer {
  /** slot edge id → what was placed (missing/null = left open). */
  placed: Record<string, Placement | null | undefined>
}

export interface EdgeState {
  id: string
  part: PartSpec | null
  /** Current from a to b in mA (negative = b to a). */
  currentMa: number
  /** Voltage a − b. */
  volts: number
  on: boolean
  /** 0..1 for bulbs/LEDs. */
  brightness: number
  burnt: boolean
  flipped: boolean
}

export interface CircuitState {
  edges: EdgeState[]
  short: boolean
  shortEdge?: string
  nodeVolts: Record<string, number>
}

const R_INT = 0.5
/** A battery whose outside path is below this many ohms is short-circuited (a wire or paperclip straight across it). */
const R_SHORT = 1
const R_WIRE = 0.01
const R_LED = 10
const GMIN = 1e-9

export function defaultOhms(p: PartSpec): number {
  if (p.kind === 'resistor') return p.ohms ?? 100
  if (p.kind === 'bulb') return p.ohms ?? 15
  if (p.kind === 'motor') return p.ohms ?? 10
  if (p.kind === 'wire') return R_WIRE
  return 0
}

/** Solve A·x = b in place (Gaussian elimination, partial pivoting). */
function solveLinear(A: number[][], b: number[]): number[] {
  const n = b.length
  for (let c = 0; c < n; c++) {
    let piv = c
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r
    if (piv !== c) {
      ;[A[c], A[piv]] = [A[piv], A[c]]
      ;[b[c], b[piv]] = [b[piv], b[c]]
    }
    const d = A[c][c] || 1e-18
    for (let r = c + 1; r < n; r++) {
      const f = A[r][c] / d
      if (f === 0) continue
      for (let k = c; k < n; k++) A[r][k] -= f * A[c][k]
      b[r] -= f * b[c]
    }
  }
  const x = new Array<number>(n).fill(0)
  for (let r = n - 1; r >= 0; r--) {
    let s = b[r]
    for (let k = r + 1; k < n; k++) s -= A[r][k] * x[k]
    x[r] = s / (A[r][r] || 1e-18)
  }
  return x
}

interface Resolved {
  id: string
  a: string
  b: string
  part: PartSpec | null
  flipped: boolean
}

export function resolveEdges(p: Params, ans: Answer): Resolved[] {
  return p.edges.map((e) => {
    if (!e.slot) return { id: e.id, a: e.a, b: e.b, part: e.part ?? null, flipped: false }
    const pl = ans?.placed?.[e.id]
    const item = pl ? p.inventory.find((i) => i.id === pl.item) : undefined
    const flip = !!pl?.flipped && !!item && (item.part.kind === 'led' || item.part.kind === 'battery')
    return { id: e.id, a: flip ? e.b : e.a, b: flip ? e.a : e.b, part: item?.part ?? null, flipped: flip }
  })
}

/** Full DC solution of the circuit for an answer. */
export function solveCircuit(p: Params, ans: Answer): CircuitState {
  const els = resolveEdges(p, ans)
  const idx = new Map<string, number>()
  p.nodes.forEach((n, i) => idx.set(n.id, i))
  const bat = els.find((e) => e.part?.kind === 'battery')
  const ground = bat ? idx.get(bat.b)! : 0
  const N = p.nodes.length
  const col = (n: number) => (n < ground ? n : n - 1) // matrix index (ground removed)
  const leds = els.filter((e) => e.part?.kind === 'led')
  const ledOn = new Map<string, boolean>(leds.map((e) => [e.id, false]))
  let V: number[] = new Array(N).fill(0)

  const build = () => {
    const M = N - 1
    const A = Array.from({ length: M }, () => new Array<number>(M).fill(0))
    const rhs = new Array<number>(M).fill(0)
    for (let i = 0; i < M; i++) A[i][i] += GMIN
    const stamp = (na: number, nb: number, g: number) => {
      if (na !== ground) A[col(na)][col(na)] += g
      if (nb !== ground) A[col(nb)][col(nb)] += g
      if (na !== ground && nb !== ground) {
        A[col(na)][col(nb)] -= g
        A[col(nb)][col(na)] -= g
      }
    }
    // current source pushing I into node `into` and out of node `from`
    const src = (from: number, into: number, I: number) => {
      if (into !== ground) rhs[col(into)] += I
      if (from !== ground) rhs[col(from)] -= I
    }
    for (const e of els) {
      if (!e.part || e.part.kind === 'insulator') continue
      const na = idx.get(e.a)!
      const nb = idx.get(e.b)!
      const k = e.part.kind
      if (k === 'battery') {
        const v = e.part.volts ?? 3
        stamp(na, nb, 1 / R_INT)
        src(nb, na, v / R_INT) // Norton: pushes current out of + (a)
      } else if (k === 'led') {
        if (!ledOn.get(e.id)) continue
        const vf = LED_VF[e.part.colour ?? 'red']
        stamp(na, nb, 1 / R_LED)
        src(nb, na, vf / R_LED) // V(a→b) = Vf + I·R: like a battery being charged, + at the anode
      } else stamp(na, nb, 1 / defaultOhms(e.part))
    }
    const x = M > 0 ? solveLinear(A, rhs) : []
    const out = new Array<number>(N).fill(0)
    for (let n = 0; n < N; n++) out[n] = n === ground ? 0 : x[col(n)]
    return out
  }

  for (let iter = 0; iter < 30; iter++) {
    V = build()
    let changed = false
    for (const e of leds) {
      const vf = LED_VF[e.part!.colour ?? 'red']
      const dv = V[idx.get(e.a)!] - V[idx.get(e.b)!]
      const on = ledOn.get(e.id)!
      if (!on && dv > vf + 1e-6) {
        ledOn.set(e.id, true)
        changed = true
      } else if (on && (dv - vf) / R_LED < -1e-9) {
        ledOn.set(e.id, false)
        changed = true
      }
    }
    if (!changed) break
  }

  let short = false
  let shortEdge: string | undefined
  const edges: EdgeState[] = els.map((e) => {
    const va = V[idx.get(e.a)!]
    const vb = V[idx.get(e.b)!]
    const dv = va - vb
    let I = 0
    const part = e.part
    if (part && part.kind !== 'insulator') {
      if (part.kind === 'battery') I = ((part.volts ?? 3) - dv) / R_INT // out of + terminal through the battery's own path
      else if (part.kind === 'led') I = ledOn.get(e.id) ? (dv - LED_VF[part.colour ?? 'red']) / R_LED : 0
      else I = dv / defaultOhms(part)
    }
    const mA = I * 1000
    let on = false
    let brightness = 0
    let burnt = false
    if (part?.kind === 'bulb') {
      const rated = part.ratedMa ?? 200
      on = Math.abs(mA) >= 0.3 * rated
      brightness = Math.min(1, Math.pow(Math.abs(mA) / rated, 2))
    } else if (part?.kind === 'led') {
      on = mA >= 1
      brightness = Math.min(1, mA / 20)
      burnt = mA > 30
    } else if (part?.kind === 'motor') {
      on = Math.abs(mA) >= (part.ratedMa ?? 100)
      brightness = Math.min(1, Math.abs(mA) / ((part.ratedMa ?? 100) * 3))
    } else if (part?.kind === 'battery' && Math.abs(I) > (part.volts ?? 3) / (R_INT + R_SHORT)) {
      // Judge the short by the LOAD, not by a current limit: a legal 12 V circuit with two
      // 15 Ω bulbs draws 1.6 A, but its outside resistance is 7.5 Ω — not a short.
      short = true
      shortEdge = e.id
    }
    // Report current in the EDGE's own a→b direction even if flipped.
    const sign = e.flipped ? -1 : 1
    return { id: e.id, part, currentMa: sign * mA, volts: sign * dv, on, brightness, burnt, flipped: e.flipped }
  })
  const nodeVolts: Record<string, number> = {}
  p.nodes.forEach((n, i) => (nodeVolts[n.id] = V[i]))
  return { edges, short, shortEdge, nodeVolts }
}

function usageProblems(p: Params, a: Answer): string | null {
  const used = new Map<string, number>()
  for (const e of p.edges) {
    if (!e.slot) continue
    const pl = a?.placed?.[e.id]
    if (!pl) continue
    const item = p.inventory.find((i) => i.id === pl.item)
    if (!item) return 'Use only parts from the tray.'
    used.set(item.id, (used.get(item.id) ?? 0) + 1)
  }
  for (const [id, n] of used) {
    const item = p.inventory.find((i) => i.id === id)!
    if (n > item.count) return `You only have ${item.count} ${partName(item.part)}${item.count === 1 ? '' : 's'}.`
  }
  return null
}

export function partName(part: PartSpec): string {
  if (part.kind === 'battery') return `${part.volts ?? 3} V battery`
  if (part.kind === 'resistor') return `${part.ohms ?? 100} Ω resistor`
  if (part.kind === 'led') return `${part.colour ?? 'red'} LED`
  return part.label ?? part.kind
}

interface GoalOutcome {
  ok: boolean
  why: string
}

/** The edge a goal reference points at, for this answer (undefined: the item is not placed). */
export function refEdge(p: Params, a: Answer, ref: string): string | undefined {
  const e = p.edges.find((x) => x.id === ref)
  if (e && !e.slot) return e.id
  return p.edges.find((x) => x.slot && a?.placed?.[x.id]?.item === ref)?.id
}

function refName(p: Params, ref: string): string {
  const e = p.edges.find((x) => x.id === ref)
  if (e?.part) return e.part.label ?? `the ${partName(e.part)}`
  const it = p.inventory.find((i) => i.id === ref)
  return it ? (it.part.label ?? `the ${partName(it.part)}`) : `part ${ref}`
}

function goalOutcome(p: Params, a: Answer, s: CircuitState, g: Goal): GoalOutcome {
  const get = (id: string | undefined) => (id ? s.edges.find((e) => e.id === id) : undefined)
  if ('equal' in g) {
    const missing = g.equal.find((r) => !refEdge(p, a, r))
    if (missing) return { ok: false, why: `${refName(p, missing)} is not in the circuit yet` }
    const es = g.equal.map((r) => get(refEdge(p, a, r))).filter((e): e is EdgeState => !!e)
    const cur = es.map((e) => Math.abs(e.currentMa))
    const lo = Math.min(...cur)
    const hi = Math.max(...cur)
    const ok = es.every((e) => e.on) && hi > 0 && (hi - lo) / hi <= 0.05
    return { ok, why: ok ? '' : es.some((e) => !e.on) ? 'not all of them are on' : 'they are not equally bright — one gets more current than the other' }
  }
  const ref = g.item ?? g.edge ?? ''
  const name = refName(p, ref)
  const e = get(refEdge(p, a, ref))
  if (!e) return { ok: 'want' in g && g.want === 'off', why: `${name} is not in the circuit yet — snap it into a gap` }
  if ('want' in g) {
    const ok = g.want === 'on' ? e.on : !e.on
    if (ok) return { ok, why: '' }
    if (g.want === 'on') {
      if (e.part?.kind === 'led' && (e.flipped ? -e.volts : e.volts) < 0) return { ok, why: `${name} is in backwards — an LED only lets current flow from + to −` }
      if (Math.abs(e.currentMa) < 0.5) return { ok, why: `no current reaches ${name}: the loop is not complete (or a wire lets the current go round it)` }
      return { ok, why: `${name} gets only ${Math.round(Math.abs(e.currentMa))} mA — not enough to ${e.part?.kind === 'motor' ? 'turn' : 'glow'}` }
    }
    return { ok, why: `${name} is still ${e.part?.kind === 'motor' ? 'running' : 'lit'} — the job wants it off` }
  }
  const mA = Math.abs(e.currentMa)
  const { min, max } = g.currentMa
  const ok = (min === undefined || mA >= min - 1e-9) && (max === undefined || mA <= max + 1e-9)
  return { ok, why: ok ? '' : `${name} carries ${Math.round(mA)} mA, the job needs ${min ?? 0}–${max ?? '∞'} mA` }
}

export function evaluate(p: Params, a: Answer): { state: CircuitState; outcomes: GoalOutcome[]; burnt: EdgeState | undefined } {
  const state = solveCircuit(p, a)
  return { state, outcomes: p.goals.map((g) => goalOutcome(p, a, state, g)), burnt: state.edges.find((e) => e.burnt) }
}

function works(p: Params, a: Answer): boolean {
  if (usageProblems(p, a)) return false
  const { state, outcomes, burnt } = evaluate(p, a)
  return !state.short && !burnt && outcomes.every((o) => o.ok)
}

/** Exhaustive search over slot fillings (≤ 5 slots × ≤ 5 items). */
export function findSolution(p: Params): Answer | null {
  const slots = p.edges.filter((e) => e.slot).map((e) => e.id)
  const opts: (Placement | null)[] = [null]
  for (const it of p.inventory) {
    opts.push({ item: it.id })
    if (it.part.kind === 'led' || it.part.kind === 'battery') opts.push({ item: it.id, flipped: true })
  }
  const cur: Record<string, Placement | null> = {}
  const rec = (i: number): Answer | null => {
    if (i === slots.length) return works(p, { placed: cur }) ? { placed: { ...cur } } : null
    for (const o of opts) {
      cur[slots[i]] = o
      const r = rec(i + 1)
      if (r) return r
    }
    return null
  }
  return rec(0)
}

function validPart(part: PartSpec | undefined, where: string, out: string[]) {
  if (!part) return out.push(`${where}: part is required`)
  const kinds: PartKind[] = ['battery', 'bulb', 'led', 'resistor', 'motor', 'wire', 'insulator']
  if (!kinds.includes(part.kind)) out.push(`${where}: unknown kind`)
  if (part.kind === 'battery' && !(part.volts !== undefined && part.volts >= 1 && part.volts <= 12)) out.push(`${where}: battery volts 1–12`)
  if (part.kind === 'resistor' && !(part.ohms !== undefined && part.ohms > 0)) out.push(`${where}: resistor needs ohms > 0`)
  if (part.kind === 'led' && part.colour && !LED_VF[part.colour]) out.push(`${where}: unknown LED colour`)
}

function validate(p: Params): string[] {
  const out: string[] = []
  if (!p.job?.trim()) out.push('job text is required')
  const ids = new Set<string>()
  for (const n of p.nodes ?? []) {
    if (ids.has(n.id)) out.push(`duplicate node ${n.id}`)
    ids.add(n.id)
    if (!(n.x >= 0 && n.x <= 8 && n.y >= 0 && n.y <= 5)) out.push(`node ${n.id} is off the 9×6 grid`)
  }
  if (!p.nodes || p.nodes.length < 2 || p.nodes.length > 14) out.push('nodes: 2–14')
  const eids = new Set<string>()
  for (const e of p.edges ?? []) {
    if (eids.has(e.id)) out.push(`duplicate edge ${e.id}`)
    eids.add(e.id)
    if (!ids.has(e.a) || !ids.has(e.b) || e.a === e.b) out.push(`edge ${e.id} must join two different existing nodes`)
    if (e.slot && e.part) out.push(`edge ${e.id} is a slot and a fixed part — pick one`)
    if (!e.slot) validPart(e.part, `edge ${e.id}`, out)
  }
  if (!p.edges || p.edges.length < 2 || p.edges.length > 14) out.push('edges: 2–14')
  const slots = (p.edges ?? []).filter((e) => e.slot)
  if (slots.length < 1 || slots.length > 5) out.push('slots: 1–5')
  if (!p.inventory || p.inventory.length < 1 || p.inventory.length > 5) out.push('inventory: 1–5 items')
  for (const it of p.inventory ?? []) {
    validPart(it.part, `inventory ${it.id}`, out)
    if (!(Number.isInteger(it.count) && it.count >= 1 && it.count <= 4)) out.push(`inventory ${it.id}: count 1–4`)
  }
  const batteries = (p.edges ?? []).filter((e) => e.part?.kind === 'battery').length + (p.inventory ?? []).filter((i) => i.part.kind === 'battery').length
  if (batteries === 0) out.push('the circuit needs a battery (fixed or in the tray)')
  if (!p.goals || p.goals.length < 1 || p.goals.length > 4) out.push('goals: 1–4')
  const canGlow = (k?: PartKind) => k === 'bulb' || k === 'led' || k === 'motor'
  /** Checks one goal reference; returns the part kind it points at. */
  const checkRef = (r: string | undefined, where: string): PartKind | undefined => {
    if (!r) return undefined
    const e = (p.edges ?? []).find((x) => x.id === r)
    const it = (p.inventory ?? []).find((i) => i.id === r)
    if (e && it) out.push(`${where}: "${r}" is both an edge id and a tray item id — rename one`)
    if (e?.slot)
      out.push(`${where}: "${r}" is a slot — a goal on a gap is ambiguous (the same part could sit in another gap of that branch). Point it at the tray part with { item: '…' }`)
    else if (e) return e.part?.kind
    else if (it) {
      if (it.count !== 1) out.push(`${where}: tray item "${r}" has count ${it.count} — goals can only follow a part the tray holds once`)
      return it.part.kind
    } else out.push(`${where}: unknown edge or tray item "${r}"`)
    return undefined
  }
  for (const g of p.goals ?? []) {
    if ('equal' in g) {
      if (!Array.isArray(g.equal) || g.equal.length < 2) out.push('equal goal needs at least 2 parts')
      for (const r of g.equal ?? []) {
        const k = checkRef(r, 'equal goal')
        if (k && k !== 'bulb' && k !== 'led') out.push(`equal goal: "${r}" must be a bulb or LED`)
      }
      continue
    }
    if (!!g.edge === !!g.item) {
      out.push('each on/off or current goal needs exactly one of edge or item')
      continue
    }
    const k = checkRef(g.item ?? g.edge, `goal on ${g.item ?? g.edge}`)
    if ('want' in g && k && !canGlow(k)) out.push(`goal on ${g.item ?? g.edge}: only bulbs, LEDs and motors can be on/off`)
  }
  if (out.length) return out
  if (works(p, { placed: {} })) out.push('the circuit already does the job with every slot empty')
  if (!findSolution(p)) out.push('no way to fill the slots meets every goal (without a short or a burnt LED)')
  return out
}

function check(p: Params, a: Answer): CheckResult {
  const use = usageProblems(p, a)
  if (use) return { correct: false, score: 0, feedback: use }
  const { state, outcomes, burnt } = evaluate(p, a)
  if (state.short)
    return {
      correct: false,
      score: 0.1,
      feedback:
        'Short circuit! The current found a path from + to − with almost no resistance, so the battery pushes a huge current and gets hot. Every path from + back to − needs something that uses the energy (a bulb, LED or resistor).',
    }
  if (burnt)
    return {
      correct: false,
      score: 0.2,
      feedback: `The LED burnt out: ${Math.round(Math.abs(burnt.currentMa))} mA is more than it can take (about 30 mA). Put a resistor in series with it to hold the current back.`,
    }
  const passed = outcomes.filter((o) => o.ok).length
  const fail = outcomes.find((o) => !o.ok)
  if (fail) {
    const ins = state.edges.find((e) => e.part?.kind === 'insulator' && p.edges.find((x) => x.id === e.id)?.slot)
    const extra = ins ? ` ${ins.part?.label ?? 'That part'} is an insulator: electricity cannot flow through it.` : ''
    return { correct: false, score: passed / outcomes.length, feedback: `${passed} of ${outcomes.length} goals met. Not yet: ${fail.why}.${extra}` }
  }
  const lit = state.edges.filter((e) => e.on && e.part && e.part.kind !== 'battery')
  const bat = state.edges.find((e) => e.part?.kind === 'battery')
  return {
    correct: true,
    score: 1,
    feedback: `It works! ${lit.length ? `${lit.length} part${lit.length === 1 ? ' is' : 's are'} powered, ` : ''}and the battery supplies ${Math.round(Math.abs(bat?.currentMa ?? 0))} mA through a complete loop from + back to −.`,
  }
}

export const logic: TemplateLogic<Params, Answer> = {
  id: 'circuit-snap',
  name: 'Circuit snap',
  validate,
  check,
}
