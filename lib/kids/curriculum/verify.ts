// lib/kids/curriculum/verify.ts
// The course's reference check: every id a course session points at must
// exist, be built and be suitable — so a session can never send a child to a
// 404, a game with no page, an activity for the wrong age, or a check whose
// wrong answers say nothing to the teacher.
//
// Level 1: every session has its verified challenge arena (lib/kids/sim/arenas/level1.ts;
//          the physics itself is checked by lib/kids/sim/verify.ts).
// Level 2 (composed sessions, lib/kids/curriculum/level2):
//   - 24 sessions L2-S01…L2-S24, matching the levels.ts outline exactly (title,
//     objective, kind, concepts, new blocks, projects at 6/12/18/24);
//   - arena: a Code Lab mission (lib/kids/code-lab/missions.ts) or a Physics Lab
//     arena (lib/kids/sim/demos.ts) — both have their own solver checks;
//   - 2–3 Skill Galaxy activities that exist in the LIVE list (ALL_ACTIVITIES),
//     are for Builders, and share at least one concept with the session;
//   - the challenge game is in GAMES, has a built page app/kids/play/<id>/page.tsx,
//     is open to Builders (minBand) and the tier is one the game has;
//   - the Story Theatre slug (if any) exists;
//   - check: three questions, a valid answer index, every WRONG option tagged with
//     a known misconception, the answer never tagged; the teacher notes list
//     every misconception the check can reveal;
//   - teacher timing adds up to the session length; at least one assessed
//     objective; objective ids are unique and follow L2-Sxx-On;
//   - the episode has 2–6 scenes and a runtime that adds up;
//   - every block used as new is in the Level 2 block list, introduced once;
//   - build parts are real parts; badge ids are unique (and differ from Level 1);
//   - the season certificate's session ids match the sessions.
// Warnings (not failures): an activity or arena reused across sessions.
//
// Run:  npx tsx lib/kids/curriculum/verify.ts      (exit 1 on any ✗)

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { BAND_ORDER } from '../bands'
import { ALL_ACTIVITIES } from '../activities/content'
import { getMission } from '../code-lab/missions'
import { DEMOS } from '../sim/demos'
import { getLevel1Arena } from '../sim/arenas/level1'
import { getEpisode } from '../stories'
import { GAMES } from '../universe/worlds'
import { getPart, type Slot } from '../robot-design'
import { BLOCKS_INTRODUCED, levelByNumber } from './levels'
import { LEVEL1_SESSIONS } from './level1'
import { LEVEL2_BADGES, LEVEL2_CERTIFICATE, LEVEL2_SESSIONS, L2_MISCONCEPTIONS } from './level2'
import { quizMisconceptions } from './level2/shared'
import { levelSessionIds } from '../../../components/kids/teach/CertificateButtonClient'

let failures = 0
let warnings = 0
function check(name: string, ok: boolean, detail = ''): void {
  if (ok) return
  failures++
  console.log(`✗ ${name}${detail ? ` — ${detail}` : ''}`)
}
function warn(msg: string): void {
  warnings++
  console.log(`! ${msg}`)
}

const ROOT = join(__dirname, '..', '..', '..')

// ── Level 1 ───────────────────────────────────────────────────────────────
for (const s of LEVEL1_SESSIONS) check(`${s.id}: has a verified challenge arena`, !!getLevel1Arena(s.id))
console.log(`✓ Level 1: ${LEVEL1_SESSIONS.length} sessions each have a verified arena`)

// ── Level 2 ───────────────────────────────────────────────────────────────
const level = levelByNumber(2)
const outline = level.sessions
const L2_BLOCKS = new Set(BLOCKS_INTRODUCED[2])
const misconceptionIds = new Set(Object.keys(L2_MISCONCEPTIONS))
const builders = BAND_ORDER.indexOf('builders')
const activityUse = new Map<string, string[]>()
const arenaUse = new Map<string, string[]>()
const introduced = new Map<string, string>()
const objectiveIds = new Set<string>()
const answerPositions = [0, 0, 0, 0]

check('Level 2: 24 sessions', LEVEL2_SESSIONS.length === 24, `found ${LEVEL2_SESSIONS.length}`)
check('Level 2: matches the outline length', LEVEL2_SESSIONS.length === outline.length)

LEVEL2_SESSIONS.forEach((s, i) => {
  const tag = s.id
  const o = outline[i]
  check(`${tag}: id and number`, s.id === `L2-S${String(i + 1).padStart(2, '0')}` && s.number === i + 1 && s.level === 2)
  if (o) {
    check(`${tag}: title matches the outline`, s.title === o.title, `"${s.title}" vs "${o.title}"`)
    check(`${tag}: objective matches the outline`, s.objective === o.objective)
    check(`${tag}: kind matches the outline`, s.kind === o.kind)
    check(`${tag}: concepts match the outline`, JSON.stringify(s.concepts) === JSON.stringify(o.concepts), `${s.concepts} vs ${o.concepts}`)
    check(`${tag}: new blocks match the outline`, JSON.stringify(s.newBlocks) === JSON.stringify(o.newBlocks ?? []), `${s.newBlocks} vs ${o.newBlocks ?? []}`)
  }
  // Projects
  const project = level.projects.find((p) => p.session === s.number)
  check(`${tag}: project on sessions 6/12/18/24 only`, s.kind === 'project' ? !!s.project && s.project.id === project?.id : !s.project)

  // Blocks
  for (const b of s.newBlocks) {
    check(`${tag}: new block ${b} is a Level 2 block`, L2_BLOCKS.has(b))
    check(`${tag}: block ${b} introduced once`, !introduced.has(b), `also in ${introduced.get(b)}`)
    introduced.set(b, tag)
  }

  // Objectives
  check(`${tag}: at least one assessed objective`, s.objectives.some((x) => !x.discussionOnly))
  s.objectives.forEach((x) => {
    check(`${tag}: objective id ${x.id} format`, x.id.startsWith(`${tag}-O`))
    check(`${tag}: objective id ${x.id} unique`, !objectiveIds.has(x.id))
    objectiveIds.add(x.id)
  })

  // Episode
  const ep = s.episode
  check(`${tag}: episode has 2–6 scenes`, ep.scenes.length >= 2 && ep.scenes.length <= 6)
  const runtime = (ep.previously ? 15 : 10) + ep.scenes.reduce((n, sc) => n + sc.seconds, 0) + 15
  check(`${tag}: episode runtime adds up`, ep.runtimeSec === runtime, `${ep.runtimeSec} vs ${runtime}`)
  check(`${tag}: episode 1 has no "previously", others do`, i === 0 ? !ep.previously : !!ep.previously)
  for (const sc of ep.scenes) for (const l of sc.lines) check(`${tag}: guest lines name the guest`, l.who !== 'guest' || !!l.guestName)
  if (s.theatre) check(`${tag}: Story Theatre episode "${s.theatre}" exists`, !!getEpisode(s.theatre))

  // Build
  const part = s.build.part
  check(`${tag}: build part exists`, part.id === 'child-choice' || !!getPart(part.slot as Slot, part.id), `${part.slot}:${part.id}`)

  // Arena
  if (s.arena.kind === 'code-lab') check(`${tag}: Code Lab mission "${s.arena.id}" exists`, !!getMission(s.arena.id))
  else check(`${tag}: Physics Lab arena "${s.arena.id}" exists`, DEMOS.some((d) => d.id === s.arena.id))
  arenaUse.set(`${s.arena.kind}:${s.arena.id}`, [...(arenaUse.get(`${s.arena.kind}:${s.arena.id}`) ?? []), tag])

  // Activities
  check(`${tag}: 2–3 Galaxy activities`, s.activities.length >= 2 && s.activities.length <= 3, `${s.activities.length}`)
  const seen = new Set<string>()
  for (const r of s.activities) {
    const a = ALL_ACTIVITIES.find((x) => x.id === r.id)
    check(`${tag}: activity "${r.id}" is in the live Galaxy`, !!a)
    check(`${tag}: activity "${r.id}" listed once`, !seen.has(r.id))
    seen.add(r.id)
    if (!a) continue
    check(`${tag}: activity "${r.id}" is for Builders`, a.band === 'builders', a.band)
    const shared = (a.concepts ?? []).filter((c) => s.concepts.includes(c))
    check(`${tag}: activity "${r.id}" shares a concept with the session`, shared.length > 0, `${a.concepts} vs ${s.concepts}`)
    activityUse.set(r.id, [...(activityUse.get(r.id) ?? []), tag])
  }

  // Challenge
  const g = GAMES.find((x) => x.id === s.challenge.game)
  check(`${tag}: game "${s.challenge.game}" is in GAMES`, !!g)
  if (g) {
    check(`${tag}: game "${g.id}" has a built page`, existsSync(join(ROOT, 'app', 'kids', 'play', g.id, 'page.tsx')))
    check(`${tag}: game "${g.id}" is open to Builders`, BAND_ORDER.indexOf(g.minBand) <= builders, g.minBand)
    check(`${tag}: tier ${s.challenge.tier} exists in "${g.id}"`, s.challenge.tier >= 0 && s.challenge.tier < g.tiers)
  }

  // Check
  check(`${tag}: three questions`, s.quiz.length === 3)
  s.quiz.forEach((q, qi) => {
    check(`${tag} Q${qi + 1}: 2–4 options`, q.options.length >= 2 && q.options.length <= 4)
    check(`${tag} Q${qi + 1}: answer index valid`, Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length)
    answerPositions[q.answer] = (answerPositions[q.answer] ?? 0) + 1
    q.options.forEach((opt, oi) => {
      if (oi === q.answer) check(`${tag} Q${qi + 1}: the answer carries no misconception`, !opt.misconception)
      else {
        check(`${tag} Q${qi + 1}: wrong option ${oi + 1} names a misconception`, !!opt.misconception)
        if (opt.misconception) check(`${tag} Q${qi + 1}: misconception "${opt.misconception}" is known`, misconceptionIds.has(opt.misconception))
      }
    })
    check(`${tag} Q${qi + 1}: has a why`, q.why.length > 20)
  })
  const listed = new Set(s.teacher.misconceptions.map((m) => m.idea))
  for (const id of quizMisconceptions(s.quiz)) check(`${tag}: teacher notes list "${id}"`, listed.has(L2_MISCONCEPTIONS[id].idea))

  // Teacher and parent
  const minutes = s.teacher.timing.reduce((n, t) => n + t.minutes, 0)
  check(`${tag}: timing adds up to ${s.durationMin} min`, minutes === s.durationMin, `${minutes}`)
  check(`${tag}: discussion questions`, s.teacher.discussion.length >= 2)
  check(`${tag}: differentiation both ways`, s.teacher.differentiation.faster.length > 0 && s.teacher.differentiation.slower.length > 0)
  check(`${tag}: parent note complete`, !!s.parent.today && !!s.parent.tryAtHome && !!s.parent.askYourChild)
})

// Badges
const l2Badges = new Set(LEVEL2_BADGES.map((b) => b.id))
check('Level 2: badge ids unique', l2Badges.size === LEVEL2_BADGES.length)
const l1Badges = new Set(LEVEL1_SESSIONS.map((s) => s.badge.id))
for (const b of l2Badges) check(`Level 2: badge ${b} differs from Level 1`, !l1Badges.has(b))

// Every Level 2 block is introduced somewhere in the season.
for (const b of L2_BLOCKS) check(`Level 2: block ${b} is introduced by a session`, introduced.has(b))

// Certificate
check('Level 2: certificate title', LEVEL2_CERTIFICATE.title === level.certificate.title)
check('Level 2: certificate session ids', JSON.stringify(levelSessionIds(2)) === JSON.stringify(LEVEL2_SESSIONS.map((s) => s.id)))

// Answer balance (a stored-order hint; the check shuffles per attempt anyway).
const most = Math.max(...answerPositions)
if (most > 36) warn(`Level 2: ${most} of 72 answers sit in one position (${answerPositions.join(' / ')})`)

for (const [id, uses] of activityUse) if (uses.length > 1) warn(`activity ${id} is used in ${uses.join(', ')}`)
for (const [id, uses] of arenaUse) if (uses.length > 1) warn(`arena ${id} is used in ${uses.join(', ')} (different tasks)`)

console.log(`✓ Level 2: ${LEVEL2_SESSIONS.length} composed sessions checked (${activityUse.size} activities, ${arenaUse.size} arenas, ${new Set(LEVEL2_SESSIONS.map((s) => s.challenge.game)).size} games)`)
if (failures > 0) {
  console.log(`\n${failures} problem(s), ${warnings} warning(s).`)
  process.exit(1)
}
console.log(`\nAll curriculum references check out (${warnings} warning(s)).`)
