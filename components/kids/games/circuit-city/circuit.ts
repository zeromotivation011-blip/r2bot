// components/kids/games/circuit-city/circuit.ts
// Circuit City — the parts catalogue and a real DC circuit solver.
//
// The breadboard is a grid of nodes. Every part sits on one edge between two
// neighbouring nodes (a → b). The solver does nodal analysis: batteries are
// turned into their Norton equivalents (an ideal cell plus internal
// resistance), so every part is a conductance or a conductance + current
// source, and the node voltages come from one linear system G·v = i solved by
// Gaussian elimination with partial pivoting.
//
// Non-linear parts are piecewise-linear and found by iteration:
//   - LEDs: OFF (no current) below the forward voltage Vf; ON above it as
//     Vf in series with a small dynamic resistance. Reverse = OFF.
//   - Comparator switch: closed when the voltage at its sense lead is below /
//     above its threshold, open otherwise.
// We guess a state, solve, check every non-linear part is consistent with the
// answer, flip the ones that are not and solve again until nothing changes.
//
// Pure TypeScript — no DOM. Deterministic.

export const COLS = 8
export const ROWS = 6

export const nodeId = (x: number, y: number): number => y * COLS + x
export const nodeXY = (n: number): { x: number; y: number } => ({ x: n % COLS, y: Math.floor(n / COLS) })

export type PartKind =
  | 'wire'
  | 'battery'
  | 'switch'
  | 'button'
  | 'led'
  | 'lamp'
  | 'resistor'
  | 'motor'
  | 'buzzer'
  | 'ldr'
  | 'comparator'

export type LedColor = 'red' | 'yellow' | 'green' | 'white'

export interface Part {
  id: string
  kind: PartKind
  /** Node index. Battery: + terminal. LED / lamp: anode (long leg). */
  a: number
  /** Node index. Battery: − terminal. LED / lamp: cathode. */
  b: number
  /** Resistor value, or the built-in resistor of a lamp module. */
  ohms?: number
  /** Battery: number of 1.5 V cells. */
  cells?: number
  /** Battery: 0..1 charge left. */
  charge?: number
  /** Switch closed / button held. */
  on?: boolean
  color?: LedColor
  burnt?: boolean
  locked?: boolean
  /** Which city load this part powers (house light, streetlight 2, …). */
  loadId?: string
  /** Comparator: the node its sense lead touches. */
  sense?: number | null
  /** Comparator: switching threshold in volts. */
  threshold?: number
  /** Comparator: close when sense is 'below' or 'above' the threshold. */
  mode?: 'below' | 'above'
}

// ── Physical constants (realistic hobby-electronics values) ──────────────────

export const CELL_V = 1.5
/** Internal resistance of one AA alkaline cell (≈ 0.1–0.2 Ω). */
export const CELL_R = 0.15
export const WIRE_R = 0.01
export const SWITCH_R = 0.01
/** On-resistance of the comparator's electronic switch (a small MOSFET). */
export const COMPARATOR_ON_R = 0.5
/** Supply current of the comparator chip itself (LM393-class). */
export const COMPARATOR_IQ = 0.0003
/** Toy DC motor winding resistance and the current it needs to start turning. */
export const MOTOR_R = 12
export const MOTOR_START_A = 0.15
/** Active piezo buzzer: behaves roughly like 200 Ω and needs ≈ 2 V to sound. */
export const BUZZER_R = 200
export const BUZZER_MIN_V = 2
/** LED: forward voltage by colour, dynamic resistance, ratings. */
export const LED_VF: Record<LedColor, number> = { red: 2.0, yellow: 2.1, green: 2.2, white: 3.0 }
export const LED_RS = 8
export const LED_RATED_A = 0.02
/** Above this for a moment an LED overheats and fails. */
export const LED_BURN_A = 0.035
/** Battery current that counts as a short circuit. */
export const SHORT_A = 2.5
/** Cut-off below which we say "no current". */
export const TINY_A = 0.0002

/** Light-dependent resistor (GL55-class): ≈ 10 kΩ at 10 lux, γ ≈ 0.7. */
export function ldrOhms(lux: number): number {
  return 10000 * Math.pow(Math.max(lux, 0.1) / 10, -0.7)
}

/** Resistor values a child can pick (from the E12 series). */
export const RESISTOR_VALUES = [10, 22, 47, 100, 150, 220, 330, 470, 680, 1000, 2200, 4700, 10000, 22000, 47000, 100000]

export function formatOhms(r: number): string {
  if (r >= 1e6) return `${trim(r / 1e6)} MΩ`
  if (r >= 1000) return `${trim(r / 1000)} kΩ`
  return `${trim(r)} Ω`
}
export function formatAmps(a: number): string {
  const x = Math.abs(a)
  if (x < 0.001) return `${trim(x * 1e6, 0)} µA`
  if (x < 1) return `${trim(x * 1000, 1)} mA`
  return `${trim(x, 2)} A`
}
export function formatVolts(v: number): string {
  return `${v.toFixed(2)} V`
}
export function formatWatts(w: number): string {
  if (w < 1) return `${trim(w * 1000, 1)} mW`
  return `${trim(w, 2)} W`
}
function trim(x: number, d = 2): string {
  return Number(x.toFixed(d)).toString()
}

/** Resistor colour bands (4-band code: digit, digit, multiplier, gold tolerance). */
const BAND = ['#111111', '#7a3f12', '#e11d1d', '#f97316', '#facc15', '#16a34a', '#2563eb', '#7c3aed', '#9ca3af', '#f8fafc']
export function resistorBands(r: number): string[] {
  const exp = Math.floor(Math.log10(r)) - 1
  const two = Math.round(r / Math.pow(10, exp))
  const d1 = Math.floor(two / 10)
  const d2 = two % 10
  const mult = exp >= 0 ? BAND[exp] : '#d4af37'
  return [BAND[d1], BAND[d2], mult, '#d4af37']
}

export function batteryEmf(p: Part): number {
  const cells = p.cells ?? 2
  const c = p.charge ?? 1
  // Alkaline cells sag a little as they empty, then collapse near the end.
  const k = c > 0.08 ? 0.9 + 0.1 * c : (c / 0.08) * 0.9
  return cells * CELL_V * k
}

export function ledVf(p: Part): number {
  return LED_VF[p.color ?? 'red']
}

// ── Solver ──────────────────────────────────────────────────────────────────

export interface Solution {
  hasBattery: boolean
  ground: number
  /** Grid node → volts, relative to the battery's − terminal. */
  v: Map<number, number>
  /** Part id → current from a to b through the part (A). */
  i: Map<string, number>
  /** Part id → Va − Vb. */
  vd: Map<string, number>
  /** LEDs that are conducting and comparators that are closed. */
  conducting: Set<string>
  /** Current delivered by all batteries (A). */
  batteryA: number
  /** Power taken from the batteries (W), including the comparator's own supply. */
  power: number
  /** Terminal voltage of the first battery. */
  battV: number
  shorted: boolean
}

const GMIN = 1e-9

function gauss(A: Float64Array, b: Float64Array, n: number): Float64Array | null {
  for (let col = 0; col < n; col++) {
    let piv = col
    let best = Math.abs(A[col * n + col])
    for (let r = col + 1; r < n; r++) {
      const v = Math.abs(A[r * n + col])
      if (v > best) {
        best = v
        piv = r
      }
    }
    if (best < 1e-18) return null
    if (piv !== col) {
      for (let k = 0; k < n; k++) {
        const t = A[col * n + k]
        A[col * n + k] = A[piv * n + k]
        A[piv * n + k] = t
      }
      const t = b[col]
      b[col] = b[piv]
      b[piv] = t
    }
    const d = A[col * n + col]
    for (let r = col + 1; r < n; r++) {
      const f = A[r * n + col] / d
      if (f === 0) continue
      for (let k = col; k < n; k++) A[r * n + k] -= f * A[col * n + k]
      b[r] -= f * b[col]
    }
  }
  const x = new Float64Array(n)
  for (let r = n - 1; r >= 0; r--) {
    let s = b[r]
    for (let k = r + 1; k < n; k++) s -= A[r * n + k] * x[k]
    x[r] = s / A[r * n + r]
  }
  return x
}

/** Linear model of a part in its current state: conductance g and the constant current it pushes a → b inside itself (Norton). */
interface Stamp {
  g: number
  /** Current source value: element current = g·(Va − Vb) − src. */
  src: number
}

function partStamp(p: Part, lux: number, on: boolean): Stamp | null {
  if (p.burnt) return null
  switch (p.kind) {
    case 'wire':
      return { g: 1 / WIRE_R, src: 0 }
    case 'switch':
    case 'button':
      return p.on ? { g: 1 / SWITCH_R, src: 0 } : null
    case 'resistor':
      return { g: 1 / Math.max(1, p.ohms ?? 1000), src: 0 }
    case 'motor':
      return { g: 1 / MOTOR_R, src: 0 }
    case 'buzzer':
      return { g: 1 / BUZZER_R, src: 0 }
    case 'ldr':
      return { g: 1 / ldrOhms(lux), src: 0 }
    case 'battery': {
      const g = 1 / (CELL_R * (p.cells ?? 2))
      return { g, src: batteryEmf(p) * g }
    }
    case 'led':
    case 'lamp': {
      if (!on) return null
      const rs = LED_RS + (p.kind === 'lamp' ? p.ohms ?? 220 : 0)
      const g = 1 / rs
      return { g, src: ledVf(p) * g }
    }
    case 'comparator':
      return on ? { g: 1 / COMPARATOR_ON_R, src: 0 } : null
  }
}

export function solve(parts: Part[], lux: number): Solution {
  const battery = parts.find((p) => p.kind === 'battery')
  const sol: Solution = {
    hasBattery: !!battery,
    ground: battery ? battery.b : -1,
    v: new Map(),
    i: new Map(),
    vd: new Map(),
    conducting: new Set(),
    batteryA: 0,
    power: 0,
    battV: 0,
    shorted: false,
  }
  for (const p of parts) {
    sol.i.set(p.id, 0)
    sol.vd.set(p.id, 0)
  }
  if (!battery) return sol

  // Compact index for every node a part touches (ground excluded).
  const index = new Map<number, number>()
  const touch = (n: number) => {
    if (n !== sol.ground && !index.has(n)) index.set(n, index.size)
  }
  for (const p of parts) {
    touch(p.a)
    touch(p.b)
  }
  const n = index.size
  const idx = (node: number) => (node === sol.ground ? -1 : (index.get(node) ?? -1))

  const state = new Map<string, boolean>() // LED on / comparator closed
  for (const p of parts) if (p.kind === 'led' || p.kind === 'lamp' || p.kind === 'comparator') state.set(p.id, false)

  let volts = new Float64Array(n)
  const vOf = (node: number) => {
    const k = idx(node)
    return k < 0 ? 0 : volts[k]
  }

  for (let iter = 0; iter < 60; iter++) {
    const A = new Float64Array(n * n)
    const rhs = new Float64Array(n)
    for (let k = 0; k < n; k++) A[k * n + k] += GMIN
    for (const p of parts) {
      const s = partStamp(p, lux, state.get(p.id) ?? false)
      if (!s) continue
      const ia = idx(p.a)
      const ib = idx(p.b)
      if (ia >= 0) A[ia * n + ia] += s.g
      if (ib >= 0) A[ib * n + ib] += s.g
      if (ia >= 0 && ib >= 0) {
        A[ia * n + ib] -= s.g
        A[ib * n + ia] -= s.g
      }
      if (s.src !== 0) {
        if (ia >= 0) rhs[ia] += s.src
        if (ib >= 0) rhs[ib] -= s.src
      }
    }
    const x = n > 0 ? gauss(A, rhs, n) : new Float64Array(0)
    if (!x) break
    volts = x

    // Consistency check of every piecewise part.
    let changed = false
    for (const p of parts) {
      if (p.burnt) continue
      if (p.kind === 'led' || p.kind === 'lamp') {
        const vab = vOf(p.a) - vOf(p.b)
        const on = state.get(p.id) ?? false
        const rs = LED_RS + (p.kind === 'lamp' ? p.ohms ?? 220 : 0)
        if (on && (vab - ledVf(p)) / rs < 0) {
          state.set(p.id, false)
          changed = true
        } else if (!on && vab > ledVf(p) + 1e-6) {
          state.set(p.id, true)
          changed = true
        }
      } else if (p.kind === 'comparator') {
        const want = comparatorWants(p, sol.ground, index, volts)
        if (want !== (state.get(p.id) ?? false)) {
          state.set(p.id, want)
          changed = true
        }
      }
    }
    if (!changed) break
  }

  // Read the answer out.
  for (const [node, k] of index) sol.v.set(node, volts[k])
  sol.v.set(sol.ground, 0)
  let comparatorOn = false
  for (const p of parts) {
    const on = state.get(p.id) ?? false
    const vab = vOf(p.a) - vOf(p.b)
    sol.vd.set(p.id, vab)
    const s = partStamp(p, lux, on)
    const cur = s ? s.g * vab - s.src : 0
    sol.i.set(p.id, Math.abs(cur) < 1e-12 ? 0 : cur)
    if (on) sol.conducting.add(p.id)
    if (p.kind === 'comparator' && p.sense != null && isPowered(p, sol)) comparatorOn = true
  }
  let power = 0
  for (const p of parts) {
    if (p.kind !== 'battery') continue
    const delivered = -(sol.i.get(p.id) ?? 0) // current out of + into the circuit
    sol.batteryA += delivered
    power += delivered * (sol.vd.get(p.id) ?? 0)
    if (Math.abs(delivered) > SHORT_A) sol.shorted = true
  }
  sol.battV = sol.vd.get(battery.id) ?? 0
  if (comparatorOn) power += COMPARATOR_IQ * sol.battV
  sol.power = Math.max(0, power)
  return sol
}

function comparatorWants(p: Part, ground: number, index: Map<number, number>, volts: Float64Array): boolean {
  if (p.sense == null) return false
  let vs: number
  if (p.sense === ground) vs = 0
  else {
    const k = index.get(p.sense)
    if (k === undefined) return false // sense lead touches nothing: floating input
    vs = volts[k]
  }
  const th = p.threshold ?? 2
  return (p.mode ?? 'below') === 'below' ? vs < th : vs > th
}

/** A comparator only counts as powered if it is wired into the circuit. */
function isPowered(p: Part, sol: Solution): boolean {
  return sol.v.has(p.a) && sol.v.has(p.b)
}

// ── Helpers for gameplay ────────────────────────────────────────────────────

export function partCurrent(sol: Solution, id: string): number {
  return sol.i.get(id) ?? 0
}

/** 0..1 glow of an LED / lamp. */
export function ledGlow(sol: Solution, p: Part): number {
  if (p.burnt) return 0
  const i = partCurrent(sol, p.id)
  if (i <= TINY_A) return 0
  return Math.min(1, 0.15 + (0.85 * i) / LED_RATED_A)
}

/** 0..1 speed of a motor. */
export function motorSpeed(sol: Solution, p: Part): number {
  const i = Math.abs(partCurrent(sol, p.id))
  if (i < MOTOR_START_A) return 0
  return Math.min(1, (i - MOTOR_START_A) / 0.4 + 0.15)
}

export function buzzerOn(sol: Solution, p: Part): boolean {
  return Math.abs(sol.vd.get(p.id) ?? 0) >= BUZZER_MIN_V
}

export const edgeKey = (a: number, b: number): string => (a < b ? `${a}-${b}` : `${b}-${a}`)

export function areNeighbours(a: number, b: number): boolean {
  const pa = nodeXY(a)
  const pb = nodeXY(b)
  return Math.abs(pa.x - pb.x) + Math.abs(pa.y - pb.y) === 1
}
