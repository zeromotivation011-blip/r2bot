// lib/kids/universe/rewards.verify.ts
// Self-check for the R2BOT Universe rewards engine (lib/kids/universe/rewards.ts,
// quests.ts, unlocks.ts). Runs the SAME code the browser runs, against an
// in-memory localStorage:
//   - an unlock at every level 1..MAX_LEVEL; unlock ids unique; paints have a colour
//   - every quest has a reachable trigger: a reporter in the source that sends
//     its kind (and source), and enough content for every band it is given to
//   - the weekly draw: three quests of different kinds + a bonus, per band, all
//     year; course-only quests never shown without an open course
//   - a replay gives 0 XP; an improvement gives XP (less than a first finish)
//   - a debug-program Galaxy activity counts as a bugfix; a robot save counts once a day
//   - DEBUG_ACTIVITY_IDS matches the Skill Galaxy catalogue
//
// Run:  npx tsx lib/kids/universe/rewards.verify.ts      (exit 1 on any ✗)

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// ── a tiny browser for Node ──
const store = new Map<string, string>()
const memoryStorage = {
  getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
  setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: (i: number) => [...store.keys()][i] ?? null,
  get length() {
    return store.size
  },
}
const target = new EventTarget()
Object.assign(globalThis, {
  window: {
    localStorage: memoryStorage,
    dispatchEvent: (e: Event) => target.dispatchEvent(e),
    addEventListener: target.addEventListener.bind(target),
    removeEventListener: target.removeEventListener.bind(target),
  },
})

let failures = 0
function check(name: string, ok: boolean, detail = '') {
  if (ok) console.log(`✓ ${name}`)
  else {
    failures++
    console.log(`✗ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

const ROOT = join(__dirname, '..', '..', '..')
const src = (f: string) => {
  try {
    return readFileSync(join(ROOT, f), 'utf8')
  } catch {
    return ''
  }
}

async function main() {
  const R = await import('./rewards')
  const Q = await import('./quests')
  const P = await import('../../kids-progress')
  const { ALL_ACTIVITIES } = await import('../activities/content/index')
  const { GAMES } = await import('./worlds')
  const { EPISODES } = await import('../stories/index')
  const { TALK_MISSIONS } = await import('../ai/talk/missions')
  const { BAND_ORDER, bandAllows } = await import('../bands')
  type BandId = (typeof BAND_ORDER)[number]

  // ── Unlocks: one at every level ──
  const missing: number[] = []
  for (let lv = 1; lv <= R.MAX_LEVEL; lv++) if (!R.UNLOCKS.some((u) => u.atLevel === lv)) missing.push(lv)
  check(`an unlock at every level 1..${R.MAX_LEVEL}`, missing.length === 0, `missing: ${missing.join(', ')}`)
  const ids = R.UNLOCKS.map((u) => u.id)
  check('unlock ids are unique', new Set(ids).size === ids.length)
  check('every paint has a #RRGGBB colour', R.UNLOCKS.filter((u) => u.kind === 'paint').every((u) => /^#[0-9A-F]{6}$/i.test(u.value ?? '')))
  check('no unlock above the level cap', R.UNLOCKS.every((u) => u.atLevel === undefined || (u.atLevel >= 1 && u.atLevel <= R.MAX_LEVEL)))
  check('badge unlocks name real badges', R.UNLOCKS.every((u) => !u.byBadge || Boolean(R.getBadge(u.byBadge))))

  // ── DEBUG_ACTIVITY_IDS matches the catalogue ──
  const debugIds = ALL_ACTIVITIES.filter((a) => a.template === 'debug-program').map((a) => a.id)
  const drift = [...debugIds.filter((id) => !Q.DEBUG_ACTIVITY_IDS.has(id)), ...[...Q.DEBUG_ACTIVITY_IDS].filter((id) => !debugIds.includes(id))]
  check('DEBUG_ACTIVITY_IDS matches every debug-program activity', drift.length === 0, `out of step: ${drift.join(', ')}`)

  // ── Quests: pool shape ──
  const pool = Q.QUEST_POOL
  check(`quest pool has about 40 quests (${pool.length})`, pool.length >= 36 && pool.length <= 60)
  check('quest ids are unique', new Set(pool.map((q) => q.id)).size === pool.length)
  check('every quest has a band, a target and XP', pool.every((q) => q.bands.length > 0 && q.target >= 1 && q.xp > 0 && q.short.length > 0 && q.say.length > 0))

  // ── Quests: a reporter in the source for every trigger ──
  // kind + source → the file that reports it and the line that proves it.
  const REPORTERS: { kind: string; source: string; file: string; re: RegExp; debug?: boolean }[] = [
    { kind: 'activity', source: 'galaxy', file: 'components/kids/activities/ActivityPlayerClient.tsx', re: /kind: 'activity'/ },
    { kind: 'bugfix', source: 'galaxy', file: 'components/kids/activities/ActivityPlayerClient.tsx', re: /kind: 'activity'/, debug: true },
    { kind: 'activity', source: 'think', file: 'components/kids/ai/think/LabUiClient.tsx', re: /kind: 'activity', id: `think-/ },
    { kind: 'activity', source: 'vision', file: 'components/kids/ai/vision/VisionLabClient.tsx', re: /id: `vision-lab:/ },
    { kind: 'activity', source: 'ask-spark', file: 'components/kids/ai/spark/SparkSheetClient.tsx', re: /kind: 'activity', id: 'ask-spark'/ },
    { kind: 'challenge', source: 'talk', file: 'components/kids/ai/talk/TalkClient.tsx', re: /'bugfix' : 'challenge'/ },
    { kind: 'bugfix', source: 'talk', file: 'components/kids/ai/talk/TalkClient.tsx', re: /'bugfix' : 'challenge'/ },
    { kind: 'episode', source: 'story', file: 'components/kids/story/StoryPlayerClient.tsx', re: /kind: 'episode', id: `story-/ },
    { kind: 'episode', source: 'course', file: 'components/kids/episodes/EpisodePlayerClient.tsx', re: /kind: 'episode', id: `episode-/ },
    { kind: 'session', source: 'course', file: 'components/kids/course/SessionRunnerClient.tsx', re: /kind: 'session'/ },
    { kind: 'project', source: 'course', file: 'components/kids/course/SessionRunnerClient.tsx', re: /kind: 'project'/ },
    { kind: 'build', source: 'course', file: 'components/kids/course/SessionRunnerClient.tsx', re: /kind: 'build', id: `\$\{id\}-build`/ },
    { kind: 'challenge', source: 'course', file: 'components/kids/course/SessionRunnerClient.tsx', re: /kind: 'challenge', id: `\$\{id\}-challenge`/ },
    { kind: 'challenge', source: 'codelab', file: 'components/kids/codelab/MissionClient.tsx', re: /kind: 'challenge', id: `codelab-/ },
    { kind: 'challenge', source: 'spark-trail', file: 'app/kids/spark-trail/[zoneId]/[levelId]/LevelClient.tsx', re: /kind: 'challenge', id: `spark-trail-/ },
    { kind: 'challenge', source: 'boss', file: 'app/kids/challenge/[missionId]/ChallengeClient.tsx', re: /kind: 'challenge', id: `boss-/ },
    { kind: 'game', source: 'game', file: 'components/kids/ui/GameShellClient.tsx', re: /kind: 'game'/ },
    { kind: 'build', source: 'garage', file: 'components/kids/ui/RewardToastClient.tsx', re: /reportRobotSaved\(\)/ },
  ]
  const live = REPORTERS.filter((r) => r.re.test(src(r.file)))
  for (const r of REPORTERS.filter((x) => !live.includes(x))) check(`reporter still in the source: ${r.kind}/${r.source} in ${r.file}`, false, `${r.re} not found`)

  // Content behind each source, per band (enough distinct things to reach the target).
  const galaxyFor = (band: BandId, prefixes?: readonly string[]) =>
    ALL_ACTIVITIES.filter((a) => a.band === band && sourceIsGalaxy(a.id) && (!prefixes || prefixes.some((p) => a.id.startsWith(p))))
  const sourceIsGalaxy = (id: string) => Q.sourceOf('activity', id) === 'galaxy'
  const contentCount = (q: (typeof pool)[number], source: string, band: BandId, debug: boolean): number => {
    if (debug) return ALL_ACTIVITIES.filter((a) => a.band === band && Q.DEBUG_ACTIVITY_IDS.has(a.id)).length
    switch (source) {
      case 'galaxy':
        return galaxyFor(band, q.idPrefixes).length
      case 'game':
        return GAMES.filter((g) => bandAllows(band, g.minBand)).length * 4
      case 'story':
        return EPISODES.filter((e) => bandAllows(band, e.band)).length
      case 'talk':
        return TALK_MISSIONS.filter((m) => m.band === band).length
      case 'ask-spark':
      case 'garage':
        return 7 // once a day
      default:
        return 99 // course, labs, code lab, trail: dozens of items for every band
    }
  }
  for (const q of pool) {
    const cands = live.filter((r) => (r.kind === q.kind || false) && (!q.sources || q.sources.includes(r.source as never) || (r.debug && q.kind === 'bugfix')))
    const okBands = q.bands.filter((b) => cands.some((r) => contentCount(q, r.source, b, Boolean(r.debug)) >= q.target))
    check(
      `quest ${q.id} is reachable for ${q.bands.join('/')}`,
      cands.length > 0 && okBands.length === q.bands.length,
      cands.length ? `not enough content for ${q.bands.filter((b) => !okBands.includes(b)).join(', ')}` : 'nothing reports it',
    )
  }

  // Every quest matches the event its reporter sends.
  const sampleId: Record<string, string> = {
    think: 'think-neural-m1',
    vision: 'vision-lab:m1',
    'ask-spark': 'ask-spark',
    talk: 'talk-m1',
    story: 'story-spark-gets-lost',
    course: 'L1-S01',
    codelab: 'codelab-m1',
    'spark-trail': 'spark-trail-z-l',
    boss: 'boss-z',
    game: 'drone-hover:t0',
    garage: 'robot-save',
  }
  for (const q of pool) {
    const src0 = q.sources?.[0] ?? (q.kind === 'game' ? 'game' : q.kind === 'build' ? 'garage' : q.kind === 'bugfix' ? 'talk' : q.kind === 'session' || q.kind === 'project' ? 'course' : 'galaxy')
    let id = sampleId[src0] ?? ''
    if (src0 === 'galaxy') id = galaxyFor(q.bands[0], q.idPrefixes)[0]?.id ?? ''
    if (q.kind === 'challenge' && src0 === 'course') id = 'L1-S01-challenge'
    const ev = { kind: q.kind, id, stars: 3, improved: true }
    check(`quest ${q.id} counts its own report (${q.kind} ${id})`, Q.questMatches(q, ev))
  }
  const galaxyQuest = pool.find((q) => q.id === 'q-galaxy-5')
  if (galaxyQuest) check('Ask Spark does not count as a Skill Galaxy mission', !Q.questMatches(galaxyQuest, { kind: 'activity', id: 'ask-spark', stars: 0, improved: false }))
  const bug = pool.find((q) => q.kind === 'bugfix')
  if (bug) check('a debug-program Galaxy activity counts as a bugfix', Q.questMatches(bug, { kind: 'activity', id: 'code-ex-04', stars: 1, improved: false }))

  // ── The weekly draw, all year, per band ──
  let drawOk = true
  let drawWhy = ''
  for (const band of BAND_ORDER) {
    for (const courseOpen of [true, false]) {
      for (let w = 0; w < 53; w++) {
        const d = new Date(Date.UTC(2026, 0, 5 + w * 7, 12))
        const qs = Q.drawQuests(d, { band, courseOpen })
        const main = qs.slice(0, 3)
        const fail =
          qs.length !== 4
            ? 'not 4 quests'
            : new Set(main.map((q) => q.kind)).size !== 3
              ? 'main quests repeat a kind'
              : !qs[3].bonus || main.some((q) => q.bonus)
                ? 'bonus is not the 4th'
                : qs.some((q) => !q.bands.includes(band))
                  ? 'a quest from another band'
                  : !courseOpen && qs.some(Q.isCourseOnly)
                    ? 'a course-only quest without a course'
                    : ''
        if (fail && drawOk) {
          drawOk = false
          drawWhy = `${band} course=${courseOpen} ${Q.weekKey(d)}: ${fail}`
        }
      }
    }
  }
  check('every week: 3 quests of different kinds + a bonus, from the child’s band, course-only hidden without a course', drawOk, drawWhy)
  const wk = new Date(Date.UTC(2026, 10, 30, 12))
  check('the draw rotates week to week', BAND_ORDER.some((b) => Q.drawQuests(wk, { band: b }).map((q) => q.id).join() !== Q.drawQuests(new Date(wk.getTime() + 7 * 86400000), { band: b }).map((q) => q.id).join()))
  check('the draw is the same on every device', Q.drawQuests(wk, { band: 'builders' }).map((q) => q.id).join() === Q.drawQuests(new Date(wk.getTime()), { band: 'builders' }).map((q) => q.id).join())

  // ── hasOpenCourse ──
  const base = P.getProgress()
  // All four levels are playable since Wave 2: every band has an open course. (Course-only
  // quests stay hidden for a closed course: the draw loop above checks course=false for every band.)
  check('every band has an open course (all four levels playable)', BAND_ORDER.every((b) => R.hasOpenCourse({ ...base, band: b, sessionsDone: {} })))
  check('an explorer has an open course (Level 1 is playable)', R.hasOpenCourse({ ...base, band: 'explorers' }))
  check('a started session opens the course for any band', R.hasOpenCourse({ ...base, band: 'engineers', sessionsDone: { 'L1-S01': 2 } }))
  store.set('r2bot_kids_course_v1', JSON.stringify({ v: 1, sessions: { 'L1-S02': { step: 2, reached: 2 } } }))
  check('a session in progress opens the course', R.hasOpenCourse({ ...base, band: 'inventors', sessionsDone: {} }))
  store.delete('r2bot_kids_course_v1')

  // ── XP: replay 0, improvement > 0 ──
  store.clear()
  P.saveProgress({ band: 'inventors' })
  const first = R.reportBestRun({ kind: 'game', id: 'drone-hover:t2', stars: 2, score: 600, xp: 50 })
  check('a first win earns XP', Boolean(first && first.xpGained > 0))
  const xpAfterFirst = P.getProgress().xp
  const replay = R.reportBestRun({ kind: 'game', id: 'drone-hover:t2', stars: 2, score: 600, xp: 50 })
  const worse = R.reportBestRun({ kind: 'game', id: 'drone-hover:t2', stars: 1, score: 560, xp: 50 })
  check('a replay that does not beat the best earns 0 XP', replay === null && worse === null && P.getProgress().xp === xpAfterFirst)
  const better = R.reportBestRun({ kind: 'game', id: 'drone-hover:t2', stars: 2, score: 640, xp: 50 })
  check('an improvement earns XP', Boolean(better && better.xpGained > 0 && P.getProgress().xp > xpAfterFirst))
  check('an improvement is a new personal best', Boolean(better?.newPersonalBest) && P.getProgress().personalBests['drone-hover:t2'] === 640)
  const firstBase = Math.round(50 * 1.0) // 2★ = 100%
  // Strip what quests and badges added, and the +10 personal-best bonus: what is left is the run's own XP.
  const runXp = better ? better.xpGained - 10 - better.questsCompleted.reduce((a, q) => a + q.xp, 0) - 25 * (better.newBadges.length + better.newOtherBadges.length) : -1
  check('an improvement earns half the base XP of a first win', runXp === Math.round(firstBase * R.IMPROVEMENT_XP_SHARE), `run XP ${runXp}`)
  const t0 = R.reportBestRun({ kind: 'game', id: 'maze:t0', stars: 3, score: 30.5, lowerIsBetter: true })
  const slower = R.reportBestRun({ kind: 'game', id: 'maze:t0', stars: 3, score: 31, lowerIsBetter: true })
  const faster = R.reportBestRun({ kind: 'game', id: 'maze:t0', stars: 3, score: 29, lowerIsBetter: true })
  check('lower-is-better: slower replay 0 XP, faster replay XP', Boolean(t0) && slower === null && Boolean(faster && faster.xpGained > 0))
  check('a NaN score reports nothing', R.reportBestRun({ kind: 'game', id: 'x:t0', score: Number.NaN }) === null)
  const gs = src('components/kids/ui/GameShellClient.tsx')
  check('GameShell reports through reportBestRun (no replay XP)', /reportBestRun\(\{\s*kind: 'game'/.test(gs) && !/reportActivity\(/.test(gs))
  const ep = src('components/kids/episodes/EpisodePlayerClient.tsx')
  check('the 3D episode player reports through reportBestRun (rewatching pays nothing)', /reportBestRun\(\{\s*kind: 'episode'/.test(ep) && !/reportActivity\(\{/.test(ep))
  store.clear()
  const w1 = R.reportBestRun({ kind: 'episode', id: 'episode-L1-S01', score: 1 })
  const w2 = R.reportBestRun({ kind: 'episode', id: 'episode-L1-S01', score: 1 })
  check('watching the same episode twice pays XP once', Boolean(w1 && w1.xpGained > 0) && w2 === null)

  // ── Debug-program activity → bugfix + Bug Hunter ──
  store.clear()
  P.saveProgress({ band: 'explorers' })
  const dbg = R.reportActivity({ kind: 'activity', id: 'code-ex-04', stars: 3 })
  check('a debug-program activity earns the Bug Hunter badge', dbg.newBadges.some((b) => b.id === 'debugger'))

  // ── Robot saves: once a day ──
  store.clear()
  P.saveProgress({ band: 'builders' })
  const day1 = new Date(2026, 10, 27, 10)
  const s1 = R.reportRobotSaved(day1)
  const s2 = R.reportRobotSaved(new Date(2026, 10, 27, 18))
  const s3 = R.reportRobotSaved(new Date(2026, 10, 28, 9))
  check('a robot save reports build once a day', Boolean(s1) && s2 === null && Boolean(s3) && s1?.kind === 'build')
  check('the first robot save earns Maker Spirit', Boolean(s1?.newBadges.some((b) => b.id === 'designer')))

  // ── Quests count end to end, this week ──
  store.clear()
  P.saveProgress({ band: 'engineers' })
  const mine = R.currentQuests(new Date(), P.getProgress())
  check('an engineer gets the course-open draw (Level 4 is playable)', mine.map((q) => q.id).join() === Q.drawQuests(new Date(), { band: 'engineers', courseOpen: true }).map((q) => q.id).join())
  const gq = mine.find((q) => q.kind === 'activity' && (!q.sources || q.sources.includes('galaxy')) && !q.minStars)
  if (gq) {
    const acts = galaxyFor('engineers', gq.idPrefixes).slice(0, gq.target)
    let done = false
    for (const a of acts) done = R.reportActivity({ kind: 'activity', id: a.id, stars: 2 }).questsCompleted.some((q) => q.id === gq.id) || done
    check(`this week's ${gq.id} completes after ${gq.target} reports`, done)
  }

  // ── Level-up result carries what the ceremony needs ──
  store.clear()
  P.saveProgress({ band: 'explorers', xp: R.xpForLevel(2) - 5 })
  const lv = R.reportActivity({ kind: 'challenge', id: 'boss-z', xp: 30 })
  check('a level-up reports levels, XP before and the new unlock', lv.levelAfter > lv.levelBefore && lv.xpBefore === R.xpForLevel(2) - 5 && lv.newUnlocks.some((u) => u.atLevel === 2))

  console.log(failures ? `\n${failures} check(s) failed` : '\nAll rewards checks passed')
  process.exit(failures ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
