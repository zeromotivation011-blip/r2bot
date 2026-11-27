// lib/kids/curriculum/level3/verify.ts
// Checks the Level 3 and Level 4 courses (run: npx tsx lib/kids/curriculum/level3/verify.ts).
//
// The same rules scripts/kids-curriculum-doc.ts applies to Level 1, plus the
// Level 3–4 additions:
//   - outline match (titles, objectives, kinds, projects come from levels.ts),
//   - blocks offered/used only once introduced, and only with a part that gives them,
//   - 40-minute class plans, episode runtimes, three hints, success criteria,
//   - every wrong check option names a misconception the session's teacher
//     notes define (with a 5-minute reteach); the right option names none,
//   - the right answer's position is balanced across each level,
//   - every session reuses a live challenge (game tier, Code Lab mission,
//     Physics Lab arena or Galaxy activity) for the right band, plus 2–3
//     same-band Galaxy activities on its concepts,
//   - the teacher-guide data covers every session.
// Exits 1 on any problem.

import { BAND_ORDER, type BandId } from '../../bands'
import { getPart, type Capability } from '../../robot-design'
import { ALL_ACTIVITIES } from '../../activities/content'
import { GAMES } from '../../universe/worlds'
import { MISSIONS } from '../../code-lab/missions'
import { DEMOS } from '../../sim/demos'
import { EPISODES } from '../../stories'
import { BLOCKS_INTRODUCED, LEVELS, levelByNumber } from '../levels'
import { LEVEL1_SESSIONS } from '../level1'
import { BLOCK_NEEDS, type BlockId, type CodeChallenge, type LevelNumber, type PartRef, type RobotSpec, type Session } from '../types'
import type { Misconception, SessionReuse, TaggedQuestion } from './kit'
import { LEVEL3_SESSIONS } from './index'
import { LEVEL3_REUSE } from './reuse'
import { LEVEL3_GUIDE } from './guide'
import { LEVEL4_SESSIONS } from '../level4'
import { LEVEL4_REUSE } from '../level4/reuse'
import { LEVEL4_GUIDE } from '../level4/guide'

const problems: string[] = []
const fail = (m: string) => problems.push(m)
let checks = 0
const ok = (cond: boolean, msg: string) => {
  checks++
  if (!cond) fail(msg)
}

const ALL_BLOCKS = (Object.keys(BLOCK_NEEDS) as BlockId[]).sort((a, b) => b.length - a.length)
const BLOCK_RE = new RegExp(`\\b(${ALL_BLOCKS.join('|')})\\b`, 'g')

function blocksIn(lines: string[]): Set<BlockId> {
  const out = new Set<BlockId>()
  for (const raw of lines) {
    const line = raw.replace(/←.*$/, '').replace(/"[^"]*"/g, '').replace(/“[^”]*”/g, '').replace(/…[^…]*…/g, '')
    for (const m of line.matchAll(BLOCK_RE)) out.add(m[1] as BlockId)
  }
  return out
}

function capabilities(r: RobotSpec): Set<Capability> {
  const caps = new Set<Capability>()
  const add = (slot: PartRef['slot'], id: string) => getPart(slot, id)?.gives.forEach((c) => caps.add(c))
  if (r.drive !== 'none' && r.drive !== 'child-choice') add('drive', r.drive)
  else if (r.drive === 'child-choice') caps.add('move')
  if (r.head !== 'none') add('head', r.head)
  if (r.tool !== 'child-choice') add('tool', r.tool)
  add('sensor', r.sensor)
  return caps
}

function checkChallenge(s: Session, c: CodeChallenge, known: Set<BlockId>, where: string, robot: RobotSpec) {
  const offered = new Set<string>(c.allowedBlocks.map((b) => b.id))
  for (const id of blocksIn([...c.exampleSolution, ...(c.starter ?? [])])) {
    ok(offered.has(id), `${s.id} ${where}: example/starter uses "${id}", which this challenge does not offer`)
    ok(known.has(id), `${s.id} ${where}: example/starter uses "${id}" before it is introduced`)
  }
  const caps = capabilities(robot)
  const toolCaps: Capability[] = ['grab', 'draw', 'light']
  for (const need of c.arena.requires) {
    if (robot.tool === 'child-choice' && toolCaps.includes(need)) continue
    ok(caps.has(need), `${s.id} ${where}: arena requires "${need}" but the robot at this point has no part that gives it (${JSON.stringify(robot)})`)
  }
  for (const b of c.allowedBlocks) {
    ok(known.has(b.id), `${s.id} ${where}: block "${b.id}" offered before it is introduced`)
    const need = BLOCK_NEEDS[b.id]
    if (need && need !== 'move' && s.kind !== 'project') ok(c.arena.requires.includes(need), `${s.id} ${where}: block "${b.id}" needs "${need}" but the arena does not require it`)
    if (need && s.kind !== 'project' && !(robot.tool === 'child-choice' && toolCaps.includes(need))) ok(caps.has(need), `${s.id} ${where}: block "${b.id}" needs "${need}", which the robot does not have`)
  }
  ok(c.hints.length === 3, `${s.id} ${where}: needs 3 hints`)
  ok(c.success.length > 0, `${s.id} ${where}: no success criteria`)
  ok(c.exampleSolution.length > 0, `${s.id} ${where}: no example solution`)
  ok(c.mission.length > 20 && c.title.length > 2, `${s.id} ${where}: title or mission missing`)
}

const usedBadges = new Set<string>(LEVEL1_SESSIONS.map((s) => s.badge.id))
const usedMisconceptionIds = new Map<string, string>()

const ACT_IDS = new Set(ALL_ACTIVITIES.map((a) => a.id))
const ACT_BY_ID = new Map(ALL_ACTIVITIES.map((a) => [a.id, a]))
const rank = (b: BandId) => BAND_ORDER.indexOf(b)

function checkReuse(level: LevelNumber, sessions: Session[], reuse: SessionReuse[]) {
  const band = levelByNumber(level).band
  ok(reuse.length === sessions.length, `Level ${level}: ${reuse.length} reuse entries for ${sessions.length} sessions`)
  for (const s of sessions) {
    const r = reuse.find((x) => x.session === s.id)
    ok(!!r, `${s.id}: no reuse entry`)
    if (!r) continue
    const p = r.play
    ok(p.goal.length > 15, `${s.id}: reuse goal missing`)
    if (p.kind === 'game') {
      const g = GAMES.find((x) => x.id === p.id)
      ok(!!g, `${s.id}: game "${p.id}" does not exist`)
      if (g) {
        ok(rank(g.minBand) <= rank(band), `${s.id}: game ${p.id} is for ${g.minBand}+, above ${band}`)
        ok(p.tier < g.tiers, `${s.id}: game ${p.id} has no tier ${p.tier}`)
      }
    } else if (p.kind === 'code-lab') {
      const m = MISSIONS.find((x) => x.id === p.id)
      ok(!!m, `${s.id}: Code Lab mission "${p.id}" does not exist`)
      if (m) ok(rank(m.band) <= rank(band), `${s.id}: Code Lab mission ${p.id} is for ${m.band}, above ${band}`)
    } else if (p.kind === 'sim-demo') {
      ok(DEMOS.some((d) => d.id === p.id), `${s.id}: Physics Lab arena "${p.id}" does not exist`)
    } else {
      const a = ACT_BY_ID.get(p.id)
      ok(!!a, `${s.id}: activity "${p.id}" does not exist`)
      if (a) ok(a.band === band, `${s.id}: activity ${p.id} is ${a.band}, not ${band}`)
    }
    ok(r.practice.length >= 2 && r.practice.length <= 3, `${s.id}: practice must list 2–3 activities`)
    ok(new Set(r.practice).size === r.practice.length, `${s.id}: practice repeats an activity`)
    let overlap = false
    for (const id of r.practice) {
      ok(ACT_IDS.has(id), `${s.id}: practice activity "${id}" does not exist`)
      const a = ACT_BY_ID.get(id)
      if (!a) continue
      ok(a.band === band, `${s.id}: practice ${id} is ${a.band}, not ${band}`)
      ok(p.kind !== 'activity' || p.id !== id, `${s.id}: practice repeats the challenge activity ${id}`)
      if ((a.concepts ?? []).some((c) => s.concepts.includes(c))) overlap = true
    }
    ok(overlap, `${s.id}: no practice activity shares a concept with the session (${s.concepts.join(', ')})`)
    if (r.story) {
      const e = EPISODES.find((x) => x.slug === r.story)
      ok(!!e, `${s.id}: story "${r.story}" does not exist`)
      if (e) ok(rank(e.band) <= rank(band), `${s.id}: story ${r.story} is for ${e.band}`)
    }
  }
}

function checkLevel(level: LevelNumber, sessions: Session[]) {
  const lvl = levelByNumber(level)
  ok(sessions.length === 24, `Level ${level} has ${sessions.length} sessions, expected 24`)
  const known = new Set<BlockId>()
  for (let l = 1; l < level; l++) BLOCKS_INTRODUCED[l as LevelNumber].forEach((b) => known.add(b))
  const robot: RobotSpec = { ...lvl.startRobot, toolbox: [...lvl.startRobot.toolbox] }
  const answers: number[] = []
  const introduced = new Set<BlockId>()
  sessions.forEach((s, i) => {
    const o = lvl.sessions[i]
    ok(s.number === i + 1, `Level ${level}: order broken at ${s.id}`)
    ok(s.id === `L${level}-S${String(i + 1).padStart(2, '0')}`, `Bad id ${s.id}`)
    ok(s.level === level, `${s.id}: level field is ${s.level}`)
    ok(!!o && o.title === s.title && o.objective === s.objective && o.kind === s.kind, `${s.id}: differs from the levels.ts outline`)
    if (s.kind === 'project') ok(s.project?.id === lvl.projects.find((p) => p.session === s.number)?.id, `${s.id}: project mismatch`)
    ok(!usedBadges.has(s.badge.id), `${s.id}: duplicate badge id ${s.badge.id}`)
    usedBadges.add(s.badge.id)
    for (const b of s.newBlocks) {
      known.add(b)
      introduced.add(b)
    }
    const p = s.build.part
    if (s.build.action !== 'inspect' || p.slot !== 'body') {
      if (p.slot === 'drive') robot.drive = p.id
      else if (p.slot === 'head') robot.head = p.id
      else if (p.slot === 'tool') robot.tool = p.id
      else if (p.slot === 'sensor') robot.sensor = p.id
    }
    ok(s.build.why.length > 20 && s.build.tryWithout.length > 20 && s.build.realWorld.length > 20, `${s.id}: build step is thin`)
    checkChallenge(s, s.code, known, 'code', robot)
    checkChallenge(s, s.challenge, known, 'challenge', robot)

    ok(s.objectives.some((x) => !x.discussionOnly), `${s.id}: every objective is discussion-only`)
    s.objectives.forEach((x) => ok(x.id.startsWith(s.id), `${x.id} is not under ${s.id}`))
    const minutes = s.teacher.timing.reduce((a, t) => a + t.minutes, 0)
    ok(minutes === 40, `${s.id}: class plan is ${minutes} min, not 40`)
    ok(s.teacher.unpluggedWarmup.minutes === s.teacher.timing[0].minutes, `${s.id}: warm-up minutes differ from the class plan`)
    ok(s.teacher.discussion.length >= 2, `${s.id}: needs at least 2 discussion questions`)
    ok(s.teacher.differentiation.faster.length > 0 && s.teacher.differentiation.slower.length > 0, `${s.id}: differentiation missing`)
    const rt = s.episode.runtimeSec
    const [lo, hi] = s.kind === 'project' ? [120, 240] : [180, 300]
    ok(rt >= lo && rt <= hi, `${s.id}: episode runtime ${rt}s outside ${lo}–${hi}s`)
    ok(s.number === 1 || !!s.episode.previously, `${s.id}: missing "previously"`)
    ok(s.parent.today.length > 20 && s.parent.tryAtHome.length > 20 && s.parent.askYourChild.length > 10, `${s.id}: parent note is thin`)

    // Misconception-tagged check.
    const mcs = s.teacher.misconceptions as Misconception[]
    const ids = new Set<string>()
    for (const m of mcs) {
      ok(!!m.id && /^[a-z0-9-]+$/.test(m.id), `${s.id}: misconception without a kebab-case id (“${m.idea}”)`)
      ok(!ids.has(m.id), `${s.id}: misconception ${m.id} listed twice`)
      ids.add(m.id)
      ok((m.reteach ?? '').length >= 60, `${s.id}: misconception ${m.id} has no 5-minute reteach`)
      const prev = usedMisconceptionIds.get(m.id)
      ok(!prev || prev === m.idea, `${s.id}: misconception id ${m.id} reused with a different idea`)
      usedMisconceptionIds.set(m.id, m.idea)
    }
    const tagged = new Set<string>()
    s.quiz.forEach((qq, qi) => {
      const t = qq as TaggedQuestion
      ok(t.answer >= 0 && t.answer < t.options.length, `${s.id} Q${qi + 1}: answer out of range`)
      ok(t.options.length >= 3, `${s.id} Q${qi + 1}: needs at least 3 options`)
      t.options.forEach((op, oi) => {
        if (oi === t.answer) ok(!op.misconception, `${s.id} Q${qi + 1}: the right answer is tagged as a misconception`)
        else {
          ok(!!op.misconception, `${s.id} Q${qi + 1}: wrong option “${op.text}” has no misconception tag`)
          if (op.misconception) {
            ok(ids.has(op.misconception), `${s.id} Q${qi + 1}: tag ${op.misconception} is not in the session's misconceptions`)
            tagged.add(op.misconception)
          }
        }
      })
      ok(t.why.length > 30, `${s.id} Q${qi + 1}: the “why” is missing`)
      answers.push(t.answer)
    })
    ok(tagged.size >= 2, `${s.id}: the check reveals only ${tagged.size} misconception(s); write at least 2`)
  })
  // Blocks introduced must match levels.ts.
  for (const b of BLOCKS_INTRODUCED[level]) ok(introduced.has(b), `Level ${level}: BLOCKS_INTRODUCED lists ${b} but no session introduces it`)
  // Answer balance.
  const counts = new Map<number, number>()
  for (const a of answers) counts.set(a, (counts.get(a) ?? 0) + 1)
  for (const [idx, n] of counts) ok(n / answers.length <= 0.5, `Level ${level}: answer position ${idx} is right in ${n} of ${answers.length}`)
  let run = 1
  for (let k = 1; k < answers.length; k++) {
    run = answers[k] === answers[k - 1] ? run + 1 : 1
    ok(run <= 3, `Level ${level}: ${run} answers in a row at position ${answers[k]} (question ${k + 1})`)
  }
  // The level's end robot is reachable (head, sensor as levels.ts says, unless the last build lets the child choose).
  const end = lvl.endRobot
  ok(robot.sensor === end.sensor, `Level ${level}: robot ends with sensor ${robot.sensor}, levels.ts says ${end.sensor}`)
  ok(robot.head === end.head, `Level ${level}: robot ends with head ${robot.head}, levels.ts says ${end.head}`)
}

function checkGuide(level: LevelNumber, sessions: Session[], guide: { sessions: Record<number, { materials: string[]; lookFor: string[] }>; intro: string }) {
  ok(guide.intro.length > 200, `Level ${level} guide: intro too short`)
  for (const s of sessions) {
    const g = guide.sessions[s.number]
    ok(!!g, `Level ${level} guide: no entry for session ${s.number}`)
    if (g) {
      ok(g.materials.length > 0, `Level ${level} guide S${s.number}: no materials`)
      ok(g.lookFor.length >= 2, `Level ${level} guide S${s.number}: needs 2 “look for” assessment notes`)
    }
  }
}

checkLevel(3, LEVEL3_SESSIONS)
checkReuse(3, LEVEL3_SESSIONS, LEVEL3_REUSE)
checkGuide(3, LEVEL3_SESSIONS, LEVEL3_GUIDE)
checkLevel(4, LEVEL4_SESSIONS)
checkReuse(4, LEVEL4_SESSIONS, LEVEL4_REUSE)
checkGuide(4, LEVEL4_SESSIONS, LEVEL4_GUIDE)
ok(LEVELS.length === 4, 'levels.ts must define four levels')

if (problems.length) {
  console.error(`✗ Level 3–4 courses: ${problems.length} problem(s) in ${checks} checks`)
  for (const p of problems) console.error(`  ✗ ${p}`)
  process.exit(1)
}
console.log(`✓ Level 3–4 courses: ${checks} checks passed (48 sessions, ${LEVEL3_REUSE.length + LEVEL4_REUSE.length} reuse links)`)
