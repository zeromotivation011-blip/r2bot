// components/kids/galaxy/hint-ladder.verify.ts
// Roadmap #26 checks (CI): every Skill Galaxy activity gets a "Spark shows me"
// twin of the same template whose worked steps read as real words, whose
// "why" is the template's own feedback on a verified solution, and whose
// answer is never the child's own answer. The same for every Code Lab
// mission, plus a second clue for every template.
//   npx tsx components/kids/galaxy/hint-ladder.verify.ts

import { ALL_ACTIVITIES } from '@/lib/kids/activities/content'
import { TEMPLATE_LOGIC } from '@/lib/kids/activities/logic-registry'
import { TEMPLATE_IDS } from '@/lib/kids/activities/logic-registry'
import { MISSIONS } from '@/lib/kids/code-lab/missions'
import { codeLabTwin, codeLabWorked } from '@/components/kids/codelab/worked-twin'
import { describeSolution, pickTwin, workedTwinFor } from './worked-solution'
import { TEMPLATE_TIP } from './hint-tips'

const check = (t: keyof typeof TEMPLATE_LOGIC, p: unknown, s: unknown) => TEMPLATE_LOGIC[t].check(p, s)

let fails = 0
const fail = (msg: string) => {
  fails++
  if (fails <= 40) console.log('✗', msg)
}
const BAD = /undefined|NaN|\[object|Infinity|(^|\s)\?(\s|$)/
const GENERIC = 'Spark tried one idea, tested it, and changed one thing at a time until it worked.'

let withTwin = 0
let sameBand = 0
for (const a of ALL_ACTIVITIES) {
  // Every solution must describe cleanly (it may itself be a twin for others).
  if (a.solution !== undefined) {
    const steps = describeSolution(a.template, a.params, a.solution)
    if (!steps.length) fail(`${a.id}: no worked steps`)
    if (steps.length > 12) fail(`${a.id}: ${steps.length} steps (max 12)`)
    if (steps.length === 1 && steps[0] === GENERIC) fail(`${a.id}: describer fell back to the generic step`)
    for (const s of steps) {
      if (!s.trim()) fail(`${a.id}: empty step`)
      if (BAD.test(s)) fail(`${a.id}: bad text in step “${s}”`)
      if (s.length > 220) fail(`${a.id}: step too long (${s.length} chars)`)
    }
  }
  const w = workedTwinFor(a, ALL_ACTIVITIES, check)
  if (!w) {
    fail(`${a.id}: no twin for template ${a.template}`)
    continue
  }
  withTwin++
  const twin = pickTwin(a, ALL_ACTIVITIES)
  if (!twin) continue
  if (twin.id === a.id) fail(`${a.id}: twin is itself`)
  if (twin.template !== a.template) fail(`${a.id}: twin ${twin.id} has another template`)
  if (twin.band === a.band) sameBand++
  const order = ['explorers', 'builders', 'inventors', 'engineers']
  if (Math.abs(order.indexOf(twin.band) - order.indexOf(a.band)) > 1) fail(`${a.id} (${a.band}): twin ${twin.id} is from ${twin.band}, more than one band away`)
  if (!w.why) fail(`${a.id}: twin ${twin.id} has no “why” (its solution did not pass check())`)
  if (a.solution !== undefined && JSON.stringify(twin.solution) === JSON.stringify(a.solution)) fail(`${a.id}: twin ${twin.id} has the SAME answer — it would give the answer away`)
  if (JSON.stringify(w).length > 6000) fail(`${a.id}: worked twin payload is ${JSON.stringify(w).length} bytes`)
}

// Second clue: one strategy tip per template.
for (const t of TEMPLATE_IDS) {
  const tip = TEMPLATE_TIP[t]
  if (!tip || tip.length < 20) fail(`template ${t}: no strategy tip`)
}

// Code Lab: a twin mission for every mission, never the same program.
let labTwins = 0
for (const m of MISSIONS) {
  const twin = codeLabTwin(m, MISSIONS)
  const w = codeLabWorked(m.id)
  if (!twin || !w) {
    fail(`code lab ${m.id}: no twin mission`)
    continue
  }
  labTwins++
  if (twin.id === m.id) fail(`code lab ${m.id}: twin is itself`)
  const shape = (x: unknown) => JSON.stringify(x, (k, v: unknown) => (k === 'id' ? undefined : v))
  if (shape(twin.solution) === shape(m.solution)) fail(`code lab ${m.id}: twin ${twin.id} has the SAME program — it would give the answer away`)
  if (!w.steps.length) fail(`code lab ${m.id}: twin has no steps`)
  for (const s of w.steps) if (!s.trim() || BAD.test(s)) fail(`code lab ${m.id}: bad step “${s}”`)
  if (!w.why) fail(`code lab ${m.id}: twin has no learning goal`)
}
console.log(`${MISSIONS.length} Code Lab missions · ${labTwins} with a twin`)

console.log(`${ALL_ACTIVITIES.length} activities · ${withTwin} with a worked twin · ${sameBand} twins in the same band`)
if (fails) {
  console.log(`✗ ${fails} problem(s)`)
  process.exit(1)
}
console.log('✓ hint ladder: every activity and Code Lab mission has a clean twin that never gives its answer away, and every template has a clue')
