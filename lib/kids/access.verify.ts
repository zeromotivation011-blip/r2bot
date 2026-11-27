// lib/kids/access.verify.ts — the accessibility checklist for R2BOT Kids
// (roadmap #25 / #89). Run: npx tsx lib/kids/access.verify.ts (CI: quality.yml).
//
// Part 1, the settings store: every stored value is repaired, the boot script
// sets the same <html> classes as the live store, "more time" maths.
//
// Part 2, a per-template checklist over every Skill Galaxy template
// (components/kids/activities/templates/<id>/*.tsx), read with the TypeScript
// parser (no browser):
//   names     every <button> has a name: text, an aria-label or aria-labelledby
//   labels    every <input>/<select>/<textarea> has a label (aria-label, aria-labelledby, a wrapping <label> or an id a <label htmlFor> points at)
//   keyboard  a click handler on a non-control (div, span, li, svg shapes…) also has role + tabIndex
//   alt       every <img> has alt
//   feedback  the template announces its verdict (FeedbackCard, aria-live or role="status"/"alert"), so read-aloud speaks it
//   drag      dragging is never the only way: a template that drags also has a tap/click path
//   targets   no control is given a fixed size under 44px without a min-h/min-w of 44px+
// It is a ratchet: BASELINE holds the issues known on 27 Nov 2026 (with the
// owner's to-do in the report). A NEW issue fails CI; a fixed one asks for the
// baseline to come down.

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import ts from 'typescript'
import { KIDS_SETTINGS_BOOT_SCRIPT, KIDS_SETTINGS_KEY } from './settings-boot'
import { DEFAULT_KIDS_SETTINGS, kidsTime, normalise, type KidsSettings } from './settings'

let failures = 0
let passes = 0
const fail = (msg: string) => {
  failures++
  console.error(`  ✗ ${msg}`)
}
const ok = (cond: boolean, msg: string) => {
  if (cond) passes++
  else fail(msg)
}

// ─── Part 1: the settings store ────────────────────────────────────────────

console.log('Kids settings store')
{
  const d = normalise({}, true)
  ok(JSON.stringify(d) === JSON.stringify({ ...DEFAULT_KIDS_SETTINGS }), 'empty storage gives exactly the defaults')
  const junk = normalise(
    JSON.parse('{"sound":"yes","volume":7,"textSize":"huge","timeScale":3,"scanMode":"fast","scanSpeed":0.1,"calm":1,"untimed":null,"lite3d":"x"}'),
    false,
  )
  ok(junk.sound === true && junk.volume === 1 && junk.textSize === 'normal' && junk.timeScale === 1, 'bad stored values are repaired (sound, volume, textSize, timeScale)')
  ok(junk.scanMode === 'off' && junk.scanSpeed === DEFAULT_KIDS_SETTINGS.scanSpeed && junk.calm === false && junk.untimed === false && junk.lite3d === null, 'bad stored values are repaired (scan, calm, untimed, lite3d)')
  ok(junk.voice === false, 'voice comes from its own key')
  ok(normalise({ largeText: true }, true).textSize === 'large', 'old largeText:true reads as textSize "large"')
  ok(normalise({ textSize: 'larger' }, true).largeText === true, 'largeText is derived from textSize')
  ok(normalise({ textSize: 'normal', largeText: true }, true).largeText === false, 'textSize wins over an old largeText')

  // The boot script must add the same classes the store adds (no flash of the wrong look).
  const bootClasses = (stored: Partial<KidsSettings>): string[] => {
    const added = new Set<string>()
    const fakeWindow = {
      localStorage: { getItem: (k: string) => (k === KIDS_SETTINGS_KEY ? JSON.stringify(stored) : null) },
      document: { documentElement: { classList: { add: (c: string) => added.add(c) } } },
    }
    new Function('localStorage', 'document', KIDS_SETTINGS_BOOT_SCRIPT)(fakeWindow.localStorage, fakeWindow.document)
    return [...added].sort()
  }
  const all: Partial<KidsSettings> = { textSize: 'larger', reduceMotion: true, lite3d: true, highContrast: true, dyslexia: true, colourSafe: true, readAloud: true, calm: true, scanMode: 'auto' }
  ok(
    JSON.stringify(bootClasses(all)) ===
      JSON.stringify(['kids-calm', 'kids-colour-safe', 'kids-dyslexia', 'kids-high-contrast', 'kids-large-text', 'kids-larger-text', 'kids-lite-3d', 'kids-read-aloud', 'kids-reduce-motion', 'kids-scan']),
    `boot script sets every access class (got ${bootClasses(all).join(' ')})`,
  )
  ok(bootClasses({}).length === 0, 'boot script adds nothing for the defaults')
  ok(JSON.stringify(bootClasses({ largeText: true })) === JSON.stringify(['kids-large-text']), 'boot script honours an old largeText:true')

  // "More time": the server snapshot is 1× and timed.
  const t = kidsTime()
  ok(t.scale === 1 && !t.untimed && t.limit(30) === 30, 'kidsTime() defaults to 1× and timed')
}

// ─── Part 2: the per-template checklist ────────────────────────────────────

type Check = 'names' | 'labels' | 'keyboard' | 'alt' | 'feedback' | 'drag' | 'targets'
const CHECKS: readonly Check[] = ['names', 'labels', 'keyboard', 'alt', 'feedback', 'drag', 'targets']

/**
 * Known issues on 27 Nov 2026, per template and check. Lower these as templates
 * are fixed; never raise them to turn CI green.
 */
const BASELINE: Record<string, Partial<Record<Check, number>>> = {
  // Empty since 27 Nov 2026 (Wave 2 integration): every tap-only SVG/div shape
  // either became a role="button" with Enter/Space, or carries
  // data-keyboard-twin naming the real control that does the same thing.
}

const ROOT = join(process.cwd(), 'components/kids/activities/templates')
const CONTROL_TAGS = new Set(['button', 'a', 'input', 'select', 'textarea', 'summary', 'Btn', 'Link'])
const NON_CONTROL_CLICKABLE = new Set(['div', 'span', 'li', 'p', 'section', 'article', 'svg', 'g', 'circle', 'rect', 'path', 'ellipse', 'polygon', 'text', 'img', 'td', 'tr', 'label'])
const SMALL = /(?:^|\s)(?:h|w|size)-(?:[1-9]|10)(?:\s|$)|(?:^|\s)(?:h|w)-\[(?:[1-3]\d|4[0-3])px\]/
const BIG_MIN = /min-(?:h|w)-(?:1[1-9]|[2-9]\d|\[(?:4[4-9]|[5-9]\d|\d{3})px\])/

interface Issue { check: Check; file: string; line: number; why: string }

function attrs(el: ts.JsxOpeningLikeElement): Map<string, ts.JsxAttributeLike> {
  const m = new Map<string, ts.JsxAttributeLike>()
  for (const p of el.attributes.properties) if (ts.isJsxAttribute(p)) m.set(p.name.getText(), p)
  return m
}
const hasSpread = (el: ts.JsxOpeningLikeElement) => el.attributes.properties.some(ts.isJsxSpreadAttribute)
function attrText(a: ts.JsxAttributeLike | undefined): string {
  if (!a || !ts.isJsxAttribute(a) || !a.initializer) return ''
  return a.initializer.getText()
}

/** True when the element's children give it a name (text or an expression not hidden from AT). */
function childrenName(node: ts.JsxElement): boolean {
  for (const c of node.children) {
    if (ts.isJsxText(c) && c.text.trim()) return true
    if (ts.isJsxExpression(c) && c.expression) return true
    if (ts.isJsxElement(c)) {
      const a = attrs(c.openingElement)
      if (a.has('aria-hidden')) continue
      if (childrenName(c)) return true
    }
    if (ts.isJsxSelfClosingElement(c)) {
      const tag = c.tagName.getText()
      const a = attrs(c)
      if (tag === 'img' && attrText(a.get('alt')).replace(/['"{}]/g, '').trim()) return true
      if (/^[A-Z]/.test(tag) && !a.has('aria-hidden')) return true // a component may render text
    }
    if (ts.isJsxFragment(c)) return true
  }
  return false
}

function checkFile(path: string, issues: Issue[], flags: { feedback: boolean; drags: boolean; taps: boolean }): void {
  const src = readFileSync(path, 'utf8')
  if (/FeedbackCard|FeedbackPanel|aria-live|role="status"|role="alert"/.test(src)) flags.feedback = true
  if (/draggable|onDragStart|setPointerCapture|onPointerMove/.test(src)) flags.drags = true
  if (/onClick|onKeyDown/.test(src)) flags.taps = true
  const sf = ts.createSourceFile(path, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const labelledIds = new Set<string>()
  // Ids that a <label htmlFor> points at.
  const collect = (n: ts.Node) => {
    if ((ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) && n.tagName.getText() === 'label') {
      const f = attrText(attrs(n).get('htmlFor'))
      if (f) labelledIds.add(f)
    }
    ts.forEachChild(n, collect)
  }
  collect(sf)
  const rel = relative(process.cwd(), path)
  const lineOf = (n: ts.Node) => sf.getLineAndCharacterOfPosition(n.getStart()).line + 1
  const add = (check: Check, n: ts.Node, why: string) => issues.push({ check, file: rel, line: lineOf(n), why })

  const visit = (n: ts.Node, insideLabel: boolean) => {
    if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n)) {
      const open = ts.isJsxElement(n) ? n.openingElement : n
      const tag = open.tagName.getText()
      const a = attrs(open)
      const named = a.has('aria-label') || a.has('aria-labelledby') || a.has('ariaLabel') || a.has('title') || hasSpread(open)
      if (tag === 'button' || tag === 'Btn') {
        if (!named && !(ts.isJsxElement(n) && childrenName(n))) add('names', open, `<${tag}> has no text and no aria-label`)
      }
      if (tag === 'input' || tag === 'select' || tag === 'textarea') {
        const type = attrText(a.get('type')).replace(/['"{}]/g, '')
        if (type !== 'hidden' && !named && !insideLabel && !labelledIds.has(attrText(a.get('id')))) add('labels', open, `<${tag}> has no label`)
      }
      if (tag === 'img' && !a.has('alt')) add('alt', open, '<img> has no alt')
      const clickable = a.has('onClick') || a.has('onPointerDown') || a.has('onMouseDown')
      if (clickable && NON_CONTROL_CLICKABLE.has(tag) && !CONTROL_TAGS.has(tag)) {
        const role = attrText(a.get('role'))
        // `data-keyboard-twin="<the real control>"` marks a pointer shortcut whose
        // action already has a focusable control elsewhere (scanning reaches that).
        const presentational = /presentation|none/.test(role) || a.has('data-keyboard-twin')
        if (!presentational && (!role || !a.has('tabIndex'))) add('keyboard', open, `<${tag}> takes clicks but has no role + tabIndex`)
      }
      if (tag === 'button' || tag === 'Btn' || tag === 'a') {
        const cls = attrText(a.get('className'))
        // Only the static part of className is judged.
        const staticCls = cls.replace(/\$\{[^}]*\}/g, ' ')
        if (SMALL.test(staticCls) && !BIG_MIN.test(staticCls)) add('targets', open, `<${tag}> is sized under 44px (${(staticCls.match(SMALL) ?? [''])[0].trim()})`)
      }
      const nextInside = insideLabel || tag === 'label'
      ts.forEachChild(n, (c) => visit(c, nextInside))
      return
    }
    ts.forEachChild(n, (c) => visit(c, insideLabel))
  }
  visit(sf, false)
}

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? files(p) : p.endsWith('.tsx') ? [p] : []
  })

console.log('\nSkill Galaxy templates — accessibility checklist')
const templates = readdirSync(ROOT).filter((d) => statSync(join(ROOT, d)).isDirectory()).sort()
ok(templates.length > 0, 'templates found')
let newIssues = 0
let improved = 0
const table: string[] = []
for (const id of templates) {
  const issues: Issue[] = []
  const flags = { feedback: false, drags: false, taps: false }
  for (const f of files(join(ROOT, id))) checkFile(f, issues, flags)
  // Shared kits supply the announced verdict: FeedbackCard (sequence-path/KitClient.tsx), FeedbackPanel (gear-train/TemplateFrameClient.tsx).
  if (!flags.feedback) issues.push({ check: 'feedback', file: `components/kids/activities/templates/${id}`, line: 0, why: 'no FeedbackCard / aria-live / role=status: the verdict is not announced (or spoken in read-aloud mode)' })
  if (flags.drags && !flags.taps) issues.push({ check: 'drag', file: `components/kids/activities/templates/${id}`, line: 0, why: 'drags with no tap/click path' })
  const counts = Object.fromEntries(CHECKS.map((c) => [c, issues.filter((i) => i.check === c).length])) as Record<Check, number>
  const base = BASELINE[id] ?? {}
  const row: string[] = []
  for (const c of CHECKS) {
    const n = counts[c]
    const b = base[c] ?? 0
    row.push(n === 0 ? `✓ ${c}` : `${n > b ? '✗' : '•'} ${c}:${n}`)
    if (n > b) {
      newIssues += n - b
      for (const i of issues.filter((x) => x.check === c)) fail(`${id} [${c}] ${i.file}${i.line ? `:${i.line}` : ''} — ${i.why}`)
    } else if (n < b) {
      improved++
      console.log(`  ↓ ${id} [${c}] now ${n} (baseline ${b}) — lower BASELINE in lib/kids/access.verify.ts`)
    } else {
      passes++
      for (const i of issues.filter((x) => x.check === c)) console.log(`  • known: ${id} [${c}] ${i.file}${i.line ? `:${i.line}` : ''} — ${i.why}`)
    }
  }
  table.push(`  ${id.padEnd(20)} ${row.join('  ')}`)
}
console.log(table.join('\n'))

console.log(`\n${passes} passed, ${failures} failed${newIssues ? ` (${newIssues} new template issue(s))` : ''}${improved ? `, ${improved} improved — tighten the baseline` : ''}`)
if (failures) process.exit(1)
