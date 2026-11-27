// lib/kids/passport.verify.ts
// Robot Passport self-check (roadmap #12). Run: npx tsx lib/kids/passport.verify.ts
//   - the word list: 256 words, A–Z, 3–8 letters, sorted, unique, no two one typo apart
//     (so a one-typo correction can never land on the wrong child's passport);
//   - parsePassport: canonical round trip, any case/separators, one typo per word,
//     words run together, wrong number / count refused;
//   - QR fragment round trip; a fresh code always parses;
//   - the server-side backup check accepts a real backup code and refuses junk.

import { PASSPORT_WORDS, formatPassport, newPassportWords, parsePassport, passportFromHash, passportLink } from './passport'

const fails: string[] = []
const check = (cond: boolean, msg: string) => {
  if (!cond) fails.push(msg)
}

function lev(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) cur.push(Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)))
    prev = cur
  }
  return prev[b.length]
}

// ── Word list ──
check(PASSPORT_WORDS.length === 256, `word list has ${PASSPORT_WORDS.length} words (want 256)`)
check(new Set(PASSPORT_WORDS).size === PASSPORT_WORDS.length, 'duplicate words')
check([...PASSPORT_WORDS].sort().join() === PASSPORT_WORDS.join(), 'word list not sorted')
for (const w of PASSPORT_WORDS) check(/^[A-Z]{3,8}$/.test(w), `bad word shape: ${w}`)
for (let i = 0; i < PASSPORT_WORDS.length; i++) {
  for (let j = i + 1; j < PASSPORT_WORDS.length; j++) {
    if (lev(PASSPORT_WORDS[i], PASSPORT_WORDS[j]) < 2) fails.push(`one typo apart: ${PASSPORT_WORDS[i]} / ${PASSPORT_WORDS[j]}`)
  }
}

// ── Parsing ──
const ok = (input: string, want: string, corrected = false) => {
  const p = parsePassport(input)
  check(p.ok && p.code === want && p.corrected === corrected, `parse ${JSON.stringify(input)} → ${JSON.stringify(p)} (want ${want}${corrected ? ', corrected' : ''})`)
}
const bad = (input: unknown, reason: string) => {
  const p = parsePassport(input)
  check(!p.ok && p.reason === reason, `parse ${JSON.stringify(input)} should fail with ${reason}, got ${JSON.stringify(p)}`)
}
ok('MAGNET-OTTER-NOVA-7', 'MAGNET-OTTER-NOVA-7')
ok('magnet otter nova 7', 'MAGNET-OTTER-NOVA-7')
ok('  Magnet.Otter.Nova.07 ', 'MAGNET-OTTER-NOVA-7')
ok('7 magnet otter nova', 'MAGNET-OTTER-NOVA-7')
ok('magnetotternova7', 'MAGNET-OTTER-NOVA-7')
ok('magnett-oter-nova-7', 'MAGNET-OTTER-NOVA-7', true)
ok('ROCKET-PANDA-COMET-99', 'ROCKET-PANDA-COMET-99')
bad('', 'empty')
bad(42, 'empty')
bad('MAGNET-OTTER-NOVA', 'number')
bad('MAGNET-OTTER-NOVA-1', 'number')
bad('MAGNET-OTTER-NOVA-100', 'number')
bad('MAGNET-OTTER-NOVA-7-8', 'number')
bad('MAGNET-OTTER-7', 'words')
bad('MAGNET-OTTER-NOVA-PANDA-7', 'words')
bad('MAGNET-OTTER-XYZZY-7', 'unknown-word')

// ── Random codes and QR links ──
let seed = 12345
const rnd = (n: number) => {
  seed = (Math.imul(seed, 1103515245) + 12345) >>> 0
  return seed % n
}
for (let i = 0; i < 2000; i++) {
  const code = formatPassport(newPassportWords(rnd))
  const p = parsePassport(code)
  check(p.ok && p.code === code && !p.corrected, `fresh code does not parse cleanly: ${code}`)
  if (i < 50) {
    const link = passportLink(code)
    check(passportFromHash(new URL(link).hash) === code, `QR link round trip: ${link}`)
    check(link.length < 100, `QR link too long for a small QR: ${link}`)
  }
}
check(passportFromHash('#other=1') === null, 'hash without passport → null')

// ── Server backup check (same reader the browser restores with) ──
async function serverChecks(): Promise<void> {
  const { checkBackup, hashPassport } = await import('./passport-server')
  check(/^[0-9a-f]{64}$/.test(hashPassport('MAGNET-OTTER-NOVA-7')), 'hash is SHA-256 hex')
  check(hashPassport('MAGNET-OTTER-NOVA-7') !== hashPassport('MAGNET-OTTER-NOVA-8'), 'different codes, different hashes')
  const junk = await checkBackup('hello')
  check(!junk.ok, 'junk backup accepted')
  const notString = await checkBackup({ v: 1 })
  check(!notString.ok, 'object backup accepted')
  // A minimal real backup code, built the way exportProgressCode builds a plain one.
  const json = JSON.stringify({ v: 1, p: { xp: 120, badges: { 'first-steps': '2026-11-01' } } })
  let h = 0x811c9dc5
  for (const b of new TextEncoder().encode(json)) h = Math.imul(h ^ b, 0x01000193) >>> 0
  const code = `R2K1.j.${Buffer.from(json).toString('base64url')}.${h.toString(16).padStart(8, '0')}`
  const real = await checkBackup(code)
  check(real.ok && real.summary.xp === 120, `real backup refused or miscounted: ${JSON.stringify(real)}`)
  const tampered = await checkBackup(code.slice(0, -1) + (code.endsWith('0') ? '1' : '0'))
  check(!tampered.ok, 'tampered backup accepted')
}

serverChecks()
  .catch((e: unknown) => fails.push(`server checks threw: ${String(e)}`))
  .finally(() => {
    if (fails.length) {
      for (const f of fails) console.error(`✗ ${f}`)
      process.exit(1)
    }
    console.log(`✓ Robot Passport: ${PASSPORT_WORDS.length} words, parsing, typo fix, QR links and the server backup check`)
  })
