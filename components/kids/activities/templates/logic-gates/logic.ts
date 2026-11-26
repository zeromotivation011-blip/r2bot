// components/kids/activities/templates/logic-gates/logic.ts
// logic-gates — build the decision circuit inside a robot from AND / OR / NOT /
// XOR (and NAND / NOR for older kids) so its output matches a behaviour.
//
// The child sees the robot's inputs (switches/sensors) on the left, gate slots
// in the middle and the output (motor, LED, buzzer…) on the right. They pick a
// gate type for each slot (and, with `wiring: 'choose'`, which signals feed
// each gate), flip the input switches to test it live, and compare against the
// target truth table. check() evaluates EVERY input combination, so a circuit
// that only works for the case the child tried is not accepted.
//
// Difficulty ladder (ages 5 → 17):
//   Explorers  1 input + NOT, or 2 inputs + one slot choosing AND vs OR; wiring
//              fixed; truth table shown with friendly words (ON/OFF).
//   Builders   2 inputs, 1–2 slots, palette AND/OR/NOT; showTable true.
//   Inventors  3 inputs, 2–3 slots, XOR in the palette; showTable 'after-check'.
//   Engineers  3–4 inputs, 3–5 slots, NAND/NOR in the palette, wiring 'choose',
//              several outputs (e.g. a half adder: sum = A XOR B, carry = A AND B),
//              notation '1/0'.
//
// Pure TypeScript: no React, no DOM.

import type { CheckResult, TemplateLogic } from '@/lib/kids/activities/types'

export type GateType = 'AND' | 'OR' | 'NOT' | 'XOR' | 'NAND' | 'NOR'
export const ALL_GATES: GateType[] = ['AND', 'OR', 'NOT', 'XOR', 'NAND', 'NOR']

/** What an input is in the robot's world (drives the icon). */
export type InputKind = 'switch' | 'button' | 'bumper' | 'light' | 'sensor' | 'battery'
/** What an output does (drives the icon + animation). */
export type OutputKind = 'motor' | 'led' | 'buzzer' | 'door' | 'pump'

export interface GateInput {
  /** Short id used in wiring and in target expressions: a single capital letter A–D. */
  id: string
  /** Shown to the child ("Bumper pressed", "Light sensor sees dark"). ≤ 22 chars. */
  label: string
  kind?: InputKind
}

export interface GateSlot {
  /** Unique id, e.g. "g1". */
  id: string
  /**
   * Signals feeding this gate: input ids or ids of EARLIER gates in `gates`.
   * One entry = a 1-input slot (only NOT fits). Two entries = a 2-input slot.
   * With wiring 'choose' these are the starting wires the child can change;
   * the number of entries (1 or 2) still fixes the slot's size.
   */
  inputs: string[]
  /** A fixed gate the child cannot change (gives scaffolding). Omit for a slot the child fills. */
  fixed?: GateType
  /** Drawing column (1 = next to the inputs). Default: worked out from `inputs`. Set it with wiring 'choose'. */
  col?: number
}

export interface GateOutput {
  /** Unique id, e.g. "out" or "sum". */
  id: string
  label: string
  kind?: OutputKind
  /** The gate (or input) that drives this output. */
  from: string
  /**
   * The behaviour the output must have, as a logic expression over input ids:
   * AND, OR, NOT, XOR, NAND, NOR, parentheses, 1, 0 — e.g. "A AND NOT B",
   * "(A OR B) AND C", "A XOR B". check() compares every row of the truth table.
   */
  target: string
}

export interface Params {
  /** 1–4 inputs (2^n truth-table rows). */
  inputs: GateInput[]
  /** 1–6 gates, in signal order (a gate may only read inputs or earlier gates). */
  gates: GateSlot[]
  /** 1–3 outputs. */
  outputs: GateOutput[]
  /** Gate types the child may place (default AND, OR, NOT). */
  palette?: GateType[]
  /** 'fixed' (default): wires are given. 'choose': the child also picks what feeds each gate. */
  wiring?: 'fixed' | 'choose'
  /** Show the target truth table: true (default), false (only the story), or 'after-check'. */
  showTable?: boolean | 'after-check'
  /** 'words' ON/OFF (default for explorers/builders) or 'bits' 1/0. */
  notation?: 'words' | 'bits'
  /** One sentence describing the behaviour in robot terms (≤ 140 chars). Shown above the circuit. */
  story?: string
}

export interface PlacedGate {
  type: GateType | null
  /** Only used with wiring 'choose': the chosen sources, same length as the slot's inputs. */
  inputs?: string[]
}

/** The child's circuit: one entry per non-fixed gate id. */
export interface Answer {
  gates: Record<string, PlacedGate>
}

// ── Target expressions ─────────────────────────────────────────────────────

export type Expr =
  | { k: 'lit'; v: boolean }
  | { k: 'in'; id: string }
  | { k: 'not'; e: Expr }
  | { k: 'bin'; op: Exclude<GateType, 'NOT'>; l: Expr; r: Expr }

/** Parse a target like "(A OR B) AND NOT C". NOT binds tightest, then AND/NAND, then XOR, then OR/NOR. Throws on error. */
export function parseTarget(src: string): Expr {
  const toks = src.toUpperCase().match(/\(|\)|[A-Z]+|[01]/g) ?? []
  if (toks.join('') !== src.toUpperCase().replace(/\s+/g, '')) throw new Error(`unexpected character in "${src}"`)
  let i = 0
  const peek = () => toks[i]
  const level = (ops: string[], next: () => Expr) => (): Expr => {
    let l = next()
    while (peek() && ops.includes(peek())) {
      const op = toks[i++] as Exclude<GateType, 'NOT'>
      l = { k: 'bin', op, l, r: next() }
    }
    return l
  }
  const atom = (): Expr => {
    const t = toks[i++]
    if (t === undefined) throw new Error(`"${src}" ends too early`)
    if (t === 'NOT') return { k: 'not', e: atom() }
    if (t === '(') {
      const e = orL()
      if (toks[i++] !== ')') throw new Error(`missing ")" in "${src}"`)
      return e
    }
    if (t === '1' || t === '0') return { k: 'lit', v: t === '1' }
    if (/^[A-D]$/.test(t)) return { k: 'in', id: t }
    throw new Error(`unexpected "${t}" in "${src}"`)
  }
  const andL = level(['AND', 'NAND'], atom)
  const xorL = level(['XOR'], andL)
  const orL = level(['OR', 'NOR'], xorL)
  const e = orL()
  if (i !== toks.length) throw new Error(`unexpected "${toks[i]}" in "${src}"`)
  return e
}

export function gateFn(t: GateType, a: boolean, b: boolean): boolean {
  switch (t) {
    case 'AND': return a && b
    case 'OR': return a || b
    case 'NOT': return !a
    case 'XOR': return a !== b
    case 'NAND': return !(a && b)
    case 'NOR': return !(a || b)
  }
}

export function evalExpr(e: Expr, env: Record<string, boolean>): boolean {
  switch (e.k) {
    case 'lit': return e.v
    case 'in': return !!env[e.id]
    case 'not': return !evalExpr(e.e, env)
    case 'bin': return gateFn(e.op, evalExpr(e.l, env), evalExpr(e.r, env))
  }
}

export function exprInputs(e: Expr, out = new Set<string>()): Set<string> {
  if (e.k === 'in') out.add(e.id)
  if (e.k === 'not') exprInputs(e.e, out)
  if (e.k === 'bin') { exprInputs(e.l, out); exprInputs(e.r, out) }
  return out
}

// ── Circuit evaluation ────────────────────────────────────────────────────

export interface Resolved {
  id: string
  type: GateType | null
  inputs: string[]
}

/** Merge params + answer into the circuit the child actually built. */
export function resolve(p: Params, a: Answer | undefined): Resolved[] {
  return p.gates.map((g) => {
    if (g.fixed) return { id: g.id, type: g.fixed, inputs: g.inputs }
    const placed = a?.gates?.[g.id]
    const inputs = p.wiring === 'choose' && placed?.inputs && placed.inputs.length === g.inputs.length ? placed.inputs : g.inputs
    return { id: g.id, type: placed?.type ?? null, inputs }
  })
}

/** Rows of the truth table, input A as the most significant bit (A=0,B=0 first). */
export function rows(p: Params): Record<string, boolean>[] {
  const n = p.inputs.length
  return Array.from({ length: 1 << n }, (_, r) => Object.fromEntries(p.inputs.map((inp, k) => [inp.id, ((r >> (n - 1 - k)) & 1) === 1])))
}

/** Every signal's value for one row (inputs + gates). Empty slots and cycles read as null. */
export function simulate(p: Params, circuit: Resolved[], env: Record<string, boolean>): Record<string, boolean | null> {
  const sig: Record<string, boolean | null> = { ...env }
  for (const g of circuit) {
    const vals = g.inputs.map((s) => (s in sig ? sig[s] : null))
    if (!g.type || vals.some((v) => v === null) || (g.type !== 'NOT' && vals.length < 2) || (g.type === 'NOT' && vals.length !== 1)) {
      sig[g.id] = null
      continue
    }
    sig[g.id] = gateFn(g.type, vals[0] as boolean, (vals[1] ?? false) as boolean)
  }
  return sig
}

/** Drawing column of every gate (1-based): `col` when given, else 1 + the deepest source. */
export function layoutCols(p: Params): Record<string, number> {
  const col: Record<string, number> = {}
  p.inputs.forEach((i) => { col[i.id] = 0 })
  p.gates.forEach((g) => { col[g.id] = g.col ?? 1 + Math.max(0, ...g.inputs.map((s) => col[s] ?? 0)) })
  return col
}

export function paletteOf(p: Params): GateType[] {
  return p.palette?.length ? p.palette : ['AND', 'OR', 'NOT']
}

/** Gate types that fit a slot of this size. */
export function fitsSlot(t: GateType, arity: number): boolean {
  return arity === 1 ? t === 'NOT' : t !== 'NOT'
}

/** Sources a gate at index `gi` may read: every input and every earlier gate. */
export function sourcesFor(p: Params, gi: number): string[] {
  return [...p.inputs.map((i) => i.id), ...p.gates.slice(0, gi).map((g) => g.id)]
}

// ── validate ───────────────────────────────────────────────────────────────

const MAX_SEARCH = 400_000

function validate(p: Params): string[] {
  if (!p || typeof p !== 'object') return ['params missing']
  const errs: string[] = []
  if (!Array.isArray(p.inputs) || p.inputs.length < 1 || p.inputs.length > 4) errs.push('inputs must have 1–4 entries')
  if (!Array.isArray(p.gates) || p.gates.length < 1 || p.gates.length > 6) errs.push('gates must have 1–6 entries')
  if (!Array.isArray(p.outputs) || p.outputs.length < 1 || p.outputs.length > 3) errs.push('outputs must have 1–3 entries')
  if (errs.length) return errs
  const ids = new Set<string>()
  const addId = (id: string, where: string) => {
    if (typeof id !== 'string' || !id) errs.push(`${where}: id missing`)
    else if (ids.has(id)) errs.push(`${where}: duplicate id "${id}"`)
    ids.add(id)
  }
  p.inputs.forEach((inp, k) => {
    addId(inp.id, `inputs[${k}]`)
    if (!/^[A-D]$/.test(inp.id)) errs.push(`inputs[${k}].id must be one capital letter A–D`)
    if (!inp.label || inp.label.length > 22) errs.push(`inputs[${k}].label must be 1–22 characters`)
  })
  const pal = paletteOf(p)
  pal.forEach((t) => { if (!ALL_GATES.includes(t)) errs.push(`palette has unknown gate "${String(t)}"`) })
  p.gates.forEach((g, gi) => {
    addId(g.id, `gates[${gi}]`)
    if (!Array.isArray(g.inputs) || g.inputs.length < 1 || g.inputs.length > 2) { errs.push(`gates[${gi}].inputs must have 1 or 2 entries`); return }
    const allowed = sourcesFor(p, gi)
    g.inputs.forEach((s) => { if (!allowed.includes(s)) errs.push(`gates[${gi}] reads "${s}", which is not an input or an earlier gate`) })
    if (g.fixed) {
      if (!ALL_GATES.includes(g.fixed)) errs.push(`gates[${gi}].fixed is not a gate type`)
      else if (!fitsSlot(g.fixed, g.inputs.length)) errs.push(`gates[${gi}]: a ${g.fixed} gate does not fit a ${g.inputs.length}-input slot`)
    } else if (!pal.some((t) => fitsSlot(t, g.inputs.length))) errs.push(`gates[${gi}]: no gate in the palette fits a ${g.inputs.length}-input slot`)
    if (g.col !== undefined && (!Number.isInteger(g.col) || g.col < 1 || g.col > 5)) errs.push(`gates[${gi}].col must be an integer 1–5`)
  })
  if (!p.gates.some((g) => !g.fixed)) errs.push('at least one gate must be a slot the child fills (no `fixed`)')
  const sources = new Set([...p.inputs.map((i) => i.id), ...p.gates.map((g) => g.id)])
  p.outputs.forEach((o, k) => {
    addId(o.id, `outputs[${k}]`)
    if (!o.label || o.label.length > 22) errs.push(`outputs[${k}].label must be 1–22 characters`)
    if (!sources.has(o.from)) errs.push(`outputs[${k}].from "${o.from}" is not an input or gate`)
    try {
      const e = parseTarget(o.target)
      for (const id of exprInputs(e)) if (!p.inputs.some((i) => i.id === id)) errs.push(`outputs[${k}].target uses "${id}", which is not an input`)
    } catch (err) {
      errs.push(`outputs[${k}].target: ${(err as Error).message}`)
    }
  })
  if (p.wiring !== undefined && p.wiring !== 'fixed' && p.wiring !== 'choose') errs.push('wiring must be fixed or choose')
  if (p.showTable !== undefined && p.showTable !== true && p.showTable !== false && p.showTable !== 'after-check') errs.push('showTable must be true, false or "after-check"')
  if (p.notation !== undefined && p.notation !== 'words' && p.notation !== 'bits') errs.push('notation must be words or bits')
  if (p.story !== undefined && (typeof p.story !== 'string' || p.story.length > 140)) errs.push('story must be at most 140 characters')
  if (p.showTable === false && !p.story) errs.push('with showTable false, a story is required (the child needs to know the behaviour)')
  if (errs.length) return errs
  // Every gate must matter: it must feed an output, directly or through other gates.
  const used = new Set<string>(p.outputs.map((o) => o.from))
  for (let gi = p.gates.length - 1; gi >= 0; gi--) if (used.has(p.gates[gi].id)) p.gates[gi].inputs.forEach((s) => used.add(s))
  if (p.wiring !== 'choose') p.gates.forEach((g) => { if (!used.has(g.id)) errs.push(`gate "${g.id}" does not lead to any output`) })
  if (errs.length) return errs
  // Solvable? Search every gate choice (and wiring when it is the child's).
  const found = findSolution(p)
  if (found === 'too-big') errs.push('too many combinations to verify — use fewer slots, a smaller palette or fixed wiring')
  else if (!found) errs.push('no circuit made from this palette and these slots produces the target — the puzzle is impossible')
  return errs
}

/** Brute-force a correct Answer (used by validate; exported for tooling). */
export function findSolution(p: Params): Answer | null | 'too-big' {
  const pal = paletteOf(p)
  const slots = p.gates.map((g, gi) => ({ g, gi })).filter(({ g }) => !g.fixed)
  const choose = p.wiring === 'choose'
  const options = slots.map(({ g, gi }) => {
    const types = pal.filter((t) => fitsSlot(t, g.inputs.length))
    const wirings: string[][] = []
    if (choose) {
      const src = sourcesFor(p, gi)
      if (g.inputs.length === 1) src.forEach((s) => wirings.push([s]))
      else src.forEach((a, i) => src.slice(i).forEach((b) => wirings.push([a, b]))) // [a, a] too: a NAND with tied inputs is NOT
    } else wirings.push(g.inputs)
    return { types, wirings }
  })
  const total = options.reduce((n, o) => n * o.types.length * o.wirings.length, 1)
  if (total > MAX_SEARCH) return 'too-big'
  const idx = options.map(() => ({ t: 0, w: 0 }))
  for (let n = 0; n < total; n++) {
    const answer: Answer = { gates: {} }
    slots.forEach(({ g }, k) => {
      answer.gates[g.id] = { type: options[k].types[idx[k].t], inputs: choose ? options[k].wirings[idx[k].w] : undefined }
    })
    if (compare(p, answer).wrong === 0) return answer
    for (let k = 0; k < idx.length; k++) {
      idx[k].w++
      if (idx[k].w < options[k].wirings.length) break
      idx[k].w = 0
      idx[k].t++
      if (idx[k].t < options[k].types.length) break
      idx[k].t = 0
    }
  }
  return null
}

// ── check ─────────────────────────────────────────────────────────────────

interface Mismatch {
  row: Record<string, boolean>
  output: GateOutput
  got: boolean | null
  want: boolean
}

export function compare(p: Params, a: Answer): { wrong: number; total: number; first: Mismatch | null } {
  const circuit = resolve(p, a)
  const targets = p.outputs.map((o) => parseTarget(o.target))
  let wrong = 0
  let total = 0
  let first: Mismatch | null = null
  for (const row of rows(p)) {
    const sig = simulate(p, circuit, row)
    p.outputs.forEach((o, k) => {
      total++
      const want = evalExpr(targets[k], row)
      const got = sig[o.from] ?? null
      if (got !== want) {
        wrong++
        if (!first) first = { row, output: o, got, want }
      }
    })
  }
  return { wrong, total, first }
}

export function onOff(v: boolean | null, notation: 'words' | 'bits' = 'words'): string {
  if (v === null) return '?'
  return notation === 'bits' ? (v ? '1' : '0') : v ? 'ON' : 'OFF'
}

const GATE_RULE: Record<GateType, string> = {
  AND: 'AND is ON only when BOTH inputs are ON',
  OR: 'OR is ON when AT LEAST ONE input is ON',
  NOT: 'NOT flips its input: ON becomes OFF',
  XOR: 'XOR is ON when the inputs are DIFFERENT',
  NAND: 'NAND is the opposite of AND: OFF only when both inputs are ON',
  NOR: 'NOR is the opposite of OR: ON only when both inputs are OFF',
}
export const gateRule = (t: GateType) => GATE_RULE[t]

function check(p: Params, a: Answer): CheckResult {
  const circuit = resolve(p, a)
  const notation = p.notation ?? 'words'
  const empty = circuit.filter((g) => !g.type)
  if (empty.length) return { correct: false, score: 0, feedback: `${empty.length === 1 ? 'One gate slot is' : `${empty.length} gate slots are`} still empty. Every slot needs a gate before electricity can flow through the circuit.` }
  const pal = paletteOf(p)
  for (const [gi, g] of p.gates.entries()) {
    if (g.fixed) continue
    const r = circuit[gi]
    if (!pal.includes(r.type as GateType) || !fitsSlot(r.type as GateType, g.inputs.length)) return { correct: false, score: 0, feedback: `A ${r.type} gate does not fit that slot. Pick one of the gates in the tray.` }
    if (p.wiring === 'choose') {
      const allowed = sourcesFor(p, gi)
      if (r.inputs.some((s) => !allowed.includes(s))) return { correct: false, score: 0, feedback: 'A gate can only read the inputs or a gate to its left — signals flow one way, from inputs to outputs.' }
    }
  }
  const { wrong, total, first } = compare(p, a)
  const score = (total - wrong) / total
  const rowCount = 1 << p.inputs.length
  const tied = circuit.find((g) => g.inputs.length === 2 && g.inputs[0] === g.inputs[1] && (g.type === 'NAND' || g.type === 'NOR' || g.type === 'AND' || g.type === 'OR'))
  const tiedNote = !tied
    ? ''
    : tied.type === 'NAND' || tied.type === 'NOR'
      ? ` Tying both inputs of a ${tied.type} together turns it into NOT — that trick is the first step in building every other gate from ${tied.type} alone.`
      : ` Tying both inputs of an ${tied.type} together just passes the signal through unchanged.`
  if (!first) {
    const outs = p.outputs.map((o) => o.label).join(' and ')
    return {
      correct: true,
      score: 1,
      feedback: `Every one of the ${rowCount} input combinations gives the right answer, so ${outs} will behave correctly in every situation. Real robot chips are built from millions of gates like these.${tiedNote}`,
    }
  }
  const m: Mismatch = first
  const situation = p.inputs.map((i) => `${i.label} is ${onOff(m.row[i.id], notation)}`).join(', ')
  const sig = simulate(p, circuit, m.row)
  const path = circuit.map((g, k) => `Gate ${k + 1} (${g.type}) gives ${onOff(sig[g.id] ?? null, notation)}`).join(', ')
  const firstGate = circuit.find((g) => g.type)
  const rule = firstGate?.type ? ` Remember: ${gateRule(firstGate.type)}.` : ''
  const hint = ` Follow the signal: ${path}.${circuit.length > 1 ? ' Which gate should give the other answer?' : rule}`
  return {
    correct: false,
    score: score * 0.9,
    feedback: `${total - wrong} of ${total} answers are right. But when ${situation}, your ${m.output.label} is ${onOff(m.got, notation)} and it should be ${onOff(m.want, notation)}.${hint} Tap that row in the table to see it live.`,
  }
}

export const logic: TemplateLogic<Params, Answer> = {
  id: 'logic-gates',
  name: 'Logic gates',
  validate,
  check,
}
