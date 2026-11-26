// components/kids/activities/templates/ohms-law/logic.ts
// OHM'S LAW — a battery, a resistor and (usually) an LED in one loop. The
// child either TUNES the circuit (picks a battery and/or a resistor from real
// standard values) to hit a current spec, or PREDICTS a quantity before the
// meter reveals it.
//
// The real electronics:
//   - Ohm's law: V = I × R. Current (A) = voltage (V) ÷ resistance (Ω).
//   - An LED drops a nearly fixed "forward voltage" Vf (red ≈ 2.0 V, yellow ≈
//     2.1 V, green ≈ 2.2 V, blue/white ≈ 3.1 V). The resistor gets the rest:
//     I = (Vbattery − Vf) ÷ R. Below Vf the LED stays dark (I ≈ 0).
//   - A typical 5 mm LED is rated 20 mA and is damaged above ~30 mA, which is
//     why every LED needs a series resistor.
//   - The resistor turns P = I² × R into heat; a common resistor is rated
//     0.25 W. Exceed it and it overheats.
//   - Resistors come in standard "E12" values (10, 12, 15, 18, 22, 27, 33, 39,
//     47, 56, 68, 82 × powers of ten), printed as colour bands.
//
// Pure logic: no React, no DOM.

import type { CheckResult, TemplateLogic } from '@/lib/kids/activities/types'

export type LedColour = 'red' | 'yellow' | 'green' | 'blue' | 'white'

export const LED_VF: Record<LedColour, number> = { red: 2.0, yellow: 2.1, green: 2.2, blue: 3.1, white: 3.1 }
export const LED_HEX: Record<LedColour, string> = { red: '#FF3B3B', yellow: '#FFD43B', green: '#22E06B', blue: '#3B9BFF', white: '#F4F7FF' }

const E12 = [10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82]

/** All E12 resistor values in [min, max] Ω (1 Ω … 10 MΩ). */
export function e12Between(min: number, max: number): number[] {
  const out: number[] = []
  for (let dec = -1; dec <= 6; dec++) for (const b of E12) {
    const v = Math.round(b * Math.pow(10, dec) * 100) / 100
    if (v >= min - 1e-9 && v <= max + 1e-9) out.push(v)
  }
  return out
}

export interface Range {
  min?: number
  max?: number
}

/** Either a fixed value or a set the child chooses from. */
export type Choice = { fixed: number } | { choices: number[] } | { e12: { min: number; max: number } }

export interface Params {
  /**
   * 'tune'    — the child picks the battery and/or resistor (whichever is a
   *             `choices`/`e12` Choice) to meet `target`. Ages 5–17.
   * 'predict' — everything is fixed; the child works out `ask` (current,
   *             voltage or resistance) before the meter shows it. Ages 11–17.
   */
  mode: 'tune' | 'predict'
  /** Battery voltage in volts (e.g. 3, 4.5, 5, 9). */
  battery: Choice
  /** Series resistor in ohms. */
  resistor: Choice
  /**
   * The LED in the loop. Omit for a plain resistor circuit (ages 11+: pure
   * V = I × R). `vf` overrides the colour's typical forward voltage.
   */
  led?: { colour: LedColour; vf?: number; maxMa?: number }
  /** tune: what the circuit must do. */
  target?: {
    /** LED/loop current in mA. e.g. { min: 10, max: 20 } for a bright, safe LED. */
    currentMa?: Range
    /** The resistor's power rating in watts (0.25 typical). Exceeding it fails. */
    resistorRatingW?: number
  }
  /** predict: which quantity the child must work out, and how close (±%) counts. */
  ask?: { quantity: 'I' | 'V' | 'R'; tolerancePct: number }
  /** Show "I = (V − Vf) ÷ R" with the live numbers. Default on for ages 11+. */
  showFormula?: boolean
  /** tune: show the ammeter live while choosing. Default on for ages 5–10. Off = reason first, then test. */
  liveMeter?: boolean
  /** Show the resistor's colour bands (and name them for ages 11+). Default on. */
  showBands?: boolean
}

export interface Answer {
  /** tune: chosen battery voltage (when battery is a choice). */
  volts?: number
  /** tune: chosen resistor (when resistor is a choice). */
  ohms?: number
  /** predict: the child's value in mA (I), V (V) or Ω (R). */
  value?: number
}

export interface CircuitResult {
  volts: number
  ohms: number
  vf: number
  currentMa: number
  ledOn: boolean
  ledBurnt: boolean
  resistorW: number
  resistorHot: boolean
}

export function choicesOf(c: Choice): number[] {
  if ('fixed' in c) return [c.fixed]
  if ('choices' in c) return [...c.choices].sort((a, b) => a - b)
  return e12Between(c.e12.min, c.e12.max)
}

export function isChoice(c: Choice): boolean {
  return !('fixed' in c)
}

export function solve(p: Params, volts: number, ohms: number): CircuitResult {
  const vf = p.led ? (p.led.vf ?? LED_VF[p.led.colour]) : 0
  const maxMa = p.led?.maxMa ?? 30
  const i = volts > vf && ohms > 0 ? (volts - vf) / ohms : 0
  const currentMa = i * 1000
  const resistorW = i * i * ohms
  const rating = p.target?.resistorRatingW
  return {
    volts,
    ohms,
    vf,
    currentMa,
    ledOn: !!p.led && currentMa >= 1,
    ledBurnt: !!p.led && currentMa > maxMa,
    resistorW,
    resistorHot: rating !== undefined && resistorW > rating,
  }
}

function inRange(v: number, r?: Range): boolean {
  if (!r) return true
  if (r.min !== undefined && v < r.min - 1e-9) return false
  if (r.max !== undefined && v > r.max + 1e-9) return false
  return true
}

function rangeText(r: Range, unit: string): string {
  if (r.min !== undefined && r.max !== undefined) return `${r.min}–${r.max} ${unit}`
  if (r.min !== undefined) return `at least ${r.min} ${unit}`
  return `at most ${r.max} ${unit}`
}

export const fmtOhms = (r: number) => (r >= 1e6 ? `${+(r / 1e6).toFixed(2)} MΩ` : r >= 1000 ? `${+(r / 1000).toFixed(2)} kΩ` : `${+r.toFixed(2)} Ω`)
const f2 = (n: number) => +n.toFixed(n >= 100 ? 0 : n >= 10 ? 1 : 2)

/** The true value of the asked quantity in predict mode (mA, V or Ω). */
export function truthFor(p: Params): number {
  const v = choicesOf(p.battery)[0]
  const r = choicesOf(p.resistor)[0]
  const res = solve(p, v, r)
  const q = p.ask?.quantity ?? 'I'
  return q === 'I' ? res.currentMa : q === 'V' ? v : r
}

function meetsTarget(p: Params, res: CircuitResult): boolean {
  if (res.ledBurnt || res.resistorHot) return false
  if (p.led && !res.ledOn) return false
  return inRange(res.currentMa, p.target?.currentMa)
}

/** Every working (volts, ohms) combination. */
export function solutions(p: Params): { volts: number; ohms: number }[] {
  const out: { volts: number; ohms: number }[] = []
  for (const v of choicesOf(p.battery)) for (const r of choicesOf(p.resistor)) if (meetsTarget(p, solve(p, v, r))) out.push({ volts: v, ohms: r })
  return out
}

function validChoice(c: Choice | undefined, name: string, out: string[]) {
  if (!c) return out.push(`${name} is required`)
  if ('fixed' in c) {
    if (!(c.fixed > 0)) out.push(`${name}.fixed must be > 0`)
  } else if ('choices' in c) {
    if (!Array.isArray(c.choices) || c.choices.length < 2 || c.choices.length > 24) out.push(`${name}.choices: 2–24 values`)
    else if (c.choices.some((x) => !(x > 0))) out.push(`${name}.choices must all be > 0`)
    else if (new Set(c.choices).size !== c.choices.length) out.push(`${name}.choices has repeats`)
  } else if ('e12' in c) {
    if (!(c.e12.min > 0 && c.e12.max > c.e12.min)) out.push(`${name}.e12 needs 0 < min < max`)
    else if (e12Between(c.e12.min, c.e12.max).length < 2) out.push(`${name}.e12 range holds fewer than 2 standard values`)
  } else out.push(`${name} must be fixed, choices or e12`)
}

function validate(p: Params): string[] {
  const out: string[] = []
  validChoice(p.battery, 'battery', out)
  validChoice(p.resistor, 'resistor', out)
  if (p.battery && 'fixed' in p.battery && p.battery.fixed > 48) out.push('keep batteries ≤ 48 V (safe, real hobby range)')
  if (p.led && !LED_VF[p.led.colour]) out.push('unknown LED colour')
  if (p.led?.vf !== undefined && !(p.led.vf > 0 && p.led.vf < 5)) out.push('led.vf: 0–5 V')
  if (out.length) return out
  if (p.mode === 'tune') {
    if (!isChoice(p.battery) && !isChoice(p.resistor)) out.push('tune mode needs a battery or resistor choice')
    if (!p.target?.currentMa && p.target?.resistorRatingW === undefined && !p.led) out.push('tune mode needs a target')
    if (p.target?.currentMa && p.target.currentMa.min === undefined && p.target.currentMa.max === undefined) out.push('target.currentMa needs min or max')
    if (!out.length) {
      const sol = solutions(p)
      if (sol.length === 0) out.push('no battery/resistor combination meets the target')
      const all = choicesOf(p.battery).length * choicesOf(p.resistor).length
      if (sol.length === all) out.push('every choice works — this is not a puzzle')
    }
  } else if (p.mode === 'predict') {
    if (isChoice(p.battery) || isChoice(p.resistor)) out.push('predict mode needs a fixed battery and resistor')
    if (!p.ask) out.push('predict mode needs ask')
    else {
      if (!['I', 'V', 'R'].includes(p.ask.quantity)) out.push('ask.quantity must be I, V or R')
      if (!(p.ask.tolerancePct > 0 && p.ask.tolerancePct <= 25)) out.push('ask.tolerancePct: (0, 25]')
    }
    if (!out.length) {
      const res = solve(p, choicesOf(p.battery)[0], choicesOf(p.resistor)[0])
      if (p.led && !res.ledOn) out.push('the LED would be off (battery below Vf) — nothing to predict')
      if (res.ledBurnt) out.push('the LED would burn out — use a bigger resistor')
    }
  } else out.push('mode must be tune or predict')
  return out
}

function check(p: Params, a: Answer): CheckResult {
  const unitOf = { I: 'mA', V: 'V', R: 'Ω' } as const
  if (p.mode === 'predict') {
    const q = p.ask?.quantity ?? 'I'
    const truth = truthFor(p)
    const v = a?.value
    if (v === undefined || !Number.isFinite(v)) return { correct: false, score: 0, feedback: 'Type your answer first.' }
    const tol = ((p.ask?.tolerancePct ?? 5) / 100) * Math.abs(truth)
    const res = solve(p, choicesOf(p.battery)[0], choicesOf(p.resistor)[0])
    const vr = res.volts - res.vf
    const how =
      q === 'I'
        ? `I = ${p.led ? `(${res.volts} V − ${res.vf} V LED)` : `${res.volts} V`} ÷ ${fmtOhms(res.ohms)} = ${f2(res.currentMa / 1000)} A = ${f2(res.currentMa)} mA`
        : q === 'V'
          ? `V = I × R${p.led ? ' + Vf' : ''} = ${f2(res.currentMa)} mA × ${fmtOhms(res.ohms)}${p.led ? ` + ${res.vf} V` : ''} = ${f2(res.volts)} V`
          : `R = ${p.led ? `(V − Vf)` : 'V'} ÷ I = ${f2(vr)} V ÷ ${f2(res.currentMa / 1000)} A = ${fmtOhms(res.ohms)}`
    if (Math.abs(v - truth) <= tol + 1e-9) return { correct: true, score: 1, feedback: `Right: ${how}.` }
    // Common slips, named kindly.
    let hint = 'Check the units: 1 A = 1000 mA.'
    if (q === 'I' && p.led && Math.abs(v - (res.volts / res.ohms) * 1000) <= tol) hint = 'You used the whole battery voltage — but the LED keeps its own Vf. The resistor only gets what is left.'
    else if (q === 'I' && Math.abs(v - res.currentMa / 1000) <= tol / 1000 + 1e-9) hint = 'That is the answer in amps — the question asks for milliamps (×1000).'
    else if (q === 'I' && Math.abs(v * 1000 - res.currentMa) <= tol * 1000) hint = 'Your number is 1000 times too small — milliamps, not amps.'
    return { correct: false, score: Math.max(0, 1 - Math.abs(v - truth) / Math.max(1e-9, 4 * tol)), feedback: `Not quite (${f2(v)} ${unitOf[q]}). ${hint}` }
  }
  // tune
  const vChoices = choicesOf(p.battery)
  const rChoices = choicesOf(p.resistor)
  const volts = isChoice(p.battery) ? a?.volts : vChoices[0]
  const ohms = isChoice(p.resistor) ? a?.ohms : rChoices[0]
  if (volts === undefined || !vChoices.some((x) => Math.abs(x - volts) < 1e-9)) return { correct: false, score: 0, feedback: 'Pick one of the batteries.' }
  if (ohms === undefined || !rChoices.some((x) => Math.abs(x - ohms) < 1e-9)) return { correct: false, score: 0, feedback: 'Pick one of the resistors.' }
  const res = solve(p, volts, ohms)
  const target = p.target?.currentMa
  const I = f2(res.currentMa)
  if (res.ledBurnt)
    return {
      correct: false,
      score: 0.1,
      feedback: `Pop! ${I} mA is far too much for the LED (it can take about ${p.led?.maxMa ?? 30} mA). A bigger resistor pushes back harder and lets less current through.`,
    }
  if (p.led && volts <= res.vf)
    return {
      correct: false,
      score: 0.1,
      feedback: `The LED stays dark: a ${p.led.colour} LED needs about ${res.vf} V before it lights, and this battery gives only ${volts} V. Choose a bigger battery.`,
    }
  if (res.resistorHot)
    return {
      correct: false,
      score: 0.4,
      feedback: `The current is ${I} mA, but the resistor turns ${f2(res.resistorW)} W into heat — more than its ${p.target?.resistorRatingW} W rating. Real resistors smoke like this. Use a bigger resistor or a smaller battery.`,
    }
  if (!inRange(res.currentMa, target)) {
    const tooMuch = target?.max !== undefined && res.currentMa > target.max
    return {
      correct: false,
      score: 0.5,
      feedback: `The current is ${I} mA; the job needs ${rangeText(target ?? {}, 'mA')}. ${
        tooMuch ? 'Too much current: choose a BIGGER resistor (or a smaller battery).' : 'Too little current: choose a SMALLER resistor (or a bigger battery).'
      }`,
    }
  }
  return {
    correct: true,
    score: 1,
    feedback: `${I} mA flows — ${p.led ? 'bright and safe for the LED' : 'just right'}. ${
      p.led ? `The resistor takes ${f2(volts - res.vf)} V (the LED keeps ${res.vf} V), and ${f2(volts - res.vf)} V ÷ ${fmtOhms(ohms)} = ${I} mA.` : `${volts} V ÷ ${fmtOhms(ohms)} = ${I} mA.`
    }`,
  }
}

export const logic: TemplateLogic<Params, Answer> = {
  id: 'ohms-law',
  name: "Ohm's law",
  validate,
  check,
}
