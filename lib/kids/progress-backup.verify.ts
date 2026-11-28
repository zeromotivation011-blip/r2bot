// lib/kids/progress-backup.verify.ts
// Self-check for the progress backup code in lib/kids-progress.ts
// (exportProgressCode / importProgressCode). Runs the SAME code the browser
// runs, against an in-memory localStorage:
//   - round trip, compressed and plain: a fresh device gets everything back
//   - merging never lowers progress (max of numbers, union of lists/badges)
//   - the Skill Galaxy "done" map and caller extras travel with the code
//   - bad input (empty, junk, a typo, a wrong version, a huge or hostile
//     payload) is refused with a reason and never throws or writes anything
//   - KIDS_PROGRESS_EVENT fires on a successful restore
//   - misconception counts (roadmap #30, `checkMisconceptions`): travel in the
//     code, merge by the higher count, hostile keys and free text are dropped,
//     an older code without them restores to an empty map
//   - profiles (lib/kids/profiles.ts, roadmap #41/#90): the device's original
//     child becomes member #1 with zero data loss; siblings and classmates never
//     see each other's progress, robot or Galaxy map; "Done" clears the device;
//     backup codes work per profile
//
// Run:  npx tsx lib/kids/progress-backup.verify.ts      (exit 1 on any ✗)

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
  const P = await import('../kids-progress')
  const ACTS = 'r2bot_kids_activities_v1'

  // ── Device A: a child with real progress ──
  P.saveProgress({
    xp: 1234,
    totalStars: 41,
    band: 'builders',
    explorerName: 'Nova',
    robotName: 'Bolt',
    robotColor: '#22C55E',
    badges: { 'first-drive': '2026-11-01', 'bug-squasher': '2026-11-10' },
    unlocks: ['paint-ocean', 'decal-lightning'],
    sessionsDone: { 'L1-S01': 3, 'L1-S02': 2 },
    personalBests: { 'drone-hover:pilot': 88 },
    episodesDone: { 'spark-wakes-up': 3 },
    codeMissions: { 'first-steps': 2 },
    completedLevels: ['spark-garden/what-is-spark'],
    playDays: ['2026-11-20', '2026-11-21'],
    avatar: { id: 'robo', color: '#00B8D4' },
    checkMisconceptions: { 'L1-S05.turn-moves-forward': 2, 'L2-S04.taller-is-stronger': 1 },
  })
  store.set(ACTS, JSON.stringify({ 'seq-1': { stars: 3, attempts: 1, score: 1, plays: 2, at: '2026-11-20' } }))
  const before = P.getProgress()

  const codeZ = await P.exportProgressCode({ extras: { robot: 'box.tracks.camera.gripper.line.22C55E.3B82F6.Bolt' } })
  const codeJ = await P.exportProgressCode({ compress: false })
  check('code has the R2K1 prefix, a mode and a checksum', /^R2K1\.[zj]\.[A-Za-z0-9_-]+\.[0-9a-f]{8}$/.test(codeZ), codeZ.slice(0, 40))
  check('compressed code uses deflate where CompressionStream exists', codeZ.startsWith('R2K1.z.'))
  check('plain code works without compression', codeJ.startsWith('R2K1.j.'))
  check('compressed code is shorter than plain', codeZ.length < codeJ.length, `${codeZ.length} vs ${codeJ.length}`)
  console.log(`  (code length: ${codeZ.length} compressed, ${codeJ.length} plain)`)

  // ── Device B: a fresh phone ──
  for (const code of [codeZ, codeJ]) {
    store.clear()
    let events = 0
    const onEv = () => events++
    target.addEventListener(P.KIDS_PROGRESS_EVENT, onEv)
    const r = await P.importProgressCode(`  ${code.slice(0, 20)}\n${code.slice(20)}  `) // pasted with whitespace
    target.removeEventListener(P.KIDS_PROGRESS_EVENT, onEv)
    const mode = code.startsWith('R2K1.z') ? 'compressed' : 'plain'
    check(`${mode}: import succeeds`, r.ok, r.ok ? '' : r.reason)
    if (!r.ok) continue
    const after = P.getProgress()
    check(`${mode}: xp, stars, band and names restored`, after.xp === 1234 && after.totalStars === 41 && after.band === 'builders' && after.explorerName === 'Nova' && after.robotName === 'Bolt')
    check(`${mode}: badges, unlocks, sessions, bests restored`,
      JSON.stringify(after.badges) === JSON.stringify(before.badges) &&
      JSON.stringify(after.unlocks) === JSON.stringify(before.unlocks) &&
      JSON.stringify(after.sessionsDone) === JSON.stringify(before.sessionsDone) &&
      JSON.stringify(after.personalBests) === JSON.stringify(before.personalBests))
    check(`${mode}: misconception counts restored`, JSON.stringify(after.checkMisconceptions) === JSON.stringify({ 'L1-S05.turn-moves-forward': 2, 'L2-S04.taller-is-stronger': 1 }))
    check(`${mode}: avatar and course levels restored`, after.avatar.id === 'robo' && after.completedLevels.includes('spark-garden/what-is-spark'))
    check(`${mode}: Skill Galaxy activities restored`, JSON.parse(store.get(ACTS) ?? '{}')['seq-1']?.stars === 3)
    check(`${mode}: KIDS_PROGRESS_EVENT fired`, events >= 1)
    check(`${mode}: changed and added counts reported`, r.changed && r.added.xp === 1234 && r.added.badges === 2 && r.added.activities === 1)
    if (mode === 'compressed') check('extras travel with the code', r.extras.robot === 'box.tracks.camera.gripper.line.22C55E.3B82F6.Bolt')
  }

  // ── Merge never lowers progress ──
  store.clear()
  P.saveProgress({
    xp: 5000,
    totalStars: 10,
    explorerName: 'Comet',
    badges: { 'first-drive': '2026-11-05', 'tuner': '2026-11-22' },
    unlocks: ['trail-plasma'],
    sessionsDone: { 'L1-S01': 1, 'L1-S03': 3 },
    personalBests: { 'drone-hover:pilot': 95 },
    playDays: ['2026-11-25'],
    checkMisconceptions: { 'L1-S05.turn-moves-forward': 5, 'L3-S02.gain-bigger-is-better': 1 },
  })
  store.set(ACTS, JSON.stringify({ 'seq-1': { stars: 1, attempts: 4, score: 0.5, plays: 5, at: '2026-11-25' } }))
  const m = await P.importProgressCode(codeZ)
  const mp = P.getProgress()
  check('merge: import ok', m.ok)
  check('merge: xp keeps the higher value (5000, not 1234)', mp.xp === 5000)
  check('merge: stars take the max (41)', mp.totalStars === 41)
  check('merge: explorer name on this device wins', mp.explorerName === 'Comet')
  check('merge: badges are a union, earliest date kept', Object.keys(mp.badges).length === 3 && mp.badges['first-drive'] === '2026-11-01')
  check('merge: unlocks are a union', mp.unlocks.includes('trail-plasma') && mp.unlocks.includes('paint-ocean'))
  check('merge: sessions are a union with best stars', mp.sessionsDone['L1-S01'] === 3 && mp.sessionsDone['L1-S03'] === 3 && mp.sessionsDone['L1-S02'] === 2)
  check('merge: personal bests keep the best (95)', mp.personalBests['drone-hover:pilot'] === 95)
  check('merge: play days are a union', mp.playDays.length === 3)
  check('merge: misconception counts never lower (5 kept) and are a union',
    mp.checkMisconceptions['L1-S05.turn-moves-forward'] === 5 && mp.checkMisconceptions['L3-S02.gain-bigger-is-better'] === 1 && mp.checkMisconceptions['L2-S04.taller-is-stronger'] === 1)
  const sa = JSON.parse(store.get(ACTS) ?? '{}')['seq-1']
  check('merge: activity keeps best stars and most plays', sa?.stars === 3 && sa?.plays === 5)
  const again = await P.importProgressCode(codeZ)
  check('importing the same code twice changes nothing', again.ok && !again.changed)

  // ── Bad input: refused with a reason, never throws, writes nothing ──
  const snapshot = JSON.stringify(P.getProgress())
  const flip = (c: string) => {
    const parts = c.split('.')
    const b = parts[2]
    const i = Math.floor(b.length / 2)
    parts[2] = b.slice(0, i) + (b[i] === 'A' ? 'B' : 'A') + b.slice(i + 1)
    return parts.join('.')
  }
  const bad: [string, string, string[]][] = [
    ['empty string', '', ['empty']],
    ['only spaces', '   \n ', ['empty']],
    ['random words', 'hello robot', ['format']],
    ['a future version', codeZ.replace(/^R2K1/, 'R2K9'), ['version']],
    ['a one-letter typo (compressed)', flip(codeZ), ['checksum', 'corrupt']],
    ['a one-letter typo (plain)', flip(codeJ), ['checksum', 'corrupt']],
    ['a wrong checksum', codeJ.replace(/\.[0-9a-f]{8}$/, '.00000000'), ['checksum']],
    ['bad base64', 'R2K1.j.@@@@.12345678', ['corrupt']],
    ['truncated', codeZ.slice(0, Math.floor(codeZ.length / 2)), ['format']],
    ['a huge paste', `R2K1.j.${'A'.repeat(300_000)}.12345678`, ['format']],
  ]
  // A well-formed code whose JSON is not progress.
  const enc = (o: unknown) => {
    const json = JSON.stringify(o)
    const bytes = new TextEncoder().encode(json)
    let bin = ''
    for (const b of bytes) bin += String.fromCharCode(b)
    let h = 0x811c9dc5
    for (const b of bytes) h = Math.imul(h ^ b, 0x01000193) >>> 0
    return `R2K1.j.${btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}.${h.toString(16).padStart(8, '0')}`
  }
  bad.push(['valid wrapper, wrong shape', enc({ v: 1, p: 'nope' }), ['shape']])
  bad.push(['valid wrapper, wrong v', enc({ v: 2, p: { xp: 1 } }), ['shape']])
  bad.push(['valid wrapper, an array', enc([1, 2, 3]), ['shape']])
  for (const [name, code, reasons] of bad) {
    let threw = false
    let reason = ''
    try {
      const r = await P.importProgressCode(code)
      reason = r.ok ? 'ok' : r.reason
    } catch {
      threw = true
    }
    check(`refuses ${name}`, !threw && reasons.includes(reason), threw ? 'threw' : reason)
  }
  // Non-string input from JS callers.
  let threw = false
  try {
    await P.importProgressCode(null as unknown as string)
  } catch {
    threw = true
  }
  check('refuses a non-string without throwing', !threw)
  check('no bad input changed the progress', JSON.stringify(P.getProgress()) === snapshot)

  // ── Hostile values are cleaned, not trusted ──
  const hostile = enc({
    v: 1,
    p: {
      xp: -50, totalStars: 'lots', band: 'admins', badges: { ok: '2026-11-01', bad: 7 }, unlocks: ['x', 3, 'y'], robotColor: 'red', avatar: { id: 'a', color: 'javascript:' },
      checkMisconceptions: { 'L1-S03.order-does-not-matter': 1e9, 'My answer was the wheels': 3, 'L9-S01.x': 1, 'L1-S02.count-the-start-square': -1, 'L1-S07.robot-reads-our-plan': 'two' },
    },
  })
  const h = await P.importProgressCode(hostile)
  const hp = P.getProgress()
  check('hostile: import ok but bad fields dropped', h.ok && hp.xp === 5000 && hp.totalStars === 41 && hp.band === 'builders' && hp.badges.ok === '2026-11-01' && !('bad' in hp.badges))
  check('hostile: misconception keys must be "Lx-Syy.id", counts 1–99, no free text',
    hp.checkMisconceptions['L1-S03.order-does-not-matter'] === 99 &&
    !Object.keys(hp.checkMisconceptions).some((k) => !/^L[1-4]-S\d{2}\.[a-z0-9][a-z0-9-]*$/.test(k)) &&
    !('L1-S02.count-the-start-square' in hp.checkMisconceptions) && !('L1-S07.robot-reads-our-plan' in hp.checkMisconceptions))
  check('hostile: list keeps only strings', hp.unlocks.includes('x') && hp.unlocks.includes('y') && !hp.unlocks.some((u) => typeof u !== 'string'))

  // ── One star count: old totalStars + course sessions + Galaxy, no double counting ──
  store.clear()
  P.saveProgress({ totalStars: 7, starsByLevel: { 'a/b': 3 }, episodesDone: { e: 2 }, codeMissions: { m: 2 }, sessionsDone: { 'L1-S01': 3 } })
  store.set(ACTS, JSON.stringify({ x: { stars: 2, attempts: 1, score: 1, plays: 1, at: '' } }))
  check('collectedStars = max(totalStars, legacy items) + sessions + Galaxy', P.collectedStars() === 7 + 3 + 2, String(P.collectedStars()))

  // ── An empty device's code restores cleanly ──
  store.clear()
  const blank = await P.exportProgressCode()
  const b = await P.importProgressCode(blank)
  check('a brand-new device exports a valid code', b.ok)
  check('a code without misconceptions restores to an empty map (safe default)', JSON.stringify(P.getProgress().checkMisconceptions) === '{}')

  // ── The check-step recorder writes the one progress store ──
  {
    const S = await import('./misconceptions/store')
    store.clear()
    let events = 0
    const onEv = () => events++
    target.addEventListener(P.KIDS_PROGRESS_EVENT, onEv)
    S.recordCheckMisconception('L1-S05', 'turn-moves-forward')
    S.recordCheckMisconception('L1-S05', 'turn-moves-forward')
    S.recordCheckMisconception('L1-S10', 'repeat-means-extra')
    S.recordCheckMisconception('L1-S10', 'Not an id!')
    S.recordCheckMisconception('nope', 'turn-moves-forward')
    target.removeEventListener(P.KIDS_PROGRESS_EVENT, onEv)
    check('recorder: counts by key, refuses free text and bad sessions', JSON.stringify(P.getProgress().checkMisconceptions) === JSON.stringify({ 'L1-S05.turn-moves-forward': 2, 'L1-S10.repeat-means-extra': 1 }))
    check('recorder: fires KIDS_PROGRESS_EVENT (the class sync listens)', events === 3)
    check('recorder: most recent first for the snapshot', Object.keys(S.recentCheckMisconceptions())[0] === 'L1-S10.repeat-means-extra')
    for (let i = 1; i <= 70; i++) S.recordCheckMisconception(`L2-S${String((i % 24) + 1).padStart(2, '0')}`, `idea-${i}`)
    const kept = P.getProgress().checkMisconceptions
    check('recorder: keeps at most 60 keys, newest kept', Object.keys(kept).length === 60 && 'L2-S23.idea-70' in kept && !('L1-S05.turn-moves-forward' in kept))
    check('recorder: is not a reward (no XP, no stars)', P.getProgress().xp === 0 && P.collectedStars() === 0)
  }

  // ── Profiles: migration of the original child into member #1 ──
  await profileChecks(P)

  console.log(failures ? `\n${failures} check(s) failed` : '\nAll progress backup checks passed')
  process.exit(failures ? 1 : 0)
}

/**
 * The retired swap layout (before 28 Nov 2026) moved into the profileKey()
 * layout by migrateSwappedLayout(). The OLD switch is re-implemented here, so
 * the device is built exactly as the old code left it, without calling any
 * profiles.ts function until the migration should run.
 */
async function swapMigrationChecks() {
  const PR = await import('./profiles')
  const P = await import('../kids-progress')
  const SEP = '::'
  // One sample key for every formerly swapped store (fixed keys + one per prefix).
  const KEYS = [...PR.LEGACY_SWAPPED_KEYS, ...PR.LEGACY_SWAPPED_PREFIXES.map((p) => `${p}sample`)]
  const isLegacy = (k: string) => !k.includes(SEP) && (PR.LEGACY_SWAPPED_KEYS.includes(k) || PR.LEGACY_SWAPPED_PREFIXES.some((p) => k.startsWith(p) && k.length > p.length))
  const writeState = (active: string | null, ids: string[]) =>
    store.set(PR.PROFILES_KEY, JSON.stringify({ v: 1, mode: 'home', active, profiles: ids.map((id) => ({ id, nickname: `Kid ${id}`, picture: '🚀', color: '#FC6818', band: null, pw: null, className: null, createdAt: '', lastUsedAt: '', pending: [] })) }))
  /** The old switchProfile, swap part only (copy live → ::from, bring ::to back). */
  const oldSwitch = (from: string | null, to: string | null, ids: string[]) => {
    const live = [...store.keys()].filter(isLegacy)
    if (from !== null) for (const k of live) store.set(`${k}${SEP}${from}`, store.get(k) as string)
    for (const k of live) store.delete(k)
    if (to !== null) {
      for (const k of [...store.keys()]) {
        if (!k.endsWith(`${SEP}${to}`)) continue
        const base = k.slice(0, -(SEP.length + to.length))
        if (!isLegacy(base)) continue
        store.set(base, store.get(k) as string)
        store.delete(k)
      }
    }
    writeState(to, ids)
  }
  /** Each child writes their own value into every swapped store while they play. */
  const play = (who: string) => {
    for (const k of KEYS) store.set(k, JSON.stringify({ owner: who, k }))
  }
  const own = (who: string, k: string) => JSON.stringify({ owner: who, k })
  const snapshot = () => JSON.stringify([...store.entries()].sort())

  /** Builds an old-layout device with p1, Kai and Ada; `last` is who is playing (null = nobody). */
  const oldDevice = (last: string | null, guestData = false) => {
    store.clear()
    const ids = ['p1', 'pkai', 'pada']
    writeState('p1', ids)
    play('p1')
    store.set('r2bot_kids_v2', JSON.stringify({ xp: 900 })) // progress was always namespaced: must not move (no profiles.ts call before the migration)
    oldSwitch('p1', 'pkai', ids)
    play('pkai')
    oldSwitch('pkai', 'p1', ids) // swapped back and forth
    oldSwitch('p1', 'pada', ids)
    play('pada')
    oldSwitch('pada', 'pkai', ids)
    if (last !== 'pkai') oldSwitch('pkai', last, ids)
    if (last === null && guestData) play('_none')
    return ids
  }
  const expectOwn = (ids: string[], label: string) => {
    const wrong: string[] = []
    for (const id of ids) {
      for (const k of KEYS) {
        const at = PR.namespacedKey(k, id)
        if (store.get(at) !== own(id, k)) wrong.push(`${id}:${k}=${store.get(at) ?? 'missing'}`)
      }
    }
    check(`${label}: every child keeps exactly their own data in every store`, wrong.length === 0, wrong.slice(0, 4).join('; '))
  }

  for (const last of ['pkai', 'p1', null] as const) {
    const label = `migration (playing: ${last ?? 'nobody'})`
    const ids = oldDevice(last, last === null)
    check(`${label}: built the old swapped layout`, !store.has(PR.LAYOUT_KEY) && (last === 'p1' ? store.get(KEYS[0]) === own('p1', KEYS[0]) : store.has(`${KEYS[0]}${SEP}p1`)))
    const progressBefore = store.get('r2bot_kids_v2')
    const active = PR.activeProfileId() // the first read migrates
    check(`${label}: the playing child is unchanged`, active === last)
    check(`${label}: layout marked`, store.get(PR.LAYOUT_KEY) !== undefined)
    expectOwn(ids, label)
    check(`${label}: no child sees another's data through profileKey()`, KEYS.every((k) => last === null || store.get(PR.profileKey(k)) === own(last, k)))
    if (last === null) check(`${label}: the guest's scribbles moved to ::_none, not onto member #1`, KEYS.every((k) => store.get(`${k}${SEP}_none`) === own('_none', k)))
    check(`${label}: progress (always per child) did not move`, store.get('r2bot_kids_v2') === progressBefore)
    check(`${label}: nobody has a stray ::p1 copy`, ![...store.keys()].some((k) => k.endsWith(`${SEP}p1`)))
    const after = snapshot()
    check(`${label}: running the migration again changes nothing`, PR.migrateSwappedLayout() && snapshot() === after)
    PR.readProfilesState()
    PR.ensureProfiles()
    check(`${label}: reading and ensuring again changes nothing`, snapshot() === after)
    // Switching is now instant and still keeps everyone apart.
    for (const id of ids) {
      PR.switchProfile(id)
      check(`${label}: after switching to ${id}, they read their own data`, KEYS.every((k) => store.get(PR.profileKey(k)) === own(id, k)))
    }
  }

  // An interrupted old switch: member #1 playing, a stale ::p1 copy and no live key.
  store.clear()
  writeState('p1', ['p1', 'pkai'])
  store.set(`${KEYS[0]}${SEP}p1`, own('p1', KEYS[0]))
  store.set(`${KEYS[1]}${SEP}p1`, 'stale')
  store.set(KEYS[1], own('p1', KEYS[1]))
  store.set(`${KEYS[0]}${SEP}pkai`, own('pkai', KEYS[0]))
  PR.readProfilesState()
  check('interrupted switch: member #1 gets their copy back, the live copy wins over a stale one', store.get(KEYS[0]) === own('p1', KEYS[0]) && store.get(KEYS[1]) === own('p1', KEYS[1]) && !store.has(`${KEYS[0]}${SEP}p1`) && !store.has(`${KEYS[1]}${SEP}p1`))
  check("interrupted switch: the sibling's copy is untouched", store.get(`${KEYS[0]}${SEP}pkai`) === own('pkai', KEYS[0]))

  // A full storage during the migration: nothing is lost, and the next read finishes it.
  for (const harsh of [false, true]) {
    const label = harsh ? 'a storage error that also breaks the rollback' : 'a storage error mid-migration'
    const ids = oldDevice('pkai')
    const before = new Map(store)
    const realSet = memoryStorage.setItem
    let n = 0
    memoryStorage.setItem = (k: string, v: string) => {
      n++
      // 14 stores: writes 1–14 copy Kai's data home, 15+ put member #1's back.
      if (harsh ? n >= 17 : n === 17) throw new Error('QuotaExceededError')
      realSet(k, v)
    }
    PR.readProfilesState()
    memoryStorage.setItem = realSet
    check(`${label}: the layout stays unmarked`, !store.has(PR.LAYOUT_KEY))
    if (!harsh) check(`${label}: every old key is put back`, [...before].every(([k, v]) => store.get(k) === v))
    PR.readProfilesState()
    expectOwn(ids, `${label}, then retried`)
    check(`${label}, then retried: marked once done`, store.has(PR.LAYOUT_KEY))
  }

  // A device that never had profiles: nothing to migrate, nothing written.
  store.clear()
  store.set(KEYS[0], own('p1', KEYS[0]))
  check('no profiles: reading writes nothing (no marker on a single-child device)', PR.activeProfileId() === 'p1' && store.size === 1)
  PR.ensureProfiles()
  check('turning profiles on marks the layout and moves nothing', store.has(PR.LAYOUT_KEY) && store.get(KEYS[0]) === own('p1', KEYS[0]))

  // Backup codes keep working after the move: a sibling's Skill Galaxy map travels in their code.
  store.clear()
  oldDevice('pkai')
  const kaiActs = JSON.stringify({ 'gear-1': { stars: 2, attempts: 1, score: 1, plays: 1, at: '2026-11-21' } })
  store.set('r2bot_kids_activities_v1', kaiActs) // Kai is playing: the old live key (unmigrated)
  store.delete(PR.LAYOUT_KEY)
  const kaiCode = await P.exportProgressCode() // migrates first, then reads Kai's own key
  const read = await P.readProgressCode(kaiCode)
  check("after the move, the player's backup code carries their own Galaxy map", read.ok && 'gear-1' in read.activities && store.get('r2bot_kids_activities_v1::pkai') === kaiActs)
  const p1Code = await P.exportProgressCode({ profileId: 'p1' })
  const p1Read = await P.readProgressCode(p1Code)
  check("…and member #1's code carries none of Kai's", p1Read.ok && !('gear-1' in p1Read.activities))

  // Per-profile extras (parent hub): builds and portfolio go through withProfile().
  const B = await import('./builds/store')
  const PF = await import('../../components/kids/portfolio/portfolio-store')
  const RD = await import('./robot-design')
  const snap = RD.encodeDesign({ ...RD.DEFAULT_DESIGN, name: 'Kaibot' })
  store.clear()
  writeState('p1', ['p1', 'pkai', 'pada'])
  store.set(PR.LAYOUT_KEY, '2')
  store.set('r2bot_kids_builds_v1::pkai', JSON.stringify({ 'cardboard-rover': { d: '2026-11-20', a: 2, t: 2, r: 'secret reflection' } }))
  store.set('r2bot_kids_portfolio_v1::pkai', JSON.stringify({ s: [{ c: snap, d: '2026-11-19' }], r: { 'snap:0': 'my words' } }))
  const kaiBuilds = PR.withProfile('pkai', () => B.buildsBackupExtra())
  const kaiPf = PR.withProfile('pkai', () => PF.portfolioBackupExtra())
  check('withProfile(): the builds extra is that child\'s, not the player\'s', kaiBuilds !== B.buildsBackupExtra() && kaiBuilds.length > 3)
  check('withProfile(): the portfolio extra is that child\'s', kaiPf.includes(snap) && !PF.portfolioBackupExtra().includes(snap))
  check('reflections never ride in the extras', !kaiBuilds.includes('secret') && !kaiPf.includes('my words'))
  check('withProfile() restores the player afterwards', PR.profileKey('r2bot_kids_builds_v1') === 'r2bot_kids_builds_v1')
  PR.withProfile('pada', () => {
    B.restoreBuildsExtra(kaiBuilds, ['cardboard-rover'])
    PF.restorePortfolioExtra(kaiPf)
  })
  check('restore into a named profile lands in that profile only', 'cardboard-rover' in JSON.parse(store.get('r2bot_kids_builds_v1::pada') ?? '{}') && (store.get('r2bot_kids_portfolio_v1::pada') ?? '').includes(snap) && !store.has('r2bot_kids_builds_v1') && !store.has('r2bot_kids_portfolio_v1'))
  let threw = false
  try {
    PR.withProfile('pada', () => {
      throw new Error('x')
    })
  } catch {
    threw = true
  }
  check('withProfile() restores the player even when the callback throws', threw && PR.profileKey('r2bot_kids_builds_v1') === 'r2bot_kids_builds_v1')
  store.clear()
}

type ProgressModule = typeof import('../kids-progress')

async function profileChecks(P: ProgressModule) {
  const PR = await import('./profiles')
  const RD = await import('./robot-design')
  const ACTS = 'r2bot_kids_activities_v1'
  const CLASS = 'r2bot_kids_class_v1'
  const DRAFT = 'r2bot_kids_codelab_draft_first-steps'
  store.clear()

  // A device used before profiles existed.
  P.saveProgress({ xp: 900, totalStars: 12, explorerName: 'Nova', band: 'explorers', badges: { 'first-drive': '2026-11-02' } })
  RD.saveDesign({ ...RD.DEFAULT_DESIGN, name: 'Bolt', primary: '#22C55E' })
  store.set(ACTS, JSON.stringify({ 'seq-1': { stars: 3, attempts: 1, score: 1, plays: 1, at: '2026-11-20' } }))
  store.set(CLASS, JSON.stringify({ token: 't-nova', className: '3B', nickname: 'Nova', band: 'explorers', teacherName: null }))
  store.set(DRAFT, '{"blocks":[1]}')
  const legacyRaw = new Map(store)

  check('no profiles stored: the original child is active as p1', PR.activeProfileId() === 'p1' && PR.readProfilesState() === null)
  check('no profiles stored: progress reads the original key', P.getProgress().xp === 900)
  const st = PR.ensureProfiles()
  check('migration: member #1 is the original child, named from the progress', st.profiles.length === 1 && st.profiles[0].id === 'p1' && st.profiles[0].nickname === 'Nova' && st.profiles[0].band === 'explorers' && st.active === 'p1')
  let untouched = true
  for (const [k, v] of legacyRaw) if (store.get(k) !== v) untouched = false
  check('migration: zero data moved or lost (every original key byte-identical)', untouched)
  check('migration: member #1 still sees progress, robot, Galaxy and class', P.getProgress().xp === 900 && RD.loadDesign().name === 'Bolt' && P.collectedStars() >= 15 && store.has(CLASS))
  check('migration is idempotent', JSON.stringify(PR.ensureProfiles()) === JSON.stringify(st))

  // A sibling joins.
  const sib = PR.createProfile({ nickname: 'Kai', band: 'inventors', picture: '🦖' })
  check('a second profile can be added', sib.ok)
  if (!sib.ok) return
  const kai = sib.profile.id
  check('adding a profile does not switch to it', PR.activeProfileId() === 'p1' && P.getProgress().xp === 900)
  check('switch to the sibling', PR.switchProfile(kai))
  check('sibling starts fresh: progress', P.getProgress().xp === 0 && P.getProgress().totalStars === 0)
  check('sibling starts fresh: robot, Galaxy map, class, Code Lab draft', RD.loadDesign().name !== 'Bolt' && !store.has(PR.profileKey(ACTS)) && !store.has(PR.profileKey(CLASS)) && !store.has(PR.profileKey(DRAFT)))
  check('a switch copies nothing: member #1 keeps the plain keys', store.get(ACTS) === legacyRaw.get(ACTS) && store.get(CLASS) === legacyRaw.get(CLASS) && store.get(DRAFT) === legacyRaw.get(DRAFT))
  P.saveProgress({ xp: 40, explorerName: 'Kai' })
  RD.saveDesign({ ...RD.DEFAULT_DESIGN, name: 'Rex' })
  store.set(PR.profileKey(ACTS), JSON.stringify({ 'gear-1': { stars: 2, attempts: 1, score: 1, plays: 1, at: '2026-11-21' } }))
  check('sibling writes go to their own namespace', store.has(`r2bot_kids_v2::${kai}`) && JSON.parse(store.get('r2bot_kids_v2') ?? '{}').xp === 900)
  check("member #1's data is safe while the sibling plays", P.getProgressOf('p1').xp === 900 && RD.loadDesignOf('p1').name === 'Bolt')

  check('switch back to member #1', PR.switchProfile('p1'))
  check('member #1 gets everything back', P.getProgress().xp === 900 && RD.loadDesign().name === 'Bolt' && JSON.parse(store.get(CLASS) ?? '{}').token === 't-nova' && store.get(DRAFT) === '{"blocks":[1]}' && 'seq-1' in JSON.parse(store.get(ACTS) ?? '{}'))
  check("the sibling's data waits in its own place", P.getProgressOf(kai).xp === 40 && RD.loadDesignOf(kai).name === 'Rex' && 'gear-1' in JSON.parse(store.get(`${ACTS}::${kai}`) ?? '{}'))
  check('no stash left behind for the active profile', ![...store.keys()].some((k) => k.endsWith('::p1')))

  // Backup codes per profile.
  const kaiCode = await P.exportProgressCode({ profileId: kai })
  const p1Code = await P.exportProgressCode()
  const kaiRead = await P.readProgressCode(kaiCode)
  check("export of a profile that is not playing holds that profile's progress and Galaxy", kaiRead.ok && kaiRead.progress.xp === 40 && 'gear-1' in kaiRead.activities)
  const p1Read = await P.readProgressCode(p1Code)
  check('export without a profile is whoever is playing', p1Read.ok && p1Read.progress.xp === 900)
  const third = PR.createProfile({ nickname: 'Ada', band: 'builders' })
  if (!third.ok) return
  const ada = third.profile.id
  const imp = await P.importProgressCode(kaiCode, { profileId: ada })
  check('restore into a named profile', imp.ok && P.getProgressOf(ada).xp === 40 && 'gear-1' in JSON.parse(store.get(`${ACTS}::${ada}`) ?? '{}'))
  check('restore into a named profile leaves the player untouched', P.getProgress().xp === 900 && P.getProgressOf(kai).xp === 40)
  PR.switchProfile(kai)
  const imp2 = await P.importProgressCode(p1Code)
  check('restore on the active profile merges into that profile only', imp2.ok && P.getProgress().xp === 900 && P.getProgressOf('p1').xp === 900 && P.getProgressOf(ada).xp === 40)

  // Picture password (Explorers).
  check('picture password: set', PR.setPassword('p1', ['🍎', '⭐', '🐟']))
  check('picture password: right order unlocks', PR.checkPassword('p1', ['🍎', '⭐', '🐟']))
  check('picture password: wrong order does not', !PR.checkPassword('p1', ['⭐', '🍎', '🐟']))
  check('picture password is not stored as the pictures', !(store.get(PR.PROFILES_KEY) ?? '').includes('🍎'))
  check('no password: tap to play', PR.checkPassword(kai, []))

  // Shared lab tablet: "Done" clears the device.
  PR.setDeviceMode('shared')
  // Flight Recorder ghosts (lib/kids/sim/ghost-store.ts, a profileKey() store): the child
  // playing now (Kai) and member #1 each have one before "Done".
  const GHOSTS = 'r2bot_kids_sim_ghosts_v1'
  check('the ghost store is a listed per-child base', PR.PROFILE_KEY_BASES.includes(GHOSTS))
  store.set(GHOSTS, '{"g":{"p1-arena":{}}}')
  store.set(PR.profileKey(GHOSTS), '{"g":{"kai-arena":{}}}')
  check("Kai's ghost is in Kai's namespace", store.get(`${GHOSTS}::${kai}`) === '{"g":{"kai-arena":{}}}')
  // A store this file does not own, whose key happens to end in "::_none".
  store.set('r2bot_other_cache::_none', 'keep')
  check('Done clears the device back to the picker', PR.finishTurn() && PR.needsPicker() && PR.activeProfileId() === null)
  check('after Done nothing of the last child is visible', P.getProgress().xp === 0 && RD.loadDesign().name !== 'Rex' && !store.has(PR.profileKey(ACTS)) && !store.has(PR.profileKey(CLASS)))
  check("Done keeps the last child's ghosts (their own namespace) and member #1's", store.get(`${GHOSTS}::${kai}`) === '{"g":{"kai-arena":{}}}' && store.get(GHOSTS) === '{"g":{"p1-arena":{}}}')
  check('Done does not wipe a "::_none" key that is not a per-child store', store.get('r2bot_other_cache::_none') === 'keep')
  P.saveProgress({ xp: 3 })
  // A guest's ghost while nobody is signed in goes to the "_none" namespace…
  store.set(PR.profileKey(GHOSTS), '{"g":{"guest-arena":{}}}')
  check("a guest's ghost is kept apart in ::_none", store.has(`${GHOSTS}::_none`) && store.get(`${GHOSTS}::${kai}`) === '{"g":{"kai-arena":{}}}')
  PR.switchProfile('p1')
  // …and, like the guest's progress, is wiped when the next child signs in (privacy between children).
  check('a guest scribble while nobody is signed in is wiped', ![...store.keys()].some((k) => k.endsWith('::_none') && k !== 'r2bot_other_cache::_none'))
  check('after Done the next child gets their own things back', P.getProgress().xp === 900 && RD.loadDesign().name === 'Bolt')
  check('…their own ghosts too, and the other child keeps theirs', store.get(PR.profileKey(GHOSTS)) === '{"g":{"p1-arena":{}}}' && store.get(`${GHOSTS}::${kai}`) === '{"g":{"kai-arena":{}}}')
  store.delete('r2bot_other_cache::_none')

  // Class join on a shared tablet with nobody signed in makes and signs in a profile.
  PR.finishTurn()
  const bound = PR.bindClassMember({ nickname: 'Zuri', className: '3B', band: 'explorers' })
  check('joining a class on a shared tablet makes a profile and signs it in', !!bound && PR.activeProfileId() === bound && PR.activeProfile()?.nickname === 'Zuri' && P.getProgress().xp === 0)
  store.set(PR.profileKey(CLASS), JSON.stringify({ token: 't-zuri', className: '3B', nickname: 'Zuri', band: 'explorers', teacherName: null }))
  PR.switchProfile('p1')
  check("each class member keeps their own token", JSON.parse(store.get(CLASS) ?? '{}').token === 't-nova' && JSON.parse(store.get(`${CLASS}::${bound}`) ?? '{}').token === 't-zuri')
  PR.finishTurn()
  check('the same nickname in the same class signs back in, no duplicate', PR.bindClassMember({ nickname: 'zuri', className: '3B', band: 'explorers' }) === bound && (PR.readProfilesState()?.profiles.length ?? 0) === 4)

  // Play together missions: every map solvable, stars from bumps.
  const T = await import('./together')
  for (const m of T.TOGETHER_MISSIONS) check(`play together: "${m.title}" can be finished`, T.missionSolvable(m))
  check('play together: 0 bumps 3★, 2 bumps 2★, 5 bumps 1★', T.starsFor(0) === 3 && T.starsFor(2) === 2 && T.starsFor(5) === 1)

  // Play together credits wait for the partner.
  PR.addTogetherCredit(kai, { id: 'together-crater', stars: 3 })
  PR.switchProfile(kai)
  const credits = PR.takeTogetherCredits()
  check('a play-together credit reaches the partner once', credits.length === 1 && credits[0].stars === 3 && PR.takeTogetherCredits().length === 0)

  // Removing a profile removes every byte it stored.
  PR.switchProfile('p1')
  check('remove a profile', PR.removeProfile(kai))
  check('removed profile leaves nothing behind', ![...store.keys()].some((k) => k.endsWith(`::${kai}`)) && P.getProgressOf('p1').xp === 900)
  check('the last profile cannot be removed', (() => {
    for (const p of PR.readProfilesState()?.profiles ?? []) if (p.id !== 'p1') PR.removeProfile(p.id)
    return !PR.removeProfile('p1') && P.getProgress().xp === 900
  })())

  // A storage error mid-switch changes nothing (a switch is one write: `active`).
  const sib2 = PR.createProfile({ nickname: 'Leo' })
  if (sib2.ok) {
    const realSet = memoryStorage.setItem
    memoryStorage.setItem = () => {
      throw new Error('QuotaExceededError')
    }
    const ok = PR.switchProfile(sib2.profile.id)
    memoryStorage.setItem = realSet
    check('a full storage refuses the switch and keeps the current child intact', !ok && PR.activeProfileId() === 'p1' && P.getProgress().xp === 900 && JSON.parse(store.get(CLASS) ?? '{}').token === 't-nova' && store.get(DRAFT) === '{"blocks":[1]}')
  }

  // Removing member #1 removes EVERY profileKey() store at its plain key
  // (Passport words, Robodex, builds, portfolio, ghosts, class diary, look...).
  if (sib2.ok) {
    for (const base of PR.PROFILE_KEY_BASES) store.set(base, '{"p1":true}')
    const perItem = PR.PROFILE_KEY_PREFIXES.map((p) => `${p}x`)
    for (const k of perItem) store.set(k, '1')
    store.set(`r2bot_kids_robodex_v1::${sib2.profile.id}`, '{"leo":true}')
    store.set(`r2bot_game_seen_x::${sib2.profile.id}`, '1')
    PR.switchProfile(sib2.profile.id)
    const removed = PR.removeProfile('p1')
    const left = [...PR.PROFILE_KEY_BASES, ...perItem].filter((b) => store.has(b))
    check('removing member #1 deletes every profileKey() store it kept at the plain key', removed && left.length === 0, left.join(', '))
    check("…and leaves the other child's stores alone", store.get(`r2bot_kids_robodex_v1::${sib2.profile.id}`) === '{"leo":true}' && store.get(`r2bot_game_seen_x::${sib2.profile.id}`) === '1')
  }
  check('the Class Power-Up cache is per child (a profileKey() base)', PR.PROFILE_KEY_BASES.includes('r2bot_kids_class_powerup_v1'))
  check('the swap mechanism is gone: no SWAPPED_KEYS / SWAPPED_PREFIXES export', !('SWAPPED_KEYS' in PR) && !('SWAPPED_PREFIXES' in PR))
  check('every formerly swapped store is now a profileKey() store', PR.LEGACY_SWAPPED_KEYS.every((k) => PR.PROFILE_KEY_BASES.includes(k)) && PR.LEGACY_SWAPPED_PREFIXES.every((p) => PR.PROFILE_KEY_PREFIXES.includes(p)))

  // Every profileKey(<base>) call site in the app uses a base in PROFILE_KEY_BASES.
  const fs = await import('node:fs')
  const path = await import('node:path')
  const root = path.resolve(__dirname, '../..')
  const files: string[] = []
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue
      const f = path.join(dir, e.name)
      if (e.isDirectory()) walk(f)
      else if (/\.tsx?$/.test(e.name) && !e.name.includes('.verify.')) files.push(f)
    }
  }
  for (const d of ['app', 'components', 'lib']) walk(path.join(root, d))
  // NAME → string value, from every `const NAME = 'r2bot_…'` in the app.
  const consts = new Map<string, Set<string>>()
  const sources = new Map<string, string>()
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8')
    sources.set(f, src)
    for (const m of src.matchAll(/const\s+([A-Z_][A-Z0-9_]*)\s*=\s*'(r2bot_[^']+)'/g)) {
      const set = consts.get(m[1]) ?? new Set<string>()
      set.add(m[2])
      consts.set(m[1], set)
    }
  }
  // A generic reader whose argument is a base read elsewhere (PortfolioClient's readJson(key)).
  const GENERIC_ARGS = new Set(['key', 'base'])
  const bad: string[] = []
  let sites = 0
  for (const [f, src] of sources) {
    if (f.endsWith(path.join('lib', 'kids', 'profiles.ts'))) continue
    for (const m of src.matchAll(/profileKey\(\s*([^)\s]+)\s*\)/g)) {
      sites++
      const arg = m[1]
      const rel = path.relative(root, f)
      if (/^'[^']*'$/.test(arg)) {
        const v = arg.slice(1, -1)
        if (!PR.PROFILE_KEY_BASES.includes(v) && !PR.PROFILE_KEY_PREFIXES.some((p) => v.startsWith(p) && v.length > p.length)) bad.push(`${rel}: ${arg}`)
      } else if (arg.startsWith('`')) {
        // A per-item key: `<prefix>${item}…`, the literal head must be a listed prefix.
        const head = arg.slice(1).split('${')[0]
        if (!PR.PROFILE_KEY_PREFIXES.some((p) => head.startsWith(p))) bad.push(`${rel}: ${arg}`)
      } else if (GENERIC_ARGS.has(arg)) {
        continue
      } else {
        // The file's own constant first (several files call theirs KEY), then an imported one.
        const own = [...src.matchAll(new RegExp(`const\\s+${arg}\\s*=\\s*'(r2bot_[^']+)'`, 'g'))].map((x) => x[1])
        const vals = own.length ? new Set(own) : consts.get(arg)
        if (!vals || [...vals].some((v) => !PR.PROFILE_KEY_BASES.includes(v))) bad.push(`${rel}: ${arg}`)
      }
    }
  }
  check(`every profileKey() call site (${sites}) uses a base listed in PROFILE_KEY_BASES`, sites > 10 && bad.length === 0, bad.join('; '))
  // No reader of a formerly swapped store still uses the bare key.
  const bare: string[] = []
  for (const [f, src] of sources) {
    if (f.endsWith(path.join('lib', 'kids', 'profiles.ts'))) continue
    const rel = path.relative(root, f)
    for (const m of src.matchAll(/localStorage\.(?:getItem|setItem|removeItem)\(\s*([^,)\s]+)/g)) {
      const arg = m[1]
      if (arg.startsWith('profileKey(') || arg.startsWith('storageKeyFor(') || arg.startsWith('namespacedKey(')) continue
      let vals: string[] = []
      if (/^'[^']*'$/.test(arg)) vals = [arg.slice(1, -1)]
      else if (arg.startsWith('`')) vals = [arg.slice(1).split('${')[0]]
      else if (/^[A-Za-z_$][\w$]*$/.test(arg)) {
        const own = [...src.matchAll(new RegExp(`const\\s+${arg}\\s*=\\s*'(r2bot_[^']+)'`, 'g'))].map((x) => x[1])
        vals = own.length ? own : [...(consts.get(arg) ?? [])]
      }
      if (vals.some((v) => PR.LEGACY_SWAPPED_KEYS.includes(v) || PR.LEGACY_SWAPPED_PREFIXES.some((p) => v.startsWith(p)))) bare.push(`${rel}: ${arg}`)
    }
  }
  check('no formerly swapped store is read or written at its bare key', bare.length === 0, bare.join('; '))

  await swapMigrationChecks()

  // ── Physics Lab / Power Lab results (build log #23, lib/kids/sim/lab-results.ts) ──
  // A solved lab arena lives in the one progress store (personalBests["lab:<id>"]), is written only
  // through reportBestRun, travels in the backup code and merges keeping the faster solve.
  {
    PR.finishTurn()
    store.clear()
    const LR = await import('./sim/lab-results')
    const RK = await import('./curriculum/level3/reuse-kit')
    const arena = { timeLimit: 60 }
    const run = (time: number, success = true) => ({ success, reason: null, message: '', missing: [], time, travelled: 1, wheelTravel: 1, goalDistance: 0, crashed: false, onLineFraction: 0 })
    const play = { kind: 'sim-demo' as const, id: 'dead-zone', goal: 'Find the dead zone' }
    const done = () => RK.reusePlayDone(play, P.getProgress())
    P.saveProgress({ xp: 10, personalBests: { 'drone-hover:t1': 50 } })
    const oldCode = await P.exportProgressCode()
    check('lab: a fresh child has no lab results (safe default)', !LR.labSolved(P.getProgress().personalBests, 'dead-zone') && !done() && LR.labBestTime('dead-zone', arena) === null)
    check('lab: a failed run records nothing', LR.reportLabRun('dead-zone', arena, run(9.5, false)) === null && !done())
    const first = LR.reportLabRun('dead-zone', arena, run(9.55))
    check('lab: the first solve is reported once, as a challenge', !!first && first.kind === 'challenge' && first.id === 'lab:dead-zone' && first.xpGained > 0)
    check('lab: stored as tenths of a second to spare (higher is better)', P.getProgress().personalBests['lab:dead-zone'] === 505 && LR.labBestTime('dead-zone', arena) === 9.5)
    check('lab: a course session reads the solve (no "I finished it")', done())
    check('lab: a slower replay pays nothing', LR.reportLabRun('dead-zone', arena, run(12)) === null && P.getProgress().personalBests['lab:dead-zone'] === 505)
    const faster = LR.reportLabRun('dead-zone', arena, run(8))
    check('lab: a faster solve is a new personal best', !!faster && faster.newPersonalBest && P.getProgress().personalBests['lab:dead-zone'] === 520)
    const xp = P.getProgress().xp
    const labCode = await P.exportProgressCode()
    store.clear()
    check('lab: an old code with no lab results restores with none', (await P.importProgressCode(oldCode)).ok && !LR.labSolved(P.getProgress().personalBests, 'dead-zone'))
    store.clear()
    const back = await P.importProgressCode(labCode)
    check('lab: the solve travels in the backup code', back.ok && P.getProgress().personalBests['lab:dead-zone'] === 520 && done() && P.getProgress().xp === xp)
    store.clear()
    P.saveProgress({ personalBests: { 'lab:dead-zone': 300, 'lab:core-store-ramp': 410 } })
    const mergedLab = await P.importProgressCode(labCode)
    const pb = P.getProgress().personalBests
    check('lab: a restore keeps the faster solve and never drops one', mergedLab.ok && pb['lab:dead-zone'] === 520 && pb['lab:core-store-ramp'] === 410)
  }
}

main().catch((e) => {
  console.error('✗ verify crashed:', e)
  process.exit(1)
})
