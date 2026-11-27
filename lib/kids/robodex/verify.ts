// lib/kids/robodex/verify.ts — checks for the Robodex, Meet the Makers, the
// Career Constellation and Graduate to R2BOT (roadmap #32, #34, #35).
// Run: npx tsx lib/kids/robodex/verify.ts  (CI: .github/workflows/quality.yml)
//
// Fails on: duplicate ids/numbers, a /robots/<slug> that does not exist, a
// trigger that names a missing activity/game/story, a card some band can never
// find, a Maker with a missing game/card/concept, a continent with no Maker,
// story lengths outside the read-aloud budget, a Quick Lesson or Academy lesson
// that does not exist, and a broken backup round trip.

import fs from 'node:fs'
import path from 'node:path'
import { ALL_ACTIVITIES, byWorld } from '../activities/content'
import { BAND_ORDER, bandAllows, type BandId } from '../bands'
import { EPISODES } from '../stories'
import { CONCEPT_IDS, isConceptId } from '../universe/mastery'
import { GAMES, WORLDS, type WorldId } from '../universe/worlds'
import { ROBOTS } from '../../robots-data'
import { getShort } from '../../shorts'
import { ROBODEX_CARDS, getRobodexCard } from './cards'
import { buildEvidence, cardsEarned, decodeFound, encodeFound, gamesFromBests, triggerMet, worldActivityCount, worldPrefix, type RobodexEvidence } from './discover'
import { CONTINENTS, MAKERS, getMaker } from '../makers/makers'
import { CAREER_BADGES, careerBadgesDue, careerLights, careerLine } from '../makers/careers'
import { NEXT_STEP_PLACES, SHORTS_FOR_CONCEPT } from '../makers/next-step'

let failures = 0
let checks = 0
function check(ok: boolean, msg: string): void {
  checks++
  if (!ok) {
    failures++
    console.error(`  ✗ ${msg}`)
  }
}
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length

// ── Cards ─────────────────────────────────────────────────────────────────────
console.log('Robodex cards')
const ids = new Set<string>()
const ns = new Set<number>()
for (const c of ROBODEX_CARDS) {
  check(!ids.has(c.id), `duplicate card id ${c.id}`)
  ids.add(c.id)
  check(Number.isInteger(c.n) && c.n >= 1 && !ns.has(c.n), `card ${c.id}: bad or duplicate n ${c.n}`)
  ns.add(c.n)
  check(/^[a-z0-9-]+$/.test(c.id), `card ${c.id}: id must be kebab-case`)
  check(WORLDS.some((w) => w.id === c.world), `card ${c.id}: unknown world ${c.world}`)
  check(c.front.length > 10 && c.front.length <= 100, `card ${c.id}: front must be 11–100 characters (${c.front.length})`)
  check(words(c.story) >= 20 && words(c.story) <= 60, `card ${c.id}: story must be 20–60 words to read aloud (${words(c.story)})`)
  check(c.facts.length >= 2 && c.facts.length <= 3, `card ${c.id}: 2–3 facts`)
  check(c.howItWorks.length > 40, `card ${c.id}: howItWorks too short`)
  check(c.specs.sensors.length >= 1, `card ${c.id}: at least one sensor`)
  check(c.builders.length > 10, `card ${c.id}: who builds this?`)
  check(c.find.length >= 1, `card ${c.id}: needs a way to find it`)
  // No product name as branding: the card name must not be a robot's own name.
  check(!ROBOTS.some((r) => r.name.toLowerCase() === c.name.toLowerCase()), `card ${c.id}: name "${c.name}" is a product name; use a generic name`)
  if (c.robotSlug) check(ROBOTS.some((r) => r.slug === c.robotSlug), `card ${c.id}: /robots/${c.robotSlug} does not exist`)
  for (const m of c.makers ?? []) check(!!getMaker(m), `card ${c.id}: unknown maker ${m}`)
  for (const t of c.find) {
    if (t.kind === 'activity') for (const a of t.ids) check(ALL_ACTIVITIES.some((x) => x.id === a), `card ${c.id}: activity ${a} does not exist`)
    if (t.kind === 'world') {
      check(t.count >= 1 && t.count <= byWorld(t.world).length, `card ${c.id}: world ${t.world} count ${t.count} is more than its activities`)
    }
    if (t.kind === 'game') {
      check(GAMES.some((g) => g.id === t.game), `card ${c.id}: game ${t.game} is not in GAMES`)
      check(t.tier === undefined || (Number.isInteger(t.tier) && t.tier >= 0 && t.tier <= 3), `card ${c.id}: tier must be 0–3`)
    }
    if (t.kind === 'story') check(EPISODES.some((e) => e.slug === t.slug), `card ${c.id}: story ${t.slug} does not exist`)
    if (t.kind === 'concept') check(isConceptId(t.concept), `card ${c.id}: unknown concept ${t.concept}`)
  }
}
const maxN = Math.max(...ROBODEX_CARDS.map((c) => c.n))
check(maxN === ROBODEX_CARDS.length, `card numbers must run 1..${ROBODEX_CARDS.length} with no gaps (max ${maxN})`)
check(ROBODEX_CARDS.length >= 55 && ROBODEX_CARDS.length <= 80, `about 60 cards (${ROBODEX_CARDS.length})`)
for (const w of WORLDS) {
  const n = ROBODEX_CARDS.filter((c) => c.world === w.id).length
  check(n >= 7, `world ${w.id} needs at least 7 cards (${n})`)
  // discover.ts counts a world's activities by id prefix: every world activity must carry it.
  for (const a of byWorld(w.id)) check(a.id.startsWith(worldPrefix(w.id)), `activity ${a.id} in world ${w.id} must start with "${worldPrefix(w.id)}"`)
}
check(getRobodexCard('ocean-rov')?.world === 'ocean', 'getRobodexCard works')

// ── Every band can find every card ────────────────────────────────────────────
console.log('Reachability per band')
for (const band of BAND_ORDER) {
  // Everything a child in this band can finish: their band and the bands below, every game tier, every story.
  const acts = new Set(ALL_ACTIVITIES.filter((a) => bandAllows(band as BandId, a.band)).map((a) => a.id))
  const games: Record<string, number> = {}
  for (const g of GAMES) games[g.id] = 3
  const ev: RobodexEvidence = { activities: acts, games, stories: new Set(EPISODES.map((e) => e.slug)), concepts: new Set(CONCEPT_IDS) }
  // Without the games (a child who only plays Galaxy missions) every card should still be reachable for Builders and up.
  const evNoGames: RobodexEvidence = { ...ev, games: {}, stories: new Set() }
  for (const c of ROBODEX_CARDS) {
    check(c.find.some((t) => triggerMet(t, ev)), `${band}: card ${c.id} can never be found`)
    if (band !== 'explorers') check(c.find.some((t) => triggerMet(t, evNoGames)) || c.find.some((t) => t.kind === 'game' || t.kind === 'story'), `${band}: card ${c.id} has no activity route`)
  }
}

// ── Discovery rules ───────────────────────────────────────────────────────────
console.log('Discovery rules')
check(JSON.stringify(gamesFromBests({ 'ocean-rescue:t0': 5, 'ocean-rescue:t2': 3, 'L1-S01': 3, 'junk:tx': 1 })) === JSON.stringify({ 'ocean-rescue': 2 }), 'gamesFromBests reads the highest tier')
{
  const ev = buildEvidence({ activitiesDone: { 'ocean-sort-float-or-sink': {}, 'ocean-sort-rov-or-auv': {} }, personalBests: { 'ocean-rescue:t1': 4 }, episodesDone: { 'rover-on-mars': 2, 'wobbly-bot': 0 } })
  check(worldActivityCount('ocean', ev) === 2, 'world count by prefix')
  const got = new Set(cardsEarned(ROBODEX_CARDS, ev))
  check(got.has('ocean-rov'), 'activity trigger earns the ROV')
  check(got.has('ocean-auv'), 'world count 2 earns the AUV')
  check(got.has('ocean-sailboat'), 'game tier 1 earns the sailboat')
  check(!got.has('ocean-pool'), 'tier 3 card not earned at tier 1')
  check(got.has('space-mars-rover'), 'story trigger earns the Mars rover')
  check(!ev.stories.has('wobbly-bot'), 'a 0-star story does not count')
  const none = cardsEarned(ROBODEX_CARDS, buildEvidence({}))
  check(none.length === 0, 'no evidence, no cards')
  // Deterministic: same evidence, same cards.
  check(JSON.stringify(cardsEarned(ROBODEX_CARDS, ev)) === JSON.stringify(cardsEarned(ROBODEX_CARDS, ev)), 'discovery is deterministic')
}

// ── Backup round trip ─────────────────────────────────────────────────────────
console.log('Backup extra')
{
  const pick = new Set(ROBODEX_CARDS.filter((_, i) => i % 3 === 0).map((c) => c.id))
  const code = encodeFound(ROBODEX_CARDS, pick)
  check(code.length <= 40, `backup extra is short (${code.length})`)
  const back = new Set(decodeFound(ROBODEX_CARDS, code))
  check(back.size === pick.size && [...pick].every((id) => back.has(id)), 'encode → decode round trip')
  const all = new Set(ROBODEX_CARDS.map((c) => c.id))
  check(decodeFound(ROBODEX_CARDS, encodeFound(ROBODEX_CARDS, all)).length === all.size, 'full collection round trip')
  check(decodeFound(ROBODEX_CARDS, 'R9.ffff').length === 0, 'unknown version ignored')
  check(decodeFound(ROBODEX_CARDS, '<script>').length === 0, 'garbage ignored')
  check(decodeFound(ROBODEX_CARDS, null).length === 0, 'null ignored')
  check(decodeFound(ROBODEX_CARDS, 'R1.' + 'f'.repeat(64)).length === ROBODEX_CARDS.length, 'bits past the catalogue are ignored')
}

// ── Makers ────────────────────────────────────────────────────────────────────
console.log('Makers')
check(MAKERS.length >= 18 && MAKERS.length <= 24, `about 20 makers (${MAKERS.length})`)
const makerIds = new Set<string>()
for (const m of MAKERS) {
  check(!makerIds.has(m.id), `duplicate maker ${m.id}`)
  makerIds.add(m.id)
  check(/^[a-z0-9-]+$/.test(m.id), `maker ${m.id}: id must be kebab-case`)
  check(GAMES.some((g) => g.id === m.tryGame), `maker ${m.id}: tryGame ${m.tryGame} is not in GAMES`)
  check(WORLDS.some((w) => w.id === m.world), `maker ${m.id}: unknown world`)
  check(m.skills.length >= 3 && m.skills.length <= 4 && m.skills.every(isConceptId), `maker ${m.id}: 3–4 valid skills`)
  check(new Set(m.skills).size === m.skills.length, `maker ${m.id}: duplicate skill`)
  for (const r of m.robots) check(!!getRobodexCard(r), `maker ${m.id}: unknown card ${r}`)
  // ~60 seconds read aloud for young children: 90–170 words.
  check(words(m.story) >= 90 && words(m.story) <= 170, `maker ${m.id}: story ${words(m.story)} words (90–170 for about a minute)`)
  check(words(m.journey) >= 100 && words(m.journey) <= 200, `maker ${m.id}: journey ${words(m.journey)} words (100–200)`)
  check(m.day.length === 3 && m.routes.length >= 2, `maker ${m.id}: three day items and 2+ routes`)
  check(!/https?:|www\./i.test(m.story + m.journey), `maker ${m.id}: no links in stories`)
}
for (const c of CONTINENTS) check(MAKERS.some((m) => m.continent === c), `no maker on ${c}`)
check(MAKERS.filter((m) => m.pronoun === 'she').length * 2 >= MAKERS.length, 'at least half the makers are women')
check(MAKERS.some((m) => m.look.wheelchair), 'a wheelchair user')
check(MAKERS.some((m) => m.look.hearingAid), 'a maker with hearing aids')
check(MAKERS.some((m) => m.look.headscarf), 'a maker with a headscarf')
check(MAKERS.some((m) => m.look.bionicHand), 'a maker with a limb difference')
check(new Set(MAKERS.map((m) => m.look.skin)).size >= 5, 'at least five skin tones')
for (const w of WORLDS) check(MAKERS.some((m) => m.world === w.id), `no maker in world ${w.id}`)

// ── Career Constellation ──────────────────────────────────────────────────────
console.log('Career Constellation')
{
  const lights = careerLights({ sensors: 'secure', 'feedback-control': 'learning', physics: 'fading' })
  check(lights.map((l) => l.maker.id).join() === MAKERS.map((m) => m.id).join(), 'careers keep their fixed order (no ranking)')
  const tavita = lights.find((l) => l.maker.id === 'rov-pilot')!
  check(tavita.have === 2 && tavita.learning === 1, 'secure and fading count as have; learning as learning')
  check(!/not|missing|lack|only/i.test(careerLine(tavita)), 'career line never says what is missing')
  const empty = careerLights({})
  check(empty.every((l) => l.have === 0), 'no mastery, no lights')
  check(careerBadgesDue({ cardsFound: 0, worldsComplete: 0, storiesHeard: 0, fullCareers: 0 }).length === 0, 'no badges without doing')
  check(careerBadgesDue({ cardsFound: 1, worldsComplete: 1, storiesHeard: 3, fullCareers: 1 }).length === CAREER_BADGES.length, 'every careers badge is earnable')
  check(new Set(CAREER_BADGES.map((b) => b.id)).size === CAREER_BADGES.length, 'careers badge ids unique')
}

// ── Graduate to R2BOT ─────────────────────────────────────────────────────────
console.log('Graduate to R2BOT')
for (const [concept, slugs] of Object.entries(SHORTS_FOR_CONCEPT)) {
  check(isConceptId(concept), `next-step: unknown concept ${concept}`)
  for (const s of slugs ?? []) check(!!getShort(s), `next-step: Quick Lesson ${s} does not exist`)
}
for (const p of NEXT_STEP_PLACES) {
  check(p.concepts.every(isConceptId), `next-step ${p.id}: unknown concept`)
  const m = /^\/academy\/(forge|edge)\/(\d+)$/.exec(p.href)
  if (p.kind === 'academy') {
    check(!!m, `next-step ${p.id}: academy href must be /academy/forge|edge/<n>`)
    if (m) check(fs.existsSync(path.join(process.cwd(), 'content', 'academy', m[1], `${m[2]}.mdx`)), `next-step ${p.id}: content/academy/${m[1]}/${m[2]}.mdx missing`)
  } else {
    check(fs.existsSync(path.join(process.cwd(), 'app', p.href.slice(1), 'page.tsx')), `next-step ${p.id}: app${p.href}/page.tsx missing`)
  }
}
check(CONCEPT_IDS.filter((c) => !SHORTS_FOR_CONCEPT[c] && !NEXT_STEP_PLACES.some((p) => p.concepts.includes(c))).length === 0, 'every concept leads somewhere on the main site')

const byWorldCount: Partial<Record<WorldId, number>> = {}
for (const c of ROBODEX_CARDS) byWorldCount[c.world] = (byWorldCount[c.world] ?? 0) + 1
console.log(`\n${ROBODEX_CARDS.length} cards (${Object.entries(byWorldCount).map(([w, n]) => `${w} ${n}`).join(', ')}), ${MAKERS.length} makers.`)
console.log(failures ? `\n✗ ${failures} of ${checks} checks failed` : `\n✓ all ${checks} checks passed`)
process.exit(failures ? 1 : 0)
