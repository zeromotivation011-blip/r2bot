// lib/kids/builds/verify.ts — run with `npx tsx lib/kids/builds/verify.ts` (CI: quality.yml).
// Make It at Home (#44) + the physical safety rules for home and class builds (#79):
//   - about 30 builds, unique stable ids, every Skill Galaxy track and every World covered;
//   - every build has hazard tags, a minimum band, an adultRequired flag and a safety note;
//   - button/coin cells are never in an Explorers build; lithium packs never below Inventors;
//     mains power is never used; explorers builds with risky tags need a grown-up;
//   - materials match the tags (scissors → blade, coin cell → button-cell, balloon/glove → balloon …);
//   - every Robodex link is a real card, every check question has a valid answer and an explanation,
//     every fair test names the change, what stays the same and the measure;
//   - the store keeps the first day and the fewest tries, and the reflection check refuses
//     personal details and flags a crisis.

import { TRACKS } from '../activities/types'
import { WORLDS } from '../universe/worlds'
import { ROBODEX_CARDS } from '../robodex/cards'
import { BAND_ORDER, HAZARDS, HOME_BUILDS, buildRewardId, buildsForBand } from './builds'
import { buildTag, buildsBackupExtra, cleanBuilds, decodeBuildsExtra } from './store'
import { checkReflection } from './reflection'
import type { Hazard } from './types'

let failures = 0
const fail = (msg: string) => {
  failures += 1
  console.error(`✗ ${msg}`)
}
const ok = (msg: string) => console.log(`✓ ${msg}`)

const cards = new Set(ROBODEX_CARDS.map((c) => c.id))
const tracks = new Set(TRACKS.map((t) => t.id))
const worlds = new Set(WORLDS.map((w) => w.id))
const RISKY_FOR_EXPLORERS: Hazard[] = ['small-parts', 'blade', 'sharp-point', 'hot-glue', 'balloon', 'aa-battery', 'button-cell', 'lithium-pack']
const NEVER_EXPLORERS: Hazard[] = ['button-cell', 'lithium-pack', 'balloon', 'hot-glue', 'sharp-point']
const ALWAYS_ADULT: Hazard[] = ['button-cell', 'lithium-pack', 'hot-glue', 'sharp-point']
const MAINS = /\b(mains|wall socket|plug socket|power socket|plug (it )?in|extension lead|240 ?v|230 ?v|120 ?v|110 ?v)\b/i

/** Material words that require a hazard tag. */
const MATERIAL_TAGS: [RegExp, Hazard][] = [
  [/scissors|knife|snips|blade/i, 'blade'],
  [/coin cell|button cell|cr\d{4}/i, 'button-cell'],
  [/balloon|glove/i, 'balloon'],
  [/\bnails?\b|skewers?|split pins?|drawing pins?/i, 'sharp-point'],
  [/glue gun|hot glue/i, 'hot-glue'],
  [/\bAAA?\b/, 'aa-battery'],
  [/lithium|li-?ion|lipo/i, 'lithium-pack'],
  [/\bwater\b/i, 'water'],
  [/coins?\b|beads?|bottle caps?|pen cap|paper clips?|marbles?|\bLED\b|buttons|split pins?/i, 'small-parts'],
]

// ── The set ─────────────────────────────────────────────────────────────────
if (HOME_BUILDS.length >= 28 && HOME_BUILDS.length <= 40) ok(`${HOME_BUILDS.length} builds`)
else fail(`expected about 30 builds, found ${HOME_BUILDS.length}`)

const ids = new Set<string>()
for (const b of HOME_BUILDS) {
  const where = `build "${b.id}"`
  if (ids.has(b.id)) fail(`${where}: duplicate id`)
  ids.add(b.id)
  if (!/^[a-z0-9-]{2,40}$/.test(b.id)) fail(`${where}: id must be lower-case words with hyphens`)
  if (b.line.length > 110) fail(`${where}: card line over 110 characters`)
  if (!BAND_ORDER.includes(b.minBand)) fail(`${where}: unknown minBand ${b.minBand}`)
  if (!tracks.has(b.track)) fail(`${where}: unknown track ${b.track}`)
  if (b.world && !worlds.has(b.world)) fail(`${where}: unknown world ${b.world}`)
  if (!cards.has(b.robodex)) fail(`${where}: Robodex card "${b.robodex}" does not exist`)
  if (b.minutes < 5 || b.minutes > 90) fail(`${where}: minutes out of range`)
  if (b.materials.length < 1) fail(`${where}: no materials`)
  if (b.steps.length < 3 || b.steps.length > 8) fail(`${where}: needs 3–8 steps`)
  if (!b.idea || !b.realRobot || !b.ask || !b.deeper) fail(`${where}: idea, realRobot, ask and deeper are all required`)

  // Safety (#79)
  if (!b.hazards.length) fail(`${where}: no hazard tags (use 'none' when nothing is risky)`)
  if (b.hazards.includes('none') && b.hazards.length > 1) fail(`${where}: 'none' must be the only tag`)
  for (const h of b.hazards) if (!HAZARDS[h]) fail(`${where}: unknown hazard ${h}`)
  if (typeof b.adultRequired !== 'boolean') fail(`${where}: adultRequired must be set`)
  if (!b.safety || b.safety.length < 20) fail(`${where}: the adult-safety note is missing or too short`)
  const text = [...b.materials, ...b.steps].join(' ')
  if (MAINS.test(text)) fail(`${where}: mentions mains power — never in a kids build`)
  if (b.minBand === 'explorers') {
    for (const h of NEVER_EXPLORERS) if (b.hazards.includes(h)) fail(`${where}: '${h}' is never allowed in an Explorers build`)
    if (b.hazards.some((h) => RISKY_FOR_EXPLORERS.includes(h)) && !b.adultRequired) fail(`${where}: an Explorers build with ${b.hazards.join(', ')} must require a grown-up`)
  }
  if (b.hazards.includes('lithium-pack') && BAND_ORDER.indexOf(b.minBand) < BAND_ORDER.indexOf('inventors')) fail(`${where}: lithium packs only from Inventors up`)
  for (const h of ALWAYS_ADULT) if (b.hazards.includes(h) && !b.adultRequired) fail(`${where}: '${h}' needs adultRequired`)
  if (b.hazards.includes('button-cell') && !/swallow/i.test(b.safety)) fail(`${where}: a coin-cell build must warn about swallowing in its safety note`)
  for (const [re, tag] of MATERIAL_TAGS) {
    const hit = b.materials.find((m) => re.test(m))
    if (hit && !b.hazards.includes(tag)) fail(`${where}: material "${hit}" needs the '${tag}' tag`)
  }

  // Fair test + check-in
  const ft = b.fairTest
  if (!ft.change || !ft.keep || !ft.measure || ft.outcomes.length !== 3 || new Set(ft.outcomes).size !== 3) fail(`${where}: fair test needs change, keep, measure and three different outcomes`)
  const c = b.check
  if (c.options.length !== 3 || new Set(c.options).size !== 3) fail(`${where}: check needs three different options`)
  if (![0, 1, 2].includes(c.answer)) fail(`${where}: check answer must be 0, 1 or 2`)
  if (!c.q.endsWith('?') && !c.q.endsWith('…')) fail(`${where}: check question should be a question`)
  if (!c.why) fail(`${where}: check needs an explanation`)
  if (buildRewardId(b.id).length > 60) fail(`${where}: reward id too long`)
}
if (failures === 0) ok('every build has hazard tags, a minimum band, an adult flag, a safety note, a fair test and a check question')

// Coverage: every track, every world, every band has builds.
for (const t of tracks) if (!HOME_BUILDS.some((b) => b.track === t)) fail(`no build for the ${t} track`)
for (const w of worlds) if (!HOME_BUILDS.some((b) => b.world === w)) fail(`no build for the ${w} world`)
for (const band of BAND_ORDER) {
  const n = buildsForBand(band).length
  if (n < 10) fail(`only ${n} builds for ${band}`)
}
ok('every track, world and band has builds')
const coinExplorers = HOME_BUILDS.filter((b) => b.minBand === 'explorers' && b.hazards.includes('button-cell'))
if (coinExplorers.length) fail(`button cells in Explorers builds: ${coinExplorers.map((b) => b.id).join(', ')}`)
else ok('no button or coin cell in any Explorers build')

// ── Store ───────────────────────────────────────────────────────────────────
const cleaned = cleanBuilds({
  'ramp-roll': { d: '2026-11-27', a: 2, t: 1, r: ' Wheels sank in the towel ' },
  'BAD ID': { d: '2026-11-27', a: 1 },
  'lemon-led': { d: 'yesterday', a: 1 },
  'bristlebot': { d: '2026-11-20', a: -3, t: 9 },
})
if (cleaned['ramp-roll']?.r === 'Wheels sank in the towel' && cleaned['ramp-roll'].t === 1 && !cleaned['BAD ID'] && !cleaned['lemon-led'] && cleaned.bristlebot?.a === 1 && cleaned.bristlebot.t === undefined) ok('store cleans malformed check-ins')
else fail(`store cleaning wrong: ${JSON.stringify(cleaned)}`)

// ── Backup code extra (extras are capped at 512 characters) ────────────────
const tags = new Map<string, string>()
for (const b of HOME_BUILDS) {
  const t = buildTag(b.id)
  if (tags.has(t)) fail(`backup tag collision: ${b.id} and ${tags.get(t)} both encode as ${t}`)
  tags.set(t, b.id)
}
const everyBuild = Object.fromEntries(HOME_BUILDS.map((b, i) => [b.id, { d: '2026-11-27', a: 2, t: i % 3, r: 'stays on the device' }]))
const extra = buildsBackupExtra(everyBuild)
const back = decodeBuildsExtra(extra, HOME_BUILDS.map((b) => b.id))
const roundTrips = HOME_BUILDS.every((b, i) => back[b.id]?.d === '2026-11-27' && back[b.id]?.t === i % 3 && back[b.id]?.r === undefined)
if (extra.length <= 512 && roundTrips) ok(`backup extra round-trips every build in ${extra.length} characters, without reflections`)
else fail(`backup extra wrong (${extra.length} chars, round trip ${roundTrips})`)
if (Object.keys(decodeBuildsExtra('B1.zz', HOME_BUILDS.map((b) => b.id))).length === 0 && Object.keys(decodeBuildsExtra(42, [])).length === 0) ok('a malformed backup extra restores nothing')
else fail('a malformed backup extra was accepted')

// ── Reflection check ────────────────────────────────────────────────────────
const good = checkReflection('Longer blades fell slower, next time I would try heavier paper.')
if (good.ok) ok('an ordinary reflection is accepted')
else fail('an ordinary reflection was refused')
for (const bad of ['my email is sam@example.com', 'my name is Priya and I live at 4 Hill Road', 'see www.example.com']) {
  const r = checkReflection(bad)
  if (r.ok) fail(`reflection with personal details accepted: "${bad}"`)
}
const crisis = checkReflection('someone at home hits me')
if (!crisis.ok && crisis.crisis) ok('a disclosure is flagged as crisis (helpline card), not saved')
else fail('a disclosure in a reflection was not flagged as crisis')

if (failures) {
  console.error(`\n${failures} problem(s) in Make It at Home builds.`)
  process.exit(1)
}
console.log('\nMake It at Home: all checks passed.')
