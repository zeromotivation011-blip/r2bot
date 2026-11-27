// lib/kids/classroom-wave2.verify.ts
//
// CI check for the Classroom wave 2 (roadmap #13, #30, #31, #40):
//   - the snapshot's new fields parse, cap and survive fitSnapshot (8 KB and
//     16 KB), and an old snapshot still parses;
//   - only COUNTS travel: free text and unknown keys are dropped;
//   - every misconception a course check can reveal (Levels 2–4) is in the
//     teacher's catalogue under a key the browser can send;
//   - the Class Mind Map and stuck signals never show something only one
//     child shares; the gradebook keeps roster order;
//   - Class Power-Up maths: window, distinct work, milestones, helpers;
//   - the device diary counts a thing once a day and only inside a class;
//   - standards: every level maps to CSTA, England and concepts with real sessions.
// Run: npx tsx lib/kids/classroom-wave2.verify.ts

import {
  EMPTY_SNAPSHOT,
  MISCONCEPTION_KEY_RE,
  SNAPSHOT_MAX_BYTES,
  SNAPSHOT_MAX_BYTES_V2,
  fitSnapshot,
  parseSnapshot,
  snapshotBytes,
  type ClassSnapshot,
  type KidsMemberRow,
} from './classroom'
import { GOAL_PRESETS, addDays, goalProgress, helpedThisWeek, milestonesReached, parseGoal, suggestedTarget, weekStart, type ClassGoal } from './classroom-goal'
import { cellEvidence, classMindMap, gradebook, gradebookCsv, mindMapHeadline, stuckSignals } from './classroom-insights'
import { getInsightCatalogue } from './classroom-insights-server'
import { allStandards } from './classroom-standards'
import { LEVEL2_SESSIONS } from './curriculum/level2'
import { LEVEL3_SESSIONS } from './curriculum/level3'
import { LEVEL4_SESSIONS } from './curriculum/level4'
import { CONCEPT_IDS } from './universe/mastery'

let failures = 0
function check(name: string, ok: boolean, detail = ''): void {
  if (ok) console.log(`  ok  ${name}`)
  else {
    failures++
    console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

// ── Snapshot ─────────────────────────────────────────────────────────────────
console.log('Snapshot (wave 2 fields)')
const old = parseSnapshot({ v: 1, totalStars: 4, activitiesDone: ['a-1'] })
check('an old snapshot parses with empty wave-2 fields', !!old && old.concepts === '' && Object.keys(old.days).length === 0 && old.activityScores === '')

const evidence = CONCEPT_IDS.map((_, i) => (i === 3 ? '3.5.2.4' : '0.0.0.-')).join('|')
const rich = parseSnapshot({
  v: 1,
  concepts: 'nnnSllnnnnnnnnnf',
  conceptEvidence: evidence,
  activitiesDone: ['loop-1', 'BAD ID', 'loop-2'],
  activityScores: '31' + '22' + '13',
  galaxyStuck: { 'loop-9': 3, 'x y': 4 },
  courseStuck: { 'L1-S05': 4, 'L9-S01': 2 },
  misconceptions: { 'L2-S04.taller-is-stronger': 2, 'L2-S04.Some free text answer': 1, 'hello': 3 },
  gameTiers: { sumo: 2, drone: 12 },
  days: { '2026-11-20': 3, '2026-02-31': 2, 'today': 1 },
  answers: ['the child typed this'],
  freeText: 'nope',
})
check('rich snapshot parses', !!rich)
if (rich) {
  check('concept code kept', rich.concepts === 'nnnSllnnnnnnnnnf')
  check('concept evidence kept', rich.conceptEvidence === evidence)
  check('scores stay aligned when a bad id is dropped', rich.activitiesDone.join(',') === 'loop-1,loop-2' && rich.activityScores === '3113', `${rich.activitiesDone} ${rich.activityScores}`)
  check('malformed ids dropped from galaxyStuck/courseStuck', Object.keys(rich.galaxyStuck).join() === 'loop-9' && Object.keys(rich.courseStuck).join() === 'L1-S05')
  check('misconceptions: only "Lx-Syy.kebab-id" keys survive (no free text)', Object.keys(rich.misconceptions).join() === 'L2-S04.taller-is-stronger')
  check('game tiers clamped to 9', rich.gameTiers.drone === 9 && rich.gameTiers.sumo === 2)
  check('days: only real calendar days', Object.keys(rich.days).join() === '2026-11-20')
  check('unknown fields never stored', !('answers' in rich) && !('freeText' in rich))
}
check('bad concept code dropped', parseSnapshot({ concepts: 'hello' })?.concepts === '')
check('bad evidence dropped', parseSnapshot({ conceptEvidence: '1.2.3' })?.conceptEvidence === '')
check('mismatched scores dropped', parseSnapshot({ activitiesDone: ['a'], activityScores: '3131' })?.activityScores === '')

// A very busy child: everything at its cap.
const busy: ClassSnapshot = {
  ...EMPTY_SNAPSHOT,
  totalStars: 9999,
  episodesDone: Object.fromEntries(Array.from({ length: 120 }, (_, i) => [`episode-number-${i}`, 3])),
  codeMissions: Object.fromEntries(Array.from({ length: 200 }, (_, i) => [`code-mission-${i}`, 2])),
  activitiesDone: Array.from({ length: 200 }, (_, i) => `activity-${i}`),
  activityScores: '31'.repeat(200),
  gamesPlayed: Array.from({ length: 15 }, (_, i) => `game-${i}`),
  concepts: 'ssssllllffffnnnn',
  conceptEvidence: evidence,
  galaxyStuck: Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`stuck-activity-${i}`, 9])),
  courseStuck: Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`L3-S${String(i + 1).padStart(2, '0')}`, 9])),
  misconceptions: Object.fromEntries(Array.from({ length: 24 }, (_, i) => [`L3-S${String(i + 1).padStart(2, '0')}.a-long-misconception-id-${i}`, 3])),
  gameTiers: Object.fromEntries(Array.from({ length: 15 }, (_, i) => [`game-${i}`, 4])),
  days: Object.fromEntries(Array.from({ length: 40 }, (_, i) => [addDays('2026-10-01', i), 12])),
}
for (const limit of [SNAPSHOT_MAX_BYTES, SNAPSHOT_MAX_BYTES_V2]) {
  const fit = fitSnapshot(busy, limit)
  check(`busy snapshot fits ${limit} bytes`, snapshotBytes(fit) <= limit, String(snapshotBytes(fit)))
  check(`  … keeps the concept grid, evidence and diary (${limit})`, fit.concepts === busy.concepts && fit.conceptEvidence === busy.conceptEvidence && Object.keys(fit.days).length === 40)
  check(`  … keeps at least 8 misconceptions (${limit})`, Object.keys(fit.misconceptions).length >= 8)
  check(`  … scores stay aligned (${limit})`, fit.activityScores.length === fit.activitiesDone.length * 2)
  check(`  … keeps 60+ activities for assignment ticks (${limit})`, fit.activitiesDone.length >= 60)
}
const reparsed = parseSnapshot(JSON.parse(JSON.stringify(fitSnapshot(busy, SNAPSHOT_MAX_BYTES))))
check('a fitted snapshot re-parses to itself (scores aligned)', !!reparsed && reparsed.activityScores.length === reparsed.activitiesDone.length * 2)

// ── Catalogue ────────────────────────────────────────────────────────────────
console.log('Insight catalogue')
const cat = getInsightCatalogue()
let missing = 0
let badKey = 0
for (const s of [...LEVEL2_SESSIONS, ...LEVEL3_SESSIONS, ...LEVEL4_SESSIONS]) {
  for (const q of s.quiz as unknown as { options: { misconception?: string }[] }[]) {
    for (const o of q.options) {
      if (!o.misconception) continue
      const key = `${s.id}.${o.misconception}`
      if (!MISCONCEPTION_KEY_RE.test(key)) badKey++
      if (!cat.misconceptions[key]) missing++
    }
  }
}
check('every tagged wrong option (L2–L4) has a sendable key', badKey === 0, `${badKey} bad`)
check('every tagged wrong option (L2–L4) is in the catalogue', missing === 0, `${missing} missing`)
const l34 = Object.entries(cat.misconceptions).filter(([k]) => /^L[34]-/.test(k))
check('every Level 3–4 misconception carries its 5-minute reteach', l34.length > 0 && l34.every(([, m]) => (m.r ?? '').length >= 60))
check('catalogue has sessions for all four levels', [1, 2, 3, 4].every((l) => Object.values(cat.sessions).filter((s) => s.l === l).length === 24))
check('every activity names its concepts', Object.values(cat.activities).every((a) => a.c.length > 0))

// ── Teacher views ────────────────────────────────────────────────────────────
console.log('Gradebook, Mind Map, stuck signals')
const firstAct = Object.entries(cat.activities).find(([, a]) => a.c.includes('loops'))
const actId = firstAct ? firstAct[0] : 'missing'
const mKey = Object.keys(cat.misconceptions).find((k) => k.startsWith('L2-')) ?? 'L2-S01.x'
const mk = (id: string, nick: string, snap: Partial<ClassSnapshot>): KidsMemberRow => ({
  id, nickname: nick, createdAt: '2026-11-01T00:00:00Z', lastActiveAt: new Date().toISOString(),
  snapshot: { ...EMPTY_SNAPSHOT, ...snap },
})
const members = [
  mk('a', 'Zed', { concepts: 'nnnSllnnnnnnnnnf', conceptEvidence: evidence, activitiesDone: [actId], activityScores: '31', misconceptions: { [mKey]: 2 }, courseStuck: { 'L1-S05': 4 }, galaxyStuck: { [actId]: 3 } }),
  mk('b', 'Amy', { misconceptions: { [mKey]: 1 }, courseStuck: { 'L1-S05': 3 }, galaxyStuck: { [actId]: 2 } }),
  mk('c', 'Bo', { misconceptions: { 'L3-S01.only-me': 1 } }),
]
const rows = gradebook(members)
check('gradebook keeps roster order (never sorted by attainment)', rows.map((r) => r.member.nickname).join() === 'Zed,Amy,Bo')
check('gradebook reads letters and evidence', rows[0].hasData && rows[0].cells.loops.status === 'secure' && rows[0].cells.loops.needsHelp && rows[0].cells.loops.wins === 3 && rows[0].cells.loops.daysSinceWin === 4)
check('a child with no wave-2 data is marked, not guessed', !rows[1].hasData)
const ev = cellEvidence(rows[0], 'loops', cat)
check('evidence lists the Galaxy run with stars and tries', ev.activities.some((a) => a.id === actId && a.stars === 3 && a.attempts === 1))
const map = classMindMap(members, cat)
const items = map.flatMap((n) => n.items)
check('Mind Map shows a misconception 2 children share', items.some((i) => i.key === mKey && i.children === 2))
check('Mind Map never shows one child’s misconception', !items.some((i) => i.children < 2))
check('headline reads “N of M think …: run … guide”', items.length > 0 && /^2 of 3 think “.+”: run the (5-minute reteach|correction) in the Session \d+ guide\.$/.test(mindMapHeadline(items[0], 3)), items[0] ? mindMapHeadline(items[0], 3) : '')
const sig = stuckSignals(members, cat)
check('stuck: course challenge shared by 2 children appears', sig.course.some((c) => c.key === 'L1-S05' && c.children === 2))
check('stuck: Galaxy activity appears under its track', sig.galaxy.some((g) => g.items.some((i) => i.key === actId)))
check('stuck: nothing with fewer than 2 children', [...sig.course, ...sig.checks, ...sig.galaxy.flatMap((g) => g.items)].every((x) => x.children >= 2))
const csv = gradebookCsv(rows)
check('gradebook CSV: header + one line per child', csv.split('\n').length === 4 && csv.startsWith('Nickname,'))
check('gradebook CSV guards formula injection', gradebookCsv(gradebook([mk('d', '=cmd', {})])).includes("'=cmd"))

// ── Class Power-Up ───────────────────────────────────────────────────────────
console.log('Class Power-Up')
const goal = parseGoal({ v: 1, title: 'Relight Lantern Hill', target: 100, start: '2026-11-01', end: '2026-11-30', theme: 'lantern' }) as ClassGoal
check('a sensible goal parses', !!goal && goal.target === 100)
check('a goal with no title is refused', parseGoal({ title: '', target: 100, start: '2026-11-01', end: '2026-11-30' }) === null)
check('a goal over 92 days is refused', parseGoal({ title: 'Too long', target: 100, start: '2026-01-01', end: '2026-06-01' }) === null)
check('targets are clamped by validation', parseGoal({ title: 'Tiny', target: 3, start: '2026-11-01', end: '2026-11-02' }) === null && suggestedTarget(28, GOAL_PRESETS[0].perChild) === 280)
check('markup is stripped from the title', parseGoal({ title: '<b>Go</b> team', target: 50, start: '2026-11-01', end: '2026-11-02' })?.title === 'bGo/b team')
const diaries: Record<string, number>[] = [{ '2026-10-31': 50, '2026-11-02': 10, '2026-11-24': 5 }, { '2026-11-25': 30 }, {}]
const gp = goalProgress(goal, diaries, '2026-11-27')
check('only work inside the window counts', gp.done === 45, String(gp.done))
check('helpers = children with work this week (Mon–Sun)', gp.helpers === 2 && weekStart('2026-11-27') === '2026-11-23')
check('a child with no work this week has no tick', !helpedThisWeek(diaries[2], '2026-11-27'))
check('milestones at 25/50/75/100%', milestonesReached(25, 100).length === 1 && milestonesReached(99, 100).length === 3 && milestonesReached(100, 100).length === 4)
check('complete at target', goalProgress(goal, [{ '2026-11-10': 100 }], '2026-11-27').status === 'complete')

// ── Device diary (browser stores, with a tiny localStorage shim) ─────────────
console.log('Device diary')
const store = new Map<string, string>()
const shim = {
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() { return store.size },
    clear: () => store.clear(),
  },
  dispatchEvent: () => true,
}
;(globalThis as unknown as { window: unknown }).window = shim
async function diaryChecks(): Promise<void> {
  const d = await import('./classroom-diary')
  const day = new Date('2026-11-27T10:00:00')
  check('nothing is recorded outside a class', d.noteClassWork('activity', 'loop-1', day) === false && Object.keys(d.workDays()).length === 0)
  store.set('r2bot_kids_class_v1', JSON.stringify({ token: 'x', className: 'C', nickname: 'N' }))
  check('first finish today counts', d.noteClassWork('activity', 'loop-1', day) === true)
  check('the same thing again today does not', d.noteClassWork('activity', 'loop-1', day) === false)
  check('discovery claims are not work', d.noteClassWork('discovery', 'robodex', day) === false)
  d.noteClassWork('game', 'sumo:t1', day)
  check('diary sends one number per day', JSON.stringify(d.workDays()) === JSON.stringify({ '2026-11-27': 2 }))
  d.recordMisconception('L2-S04', 'taller-is-stronger', day)
  d.recordMisconception('L2-S04', 'taller-is-stronger', day)
  d.recordMisconception('L2-S04', 'Not An Id!', day)
  check('misconceptions are counted by key, free text refused', JSON.stringify(d.misconceptionCounts()) === JSON.stringify({ 'L2-S04.taller-is-stronger': 2 }))
  d.clearClassDiary()
  check('leaving a class clears both stores', Object.keys(d.workDays()).length === 0 && Object.keys(d.misconceptionCounts()).length === 0)
}

// ── Standards ────────────────────────────────────────────────────────────────
function standardsChecks(): void {
  console.log('Standards page data')
  for (const lv of allStandards()) {
    const sessionsOk = (ns: number[]) => ns.every((n) => n >= 1 && n <= lv.sessionCount)
    check(`Level ${lv.level}: CSTA focus standards each name sessions`, lv.csta.filter((c) => c.focus).every((c) => c.sessions.length > 0 && sessionsOk(c.sessions)))
    check(`Level ${lv.level}: England statements matched to sessions`, lv.uk.statements.length >= 4 && lv.uk.statements.every((s) => sessionsOk(s.sessions)))
    check(`Level ${lv.level}: concepts listed with sessions`, lv.concepts.length >= 8 && lv.concepts.every((c) => c.sessions.length > 0))
    check(`Level ${lv.level}: no invented UK codes`, lv.uk.statements.every((s) => !/\b[A-Z]{1,3}\d?-[A-Z]{2}-\d/.test(s.text)))
  }
}

void diaryChecks().then(() => {
  standardsChecks()
  if (failures) {
    console.error(`\n${failures} check(s) failed.`)
    process.exit(1)
  }
  console.log('\nClassroom wave 2: all checks passed.')
})
