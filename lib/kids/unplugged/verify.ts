// lib/kids/unplugged/verify.ts — run with: npx tsx lib/kids/unplugged/verify.ts
//
// Checks the unplugged Level 1 lessons (roadmap #85):
//   - every Level 1 session has exactly one unplugged lesson, and its plan is 40 minutes;
//   - every picture block of every Level 1 challenge has a paper command card with the same label;
//   - every floor-grid answer key, played on its map as the human robot would, succeeds;
//   - every printed "buggy" program really fails, and every mission deck holds the cards its answer uses;
//   - sorting sets use all three headers; the check questions have a valid answer.

import { LEVEL1_SESSIONS } from '../curriculum/level1'
import { CARDS, cardForLabel, type CardId } from './cards'
import { runMission, type Step } from './grid'
import { allUnpluggedLessons } from './index'
import { UNPLUGGED_CORES } from './lessons'

let failures = 0
let checks = 0
function check(ok: boolean, msg: string) {
  checks++
  if (!ok) {
    failures++
    console.error(`✗ ${msg}`)
  }
}

function cardsIn(steps: Step[], out = new Set<CardId>()): Set<CardId> {
  for (const s of steps) {
    out.add(s.card)
    if (s.body) cardsIn(s.body, out)
  }
  return out
}

check(UNPLUGGED_CORES.length === LEVEL1_SESSIONS.length, `cores: ${UNPLUGGED_CORES.length}, sessions: ${LEVEL1_SESSIONS.length}`)
check(new Set(UNPLUGGED_CORES.map((c) => c.number)).size === UNPLUGGED_CORES.length, 'duplicate core numbers')

for (const s of LEVEL1_SESSIONS) {
  for (const b of [...s.code.allowedBlocks, ...s.challenge.allowedBlocks]) {
    check(Boolean(cardForLabel(b.label)), `${s.id}: picture block “${b.label}” has no paper command card`)
  }
}

const lessons = allUnpluggedLessons()
for (const l of lessons) {
  check(l.totalMinutes === 40, `${l.sessionId}: plan is ${l.totalMinutes} minutes, not 40`)
  check(l.plan.every((p) => p.minutes > 0 && p.steps.length > 0), `${l.sessionId}: an empty plan block`)
  check(l.cards.length > 0, `${l.sessionId}: no command cards`)
  check(l.check.length === 3 && l.check.every((q) => q.answer >= 0 && q.answer < q.options.length), `${l.sessionId}: check questions`)
  check(l.discussion.length > 0, `${l.sessionId}: no discussion questions`)
  check(l.storyHook.length > 80, `${l.sessionId}: story hook too short`)
  if (l.mission) {
    const m = l.mission
    const r = runMission(m, m.solution)
    check(r.ok, `${l.sessionId} “${m.title}”: answer key fails — ${r.reason}`)
    for (const id of cardsIn(m.solution)) check(m.deck.includes(id), `${l.sessionId}: answer uses “${CARDS[id].label}” but the deck lacks it`)
    if (m.buggy) {
      const b = runMission(m, m.buggy)
      check(!b.ok, `${l.sessionId}: the buggy program works — it should have a bug`)
    }
    const widths = new Set(m.rows.map((row) => row.length))
    check(widths.size === 1, `${l.sessionId}: ragged map rows`)
    check(m.rows.length <= 6 && m.rows[0].length <= 6, `${l.sessionId}: map larger than 6 × 6 (too big for a classroom floor)`)
    check(l.kits.includes('floor-grid'), `${l.sessionId}: has a mission but no floor-grid kit`)
  }
  if (l.sorting) {
    const kinds = new Set(l.sorting.items.map((i) => i.answer))
    check(kinds.size === 3, `${l.sessionId}: sorting set does not use sense, think and act`)
    check(l.kits.includes('sorting'), `${l.sessionId}: sorting set without the sorting kit`)
  }
  if (l.kits.includes('paper-gears')) check(Boolean(l.gears), `${l.sessionId}: paper-gears kit without gear steps`)
}

const kitsUsed = new Set(lessons.flatMap((l) => l.kits))
for (const k of ['command-cards', 'floor-grid', 'sorting', 'paper-gears'] as const) check(kitsUsed.has(k), `no lesson uses the ${k} kit`)

console.log(`unplugged: ${lessons.length} lessons, ${lessons.filter((l) => l.mission).length} floor-grid missions, ${checks} checks`)
if (failures) {
  console.error(`${failures} failure(s)`)
  process.exit(1)
}
console.log('✓ all unplugged checks passed')
