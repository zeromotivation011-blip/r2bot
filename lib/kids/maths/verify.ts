// lib/kids/maths/verify.ts — checks Robot Maths (roadmap #86).
// Run: npx tsx lib/kids/maths/verify.ts   (exit 1 on any ✗; runs in CI)
//
//  - every concept covers all four bands, with the topics the roadmap names;
//  - every band names a LIVE Skill Galaxy activity of the SAME band, and every
//    maths-* activity belongs to exactly one concept band;
//  - every worked example is numerically right (its sum gives its answer);
//  - the text is long enough to make a real page (≥ 300 words per concept);
//  - every "see also" link points at something that exists.

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { BAND_ORDER } from '../bands'
import { ALL_ACTIVITIES, getActivity } from '../activities/content'
import { GAMES } from '../universe/worlds'
import { MATHS_CONCEPTS, mathsActivityIds } from './concepts'

const errors: string[] = []
const fail = (where: string, what: string) => errors.push(`${where}: ${what}`)
const words = (s: string) => s.split(/\s+/).filter(Boolean).length

const ids = new Set<string>()
for (const c of MATHS_CONCEPTS) {
  if (ids.has(c.id)) fail(c.id, 'duplicate concept id')
  ids.add(c.id)
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(c.id)) fail(c.id, 'id must be kebab-case')
  let total = words(c.summary) + words(c.robots) + words(c.hook)
  for (const b of BAND_ORDER) {
    const m = c.bands[b]
    if (!m) {
      fail(c.id, `no ${b} band`)
      continue
    }
    total += words(m.explain) + words(m.example.question) + m.example.steps.reduce((s, x) => s + words(x), 0) + words(m.offScreen)
    if (words(m.explain) < 25) fail(`${c.id}/${b}`, 'explain is under 25 words')
    if (m.example.steps.length < 2) fail(`${c.id}/${b}`, 'worked example needs at least 2 steps')
    const got = m.example.check.compute()
    const tol = m.example.check.tolerance ?? 1e-9
    if (!Number.isFinite(got) || Math.abs(got - m.example.check.value) > tol) {
      fail(`${c.id}/${b}`, `worked example is wrong: the sum gives ${got}, the answer says ${m.example.check.value}`)
    }
    const a = getActivity(m.activity)
    if (!a) fail(`${c.id}/${b}`, `activity "${m.activity}" is not a live Skill Galaxy activity`)
    else if (a.band !== b) fail(`${c.id}/${b}`, `activity "${m.activity}" is for ${a.band}, not ${b}`)
  }
  if (total < 300) fail(c.id, `only ${total} words of content (an indexable page needs ≥ 300)`)
  for (const s of c.seeAlso) {
    const play = /^\/kids\/play\/([^/]+)$/.exec(s.href)
    if (play) {
      if (!GAMES.some((g) => g.id === play[1])) fail(c.id, `see-also game "${play[1]}" is not in GAMES`)
      continue
    }
    const dir = join(process.cwd(), 'app', ...s.href.replace(/^\//, '').split('/'))
    const galaxy = /^\/kids\/galaxy\/([^/]+)$/.exec(s.href)
    if (galaxy) {
      if (!ALL_ACTIVITIES.some((x) => x.track === galaxy[1])) fail(c.id, `see-also track "${galaxy[1]}" has no activities`)
      continue
    }
    if (!existsSync(join(dir, 'page.tsx'))) fail(c.id, `see-also "${s.href}" has no page`)
  }
}

// Every maths-* activity belongs to exactly one concept band.
const named = mathsActivityIds()
const seen = new Map<string, number>()
for (const id of named) seen.set(id, (seen.get(id) ?? 0) + 1)
for (const [id, n] of seen) if (n > 1) fail(id, `named by ${n} concept bands (one each)`)
for (const a of ALL_ACTIVITIES) {
  if (a.id.startsWith('maths-') && !seen.has(a.id)) fail(a.id, 'maths activity not named by any concept (it would have no page)')
}

if (errors.length) {
  console.error(`Robot Maths: ${errors.length} problem(s)`)
  for (const e of errors) console.error(`  ✗ ${e}`)
  process.exit(1)
}
console.log(`Robot Maths: ${MATHS_CONCEPTS.length} concepts × ${BAND_ORDER.length} bands, ${named.length} activities, every worked example checks out ✓`)
