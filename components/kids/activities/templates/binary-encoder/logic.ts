// components/kids/activities/templates/binary-encoder/logic.ts
// binary-encoder — robots store and send everything as bits. The child flips
// bit lamps to encode a number, paints a sensor image from its row codes,
// spells a radio message in a real code, or protects data with parity.
//
// Every mode is the same interaction — a grid of bits the child toggles — so
// one component covers four ideas:
//
//   'number'   set a register: 13 → 0 0 0 0 1 1 0 1. Place values on/off.
//   'pixels'   a robot camera / LED matrix: each row arrives as a number
//              (binary, decimal or hex); paint the picture it encodes.
//   'message'  encode text letter by letter in A1Z26 (5 bits) or ASCII (7 bits).
//   'parity'   'add': give each data row an even-parity bit.
//              'fix': a 2-D parity block arrived with ONE bit flipped by
//              noise; find it from the parity checks and flip it back.
//
// Difficulty ladder (ages 5 → 17):
//   Explorers  pixels 4×4–5×5 with 'binary' row codes (1 = lit), or number with
//              3 bits and place values shown, targets ≤ 7.
//   Builders   number 4–5 bits (targets ≤ 31) with place values; pixels with
//              'decimal' codes ≤ 15; message A1Z26 with the table shown.
//   Inventors  number 8 bits without place values; pixels 'hex'; ASCII with
//              table; parity 'add'.
//   Engineers  ASCII without table; parity 'fix' on a 4×4 block; 10-bit
//              sensor readings (0–1023, like an Arduino analogRead()).
//
// Bits are written most-significant first (left = biggest place value).
// Pure TypeScript: no React, no DOM.

import type { CheckResult, TemplateLogic } from '@/lib/kids/activities/types'

export type Bit = 0 | 1

export interface NumberParams {
  mode: 'number'
  /** Register width, 2–10 bits (10 = an Arduino's analogRead range 0–1023). */
  bits: number
  /** The value to store, 0 … 2^bits − 1. */
  target: number
  /** Show each lamp's place value (1, 2, 4, …) under it. Default true. */
  showPlaceValues?: boolean
  /** Show the running decimal total + gauge while the child flips. Default: true for explorers/builders, false for inventors/engineers (they add it up themselves). */
  showTotal?: boolean
  /** What the register means, shown as the gauge label ("Motor speed", "Light sensor"). ≤ 24 chars. */
  label?: string
}

export interface PixelParams {
  mode: 'pixels'
  /** 3–8 columns (3–6 when codes is 'binary'). Cells are 44px; 7–8 scroll sideways on a phone, so keep younger bands at ≤ 6. */
  width: number
  /** 3–8 rows. */
  height: number
  /** One number per row; bit (width−1−c) of the number is column c (left pixel = biggest place value). */
  rows: number[]
  /** How the row codes are shown: 'binary' (easiest), 'decimal' or 'hex'. */
  codes: 'binary' | 'decimal' | 'hex'
  /** What the picture is (revealed after success, e.g. "an arrow pointing right"). */
  reveal?: string
}

export interface MessageParams {
  mode: 'message'
  /** 1–5 letters (A–Z only for a1z26; letters, digits, space and !?.- for ascii). */
  text: string
  /** 'a1z26' (A=1 … Z=26, 5 bits) or 'ascii' (7 bits: A = 65). */
  code: 'a1z26' | 'ascii'
  /** Show the letter→number table. Default true. */
  showTable?: boolean
  /** Show place values above the bit columns. Default true. */
  showPlaceValues?: boolean
}

export interface ParityParams {
  mode: 'parity'
  /**
   * 'add': `data` rows; the child sets the last bit of each row so every row
   *        has an EVEN number of 1s.
   * 'fix': `data` is the ORIGINAL block. The child sees it with a parity column
   *        and parity row added and the bit at `flip` changed by noise; they
   *        must flip exactly that bit back.
   */
  task: 'add' | 'fix'
  /** 1–6 rows of 2–7 data bits (all rows the same length). */
  data: Bit[][]
  /** 'fix' only: [row, col] of the corrupted bit in the FULL block (data + parity column + parity row). */
  flip?: [number, number]
}

export type Params = NumberParams | PixelParams | MessageParams | ParityParams

/** The bit grid the child ends with (rows, most-significant bit first). */
export interface Answer {
  bits: Bit[][]
}

// ── Helpers shared with the component ─────────────────────────────────────

export function toBits(n: number, width: number): Bit[] {
  return Array.from({ length: width }, (_, i) => (((n >> (width - 1 - i)) & 1) as Bit))
}
export function fromBits(b: Bit[]): number {
  return b.reduce<number>((n, x) => n * 2 + x, 0)
}
export const placeValues = (width: number) => Array.from({ length: width }, (_, i) => 2 ** (width - 1 - i))

export function codeWidth(code: MessageParams['code']): number {
  return code === 'a1z26' ? 5 : 7
}
export function charCode(ch: string, code: MessageParams['code']): number {
  return code === 'a1z26' ? ch.toUpperCase().charCodeAt(0) - 64 : ch.charCodeAt(0)
}
export function codeChar(n: number, code: MessageParams['code']): string {
  if (code === 'a1z26') return n >= 1 && n <= 26 ? String.fromCharCode(64 + n) : '?'
  return n >= 32 && n < 127 ? String.fromCharCode(n) : '?'
}
export function rowCode(n: number, width: number, codes: PixelParams['codes']): string {
  if (codes === 'binary') return toBits(n, width).join('')
  if (codes === 'hex') return '0x' + n.toString(16).toUpperCase().padStart(Math.ceil(width / 4), '0')
  return String(n)
}
const ones = (r: Bit[]) => r.filter((b) => b === 1).length

/** 'fix' mode: the full block (data + even-parity column + parity row) before the noise. */
export function parityBlock(data: Bit[][]): Bit[][] {
  const withCol = data.map((r) => [...r, (ones(r) % 2) as Bit])
  const parityRow = withCol[0].map((_, c) => (withCol.reduce((n, r) => n + r[c], 0) % 2) as Bit)
  return [...withCol, parityRow]
}

/** The grid the child starts from. */
export function startGrid(p: Params): Bit[][] {
  switch (p.mode) {
    case 'number': return [Array<Bit>(p.bits).fill(0)]
    case 'pixels': return Array.from({ length: p.height }, () => Array<Bit>(p.width).fill(0))
    case 'message': return Array.from(p.text, () => Array<Bit>(codeWidth(p.code)).fill(0))
    case 'parity': {
      if (p.task === 'add') return p.data.map((r) => [...r, 0 as Bit])
      const g = parityBlock(p.data).map((r) => [...r])
      const [fr, fc] = p.flip ?? [0, 0]
      if (g[fr] && g[fr][fc] !== undefined) g[fr][fc] = (1 - g[fr][fc]) as Bit
      return g
    }
  }
}

/** The grid that counts as correct. */
export function expectedGrid(p: Params): Bit[][] {
  switch (p.mode) {
    case 'number': return [toBits(p.target, p.bits)]
    case 'pixels': return p.rows.map((n) => toBits(n, p.width))
    case 'message': return Array.from(p.text, (ch) => toBits(charCode(ch, p.code), codeWidth(p.code)))
    case 'parity': return p.task === 'add' ? p.data.map((r) => [...r, (ones(r) % 2) as Bit]) : parityBlock(p.data)
  }
}

/** Cells the child may toggle (others are locked data). */
export function editable(p: Params, r: number, c: number): boolean {
  if (p.mode !== 'parity' || p.task === 'fix') return true
  return c === p.data[0].length
}

// ── validate ───────────────────────────────────────────────────────────────

const isBit = (b: unknown) => b === 0 || b === 1

function validate(p: Params): string[] {
  if (!p || typeof p !== 'object') return ['params missing']
  const errs: string[] = []
  switch (p.mode) {
    case 'number': {
      if (!Number.isInteger(p.bits) || p.bits < 2 || p.bits > 10) errs.push('bits must be an integer 2–10')
      else if (!Number.isInteger(p.target) || p.target < 0 || p.target >= 2 ** p.bits) errs.push(`target must be an integer 0–${2 ** p.bits - 1} for ${p.bits} bits`)
      else if (p.target === 0) errs.push('target 0 needs no flips — choose a number above 0')
      if (p.label !== undefined && (typeof p.label !== 'string' || p.label.length > 24)) errs.push('label must be at most 24 characters')
      break
    }
    case 'pixels': {
      if (!Number.isInteger(p.width) || p.width < 3 || p.width > 8) errs.push('width must be an integer 3–8')
      if (!Number.isInteger(p.height) || p.height < 3 || p.height > 8) errs.push('height must be an integer 3–8')
      if (!['binary', 'decimal', 'hex'].includes(p.codes)) errs.push('codes must be binary, decimal or hex')
      // Pixels are 44px tap targets; with long binary row codes beside them,
      // anything wider than 6 does not fit a phone.
      else if (p.codes === 'binary' && p.width > 6) errs.push('width above 6 needs decimal or hex row codes (binary codes that long do not fit on a phone)')
      if (errs.length) break
      if (!Array.isArray(p.rows) || p.rows.length !== p.height) errs.push(`rows must have exactly ${p.height} numbers (one per row)`)
      else p.rows.forEach((n, i) => { if (!Number.isInteger(n) || n < 0 || n >= 2 ** p.width) errs.push(`rows[${i}] must be an integer 0–${2 ** p.width - 1}`) })
      if (!errs.length && p.rows.every((n) => n === 0)) errs.push('the picture is blank — light at least one pixel')
      if (p.reveal !== undefined && p.reveal.length > 60) errs.push('reveal must be at most 60 characters')
      break
    }
    case 'message': {
      if (p.code !== 'a1z26' && p.code !== 'ascii') { errs.push('code must be a1z26 or ascii'); break }
      if (typeof p.text !== 'string' || p.text.length < 1 || p.text.length > 5) { errs.push('text must be 1–5 characters'); break }
      if (p.code === 'a1z26' && !/^[A-Za-z]+$/.test(p.text)) errs.push('a1z26 text may only contain letters A–Z')
      if (p.code === 'ascii' && !/^[A-Za-z0-9 !?.\-]+$/.test(p.text)) errs.push('ascii text may only contain letters, digits, space and ! ? . -')
      break
    }
    case 'parity': {
      if (p.task !== 'add' && p.task !== 'fix') { errs.push('task must be add or fix'); break }
      if (!Array.isArray(p.data) || p.data.length < 1 || p.data.length > 6) { errs.push('data must have 1–6 rows'); break }
      const w = p.data[0]?.length
      if (!Number.isInteger(w) || w < 2 || w > 7) { errs.push('each data row must have 2–7 bits'); break }
      p.data.forEach((r, i) => {
        if (!Array.isArray(r) || r.length !== w) errs.push(`data[${i}] must have ${w} bits like row 0`)
        else if (!r.every(isBit)) errs.push(`data[${i}] may only contain 0 and 1`)
      })
      if (errs.length) break
      if (p.task === 'fix') {
        if (p.data.length < 2) errs.push('fix needs at least 2 data rows (a parity row needs something to check)')
        if (!p.flip || !Array.isArray(p.flip) || p.flip.length !== 2) errs.push('fix needs flip: [row, col]')
        else {
          const [r, c] = p.flip
          if (!Number.isInteger(r) || !Number.isInteger(c) || r < 0 || c < 0 || r > p.data.length || c > w) errs.push(`flip must be inside the ${p.data.length + 1}×${w + 1} block`)
        }
      } else {
        if (p.flip !== undefined) errs.push('flip is only used with task "fix"')
        // Parity bits start at 0, so an all-even block is solved before the child
        // does anything; an all-odd one is solved by tapping every bit blindly.
        if (!p.data.some((r) => ones(r) % 2 === 1)) errs.push('add needs at least one row with an odd number of 1s — otherwise it starts solved')
        else if (p.data.length > 1 && !p.data.some((r) => ones(r) % 2 === 0)) errs.push('add with several rows needs at least one already-even row, so the child has to count rather than tap every parity bit')
      }
      break
    }
    default:
      errs.push('mode must be number, pixels, message or parity')
  }
  return errs
}

// ── check ─────────────────────────────────────────────────────────────────

function shapeOk(a: Answer | undefined, want: Bit[][]): a is Answer {
  return !!a && Array.isArray(a.bits) && a.bits.length === want.length && a.bits.every((r, i) => Array.isArray(r) && r.length === want[i].length && r.every(isBit))
}

const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`

function check(p: Params, a: Answer): CheckResult {
  const want = expectedGrid(p)
  if (!shapeOk(a, want)) return { correct: false, score: 0, feedback: 'Those bits could not be read — flip the lamps on the board and try again.' }
  const got = a.bits
  const wrongCells: [number, number][] = []
  got.forEach((r, i) => r.forEach((b, j) => { if (b !== want[i][j]) wrongCells.push([i, j]) }))
  const totalCells = want.reduce((n, r) => n + r.length, 0)
  const score = (totalCells - wrongCells.length) / totalCells

  switch (p.mode) {
    case 'number': {
      const v = fromBits(got[0])
      if (v === p.target) {
        const parts = placeValues(p.bits).filter((_, i) => got[0][i] === 1)
        return { correct: true, score: 1, feedback: `${got[0].join('')} = ${parts.join(' + ')} = ${p.target}. Every lamp is a power of two, and each number has exactly one pattern — that is how a robot's memory stores ${p.label ? p.label.toLowerCase() : 'numbers'}.` }
      }
      const diff = p.target - v
      const parts = placeValues(p.bits).filter((_, i) => got[0][i] === 1)
      const sum = parts.length ? `Your lamps add up to ${parts.join(' + ')} = ${v}` : 'All your lamps are off, which is 0'
      const tip = diff > 0
        ? `You need ${diff} more. Start from the biggest lamp that still fits and work right.`
        : `That is ${-diff} too many. Turn off a lamp that is worth too much and use smaller ones.`
      return { correct: false, score: Math.max(0, 1 - Math.abs(diff) / 2 ** p.bits) * 0.8, feedback: `${sum}, but the robot needs ${p.target}. ${tip}` }
    }
    case 'pixels': {
      if (!wrongCells.length) return { correct: true, score: 1, feedback: `Picture decoded${p.reveal ? `: ${p.reveal}` : ''}! Each row was one number, and its bits told you which pixels light up. Robot cameras and LED screens store every image like this.` }
      const badRows = [...new Set(wrongCells.map(([r]) => r))]
      const r = badRows[0]
      const yours = fromBits(got[r])
      const code = rowCode(p.rows[r], p.width, p.codes)
      const why = p.codes === 'binary'
        ? `Read the code left to right: 1 means lit, 0 means dark.`
        : `Your row is ${rowCode(yours, p.width, p.codes)} (${toBits(yours, p.width).join('')}), but ${code} is ${toBits(p.rows[r], p.width).join('')} in binary.`
      return { correct: false, score: score * 0.9, feedback: `${plural(badRows.length, 'row')} ${badRows.length === 1 ? 'is' : 'are'} not right yet. Row ${r + 1} should be ${code}. ${why}` }
    }
    case 'message': {
      const badLetters = [...new Set(wrongCells.map(([r]) => r))]
      if (!badLetters.length) return { correct: true, score: 1, feedback: `Message sent: "${p.text}" as ${plural(p.text.length * codeWidth(p.code), 'bit')}. ${p.code === 'ascii' ? 'ASCII is the real code computers have used since 1963 — every letter you type is stored this way.' : 'Agreeing on a code is what lets two robots understand each other.'}` }
      const i = badLetters[0]
      const ch = p.text[i]
      const v = fromBits(got[i])
      return {
        correct: false,
        score: score * 0.9,
        feedback: `${plural(p.text.length - badLetters.length, 'letter')} of ${p.text.length} right. Letter ${i + 1} (“${ch === ' ' ? 'space' : ch}”) should be ${charCode(ch, p.code)}, but your bits make ${v}${codeChar(v, p.code) !== '?' ? ` — that spells “${codeChar(v, p.code)}”` : ''}.`,
      }
    }
    case 'parity': {
      if (p.task === 'add') {
        const badRows = [...new Set(wrongCells.map(([r]) => r))]
        if (!badRows.length) return { correct: true, score: 1, feedback: 'Every row now has an even number of 1s. If noise flips any single bit on the way, that row becomes odd — and the robot knows the message was damaged.' }
        const r = badRows[0]
        const n = ones(got[r])
        return { correct: false, score: score * 0.9, feedback: `Row ${r + 1} has ${plural(n, 'one')} including the parity bit — that is odd. Set the parity bit so the count of 1s is even (0, 2, 4…).` }
      }
      const start = startGrid(p)
      const changed: [number, number][] = []
      got.forEach((r, i) => r.forEach((b, j) => { if (b !== start[i][j]) changed.push([i, j]) }))
      const [fr, fc] = p.flip ?? [0, 0]
      if (!wrongCells.length) return { correct: true, score: 1, feedback: `Found it: row ${fr + 1}, column ${fc + 1}. Its row check and its column check were the only odd ones, and they cross at exactly one bit. This is how memory chips and space probes correct errors without asking again.` }
      if (changed.length === 0) return { correct: false, score: 0, feedback: 'You have not flipped any bit yet. Count the 1s in each row and column: the odd row and the odd column cross at the broken bit.' }
      if (changed.length > 1) return { correct: false, score: 0.3, feedback: `You changed ${changed.length} bits, but noise flipped only one. Flip the others back and look for the single bit where an odd row meets an odd column.` }
      const [cr, cc] = changed[0]
      const sameRow = cr === fr
      const sameCol = cc === fc
      return {
        correct: false,
        score: sameRow || sameCol ? 0.5 : 0.2,
        feedback: `Row ${cr + 1}, column ${cc + 1} was fine. ${sameRow ? 'You found the right row — now find the odd column.' : sameCol ? 'You found the right column — now find the odd row.' : 'Count the 1s in each row and in each column. Exactly one row and one column are odd.'}`,
      }
    }
  }
}

export const logic: TemplateLogic<Params, Answer> = {
  id: 'binary-encoder',
  name: 'Bits and bytes',
  validate,
  check,
}
