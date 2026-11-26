// lib/kids/ai/talk/test-parser.ts
// Tests for Talk to Your Robot. Pure Node, no browser:
//   1. 65 phrases → the exact block program (as an outline), the clarifying
//      questions they must raise, and phrases that must NOT be understood;
//   2. answering a question changes the program the way the child chose;
//   3. "how I understood you" steps carry tokens, intents and block ids;
//   4. the strict schema used for the optional AI helper rejects junk and
//      re-issues ids, and drops "say" words the child never wrote;
//   5. every parsed program survives the Blockly JSON round trip;
//   6. every mission's tested plan succeeds headless in the real physics
//      engine for all four bodies, and every "fix it" plan fails;
//   7. the parser is deterministic.
//
// Run:  npx tsx lib/kids/ai/talk/test-parser.ts

import { blocklyToProgram, programToBlockly } from '../../sim/blockly-json'
import { createChallengeRun, judgeChallengeRun } from '../../sim/challenge'
import { DT } from '../../sim/engine'
import type { Program } from '../../sim/program'
import { loadRapier } from '../../sim/rapier'
import { DEFAULT_DESIGN, type BodyId } from '../../robot-design'
import { programOutline } from './describe'
import { canonicalise, missionDesign, TALK_MISSIONS, missionsFor } from './missions'
import { parsePlan } from './parser'
import { validateProgram } from './schema'
import { kidSafeSay, looksPrivate } from './privacy'
import { withBlocksAtUnknown } from './parser'

let failures = 0
let passes = 0
function check(name: string, ok: boolean, detail = ''): void {
  if (ok) passes++
  else {
    failures++
    console.error(`✗ ${name}${detail ? `\n    ${detail}` : ''}`)
  }
}

const outline = (p: Program) => programOutline(p.body).join(' / ')

// ── 1. Phrases → programs ────────────────────────────────────────────────
// [words, expected outline, question kinds that must be asked, true = must be unknown]
const CASES: [string, string, string[], true?][] = [
  ["drive forward 50 cm", "drive 50 cm at 50%", []],
  ["Go forward three metres", "drive 300 cm at 50%", []],
  ["move ahead twenty five centimetres please", "drive 25 cm at 50%", []],
  ["reverse slowly for two seconds", "drive at -30% for 2 s", []],
  ["back up 10 cm", "drive -10 cm at 50%", []],
  ["drive fast for 2 seconds", "drive at 80% for 2 s", []],
  ["drive at 70 percent for 1.5 seconds", "drive at 70% for 1.5 s", []],
  ["drive forward 3 steps", "drive 60 cm at 50%", []],
  ["drive half a metre", "drive 50 cm at 50%", []],
  ["drive forward 30", "drive 30 cm at 50%", ["unit"]],
  ["turn left", "turn 90° left", []],
  ["turn right 45 degrees", "turn 45° right", []],
  ["turn 90° clockwise", "turn 90° right", []],
  ["turn anticlockwise 30 degrees", "turn 30° left", []],
  ["turn", "turn 90° left", ["dir"]],
  ["turn right a bit", "turn 30° right", ["howfar"]],
  ["turn left 2", "turn 180° left", ["turnunit"]],
  ["turn around", "turn 180° left", []],
  ["spin around twice", "repeat 2 times /   turn 360° left", []],
  ["do a u-turn", "turn 180° left", []],
  ["turn left one hundred and twenty degrees", "turn 120° left", []],
  ["drive until the wall is close", "motors: left 50%, right 50% / repeat until distance < 20 cm / stop motors", []],
  ["drive until the wall is 10 cm away", "motors: left 50%, right 50% / repeat until distance < 10 cm / stop motors", []],
  ["drive forward until you are 15 cm from the wall", "motors: left 50%, right 50% / repeat until distance < 15 cm / stop motors", []],
  ["go until you bump into something", "motors: left 50%, right 50% / repeat until bumped / stop motors", []],
  ["drive until you see red", "motors: left 50%, right 50% / repeat until floor colour = “red” / stop motors", []],
  ["drive to the red mat and beep", "motors: left 50%, right 50% / repeat until floor colour = “red” / stop motors / beep", []],
  ["drive forward until the line", "motors: left 50%, right 50% / repeat until line seen / stop motors", []],
  ["keep turning left until you see the line", "motors: left -30%, right 30% / repeat until line seen / stop motors", []],
  ["drive while the floor is white", "motors: left 50%, right 50% / repeat until not floor colour = “white” / stop motors", []],
  ["drive forward, turn left at the wall, then pick up the red box", "motors: left 50%, right 50% / repeat until distance < 20 cm / stop motors / turn 90° left / close claw", []],
  ["when you see red, stop", "motors: left 50%, right 50% / repeat until floor colour = “red” / stop motors", []],
  ["at the wall turn right", "motors: left 50%, right 50% / repeat until distance < 20 cm / stop motors / turn 90° right", []],
  ["drive to the box, grab it, turn around and drive back 50 cm, then drop it", "motors: left 50%, right 50% / repeat until distance < 35 cm / stop motors / drive 25 cm at 30% / close claw / turn 180° left / drive -50 cm at 50% / open claw", ["back"]],
  ["repeat 4 times: drive 30 cm and turn left 90 degrees", "repeat 4 times /   drive 30 cm at 50% /   turn 90° left", []],
  ["drive 20 cm and turn left 4 times", "repeat 4 times /   drive 20 cm at 50% /   turn 90° left", []],
  ["drive 30 cm three times", "repeat 3 times /   drive 30 cm at 50%", []],
  ["repeat: drive and turn", "repeat 2 times /   drive 30 cm at 50% /   turn 90° left", ["repeat", "dir"]],
  ["forever: if the wall is close turn right, otherwise drive 10 cm", "forever /   if distance < 20 cm … else … /     turn 90° right /   else /     drive 10 cm at 50%", []],
  ["if the wall is close turn left otherwise drive forward 10 cm", "if distance < 20 cm … else … /   turn 90° left / else /   drive 10 cm at 50%", []],
  ["turn left if you see red", "if floor colour = “red” /   turn 90° left", []],
  ["follow the line until you see green", "repeat until floor colour = “green” /   motors: left (40 + (35 × line offset))%, right (40 - (35 × line offset))% / stop motors", []],
  ["follow the line", "forever /   motors: left (40 + (35 × line offset))%, right (40 - (35 × line offset))%", []],
  ["draw a square", "pen down / repeat 4 times /   drive 30 cm at 50% /   turn 90° left / pen up", []],
  ["draw a triangle with 40 cm sides", "pen down / repeat 3 times /   drive 40 cm at 50% /   turn 120° left / pen up", []],
  ["draw a star", "pen down / repeat 5 times /   drive 30 cm at 50% /   turn 144° left / pen up", []],
  ["draw a circle", "pen down / repeat 36 times /   drive 3.5 cm at 30% /   turn 10° left / pen up", []],
  ["draw a line of 20 cm", "pen down / drive 20 cm at 50% / pen up", []],
  ["pen down, drive 20 cm, pen up", "pen down / drive 20 cm at 50% / pen up", []],
  ["turn on the light, drive for 3 seconds, then say \"I can see!\"", "light on / drive at 50% for 3 s / say “I can see!”", []],
  ["switch the lights off", "light off", []],
  ["say hello", "say “hello”", []],
  ["say 'turn left now!'", "say “turn left now!”", []],
  ["beep twice", "repeat 2 times /   beep", []],
  ["wait 2 seconds then beep", "wait 2 s / beep", []],
  ["wait", "wait 1 s", []],
  ["stop for 2 seconds", "stop motors / wait 2 s", []],
  ["dance", "repeat 2 times /   turn 45° left /   turn 45° right / beep", []],
  ["drive forward 20 cm. do it again", "drive 20 cm at 50% / drive 20 cm at 50%", []],
  ["go left", "turn 90° left / drive 30 cm at 50%", []],
  ["fly to the moon", "", [], true],
  ["drive 5 metres", "drive 300 cm at 50%", []],
  ["Please could you drive forward 40 cm and then say done", "drive 40 cm at 50% / say “done”", []],
  ["first drive one metre, after that turn right ninety degrees, finally beep", "drive 100 cm at 50% / turn 90° right / beep", []],
  ["drive forward, at the wall turn right", "motors: left 50%, right 50% / repeat until distance < 20 cm / stop motors / turn 90° right", []],
]

for (const [words, want, qs, unknown] of CASES) {
  const r = parsePlan(words)
  check(`outline: ${words}`, outline(r.program) === want, `got:  ${outline(r.program)}\n    want: ${want}`)
  const kinds = r.questions.map((q) => q.id.split('|')[0])
  check(`questions: ${words}`, JSON.stringify(kinds) === JSON.stringify(qs), `got ${JSON.stringify(kinds)} want ${JSON.stringify(qs)}`)
  check(`unknown: ${words}`, (r.unknown.length > 0) === Boolean(unknown), `unknown = ${JSON.stringify(r.unknown)}`)
  check(`ok flag: ${words}`, r.ok === (!unknown && qs.length === 0 && r.blockCount > 0))
}
check('at least 40 phrases', CASES.length >= 40, String(CASES.length))

// ── 2. Answers ───────────────────────────────────────────────────────────
{
  const r1 = parsePlan('turn')
  const q = r1.questions[0]
  const r2 = parsePlan('turn', { answers: { [q.id]: 'right' } })
  check('answer: turn → right', outline(r2.program) === 'turn 90° right' && r2.ok && r2.questions.length === 0, outline(r2.program))
  const r3 = parsePlan('drive forward 30', { answers: { 'unit|drive forward 30': 's' } })
  check('answer: 30 → seconds', outline(r3.program) === 'drive at 50% for 30 s' && r3.ok, outline(r3.program))
  const r4 = parsePlan('turn right a bit', { answers: { 'howfar|turn right a bit': '15' } })
  check('answer: a bit → 15°', outline(r4.program) === 'turn 15° right', outline(r4.program))
  const r5 = parsePlan('turn left 2', { answers: { 'turnunit|turn left 2': 'deg' } })
  check('answer: 2 → degrees', outline(r5.program) === 'turn 2° left', outline(r5.program))
  const r6 = parsePlan('repeat: drive and turn', { answers: { 'repeat|repeat: drive and turn': 'forever', 'dir|turn': 'right' } })
  check('answer: repeat forever + right', outline(r6.program) === 'forever /   drive 30 cm at 50% /   turn 90° right' && r6.ok, outline(r6.program))
  const r7 = parsePlan('turn around and drive back 50 cm', { answers: { 'back|drive back 50 cm': 'forward' } })
  check('answer: back → forwards after a U-turn', outline(r7.program) === 'turn 180° left / drive 50 cm at 50%', outline(r7.program))
  const bad = parsePlan('turn', { answers: { 'dir|turn': 'up' } })
  check('a bad answer is ignored', bad.questions.length === 1)
}

// ── 3. The "how I understood you" steps ──────────────────────────────────
{
  const r = parsePlan('drive forward, turn left at the wall, then pick up the red box')
  check('steps: three pieces', r.steps.length === 3, JSON.stringify(r.steps.map((s) => s.words)))
  check('steps: open drive became drive-until', r.steps[0].intent.startsWith('MOVE forward · until'), r.steps[0].intent)
  check('steps: turn assumption written down', r.steps[1].notes.some((n) => /quarter turn/.test(n)))
  check('steps: claw explains it cannot find "the red box"', r.steps[2].notes.some((n) => /can’t go and find/.test(n)))
  const ids = new Set(r.steps.flatMap((s) => s.stmtIds))
  check('steps: every top-level block belongs to a step', r.program.body.every((s) => ids.has(s.id)))
  const toks = r.steps[1].tokens
  check('tokens: turn = action, left = direction, wall = condition', toks.some((t) => t.t === 'turn' && t.role === 'action') && toks.some((t) => t.t === 'left' && t.role === 'direction') && toks.some((t) => t.t === 'wall' && t.role === 'condition'))
  const n = parsePlan('drive twenty five cm')
  check('tokens: number words become digits', n.steps[0].tokens.some((t) => t.t === '25' && t.role === 'amount'))
  const loop = parsePlan('drive 20 cm and turn left 4 times')
  check('notes: loop scope ambiguity explained', loop.steps[0].notes.some((x) => /repeated ALL/.test(x)))
  check('depth: loop body is nested', loop.steps[1].depth === 1 && loop.steps[0].depth === 0)
  const q = parsePlan('say "hello, friend" then drive 10 cm')
  check('quotes keep commas', outline(q.program) === 'say “hello, friend” / drive 10 cm at 50%', outline(q.program))
  check('limits: max chars', parsePlan('beep '.repeat(200)).blockCount <= 80)
}

// ── 4. Schema for the AI helper ──────────────────────────────────────────
{
  const good = validateProgram({ body: [{ op: 'drive_distance', id: 'x', cm: { k: 'number', v: 9999 }, speedPct: { k: 'number', v: 50 } }, { op: 'beep', id: 'y', extra: 'ignored' }] }, 'drive far and beep')
  check('schema: accepts and clamps', good.ok && outline(good.program) === 'drive 300 cm at 50% / beep', good.ok ? outline(good.program) : good.error)
  check('schema: re-issues ids', good.ok && good.program.body.every((s) => s.id.startsWith('ai')))
  check('schema: unknown block rejected', !validateProgram({ body: [{ op: 'launch_rocket' }] }).ok)
  check('schema: unknown sensor rejected', !validateProgram({ body: [{ op: 'repeat_until', cond: { k: 'sensor', s: 'mind_reader' }, body: [] }] }).ok)
  check('schema: not a program rejected', !validateProgram('drive forward').ok && !validateProgram(null).ok && !validateProgram({ body: [] }).ok)
  check('schema: too deep rejected', !validateProgram({ body: [{ op: 'forever', body: [{ op: 'forever', body: [{ op: 'forever', body: [{ op: 'forever', body: [{ op: 'forever', body: [{ op: 'beep' }] }] }] }] }] }] }).ok)
  check('schema: too many blocks rejected', !validateProgram({ body: Array.from({ length: 41 }, () => ({ op: 'beep' })) }).ok)
  check('schema: NaN rejected', !validateProgram({ body: [{ op: 'wait', seconds: { k: 'number', v: 'lots' } }] }).ok)
  check('schema: text in a condition must be a colour', !validateProgram({ body: [{ op: 'if', cond: { k: 'compare', op: '=', a: { k: 'sensor', s: 'floor_color' }, b: { k: 'text', v: 'purple dragon' } }, then: [] }] }).ok)
  const said = validateProgram({ body: [{ op: 'say', text: { k: 'text', v: 'I am the boss' } }, { op: 'say', text: { k: 'text', v: 'Hello' } }, { op: 'beep' }] }, 'say hello and beep')
  check('schema: drops words the child never wrote', said.ok && outline(said.program) === 'say “Hello” / beep' && said.dropped.length === 1, said.ok ? outline(said.program) : said.error)
  // Non-Latin words must also have been written by the child (QA: Cyrillic / Devanagari bypass).
  const cyr = validateProgram({ body: [{ op: 'say', text: { k: 'text', v: 'hi Дурак тупой' } }, { op: 'beep' }] }, 'say hi')
  check('schema: non-Latin words not in the source are dropped', cyr.ok && outline(cyr.program) === 'beep' && cyr.dropped.length === 1, cyr.ok ? outline(cyr.program) : cyr.error)
  const dev = validateProgram({ body: [{ op: 'say', text: { k: 'text', v: 'तुम बेवकूफ हो' } }, { op: 'beep' }] }, 'नमस्ते बोलो')
  check('schema: Devanagari words not in the source are dropped', dev.ok && outline(dev.program) === 'beep', dev.ok ? outline(dev.program) : dev.error)
  const devOk = validateProgram({ body: [{ op: 'say', text: { k: 'text', v: 'नमस्ते' } }] }, 'say नमस्ते')
  check('schema: the child’s own non-Latin words are kept', devOk.ok && outline(devOk.program) === 'say “नमस्ते”', devOk.ok ? outline(devOk.program) : devOk.error)
  const mean = validateProgram({ body: [{ op: 'say', text: { k: 'text', v: 'you are stupid' } }] }, 'say you are stupid')
  check('schema: unkind say words are masked', mean.ok && !/stupid/.test(outline(mean.program)), mean.ok ? outline(mean.program) : mean.error)
  check('schema: maths in a number slot rejected', !validateProgram({ body: [{ op: 'drive_for', speedPct: { k: 'math', op: '*', a: { k: 'number', v: 9999 }, b: { k: 'number', v: 9999 } }, seconds: { k: 'number', v: 2 } }] }).ok)
  check('schema: a condition is not motor power', !validateProgram({ body: [{ op: 'set_motors', leftPct: { k: 'sensor', s: 'bumped' }, rightPct: { k: 'compare', op: '<', a: { k: 'number', v: 1 }, b: { k: 'number', v: 2 } } }] }).ok)
  check('schema: sensor as repeat count rejected', !validateProgram({ body: [{ op: 'repeat', times: { k: 'sensor', s: 'timer_s' }, body: [{ op: 'beep' }] }] }).ok)
  // Everything the parser makes is valid by the same schema.
  let allValid = true
  for (const [w] of CASES) {
    const r = parsePlan(w)
    if (r.blockCount === 0) continue
    const v = validateProgram(JSON.parse(JSON.stringify(r.program)), w)
    if (!v.ok || outline(v.program) !== outline(r.program)) {
      allValid = false
      console.error(`   schema vs parser: ${w} → ${v.ok ? outline(v.program) : v.error}`)
    }
  }
  check('schema: every parser program passes the schema unchanged', allValid)
}

// ── 4b. Privacy, kind words, stop, AI splice ─────────────────────────────
{
  for (const t of ['my email is a@b.com', 'call 98765 43210', 'my name is Alice', 'I live at 12 Main Street', 'follow @coolkid99', 'go to www.example.com', 'i am 9 years old', 'my school is Oak Primary'])
    check(`privacy: flags “${t}”`, looksPrivate(t) !== null)
  for (const t of ['drive 50 cm then turn left', 'repeat 4 times', 'do a backflip', 'say hello world', 'go to the red mat'])
    check(`privacy: allows “${t}”`, looksPrivate(t) === null, String(looksPrivate(t)))
  check('kind words: masked', kidSafeSay('you are stupid').masked && !/stupid/.test(kidSafeSay('you are stupid').text))
  check('kind words: friendly text untouched', !kidSafeSay('hello, I can see!').masked && !kidSafeSay('shell skill').masked)
  const meanSay = parsePlan('say you are stupid')
  check('parser: unkind say masked', !/stupid/.test(outline(meanSay.program)), outline(meanSay.program))
  const st = parsePlan('drive until the wall is close then stop')
  check('parser: no double stop after drive-until', st.blockCount === 3 && st.ok, `${outline(st.program)} (${st.blockCount})`)
  const st2 = parsePlan('stop then stop')
  check('parser: stop stop counts once', st2.blockCount === 1, outline(st2.program))
  const mixed = parsePlan('drive 30 cm, then do a backflip, then beep')
  check('parser: unknown piece reported alone', mixed.unknown.length === 1 && !mixed.unknown[0].includes('beep'), JSON.stringify(mixed.unknown))
  const spliced = withBlocksAtUnknown(mixed, [{ op: 'light_on', id: 'ai1' }])
  check('splice: AI blocks go where the unknown words were', outline(spliced) === outline({ body: [mixed.program.body[0], { op: 'light_on', id: 'x' }, ...mixed.program.body.slice(1)] }), outline(spliced))
  check('splice: original program untouched', outline(mixed.program) === 'drive 30 cm at 50% / beep' || !outline(mixed.program).includes('light'), outline(mixed.program))
}

// ── 5. Blockly round trip ────────────────────────────────────────────────
{
  let ok = true
  for (const [w] of CASES) {
    const p = parsePlan(w).program
    const back = blocklyToProgram(JSON.parse(JSON.stringify(programToBlockly(p))))
    if (JSON.stringify(back) !== JSON.stringify(p)) {
      ok = false
      console.error(`   round trip changed: ${w}`)
    }
  }
  check('blockly: every parsed program round-trips exactly', ok)
}

// ── 7. Determinism ───────────────────────────────────────────────────────
{
  const a = parsePlan('forever: if the wall is close turn right, otherwise drive 10 cm')
  const b = parsePlan('forever: if the wall is close turn right, otherwise drive 10 cm')
  check('deterministic', JSON.stringify(a) === JSON.stringify(b))
}

// ── 6. Missions in the real physics engine ───────────────────────────────
async function missions(): Promise<void> {
  const R = await loadRapier()
  for (const band of ['explorers', 'builders', 'inventors', 'engineers'] as const) check(`missions: 6 for ${band}`, missionsFor(band).length === 6)
  check('missions: ids unique', new Set(TALK_MISSIONS.map((m) => m.id)).size === TALK_MISSIONS.length)
  for (const m of TALK_MISSIONS) {
    const sol = parsePlan(m.solution, { answers: m.solutionAnswers })
    check(`mission ${m.id}: solution parses cleanly`, sol.ok, JSON.stringify({ q: sol.questions.map((q) => q.id), u: sol.unknown }))
    check(`mission ${m.id}: solution within par`, sol.blockCount <= m.parBlocks, `${sol.blockCount} > ${m.parBlocks}`)
    const run = (program: Program, body: BodyId) => {
      const cr = createChallengeRun(R, m.challenge, missionDesign(m, { ...DEFAULT_DESIGN, body }), program, 0)
      const cap = Math.ceil((m.challenge.arena.timeLimit + 4) / DT)
      for (let i = 0; i < cap && !cr.done; i++) cr.tick()
      const res = judgeChallengeRun(m.challenge, cr, program, [])
      cr.run.sim.dispose()
      return res
    }
    for (const body of ['box', 'dome', 'tall', 'bug'] as BodyId[]) {
      const res = run(canonicalise(sol.program, m.canonicalSays), body)
      check(`mission ${m.id}: solution succeeds (${body})`, res.success, res.message)
    }
    if (m.kind === 'fix') {
      check(`mission ${m.id}: has buggy words`, Boolean(m.starterWords))
      const bug = parsePlan(m.starterWords ?? '')
      for (const body of ['box', 'tall'] as BodyId[]) {
        const res = run(canonicalise(bug.program, m.canonicalSays), body)
        check(`mission ${m.id}: buggy words fail (${body})`, !res.success, 'the bug does not show')
      }
    }
  }
}

missions().then(
  () => {
    console.log(`\n${passes} passed, ${failures} failed`)
    process.exit(failures > 0 ? 1 : 0)
  },
  (e: unknown) => {
    console.error(e)
    process.exit(1)
  },
)
