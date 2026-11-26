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

  console.log(failures ? `\n${failures} check(s) failed` : '\nAll progress backup checks passed')
  process.exit(failures ? 1 : 0)
}

main().catch((e) => {
  console.error('✗ verify crashed:', e)
  process.exit(1)
})
