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
    p: { xp: -50, totalStars: 'lots', band: 'admins', badges: { ok: '2026-11-01', bad: 7 }, unlocks: ['x', 3, 'y'], robotColor: 'red', avatar: { id: 'a', color: 'javascript:' } },
  })
  const h = await P.importProgressCode(hostile)
  const hp = P.getProgress()
  check('hostile: import ok but bad fields dropped', h.ok && hp.xp === 5000 && hp.totalStars === 41 && hp.band === 'builders' && hp.badges.ok === '2026-11-01' && !('bad' in hp.badges))
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

  // ── Profiles: migration of the original child into member #1 ──
  await profileChecks(P)

  console.log(failures ? `\n${failures} check(s) failed` : '\nAll progress backup checks passed')
  process.exit(failures ? 1 : 0)
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
  check('sibling starts fresh: robot, Galaxy map, class, Code Lab draft', RD.loadDesign().name !== 'Bolt' && !store.has(ACTS) && !store.has(CLASS) && !store.has(DRAFT))
  P.saveProgress({ xp: 40, explorerName: 'Kai' })
  RD.saveDesign({ ...RD.DEFAULT_DESIGN, name: 'Rex' })
  store.set(ACTS, JSON.stringify({ 'gear-1': { stars: 2, attempts: 1, score: 1, plays: 1, at: '2026-11-21' } }))
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
  check('Done clears the device back to the picker', PR.finishTurn() && PR.needsPicker() && PR.activeProfileId() === null)
  check('after Done nothing of the last child is visible', P.getProgress().xp === 0 && RD.loadDesign().name !== 'Rex' && !store.has(ACTS) && !store.has(CLASS))
  P.saveProgress({ xp: 3 })
  PR.switchProfile('p1')
  check('a guest scribble while nobody is signed in is wiped', ![...store.keys()].some((k) => k.endsWith('::_none')))
  check('after Done the next child gets their own things back', P.getProgress().xp === 900 && RD.loadDesign().name === 'Bolt')

  // Class join on a shared tablet with nobody signed in makes and signs in a profile.
  PR.finishTurn()
  const bound = PR.bindClassMember({ nickname: 'Zuri', className: '3B', band: 'explorers' })
  check('joining a class on a shared tablet makes a profile and signs it in', !!bound && PR.activeProfileId() === bound && PR.activeProfile()?.nickname === 'Zuri' && P.getProgress().xp === 0)
  store.set(CLASS, JSON.stringify({ token: 't-zuri', className: '3B', nickname: 'Zuri', band: 'explorers', teacherName: null }))
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

  // A storage error mid-switch changes nothing.
  const sib2 = PR.createProfile({ nickname: 'Leo' })
  if (sib2.ok) {
    const realSet = memoryStorage.setItem
    let n = 0
    memoryStorage.setItem = (k: string, v: string) => {
      if (++n > 2) throw new Error('QuotaExceededError')
      realSet(k, v)
    }
    const ok = PR.switchProfile(sib2.profile.id)
    memoryStorage.setItem = realSet
    check('a full storage refuses the switch and keeps the current child intact', !ok && PR.activeProfileId() === 'p1' && P.getProgress().xp === 900 && JSON.parse(store.get(CLASS) ?? '{}').token === 't-nova' && store.get(DRAFT) === '{"blocks":[1]}')
  }

  // Removing member #1 removes EVERY profileKey() store at its plain key
  // (Passport words, Robodex, builds, portfolio, ghosts, class diary, look...).
  if (sib2.ok) {
    for (const base of PR.PROFILE_KEY_BASES) store.set(base, '{"p1":true}')
    store.set(`r2bot_kids_robodex_v1::${sib2.profile.id}`, '{"leo":true}')
    PR.switchProfile(sib2.profile.id)
    const removed = PR.removeProfile('p1')
    const left = PR.PROFILE_KEY_BASES.filter((b) => store.has(b))
    check('removing member #1 deletes every profileKey() store it kept at the plain key', removed && left.length === 0, left.join(', '))
    check("…and leaves the other child's stores alone", store.get(`r2bot_kids_robodex_v1::${sib2.profile.id}`) === '{"leo":true}')
  }
  check('the Class Power-Up cache is per child (swapped on switch)', PR.SWAPPED_KEYS.includes('r2bot_kids_class_powerup_v1'))

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
        if (!PR.PROFILE_KEY_BASES.includes(arg.slice(1, -1))) bad.push(`${rel}: ${arg}`)
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
  check('no base is both profileKey()-namespaced and swapped', !PR.PROFILE_KEY_BASES.some((b) => PR.SWAPPED_KEYS.includes(b)))
}

main().catch((e) => {
  console.error('✗ verify crashed:', e)
  process.exit(1)
})
