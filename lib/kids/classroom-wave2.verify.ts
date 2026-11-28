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
//   - standards: every level maps to CSTA, England and concepts with real sessions;
//   - Wave 4: the class kind (school / club / family / library, migration 0059):
//     mixed classes keep each child's own band, the leader's device keeps the
//     kind before 0059 and hands it over after, old memberships still read;
//     course badges for all four levels in the class view; the Garage offers
//     every finished level's certificate; a home build discovers its Robodex card.
// Run: npx tsx lib/kids/classroom-wave2.verify.ts

import { readFileSync } from 'node:fs'
import {
  CLASS_KINDS,
  EMPTY_SNAPSHOT,
  MISCONCEPTION_KEY_RE,
  SNAPSHOT_MAX_BYTES,
  SNAPSHOT_MAX_BYTES_V2,
  effectiveBandLock,
  fitSnapshot,
  isClassKind,
  isMixedKind,
  joinBandFor,
  parseSnapshot,
  snapshotBytes,
  type ClassSnapshot,
  type KidsMemberRow,
} from './classroom'
import { GOAL_PRESETS, addDays, goalProgress, helpedThisWeek, milestonesReached, parseGoal, suggestedTarget, weekStart, type ClassGoal } from './classroom-goal'
import { cellEvidence, classCourseBadges, classMindMap, gradebook, gradebookCsv, mindMapHeadline, sessionsPerLevel, stuckSignals } from './classroom-insights'
import { certificatePlan } from '../../components/kids/hangar/certificate-levels'
import { cardsForCheckIns } from './builds/robodex'
import { HOME_BUILDS } from './builds/builds'
import { buildsBackupExtra, decodeBuildsExtra } from './builds/store'
import { ROBODEX_CARDS } from './robodex/cards'
import { getInsightCatalogue } from './classroom-insights-server'
import { allStandards } from './classroom-standards'
import { DEVICE_ONLY, LAW_NOTES, ONE_MINUTE, SERVER_TABLES, parentLetter } from './teach/trust-pack'
import { CLUB_SETUP, FAMILY_SETUP } from './teach/clubs'
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
check('minutes played are always 0 on the server, even from an older client', parseSnapshot({ v: 1, totalMinutesPlayed: 5000 })?.totalMinutesPlayed === 0)
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
check('gradebook CSV evidence cells never look like a date to a spreadsheet', !/(^|,)\d+\/\d+\/\d+(,|$)/m.test(csv) && /\d+ wins · \d+ tries · \d+ misses/.test(csv))
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
  d.recordMisconception('L2-S04', 'taller-is-stronger')
  d.recordMisconception('L2-S04', 'taller-is-stronger')
  d.recordMisconception('L2-S04', 'Not An Id!')
  check('misconceptions are counted by key, free text refused', JSON.stringify(d.misconceptionCounts()) === JSON.stringify({ 'L2-S04.taller-is-stronger': 2 }))
  // Wave 3: the record lives in the one progress store; an older class-only entry is still sent.
  store.set('r2bot_kids_class_misc_v1', JSON.stringify({ v: 1, m: { 'L1-S05.turn-moves-forward': { n: 3, d: '2026-11-20' }, 'L2-S04.taller-is-stronger': { n: 1, d: '2026-11-20' } } }))
  const merged = d.misconceptionCounts()
  check('older class-only misconceptions are merged in (higher count wins)', merged['L1-S05.turn-moves-forward'] === 3 && merged['L2-S04.taller-is-stronger'] === 2)
  d.clearClassDiary()
  check('leaving a class clears the diary and the older class-only store', Object.keys(d.workDays()).length === 0 && JSON.stringify(d.misconceptionCounts()) === JSON.stringify({ 'L2-S04.taller-is-stronger': 2 }))
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

// ── Trust Pack honesty ───────────────────────────────────────────────────────
function trustChecks(): void {
  console.log('Trust Pack')
  const all = JSON.stringify({ SERVER_TABLES, DEVICE_ONLY, LAW_NOTES, ONE_MINUTE, letter: parentLetter() })
  check('Trust Pack lists the Robot Passport table', SERVER_TABLES.some((t) => t.table === 'kids_passports' && /400 days/.test(t.retention)))
  check('Trust Pack never claims the backup code is never sent', !/Never sent to R2BOT/.test(all))
  check('Trust Pack never promises minutes played to teachers', !/minutes played/i.test(all))
  check('Trust Pack states the Wave 2 snapshot size', /16 KB/.test(all))
}

// ── Wave 4: class kind, badges, certificates, build → Robodex ───────────────
function kindChecks(): void {
  console.log('Class kind (migration 0059)')
  check('four kinds: school, club, family, library', CLASS_KINDS.map((k) => k.id).join() === 'school,club,family,library')
  check('only school is single-band', CLASS_KINDS.filter((k) => !k.mixed).map((k) => k.id).join() === 'school')
  check('unknown kinds are refused', !isClassKind('party') && !isClassKind(undefined) && isClassKind('library'))
  check('an absent kind (older answer, before 0059) is a school class', !isMixedKind(undefined) && !isMixedKind('nonsense'))
  check('school class: the class lock applies', effectiveBandLock('builders', true, null, 'school') === 'builders')
  check('older call without a kind keeps the 0058 behaviour', effectiveBandLock('builders', true, null) === 'builders')
  check('mixed class: no whole-class lock, each child keeps their band', ['club', 'family', 'library'].every((k) => effectiveBandLock('explorers', true, null, k) === null))
  check('mixed class: one child’s band set by the leader still wins', effectiveBandLock('explorers', true, 'inventors', 'club') === 'inventors')
  check('joining a school class starts at the class band', joinBandFor({ band: 'inventors', kind: 'school' }) === 'inventors' && joinBandFor({ band: 'inventors' }) === 'inventors')
  check('joining a mixed class takes no band from the class', joinBandFor({ band: 'explorers', kind: 'family' }) === null)
  const sql = readFileSync(new URL('../../supabase/migrations/0059_kids_class_kind.sql', import.meta.url), 'utf8')
  check('migration 0059 adds kind with default school', /add column if not exists kind text not null default 'school'/.test(sql))
  check('migration 0059 check constraint matches CLASS_KINDS', sql.includes(`check (kind in (${CLASS_KINDS.map((k) => `'${k.id}'`).join(', ')}))`))
  const sqlCode = sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n')
  check('migration 0059 adds no policy and never uses auth.uid() is null', !/create policy/i.test(sqlCode) && !/auth\.uid\(\)\s+is\s+null/i.test(sqlCode))
  check('Trust Pack describes kids_classes.kind', SERVER_TABLES.some((t) => t.table === 'kids_classes' && t.fields.some((f) => f.name === 'kind' && /club/.test(f.what))))
  check('club and family set-up no longer say "choose the youngest band" as the class band only', CLUB_SETUP.some((l) => /“Club”/.test(l)) && FAMILY_SETUP.some((l) => /“Family class”/.test(l)))
}

async function kindDeviceChecks(): Promise<void> {
  console.log('Class kind on the devices')
  const ks = await import('./classroom-kind-store')
  const id = '11111111-2222-3333-4444-555555555555'
  check('nothing kept: a class reads as its server kind', ks.displayClassKind({ id, kind: 'club', kindReady: true }) === 'club')
  check('before 0059 with nothing kept: school', ks.displayClassKind({ id, kindReady: false }) === 'school')
  ks.rememberClassKind(id, 'family')
  check('before 0059: the leader’s device keeps the kind', ks.displayClassKind({ id, kindReady: false }) === 'family')
  check('before 0059: nothing to hand over yet', ks.pendingClassKind({ id, kindReady: false }) === null)
  check('after 0059 (server still “school”): the kept kind is shown and handed over', ks.displayClassKind({ id, kind: 'school', kindReady: true }) === 'family' && ks.pendingClassKind({ id, kind: 'school', kindReady: true }) === 'family')
  check('a kind changed on the server wins and the kept one is dropped', ks.pendingClassKind({ id, kind: 'library', kindReady: true }) === null && ks.localClassKind(id) === null)
  ks.rememberClassKind(id, 'club')
  ks.rememberClassKind(id, 'school')
  check('choosing school keeps nothing', ks.localClassKind(id) === null)

  const ms = await import('./classroom-membership-store')
  store.set('r2bot_kids_class_v1', JSON.stringify({ token: 't', className: 'C', nickname: 'N', band: 'builders', joinedAt: '2026-11-01T00:00:00Z' }))
  const oldM = ms.loadMembership()
  check('a membership saved before 0059 still loads (a school class)', !!oldM && oldM.kind === undefined && !ms.inMixedClass())
  store.set('r2bot_kids_class_v1', JSON.stringify({ token: 't', className: 'C', nickname: 'N', band: 'explorers', kind: 'club', joinedAt: '2026-11-01T00:00:00Z' }))
  check('a club membership keeps its kind', ms.loadMembership()?.kind === 'club' && ms.inMixedClass())
  store.set('r2bot_kids_class_v1', JSON.stringify({ token: 't', className: 'C', nickname: 'N', kind: 'party' }))
  check('a bad kind is ignored, the membership still loads', ms.loadMembership()?.kind === undefined && ms.loadMembership()?.nickname === 'N')
  store.delete('r2bot_kids_class_v1')
}

function badgeAndCertificateChecks(): void {
  console.log('Course badges (all four levels) and Garage certificates')
  const cat2 = getInsightCatalogue()
  check('every session of every level names its badge', Object.values(cat2.sessions).length === 96 && Object.values(cat2.sessions).every((s) => !!s.b && s.b.n.length > 1 && s.b.i.length > 0))
  const mk2 = (id: string, nick: string, done: Record<string, number>): KidsMemberRow => ({ id, nickname: nick, createdAt: '', lastActiveAt: '', snapshot: { ...EMPTY_SNAPSHOT, sessionsDone: done } })
  const club = [mk2('a', 'Asha', { 'L1-S01': 3, 'L1-S02': 2 }), mk2('b', 'Leo', { 'L3-S05': 1, 'L1-S01': 1 }), mk2('c', 'Mo', { 'L4-S24': 2 })]
  const lv = classCourseBadges(club, cat2)
  check('class badges cover all four levels', lv.map((l) => l.level).join() === '1,2,3,4' && lv.every((l) => l.total === 24))
  check('Level 1 badge earned by two children, in roster order', lv[0].earned[0]?.sessionId === 'L1-S01' && lv[0].earned[0].earnedBy.join() === 'Asha,Leo' && lv[0].earned[0].name === cat2.sessions['L1-S01'].b?.n)
  check('Level 3 and 4 badges are named too', lv[2].earned[0]?.name === cat2.sessions['L3-S05'].b?.n && lv[3].earned[0]?.name === cat2.sessions['L4-S24'].b?.n && lv[1].earned.length === 0)
  check('sessions per level for the roster', sessionsPerLevel(club[1].snapshot).join() === '1,0,1,0')

  const all = (l: number) => Object.fromEntries(Array.from({ length: 24 }, (_, i) => [`L${l}-S${String(i + 1).padStart(2, '0')}`, 2]))
  check('no progress, no band: Level 1 next, nothing finished', JSON.stringify(certificatePlan({}, null)) === JSON.stringify({ finished: [], next: 1 }))
  check('the next level follows the band', certificatePlan({}, 'inventors').next === 3 && certificatePlan({}, 'engineers').next === 4)
  check('every finished level gets its certificate', certificatePlan({ ...all(1), ...all(2), 'L3-S01': 1 }, 'builders').finished.join() === '1,2')
  check('band level finished: suggest the next one up', certificatePlan({ ...all(2) }, 'builders').next === 3)
  check('top band finished: fall back to the lowest open level', certificatePlan({ ...all(4) }, 'engineers').next === 1)
  check('all four finished: four certificates, nothing next', JSON.stringify(certificatePlan({ ...all(1), ...all(2), ...all(3), ...all(4) }, 'explorers')) === JSON.stringify({ finished: [1, 2, 3, 4], next: null }))
  check('23 of 24 is not finished', certificatePlan({ ...all(1), 'L1-S24': 0 }, null).finished.length === 0)

  console.log('Make It at Home → Robodex')
  const cards = new Set(ROBODEX_CARDS.map((c) => c.id))
  const cardByBuild = Object.fromEntries(HOME_BUILDS.map((b) => [b.id, b.robodex]))
  check('every build points at a real Robodex card', HOME_BUILDS.every((b) => cards.has(b.robodex)))
  const two = HOME_BUILDS.slice(0, 2)
  const built = Object.fromEntries(two.map((b) => [b.id, { d: '2026-11-20', a: 1 }]))
  check('checked-in builds discover their cards (de-duplicated)', cardsForCheckIns(built, cardByBuild).join() === [...new Set(two.map((b) => b.robodex))].join())
  check('unknown builds discover nothing', cardsForCheckIns({ 'not-a-build': { d: '2026-11-20', a: 1 } }, cardByBuild).length === 0)
  const restored = decodeBuildsExtra(buildsBackupExtra(built), HOME_BUILDS.map((b) => b.id))
  check('builds restored from a backup code still discover their cards', cardsForCheckIns(restored, cardByBuild).join() === cardsForCheckIns(built, cardByBuild).join())
}

void diaryChecks().then(async () => {
  standardsChecks()
  trustChecks()
  kindChecks()
  await kindDeviceChecks()
  badgeAndCertificateChecks()
  if (failures) {
    console.error(`\n${failures} check(s) failed.`)
    process.exit(1)
  }
  console.log('\nClassroom wave 2: all checks passed.')
})
