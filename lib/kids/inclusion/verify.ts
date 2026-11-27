// lib/kids/inclusion/verify.ts — the inclusion and representation pass (roadmap #87),
// as a check that keeps holding after it ships.
// Run: npx tsx lib/kids/inclusion/verify.ts   (exit 1 on any ✗; runs in CI)
//
//  Avatars   a child can draw themselves: ≥ 6 skin tones, textured hair (curly,
//            afro, braids) and no hair, a headscarf, a turban/patka and a kippah,
//            glasses, hearing aids, a wheelchair, a bionic hand; every combination
//            fits the store's 40-character avatar id and survives a round trip; the
//            neutral default asks nothing about gender.
//  Colours   no gendered defaults: the default avatar colour is R2BOT orange, and
//            pink and blue sit side by side as ordinary choices.
//  Cast      only human characters ask for a voice gender; machines are 'any'.
//  Makers    every continent; at least as many women as men; a headscarf, glasses,
//            hearing aids, a wheelchair user and a limb difference; ≥ 5 skin tones.
//  Framing   Inventors (11–13) can reach care / medical and environment worlds,
//            not only Sumo and Rover: each has a game open to them and missions
//            at their band.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { BAND_ORDER } from '../bands'
import { DEFAULT_ME_LOOK, ME_COVERS, ME_HAIR, ME_HAIR_COLOURS, ME_SKINS, decodeMeLook, encodeMeLook, displayAvatarId, type MeLook } from '../avatar-look'
import { CAST, type CastInfo } from '../stories/cast'
import { CONTINENTS, MAKERS } from '../makers/makers'
import { GAMES, WORLDS } from '../universe/worlds'
import { byWorld } from '../activities/content'

const errors: string[] = []
const fail = (where: string, what: string) => errors.push(`${where}: ${what}`)
const notes: string[] = []

// ── Avatars ──────────────────────────────────────────────────────────────────
if (ME_SKINS.length < 6) fail('avatars', `only ${ME_SKINS.length} skin tones (need ≥ 6)`)
for (const h of ['curly', 'afro', 'braids', 'long', 'short', 'none'] as const) {
  if (!ME_HAIR.some((x) => x.id === h)) fail('avatars', `hair type "${h}" missing`)
}
for (const c of ['scarf', 'turban', 'kippah'] as const) {
  if (!ME_COVERS.some((x) => x.id === c)) fail('avatars', `head covering "${c}" missing`)
}
for (const k of ['glasses', 'hearingAid', 'wheelchair', 'bionicHand'] as const) {
  if (!(k in DEFAULT_ME_LOOK)) fail('avatars', `"${k}" cannot be added to an avatar`)
}
if (ME_HAIR_COLOURS.length < 5) fail('avatars', 'fewer than 5 hair colours')

let combos = 0
for (const skin of ME_SKINS)
  for (const hair of ME_HAIR)
    for (const hc of ME_HAIR_COLOURS)
      for (const cover of ME_COVERS)
        for (let f = 0; f < 16; f++) {
          const l: MeLook = { skin: skin.id, hair: hair.id, hairColour: hc.id, cover: cover.id, glasses: !!(f & 1), hearingAid: !!(f & 2), wheelchair: !!(f & 4), bionicHand: !!(f & 8) }
          const id = encodeMeLook(l)
          combos++
          if (id.length > 40) fail('avatars', `"${id}" is ${id.length} chars (progress.avatar.id keeps 40)`)
          const back = decodeMeLook(id)
          if (JSON.stringify(back) !== JSON.stringify(l)) fail('avatars', `"${id}" does not round-trip`)
        }
// Garbage never throws and falls back to the default.
for (const junk of ['me-', 'me-99-x-y-z-q', 'me-1-afro', 'me-<script>']) {
  try {
    decodeMeLook(junk)
  } catch (e) {
    fail('avatars', `decodeMeLook("${junk}") threw: ${(e as Error).message}`)
  }
}
// Teen default: untouched astronaut → Lab badge for Engineers only; a choice is kept.
if (displayAvatarId({ id: 'astro', color: '#F59E0B' }, 'engineers') !== 'lab') fail('avatars', 'an Engineer with the untouched default should see the Lab badge')
if (displayAvatarId({ id: 'astro', color: '#F59E0B' }, 'builders') !== 'astro') fail('avatars', 'only Engineers get the Lab badge by default')
if (displayAvatarId({ id: 'owl', color: '#22C55E' }, 'engineers') !== 'owl') fail('avatars', 'a chosen avatar must be shown as chosen')

// ── Colours ──────────────────────────────────────────────────────────────────
// Read the colour list as text: the avatars module is a .tsx (JSX) file.
const avatarSrc = readFileSync(join(process.cwd(), 'components/kids/universe/avatars.tsx'), 'utf8')
const base = /const BASE_COLOURS[^=]*=\s*\[([\s\S]*?)\n\]/.exec(avatarSrc)?.[1] ?? ''
if (!/#FC6818/i.test(base.split('\n').find((l) => l.includes('id:')) ?? '')) fail('colours', 'the first (default) avatar colour must be R2BOT orange, not a gendered colour')
if (!/#EC4899/i.test(base) || !/#3B82F6/i.test(base)) notes.push('pink and blue are not both offered as ordinary colours')
const onboarding = readFileSync(join(process.cwd(), 'components/kids/universe/OnboardingDialogClient.tsx'), 'utf8')
if (/\b(boy|girl|gender)\b/i.test(onboarding)) fail('colours', 'the avatar setup must not ask about boy/girl/gender')

// ── Cast voices ──────────────────────────────────────────────────────────────
const HUMANS = new Set(['amara', 'lucia'])
for (const c of Object.values(CAST) as CastInfo[]) {
  if (!HUMANS.has(c.id) && c.voice.prefer !== 'any') fail(`cast:${c.id}`, `a machine or narrator asks for a ${c.voice.prefer} voice (use 'any')`)
}

// ── Makers ───────────────────────────────────────────────────────────────────
for (const ct of CONTINENTS) if (!MAKERS.some((m) => m.continent === ct)) fail('makers', `no maker from ${ct}`)
const she = MAKERS.filter((m) => m.pronoun === 'she').length
const he = MAKERS.filter((m) => m.pronoun === 'he').length
if (she < he) fail('makers', `${she} women vs ${he} men (at least as many women)`)
const has = (k: 'headscarf' | 'glasses' | 'hearingAid' | 'wheelchair' | 'bionicHand') => MAKERS.some((m) => !!m.look[k])
for (const k of ['headscarf', 'glasses', 'hearingAid', 'wheelchair', 'bionicHand'] as const) if (!has(k)) fail('makers', `no maker with ${k}`)
const skins = new Set(MAKERS.map((m) => m.look.skin.toLowerCase()))
if (skins.size < 5) fail('makers', `only ${skins.size} skin tones among the makers`)

// ── Framing for Inventors ────────────────────────────────────────────────────
const inv = BAND_ORDER.indexOf('inventors')
const FRAMINGS: { label: string; worlds: string[] }[] = [
  { label: 'care / medical', worlds: ['hospital'] },
  { label: 'environment', worlds: ['farm', 'ocean', 'zoo'] },
  { label: 'safety and fairness', worlds: ['guardians'] },
]
for (const f of FRAMINGS) {
  const ok = f.worlds.some((w) => {
    const world = WORLDS.find((x) => x.id === w)
    const game = world ? GAMES.find((g) => g.id === world.game) : undefined
    const gameOpen = !!game && BAND_ORDER.indexOf(game.minBand) <= inv
    const missions = byWorld(w).filter((a) => a.band === 'inventors').length
    return gameOpen && missions > 0
  })
  if (!ok) fail('framing', `Inventors have no ${f.label} world with an open game and missions at their band`)
}
const combat = GAMES.filter((g) => /battle|fight|combat|destroy/i.test(`${g.zone} ${g.hook}`))
if (combat.length) notes.push(`combat words in game copy: ${combat.map((g) => `${g.id} ("${g.zone}")`).join(', ')}; frame these as engineering (traction, centre of mass, pushing force)`)

// ── Report ───────────────────────────────────────────────────────────────────
for (const n of notes) console.log(`  ! ${n}`)
if (errors.length) {
  console.error(`Inclusion: ${errors.length} problem(s)`)
  for (const e of errors) console.error(`  ✗ ${e}`)
  process.exit(1)
}
console.log(
  `Inclusion: ${ME_SKINS.length} skin tones, ${ME_HAIR.length} hair types, ${ME_COVERS.length - 1} head coverings, 4 aids; ${combos} avatar combinations round-trip; ` +
    `makers ${she} women / ${he} men on ${CONTINENTS.length} continents; cast voices ok; Inventors framings ok ✓`,
)
