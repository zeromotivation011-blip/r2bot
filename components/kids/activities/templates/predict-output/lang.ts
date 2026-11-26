// components/kids/activities/templates/predict-output/lang.ts
// A tiny, safe Python subset for "predict the output" activities. Pure TS.
//
// Supported (enough for real robot logic, nothing that can hang or escape):
//   name = expr      name += expr   name -= expr   name *= expr
//   print(expr, ...)
//   if cond: / elif cond: / else:
//   for name in range(stop) | range(start, stop) | range(start, stop, step):
//   while cond:
//   pass            # comments
// Expressions: integers, True/False, names, ( ), unary -, not,
//   * // %   + -   < <= > >= == !=   and   or,   abs(x) min(a, b) max(a, b)
// Values are integers or booleans. `//` and `%` follow Python (floor) rules.

export type Value = number | boolean

export type Expr =
  | { k: 'num'; v: number }
  | { k: 'bool'; v: boolean }
  | { k: 'var'; name: string }
  | { k: 'un'; op: '-' | 'not'; e: Expr }
  | { k: 'bin'; op: BinOp; l: Expr; r: Expr }
  | { k: 'call'; fn: 'abs' | 'min' | 'max'; args: Expr[] }

export type BinOp = '+' | '-' | '*' | '//' | '%' | '<' | '<=' | '>' | '>=' | '==' | '!=' | 'and' | 'or'

export type Stmt =
  | { k: 'assign'; name: string; op: '=' | '+=' | '-=' | '*='; e: Expr; line: number }
  | { k: 'print'; args: Expr[]; line: number }
  | { k: 'if'; branches: { cond: Expr | null; body: Stmt[]; line: number }[]; line: number }
  | { k: 'for'; name: string; args: Expr[]; body: Stmt[]; line: number }
  | { k: 'while'; cond: Expr; body: Stmt[]; line: number }
  | { k: 'pass'; line: number }

export class LangError extends Error {
  constructor(message: string, public line: number) {
    super(`line ${line}: ${message}`)
  }
}

// ── Tokeniser ──────────────────────────────────────────────────────────────

type Tok = { t: 'num'; v: number } | { t: 'name'; v: string } | { t: 'op'; v: string }

const OPS = ['//=', '+=', '-=', '*=', '//', '<=', '>=', '==', '!=', '+', '-', '*', '%', '<', '>', '=', '(', ')', ',', ':']

function tokenize(src: string, line: number): Tok[] {
  const out: Tok[] = []
  let i = 0
  while (i < src.length) {
    const ch = src[i]
    if (ch === ' ' || ch === '\t') { i++; continue }
    if (/[0-9]/.test(ch)) {
      let j = i
      while (j < src.length && /[0-9_]/.test(src[j])) j++
      out.push({ t: 'num', v: Number(src.slice(i, j).replace(/_/g, '')) })
      i = j
      continue
    }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++
      out.push({ t: 'name', v: src.slice(i, j) })
      i = j
      continue
    }
    const op = OPS.find((o) => src.startsWith(o, i))
    if (!op) throw new LangError(`unexpected character "${ch}"`, line)
    if (op === '//=') throw new LangError('//= is not supported; write x = x // n', line)
    out.push({ t: 'op', v: op })
    i += op.length
  }
  return out
}

// ── Expression parser (precedence climbing) ────────────────────────────────

const KEYWORDS = new Set(['and', 'or', 'not', 'if', 'elif', 'else', 'for', 'in', 'while', 'print', 'range', 'True', 'False', 'pass', 'abs', 'min', 'max'])

class P {
  i = 0
  constructor(public toks: Tok[], public line: number) {}
  peek(): Tok | undefined { return this.toks[this.i] }
  isOp(v: string) { const t = this.peek(); return !!t && t.t === 'op' && t.v === v }
  isName(v: string) { const t = this.peek(); return !!t && t.t === 'name' && t.v === v }
  expectOp(v: string) {
    if (!this.isOp(v)) throw new LangError(`expected "${v}"`, this.line)
    this.i++
  }
  done() { return this.i >= this.toks.length }

  expr(): Expr { return this.or() }
  or(): Expr {
    let l = this.and()
    while (this.isName('or')) { this.i++; l = { k: 'bin', op: 'or', l, r: this.and() } }
    return l
  }
  and(): Expr {
    let l = this.not()
    while (this.isName('and')) { this.i++; l = { k: 'bin', op: 'and', l, r: this.not() } }
    return l
  }
  not(): Expr {
    if (this.isName('not')) { this.i++; return { k: 'un', op: 'not', e: this.not() } }
    return this.cmp()
  }
  cmp(): Expr {
    const l = this.add()
    const t = this.peek()
    if (t && t.t === 'op' && ['<', '<=', '>', '>=', '==', '!='].includes(t.v)) {
      this.i++
      const r = this.add()
      const n = this.peek()
      if (n && n.t === 'op' && ['<', '<=', '>', '>=', '==', '!='].includes(n.v)) throw new LangError('chained comparisons are not supported', this.line)
      return { k: 'bin', op: t.v as BinOp, l, r }
    }
    return l
  }
  add(): Expr {
    let l = this.mul()
    for (;;) {
      const t = this.peek()
      if (t && t.t === 'op' && (t.v === '+' || t.v === '-')) { this.i++; l = { k: 'bin', op: t.v, l, r: this.mul() } }
      else return l
    }
  }
  mul(): Expr {
    let l = this.unary()
    for (;;) {
      const t = this.peek()
      if (t && t.t === 'op' && (t.v === '*' || t.v === '//' || t.v === '%')) { this.i++; l = { k: 'bin', op: t.v as BinOp, l, r: this.unary() } }
      else return l
    }
  }
  unary(): Expr {
    if (this.isOp('-')) { this.i++; return { k: 'un', op: '-', e: this.unary() } }
    if (this.isOp('+')) { this.i++; return this.unary() }
    return this.atom()
  }
  atom(): Expr {
    const t = this.peek()
    if (!t) throw new LangError('expression ends too early', this.line)
    if (t.t === 'num') { this.i++; return { k: 'num', v: t.v } }
    if (t.t === 'op' && t.v === '(') {
      this.i++
      const e = this.expr()
      this.expectOp(')')
      return e
    }
    if (t.t === 'name') {
      if (t.v === 'True' || t.v === 'False') { this.i++; return { k: 'bool', v: t.v === 'True' } }
      if (t.v === 'abs' || t.v === 'min' || t.v === 'max') {
        this.i++
        const args = this.callArgs()
        if (t.v === 'abs' && args.length !== 1) throw new LangError('abs() takes one value', this.line)
        if (t.v !== 'abs' && args.length < 2) throw new LangError(`${t.v}() needs at least two values`, this.line)
        return { k: 'call', fn: t.v, args }
      }
      if (KEYWORDS.has(t.v)) throw new LangError(`"${t.v}" cannot be used here`, this.line)
      this.i++
      return { k: 'var', name: t.v }
    }
    throw new LangError(`unexpected "${t.v}"`, this.line)
  }
  callArgs(): Expr[] {
    this.expectOp('(')
    const args: Expr[] = []
    if (!this.isOp(')')) {
      args.push(this.expr())
      while (this.isOp(',')) { this.i++; args.push(this.expr()) }
    }
    this.expectOp(')')
    return args
  }
}

// ── Statement parser (indentation blocks) ──────────────────────────────────

interface SrcLine { indent: number; text: string; line: number }

export function parse(code: string): Stmt[] {
  const lines: SrcLine[] = []
  code.replace(/\r/g, '').split('\n').forEach((raw, idx) => {
    const noComment = raw.replace(/#.*$/, '')
    if (!noComment.trim()) return
    const expanded = noComment.replace(/\t/g, '    ')
    const indent = expanded.length - expanded.trimStart().length
    lines.push({ indent, text: expanded.trim(), line: idx + 1 })
  })
  let pos = 0
  const block = (indent: number): Stmt[] => {
    const out: Stmt[] = []
    while (pos < lines.length) {
      const l = lines[pos]
      if (l.indent < indent) break
      if (l.indent > indent) throw new LangError('unexpected indent', l.line)
      out.push(statement(l, indent))
    }
    return out
  }
  const childBlock = (header: SrcLine): Stmt[] => {
    const next = lines[pos]
    if (!next || next.indent <= header.indent) throw new LangError('expected an indented block after ":"', header.line)
    return block(next.indent)
  }
  const statement = (l: SrcLine, indent: number): Stmt => {
    pos++
    const toks = tokenize(l.text, l.line)
    const p = new P(toks, l.line)
    const head = toks[0]
    const endColon = () => {
      const last = toks[toks.length - 1]
      if (!last || last.t !== 'op' || last.v !== ':') throw new LangError('this line must end with ":"', l.line)
      p.toks = toks.slice(0, -1)
    }
    if (head.t === 'name' && head.v === 'pass') {
      if (toks.length > 1) throw new LangError('pass stands alone', l.line)
      return { k: 'pass', line: l.line }
    }
    if (head.t === 'name' && head.v === 'print') {
      p.i = 1
      const args = p.callArgs()
      if (args.length === 0) throw new LangError('print() needs a value', l.line)
      if (!p.done()) throw new LangError('unexpected text after print(...)', l.line)
      return { k: 'print', args, line: l.line }
    }
    if (head.t === 'name' && (head.v === 'if' || head.v === 'while')) {
      endColon()
      p.i = 1
      const cond = p.expr()
      if (!p.done()) throw new LangError('unexpected text in condition', l.line)
      const body = childBlock(l)
      if (head.v === 'while') return { k: 'while', cond, body, line: l.line }
      const branches: { cond: Expr | null; body: Stmt[]; line: number }[] = [{ cond, body, line: l.line }]
      while (pos < lines.length && lines[pos].indent === indent && /^(elif\b|else\s*:)/.test(lines[pos].text)) {
        const el = lines[pos]
        pos++
        const et = tokenize(el.text, el.line)
        const last = et[et.length - 1]
        if (!last || last.t !== 'op' || last.v !== ':') throw new LangError('this line must end with ":"', el.line)
        if (et[0].t === 'name' && et[0].v === 'else') {
          if (et.length !== 2) throw new LangError('else takes no condition', el.line)
          branches.push({ cond: null, body: childBlock(el), line: el.line })
          break
        }
        const ep = new P(et.slice(1, -1), el.line)
        const c = ep.expr()
        if (!ep.done()) throw new LangError('unexpected text in condition', el.line)
        branches.push({ cond: c, body: childBlock(el), line: el.line })
      }
      return { k: 'if', branches, line: l.line }
    }
    if (head.t === 'name' && (head.v === 'elif' || head.v === 'else')) throw new LangError(`${head.v} without a matching if`, l.line)
    if (head.t === 'name' && head.v === 'for') {
      endColon()
      const v = toks[1]
      if (!v || v.t !== 'name' || KEYWORDS.has(v.v)) throw new LangError('for needs a variable name', l.line)
      if (!(toks[2]?.t === 'name' && toks[2].v === 'in' && toks[3]?.t === 'name' && toks[3].v === 'range')) throw new LangError('only "for x in range(...)" is supported', l.line)
      p.i = 4
      const args = p.callArgs()
      if (args.length < 1 || args.length > 3) throw new LangError('range() takes 1 to 3 values', l.line)
      if (!p.done()) throw new LangError('unexpected text after range(...)', l.line)
      return { k: 'for', name: v.v, args, body: childBlock(l), line: l.line }
    }
    if (head.t === 'name' && !KEYWORDS.has(head.v) && toks[1]?.t === 'op' && ['=', '+=', '-=', '*='].includes(toks[1].v)) {
      p.i = 2
      const e = p.expr()
      if (!p.done()) throw new LangError('unexpected text after the value', l.line)
      return { k: 'assign', name: head.v, op: toks[1].v as '=' | '+=' | '-=' | '*=', e, line: l.line }
    }
    throw new LangError('this line is not a statement this robot understands', l.line)
  }
  const prog = block(0)
  if (pos < lines.length) throw new LangError('unexpected indent', lines[pos].line)
  return prog
}

// ── Interpreter with a full trace ──────────────────────────────────────────

export interface TraceStep {
  /** Source line (1-based) being executed. */
  line: number
  /** Variables AFTER this step. */
  vars: Record<string, Value>
  /** Output lines so far (after this step). */
  out: string[]
  /** What happened, in words ("speed = 4", "condition is False", "printed 8"). */
  note: string
}

export interface RunOutput {
  out: string[]
  vars: Record<string, Value>
  trace: TraceStep[]
  error?: string
  errorLine?: number
}

export const fmt = (v: Value): string => (typeof v === 'boolean' ? (v ? 'True' : 'False') : String(v))

export function run(prog: Stmt[], maxSteps = 500): RunOutput {
  const vars: Record<string, Value> = {}
  const out: string[] = []
  const trace: TraceStep[] = []
  let steps = 0
  const record = (line: number, note: string) => {
    steps++
    if (steps > maxSteps) throw new LangError(`the program ran more than ${maxSteps} steps — an endless loop?`, line)
    trace.push({ line, vars: { ...vars }, out: [...out], note })
  }
  const num = (v: Value, line: number): number => {
    if (typeof v !== 'number') throw new LangError('maths on True/False is not allowed here', line)
    return v
  }
  const ev = (e: Expr, line: number): Value => {
    switch (e.k) {
      case 'num': return e.v
      case 'bool': return e.v
      case 'var':
        if (!(e.name in vars)) throw new LangError(`"${e.name}" is used before it has a value`, line)
        return vars[e.name]
      case 'un': {
        const v = ev(e.e, line)
        if (e.op === 'not') {
          if (typeof v !== 'boolean') throw new LangError('not needs True or False', line)
          return !v
        }
        return -num(v, line)
      }
      case 'call': {
        const a = e.args.map((x) => num(ev(x, line), line))
        if (e.fn === 'abs') return Math.abs(a[0])
        return e.fn === 'min' ? Math.min(...a) : Math.max(...a)
      }
      case 'bin': {
        if (e.op === 'and' || e.op === 'or') {
          const l = ev(e.l, line)
          if (typeof l !== 'boolean') throw new LangError(`${e.op} needs True or False`, line)
          if (e.op === 'and' && !l) return false
          if (e.op === 'or' && l) return true
          const r = ev(e.r, line)
          if (typeof r !== 'boolean') throw new LangError(`${e.op} needs True or False`, line)
          return r
        }
        const lv = ev(e.l, line)
        const rv = ev(e.r, line)
        if (e.op === '==') return lv === rv
        if (e.op === '!=') return lv !== rv
        const l = num(lv, line)
        const r = num(rv, line)
        let res: Value
        switch (e.op) {
          case '+': res = l + r; break
          case '-': res = l - r; break
          case '*': res = l * r; break
          case '//':
            if (r === 0) throw new LangError('division by zero', line)
            res = Math.floor(l / r); break
          case '%':
            if (r === 0) throw new LangError('division by zero', line)
            res = ((l % r) + r) % r; break
          case '<': res = l < r; break
          case '<=': res = l <= r; break
          case '>': res = l > r; break
          case '>=': res = l >= r; break
          default: throw new LangError('unknown operator', line)
        }
        if (typeof res === 'number' && Math.abs(res) > 1e9) throw new LangError('number too big', line)
        return res
      }
    }
  }
  const truthy = (v: Value, line: number): boolean => {
    if (typeof v !== 'boolean') throw new LangError('a condition must be True or False (use a comparison like x > 3)', line)
    return v
  }
  const exec = (list: Stmt[]) => {
    for (const s of list) {
      switch (s.k) {
        case 'pass': record(s.line, 'nothing happens'); break
        case 'assign': {
          const v = ev(s.e, s.line)
          if (s.op === '=') vars[s.name] = v
          else {
            if (!(s.name in vars)) throw new LangError(`"${s.name}" is used before it has a value`, s.line)
            const cur = num(vars[s.name], s.line)
            const d = num(v, s.line)
            vars[s.name] = s.op === '+=' ? cur + d : s.op === '-=' ? cur - d : cur * d
          }
          record(s.line, `${s.name} = ${fmt(vars[s.name])}`)
          break
        }
        case 'print': {
          const text = s.args.map((a) => fmt(ev(a, s.line))).join(' ')
          out.push(text)
          record(s.line, `printed ${text}`)
          break
        }
        case 'if': {
          for (const b of s.branches) {
            if (b.cond === null) {
              record(b.line, 'no condition was True, so the else part runs')
              exec(b.body)
              break
            }
            const c = truthy(ev(b.cond, b.line), b.line)
            record(b.line, `condition is ${fmt(c)}`)
            if (c) {
              exec(b.body)
              break
            }
          }
          break
        }
        case 'for': {
          const a = s.args.map((x) => num(ev(x, s.line), s.line))
          const [start, stop, step] = a.length === 1 ? [0, a[0], 1] : a.length === 2 ? [a[0], a[1], 1] : [a[0], a[1], a[2]]
          if (step === 0) throw new LangError('range() step cannot be 0', s.line)
          for (let i = start; step > 0 ? i < stop : i > stop; i += step) {
            vars[s.name] = i
            record(s.line, `${s.name} = ${i}`)
            exec(s.body)
          }
          break
        }
        case 'while': {
          for (;;) {
            const c = truthy(ev(s.cond, s.line), s.line)
            record(s.line, `condition is ${fmt(c)}`)
            if (!c) break
            exec(s.body)
          }
          break
        }
      }
    }
  }
  try {
    exec(prog)
  } catch (err) {
    if (err instanceof LangError) return { out, vars, trace, error: err.message, errorLine: err.line }
    throw err
  }
  return { out, vars, trace }
}

/** Every variable name assigned or used as a loop variable, in first-seen order. */
export function variableNames(prog: Stmt[]): string[] {
  const names: string[] = []
  const add = (n: string) => { if (!names.includes(n)) names.push(n) }
  const walk = (list: Stmt[]) => {
    for (const s of list) {
      if (s.k === 'assign') add(s.name)
      if (s.k === 'for') { add(s.name); walk(s.body) }
      if (s.k === 'while') walk(s.body)
      if (s.k === 'if') s.branches.forEach((b) => walk(b.body))
    }
  }
  walk(prog)
  return names
}

// ── Friendly "blocks" rendering ────────────────────────────────────────────

const PREC: Record<BinOp, number> = { or: 1, and: 2, '<': 4, '<=': 4, '>': 4, '>=': 4, '==': 4, '!=': 4, '+': 5, '-': 5, '*': 6, '//': 6, '%': 6 }
const FRIENDLY: Record<BinOp, string> = { or: 'or', and: 'and', '<': '<', '<=': '≤', '>': '>', '>=': '≥', '==': '=', '!=': '≠', '+': '+', '-': '−', '*': '×', '//': '÷', '%': 'remainder' }

export function exprText(e: Expr, friendly: boolean, parent = 0): string {
  switch (e.k) {
    case 'num': return e.v < 0 && friendly ? `−${-e.v}` : String(e.v)
    case 'bool': return friendly ? (e.v ? 'true' : 'false') : e.v ? 'True' : 'False'
    case 'var': return e.name
    case 'un': return e.op === 'not' ? `not ${exprText(e.e, friendly, 3)}` : `${friendly ? '−' : '-'}${exprText(e.e, friendly, 7)}`
    case 'call': return `${e.fn}(${e.args.map((a) => exprText(a, friendly)).join(', ')})`
    case 'bin': {
      const p = PREC[e.op]
      const s = `${exprText(e.l, friendly, p)} ${friendly ? FRIENDLY[e.op] : e.op} ${exprText(e.r, friendly, p + 1)}`
      return p < parent ? `(${s})` : s
    }
  }
}

export interface BlockRow {
  line: number
  depth: number
  text: string
  kind: 'set' | 'change' | 'say' | 'loop' | 'if' | 'else' | 'pass'
}

/** One friendly block per source line, for younger children. */
export function blockRows(prog: Stmt[], depth = 0, out: BlockRow[] = []): BlockRow[] {
  for (const s of prog) {
    switch (s.k) {
      case 'assign': {
        const v = exprText(s.e, true)
        if (s.op === '=') out.push({ line: s.line, depth, text: `set ${s.name} to ${v}`, kind: 'set' })
        else if (s.op === '+=') out.push({ line: s.line, depth, text: `change ${s.name} by ${v}`, kind: 'change' })
        else if (s.op === '-=') out.push({ line: s.line, depth, text: `change ${s.name} by −${s.e.k === 'num' || s.e.k === 'var' ? v : `(${v})`}`, kind: 'change' })
        else out.push({ line: s.line, depth, text: `multiply ${s.name} by ${v}`, kind: 'change' })
        break
      }
      case 'print': out.push({ line: s.line, depth, text: `say ${s.args.map((a) => exprText(a, true)).join(' and ')}`, kind: 'say' }); break
      case 'pass': out.push({ line: s.line, depth, text: 'do nothing', kind: 'pass' }); break
      case 'for': {
        const a = s.args.map((x) => exprText(x, true))
        const text = s.args.length === 1 && s.args[0].k === 'num'
          ? `repeat ${a[0]} times  (${s.name} counts 0 → ${s.args[0].v - 1})`
          : `for ${s.name} from ${s.args.length === 1 ? '0' : a[0]} up to ${s.args.length === 1 ? a[0] : a[1]} (not including it)${s.args.length === 3 ? `, step ${a[2]}` : ''}`
        out.push({ line: s.line, depth, text, kind: 'loop' })
        blockRows(s.body, depth + 1, out)
        break
      }
      case 'while':
        out.push({ line: s.line, depth, text: `repeat while ${exprText(s.cond, true)}`, kind: 'loop' })
        blockRows(s.body, depth + 1, out)
        break
      case 'if':
        s.branches.forEach((b, i) => {
          out.push({ line: b.line, depth, text: b.cond === null ? 'else' : `${i === 0 ? 'if' : 'else if'} ${exprText(b.cond, true)}`, kind: b.cond === null ? 'else' : 'if' })
          blockRows(b.body, depth + 1, out)
        })
        break
    }
  }
  return out
}
