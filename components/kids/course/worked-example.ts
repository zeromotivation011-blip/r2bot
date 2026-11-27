// components/kids/course/worked-example.ts
// Turns a curriculum example program (plain pseudo-code using block ids, e.g.
//   ['pen_down', 'repeat(4) { drive_for(80, 1); turn_degrees(-90, 40) }', 'pen_up']
// ) into picture blocks the child recognises from the challenge ("Hop forward 1",
// "Turn right", "Repeat 4 times"), so the Code beat can show Spark building it
// block by block. Pure: safe on server and client.

import type { PaletteBlock } from '@/lib/kids/sim/challenge'

export interface ExampleBlock {
  /** Words the child hears, e.g. "Hop forward 2". */
  text: string
  icon: string
  container: boolean
  /** A note from the curriculum ("← the extra hop found by testing"). */
  note?: string
  children?: ExampleBlock[]
}

interface Stmt {
  name: string
  args: string[]
  children?: Stmt[]
  note?: string
}

// ── Parsing ───────────────────────────────────────────────────────────────

const NOTE_MARK = '\u0000'

function splitNote(line: string): { code: string; note?: string } {
  const arrow = line.indexOf('←')
  if (arrow >= 0) return { code: line.slice(0, arrow).trimEnd(), note: line.slice(arrow + 1).trim() }
  // "drive_for(80, 3)  (run in each lane)": a parenthetical after two spaces.
  const m = /^(.*?\S)\s{2,}\((.+)\)\s*$/.exec(line)
  if (m) return { code: m[1], note: m[2] }
  return { code: line }
}

function parse(src: string, notes: string[]): Stmt[] {
  let i = 0
  const skip = () => {
    while (i < src.length && /[\s;]/.test(src[i])) i++
  }
  const seq = (): Stmt[] => {
    const out: Stmt[] = []
    for (;;) {
      skip()
      if (i >= src.length || src[i] === '}') return out
      if (src[i] === NOTE_MARK) {
        i++
        const j = src.indexOf(NOTE_MARK, i)
        const idx = Number(src.slice(i, j))
        i = j + 1
        if (out.length) out[out.length - 1].note = notes[idx]
        continue
      }
      const m = /^[A-Za-z_]+/.exec(src.slice(i))
      if (!m) {
        i++
        continue
      }
      const name = m[0]
      i += name.length
      skip()
      const args: string[] = []
      if (src[i] === '(') {
        let depth = 0
        let j = i
        for (; j < src.length; j++) {
          if (src[j] === '(') depth++
          else if (src[j] === ')') {
            depth--
            if (depth === 0) break
          }
        }
        const inner = src.slice(i + 1, j)
        args.push(...splitArgs(inner))
        i = j + 1
      }
      // Look ahead for a body (skip spaces only, not statement separators).
      let k = i
      while (k < src.length && /\s/.test(src[k])) k++
      let children: Stmt[] | undefined
      if (src[k] === '{') {
        i = k + 1
        children = seq()
        if (src[i] === '}') i++
      }
      out.push({ name, args, ...(children ? { children } : {}) })
    }
  }
  return seq()
}

function splitArgs(s: string): string[] {
  const out: string[] = []
  let cur = ''
  let q = false
  for (const ch of s) {
    if (ch === '"') q = !q
    if (ch === ',' && !q) {
      out.push(cur.trim())
      cur = ''
    } else cur += ch
  }
  if (cur.trim()) out.push(cur.trim())
  return out
}

// ── Mapping to picture blocks ─────────────────────────────────────────────

const num = (s: string | undefined): number => Number(s)
const unquote = (s: string | undefined): string => (s ?? '').replace(/^"|"$/g, '')

function sameNum(a: unknown, b: number): boolean {
  return typeof a === 'number' ? a === b : Number(a) === b
}

/** Shorter argument text for a picture block: `variable_get(x)` → `x`, `math(a + b)` → `(a + b)`. */
function shortArg(a: string): string {
  return a.replace(/variable_get\(\s*([^()]+?)\s*\)/g, '$1').replace(/\bmath\(/g, '(').replace(/\s+/g, ' ').trim()
}

function toBlock(st: Stmt, palette: PaletteBlock[]): ExampleBlock {
  const ops = palette.filter((b) => b.op === st.name)
  let text = st.name.replace(/_/g, ' ')
  let icon = '🧩'
  let container = !!st.children
  const pick = (b: PaletteBlock | undefined, suffix = ''): void => {
    if (!b) return
    text = `${b.label}${suffix}`
    icon = b.icon
    container = b.container
  }
  switch (st.name) {
    case 'drive_for': {
      const speed = num(st.args[0])
      const secs = num(st.args[1])
      const exact = ops.find((b) => sameNum(b.fixed.speedPct, speed) && sameNum(b.fixed.seconds, secs))
      const chosen = ops.find((b) => sameNum(b.fixed.speedPct, speed) && b.choice?.param === 'seconds')
      const sameSpeed = ops.find((b) => sameNum(b.fixed.speedPct, speed))
      if (exact) pick(exact)
      else if (chosen) pick(chosen, ` ${secs}`)
      else if (sameSpeed) pick(sameSpeed)
      else text = speed < 0 ? `Drive back for ${secs} s` : `Drive for ${secs} s`
      break
    }
    case 'turn_degrees': {
      const deg = num(st.args[0])
      const b = ops.find((x) => sameNum(x.fixed.deg, deg))
      if (b) pick(b)
      else text = deg > 0 ? `Turn left ${deg}°` : `Turn right ${-deg}°`
      break
    }
    case 'wait': {
      pick(ops[0], ` ${num(st.args[0])}`)
      if (!ops[0]) text = `Wait ${num(st.args[0])}`
      break
    }
    case 'say': {
      const t = unquote(st.args[0])
      pick(ops[0])
      text = `Say “${t}”`
      break
    }
    case 'repeat': {
      const n = num(st.args[0])
      const b = ops.find((x) => x.choice?.values.some((v) => sameNum(v, n))) ?? ops[0]
      pick(b)
      text = `Repeat ${n} times`
      container = true
      break
    }
    case 'repeat_until':
    case 'if': {
      const cond = (st.args[0] ?? '').replace(/\s+/g, ' ').trim()
      const b = ops.find((x) => String(x.fixed.cond ?? '').replace(/\s+/g, ' ') === cond) ?? ops[0]
      pick(b)
      // Levels 2–4 write conditions the picture palette has no block for: show the condition itself.
      if (!b && cond) text = `${st.name === 'if' ? 'If' : 'Repeat until'} ${shortArg(cond)}`
      container = true
      break
    }
    default:
      pick(ops[0])
      if (!ops[0] && st.args.length) text = `${st.name.replace(/_/g, ' ')} (${st.args.map(shortArg).join(', ')})`
  }
  return { text, icon, container, ...(st.note ? { note: st.note } : {}), ...(st.children ? { children: st.children.map((c) => toBlock(c, palette)) } : {}) }
}

/** The example program as picture blocks. Never throws: unknown text comes back as a plain block. */
export function exampleBlocks(lines: string[], palette: PaletteBlock[]): ExampleBlock[] {
  try {
    const notes: string[] = []
    const src = lines
      .map((l) => {
        const { code, note } = splitNote(l)
        if (!note) return code
        notes.push(note)
        return `${code} ${NOTE_MARK}${notes.length - 1}${NOTE_MARK}`
      })
      .join('\n')
    return parse(src, notes).map((s) => toBlock(s, palette))
  } catch {
    return lines.map((l) => ({ text: l, icon: '🧩', container: false }))
  }
}

/** Blocks in reading order (a container, then what is inside it), for step-by-step reveal. */
export function countExample(blocks: ExampleBlock[]): number {
  return blocks.reduce((n, b) => n + 1 + (b.children ? countExample(b.children) : 0), 0)
}

/** Spoken description of one block, for "read it to me". */
export function sayExample(blocks: ExampleBlock[]): string[] {
  const out: string[] = []
  const walk = (bs: ExampleBlock[]) => {
    for (const b of bs) {
      out.push(b.container ? `${b.text}, and inside:` : b.text)
      if (b.children) {
        walk(b.children)
        if (b.container) out.push('that is the end of that block')
      }
    }
  }
  walk(blocks)
  return out
}
