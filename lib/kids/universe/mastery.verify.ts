// lib/kids/universe/mastery.verify.ts
// Self-check for concept mastery (#27), Recharge missions (#28) and the Launch
// Check + adaptive pacing (#29). Runs the SAME pure code the browser runs:
//   - secure = 3 first-try wins on 3 activities, 2 templates, within 21 days
//   - replays of one activity, one template only, or old wins do not count
//   - secure → fading after 21 days without a win → a recharge restores it
//   - daily plan: 1 new + 1 recharge (fading concept, different template) + 1 stretch,
//     stable through the day, nothing lost by skipping days
//   - Launch Check: 6–8 missions, sensible start points, same-concept easier item
//   - pacing: skip-to-Ace after 3 first-try wins, easier after 2 misses
//   - the mastery fields travel in the backup code and merge without loss
//   - the teacher grid code round-trips
//
// Run:  npx tsx lib/kids/universe/mastery.verify.ts      (exit 1 on any ✗)

// ── a tiny browser for Node (the backup code and store helpers need localStorage) ──
const store = new Map<string, string>()
Object.assign(globalThis, {
  window: {
    localStorage: {
      getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
      setItem: (k: string, v: string) => void store.set(k, String(v)),
      removeItem: (k: string) => void store.delete(k),
    },
    dispatchEvent: () => true,
    addEventListener: () => undefined,
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

async function main() {
  const M = await import('./mastery')
  const PR = await import('../activities/progress')
  const PA = await import('../activities/pacing')
  const LC = await import('../activities/launch-check')
  const C = await import('../activities/content')
  const P = await import('../../kids-progress')
  type Try = import('./mastery').ConceptTry

  const T = (a: string, t: string, d: string, ok: 0 | 1, c: Try['c'] = ['loops'], k: Try['k'] = 'code'): Try => ({ a, c, t: t as Try['t'], k, b: 'builders', v: 2, d, ok })
  const none = { conceptSecured: {} as Record<string, string> }

  // ── #27 the secure rule ──
  {
    const log = [T('a1', 'sequence-path', '2026-11-01', 1), T('a2', 'predict-output', '2026-11-03', 1), T('a3', 'sequence-path', '2026-11-05', 1)]
    const s = M.conceptState('loops', log, {}, '2026-11-05')
    check('3 first-try wins, 2 templates, 5 days → secure', s.status === 'secure', s.status)
    check('secure shows a full battery', s.cells === 4, String(s.cells))
    const one = M.conceptState('loops', [T('a1', 'sequence-path', '2026-11-01', 1), T('a2', 'sequence-path', '2026-11-02', 1), T('a3', 'sequence-path', '2026-11-03', 1)], {}, '2026-11-03')
    check('one template only → still learning', one.status === 'learning', one.status)
    const replay = M.conceptState('loops', [T('a1', 'sequence-path', '2026-11-01', 1), T('a1', 'sequence-path', '2026-11-02', 1), T('a2', 'predict-output', '2026-11-03', 1)], {}, '2026-11-03')
    check('replaying one activity counts once', replay.status === 'learning' && replay.recentWins === 2, `${replay.status} ${replay.recentWins}`)
    const slow = M.conceptState('loops', [T('a1', 'sequence-path', '2026-10-01', 1), T('a2', 'predict-output', '2026-11-01', 1), T('a3', 'sequence-path', '2026-11-03', 1)], {}, '2026-11-03')
    check('wins spread over more than 21 days → learning', slow.status === 'learning', slow.status)
    const misses = M.conceptState('loops', [T('a1', 'sequence-path', '2026-11-01', 0), T('a2', 'predict-output', '2026-11-01', 0), T('a3', 'sequence-path', '2026-11-02', 0)], {}, '2026-11-02')
    check('misses alone → learning, no cells', misses.status === 'learning' && misses.cells === 0 && misses.misses === 3, JSON.stringify(misses))
    check('untouched concept → new', M.conceptState('careers', log, {}, '2026-11-05').status === 'new')

    // Secure → fading → recharged.
    let data = { conceptLog: [] as Try[], conceptSecured: {} as Record<string, string> }
    let newly: string[] = []
    for (const t of log) {
      const r = M.applyConceptTry(data, t)
      data = { conceptLog: r.conceptLog, conceptSecured: r.conceptSecured }
      newly = newly.concat(r.newlySecure)
    }
    check('applyConceptTry reports newly secure once', newly.length === 1 && newly[0] === 'loops' && data.conceptSecured.loops === '2026-11-05', JSON.stringify(newly))
    check('still secure 20 days after the last win', M.conceptState('loops', data.conceptLog, data.conceptSecured, '2026-11-25').status === 'secure')
    const faded = M.conceptState('loops', data.conceptLog, data.conceptSecured, '2026-11-26')
    check('21 days without a win → fading', faded.status === 'fading' && faded.cells === 1, `${faded.status} ${faded.cells}`)
    check('fading battery empties after 42 days', M.conceptState('loops', data.conceptLog, data.conceptSecured, '2026-12-20').cells === 0)
    const r = M.applyConceptTry(data, T('a9', 'flowchart-builder', '2026-12-01', 1))
    check('one first-try recharge win → secure again (reported as recharged)', r.recharged.includes('loops') && M.conceptState('loops', r.conceptLog, r.conceptSecured, '2026-12-01').status === 'secure', JSON.stringify(r.recharged))
    const miss = M.applyConceptTry(data, T('a9', 'flowchart-builder', '2026-12-01', 0))
    check('a recharge miss leaves it fading', M.conceptState('loops', miss.conceptLog, miss.conceptSecured, '2026-12-01').status === 'fading')
    check('a future securedAt (clock change) is not trusted', M.conceptState('loops', [], { loops: '2030-01-01' }, '2026-11-01').status === 'new')

    // Teacher grid.
    const code = M.conceptGridCode(data, '2026-11-26')
    check('grid code has one letter per concept', code.length === M.CONCEPT_IDS.length, code)
    const parsed = M.parseConceptGridCode(code)
    check('grid code round-trips', parsed.loops.status === 'fading' && parsed.careers.status === 'new')
    const stuck = { conceptLog: [T('a1', 'sequence-path', '2026-11-01', 0), T('a2', 'predict-output', '2026-11-01', 0), T('a3', 'debug-program', '2026-11-02', 0)], ...none }
    const g = M.conceptGrid(stuck, '2026-11-02')
    check('three misses and no win → needsHelp (upper-case in the code)', g.loops.needsHelp && M.conceptGridCode(stuck, '2026-11-02').includes('L'))
    check('log is capped', M.applyConceptTry({ conceptLog: Array.from({ length: M.CONCEPT_LOG_MAX }, (_, i) => T(`x${i}`, 'estimate', '2026-11-01', 1)), ...none }, T('y', 'estimate', '2026-11-02', 1)).conceptLog.length === M.CONCEPT_LOG_MAX)
    check('cleanConceptLog drops junk and unknown concepts', M.cleanConceptLog([{ a: 'x', c: ['nope'], t: 'estimate', k: 'code', b: 'builders', d: '2026-11-01', ok: 1 }, 5, null, { a: 'y', c: ['loops', 'bad'], t: 'estimate', k: 'code', b: 'builders', d: '2026-11-01', ok: 1, v: 9 }]).length === 1)
    check('cleanConceptDays keeps only known concepts and real days', JSON.stringify(M.cleanConceptDays({ loops: '2026-11-01', nope: '2026-11-01', data: 'yesterday' })) === '{"loops":"2026-11-01"}')
  }

  // ── every live activity is tagged ──
  const summaries = C.allSummaries()
  check('every live activity summary carries concepts', summaries.every((s) => (s.concepts?.length ?? 0) >= 1 && (s.concepts?.length ?? 0) <= 3))

  // ── #28 daily plan ──
  {
    const band = 'builders' as const
    const fresh = PR.dailyMissionPlan(summaries, band, '2026-11-27', {})
    check('fresh child: three missions', fresh.length === 3, fresh.map((m) => m.kind).join(','))
    check('fresh child: new + explore + stretch (nothing to recharge yet)', fresh[0]?.kind === 'new' && fresh[1]?.kind === 'explore' && fresh[2]?.kind === 'stretch', fresh.map((m) => m.kind).join(','))
    check('fresh child: three different missions', new Set(fresh.map((m) => m.activity.id)).size === 3)

    // A child who secured "physics" weeks ago with gear-train and lever-balance.
    const phys = summaries.filter((s) => s.concepts?.[0] === 'physics' && s.band === band)
    const gear = phys.filter((s) => s.template === 'gear-train').slice(0, 2)
    const lever = phys.filter((s) => s.template === 'lever-balance').slice(0, 1)
    const wins = [...gear, ...lever]
    const log: Try[] = wins.map((s, i) => ({ a: s.id, c: s.concepts ?? [], t: s.template, k: s.track, b: s.band, v: s.difficulty, d: `2026-10-0${i + 1}`, ok: 1 }))
    const done = Object.fromEntries(wins.map((s, i) => [s.id, { stars: 3, attempts: 1, score: 1, plays: 1, at: `2026-10-0${i + 1}` }]))
    const ctx = { done, mastery: { conceptLog: log, conceptSecured: { physics: '2026-10-03' } } }
    const plan = PR.dailyMissionPlan(summaries, band, '2026-11-27', ctx)
    const re = plan.find((m) => m.kind === 'recharge')
    check('fading concept → a recharge mission', !!re && re.concept === 'physics', plan.map((m) => `${m.kind}:${m.concept ?? ''}`).join(','))
    check('recharge uses a different template from the last win', !!re && re.activity.template !== 'lever-balance' && !!re.activity.concepts?.includes('physics'), re?.activity.template)
    check('plan is 1 new + 1 recharge + 1 stretch', plan.map((m) => m.kind).join(',') === 'new,recharge,stretch', plan.map((m) => m.kind).join(','))
    const stretch = plan.find((m) => m.kind === 'stretch')
    check('stretch is in a different track from the new mission', !!stretch && stretch.activity.track !== plan[0].activity.track)

    // Finishing today's new mission does not reshuffle today.
    const n = plan[0].activity
    const after = { done: { ...done, [n.id]: { stars: 3, attempts: 1, score: 1, plays: 1, at: '2026-11-27' } }, mastery: { conceptLog: [...log, { a: n.id, c: n.concepts ?? [], t: n.template, k: n.track, b: n.band, v: n.difficulty, d: '2026-11-27', ok: 1 as const }], conceptSecured: { physics: '2026-10-03' } } }
    const again = PR.dailyMissionPlan(summaries, band, '2026-11-27', after)
    check('finishing a mission does not reshuffle the day', again.map((m) => m.activity.id).join() === plan.map((m) => m.activity.id).join())
    const tomorrow = PR.dailyMissionPlan(summaries, band, '2026-11-28', after)
    check('tomorrow moves on (the finished mission is not offered as new)', tomorrow[0].activity.id !== n.id)
    const later = PR.dailyMissionPlan(summaries, band, '2027-01-15', ctx)
    check('skipping weeks costs nothing: still three missions, still a recharge', later.length === 3 && later.some((m) => m.kind === 'recharge'))
    check('dailyMissions (compat) returns the same activities', PR.dailyMissions(summaries, band, '2026-11-27', 3, ctx).map((a) => a.id).join() === plan.map((m) => m.activity.id).join())

    // Start points steer "new".
    const starts = { motion: { band, minDifficulty: 4 } }
    const nx = PR.nextActivities(summaries, {}, band, { track: 'motion', starts, limit: 1 })[0]
    check('nextActivities respects a start point', !!nx && nx.band === band && nx.difficulty >= 4, `${nx?.band} ${nx?.difficulty}`)
    const motion = PR.orderActivities(summaries.filter((s) => s.track === 'motion'))
    const states = PR.nodeStates(motion, {}, { start: starts.motion })
    const nextId = Object.entries(states).find(([, v]) => v === 'next')?.[0]
    const nextA = motion.find((a) => a.id === nextId)
    check('the glowing "next" star moves to the start point', !!nextA && PR.atOrPastStart(nextA, starts.motion))
  }

  // ── #29 pacing ──
  {
    const w = (i: number, ok: 0 | 1): Try => T(`m${i}`, 'estimate', '2026-11-20', ok, ['physics'], 'motion')
    check('three first-try wins in a row → offer skip to Ace', PA.shouldOfferSkip([w(1, 1), w(2, 1), w(3, 1)], 'motion', 'builders', 2))
    check('two wins → no offer yet', !PA.shouldOfferSkip([w(1, 0), w(2, 1), w(3, 1)], 'motion', 'builders', 2))
    check('already at Ace → no offer', !PA.shouldOfferSkip([w(1, 1), w(2, 1), w(3, 1)], 'motion', 'builders', 2, { band: 'builders', minDifficulty: 4 }))
    check('wins in another track do not count', !PA.shouldOfferSkip([w(1, 1), w(2, 1), T('z', 'estimate', '2026-11-20', 1, ['loops'], 'code')], 'motion', 'builders', 2))
    check('two misses in a row → offer easier', PA.shouldOfferEasier([w(1, 1), w(2, 0), w(3, 0)], 'motion'))
    check('two wrong checks inside one mission → offer easier', PA.shouldOfferEasier([], 'motion', 2))
    const hard = summaries.find((s) => s.track === 'mechanics' && s.band === 'inventors' && s.difficulty >= 4 && s.concepts?.[0] === 'physics')
    const easy = hard ? PA.easierSameConcept(summaries, hard, {}) : undefined
    check('easier mission shares the concept and is easier', !!hard && !!easy && !!easy.concepts?.includes('physics') && (easy.band !== hard.band || easy.difficulty < hard.difficulty), `${hard?.id} → ${easy?.id}`)
    check('start points round-trip', PA.formatStart({ band: 'inventors', minDifficulty: 4 }) === 'inventors:4' && PA.parseStart('inventors:4')?.minDifficulty === 4 && PA.parseStart('nope:9') === undefined)
    check('tiers map onto difficulty', PA.tierForDifficulty(1) === 'Cadet' && PA.tierForDifficulty(3) === 'Pilot' && PA.tierForDifficulty(4) === 'Ace' && PA.tierForDifficulty(5) === 'Legend')
  }

  // ── #29 Launch Check ──
  {
    for (const t of ['motion', 'code', 'ai'] as const) {
      for (const band of ['explorers', 'builders', 'engineers'] as const) {
        const rungs = LC.launchLadder(summaries, t, band)
        // A child who wins everything.
        let s = LC.launchStart(rungs, band)
        let n = 0
        while (!s.done && n < 20) {
          const id = LC.launchNextItem(rungs, s, summaries)
          if (!id) break
          s = LC.launchAdvance(rungs, s, { id, ok: true })
          n++
        }
        const top = LC.launchPlacement(rungs, s)
        check(`${t}/${band}: a child who wins everything plays 6–8 and starts high`, n >= LC.LAUNCH_MIN && n <= LC.LAUNCH_MAX && (top.minDifficulty >= 4 || top.band !== band), `${n} → ${top.band}:${top.minDifficulty}`)
        // A child who misses everything.
        s = LC.launchStart(rungs, band)
        n = 0
        while (!s.done && n < 20) {
          const id = LC.launchNextItem(rungs, s, summaries)
          if (!id) break
          s = LC.launchAdvance(rungs, s, { id, ok: false })
          n++
        }
        const low = LC.launchPlacement(rungs, s)
        check(`${t}/${band}: a child who misses everything starts at the very start of the lowest band`, n >= LC.LAUNCH_MIN && n <= LC.LAUNCH_MAX && low.band === rungs[0].band && low.minDifficulty === 1, `${n} → ${low.band}:${low.minDifficulty}`)
        check(`${t}/${band}: never repeats a mission`, new Set(s.items.map((i) => i.id)).size === s.items.length)
      }
    }
    // After two misses the next item shares a concept with the last miss where possible.
    const rungs = LC.launchLadder(summaries, 'mechanics', 'inventors')
    let s = LC.launchStart(rungs, 'inventors')
    const first = LC.launchNextItem(rungs, s, summaries) as string
    s = LC.launchAdvance(rungs, s, { id: first, ok: false })
    const second = LC.launchNextItem(rungs, s, summaries) as string
    s = LC.launchAdvance(rungs, s, { id: second, ok: false })
    const third = LC.launchNextItem(rungs, s, summaries) as string
    const byId = new Map(summaries.map((a) => [a.id, a]))
    const shares = byId.get(third)?.concepts?.some((c) => byId.get(second)?.concepts?.includes(c))
    const anyShares = (rungs[s.rung]?.ids ?? []).some((id) => id !== first && id !== second && byId.get(id)?.concepts?.some((c) => byId.get(second)?.concepts?.includes(c)))
    check('two misses → the easier item is on the same concept (when the rung has one)', !anyShares || !!shares, `${second} → ${third}`)
    {
      // Builders: wins Pilot (rung b3) but misses Ace (b4) twice → starts at Pilot, not on the wall.
      const br = LC.launchLadder(summaries, 'ai', 'builders')
      let st = LC.launchStart(br, 'builders')
      for (const ok of [true, true, false, true, false, true]) {
        const id = LC.launchNextItem(br, st, summaries)
        if (!id || st.done) break
        st = LC.launchAdvance(br, st, { id, ok })
      }
      const p = LC.launchPlacement(br, st)
      check('missed the rung above twice → start on the rung already won', p.band === 'builders' && p.minDifficulty === 3, `${p.band}:${p.minDifficulty}`)
    }
    check('a mid-way child is placed between the ends', (() => {
      let st = LC.launchStart(rungs, 'inventors')
      const pattern = [true, true, false, true, false, false, true, false]
      for (const ok of pattern) {
        if (st.done) break
        const id = LC.launchNextItem(rungs, st, summaries)
        if (!id) break
        st = LC.launchAdvance(rungs, st, { id, ok })
      }
      const p = LC.launchPlacement(rungs, st)
      return p.band === 'inventors' && p.minDifficulty >= 2 && p.minDifficulty <= 5
    })())
  }

  // ── backup code carries mastery ──
  {
    store.clear()
    const log: Try[] = [T('a1', 'sequence-path', '2026-11-01', 1), T('a2', 'predict-output', '2026-11-03', 1)]
    P.saveProgress({ xp: 10, conceptLog: log, conceptSecured: { loops: '2026-11-03' }, galaxyStart: { motion: 'inventors:4' } })
    const code = await P.exportProgressCode()
    store.clear()
    P.saveProgress({ conceptLog: [T('b1', 'estimate', '2026-11-04', 0)], conceptSecured: { loops: '2026-11-10' }, galaxyStart: { code: 'builders:3' } })
    const r = await P.importProgressCode(code)
    const p = P.getProgress()
    check('restore succeeds', r.ok)
    check('concept log merges (union, day order)', p.conceptLog.length === 3 && p.conceptLog.map((t) => t.a).join() === 'a1,a2,b1', p.conceptLog.map((t) => t.a).join())
    check('secured day keeps the earliest', p.conceptSecured.loops === '2026-11-03')
    check('start points merge (device wins per track)', p.galaxyStart.motion === 'inventors:4' && p.galaxyStart.code === 'builders:3')
    const r2 = await P.importProgressCode(code)
    check('restoring twice adds nothing', r2.ok && P.getProgress().conceptLog.length === 3)
    store.clear()
    check('a fresh store has empty mastery defaults', P.getProgress().conceptLog.length === 0 && Object.keys(P.getProgress().galaxyStart).length === 0)
  }

  // ── the store helpers ──
  {
    store.clear()
    const s = summaries.find((x) => x.concepts?.includes('loops')) as import('../activities/progress').ActivitySummary
    const o = PR.recordActivityResult(s.id, { stars: 3, attempts: 1, score: 1 }, s)
    check('recordActivityResult with meta logs a first-try win', P.getProgress().conceptLog.length === 1 && P.getProgress().conceptLog[0].ok === 1 && o.firstTime)
    PR.recordActivityMiss(s)
    check('recordActivityMiss logs a miss and marks nothing done', P.getProgress().conceptLog.length === 2 && P.getProgress().conceptLog[1].ok === 0 && Object.keys(PR.getActivitiesDone()).length === 1)
    PR.recordActivityResult(s.id, { stars: 1, attempts: 3, score: 1 })
    check('recordActivityResult without meta logs nothing (older callers)', P.getProgress().conceptLog.length === 2)
    PR.recordActivityResult(s.id, { stars: 2, attempts: 1, score: 1 }, s, { assisted: true })
    check('a hinted first try is logged, but not as a first-try win', P.getProgress().conceptLog.length === 3 && P.getProgress().conceptLog[2].ok === 0)
    PA.setTrackStart('motion', { band: 'engineers', minDifficulty: 4 })
    check('setTrackStart saves into the one store', PA.readStarts().motion?.band === 'engineers')
  }

  console.log(failures ? `\n${failures} mastery check(s) failed` : '\nAll mastery checks passed')
  if (failures) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

export {}
